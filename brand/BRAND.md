# Causeloop — Brand & Design System

> **Find the cause, break the loop.**
> AI-native risk intelligence for the enterprise.

This is the canonical reference for the Causeloop brand and product design
system. Use it for the marketing site, the platform UI, decks, and any
external material. The interactive version is **`brand/index.html`**.

---

## 1. The mark

The mark is a **loop that nearly closes** — the recurring cycle of risk — then
**breaks outward into an arrow**: the cycle escaped. A single **terracotta
point** marks the root cause the platform surfaces.

- The loop + arrow carry the **brand blue gradient** (cobalt → cyan).
- The point is always **terracotta** `#E2603F` — it is "the cause."

### Wordmark

The wordmark is **causeloop** set in Schibsted Grotesk 800. The **"oo"** is
rendered as a **brand infinity** (the recurring loop, never-ending) in the blue
gradient, with the terracotta cause-point at the crossover — the signature,
catchy detail. On the web this is built from live type + an inline `#inf` SVG
glyph (`.wm-oo` in `assets/css/style.css`); in the static lockups the type is
positioned around the same infinity path.

### Variants & files (`brand/logos/`)

| File | Use |
| --- | --- |
| `mark.svg` | Primary — blue gradient + terracotta point |
| `mark-mono-navy.svg` | One colour, light backgrounds |
| `mark-mono-white.svg` | One colour, dark backgrounds |
| `app-icon.svg` | 512×512 app/store icon (navy square) |
| `favicon.svg` | 64×64 browser favicon |
| `lockup-horizontal.svg` | Primary lockup (mark + wordmark) |
| `lockup-stacked.svg` | Stacked lockup |
| `lockup-reversed.svg` | Wordmark white, for dark backgrounds |
| `../animation.html` | Looping brand animation: loop → cause → break → logo |

### Clear space & minimum size

- **Clear space:** keep padding ≥ the height of the mark on all sides.
- **Minimum size:** mark stays legible down to **16 px**; lockup to **120 px** wide.
- Do not recolour the loop to non-brand colours, rotate it, add effects, or
  move the terracotta point. Don't set the wordmark in another typeface.

---

## 2. Colour

### Core brand

| Token | Hex | Role |
| --- | --- | --- |
| Deep Navy | `#1E2A5A` | Primary · wordmark · headings |
| Ink | `#10172E` | Darkest surfaces / text |
| Cobalt | `#4A78FF` | Logo gradient start · interactive blue |
| Cyan | `#1FC2FF` | Logo gradient end |
| Terracotta | `#E2603F` | Accent · "the cause" · CTAs |
| Slate | `#5A6480` | Body text |
| Faint | `#98A0B5` | Muted / captions |
| Line | `#E7E9F0` | Borders / hairlines |
| Paper | `#FBFBFC` | Canvas |
| Paper-2 | `#F4F5F8` | Alt surface |

**Brand gradient:** `linear-gradient(135deg, #4A78FF, #1FC2FF)` — reserved for
the mark and primary product accents.

### Dark theme

| Token | Hex |
| --- | --- |
| Background | `#0C1124` |
| Alt background | `#0F1530` |
| Surface | `#141B38` |
| Surface-2 | `#18204A` |
| Text | `#EEF1FA` |
| Text soft | `#A9B2CD` |
| Border | `#222B4E` |
| Accent (terracotta) | `#F0764F` |

---

## 3. Design tokens (CSS)

Drop these into the platform's global stylesheet. They match the marketing
site 1:1.

```css
:root{
  /* brand */
  --navy:#1E2A5A; --ink:#10172E;
  --cobalt:#4A78FF; --cyan:#1FC2FF;
  --terra:#E2603F; --terra-2:#F0764F;
  --slate:#5A6480; --faint:#98A0B5;
  --line:#E7E9F0; --line-2:#DDE0EA;
  --paper:#FBFBFC; --paper-2:#F4F5F8; --card:#FFFFFF;
  --grad:linear-gradient(135deg,#4A78FF,#1FC2FF);

  /* semantic — light */
  --bg:var(--paper); --bg-alt:var(--paper-2);
  --surface:var(--card); --surface-2:#FFFFFF;
  --text:var(--navy); --text-soft:var(--slate); --text-faint:var(--faint);
  --border:var(--line); --border-2:var(--line-2);
  --accent:var(--terra); --accent-ink:#fff;

  /* type */
  --f-display:'Schibsted Grotesk',system-ui,sans-serif;
  --f-text:'Hanken Grotesk',system-ui,sans-serif;
  --f-mono:'JetBrains Mono',ui-monospace,monospace;

  /* radii */
  --r-sm:12px; --r:18px; --r-lg:26px; --r-xl:34px; --r-pill:999px;

  /* shadows */
  --shadow-sm:0 1px 2px rgba(16,23,46,.05), 0 1px 0 var(--line);
  --shadow-md:0 10px 30px rgba(30,42,90,.08);
  --shadow-lg:0 28px 60px rgba(30,42,90,.16);

  /* motion */
  --ease:cubic-bezier(.22,.7,.2,1);
}

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

---

## 4. Typography

| Role | Family | Weights | Notes |
| --- | --- | --- | --- |
| Display / headings / wordmark | **Schibsted Grotesk** | 700–900 | Tight tracking (`-.03em` to `-.05em`) |
| Body | **Hanken Grotesk** | 400–600 | Line-height ~1.65 |
| Labels / metrics / eyebrows | **JetBrains Mono** | 500–600 | Uppercase, `.16em` tracking |

Google Fonts import:

```html
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Schibsted+Grotesk:wght@500;600;700;800;900&display=swap" rel="stylesheet">
```

**Type scale (fluid):** H1 `clamp(2.9rem,6.6vw,5rem)` · H2 `clamp(1.9rem,4.4vw,3rem)`
· H3 `1.2rem` · Body `17px` · Lede `1.12rem` · Label `.7rem`.

---

## 5. UI primitives

| Element | Spec |
| --- | --- |
| **Primary button** | Terracotta fill, white text, `--r-pill`, `14px 24px`, hover lift `-2px` + shadow |
| **Ghost button** | Transparent, `1.5px` border `--border-2`, hover border/text → accent |
| **Pill / badge** | `--grad` or accent fill, Schibsted 600, `.76rem`, pill radius |
| **Card** | `--surface`, `1px --border`, `--r`, `--shadow-sm`; hover `translateY(-5px)` + `--shadow-md` |
| **Input** | `--r-pill` or `--r-sm`, `1.5px` border, focus border → accent |
| **Eyebrow** | Mono uppercase + terracotta dot, `.16em` tracking |

**Radii:** 12 / 18 / 26 / 34 / pill. **Spacing:** 8-pt base (8/16/24/32/48/72…).
**Motion:** `--ease` `cubic-bezier(.22,.7,.2,1)`; transitions 200–700 ms; respect
`prefers-reduced-motion`.

---

## 6. Voice

- **Tagline:** *Find the cause, break the loop.*
- **One-liner:** AI-native risk intelligence that surfaces the thematic patterns
  behind recurring issues — and stops them before they repeat.
- Plain, senior, evidence-led. We connect, detect, predict, recommend.

---

*Files: this spec (`BRAND.md`), the interactive guide (`index.html`), and vector
assets (`logos/`). Keep them in sync with `assets/css/style.css` on the site.*
