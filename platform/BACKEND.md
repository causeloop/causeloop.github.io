# Causeloop Platform — Backend Specification

> **Find the cause, break the loop.**
> The services, data model, ML pipeline, and APIs behind the platform.

This is the canonical **backend** source of truth for the Causeloop platform
(`api.causeloop.ai`). It is the companion to the frontend spec
([`platform/SPEC.md`](SPEC.md)); where the two meet (the REST/WS contract), this
document is authoritative for payloads and semantics, and the frontend spec is
authoritative for how they are rendered.

Scope: system architecture, the connect → detect → predict → recommend
pipeline, the data model, every API surface the product depends on, the ML
services, eventing, security/compliance, and operational concerns. Nothing here
contradicts the brand or the UI; it defines what stands behind them.

---

## 1. Architecture overview

Causeloop is a multi-tenant SaaS. Each enterprise is a **workspace** (the tenant
boundary); all data is partitioned by `workspace_id`.

```
                         ┌──────────────────────────────┐
   External tools  ──▶   │  Ingestion / Connector layer │  (webhooks + pollers)
   (Jira, SNOW,          └──────────────┬───────────────┘
    GitHub, PD, …)                      │ normalized issue events
                                        ▼
                         ┌──────────────────────────────┐
                         │  Core API  (REST + WebSocket) │  ◀── app.causeloop.ai
                         └───┬───────────────┬───────────┘
                             │               │
                ┌────────────▼───┐     ┌─────▼────────────────┐
                │ Postgres (OLTP)│     │  Event bus (Kafka)   │
                │  + pgvector    │     └─────┬────────────────┘
                └────────────────┘           │
                                             ▼
                         ┌──────────────────────────────┐
                         │  ML / Intelligence services    │
                         │  RCA · Clustering · Forecast ·  │
                         │  Recommendation · Embeddings    │
                         └───┬───────────────┬────────────┘
                             ▼               ▼
                   Vector store        Object store (S3)
                   (embeddings)        (raw payloads, models)
```

### Services

| Service | Responsibility | Stack (reference) |
| --- | --- | --- |
| `gateway` | AuthN/Z, rate limiting, request routing | Go / Envoy |
| `core-api` | CRUD for issues, patterns, predictions, recs; orchestration | Go or Python (FastAPI) |
| `ingest` | Connector webhooks + pollers, normalization, dedupe | Go |
| `worker` | Async jobs (analysis fan-out, backfills, exports) | Python + Celery/Temporal |
| `ml-rca` | Root-cause analysis (LLM + retrieval) | Python |
| `ml-cluster` | Pattern detection / clustering | Python |
| `ml-forecast` | Recurrence prediction / forecasting | Python |
| `ml-reco` | Recommendation generation & ranking | Python |
| `embeddings` | Issue/text embeddings | Python |
| `stream` | WebSocket fan-out from the event bus | Go |
| `scheduler` | Cron: polling, model refresh, digests | Go |

### Data stores

- **Postgres** — primary OLTP; row-level partitioning by `workspace_id`.
  `pgvector` for similarity search if a dedicated vector DB is not used.
- **Vector store** — issue/pattern embeddings (pgvector, or Qdrant/pinecone at
  scale) for k-NN similarity and retrieval-augmented RCA.
- **Kafka** (or equivalent) — the event backbone: `issue.ingested`,
  `issue.analyzed`, `pattern.updated`, `prediction.generated`, etc.
- **Redis** — caches, rate-limit counters, idempotency keys, WS presence.
- **S3** — raw connector payloads, model artifacts, exports.
- **ClickHouse** (optional) — analytics/aggregations powering dashboards at
  scale.

---

## 2. The intelligence pipeline (connect → detect → predict → recommend)

Each stage emits an event consumed by the next; all stages are idempotent and
keyed by `issue_id` + content hash.

### 2.1 Connect (ingest)
1. Connector receives a webhook (or a poller pulls a delta).
2. Payload is stored raw in S3, then **normalized** to the canonical Issue
   schema (§3.2) via the connector's field mapping.
3. **Dedupe** on `(workspace_id, source, external_id)`; updates upsert.
4. Emit `issue.ingested`.

### 2.2 Detect (analyze)
On `issue.ingested`:
1. `embeddings` computes a vector for title+body+signature.
2. `ml-rca` runs **root-cause analysis** (retrieval over similar issues +
   pattern context, then an LLM produces the structured RCA, §3.3) → confidence.
3. `ml-cluster` checks for **loop membership**: nearest patterns by embedding +
   shared fingerprint attributes. If recurrence threshold is met, the issue is
   set `in_loop` and linked (or a new **emerging** pattern is created).
4. Emit `issue.analyzed` and, if changed, `pattern.updated`.

### 2.3 Predict (forecast)
Continuously / on schedule:
1. `ml-forecast` models each active pattern's occurrence series and produces a
   **recurrence probability** + **window** + likely trigger.
2. Portfolio-level risk forecast is aggregated.
3. Emit `prediction.generated`; alert rules are evaluated (§7).

### 2.4 Recommend
On `pattern.updated` / new high-risk RCA:
1. `ml-reco` generates candidate actions (code fix / config / process /
   monitoring), each with impact and effort estimates.
2. Rank by `expected_impact = (loops_prevented × severity) / effort`.
3. Emit `recommendation.created`.

---

## 3. Data model

All tables carry `id` (UUID v7), `workspace_id`, `created_at`, `updated_at`.
Soft-delete via `deleted_at` where applicable. Timestamps are UTC.

### 3.1 Workspace & identity

```
workspace(id, name, slug, timezone, default_theme, sso_enforced,
          retention_days, created_at)
user(id, email, name, avatar_url, status, created_at)              -- global
membership(id, workspace_id, user_id, role, provisioning, status,
           last_active_at)                                          -- role: admin|analyst|viewer
api_token(id, workspace_id, name, hashed_secret, scopes[], last_used_at,
          created_by, expires_at, revoked_at)
audit_event(id, workspace_id, actor_id, action, target_type, target_id,
            metadata jsonb, created_at)                             -- immutable
```

### 3.2 Issue

```
issue(
  id, workspace_id,
  source,              -- jira|servicenow|github|pagerduty|opsgenie|linear|zendesk
  external_id,         -- e.g. INC-44821; unique with (workspace_id, source)
  title, body,
  status,              -- new|analyzing|analyzed|in_loop|pattern_found|resolved|wont_fix
  severity,            -- p1|p2|p3|p4  (mapped from source)
  risk_score,          -- 0..100 (denormalized from latest analysis)
  pattern_id,          -- nullable FK -> pattern
  assignee_id,         -- nullable FK -> user
  team,
  source_created_at, source_updated_at,
  ingested_at, analyzed_at,
  external_url, raw_ref,  -- S3 pointer to raw payload
  embedding vector(1024)  -- or in vector store keyed by issue_id
)
issue_attribute(issue_id, key, value)   -- extracted fingerprint attrs
```

### 3.3 Analysis (RCA)

```
analysis(
  id, workspace_id, issue_id,
  root_cause text,
  the_cause text,            -- the single surfaced cause (brand "the cause")
  contributing_factors jsonb,-- ordered list
  why_recurring text,
  confidence numeric,        -- 0..1
  model, model_version,
  created_at
)
```

### 3.4 Pattern

```
pattern(
  id, workspace_id,
  name,
  status,            -- emerging|active|mitigating|resolved
  risk_score,        -- 0..100
  confidence,        -- 0..1
  issue_count,
  first_seen_at, last_seen_at,
  mttr_seconds,
  est_cost_cents,    -- nullable
  fingerprint jsonb, -- {service, component, error_signature, time_window, trigger, region, ...}
  centroid vector(1024)
)
pattern_member(pattern_id, issue_id, similarity)   -- similarity 0..1
pattern_occurrence(pattern_id, occurred_at, issue_id)  -- time series for forecasting
```

### 3.5 Prediction

```
prediction(
  id, workspace_id, pattern_id,
  signal_name,
  probability,       -- 0..1
  window_days,       -- predicted horizon
  likely_trigger text,
  impact,            -- critical|high|medium|low
  model_version,
  generated_at, expires_at
)
forecast_point(workspace_id, pattern_id, bucket_ts, value, lower, upper)
prediction_accuracy(workspace_id, model_version, precision, recall,
                    brier, lead_time_days, evaluated_at)
```

### 3.6 Recommendation

```
recommendation(
  id, workspace_id,
  title, description,
  type,              -- code_fix|config_change|process|monitoring
  status,            -- pending|in_progress|implemented|dismissed
  impact,            -- high|medium|quick_win
  effort,            -- free text or t-shirt
  expected_loops_prevented int,
  rank numeric,
  created_at, updated_at
)
recommendation_link(recommendation_id, target_type, target_id)  -- pattern|issue
recommendation_external(recommendation_id, tracker, external_id, external_url)
```

### 3.7 Integrations

```
connector(
  id, workspace_id,
  type, display_name, status,        -- connected|paused|error
  auth jsonb,                        -- encrypted (KMS) credentials/refs
  scope jsonb,                       -- projects/queues/repos selected
  field_mapping jsonb,
  sync_mode,                         -- webhook|poll|both
  backfill_days, last_synced_at, created_at
)
webhook_endpoint(id, workspace_id, connector_id, url, signing_secret_ref,
                 last_received_at, health)   -- healthy|degraded|down
alert_rule(id, workspace_id, name, scope, threshold jsonb, channels[],
           enabled, snoozed_until, created_at)
```

---

## 4. API conventions

- **Base:** `https://api.causeloop.ai/v1`
- **Auth:** `Authorization: Bearer <token>` (user JWT or `api_token`).
- **Tenancy:** workspace resolved from the token; cross-workspace access is
  rejected (404, never 403-leak).
- **Format:** JSON, `snake_case`, ISO-8601 UTC. UUIDs are v7.
- **Idempotency:** mutating POSTs accept `Idempotency-Key`; replays return the
  original result (keys cached 24h in Redis).
- **Versioning:** URI-versioned (`/v1`). Breaking changes → `/v2`. Additive
  fields are non-breaking.
- **Rate limits:** per token; `429` with `Retry-After`. Default 600 req/min.
- **Errors:**

```json
{ "error": { "code": "validation_error",
             "message": "risk_min must be between 0 and 100",
             "details": { "field": "risk_min" } } }
```

### Pagination (cursor)

Request: `?limit=25&cursor=<opaque>`. Response:

```json
{ "data": [ /* … */ ],
  "page": { "next_cursor": "eyJpZCI6MTI4OH0", "has_more": true, "total": 247 } }
```

---

## 5. REST endpoints

### 5.1 Issues

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/issues` | List + filter (`status`, `source`, `pattern_id`, `assignee_id`, `risk_min`, `risk_max`, `q`, `date_from`, `date_to`) |
| GET | `/issues/:id` | Issue with embedded `analysis`, `pattern`, counts |
| PATCH | `/issues/:id` | Update `status`, `assignee_id`, `team`, `pattern_id` |
| POST | `/issues/:id/link-pattern` | Link/move to a pattern |
| POST | `/issues/bulk` | Bulk status/assign/dismiss (`{ ids[], op, value }`) |
| GET | `/issues/:id/similar` | k-NN similar issues (similarity-ranked) |
| GET | `/issues/:id/activity` | Audit + comments timeline |
| POST | `/issues/:id/comments` | Add a comment (`@mentions` parsed) |

`GET /issues/:id` (abridged):

```json
{
  "id": "0190…", "external_id": "INC-44821", "source": "pagerduty",
  "title": "Auth service: JWT validation timing out under peak load",
  "status": "in_loop", "severity": "p1", "risk_score": 94,
  "assignee": { "id": "…", "name": "Priya Mehta" },
  "pattern": { "id": "…", "name": "Auth service timeouts", "risk_score": 94 },
  "analysis": {
    "the_cause": "Auth thread pool not sized for peak; JWT signing on request threads.",
    "root_cause": "JWT HMAC-SHA256 signing becomes CPU-bound at ≥8k concurrent sessions…",
    "contributing_factors": ["No circuit breaker on the gateway", "Token refresh not jittered", "Blocking JWKS rotation"],
    "why_recurring": "8th occurrence in 90 days; prior fixes only scaled compute.",
    "confidence": 0.91
  },
  "loop": { "occurrences_90d": 8, "avg_mttr_seconds": 15120 },
  "recurrence": { "probability": 0.93, "window_days": 14 },
  "source_created_at": "2026-06-06T09:14:00Z", "updated_at": "2026-06-06T11:14:00Z"
}
```

### 5.2 Patterns

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/patterns` | List + filter (`status`, sort by risk/count/recency) |
| GET | `/patterns/:id` | Pattern + fingerprint, metrics, members |
| PATCH | `/patterns/:id` | Update `status` (e.g. → `mitigating`), `name` |
| POST | `/patterns/:id/merge` | Merge another pattern into this one (`{ source_pattern_id }`) |
| GET | `/patterns/:id/members` | Member issues (paginated) |
| GET | `/patterns/:id/frequency` | Occurrence series + predicted band (`?window=7d|30d|90d`) |

### 5.3 Predictions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/predictions` | Ranked predicted signals (`?min_probability=`, `?window_days=`) |
| GET | `/predictions/forecast` | Portfolio/pattern forecast points (`?pattern_id=`, `?window=`) |
| GET | `/predictions/accuracy` | Backtest metrics |
| GET | `/alert-rules` · POST · PATCH · DELETE | Alert rule CRUD |

### 5.4 Recommendations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/recommendations` | List (`?type=`, `?status=`, ranked by `rank` desc) |
| GET | `/recommendations/:id` | Detail + links |
| PATCH | `/recommendations/:id` | Update `status` |
| POST | `/recommendations/:id/push` | Create a tracker ticket (`{ tracker: "jira", project: "RISK" }`) |

### 5.5 Integrations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/connectors` | List connected + available |
| POST | `/connectors` | Begin connect (returns OAuth URL or accepts API key) |
| PATCH | `/connectors/:id` | Update scope, mapping, sync mode; pause/resume |
| DELETE | `/connectors/:id` | Disconnect |
| POST | `/connectors/:id/test` | Test connection |
| POST | `/connectors/:id/backfill` | Trigger historical backfill |
| GET | `/webhooks` | Endpoint list + health |
| POST | `/webhooks/:id/rotate` | Rotate signing secret |

### 5.6 Inbound connector webhooks

`POST /ingest/:connector/:workspace_token` — receives provider payloads.
Signature verified per provider (HMAC header / shared secret). Returns `202`
immediately; processing is async. Replays are deduped by provider event id.

### 5.7 Settings & admin

`/workspace`, `/members`, `/members/:id` (role change), `/api-tokens`,
`/audit` (filterable), `/data/export`, `/data/erase` (GDPR/DSR).

---

## 6. ML services

| Service | Approach | Inputs | Output |
| --- | --- | --- | --- |
| `embeddings` | Sentence/text embedding model (1024-dim) | title + body + error signature | vector |
| `ml-rca` | Retrieval-augmented LLM; retrieves k similar issues + pattern fingerprint, prompts an LLM to emit the structured RCA (§3.3); guardrailed JSON output + self-reported confidence | issue, neighbors, pattern ctx | `analysis` row |
| `ml-cluster` | Online clustering over embeddings + attribute fingerprint (HDBSCAN/streaming k-means); recurrence threshold creates/updates patterns | embeddings, attributes | pattern membership, risk |
| `ml-forecast` | Per-pattern temporal model on `pattern_occurrence` (e.g. Poisson/intensity or gradient-boosted features: cadence, trend, seasonality, deploy markers) | occurrence series, context | probability, window, forecast band |
| `ml-reco` | Candidate generation (templated by cause class + LLM) then impact/effort scoring & ranking | pattern, RCA, history | ranked recommendations |

**Model governance:** every model call records `model`, `model_version`, and a
trace id. Outputs are **advisory** and always show a confidence; analysts can
confirm/override (captured as feedback for evaluation). Predictions are
backtested continuously (precision/recall, Brier, lead time → `prediction_accuracy`).

**LLM safety:** retrieval is scoped to the workspace; prompts never cross
tenants; PII can be redacted pre-prompt per workspace policy; outputs are schema-
validated before persistence.

---

## 7. Eventing & real-time

### Event bus topics

| Topic | Emitted when | Key |
| --- | --- | --- |
| `issue.ingested` | New/updated issue normalized | `issue_id` |
| `issue.analyzed` | RCA + loop check complete | `issue_id` |
| `issue.updated` | Status/assignment change | `issue_id` |
| `pattern.updated` | Pattern created/score/status change | `pattern_id` |
| `prediction.generated` | New forecast/signal | `pattern_id` |
| `recommendation.created` | New recommendation | `recommendation_id` |
| `alert.fired` | Alert rule matched | `rule_id` |

### WebSocket (client-facing)

- **Endpoint:** `wss://api.causeloop.ai/v1/stream?workspace=<id>` (token via
  subprotocol).
- **Server → client messages:** `activity.created`, `issue.updated`,
  `pattern.updated`, `prediction.alert`, `recommendation.created` — these power
  the dashboard activity feed, live status, and alert toasts.
- Backfill missed events via `GET /issues/:id/activity` / `/activity` on
  reconnect; client reconnects with exponential backoff.

### Alert evaluation

On `prediction.generated`, `alert_rule`s in scope are evaluated; matches emit
`alert.fired` and dispatch to channels (Slack/Teams/Email/PagerDuty/webhook),
respecting `snoozed_until`. Delivery is at-least-once with dedupe keys.

---

## 8. Security, privacy & compliance

- **Tenancy isolation:** every query is `workspace_id`-scoped; enforced at the
  data-access layer and verified in tests. No cross-tenant joins.
- **AuthN:** SSO/SAML 2.0 (enterprise default, JIT + SCIM), OIDC for smaller
  teams, Argon2id for any password fallback. Service access via scoped
  `api_token`s.
- **AuthZ:** RBAC (admin/analyst/viewer) per the matrix in `SPEC.md §11`,
  enforced server-side on every mutation.
- **Encryption:** TLS 1.2+ in transit; AES-256 at rest; connector credentials
  and webhook secrets sealed with a KMS-managed key, never returned in API
  responses.
- **Audit:** all privileged and data-changing actions append to the immutable
  `audit_event` log; exportable.
- **Data lifecycle:** per-workspace `retention_days`; raw payloads aged out of
  S3; DSR endpoints for export and erasure; configurable PII redaction.
- **Compliance posture:** designed for SOC 2 / ISO 27001 controls; regulated-
  enterprise tenancy, least-privilege service accounts, secrets rotation.

---

## 9. Operational concerns

- **Idempotency & ordering:** pipeline stages are idempotent; events keyed and
  deduped; out-of-order updates reconciled by `source_updated_at`.
- **Backfill:** initial connector sync backfills `backfill_days` (default 90)
  via paged pollers into the same normalization path; rate-limited per provider.
- **Scaling:** stateless services scale horizontally; ML services autoscale on
  queue depth; Postgres read replicas + optional ClickHouse for heavy
  aggregations.
- **Observability:** structured logs with trace ids spanning ingest → analysis →
  API; RED/USE metrics; model latency & confidence dashboards; per-connector
  sync-health and webhook-delivery monitoring (surfaced in the Integrations UI).
- **SLOs (targets):** ingest→analyzed p95 < 60s; API read p95 < 300ms; WS
  delivery < 2s; connector sync freshness < 5 min for webhook sources.
- **Failure handling:** dead-letter queues for poison events; connector errors
  surface as `connector.status = error` + a webhook `health` of `degraded|down`;
  retries with backoff.

---

*Companion to [`SPEC.md`](SPEC.md) (frontend) and `/brand/BRAND.md` (brand). The
REST/WS payload shapes here are the contract the UI in `platform/screens/`
renders against.*
