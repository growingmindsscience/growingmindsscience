---
name: Growing Minds Science
description: A developmental-science education for parents of children 0 to 5, set as a living field guide. Field paper, forest ink, one verdigris action color, sage mist for explanation, research blue for sources, and ordinary moments annotated on request.
colors:
  paper: "#F7F4EC"
  paper-2: "#EFEBE0"
  surface: "#FFFDF8"
  surface-2: "#E6E3D7"
  ink: "#193C39"
  ink-soft: "#35504C"
  ink-muted: "#546965"
  ink-700: "#2A3F3B"
  forest: "#245F58"
  forest-deep: "#1C4D47"
  on-forest: "#FFFDF8"
  sage: "#A9C3B2"
  sage-deep: "#8DAE9A"
  sage-mist: "#E0EBE5"
  sage-mist-2: "#CFDFD6"
  field-ink: "#193C39"
  field-ink-2: "#214744"
  on-ink: "#F2EFE6"
  on-ink-soft: "#C9D0CB"
  on-ink-muted: "#9FAEA8"
  research: "#426B91"
  note-warm: "#C46C4D"
  clay-text: "#9E5236"
  note-amber: "#D2A453"
  border: "#CDD3CB"
  border-soft: "#DEE2D8"
  danger: "#A6371F"
  success: "#2F6B4A"
typography:
  display:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(3.25rem, 2rem + 5.2vw, 7rem)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.25rem, 1.4rem + 3.4vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.125rem, 1.4rem + 2.8vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  row-name:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.25rem, 1.05rem + 0.7vw, 1.625rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  statement:
    fontFamily: "Newsreader, Newsreader Fallback, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1rem + 0.5vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  article:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  meta:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  small:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  button:
    fontFamily: "Inter, DM Sans Fallback, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  container: "1320px"
  section: "clamp(72px, 10vw, 150px)"
  section-tight: "clamp(48px, 6vw, 88px)"
  hub-section: "clamp(56px, 8vw, 120px)"
  split-gap: "clamp(32px, 5vw, 80px)"
  row: "22px"
  panel: "clamp(24px, 3vw, 36px)"
  control-gap: "12px"
  choice-gap: "8px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 1.25rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.on-forest}"
  button-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 1.25rem"
    height: "48px"
  button-paper-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 1.25rem"
    height: "48px"
  button-quiet-hover:
    backgroundColor: "{colors.sage-mist}"
    textColor: "{colors.ink}"
  choice:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  choice-hover:
    backgroundColor: "{colors.sage-mist}"
    textColor: "{colors.ink}"
  choice-active:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "48px"
  panel-mist:
    backgroundColor: "{colors.sage-mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "clamp(24px, 3vw, 36px)"
  panel-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "clamp(20px, 3vw, 32px)"
  mechanism-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
  plate-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  close-band:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.none}"
    padding: "clamp(56px, 8vw, 120px) 0"
  ink-door:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.lg}"
    padding: "clamp(22px, 3vw, 36px)"
  age-line:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "clamp(24px, 3vw, 40px) 0"
  age-line-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  range-track:
    backgroundColor: "{colors.sage-mist}"
    rounded: "{rounded.sm}"
    height: "8px"
---

# Design System: Growing Minds Science

## Overview

**Creative North Star: "The Living Field Guide"**

The site reads like a well-made field guide to the first five years. An ordinary moment (a parent, a child, a playground, a walk home) is shown as a real photograph, and the science is laid over it as typeset labels the visitor reveals on request. The same plate, re-labeled step by step, becomes the Developmental Lens: Observe, Understand, Respond, Reflect. Every other page carries the guide's notation rather than its pictures: a Newsreader name, a quiet line of Inter metadata, rows separated by hairline rules, explanations on sage mist, and sources in research blue.

The ground is warm field paper and every word is forest ink. One deep verdigris green does all the acting (buttons, links, chosen options, focus), sage mist holds anything that explains, and a single inverted ink field closes each page with one statement and one action before the footer continues on the same field. Nothing lifts. Surfaces separate by a tone step or a 1px rule, corners are calm (6px on controls, 10px on panels and photographs), and the warm accents (clay, ochre) appear only at the size of an annotation mark.

The tone is calm and collegiate, warm but not sentimental. Photographs are observational and real or absent; there is no stock imagery and no decorative illustration filling space. The visual test, from the brand guidelines: the page should still read as Growing Minds Science with the logo removed.

**Key Characteristics:**
- Field paper ground, forest ink type, one verdigris action color, sage mist for explanatory panels.
- Newsreader for headings, names and statements over Inter for reading, labels and controls.
- Calm corners: 6px controls, 10px panels and photographs, square bands and rows.
- Quiet 1px rules between rows; a 2px ink rule opens an index list; no shadows at rest.
- Research blue marks sources and evidence and nothing else.
- Annotated observation: real photographs with labels revealed on request.
- One inverted ink field per page: the close band, flowing into the footer.
- Full light and dark theming through `[data-theme="dark"]`.

## Colors

A warm paper-and-forest palette with one action green, one explanatory mist, and three accents held to annotation size.

### Primary
- **Deep Verdigris** (`forest`): the one action color. Filled buttons, text links, the chosen option in every choice set, the forest segment of the age-range bar, focus outlines and text selection. **Verdigris Deep** (`forest-deep`) is its hover. Text on it is **Soft White** (`on-forest`).

### Secondary
- **Sage Mist** (`sage-mist`): the explanatory surface. "The short version" beside an article title, callouts, checklists, guide panels, the claim's grade, the method note, the contact form, the Lens section ground, the hover wash on quiet buttons and choices. **Sage Mist Deep** (`sage-mist-2`) is the hairline inside a mist panel and the inactive bar in the class timeline.
- **Field Sage** (`sage`): the one place a whole band is sage, the Explore age line. **Sage Deep** (`sage-deep`) is the hover on that band and the leaf in the brand mark.

### Tertiary
- **Research Blue** (`research`): sources, references, evidence lines inside mechanism cards, the "Fig." marker under the hero plate. Never an action, never a heading outside a sources module.
- **Discovery Clay** (`note-warm`) and **Golden Ochre** (`note-amber`): annotation marks only. Ochre is the dot that leads each plate label, the bullet on Lens lists and mechanism cards, and the swatch on the label toggle. **Clay Text** (`clay-text`) is the small-text form of clay (5.1:1 on paper), used for the Lens step numerals and the Read, Try, Learn headings on the Lens page.

### Neutral
- **Field Paper** (`paper`): the page ground and the paper button on dark grounds. **Paper Step** (`paper-2`): the scrolled header, the trust section, the "All tools" row in the menu.
- **Soft White** (`surface`): reading surfaces: decoder answers, tool working cards, the class timeline, mechanism cards, alternating `hub-sec--white` sections, form inputs on mist. **Paper Tint** (`surface-2`): header icon buttons.
- **Forest Ink** (`ink`): all type and the 2px index rules. **Ink Soft** (`ink-soft`, 7.6:1) for ledes and secondary copy; **Ink Muted** (`ink-muted`, 5.2:1) for meta lines, captions, fine print, input outlines.
- **The Ink Field** (`field-ink`, raised step `field-ink-2`): the close band, the footer, the tools hub's hard-moment door, the homepage hard-moments band. Text tiers on it are `on-ink`, `on-ink-soft`, `on-ink-muted`.
- **Hairline** (`border`) for choice and chip outlines; **Hairline Soft** (`border-soft`) for every rule between rows.
- **Danger** (`danger`) for field errors and invalid borders; **Success** (`success`) for confirmations.

### Named Rules
**The One Action Color Rule.** Verdigris is the only color that acts. A filled button, a link, a chosen option and a focus ring are forest; nothing else is. Sage, research blue, clay and ochre never fill a button.

**The Annotation Scale Rule.** Clay and ochre never appear larger than a mark: a 10px dot, an 8px bullet, a numeral, a 14px label. No warm fill at the size of a panel, a button or a heading.

**The Research Blue Rule.** Blue means "this is evidence". It is reserved for sources modules, reference links and evidence lines, so a parent can find the citations on any page by color alone.

## Typography

**Display Font:** Newsreader (with "Newsreader Fallback": local Georgia, size-adjust 98%)
**Body Font:** Inter (with a local Helvetica Neue or Arial fallback)

Both load from Google Fonts with `display=swap`: Newsreader with italics and optical size 6 to 72 at weights 400 to 600, Inter at 400, 500 and 600. The nsc app self-hosts the same pair through `next/font`.

**Character:** Newsreader is the editor's voice: page titles, section headings, the names in every row, statements, the Lens questions and reflection prompts. Inter is the field notebook: running text, ledes, metadata, labels, form fields, buttons and navigation. Headings are medium weight and tightly tracked; body is open and plain.

### Hierarchy
- **Display** (Newsreader 500, homepage hero only, 0.96, -0.025em): the homepage title beside the plate.
- **Headline** (Newsreader 500, 0.98, -0.025em): the page title in every title block (hubs, classes, Explore, the Lens page steps up to `clamp(2.75rem, 1.6rem + 4vw, 5rem)`; articles step down to `clamp(2rem, 1.35rem + 2.5vw, 3.25rem)` at 26ch).
- **Title** (Newsreader 500, 1.02, -0.02em): section headings on the homepage; hub split headings use `clamp(1.75rem, 1.3rem + 1.6vw, 2.75rem)`; the close band heading `clamp(2rem, 1.3rem + 2.4vw, 3.25rem)`.
- **Subhead** (Newsreader 500, 1.1): Lens questions, the age columns, menu-row class names, topic headings on the tools hub.
- **Row name** (Newsreader 500, 1.15): the name in every quiet-ruled row: tools, articles, principles, places to go, guide lists.
- **Statement** (Newsreader 400, 1.3): callouts, scripts to say, reflection prompts, the claim verdict, the right-now "Try" line. Set large, never a heading.
- **Lead** (Inter 400, 1.45, max 44 to 52ch, ink-soft): the line under every page title.
- **Body** (Inter 400, 17 to 19px, 1.55, 62ch measure): running text everywhere. Article bodies set at 18px, 1.7, 68ch.
- **Meta** (Inter 400, 15px, ink-muted): the one meta line under a title (section, byline, topic, read time), captions, fine print.
- **Label** (Inter 600, 15px, no tracking): sources headings, Lens subheads, the article contents heading; form labels use 500.
- **Small** (Inter, 13 to 14px): row meta, plate labels, figure captions, the age axis.
- **Button** (Inter 500, 16px).

### Named Rules
**The Two Hands Rule.** Newsreader names and states; Inter explains, labels and acts. A row's name is Newsreader, its description and meta are Inter. A button or a form label in Newsreader is a mistake.

**The Label Below Rule.** Nothing sits above a heading. Section names, ages, topics and page names go below the title as a meta line or a subline. The code enforces this where old markup put them first: the right-now step name and the tools hub's card labels are reordered under their headings with CSS `order`, and the article's section link opens the meta line instead of standing over the headline.

## Layout

One container, `min(100% - 2 × gutter, 1320px)`, with a gutter of `clamp(16px, 4vw, 56px)`. Homepage sections run `clamp(72px, 10vw, 150px)` of vertical padding (`clamp(48px, 6vw, 88px)` when tight); hub sections run `clamp(56px, 8vw, 120px)`. Sections alternate field paper, soft white (`hub-sec--white`) and sage mist (`hub-sec--mist`); the change of ground is the separator. The header is 72px and its height is a token so sticky asides and scroll margins read it.

The recurring composition is the **split**: a heading and its one-line explanation in a 4-column left track, the content (rows, a panel, a form) in an 8-column right track, with a `clamp(32px, 5vw, 80px)` column gap. Title blocks use 7 to 5 (title and lead beside one photograph or one panel). Below about 860px every split becomes one column; where a split holds a photograph, the list comes first on a phone and the photograph follows.

Reading pages (articles, guides, claims) are one column at a reading measure (62 to 68ch) sharing the title block's left edge; articles put a sticky contents list in a 3-column track beside a 9-column text.

Every inline link that sits in a list or action row reaches a 44px touch target with negative block margins, so the line keeps its rhythm. Breakpoints that matter: 1100 (homepage age row becomes five columns), 1000 (header menu becomes a sheet), 900 (hero stacks, labels become a list), 860 and 760 (splits and rows go single column).

## Elevation & Depth

Flat. Depth is a tone step (paper, paper-2, soft white, sage mist) or the inverted ink field, and structure is a rule. No box-shadow appears at rest anywhere on the field-guide pages: `--shadow-sm` and `--shadow-lg` are `none`, the field-guide layer sets the header menu's shadow to `none` and marks it with a 6px forest top bar instead, and panels, figures and cards carry no shadow. The one shadow-shaped declaration in use is the quiet button's and the choice outline's `inset 0 0 0 1.5px`, which draws a border, not a lift.

Hover is a tone change (a sage-mist wash, a deeper verdigris, a field-ink-2 step on the ink field), never a lift. Press is a 1px downward move.

### Named Rules
**The Flat At Rest Rule.** Nothing casts a shadow. If an element needs to stand apart, give it a tone step or a rule. `--shadow-md` remains defined for a truly floating overlay and is not used by any field-guide page.

## Shapes

Calm corners, set by role. Controls (buttons, choices, chips, inputs, plate labels, mechanism cards, the Lens tabs) take 6px (`rounded.md`). Panels and photographs (sage-mist panels, soft-white answer panels, the timeline, the hard-moment door, every framed photograph and the Lens plate) take 10px (`rounded.lg`). Tracks and badges take 4px (`rounded.sm`). Full-bleed bands (the close, the footer, the age line, the homepage hero plate on desktop), rows, rules and tables stay square.

Rows are separated by a 1px `border-soft` rule on top of each item, with the first item's rule removed so a list never starts on a line. An index list (the age line's stages, the first moment or topic on an Explore page, the Lens's age doors, the right-now sequence, the class beside a period) opens with a 2px ink rule. Inside a mist panel the internal rule is `sage-mist-2`. There are no side stripes: no `border-left` or `border-right` accent bar on any panel or callout.

Round shapes are reserved for marks: the ochre leader dot on plate labels, the 8px bullet on Lens lists, the swatch on the label toggle.

## Components

### Buttons
One shape, flat, calm corners, feedback on press.
- **Shape:** 6px corners, `min-height: 48px`, `0 1.25rem`, Inter 500 at 16px; `:active` moves down 1px. Full width under 640px in title blocks, price rows and the close.
- **Default (forest):** verdigris fill, soft-white text; hover deepens to `forest-deep`. The one action per surface (Enroll, $49; Browse the classes; Send).
- **Paper:** field-paper fill with ink text, hover soft white. The primary action on the ink field and on photographs.
- **Quiet:** transparent with a 1.5px inset ink outline, ink text; hover washes sage mist. The second action ("See the class", "Watch a lesson free"). On the ink field the outline and text turn `on-ink` and hover steps to `field-ink-2`.
- **Focus:** a 2.5px verdigris outline at 3px offset site-wide (2px at 2px offset inside forms and choice sets); `on-ink` on the ink field.

### Choices and chips
Calm outlined buttons, forest when chosen. Used by the guides' decoder, pattern, scenario and stage pickers, the Before / During / After tabs, and the tool apps' chips and filters.
- **Rest:** transparent, 1.5px inset `border` outline, ink text, 6px corners, 15px Inter; decoder options are full-width left-aligned blocks (48px), chips are inline (44px, `8px 14px`) in an 8px-gap wrap.
- **Hover:** sage-mist wash, outline darkens to `ink-muted`.
- **Chosen:** verdigris fill, soft-white text, no outline. The answer appears beside the choices on a soft-white 10px panel.
- **Right now:** the hard-moment router's situations are full-width rows instead (Newsreader, 1px rules above and below, sage-mist hover), so a parent in a hurry reads a list, not a grid of buttons.

### Rows with quiet rules
The site's list form: tools, articles, guides, prices, principles, credentials, places to go, the homepage menu of classes. A grid of name (Newsreader row name), one-line description (Inter, ink-soft) and an action or price at the end, `22px` of block padding, a 1px `border-soft` rule on top of every row but the first. Hover turns the name verdigris and underlines it. Prices use tabular numerals at Inter 500. Below 760px the row stacks.

### Questions
`<details>` rows under the same 1px rules (top of each, plus a closing rule under the last), a 56px Inter 500 summary with a `+` that becomes `−` when open, the answer in ink-soft at 60ch.

### Hub title block
The top of every inner page: the Newsreader headline, the lead in ink-soft, one meta or fine-print line in ink-muted, then the actions (12px gap). A 7 to 5 grid puts one photograph (10px corners, 4:3 or a 4:5 tall crop, sage-mist behind it while it loads) or one panel beside it; the solo variant drops the second column. No eyebrow above the title.

### Sage-mist panels
The explanatory surface: sage-mist fill, 10px corners, `clamp(24px, 3vw, 36px)` padding, no border, no shadow, internal rows ruled in `sage-mist-2`. Used for the article's short version and callouts (callout text in Newsreader), guide glance and "what this covers" panels, the claim's grade and method, tool recaps and scripts, the contact form, the free-lesson panel on class pages. Small inline variants (scripts to say, tab tips) use 6px corners.

### The research-blue source module
Sources sit under a 2px research-blue top rule with 20px of space above the list. The heading is Inter 600 at 15px in research blue (Newsreader at subhead size on class pages), and every source link is research blue with a 44px target. The same blue marks the evidence line inside a mechanism card and the "Fig." marker. Shipped on articles, guides, claims, class pages and the Lens page.

### The close band
The inverted ink field closing each inner page: `field-ink` ground, square, full bleed, one Newsreader statement in `on-ink`, one supporting line in `on-ink-soft` at 46ch, and one or two buttons (paper or forest, plus a quiet button in on-ink outline) kept together on the left. Focus outlines turn `on-ink`. The footer continues on the same field directly below, so the page ends on one dark mass. The homepage variant sets the statement over the last photograph (darkened to 72% brightness) in the right-hand column.

### The age line (Explore)
The one full sage band: a five-column row of periods (birth to 1, 1 to 2, 2 to 3, 3 to 4, 4 to 5) under a 2px ink rule, separated by 1px translucent ink rules, each with tabular years in Inter 500 and the period name in Newsreader. Hover deepens to `sage-deep`; the current period fills ink with paper text (the reverse in dark). The axis sits under the periods as a scale, never above them. On a period's page it becomes compact navigation (years only on phones, 44px cells). The homepage's age row and class pages use the smaller **age-range bar**: an 8px sage-mist track with a forest segment from `--from` to `--to`, 4px corners.

### The Lens (signature)
Annotated observation in four steps. On the homepage it opens as the hero plate: a real photograph filling the right seven columns, a "show the labels" toggle (paper, 1.5px ink inset outline, ochre swatch; mist when pressed) and typeset labels (paper chips, 6px corners, 14px Inter with a 600 lead word, an ochre leader dot ringed in paper) that rise in over the image. A note label inverts to ink. Labels keep fixed light colors in both themes because they sit on a photograph.

The Lens section sits on sage mist: a sticky 4:5 plate (10px corners) beside the panel. Four tabs (Observe, Understand, Respond, Reflect) in a four-column grid, 6px corners, translucent soft white at rest, ink fill with paper text when selected, each with its clay step numeral. Each step re-labels the same plate; Reflect desaturates it. Understand lists mechanisms as soft-white 6px cards with an ochre dot and a research-blue evidence line; Respond lists options under quiet rules; Reflect sets prompts in Newsreader. The full Lens page adds a title block, a text alternative under a `sage-mist-2` rule, Read / Try / Learn link columns, the sources module and the age doors. Without script every panel shows in order and only the Observe labels stay on the plate. On phones the labels become a list under the photograph.

### Forms
Labels above fields in Inter 500 at 15px; optional hints in ink-muted. Inputs are 48px tall, `10px 14px`, 1.5px `ink-muted` border, 6px corners, soft-white fill on mist panels and field-paper fill elsewhere. Focus adds a 2px verdigris outline at 2px offset and turns the border verdigris. Invalid fields take a `danger` border with a 14px `danger` message; empty error and status slots collapse. Textareas start at 160px and resize vertically. The send button is full width in the contact form; the inline email signup pairs one input with one button.

### Header and footer
One header and one footer on every page, structured and scripted in `chrome.css` and `chrome.js`, tuned for the field guide in `field-guide.css`.
- **Wordmark lockup:** the brand mark (inline SVG, 32px: three stepped arcs in currentColor rising into a leaf in sage-deep; sage arcs and a pale sage leaf in dark mode and on the footer), then lowercase "growing minds" in Newsreader 500 at about 1.35rem, then "SCIENCE" in Inter 500 at 11px, uppercase, tracked 0.32em, nudged onto the name's baseline. No disc or border behind the mark.
- **Header:** 72px, field paper, steps to paper-2 once scrolled, no shadow. Links in Inter 500 at 15px, ink-soft at rest, ink on hover with a 2px bar that scales in underneath (held on the current page). Order: It's hard right now, Explore, Classes, Tools (a details menu), Articles, About, then My classes and the Enroll button. The tools menu is a soft-white panel with a 6px forest top bar and no shadow. Below 1000px the list becomes a full-width sheet under the bar with "It's hard right now" first on a sage-mist tile with 6px corners; the theme and menu buttons become bare icons.
- **Footer:** the ink field at least 70svh tall: the brand and tagline on the left, four link columns (Inter, on-ink-soft, on-ink on hover), then the name set again at display size in Newsreader 500 so the page closes on the wordmark; the fine-print row in on-ink-muted.

### Dark theme
`[data-theme="dark"]` swaps the token values and nothing else: a deep green-black paper (`#141F1C`), light ink (`#EDEBE3`), verdigris lifted to `#8FC4AE` with near-black text on it so it still reads as the one action color, sage mist darkened to `#22362F`, research blue lifted to `#9DBBDD`, clay text to `#E0A48E`. The ink field goes darker than the ground (`#0B1210`) so the close and footer still read as the closing mass. The theme toggle works on every page.

### Print
Printing shows everything: entrance animations are forced visible and the header and footer are hidden. The tool apps print their own sheets (the visit sheet, the activity pocket card) in black Georgia at 12pt with Helvetica headings, independent of the screen system.

### Motion
Entrances only, once, in reading order: elements marked `data-rise` rise 18px and fade in over about 640 to 800ms, staggered by index. They run only when the page has `html.anim`; with reduced motion or without script everything is simply shown. Hover and press transitions are 140 to 180ms. Plate labels fade and rise 6px when revealed; the hero photograph settles from a 4% scale.

### The class app (`/nsc`)
The Next.js class app reads the same field-guide values under its own Tailwind token names in `nsc/app/globals.css`: `ground` is field paper, `surface` is soft white, `tint` and `sea-glass` are sage mist, `ink`, `ink-deep` and `ink-800` are forest ink (`ink-900` a deeper `#12302D`), `teal` is deep verdigris with `teal-soft` and `teal-hover` as its hover and `on-teal` as soft white, `teal-light` is sage. The retired amber names now resolve to the field guide (`amber` is sage for marks on ink, `amber-bright` is sage-deep, `amber-deep` is verdigris for label text, `amber-tint` is sage mist). `line` and `line-soft` are the two hairlines, and `field-line` (`#789690`) is an app-only input outline at 3:1. Fonts are Newsreader over Inter through `next/font`; `radius-control` is 6px and `radius-card` / `radius-panel` are 10px; every shadow is `none` except `shadow-lg`, kept for real overlays.

### Arcade palettes
The games on `/arcade` keep their own isolated retro palettes in `arcade.css` and `pong.css`. They are not design-system drift.

## Do's and Don'ts

### Do:
- **Do** set every word in forest ink on field paper, and use deep verdigris for every action and nothing else (The One Action Color Rule).
- **Do** put explanation on a sage-mist panel with 10px corners and no border.
- **Do** separate rows with a 1px `border-soft` rule on top of each row but the first, and open an index list with a 2px ink rule.
- **Do** put sources in the research-blue module: a 2px research-blue rule, an Inter 600 heading, research-blue links.
- **Do** set names, headings and statements in Newsreader and everything a parent reads, taps or fills in, in Inter (The Two Hands Rule).
- **Do** use the three button shapes only: forest, paper, and quiet with a 1.5px inset outline; 48px tall, 6px corners.
- **Do** draw choices as calm outlined buttons that fill forest when chosen.
- **Do** close each inner page with one statement and one action on the ink field, flowing into the footer.
- **Do** use real, observational photographs at 10px corners, or none.
- **Do** keep entrances gated by `html.anim`, honor reduced motion, and keep every panel visible without script.
- **Do** write copy without em dashes; use commas, colons or a new sentence.

### Don't:
- **Don't** put a kicker, eyebrow, step label or category above a heading; it goes below as a meta line (The Label Below Rule).
- **Don't** add a box-shadow at rest, lift on hover, or use a gradient (The Flat At Rest Rule).
- **Don't** use clay, ochre or amber at any size larger than an annotation mark, or on a button or heading (The Annotation Scale Rule).
- **Don't** use research blue for anything that is not a source or evidence (The Research Blue Rule).
- **Don't** use stock photography, generic smiling families, brain imagery or decorative icons that fill space.
- **Don't** stack heavy colored cards; a list is rows under quiet rules.
- **Don't** use `border-left` or `border-right` as a colored accent stripe on a panel or callout.
- **Don't** restyle `.site-header` or `.site-footer` outside `chrome.css` and the field-guide layer in `field-guide.css`.
- **Don't** reintroduce a retired value from an earlier system (Geologica, Literata, Besley, amber highlighter, square-only corners).
