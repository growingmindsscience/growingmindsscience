---
name: Growing Minds Science
description: A developmental-science education for parents of children 0 to 5. The first five years as a survey map: map-white sheet, navy ink, slate contours, one teal route.
colors:
  bg: "#F3F5F0"
  bg-alt: "#E9EEE8"
  surface: "#FBFCFA"
  surface-2: "#E2E9E4"
  border: "#C5D0CC"
  border-soft: "#D9E1DD"
  ink: "#1B2A3A"
  ink-soft: "#3A4A5A"
  ink-muted: "#56687A"
  ink-700: "#2B4357"
  ink-800: "#22364A"
  ink-900: "#16232F"
  primary: "#1E5F62"
  primary-hover: "#17494B"
  primary-ink: "#FFFFFF"
  contour: "#8FA3B5"
  woodland: "#C9D8CC"
  water: "#BFD7E6"
  route-tint: "#D5E6E3"
  leaf: "#2E7A5F"
  danger: "#A6371F"
  success: "#2F6B4A"
  on-dark: "#EEF2F4"
  on-dark-soft: "#C3CFD9"
  on-dark-muted: "#93A3B3"
typography:
  display:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 1rem + 4.6vw, 4.6rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 2.9vw, 2.9rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  row-title:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  lede:
    fontFamily: "Literata, Literata Fallback, Georgia, Times New Roman, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body:
    fontFamily: "Literata, Literata Fallback, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  caption:
    fontFamily: "Literata, Literata Fallback, Georgia, Times New Roman, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  map-label:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0"
    fontVariation: "tabular-nums"
  label-xs:
    fontFamily: "Geologica, Geologica Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  sm: "0"
  md: "0"
  lg: "0"
  xl: "0"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
  "12": "3rem"
  "16": "4rem"
  "24": "6rem"
  "32": "8rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-quiet-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-on-dark:
    backgroundColor: "{colors.on-dark}"
    textColor: "{colors.ink-900}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-quiet-dark:
    backgroundColor: "transparent"
    textColor: "{colors.on-dark}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.8rem 1.4rem"
    height: "48px"
  button-lg:
    padding: "0.95rem 1.7rem"
    height: "54px"
    typography: "{typography.body}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1rem 1.25rem"
  panel-on-navy:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sm}"
    padding: "1.25rem 1.5rem"
  chip-open:
    backgroundColor: "{colors.route-tint}"
    textColor: "{colors.primary}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
  chip-soon:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 0.9rem"
    height: "48px"
  input-on-navy:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 0.9rem"
    height: "48px"
  phrase-mark:
    backgroundColor: "{colors.woodland}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 0.1em"
  phrase-mark-on-navy:
    backgroundColor: "{colors.ink-700}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.sm}"
    padding: "0 0.1em"
---

> **Field Guide redesign (branch `redesign/field-guide`, October 2026).**
> Every page now runs on "The Living Field Guide to the Growing Mind": tokens in
> `assets/css/tokens-field-guide.css` (Newsreader over DM Sans; paper, ink, forest, sage), the page
> stylesheet `assets/css/field-guide.css`, the inner-page templates `field-guide-pages.css`, and the
> components `lens.css` / `explorer.css`. The shared header and footer are `chrome.css` and the
> fragments in `docs/field-guide/fragments/`. The hub pages (classes, the four class pages, pricing,
> tools, articles, about) are built on the field-guide templates; the other inner pages keep their
> older markup under `styles.css` + `refresh.css`, whose Field Guide layer carries the house rules.
> The governing documents are in `docs/field-guide/` (creative-direction, build-contract, copy-deck,
> preservation-plan, phase-3-report). The Terrain system described below is superseded; its token
> file is gone, and the sections that follow remain only as the record of the previous system.

# Design System: Growing Minds Science

## Overview

**Creative North Star: "The Terrain"**

Development is terrain, not a line. The site is one survey sheet of the first
five years: a map-white ground, navy ink for every word, slate contour lines as
the sheet's own material, sage woodland and a pale stream as fields, and one
dashed teal route with round waymarks running birth to five. The homepage hero
is the sheet itself, with an age cursor a parent drags along the route; every
inner page carries a stretch of the same sheet (a terrain inset on `/tools/`,
route-segment bars on class rows). The parent is reading a landscape, and the
science is the landscape. This replaces the earlier "Seminar" world (Besley,
Atkinson Hyperlegible Next, ink bands, amber highlighter, 10px radii), which
survives only in the `/nsc` class app until it is restyled.

The world is calm and inviting but collegiate and respectable (Matthew,
2026-10-13). Nothing is lifted, rounded, washed, or gradiented: fields separate
by a tone step, panels announce themselves with a 3px ink rule across the top
(a legend bar), photographs sit in a 2px ink frame like map insets, and the one
colour that is not a neutral is the teal route. Two inverted navy fields, the
office-hours band and the enrol band plus footer, close each page the way the
dark field closes a sheet.

Type is Geologica, a wide geometric sans, for display, legend lettering,
numerals and buttons, over Literata, an optical-size serif, for everything a
tired parent has to read. The pairing reads as a well-made reference map with
a printed gazetteer, not a SaaS launch, a clinic, or a nursery.

**Key Characteristics:**
- Map-white ground, navy ink, slate contours, sage woodland, one teal route; no orange, no warm accent at scale.
- Geologica 600 display with tight tracking over Literata 400 at 17px.
- Square corners everywhere (every radius token is 0); no box-shadow at rest.
- 3px ink rules as legend bars on panels, lists and figures; 6px colour bars as route segments on legend cells and class rows; 2px ink frames on photographs.
- One phrase mark per headline: a patch of woodland behind the words, the same ink.
- Full light/dark theming via `[data-theme]`; on the night sheet the ground stays lighter than the navy fields so the band structure survives and the route brightens.
- One signature interaction: the age cursor on the route; the route draws in once on load.

## Colors

A cool survey palette: one sheet, one ink, two drawn fields, one route.

### Primary
- **Teal Route** (`primary`): the single action colour. Primary buttons, links, the route stroke, the active waymark and cursor dot, the active legend bar, the chat avatar, the range thumb, focus rings, selection. At text size it reads 7:1 on the sheet, so it needs no darker twin. **Teal Route Deep** (`primary-hover`) is the hover fill. **Route Tint** (`route-tint`, still named `--amber-tint` in the CSS) is the pale teal behind the "Open" status chip.

### Neutral
- **Map-White Sheet** (`bg`): the page ground and the fill of inactive waymarks. **Sage Step** (`bg-alt`): the one tone step for alternate sections, the scrolled header, hover washes, the AI reply bubble. **Sheet Surface** (`surface`): panels, the readout, class rows, the chat card, the Free tools menu. **Sheet Tint** (`surface-2`): chips, figure nodes, thumb backgrounds.
- **Navy Ink** (`ink`): all type, all rules, the range track, user chat bubbles. **Ink Soft** (`ink-soft`) for secondary copy, **Ink Muted** (`ink-muted`, 5:1 on the sheet) for meta, legend meta, grid references and captions.
- **Navy Field** (`ink-800`): the office-hours band and raised rows on the enrol band. **Navy Floor** (`ink-900`): the enrol band and the footer. **Navy Raised** (`ink-700`): the phrase mark on navy fields and the dark header's menu surface.
- **Slate Contour** (`contour`): contour lines, inactive legend bars, the dashed bar on in-development classes. Decor only; never type.
- **Sage Woodland** (`woodland`): woodland patches on the sheet and the phrase mark on light grounds. **Pale Stream** (`water`): the stream stroke only.
- **Hairline** (`border`) and **Hairline Soft** (`border-soft`): inputs, tables, the chat tag, and figure grids only.
- **On-Dark / On-Dark Soft / On-Dark Muted**: the three text tiers on navy fields; headings on navy are pure white.
- **Leaf** (`leaf`), **Success** (`success`), **Danger** (`danger`): status and form errors. Danger is the only warm hue, and only on errors.

### Named Rules
**The One Route Rule.** Teal is the only chromatic colour at text or button size. Anything that asks for the eye (a button, a link, the active waymark, the open chip's text) is teal; anything that does not is ink, a grey, or a field. If a second accent appears, the map has lost its route.

**The No Orange Rule.** Orange, amber and terracotta are never a main colour (Matthew, 2026-10-13). The legacy `--amber*` names still exist in `tokens-terrain.css` but resolve to the route and its tint; do not reintroduce a warm value under them. The arcade's isolated cabinet palettes are the one exception and stay on `/arcade`.

**The Night Sheet Rule.** In dark mode the ground (`#141E28`) stays lighter than the navy fields (`#0F171F`, `#0A1016`), contours dim to `#45596C`, and the route brightens to `#7FC4BC` with `#07211E` text on it.

## Typography

**Display Font:** Geologica (with "Geologica Fallback": local Helvetica Neue or Arial, size-adjust 108%)
**Body Font:** Literata (with "Literata Fallback": local Georgia, size-adjust 101%)

Both load from Google Fonts with `display=swap`: Geologica weights 400 to 800, Literata with italic, optical size 7 to 72, weights 400 to 700. The fallbacks are declared in `tokens-terrain.css` with ascent and descent overrides so lines wrap the same way before and after the swap.

**Character:** Geologica is wide, geometric and slightly technical, which is the map's legend hand: headings, waymark labels, grid references, numerals, buttons, nav links, chips, captions' lead-ins, all tabular where numbers appear. Literata's optical sizing keeps running text warm and readable at 17px without softening the sheet. Display is heavy and tight; body is light and open.

### Hierarchy
- **Display** (Geologica 600, `clamp(2.6rem → 4.6rem)`, 0.96, −0.03em): the homepage sheet title (`.sheet__title`, max 12ch) and inner-page hero titles (`.hero__title`, `.page-hero__title`, line-height 0.98). One per page.
- **Headline** (Geologica 600, `clamp(2rem → 2.9rem)`, 1.04, −0.025em): section h2s. The default `h1` token (`--text-hero`, `clamp(2.4rem → 4.4rem)`) applies where a page does not use a hero class.
- **Title** (Geologica 600, `clamp(1.6rem → 2.2rem)`, 1.1, −0.015em): h3s. Curriculum row titles step to `clamp(1.4rem → 1.9rem)`.
- **Row title** (Geologica 600, 24px, 1.1): legend cell names, enrol rows, price names, syllabus titles, lens names, shelf headings.
- **Thesis quote** (Geologica 600, `clamp(1.375rem → 2.1rem)`, 1.3, −0.015em, max 24ch).
- **Lede** (Literata 400, 19px, ink): section ledes and thesis body; the sheet lede is `clamp(1.125rem → 1.3rem)` at 1.42 with a Literata 600 strong.
- **Body** (Literata 400, 17px, 1.6): all running text, 62ch default measure; promises, fine print and syllabus body cap at 50ch.
- **Caption** (Literata 400, 15px, 1.55, ink-muted): figure captions, with a Geologica 600 ink "Fig. N" lead-in.
- **Map label** (Geologica 500, 15px, tabular): legend meta, readout age, grid references, class numerals ("Class 2: language, autonomy, and big feelings"), chips, dt labels, `.map-label`.
- **Label XS** (Geologica 600, 13px): readout column headings, scale labels, status text.
- **Button** (Geologica 600, 15px, no tracking); `--lg` steps to 17px.
- **SVG lettering** on the sheet: waymarks Geologica 600 at 19 viewBox units with a 6px sheet-coloured paint-order stroke; grid refs Geologica 500 at 15; place names Geologica 500 italic at 16 with 0.08em tracking; cursor label Geologica 600 at 17 tabular.

### Named Rules
**The Legend Hand Rule.** Geologica is the hand for anything that labels, counts or acts; Literata is the hand for anything that explains. A number in Literata or a paragraph in Geologica is a mistake.

**The Label Under the Title Rule.** Headings never carry a kicker, eyebrow or numeral above them. A class's label ("Class 2: language, autonomy, and big feelings") sits under its title in the map-label voice. Status and meta go beside or below, never above.

**The One Phrase Rule.** The `.hl` mark (woodland behind the words, same ink; `ink-700` with white text on navy) is the one typographic flourish: at most one phrase per page-level headline, never on every heading.

## Layout

A 1200px container with a `clamp(1rem, 3vw, 2.25rem)` side margin; 880px for narrow reading pages. Sections run `clamp(4.5rem, 9vw, 8rem)` of vertical padding and alternate between the sheet (`bg`), the sage step (`bg-alt`) and surface, never by hairline. The header is 72px and its height is a token (`--header-h`) so sticky asides and scroll padding read it.

The homepage sheet fills `min(100svh − header, 60rem)`: the map is an absolutely positioned full-bleed SVG (`viewBox 0 0 1440 900`, `slice`), the copy sits upper-left in a 46rem column, the readout panel lower-left, and the four-cell legend runs along the foot under a 3px ink rule. Below 1100px the sheet becomes a two-column grid (copy beside map), then the readout, then the legend; the SVG re-frames to the route's own region (`viewBox 700 60 740 780`) and switches to `meet` under 720px. Content sections use 5/7 and 7/5 asymmetric grids with a sticky left column (thesis quote, Figure 2); the three lenses and the three teaching facts are equal thirds; curriculum rows are `10rem | 1fr | 15.5rem` above 1041px.

Spacing is a 4px-based scale from `space-1` (0.25rem) to `space-32` (8rem); rows in a list are separated by `space-2` of ground showing between surface panels, not by borders. Breakpoints that matter: 1100 (sheet stacks), 1041 (curriculum columns), 1000 (header menu), 720 and 560 (figure label sizes, phone type).

## Elevation & Depth

Flat. Depth is tonal (sheet → sage step → surface → navy field → navy floor) and typographic (a 3px ink rule across the top of anything that is a panel). Nothing casts a shadow at rest: `--shadow-sm` and `--shadow-lg` are `none`, buttons are flat and do not lift on hover, and the Terrain override layer removes every lift the older inner-page CSS declared. Hover is a tone change (`bg-alt` wash, teal bar, inverted fill), never a shadow.

### Shadow Vocabulary
- **Floating menu** (`--shadow-md: 0 18px 40px -24px rgba(27, 42, 58, 0.35)`; dark `rgba(0, 0, 0, 0.6)`): the one shadow, on the Free tools and My classes header menus, because a menu truly floats over the sheet.

### Named Rules
**The Flat Sheet Rule.** A surface is a tone step and a legend bar, never a lift. If a new element needs a shadow, it is a floating menu or it is wrong.

## Shapes

A survey sheet is square. Every radius token is 0 and every control, panel, chip, input, thumbnail and focus ring is square-cornered; the only circles are waymarks, the cursor dot and the status chip's 7px dot. Panels are marked by a 3px ink rule across the top (`.readout`, `.lens`, `.fig--loop`, `.taught__facts li`, `.shelf h3`, `hr`, the Free tools menu, `.card`, `.faq details`, syllabus items); in-development items dash that rule in slate. Legend cells and curriculum rows carry a 6px route-segment bar (slate at rest, teal when active or hovered, dashed slate for classes in development). Photographs are square map insets with a 2px ink frame and no filter. Figure strokes distinguish by dash pattern as well as colour (`3px solid ink` versus `3px dashed teal` in figure keys). Links underline at 1px with 0.18em offset; `.text-link` underlines at 2px in teal under ink text.

## Components

### Buttons
Square, one fill, feedback on press only. Geologica 600 at 15px, `min-height: 48px`, `0.8rem 1.4rem`, a 1.5px border matching the fill; `:active` moves down 1px; no shadow, no hover lift.
- **Primary:** teal fill, white text; hover deepens to `primary-hover`. The one action per surface (Browse the classes, Enroll, $49, the header CTA, the chat send).
- **Quiet:** transparent, 1.5px ink border, ink text; hover inverts to ink fill with sheet-coloured text. "See the class", "All classes", "Join the waitlist".
- **Ink:** ink fill; hover `ink-800`. Rare.
- **On-dark:** `on-dark` fill with `ink-900` text on navy fields, hover pure white. Enrol-row CTAs and "Ask a question".
- **Quiet-dark / Ghost-dark:** transparent with a 55% on-dark border on navy; quiet-dark inverts on hover, ghost-dark washes 10%.
- **Sizes:** `--lg` is 54px and 17px type; `--block` is full width. A button that opens a new tab carries ↗ in `.btn__ext` (weight 400) plus screen-reader text.
- **Focus:** `2.5px solid primary` outline, 3px offset, square.

### Chips
- **Open** (`chip-open`): route tint behind teal Geologica 500 text with a 7px teal dot; square.
- **Soon** (`chip-soon`): sheet tint behind ink-muted text.

### Panels (rows, not cards)
- **Corner Style:** square.
- **Background:** `surface` on light sections; `ink-800` on navy fields.
- **Border:** a 3px ink rule across the top, or a 6px route bar on class rows and legend cells; no side or bottom borders; hover turns the rule teal.
- **Shadow Strategy:** none (The Flat Sheet Rule).
- **Internal Padding:** `space-4 space-5` for the readout and shelf links; `clamp(space-6, 3vw, space-8)` for curriculum rows; `space-5 space-6` for enrol rows.
- Lists of parallel panels sit `space-2` apart with ground showing between them. FAQ items are `<details>` panels with a Geologica 600 question and a "+" / "−" marker.

### Inputs / Fields
- **Style:** 1.5px `border` stroke, `bg` fill on light surfaces, 48px tall, `0.7rem 0.9rem`, square; Geologica 500 label above. On navy: `ink-900` fill with a 35% on-dark border.
- **Focus:** `2.5px solid primary` outline (on-dark outline on navy) and the border turns teal.
- **Error:** border and message in `danger` (`#F0907E` on navy); never teal, never amber.
- **Range (the age scale):** a 6px ink track with a 22px square teal thumb in a 2px ink border; `ew-resize` cursor.

### Navigation
- **One header and footer everywhere.** Styles live only in `assets/css/chrome.css`, behaviour only in `assets/js/chrome.js`; page stylesheets never restyle `.site-header` or `.site-footer`. Chrome reads the shared tokens through `--chrome-*` aliases.
- **Header:** 72px, sheet-coloured, turns `bg-alt` once scrolled (no shadow). Wordmark: a 1.5px-ink-bordered square mark beside the name in Geologica 600 at −0.02em. Links are Geologica, `ink-soft` at rest, `ink` on hover, with a square teal bar that scales in underneath on hover and current. Structure: Classes · Free tools (details menu) · Articles · About, a 1px divider, My classes (person glyph, a chooser menu), one primary CTA ("Enroll, from $49" on the homepage; hidden on the page it points to), a 44px square theme toggle with a 1.5px ink border.
- **Menus:** 344px surface panel, 3px ink rule on top, `--shadow-md`, square rows that wash `bg-alt` on hover, a teal "All free tools" link under a second 3px rule; 200ms slide-in when motion is welcome. Below 1000px the list becomes a fixed full-width sheet under the bar.
- **Footer:** navy floor, white Geologica column headings, Literata links in on-dark-soft, the brand and Instagram at left, and the name set again at `clamp(2.4rem, 7.4vw, 7.4rem)` in white at the very end so the page closes on the wordmark.

### The Sheet (signature)
The homepage hero is the survey map, marked up as `[data-terrain]`. Contours are `contour` strokes at 1.4 (index contours at 2), woodland patches are `woodland` fills, the stream is a 6-unit `water` stroke, and the route is a 5-unit teal stroke dashed `14 10` with five round waymarks (11-unit radius, 4-unit teal stroke, sheet fill; the active one fills teal) labelled in Geologica 600 with a sheet-coloured halo. Age grid references run along the top edge as a 1.5px ink scale. The readout panel beside the sheet swaps its stage (title, "At 2 years, 3 months", what is growing now, what helps, "Taught in Class N") as the cursor moves. The legend along the foot is four cells, each with a 6px bar (teal when active), name in Geologica 600 at 24px, and "Class N · lessons · $49 once" in the map-label voice.

Interaction (`assets/js/terrain.js`): a real `<input type="range">` (months 0 to 59, `aria-valuetext` in years and months) is the control; pointer drag anywhere on the SVG and clicks on waymarks move it too. A dotted ink cursor line, a teal cursor dot and a tabular age label follow the route. Without JS the sheet is a still map and all five stage panels show. On load, when `html.anim` is set, the route draws in once over 1800ms on the house ease; the copy and readout settle upward (travel only, never a fade) so no screenshot meets a blank hero.

Inner pages reuse the material as a **terrain inset** (`.terrain-inset`, on `/tools/`): the same contour, woodland, route and waymark classes at inset weights (contour 1.6 / 2.4, route 6, waymark stroke 5), with grid refs in Geologica 500 at 20 units.

### Figures
Inline SVG inside `<figure class="fig">` with a visible caption ("Fig. N" lead-in in Geologica 600 ink, then Literata caption in ink-muted). Figure 2 (the research → model → moment → noticing loop) sits on a surface plate with a 3px ink rule; its emphasised node is teal with white text, other nodes are `surface-2` with 1.5px ink strokes, arrows 2px ink. Figure text is Geologica 500 at 15 units, stepping to 19 under 560px. Curves use `pathLength="1"` and draw in with a dash offset.

### Office hours and enrol bands
The office-hours band is `ink-800` with white h2, on-dark-soft copy, a `.hl` in `ink-700`, and the chat demo as a surface card with a 3px teal rule (labelled "Example conversation" with a 1.5px hairline tag; no fake online status). The enrol band is `ink-900`: white h2 with the price in the phrase mark, enrol rows as `ink-800` panels (title, meta in Geologica 500, perk, 2rem tabular price, on-dark CTA), the refund line in on-dark-soft, and a "Before you enroll" FAQ under a 3px on-dark rule with the waitlist form collapsed inside its last item.

### Class facts (one list, everywhere)
The offer reads the same on the homepage legend and rows, the enrol band, `/classes/`, each class page's facts `dl`, and `/pricing`. Change it in all places or none.
- **Birth to 12 months (Class 1):** 4 modules, 16 lessons, about 3 hours; captions and a written version of every lesson; checkout here with Stripe, lessons under My classes.
- **Toddler years, 1 to 3 (Class 2):** 5 modules, 29 lessons, about 5 hours; includes unlimited Growing Minds AI for life (`nsc/lib/grants.ts`); checkout and lessons on Thinkific until the class moves on-site, so every toddler Enroll button carries ↗ and a quiet note says where checkout happens. The platform is named only on the toddler class page and the class sign-in page; the homepage, `/classes/` and `/pricing` never say "Thinkific".
- **Preschool years, 3 to 5 (Class 3):** 4 modules, 15 lessons; checkout here with Stripe.
- **The whole family (Class 4):** in development; waitlist only, shown with the dashed slate bar.
- **All three open classes:** $49 once, lifetime access. Full refund within 14 days if the buyer has watched 4 lessons or fewer; the free lesson doesn't count (the app reads the wording from `nsc/lib/refund-policy.ts`). State it once per page, on its own line, and answer it in the refund FAQ. Free things (the milestone tracker, five AI questions a day) are never listed as "included".
- **Enroll labels:** "Enroll, $49" on any button that stands alone; plain "Enroll" only where the price sits beside it. The header CTA is "Enroll, from $49".
- **See before you buy:** the infant class's "Serve and Return" plays free at `/nsc/classes/infant/preview` with no account, under a short "Where this fits" lead-in; it is the infant class's second action wherever the class is sold and the sheet's "Watch a lesson free · 14 min" link.
- **Lesson and module titles** keep the app's Title Case; every other heading is sentence case.
- Class names are "Short name, ages" as the title and "Class N: subtitle" as the label beneath it, in developmental order (infant first).

### Arcade palettes
The games on `/arcade` keep their own isolated retro palettes (dark cabinets, phosphor greens), scoped to `arcade.css`, `arcade-page.css` and `pong.css`; not design-system drift. The arcade is reached only from the Free tools menu and the footer.

### The class app (`/nsc`)
The nsc app is a separate Next.js deploy and still carries the superseded Seminar look (Besley over Atkinson Hyperlegible Next in `nsc/app/layout.tsx` and `nsc/app/globals.css`, amber highlighter, 10px radii). It must be restyled to this system: Geologica over Literata, these tokens, square corners, no shadows at rest, teal as the one action colour. The pages a buyer meets before paying (the free lesson, sign-in, the account step) come first.

## Do's and Don'ts

### Do:
- **Do** keep the map-white sheet as the ground and separate sections by a tone step (`bg` → `bg-alt` → `surface`), never by a hairline.
- **Do** mark a panel with a 3px ink rule across its top and a class row or legend cell with a 6px route bar (slate at rest, teal when active).
- **Do** use teal for every action and nothing else (The One Route Rule); hover is a deeper teal or an inverted fill, never a lift.
- **Do** set labels, numerals, buttons and legends in Geologica and running text in Literata (The Legend Hand Rule), with tabular numerals wherever numbers align.
- **Do** frame photographs as square insets with a 2px ink border and no filter, and reach for a captioned figure or a terrain inset before a photograph when the section explains something.
- **Do** keep every SVG figure and the sheet accessible: `<title>`, `<desc>`, a visible caption, a real range input for the cursor, dash patterns as well as colour.
- **Do** honour `prefers-reduced-motion`, keep content visible by default, and keep the theme toggle working on every surface.

### Don't:
- **Don't** use orange, amber or terracotta as a main colour, or any warm fill larger than an error message (The No Orange Rule).
- **Don't** round a corner, add a box-shadow at rest, lift a button on hover, or wash a hero with a gradient or graph paper (The Flat Sheet Rule).
- **Don't** put a kicker, eyebrow, numeral or status above a heading; the class label sits under the title (The Label Under the Title Rule).
- **Don't** put the phrase mark on more than one headline per page, or use it for a colour other than woodland on light and `ink-700` on navy.
- **Don't** go clinical or nursery: no hospital-blue, no pastels, no stock-baby imagery, no deficit framing in the readout copy.
- **Don't** use `border-left` or `border-right` as a coloured accent stripe; the only coloured bars run along the top.
- **Don't** animate layout properties; use `transform`, `opacity`, and `stroke-dashoffset`, on the house ease `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Don't** restyle `.site-header` or `.site-footer` outside `chrome.css`, or bring a Seminar value (Besley, amber, 10px radii) back from the nsc app.
