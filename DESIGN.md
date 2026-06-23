---
name: Growing Minds Science
description: Research-based parenting classes for families of children 0–5 — warm, credible, calm.
colors:
  mist: "#F0F5F3"
  surface: "#FFFFFF"
  sea-glass: "#CFE3DE"
  pine: "#15393C"
  pine-deep: "#0E2A2D"
  teal: "#1E5F62"
  teal-soft: "#2E7A77"
  coral: "#DE7356"
  coral-deep: "#9C4429"
  coral-on-dark: "#E78D6F"
  coral-tint: "#F8E7E0"
  ink-soft: "#3D5A5A"
  ink-muted: "#5C7472"
  line: "#D4E0DC"
  line-soft: "#E2EAE7"
  on-dark: "#EDF4F1"
  on-dark-soft: "#BCD2CC"
  on-dark-muted: "#8BA59F"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Avenir Next, Helvetica Neue, sans-serif"
    fontSize: "clamp(2.45rem, 1.3rem + 4.6vw, 4.1rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Bricolage Grotesque, Avenir Next, Helvetica Neue, sans-serif"
    fontSize: "clamp(1.9rem, 1.2rem + 2.8vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Bricolage Grotesque, Avenir Next, Helvetica Neue, sans-serif"
    fontSize: "clamp(1.45rem, 1.1rem + 1.4vw, 1.9rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  highlight:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "inherit"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "0"
  eyebrow:
    fontFamily: "Bricolage Grotesque, Avenir Next, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  pill: "999px"
  arch: "999px 999px 20px 20px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  "2xl": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.5rem"
    height: "48px"
  button-quiet:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.pine}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.5rem"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.pine}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
---

# Design System: Growing Minds Science

## 1. Overview

**Creative North Star: "Tidepool"**

A calm, clear pool of teal lit by a single warm coral. The homepage runs on
deep teal-ink (`#15393C`) text and dark bands, a cool aqua-mist ground
(`#F0F5F3` — deliberately *not* cream), brand teal for action, and exactly one
warm accent: coral. The voice is a knowledgeable friend who happens to be a
developmental scientist — reassurance and competence in equal measure. A tired,
skeptical parent should arrive and exhale.

The type pairing carries the personality: **Bricolage Grotesque** (a humanist
grotesque with character) for display, set tight and confident, over
**Source Serif 4** for body — and the signature move lives in the seam between
them: a coral serif-italic phrase (`.hl`) dropped inside an otherwise grotesque
headline ("Your child's behavior makes sense. *Here's why.*"). Warmth is carried
by that coral, the serif body, and editorial photography behind soft arch
shapes — never by pastels. The palette tilts cool-green where most parenting
brands tilt nursery-pastel, which is what keeps it adult and trustworthy.

This system explicitly rejects two things. It is **not a generic SaaS/startup
launch page** — no gradient hero, no big-number hero-metric template, no endless
identical icon-card grids, no purple-on-white. And it is **not clinical or
medical** — no sterile hospital-blue, no fear-based "is your child behind?"
deficit framing.

**Key Characteristics:**
- Cool aqua-mist ground + deep teal-ink, with one coral accent — adult, not pastel.
- Bricolage Grotesque display (tight, 600) over Source Serif 4 body (17px, 1.65).
- Signature `.hl`: coral serif-italic phrase inside grotesque headlines.
- Pill buttons (48px min), soft 14–20px card radii, an "arch" doorway motif for hero imagery.
- Diffuse, low, long shadows; depth from tonal layering (mist → surface → pine bands).
- Custom SVG decor (orbital rings, botanical sprigs) and a bespoke interactive Growth Arc.
- Full light/dark theming via `[data-theme]`, persisted and system-aware; reduced-motion honored.

## 2. Colors

A cool teal foundation — mist ground, deep pine ink, brand teal action — punctuated by a single warm coral. Restraint on the warm side is the point.

### Primary
- **Brand Teal** (`#1E5F62`): the action color — primary buttons (white text, AA), links, focus. `teal-soft` (`#2E7A77`) for hover and large decorative strokes.

### Secondary
- **Coral** (`#DE7356`): the one warm accent — decorative SVG marks, the milestone dot, large `.hl` text on dark bands, `::selection`. Reserved; rarity is its power.
- **Coral-Deep** (`#9C4429`): coral at text sizes — the `.hl` highlight on light grounds and eyebrows. AA on mist, white, and sea-glass.
- **Coral-on-Dark** (`#E78D6F`): the lighter coral required for *small* coral text on pine bands (eyebrow--on-dark, trust attribution, chat avatar). AA on pine.

### Neutral
- **Mist** (`#F0F5F3`): the page ground — cool aqua, not cream.
- **Surface** (`#FFFFFF`) / **Sea-Glass** (`#CFE3DE`): card surface and tinted section bands (the AI section).
- **Pine** (`#15393C`) / **Pine-Deep** (`#0E2A2D`): dominant text, dark feature bands (trust, waitlist), footer floor.
- **Ink-Soft** (`#3D5A5A`): secondary body copy. **Ink-Muted** (`#5C7472`): meta/labels only (AA on mist/white; **fails on sea-glass** — don't use it there).
- **Line** (`#D4E0DC`) / **Line-Soft** (`#E2EAE7`): full borders and hairline dividers.
- **On-Dark** (`#EDF4F1`) / **On-Dark-Soft** (`#BCD2CC`) / **On-Dark-Muted** (`#8BA59F`): text tiers on pine bands (all AA on pine).

### Named Rules
**The One-Coral Rule.** Coral is the only warm color and it appears sparingly — a mark, a highlighted phrase, a focus ring. If coral is doing more than punctuating, it's doing too much.

**The Coral-Size Rule.** Coral text must match its background: `coral-deep` on light grounds, `coral-on-dark` on pine. Plain `--coral` (#DE7356) is for decor and large display text only — it fails AA as small body text on both mist (2.85:1) and pine (3.98:1).

**The Cool-Ground Rule.** The body ground is cool aqua-mist, never cream/sand. Warmth comes from coral, the serif, and imagery — not from a warm-tinted background.

## 3. Typography

**Display Font:** Bricolage Grotesque (with Avenir Next, Helvetica Neue)
**Body Font:** Source Serif 4 (with Georgia)

**Character:** A humanist grotesque with personality, set tight (−0.015em) and heavy (600), paired against a readable optical serif. The contrast axis (grotesque vs. serif) is real, so the pairing reads designed; the serif keeps long copy warm and human.

### Hierarchy
- **Display** (600, `clamp(2.45rem → 4.1rem)`, 1.06, −0.015em): hero headline.
- **Headline** (600, `clamp(1.9rem → 3rem)`, 1.06): section h2s.
- **Title** (600, `clamp(1.45rem → 1.9rem)`, 1.1): card/module/way headings (h3).
- **Body** (400, `1.0625rem` / 17px, 1.65): all running text in Source Serif 4. Cap measure ~60–72ch (the project uses `max-width: 60ch` on prose).
- **Highlight `.hl`** (Source Serif 4 italic, 500): the signature coral phrase inside grotesque headlines. `coral-deep` on light, `coral` on dark bands.
- **Eyebrow** (Bricolage Grotesque, `0.75rem`, 600, uppercase, `0.18em`): section kicker. `coral-deep` on light, `coral-on-dark` on pine.

### Named Rules
**The Signature-Phrase Rule.** The coral serif-italic `.hl` is the brand's one typographic flourish. Use it on the headlines that most deserve emphasis — not on every section, or it becomes a tic.

**The Eyebrow-Earns-It Rule.** An eyebrow appears only when it carries real information (age range, "Free · sources shown", enrolling status) — not as automatic scaffolding above every section.

## 4. Elevation

Mostly flat, with low, long, diffuse shadows tinted toward pine. Depth comes more from tonal layering — mist ground, white surfaces, and dark pine feature bands — than from drop shadows. Buttons and the chat card lift slightly; most surfaces rest near-flat.

### Shadow Vocabulary
- **sm** (`box-shadow: 0 1px 2px rgba(14,42,45,0.06)`): resting hairline lift.
- **md** (`box-shadow: 0 16px 36px -20px rgba(14,42,45,0.32)`): cards, dropdowns.
- **lg** (`box-shadow: 0 32px 64px -30px rgba(14,42,45,0.4)`): the chat demo, prominent floats.
- **button-primary** (`0 14px 28px -16px rgba(30,95,98,0.55)`): soft teal-tinted glow under primary buttons.

### Named Rules
**The Tonal-Depth Rule.** Reach for a darker pine band before reaching for a heavier shadow. The page's depth is its bands, not its drop shadows.

## 5. Components

### Buttons
- **Shape:** pills (`border-radius: 999px`), `min-height: 48px`, `0.8rem 1.5rem` padding, Bricolage Grotesque 600, `1.5px` transparent border baseline.
- **Primary:** teal fill (`#1E5F62`), white text, soft teal glow; hover deepens. Lifts ~140ms on `transform`.
- **Quiet (`--quiet`):** transparent/mist background, `line` border, pine text — the secondary action.
- **`--lg` / `--block`:** larger padding / full width.

### Cards & List Rows (modules, ways, class rail)
- **Corner Style:** 14–20px radii (`--radius` / `--radius-lg`).
- **Background:** white `surface` on mist; the class rail and AI band use `sea-glass`.
- **Border:** full 1px `line` — never a single colored side-stripe.
- **Shadow:** `sm` at rest, `md` on hover where lift is used.
- **Numbered rows:** modules carry `01–05` because the curriculum is an ordered sequence; this is intentional, not decorative scaffolding.

### Inputs / Fields
- **Style:** white surface, `line` border, soft radius, Source Serif 4.
- **Focus:** visible `:focus-visible` — `2.5px` coral-deep outline, `3px` offset (coral on dark bands). Never removed.

### Navigation
- **Style:** sticky header (70px), Bricolage Grotesque links, teal hover; primary "See the class" pill CTA. Theme toggle. Mobile: off-canvas, fully hidden until toggled, closes on link click / Escape.

### Signature: Growth Arc & Chat Demo
- **Growth Arc:** a custom `role="tablist"` of five developmental stages over an SVG curve, with arrow/Home/End keys, `aria-selected`, and a coral active dot. The brand's centerpiece interaction.
- **Chat demo:** an embedded Growing Minds AI preview — white card, `lg` shadow, pine avatar, live status. Demonstrates the product, not decoration.

## 6. Do's and Don'ts

### Do:
- **Do** keep the cool aqua-mist (`#F0F5F3`) ground — warmth comes from coral, serif, and imagery (The Cool-Ground Rule).
- **Do** size coral text to its background: `coral-deep` on light, `coral-on-dark` on pine, `coral` for decor/large only (The Coral-Size Rule).
- **Do** reserve the coral serif-italic `.hl` for headlines that earn emphasis.
- **Do** use full 1px `line` borders on cards; let dark pine bands carry depth.
- **Do** keep primary CTAs as teal pills (48px min) and "Enroll" labels pointing only to checkout.
- **Do** honor `prefers-reduced-motion`, keep content visible by default (reveal is enhancement, never a gate), and keep the light/dark toggle working on every surface.

### Don't:
- **Don't** ship a **generic SaaS/startup** look: no gradient hero, no big-number hero-metric template, no identical icon-card grids, no purple-on-white.
- **Don't** go **clinical/medical**: no sterile hospital-blue, no fear-based "is your child behind?" messaging.
- **Don't** revert to a cream/sand/warm-tinted body ground — Tidepool is cool by design.
- **Don't** use a `border-left`/`border-right` greater than 1px as a colored accent stripe (it was removed from the hero credibility callout — keep it gone).
- **Don't** animate layout properties (padding/width/height) for motion — use `transform`/`opacity`.
- **Don't** put an eyebrow above every section, and don't let the `.hl` highlight land on every heading.
- **Don't** use gradient text or default glassmorphism.
