---
name: Growing Minds Science
description: An analysis of the Growing Minds Science design language, "The Terrain". A developmental-science education for parents of children 0 to 5, drawn as one survey sheet of the first five years. A map-white ground carries navy ink for every word, slate contour lines as the sheet's own material, sage woodland and a pale stream as fields, and one dashed teal route with round waymarks running birth to five. Every corner is square, nothing casts a shadow at rest, depth is a tone step and a 3px ink rule, and teal is the only colour allowed to ask for a click. Geologica (a wide geometric sans) sets everything that labels, counts or acts over Literata (an optical-size serif) for everything a tired parent has to read.
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
  # Examples (illustrative): surfaces the site does not ship yet, composed from the
  # primitives above so the class app and new pages re-skin the same shapes.
  ex-pricing-tier:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1.5rem 1.75rem"
  ex-pricing-tier-featured:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sm}"
    padding: "1.5rem 1.75rem"
  ex-app-shell-row:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  ex-app-shell-row-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  ex-lesson-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1rem 1.25rem"
  ex-data-table-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  ex-data-table-head:
    backgroundColor: "{colors.bg-alt}"
    textColor: "{colors.ink}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  ex-auth-form-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1.5rem 1.75rem"
  ex-modal-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1.5rem 1.75rem"
  ex-empty-state-card:
    backgroundColor: "{colors.bg-alt}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "2.5rem 1.75rem"
  ex-toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.map-label}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.25rem"
---

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

### Semantic
- **Focus** (`primary`): every `:focus-visible` is a 2.5px teal outline at 3px offset, square; on navy fields the outline is `on-dark`. Declared once, the same on every control.
- **Selection** (`primary` behind `primary-ink`): text selection and the active waymark share the route colour.
- **Danger** (`danger`, #A6371F; `#F0907E` on navy): invalid field borders and error messages. The only warm hue on the site, and only at message size.
- **Success** (`success`, #2F6B4A) and **Leaf** (`leaf`, #2E7A5F): form success and status text. Both resolve to the bright route on the night sheet.
- **Disabled**: no separate token. A disabled control keeps its shape at 55% opacity with `cursor: not-allowed`; it never changes colour.

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

### Note on Font Substitutes
Both faces are open (SIL OFL) and load from Google Fonts, so no substitution is needed on the web. Where the fonts cannot load (email, PDFs, OG cards, a sandbox with no network):
- **Geologica** → "Geologica Fallback" (local Helvetica Neue or Arial at size-adjust 108%, ascent 96%, descent 26%). Among free faces, Manrope or Red Hat Display sit closest in width and tone; Inter is too narrow and reads as software.
- **Literata** → "Literata Fallback" (local Georgia at size-adjust 101%, ascent 95%, descent 24%). Source Serif 4 or Charter are the nearest open substitutes; Times is too tight for the 17px measure.
- The nsc app (Next.js) should load the same two families through `next/font/google` with `display: "swap"` and the same `adjustFontFallback` metrics, so the app and the site wrap text the same way.

### Named Rules
**The Legend Hand Rule.** Geologica is the hand for anything that labels, counts or acts; Literata is the hand for anything that explains. A number in Literata or a paragraph in Geologica is a mistake.

**The Label Under the Title Rule.** Headings never carry a kicker, eyebrow or numeral above them. A class's label ("Class 2: language, autonomy, and big feelings") sits under its title in the map-label voice. Status and meta go beside or below, never above.

**The One Phrase Rule.** The `.hl` mark (woodland behind the words, same ink; `ink-700` with white text on navy) is the one typographic flourish: at most one phrase per page-level headline, never on every heading.

## Layout

A 1200px container with a `clamp(1rem, 3vw, 2.25rem)` side margin; 880px for narrow reading pages. Sections run `clamp(4.5rem, 9vw, 8rem)` of vertical padding and alternate between the sheet (`bg`), the sage step (`bg-alt`) and surface, never by hairline. The header is 72px and its height is a token (`--header-h`) so sticky asides and scroll padding read it.

The homepage sheet fills `min(100svh − header, 60rem)`: the map is an absolutely positioned full-bleed SVG (`viewBox 0 0 1440 900`, `slice`), the copy sits upper-left in a 46rem column, the readout panel lower-left, and the four-cell legend runs along the foot under a 3px ink rule. Below 1100px the sheet becomes a two-column grid (copy beside map), then the readout, then the legend; the SVG re-frames to the route's own region (`viewBox 700 60 740 780`) and switches to `meet` under 720px. Content sections use 5/7 and 7/5 asymmetric grids with a sticky left column (thesis quote, Figure 2); the three lenses and the three teaching facts are equal thirds; curriculum rows are `10rem | 1fr | 15.5rem` above 1041px.

### Spacing System
A 4px base. Named steps are the only values used for margins, gaps and padding; nothing is eyeballed.

| Token | Value | Where it shows up |
|---|---|---|
| `space-1` | 4px | Title-to-meta gap, chip padding, the 1px press travel's neighbour |
| `space-2` | 8px | Ground between parallel panels, field label to input, button icon gap |
| `space-3` | 12px | Caption margin, chip gap, chat message gap |
| `space-4` | 16px | Readout and panel padding (top), FAQ question padding, container margin at 320px |
| `space-5` | 20px | Panel padding (sides), enrol row padding (top), legend cell padding |
| `space-6` | 24px | Grid gaps between lenses and facts, legend cell side padding, enrol row side padding |
| `space-8` | 32px | Section head to content, curriculum row padding, hero copy padding |
| `space-10` | 40px | Thesis body heading margin, section heads on wide screens |
| `space-12` | 48px | Section head margin at desktop |
| `space-16` | 64px | Largest grid gap (thesis, taught, enrol) |
| `space-24` to `space-32` | 96px to 128px | Section padding ceiling (`clamp(4.5rem, 9vw, 8rem)`) |

### Grid & Container
- **Container:** 1200px, side margin `clamp(1rem, 3vw, 2.25rem)`; reading pages 880px. The sheet is the one full-bleed element.
- **Section rhythm:** every section runs `clamp(4.5rem, 9vw, 8rem)` of vertical padding and sits on the sheet, the sage step or surface; sections never separate by a hairline.
- **Column recipes:** asymmetric 5/7 and 7/5 for text beside a sticky figure or quote; equal thirds for lenses and facts; four equal cells for the legend; `10rem | 1fr | 15.5rem` for curriculum rows above 1041px; `1fr | auto | auto` for enrol rows.
- **Header:** 72px (64px under 720px), exposed as `--header-h` so sticky asides and scroll padding read it.

### Whitespace Philosophy
Generous between sections, tight inside a panel. A panel's rule, title, meta and body stack at `space-1` and `space-2` so the eye reads them as one legend entry; the ground around that panel is what gives it room. Measures are fixed in `ch` (62 body, 50 to 56 for promises and ledes, 12 to 18 for display) rather than by column width, so a wide screen gets more margin, not longer lines.

### Responsive Strategy

#### Breakpoints

| Name | Width | Key changes |
|---|---|---|
| Wide | > 1100px | The sheet: full-bleed map (`viewBox 0 0 1440 900`, slice), copy upper-left in a 46rem column, readout lower-left in three columns, legend as four cells along the foot. Curriculum rows in three columns (≥ 1041px). Full header nav. |
| Tablet | 901 to 1100px | Copy sits beside the map (two columns), then the readout (two columns), then the legend. The SVG reframes to the route's region (`viewBox 700 60 740 780`, slice). Header nav becomes a fixed sheet under the bar at ≤ 1000px; class rows stack at ≤ 1040px. |
| Small tablet | 721 to 900px | Legend 2 × 2; lenses and the taught facts single column; footer columns stack; inner-page heroes stack and hero media takes 4:3 at ≤ 880px. |
| Phone | ≤ 720px | The sheet stacks copy → map (aspect 740:780, `meet`) → readout (single column) → legend; the credibility line returns under the copy; header 64px; row titles step to 24px; footer links grow to 44px rows. |
| Narrow phone | ≤ 560px, ≤ 420px | SVG figure labels step from 15 to 19 units; footer nav two columns; sheet grid refs 30px; the wordmark may wrap on 320px screens and at 400% zoom. |

#### Touch Targets
- Every `.btn` is at least 48 × 48px (54px for `--lg`); the chat send is a 48px square; inputs are 48px tall.
- Header links, the brand, the theme toggle and footer links are at least 44px; the toggle is a 44px square.
- The age range input has a 28px-tall hit area around its 22px thumb; the whole SVG also accepts pointer drag, and waymarks are click targets.
- Legend cells, class rows and shelf links are tappable across their whole panel, never only on the title.

#### Collapsing Strategy
- Columns reduce in number rather than scaling panels down; a panel keeps its padding and its rule at every width.
- The readout drops from three columns to two to one; its stage title, age line, two columns and class link keep their order.
- Curriculum rows go from `number | body | figure` to a stacked row with the thumb beside the title, the numeral under it.
- Enrol rows keep title, price and CTA on one line until 720px, then stack with the CTA full width.
- Header navigation becomes a full-width fixed sheet under the bar (no hamburger drawer from the side); menus inside it open inline.
- Sticky asides (thesis quote, Figure 2) release at 880px and flow in document order.

#### Image Behavior
- Photographs are square map insets: `width: 100%; height: auto`, a 2px ink frame, no filter, no crop to a circle. The instructor avatar is a 44px square.
- The sheet SVG is `slice` at desktop and `meet` under 720px; it is never cropped to lose a waymark.
- Figures and insets scale with their column; figure text steps up under 560px rather than shrinking with the drawing.
- Hero images load eagerly with `fetchpriority="high"`; everything below the fold is lazy; OG images are 1200 × 630.

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

### Examples (illustrative)

> These surfaces are not on the site today. They are composed from the primitives above so the class app and any new page re-skin the shapes the Terrain actually uses: the square panel under a 3px ink rule, the 6px route bar, the 1.5px control stroke, and a neutral ladder that separates surfaces by tone, never by shadow.

**`ex-pricing-tier`** — a class as a tier
- `{colors.surface}` panel, 3px `{colors.ink}` rule on top, padding `space-6 space-7`, square; name in `{typography.row-title}`, "Class N · lessons · hours" in `{typography.map-label}`, price in Geologica 600 at 2rem tabular, CTA from `{components.button-primary}`.

**`ex-pricing-tier-featured`** — the recommended tier
- Polarity flip, not a colour: `{colors.ink-800}` fill, `{colors.on-dark}` text, white title, CTA from `{components.button-on-dark}`. The rule on top becomes a 6px `{colors.primary}` route bar.

**`ex-app-shell-row`** — a sidebar nav row in the class app
- `{colors.bg}` at rest, `{colors.surface}` when active, text in `{typography.map-label}`, padding `space-3 space-4`, square. The active row carries a 3px `{colors.primary}` bar along its **top** edge (never a left stripe); hover is a `{colors.bg-alt}` wash.

**`ex-lesson-row`** — one lesson in a module list
- `{colors.surface}` panel, rows `space-2` apart with ground showing; a 6px route bar on top: `{colors.primary}` for the current lesson, `{colors.contour}` for not yet watched, a short `{colors.primary}` segment proportional to progress for partly watched. Title in `{typography.row-title}`, "Lesson 4 · 11 min" in `{typography.map-label}`, a `chip-open` reading "Watched" when done.

**`ex-data-table-cell`** — table chrome
- Head cells `{colors.bg-alt}` with `{typography.label-xs}` in `{colors.ink}`; body cells `{colors.surface}` with `{typography.caption}` in `{colors.ink-soft}`; rows separated by a 1px `{colors.border-soft}` rule; numbers tabular and right-aligned; the table starts under a 3px `{colors.ink}` rule.

**`ex-auth-form-card`** — sign-in and the account step
- `{colors.surface}` panel under a 3px `{colors.ink}` rule, padding `space-6 space-7`, max-width 26rem; fields from `{components.input}` stacked `space-4` apart; one `{components.button-primary}` full width (`--block`); the magic-link note in `{typography.caption}`; errors in `{colors.danger}` under the field, never in a banner.

**`ex-modal-card`** — a dialog
- `{colors.surface}`, 3px `{colors.ink}` rule, padding `space-6 space-7`, max-width 32rem, over a `{colors.ink-900}` scrim at 60%. No shadow: the rule and the scrim bound it. Title in `{typography.title}`, actions right-aligned with the quiet button first and the primary last.

**`ex-empty-state-card`** — nothing here yet
- `{colors.bg-alt}` panel, padding `space-10 space-7`, a small terrain inset or figure above a `{typography.body}` line in `{colors.ink-soft}` and one `{components.button-quiet}`. No illustration of a sad face, no dashed box.

**`ex-toast`** — a passing confirmation
- `{colors.ink}` fill with `{colors.bg}` text in `{typography.map-label}`, padding `space-3 space-5`, square, bottom-left, slides up 8px on the house ease and leaves after 4s. Errors use the same shape with a 3px `{colors.danger}` rule on top; success adds nothing.

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

## Agent Prompt Guide

### Quick Color Reference

| Token | Day sheet | Night sheet | Use |
|---|---|---|---|
| `bg` | #F3F5F0 | #141E28 | Page ground |
| `bg-alt` | #E9EEE8 | #182430 | Alternate sections, hover wash |
| `surface` | #FBFCFA | #1C2936 | Panels, rows, menus |
| `surface-2` | #E2E9E4 | #243344 | Chips, figure nodes |
| `ink` | #1B2A3A | #E8EEF2 | All type, all rules |
| `ink-soft` / `ink-muted` | #3A4A5A / #56687A | #C3CFD9 / #93A3B3 | Secondary copy / meta |
| `ink-800` / `ink-900` | #22364A / #16232F | #0F171F / #0A1016 | Navy field / navy floor |
| `primary` | #1E5F62 | #7FC4BC | The route: every action |
| `primary-hover` | #17494B | #9AD5CD | Hover fill |
| `contour` | #8FA3B5 | #45596C | Contours, bars at rest |
| `woodland` | #C9D8CC | #243A36 | Fields, the phrase mark |
| `water` | #BFD7E6 | #22384A | The stream |
| `danger` | #A6371F | #F0907E | Errors only |

### Example Prompts
- "Build a `/classes/preschool` section listing four modules as `ex-lesson-row` panels under a 3px ink rule. Geologica 600 titles, map-label meta, a 6px route bar per row (teal for the current one), $49 once stated once on its own line, one `button-primary` reading 'Enroll, $49'. Square corners, no shadow, Literata body at 17px."
- "Make the nsc sign-in page an `ex-auth-form-card` on the map-white sheet: Geologica title 'Sign in to your classes', one email `input` with a Geologica 500 label, a full-width teal button, caption-sized note about the magic link. Errors in danger under the field. Dark theme via `[data-theme=\"dark\"]` using the night-sheet tokens."
- "Add an article page template: 880px reading column, Literata 17px at 1.6 on the sheet, h2s in Geologica 600 with no kicker above, a captioned `fig` under a 3px ink rule halfway down, and the enrol band in `ink-900` to close. No eyebrow labels, no pull-quote in colour; one `.hl` phrase mark in the title only."
- "Design a lesson progress header for the class app: a 6px ink track with a teal segment for progress, the lesson count in tabular map-label, and a `button-quiet` 'Next lesson'. The whole thing sits in a `surface` panel under a 3px ink rule. Nothing rounded, nothing lifted."

### Iteration Guide
1. Work on one component at a time and name it by its YAML key (`{components.panel}`, `{components.button-quiet}`, `ex-lesson-row`).
2. Variants are sibling keys (`-hover`, `-active`, `-soon`), never a second colour.
3. Reference tokens, never hex, in CSS and prose; the tokens file (`assets/css/tokens-terrain.css`) is the only place a value lives, and the night sheet is defined there too.
4. When something needs emphasis, go bigger in Geologica or step the ground a tone before reaching for colour; teal is spent on actions.
5. When something needs separation, add ground between panels or a rule on top; never a side stripe, a hairline box, or a shadow.
6. Headings never carry anything above them; meta goes under the title in the map-label voice.
7. Check both sheets: every new surface is screenshotted in `[data-theme="dark"]` before it ships.
8. The homepage sheet and its legend are the reference for every row, panel and bar on the site; when in doubt, look at how the legend does it.

## Known Gaps

- The nsc class app (`/nsc`) is a separate Next.js deploy and still carries the superseded Seminar look; its restyle to this system is in progress and the `ex-*` examples above are its brief.
- About 45 inner-page headings still carry a kicker or eyebrow above them from the Seminar era and are being folded under the title; until then they contradict The Label Under the Title Rule.
- OG and social cards (`scripts/build-og-cards.mjs`) still render with the Seminar fonts and amber; they are being regenerated in the Terrain world.
- The legacy `--amber*` token names remain as aliases of the route for inner-page CSS that has not been retuned; they resolve to teal but should be renamed once `styles.css` and `refresh.css` are rewritten.
- The thesis quote on the homepage is placeholder-grade until Matthew confirms the wording.
- The arcade's isolated cabinet palettes are documented as an exception, not tokenised.
- No disabled-state token exists; the 55% opacity convention is prose only until a control needs it in the app.
