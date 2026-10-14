# Creative direction: the Living Field Guide

## The concept

A field guide is a printed plate with notes in its margin. It shows an ordinary thing, drawn plainly, and labels what the eye would miss. The site does the same for childhood: a dropped spoon, a toddler running back to the slide, drawn in silhouette and annotated with what may be growing beneath it. The register is scientific but warm: paper, ink, one green, and no decoration that is not doing a job.

## Three compositions explored

The direction draw (seed 843235796) produced three candidate compositions.

| Composition | Decision | Reason |
| --- | --- | --- |
| Type-only statement | Rejected | A words-only first screen conflicts with the brief, which fixes an annotated scene as the hero visual. |
| Sentence as layout | Rejected | A poster sentence with an inline media slot is a landing-page trick. It would not carry a field guide that holds plates, tables and long reading. |
| Editorial report, "the printed annual" | Chosen | A masthead band, a title on a fixed 42% axis, side notes in the margin zone and whole pages of flat colour. A field guide is a printed plate with annotations in its margin, so the direction's own geometry carries the idea. |

Two further decisions follow. The dealt hero blueprint (a two-by-two tile board with the name at 12.5vw) was replaced by the direction's own masthead composition, because the brief fixes the headline sentence and the hero visual. The two dealt call-to-action blueprints were swapped: "the idea again, inverted" became the final close, and the "moments that cannot wait" section took a plain sentence with one action on a sage field, because that section must be compact and calm.

## Idea sentence and live things

On this page, the field-guide plate (an ordinary childhood moment drawn in silhouette and annotated with what may be growing beneath it) becomes the masthead band and the figures in the margin of the printed annual.

The live things:

- The four annotations on the masthead plate (a baby dropping a spoon) are controls. Each reveals one sentence.
- The Developmental Lens steps through a second plate (leaving the playground). Its callouts can be manipulated in Understand.
- The age cursor selects the stage in the explorer.

## Colour

All values live in `assets/css/tokens-field-guide.css`. Components read tokens only.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | #F7F5EF | #141F1C | Page ground |
| `--paper-2` | #EEEBE1 | #1A2724 | One tone step: alternate sections, the masthead band |
| `--surface` | #FDFCF9 | #1E2C28 | Panels, inputs, inactive tabs |
| `--ink` | #20322F | #EDEBE3 | All type |
| `--ink-muted` | #596B67 | #9FAEA8 | Captions and meta only |
| `--forest` | #315D52 | #8FC4AE | The one action colour: buttons, links, active tab |
| `--sage` | #A9C3B2 | #2B4A41 | Field colour for whole sections and figure fills |
| `--sage-deep` | #8DAE9A | #3A6054 | Active element on sage, figure fills |
| `--field-ink` | #20322F | #0B1210 | The inverted field: the close and the footer |
| `--note-warm` (clay) | #BB7866 | #D9A08E | Annotation marks inside figures; the parent's callout |
| `--note-amber` | #C99450 | #DDB36E | Annotation marks inside figures |

Amber and clay never appear as fills, because the brand's standing rule is no warm colour at scale. The dark theme is derived in the same token file: a green-black paper, soft light ink, and the forest lifted so it still reads as the single accent.

## Type

Newsreader carries headings, statements and the large figure. DM Sans carries everything that is read or clicked. Each family has one job.

| Step | Size | Use |
| --- | --- | --- |
| Small | 13 to 14px | Captions, table meta |
| Body | 17 to 19px | Reading, interface |
| Lead | 20 to 26px | Standfirsts, lens subheads |
| Head | 32 to 58px | Section headings |
| Display | 32 to 80px | The title, the tools statement, the wordmark |

Display tracking is -0.025em and head tracking -0.02em. One extra size exists: the close headline at 9.4vw. There is no monospace, no numbering and no eyebrow.

## Space and grid

Margins are tight (1 to 2rem) so content reaches the edges. The gutter is 0.75 to 1.5rem. The gap between sections (6 to 12.5rem) is always larger than any gap inside one. A fixed axis at 42% of the width organises the page: titles start on it, body columns hang from it, and the 0 to 42% zone holds side notes, figures, or stays empty. Below 1000px the axis collapses to the left margin and notes move above their paragraph.

## Figures: the plate

Inline SVG, paper ground, no box. Scenes are ink silhouettes with no faces and flat sage fills for the environment. Annotations are a short DM Sans label with a 1.5px leader line ending in a filled dot; the active one turns forest and the parent's uses clay. Every plate carries `title` and `desc`, a text alternative, and a visible caption that says "conceptual reading" and names its sources.

## Photography

The existing site photographs are placeholders. The founder wants custom assets in place of stock imagery, so no new stock is added. The brief for the replacements is `docs/field-guide/asset-brief.md`. Direction: naturalistic and unposed, with one treatment across a set.

## Motion

One signature move: the masthead plate opens as a shutter on load. Beyond that: staggered entrances per section, press and hover feedback, and a slow scroll drift on two photographs. Everything runs under `prefers-reduced-motion: no-preference` and only when `html.anim` is set. Content is visible without JavaScript.

## Deliberately absent

- Eyebrows and kickers: a heading should state its subject without a label above it.
- Cards and outlined boxes: surfaces separate by tone step or by space.
- Gradients, shadows at rest and glass: they imitate depth that a printed page does not have.
- Numbering: order is carried by position and words, with a real list where order matters.
- Monospace: it signals a product interface, not a printed guide.
