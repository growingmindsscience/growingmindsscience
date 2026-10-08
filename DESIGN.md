---
name: Growing Minds Science
description: A developmental-science education for parents of children 0–5. Deep ink, paper-white, one amber highlighter.
colors:
  ground: "#F6F9F8"
  surface: "#FFFFFF"
  tint: "#E6EFED"
  ink: "#12262C"
  ink-800: "#14323A"
  ink-900: "#0E2129"
  ink-soft: "#3A5058"
  ink-muted: "#52676C"
  teal: "#1E5F62"
  teal-soft: "#2E7A77"
  teal-light: "#7FC4BC"
  amber: "#F2A93B"
  amber-deep: "#7F5008"
  amber-tint: "#FBEBC8"
  line: "#D3DEDC"
  line-soft: "#E3EBE9"
  on-dark: "#EEF4F3"
  on-dark-soft: "#BCCFD3"
  on-dark-muted: "#8DA6AC"
typography:
  display:
    fontFamily: "Besley, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.3rem, 0.1rem + 3.75vw, 3.4rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Besley, Georgia, Times New Roman, serif"
    fontSize: "clamp(2rem, 1.3rem + 3vw, 3.1rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Besley, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.5rem, 1.1rem + 1.6vw, 2.125rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  highlight:
    fontFamily: "inherit"
    fontSize: "inherit"
    fontWeight: "inherit"
    lineHeight: "inherit"
    letterSpacing: "inherit"
  caption:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  sm: "6px"
  control: "10px"
  card: "14px"
  lg: "18px"
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
    rounded: "{rounded.control}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-amber:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
---

# Design System: Growing Minds Science

## 1. Overview

**Creative North Star: "Seminar"**

A parent at the kitchen table at 9:40 pm, one lamp on, kid finally asleep,
laptop open, wanting to understand why bedtime fell apart tonight and wanting
to feel like a capable student rather than a failing caregiver. That scene
sets everything: deep ink bands where the lamp-lit study happens (the hero,
office hours, enrolment), a cool paper-white ground for reading, and one amber
accent that behaves like a highlighter across the phrase that matters.

The brand teaches. Its native imagery is the **textbook figure**: an inline
SVG diagram with a numbered caption and a stated source ("Fig. 1 · Windows of
heightened plasticity by domain. Schematic after Nelson (2000)."). Photos are
reserved for the curriculum, where they show the developmental window a class
covers. A faint graph-paper texture sits behind the ink bands; it carries
"science" without a stock photo.

Type carries the voice: **Besley**, a Clarendon-flavored serif with textbook
authority, for display, over **Atkinson Hyperlegible Next**, a sans designed
for legibility, for everything a tired reader has to actually read. The
pairing is serif-vs-sans on purpose; it should feel like a well-set course
reader, not a magazine and not a SaaS launch.

This system explicitly rejects three things. Not **generic SaaS/startup** (no
gradient hero, hero-metric template, identical icon cards). Not
**clinical/medical** (no hospital-blue, no deficit framing). Not **nursery
pastel / stock-baby** (the parent is the student; the imagery is the course).

**Key Characteristics:**
- Committed color: ink-800 drenches roughly 40% of the homepage; the rest is paper-white.
- One amber accent drawn from the logo's brain mark: highlighter, large text on ink, decor.
- Besley 500 display over Atkinson Hyperlegible Next 17px body.
- Signature `.hl` highlighter mark inside headlines; signature figures with captions.
- Rounded-rectangle controls (10px), not pills; full 1px hairline rules, not cards.
- Full light/dark theming via `[data-theme]`; in dark the ground (#15262C) stays lighter than the ink bands so the band structure survives.
- Motion is three signatures (hero choreography, two figure draw-ins) plus a fade on the chat demo; rows are simply present.

## 2. Colors

### Primary
- **Ink** (`#12262C`): dominant text on light grounds.
- **Ink-800** (`#14323A`): the drenched hero and the office-hours band. **Ink-900** (`#0E2129`): the enrol band and footer floor.
- **Brand Teal** (`#1E5F62`): the action color on light grounds (primary buttons, links). `teal-soft` (`#2E7A77`) for hover; `teal-light` (`#7FC4BC`) for teal at text size on ink.

### Secondary
- **Amber** (`#F2A93B`): the one accent. The highlighter behind a phrase, amber buttons on ink bands, figure strokes, decor seeds. Text-size amber on ink is AA (6.8:1).
- **Amber-Deep** (`#7F5008`): amber at text sizes on light grounds (6.5:1 on ground, 5.8:1 on amber-tint): figure labels, "Class 1" numerals, status pills, focus rings.
- **Amber-Tint** (`#FBEBC8`): pale band for status pills and the research node in Figure 2.

### Neutral
- **Ground** (`#F6F9F8`): the page ground. Cool paper-white, chroma toward the teal, never cream.
- **Surface** (`#FFFFFF`) / **Tint** (`#E6EFED`): white bands and tinted chips.
- **Ink-Soft** (`#3A5058`): secondary copy (8:1). **Ink-Muted** (`#52676C`): meta and labels (≥5:1 on ground, surface, tint, and amber-tint).
- **Line** (`#D3DEDC`) / **Line-Soft** (`#E3EBE9`): rules and borders.
- **On-Dark** (`#EEF4F3`) / **On-Dark-Soft** (`#BCCFD3`) / **On-Dark-Muted** (`#8DA6AC`): text tiers on ink bands (12:1, 8.4:1, 5.3:1).

### Named Rules
**The Highlighter Rule.** Amber is a highlighter, not a paint. It marks one phrase per headline at most, fills a button only on ink bands, and otherwise appears as a stroke or a seed. If amber is doing more than marking, it is doing too much.

**The Amber-Size Rule.** `amber` for marks, buttons, decor, and text on ink. `amber-deep` for any text on a light ground. Plain amber as small text on light fails AA.

**The Paper Rule.** The ground is cool paper-white, never cream, sand, or beige. Warmth lives in amber, in Besley, and in the curriculum photos.

### Domain Palette (data-viz only)
The milestone tracker color-codes its six developmental domains for scanning. This remains the one sanctioned fuller palette, kept muted. Each is a light tint with an AA-on-white deep text color, used only on the domain badge:
- **Cognitive** — tint `#DBEAE6`, text `#1A565A`
- **Social-emotional** — tint `#F7E5DE`, text `#7F5008`
- **Motor** — tint `#DCE8DB`, text `#3C6B45`
- **Language** — tint `#F1E6CD`, text `#785618`
- **Sensory & regulation** — tint `#E1E9F1`, text `#3C5E78`
- **Adaptive skills** — tint `#F1E2EA`, text `#7A4660`

### Utility & status colors
- **Available green** `#5FBF8E`: the Growing Minds AI "online" dot only.
- **Danger** `#A6371F` light / `#F0907E` dark: form errors.
- **Selection**: `#0E2129` text on `amber`.
- **Shadows** are ink-tinted (`rgba(14,33,41,…)`).

### Arcade palettes
The arcade games on `/arcade` keep their own isolated retro palettes (dark cabinets, phosphor greens). Scoped to the game canvases and arcade stylesheets only; not design-system drift.

### Radius scale
`sm 6 · control 10 · card 14 · lg 18`. Pills are retired outside the arcade; the seminar is rectangular with softened corners.

## 3. Typography

**Display Font:** Besley (fallback Georgia)
**Body Font:** Atkinson Hyperlegible Next (fallback Helvetica Neue, Arial)

The fallbacks are metric-matched: `Besley Fallback` (local Georgia, size-adjust 114.5%) and `Atkinson Fallback` (local Arial, 99.3%) are declared in `styles.css` and `home.css` and sit second in each stack, so lines wrap the same way before and after the web fonts swap in and the page does not jump.

**Character:** Besley is a Clarendon with warmth: textbook headings, confident at weight 500, normal tracking (−0.005em; never tighter than −0.01em, Clarendons cramp). Atkinson Hyperlegible Next was designed for low-vision legibility, which is exactly right for a tired parent reading at night; it sets body, UI, labels, and figure text.

### Hierarchy
- **Display** (Besley 500, `clamp(2.3rem → 3.4rem)` above 1100px, 1.04): hero headline, sized so each sentence holds one line in the two-column hero.
- **Headline** (Besley 500, `clamp(2rem → 3.1rem)`, 1.08): section h2s.
- **Title** (Besley 500, `clamp(1.5rem → 2.125rem)`, 1.12): class titles, lens names, shelf headings.
- **Body** (Atkinson 400, 17px, 1.6): all running text. Measure ≤ 60ch.
- **Caption** (Atkinson 400, 15px, 1.55, ink-muted): figure captions; the "Fig. N" label is Besley 600 italic in amber-deep.
- **Class numeral** (Besley 500 italic, 15px, amber-deep): "Class 1 · Birth to 12 months".
- **Figure text** (Atkinson 500, 15px / 13px inside the SVG viewBox).

### Named Rules
**The Highlighter-Phrase Rule.** The `.hl` mark is the brand's one typographic flourish. One phrase, on the headline that most deserves it; the hero, the thesis, office hours, and enrol each carry one. Never on every heading.

**The Figure Rule.** Every diagram is a `<figure>` with an SVG `<title>` and `<desc>`, a visible "Fig. N" caption, and its source named when it is adapted from published work.

**No eyebrows.** Small uppercase tracked kickers are retired. Where a label is needed (hero, office hours) it is sentence-case, 15px, amber or amber-deep, and carries real information.

## 4. Elevation

Mostly flat. Depth comes from tonal bands (ground → surface → ink-800 → ink-900) and from hairline rules, not from drop shadows. The chat card, the enrol form, and the Figure 2 panel are the only lifted surfaces.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(14,33,41,0.06)`): resting lift.
- **md** (`0 16px 36px -20px rgba(14,33,41,0.32)`): dropdowns.
- **lg** (`0 24px 44px -26px rgba(14,33,41,0.42)`): the chat card and the Figure 2 panel.
- **button-primary** (`0 14px 28px -16px rgba(30,95,98,0.55)`); **button-amber** (`0 16px 30px -18px rgba(242,169,59,0.7)`).

**The Band Rule.** Reach for a darker band before a heavier shadow.

## 5. Components

### Buttons
- **Shape:** 10px radius, `min-height: 48px`, `0.8rem 1.4rem`, Atkinson 600, 1.5px transparent border.
- **Primary (light grounds):** teal fill, white text. Hover deepens to ink-800 and lifts 2px.
- **Amber (ink bands only):** amber fill, ink-900 text. The hero, office hours, and enrol CTAs.
- **Quiet:** transparent, `line` border, ink text. **Ghost-dark:** transparent, 32% on-dark border, for secondary actions on ink.
- `--lg` / `--block` for size and width.

### Rows, not cards
Lenses, curriculum units, principles, and shelf links are ruled rows (1px `line` top and bottom), with a hover wash of the ground color. The curriculum is a numbered `<ol>` because the classes are a developmental sequence; the numbers carry information.

### Curriculum unit
`thumb (7.25rem square photo) | numeral + title + "After this class you can explain …" | status pill + meta dl + CTA`. Status pills: `--open` is amber-tint / amber-deep, `--soon` is tint / ink-muted. On phones the sticky CTA jumps to the enrol band (`#signup`), never to another page. The header CTA hides on the page it points to. Open units get a primary button; upcoming units get a quiet "Join the waitlist". The unit, figure, syllabus, reading-list, and price-sheet styles live in `assets/css/seminar.css`, shared by the homepage and the inner pages (styles.css aliases `--line`, `--ground`, `--tint`, `--teal` to its own names). On `/classes/` an open unit carries two actions, "Enroll, $49" and "See the class", with a one-line note under them saying where checkout happens and that sales are final.

### Class pages
Every class page's enroll band runs heading, then the price card, then the details, so on phones an "Enroll" jump lands with the button on screen (`.signup__inner--offer`). Every class page opens the same way: a numeral line ("Class 2 · Ages 1 to 3"), the full title as H1, a facts `dl` (format, length or status, price), two buttons, one line of fine print, and on the right either a captioned figure from inside the class (open classes) or the commissioned class photo (classes in development). Below it: outcomes, the syllabus as a ruled `<ol>` of modules (lesson titles listed when they exist), who it's for, who teaches it, a reading list of free material for that age, the FAQ, and the enroll band. Class names are always "Short name: subtitle" in full and "Class N · Short name" over the subtitle in rows, in developmental order (infant first).

### Figures
Inline SVG inside `<figure class="fig">`. Fig. 1 (hero) is the plasticity-windows chart on ink; Fig. 2 (how it's taught) is the research → model → moment → noticing loop on a white panel. Curves use `pathLength="1"` so they draw in with a dash offset; labels fade after. Strokes distinguish by dash pattern as well as color. Figure text must render at 14px or more: draw on a narrow viewBox (480 wide), set labels at 16 units, and step them to 20 units below 560px, checking that labels don't collide at phone width. Curves that fall after a peak taper to a level above zero unless the data says otherwise. On paper (`.fig--plate`) the figure sits in a white, 14px-radius frame with a key in real text when two line styles need naming. Fig. 2 sits in a narrow aside (about 300px at 1024 and on phones), so it is drawn 400 wide with 19-unit labels and capped at 26rem. Article figures use the same "Fig. N" caption label as the homepage.

### Instructor block
Portrait (4:5, 11rem column) beside name, role, four fact bullets with amber seeds, and a link to About. Sits under the three lenses so the thesis is attributed to a face, not a thumbnail. Never fabricate testimonials; proof is credentials, the coaching count, and the free material.

### Open-now strip
A ruled white shelf directly under the homepage hero: the "Open now" status chip, then one row per open class (48px class photo, Besley name, "N lessons · $49 once", arrow to the class page), then "All four classes ↓" to the curriculum. It puts the offer a glance below the hero instead of three screens down. It links to class pages, not checkout, and the phone sticky CTA steps aside while it is on screen.

### Enrol band
The page's closing beat is the purchase, not the waitlist: H2 with the price in the highlighter, one line on what both classes share (one payment, lifetime access, self-paced), then `.enrol-list` rows (class numeral, title, format, the one inclusion that differs, price, amber CTA) beside a product FAQ ("Before you enroll": try first, background, access, refund, medical). The waitlist is one quiet row underneath with a single email field and a quiet-dark button.

### Class facts (one list, everywhere)
The offer reads the same on the homepage rows and enrol band, `/classes/`, each class page's facts `dl`, and `/pricing`. Change it in all four places or none.
- **Birth to 12 months:** 4 modules, 16 lessons, about 3 hours; includes captions and a written version of every lesson; checkout here with Stripe, lessons under My classes.
- **Toddler years:** 5 modules, 29 lessons, about 5 hours; includes unlimited Growing Minds AI for life (`nsc/lib/grants.ts`); checkout and lessons on Thinkific until the class moves on-site, so every toddler Enroll button carries ↗, a quiet note under it says "Opens Thinkific, our course platform, in a new tab", and every toddler block carries "Already enrolled? Log in on Thinkific".
- **Both:** $49 once, lifetime access. Full refund within 14 days if the buyer has watched 4 lessons or fewer (the app reads it from `nsc/lib/refund-policy.ts`); say it once per page, at the price. Free things (the milestone tracker, five AI questions a day) are never listed as "included".
- **Enroll labels:** "Enroll, $49" on any button that stands alone; plain "Enroll" only where the price sits right beside it (the homepage enrol rows, the phone enroll bar). A button that opens a new tab shows ↗ as well as screen-reader text.
- **See before you buy:** the infant class's "Serve and Return" plays free at `/nsc/classes/infant/preview` with no account; it is the infant class's second action wherever the class is sold. The toddler page carries a written excerpt from Module 4, Lesson 1, under the hero, until a toddler lesson can be previewed the same way.
- **Lesson and module titles** are the class's own titles from the app and keep their Title Case; every other heading is sentence case.

### Chat demo
Labelled "Example conversation" with a bordered tag; no fake "online" status and no perpetual pulse (Calm by default). Source chips are 13px minimum.

### Inputs / Fields
Ground-colored field on a white card, `line` border, 10px radius, teal focus ring. Errors use `danger`, never amber (amber is the accent, not a warning).

### Navigation
- **One header and footer everywhere.** Styles live only in `assets/css/chrome.css`, behavior only in `assets/js/chrome.js`. Don't restyle `.site-header` / `.site-footer` in page stylesheets.
- **Ink variant:** a page that opens on an ink hero adds `site-header--ink`; the bar reads as part of the hero, links go on-dark, and the CTA turns amber. The homepage uses it. Inner pages keep the light bar.
- **Structure:** Classes · Free tools (details menu) · Articles · About, divider, My classes, one CTA, theme toggle. "My classes" (to `/nsc/app/classes`) is the one account link on every page; it says what the account is for. The arcade lives only on `/arcade`, reached from the Free tools menu (with a one-line description) and the footer. There are no hidden triggers, glyphs or orbs on any other page, and every game opens from a visible Play button. It exists so stressed parents can stop thinking for five minutes, and the copy says so. It stays out of the homepage's run-up to the price. Nav links are Atkinson 500; the wordmark is Besley 600. Amber underline for hover/current.
- **Footer:** ink-900, brand + Instagram, Classes / Free tools / About columns in Atkinson, Besley column headings.

## 6. Do's and Don'ts

### Do:
- **Do** keep the cool paper-white ground and let ink-800 / ink-900 bands carry the drama (The Paper Rule, The Band Rule).
- **Do** size amber to its ground: `amber` on ink, `amber-deep` on light (The Amber-Size Rule).
- **Do** reach for a captioned figure before a stock photo when the section explains something.
- **Do** use ruled rows for lists of parallel things; reserve raised white panels for the few surfaces that need lift.
- **Do** keep every SVG figure accessible: `<title>`, `<desc>`, visible caption, dash patterns as well as color.
- **Do** honor `prefers-reduced-motion`, keep content visible by default, and keep the theme toggle working on every surface.

### Don't:
- **Don't** ship a **generic SaaS/startup** look: no gradient hero, hero-metric template, identical icon-card grids, purple-on-white.
- **Don't** go **clinical** or **nursery**: no hospital-blue, no deficit framing, no pastels, no stock-baby as brand imagery.
- **Don't** put the highlighter on every heading, or use amber as small text on light grounds.
- **Don't** bring back pills, uppercase tracked eyebrows, or numbered section markers as scaffolding.
- **Don't** use `border-left`/`border-right` > 1px as a colored accent stripe.
- **Don't** animate layout properties; use `transform`, `opacity`, `background-size`, and `stroke-dashoffset`.
- **Don't** use gradient text or decorative glassmorphism.
