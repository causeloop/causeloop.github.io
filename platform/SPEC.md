# Causeloop Platform — Production UI Specification

> **Find the cause, break the loop.**
> AI-native risk intelligence for the enterprise.

This is the canonical specification for the **Causeloop product platform**
(`app.causeloop.ai`). It defines every screen, component, interaction, and
design token the engineering team needs to build the production UI. It inherits
the brand 1:1 from the marketing site (`/brand/BRAND.md`) and the live
stylesheet (`/assets/css/style.css`).

Backend services, data contracts, and ML pipeline details live in a **separate**
document (`platform/BACKEND.md`). This document is the **frontend source of
truth**; where it touches the API it describes only the contract the UI depends
on.

Reference mockups (self-contained HTML, dark theme) live in
[`platform/screens/`](screens/):

| Screen | File |
| --- | --- |
| Dashboard | [`screens/dashboard.html`](screens/dashboard.html) |
| Issues list | [`screens/issues.html`](screens/issues.html) |
| Issue detail | [`screens/issue-detail.html`](screens/issue-detail.html) |
| Pattern analysis | [`screens/patterns.html`](screens/patterns.html) |
| Index of screens | [`screens/index.html`](screens/index.html) |

---

## 1. Product overview

Causeloop is an **AI-native risk intelligence platform**. It connects fragmented
issue data from across an enterprise's tooling, uses ML to surface the
**thematic patterns** behind recurring failures, **predicts** where risk will
appear next, and **recommends** concrete actions to break the loop.

### The loop it breaks

```
   ┌─────────────────────────────────────────────┐
   │  Issue occurs → triaged → patched → closed   │
   │        ▲                                │     │
   │        └──────── recurs in 90 days ─────┘     │
   └─────────────────────────────────────────────┘
        Causeloop surfaces the CAUSE and breaks it.
```

### Who uses it

| Persona | Primary jobs-to-be-done | Key screens |
| --- | --- | --- |
| **Risk / reliability analyst** | Triage incoming issues, confirm AI pattern assignments, track loops | Issues, Issue detail, Patterns |
| **Engineering manager** | See which recurring patterns cost the most, assign fixes | Dashboard, Patterns, Recommendations |
| **CISO / Head of Risk** | Portfolio risk posture, trend over time, board reporting | Dashboard, Predictions |
| **CTO / VP Eng** | Where is risk heading, what should we invest in | Dashboard, Predictions, Recommendations |
| **Platform admin** | Connect data sources, manage members & permissions | Integrations, Settings |

### Core value proposition

**Stop fixing the same problems twice.** Causeloop connects → detects →
predicts → recommends. The product is judged on one outcome: *did a recurring
loop get broken?*

---

## 2. Information architecture

### Navigation tree

```
app.causeloop.ai
├── /login                         Auth (SSO / SAML / OAuth)
├── /onboarding                    First-run wizard (connect sources)
├── /dashboard            ★ home   Risk intelligence overview
├── /issues                        Issue inventory
│   └── /issues/:id                Issue detail (RCA, loop, related, activity)
├── /patterns                      Pattern analysis
│   └── /patterns/:id              Pattern detail (cluster, frequency, lifecycle)
├── /predictions                   Risk forecasting & alerts
│   └── /predictions/alerts        Alert configuration
├── /recommendations               AI action items
│   └── /recommendations/:id       Recommendation detail
├── /integrations                  Connector hub
│   └── /integrations/:connector   Connector setup & field mapping
└── /settings
    ├── /settings/workspace        Workspace profile
    ├── /settings/members          Team & roles
    ├── /settings/notifications    Notification preferences
    ├── /settings/api              API keys & tokens
    ├── /settings/data             Retention policies
    └── /settings/audit            Audit log
```

### Navigation chrome

- **Primary nav — left sidebar (240px).** Logo lockup at top; primary
  destinations (Dashboard, Issues, Patterns, Predictions, Recommendations);
  a hairline divider; secondary destinations (Integrations, Settings); user
  profile chip pinned to the bottom. Collapses to a **64px icon rail** below
  1024px or via the collapse toggle. Active item: cobalt icon + `rgba(74,120,255,.14)`
  pill background. Count badges (e.g. Issues `247`) are mono, terracotta fill.
- **Top bar (62px).** Page title or breadcrumb on the left; contextual
  controls on the right (date-range picker, workspace switcher, notification
  bell, primary action button).
- **Breadcrumbs.** On all detail screens: `Issues › #1312 — Auth service…`.
  Each crumb is a link except the last.
- **Tabs.** Used inside detail screens and Settings (underline-style, cobalt
  active indicator).

---

## 3. Authentication & onboarding

### 3.1 Login (`/login`)

Centered card on the dark brand canvas (radial cobalt/cyan mesh, identical to
the marketing hero background).

- Causeloop lockup (mark + wordmark), tagline beneath in slate.
- **Primary:** "Continue with SSO" (terracotta fill) → SAML / OIDC redirect.
- **Secondary:** "Continue with Google" and "Continue with Microsoft" (ghost
  buttons with provider glyphs).
- Enterprise email field for IdP discovery (routes the user to their configured
  SSO). Email + password is available only for workspaces without SSO enforced.
- Footer links: Privacy, Terms, "Contact sales."
- Errors render as an inline alert above the buttons (terracotta left border).

**Auth method matrix**

| Method | Mechanism | Notes |
| --- | --- | --- |
| SSO / SAML 2.0 | IdP-initiated or SP-initiated | Enterprise default; JIT provisioning |
| OIDC / OAuth | Google Workspace, Microsoft Entra | For smaller teams |
| Email + password | Argon2id hashes | Disabled when SSO is enforced |
| SCIM | User/group provisioning | Configured in Settings → Members |

### 3.2 Onboarding wizard (`/onboarding`)

Shown once, on first login of a new workspace. Full-screen, stepped, with a
left progress rail. Steps:

1. **Welcome** — name the workspace, set timezone, invite teammates (optional).
2. **Connect your sources** — connector grid (Jira, ServiceNow, GitHub,
   PagerDuty, …). At least one required. Each launches the OAuth/API-key flow
   in a drawer.
3. **Configure sync** — pick projects/queues to ingest, set the historical
   backfill window (default 90 days), confirm field mapping.
4. **AI is analyzing** — progress screen while the first ingestion + pattern
   detection runs; shows live counts ("412 issues ingested · 9 patterns
   emerging"). Auto-advances when the first pass completes.
5. **You're set** — summary of detected patterns + CTA into the Dashboard.

A user can skip to the Dashboard at any point; incomplete steps surface as a
setup checklist card on the Dashboard until done.

---

## 4. Dashboard (`/dashboard`)

The analyst's home. Dark theme by default. Top bar carries the **date-range
picker** (default *Last 30 days*) and **workspace switcher**.

### Sections (top → bottom)

**A. KPI summary bar — 4 cards**

| Card | Value | Sub-metric | Color rule |
| --- | --- | --- | --- |
| Total Issues | `247` | `+18 this week` | neutral |
| Open Loops | `38` | `↑ 6 new` | terracotta |
| Patterns Detected | `12` | `3 active` | neutral |
| MTTR Trend | `−14%` | `vs last period` | green if improving |

Each card: `--surface` background, 1px `--border`, `--r-sm`, mono uppercase
label, display-font number, a small sparkline.

**B. Risk heat map / cluster visualization** (left, 60%)
A force-directed cluster of issue nodes grouped by pattern; node size = issue
count, node color = risk band. Hover reveals a tooltip; click navigates to the
pattern. Falls back to a ranked bar list when reduced-motion is set.

**C. Top recurring patterns** (paired with heat map or below it)
Ranked list of the highest-risk patterns: name, issue-count pill, animated
risk-score bar (terracotta fill), numeric score. "View all →" → `/patterns`.

**D. AI recommendations widget** (right, 40%)
Top 3 ranked action items: terracotta dot, title, one-line rationale, impact
chip (*High Impact* / *Quick Win* / *In Progress*). "Open recommendations →".

**E. Recent activity feed** (full width)
Last 5–10 events: color-coded icon, event text with emphasis, relative
timestamp, source badge. Streams live over WebSocket (see §14).

---

## 5. Issues module (`/issues`)

The issue inventory — a dense, sortable, filterable table.

### Filter bar

- **Search** (debounced 250ms) over title, ID, body, external ID.
- **Facet chips** with dropdowns: Source, Status, Pattern, Assignee, Risk level,
  Date range. Active facets show a count ("Filters (3 active)") and a clear-all.
- Saved views (e.g. "My open P1 loops") persist per user.

### Table columns

| Column | Content | Sort |
| --- | --- | --- |
| ☑ | Row select checkbox (header = select-all) | — |
| ID | `#1312` mono | ✓ |
| Issue title | Title, truncated; wraps an icon for linked pattern | ✓ |
| Source | Source badge (Jira / ServiceNow / GitHub / PagerDuty / Linear / Zendesk) | ✓ |
| Status | Status chip (see lifecycle below) | ✓ |
| Pattern | Pattern tag or "— Analyzing" | — |
| Risk | Numeric score + color-coded bar | ✓ (default desc) |
| Age | Relative time, mono | ✓ |

### Issue status lifecycle

```
New → Analyzing → Analyzed ─┬→ In Loop ─→ Pattern Found ─→ Resolved
                            └────────────────────────────→ Won't Fix
```

| Status | Meaning | Chip color |
| --- | --- | --- |
| New | Just ingested, not yet processed | cobalt |
| Analyzing | AI RCA in progress | faint/grey |
| Analyzed | RCA complete, no loop yet | cobalt |
| In Loop | Recurrence detected, awaiting pattern | terracotta |
| Pattern Found | Assigned to a confirmed pattern | green |
| Resolved | Closed and verified | green (muted) |
| Won't Fix | Acknowledged, no action | grey (muted) |

### Bulk actions

Selecting rows reveals a bulk bar: **Assign to pattern · Change status ·
Assign owner · Export · Dismiss**. Destructive actions (Dismiss) use the danger
treatment and a confirm dialog.

### Pagination

Server-side, 25/50/100 per page. Footer shows "Showing 1–25 of 247" + pager.

---

## 6. Issue detail (`/issues/:id`)

Two-column layout: main analysis column + a 320px properties/actions aside.

### Header
Issue ID · source badge · status chip · risk chip (e.g. *Risk 94 · Critical*).
Title (display font). Date row: opened / updated / source external ID.
Header actions: Prev/Next, Link to pattern, Resolve.

### Main column panels

1. **AI Root Cause Analysis** *(primary, "Causeloop AI" badge, confidence %)*
   - **Root cause** narrative.
   - **The Cause** — a terracotta-bordered callout naming the single surfaced
     cause (this is the brand's "the cause" moment).
   - **Contributing factors** — enumerated.
   - **Why this keeps recurring** — ties to loop count and recurrence
     probability.
2. **Loop detection** — the headline stat ("8× in 90 days"), avg MTTR, pattern
   risk, and a vertical timeline of prior occurrences.
3. **Similar issues in pattern** — ranked related issues with similarity scores;
   "View all N →".
4. **Activity & comments** — merged audit trail + collaboration thread; AI
   events use the cobalt AI icon. Comment composer with @mentions.

### Aside (320px)
- **Properties** — Status, Risk score, Priority, Source, External ID, Assignee,
  Team (inline-editable where permitted).
- **Pattern** — linked pattern card.
- **Recommended actions** — ranked, each with impact + effort estimate.
- **Recurrence prediction** — probability + window + likely trigger.

---

## 7. Pattern analysis (`/patterns`, `/patterns/:id`)

### List
Cards or table of detected patterns: name, issue count, risk score, trend
sparkline, status, first/last seen. Sort by risk, count, or recency.

### Pattern lifecycle

```
Emerging → Active → Mitigating → Resolved   (can re-open → Active)
```

| Status | Meaning | Color |
| --- | --- | --- |
| Emerging | Newly clustered, low confidence | cobalt |
| Active | Confirmed, recurring, unmitigated | terracotta |
| Mitigating | A fix is in progress | amber |
| Resolved | No recurrence in the trailing window | green |

### Pattern detail
- **Cluster visualization** — member issues as nodes around a hub (the cause).
- **Common attributes** — services, components, error signatures, time-of-day
  the pattern's members share (the ML-extracted "fingerprint").
- **Frequency chart** — occurrences over time (7/30/90-day toggle), with the
  predicted next-occurrence band overlaid.
- **Metrics** — confidence score, first/last seen, pattern MTTR, member count,
  total cost (if cost data is mapped).
- **Recommendations** — actions scoped to the whole pattern.
- **Member issues** — the full list, filterable.

---

## 8. Predictions (`/predictions`)

- **Predicted risk signals** — ranked upcoming risks with probability %, the
  pattern they derive from, and the predicted window.
- **Risk forecasting chart** — projected risk over 7 / 30 / 90 days with
  confidence bands; toggle per pattern or portfolio-wide.
- **Prediction accuracy** — backtest metrics (precision/recall, Brier score)
  so users trust the forecasts.
- **Alert configuration** (`/predictions/alerts`) — rules of the form
  *"when predicted recurrence ≥ X% within Y days, notify Z"*. Channels: email,
  Slack, Teams, PagerDuty, webhook. Each alert has a threshold, scope (pattern
  or global), and a snooze.

---

## 9. Recommendations engine (`/recommendations`)

AI-generated action items ranked by **expected impact** (loops prevented ×
severity ÷ effort).

| Field | Detail |
| --- | --- |
| Type | Code fix · Config change · Process improvement · Monitoring alert |
| Status | Pending · In Progress · Implemented · Dismissed |
| Impact | High / Medium / Low + estimated loops prevented |
| Effort | T-shirt or day estimate |
| Linked to | Originating pattern(s) and issue(s) |

Each recommendation can be **pushed to a tracker** (creates a Jira/Linear/GitHub
ticket via the connector) and tracks its implementation status back.

---

## 10. Integrations hub (`/integrations`)

### Supported connectors

| Connector | Category | Auth | Direction |
| --- | --- | --- | --- |
| Jira | Issue tracker | OAuth 2.0 | In + out (create) |
| ServiceNow | ITSM | OAuth / basic | In + out |
| GitHub Issues | Issue tracker | GitHub App | In + out |
| Linear | Issue tracker | OAuth | In + out |
| PagerDuty | Incident | API token | In |
| OpsGenie | Incident | API key | In |
| Zendesk | Support | OAuth | In |
| Slack | Notify | OAuth (bot) | Out |
| Microsoft Teams | Notify | OAuth | Out |

### Connector setup flow
1. Pick connector → OAuth / API-key drawer.
2. Choose scope (projects / queues / repos).
3. **Field mapping** — map external fields → Causeloop schema (title, body,
   status, severity, assignee, timestamps). Sensible defaults pre-filled.
4. Set sync cadence (real-time webhook + periodic backfill) and historical
   window.
5. Test connection → enable.

Webhook management lists inbound endpoints, secrets (rotate), last-received
timestamp, and delivery health.

---

## 11. Settings (`/settings/*`)

| Sub-page | Contents |
| --- | --- |
| Workspace | Name, logo, timezone, default theme, danger zone (delete workspace) |
| Members | Invite, list, role assignment, SCIM status, remove |
| Notifications | Per-channel + per-event preferences (digest cadence, mute) |
| API | Personal & service tokens, scopes, last used, revoke; webhook signing secret |
| Data | Retention windows per data type, PII redaction toggles, export/erase requests |
| Audit log | Immutable, searchable event log (who/what/when), CSV export |

### Roles & permissions

| Capability | Admin | Analyst | Viewer |
| --- | --- | --- | --- |
| View dashboards, issues, patterns | ✓ | ✓ | ✓ |
| Change issue status / assign patterns | ✓ | ✓ | — |
| Confirm/merge patterns | ✓ | ✓ | — |
| Push recommendations to trackers | ✓ | ✓ | — |
| Manage integrations | ✓ | — | — |
| Manage members & roles | ✓ | — | — |
| Manage API keys & retention | ✓ | — | — |

---

## 12. Design system / component spec

All components inherit the brand tokens (§13). The platform runs **dark theme
by default** (enterprise tooling convention) but is fully light-theme capable
via `data-theme`.

### Buttons

| Variant | Spec |
| --- | --- |
| Primary | Terracotta `--terra-2` fill, white text, `--r-pill` or 8px in dense UI, weight 600, hover darken + lift |
| Ghost | Transparent, 1px `--border-2`, hover background `rgba(255,255,255,.05)` + text → `--text` |
| Danger | Transparent → hover `rgba(255,75,107,.12)` + text `#FF4B6B` |
| Icon button | 30×30, 7px radius, faint icon → hover background + `--text` |

### Cards & panels
`--surface` background, 1px `--border`, `--r` radius. Panels have a 14×18 header
(title + optional action link) divided by a hairline from an 18px body. Hover on
interactive cards: subtle background lift, never a large translate in dense UI.

### Modals & drawers
- **Modal** — centered, max 560px, `--surface`, `--r-lg`, `--shadow-lg`, dim
  backdrop `rgba(8,12,28,.6)`. For confirms and short forms.
- **Drawer** — right-side, 420–560px, for connector setup, filters, and detail
  peeks. Slides in over the same backdrop.

### Tables & lists
Header row: mono uppercase `.63rem`, `.12em` tracking, faint, sortable (chevron
indicates direction; sorted column → cobalt chevron). Body rows: 12×16 padding,
1px hairline divider, hover `rgba(255,255,255,.03)`, whole row clickable.

### Filter chips
Pill/8px, `--surface`, 1px border; active state cobalt tint + cobalt text;
trailing chevron for dropdown facets.

### Status & source badges
- **Status chip** — pill, mono `.6rem`, leading 5px status dot, tinted
  background per state (see §5/§7 tables).
- **Source badge** — 5px radius, mono uppercase, brand-tinted per source.

### Risk score display
Numeric value (mono, weight 600) + a 48px color-coded bar. Bands:

| Band | Range | Color |
| --- | --- | --- |
| Critical | 90–100 | `#FF4B6B` |
| High | 70–89 | `--terra-2` `#F0764F` |
| Medium | 40–69 | `#F5A623` |
| Low | 0–39 | `#2BA672` |

Bars animate their width on load (`width` transition ~1.1s `--ease`).

### Notifications / toasts
Bottom-right stack, `--surface`, 1px border, left accent bar by type
(success green / info cobalt / warning amber / error red), auto-dismiss 5s,
pause on hover, max 3 visible.

### Empty states
Centered: a muted line-art glyph (loop motif), a one-line headline, a sentence
of guidance, and a primary CTA (e.g. "Connect a source"). Never a blank panel.

### Loading states
Skeletons that match final layout (shimmering `--surface-2` blocks) for tables,
cards, and charts. Inline spinners only for button-scoped async. Never block the
whole screen once the shell has rendered.

---

## 13. Typography & layout tokens

Platform type is **slightly denser** than the marketing site (base 14px vs 17px)
for data density, but uses the same families.

```css
:root{
  /* brand core — identical to /brand/BRAND.md */
  --navy:#1E2A5A; --ink:#10172E;
  --cobalt:#4A78FF; --cyan:#1FC2FF;
  --terra:#E2603F; --terra-2:#F0764F;
  --slate:#5A6480; --faint:#98A0B5;
  --line:#E7E9F0; --paper:#FBFBFC; --paper-2:#F4F5F8; --card:#FFFFFF;
  --grad:linear-gradient(135deg,#4A78FF,#1FC2FF);

  /* risk bands */
  --risk-critical:#FF4B6B; --risk-high:#F0764F;
  --risk-med:#F5A623; --risk-low:#2BA672;

  /* type */
  --f-display:'Schibsted Grotesk',system-ui,sans-serif;
  --f-text:'Hanken Grotesk',system-ui,sans-serif;
  --f-mono:'JetBrains Mono',ui-monospace,monospace;

  /* radii & motion */
  --r-sm:12px; --r:18px; --r-lg:26px; --r-xl:34px; --r-pill:999px;
  --ease:cubic-bezier(.22,.7,.2,1);
}

/* platform runs dark by default */
[data-theme="dark"]{
  --bg:#0C1124; --bg-alt:#0F1530;
  --surface:#141B38; --surface-2:#18204A;
  --text:#EEF1FA; --text-soft:#A9B2CD; --text-faint:#6E7798;
  --border:#222B4E; --border-2:#2C3660;
  --accent:#F0764F; --accent-ink:#1A1206;
  --shadow-sm:0 1px 2px rgba(0,0,0,.4);
  --shadow-md:0 14px 36px rgba(0,0,0,.45);
  --shadow-lg:0 30px 70px rgba(0,0,0,.6);
}
```

### Type scale (platform)

| Role | Family | Size / weight |
| --- | --- | --- |
| Page title | Schibsted Grotesk | 1.22rem / 700 |
| Panel title | Schibsted Grotesk | 0.95rem / 600 |
| Body / table cell | Hanken Grotesk | 0.88rem / 400–500 |
| Big metric | Schibsted Grotesk | 1.7–2rem / 800 |
| Label / eyebrow | JetBrains Mono | 0.6–0.65rem / 600, `.12em`, uppercase |

### Spacing
8-pt base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72`. Table cell padding `12×16`.
Panel body `18`. Card gap `16`.

### Breakpoints

| Name | Width | Behavior |
| --- | --- | --- |
| Wide | ≥1440 | Full layout, max content width 1280 |
| Standard | 1280 | Default |
| Compact | 1024 | Sidebar → 64px icon rail; aside columns may stack |
| Tablet | 768 | Single column; sidebar becomes an overlay drawer |
| Mobile | <640 | Read-mostly; tables → stacked cards |

### Sidebar
240px expanded → 64px icon rail (collapsed or <1024). 200ms `--ease` transition.

---

## 14. API integration notes (frontend contract)

> Full schemas live in `platform/BACKEND.md`. Below is only what the UI binds to.

### Conventions
- **Base:** `https://api.causeloop.ai/v1`
- **Auth:** `Authorization: Bearer <token>` on every request; 401 → redirect to
  `/login`, 403 → inline "no access" state.
- **Resources:** `/issues`, `/issues/:id`, `/patterns`, `/patterns/:id`,
  `/predictions`, `/recommendations`, `/integrations`, `/workspaces/:id/...`.
- **JSON** everywhere; `snake_case` fields; ISO-8601 UTC timestamps.

### Pagination
Cursor-based:

```json
{
  "data": [ /* … */ ],
  "page": { "next_cursor": "eyJpZCI6MTI4OH0", "has_more": true, "total": 247 }
}
```

Request with `?limit=25&cursor=<next_cursor>`. List filters are query params
(`?status=in_loop&source=jira&risk_min=70`).

### Real-time (WebSocket)
- **Endpoint:** `wss://api.causeloop.ai/v1/stream?workspace=<id>` (token via
  subprotocol).
- **Events:** `activity.created`, `issue.updated`, `pattern.updated`,
  `prediction.alert`, `recommendation.created`.
- Drives the activity feed, live status changes, and prediction alert toasts.
  Reconnect with exponential backoff; backfill missed events via the REST
  activity endpoint on reconnect.

### Errors & toasts
Errors return `{ "error": { "code": "...", "message": "...", "details": {…} } }`.
The UI maps `code` to a friendly toast; validation `details` map to field-level
errors in forms. Network/5xx → retry affordance; never a dead end.

### Optimistic updates
Status changes, assignments, and comment posts apply optimistically and roll
back with an error toast on failure.

---

*This spec stays in sync with `/brand/BRAND.md` and `/assets/css/style.css`.
The reference mockups in `screens/` are the visual ground truth for any
ambiguity. Backend contracts are owned by `platform/BACKEND.md`.*
