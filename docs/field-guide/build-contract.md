# Build contract: the Field Guide system

Everyone building on branch `redesign/field-guide` works to this. It is short on purpose.

## Files and ownership

| File | Owner | Purpose |
| --- | --- | --- |
| `assets/css/tokens-field-guide.css` | lead | Color, type, space, motion tokens. Read-only for everyone else. |
| `assets/css/field-guide.css` | lead | Page shell, editorial components, homepage sections, header and footer overrides. |
| `assets/css/lens.css`, `assets/js/lens.js` | Lens builder | The Developmental Lens component (used on the homepage and the Lens page). |
| `lens/leaving-the-playground.html` | Lens builder | The standalone Lens page. |
| `assets/css/explorer.css`, `assets/js/explorer.js` | Explorer builder | The age explorer (section 3 of the homepage). |
| `index.html` | lead | The homepage. Includes the Lens and explorer markup. |

A builder edits only the files in their row. Shared markup fragments are handed back as a file under `docs/field-guide/fragments/` and the lead pastes them in.

## Tokens only

Every color, size, space and easing comes from `tokens-field-guide.css`. A raw hex or pixel size in a component is a second palette starting. The names to use:

- Ground and surfaces: `--paper`, `--paper-2`, `--surface`, `--surface-2`.
- Ink: `--ink`, `--ink-soft`, `--ink-muted`.
- The one action color: `--forest` with `--on-forest`; hover `--forest-deep`.
- The field color for whole sections: `--sage` with `--on-sage`; `--sage-deep` for an active element on sage.
- The inverted field: `--field-ink` with `--on-ink`, `--on-ink-soft`, `--on-ink-muted`.
- Annotation marks inside figures only: `--note-warm`, `--note-amber`. Never a fill larger than a mark, never on a button or heading.
- Type: `--font-display` (Newsreader: headings, statements, the big figure) and `--font-body` (DM Sans: everything read or clicked). Steps: `--step-small`, `--step-body`, `--step-lead`, `--step-head`, `--step-display`. No sixth size.
- Space: `--margin`, `--gutter`, `--section`, `--axis` (42%), `--space-*`.
- Motion: `--ease-out`, `--ease-in-out`, `--ease-soft`, `--t-press`, `--t-hover`, `--t-ui`, `--t-reveal`.

Dark mode comes free from the tokens (`[data-theme="dark"]`). Do not write a dark-mode override unless a figure needs one.

## House rules (the inspector measures these)

- Headlines two lines or fewer at 1440, 768 and 390. Author the break.
- No eyebrow or kicker above a heading. No pill badge. No "01 / 02 / 03" or "Step 2" numbering; order is carried by position and words. A real `<ol>` where order matters.
- No monospace outside `<pre>`/`<code>`.
- No hairline rules, no 1px outlined boxes, no grid lines. Surfaces separate by a tone step or by space. Real tables and form fields may keep their lines.
- No gradients, no shadows at rest, no glass or backdrop blur, no emoji, no decorative blobs.
- One corner radius: 0. One button shape: square, filled `--forest`, at least 48px tall, text in `--font-body` 500.
- Running text in `--ink` at `--step-body` or larger. `--ink-muted` only for meta.
- Two typefaces, each with one job. No italic or colored accent word inside a headline.
- Every image: `width`, `height`, `alt`, square corners, `loading="lazy"` except the hero.
- Transform, opacity and clip-path only. Every move inside `@media (prefers-reduced-motion: no-preference)`; the reduced state is the finished state. Hidden-until-revealed states only under `html.js`.
- Content is complete without JavaScript: tabs are sections that stack; the explorer shows every stage; the figure's annotations are readable as a list.
- WCAG 2.2 AA: keyboard operable, visible `:focus-visible` in `--forest` with 3px offset, 44px targets on phones, `aria-*` on tablists and live regions, `<title>` and `<desc>` on every informative SVG plus a visible caption.
- No new third-party scripts, fonts beyond the two, or images from the web. Photographs are the ones already in `assets/img/`.
- Voice: a thoughtful developmental scientist explaining to a tired, intelligent adult. No em dashes. No "unlock", "elevate", "empower", "seamless". Sentence case everywhere.

## Figures: the plate style

Informative drawings are inline SVG "plates" in one language across the site:
- Paper ground (the figure has no box and no border).
- Scenes as ink silhouettes (`--ink` fill, no faces, no outlines) with one or two flat `--sage` or `--sage-deep` fills for the environment (a slide, a tray, ground).
- Annotations as a short label in `--font-body` 500 at 14–15px with a 1.5px leader line in `--ink` ending in a 6px filled dot on the thing it names. The active annotation turns `--forest`. The parent's annotation uses `--note-warm`.
- `preserveAspectRatio="xMidYMid meet"`, a `viewBox` of 1200×680 for wide plates, text as real `<text>` elements so it scales and reads.
- A visible caption under the plate in `--step-small`, `--ink-muted`, that states what the figure is (a conceptual reading) and its sources.

## Scientific integrity

- Copy comes from `docs/field-guide/copy-deck.md`. Do not add claims, numbers or citations that are not in the deck.
- Keep every "[verify]" marker's meaning: the Lens page shows a visible status line saying the science is a prototype awaiting source review.
- Evidence notes use exactly three phrasings: "Well established", "Supported", "Conceptual model" (plus a qualifying clause from the deck). They are editorial characterizations, not Claims Library grades.
