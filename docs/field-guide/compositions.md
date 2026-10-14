# Homepage reset, 2026-10-14

On 2026-10-14 Matthew rejected the Field Guide homepage that shipped in PRs #101 to #104: the silhouette figures read as cheap, the page carried far too many words, and the layout was tables and tone-stepped tiles. The brief had asked for two or three visual compositions before settling on one; that step had been skipped. The reset ran it.

## The authority

The brand guidelines PDF (`reference/brand-guidelines.pdf`, "Field Notes & Discovery", ten pages) governs every decision. Where it differs from the taste skill's house rules, the guidelines win, and the inspector's objections are defended rather than fixed:

- Quiet rules (thin dividers) between rows: the guidelines ask for "quiet rules".
- Small figure numbers and the 01 to 04 step numbers on the Lens: the guidelines' own Lens uses them.
- Age labels above period names, and small tracked labels such as "The Developmental Lens": field-guide notation, the guidelines' third signature move.
- The inset outline on the quiet button: an outlined button, not a shadow.
- The "palette-cream" warning: the paper is the guidelines' field paper, `#F7F4EC`.

## What is fixed across the site from here

- Tokens are the guidelines' hex values (`assets/css/tokens-field-guide.css`): forest ink, field paper, deep verdigris, sage mist, discovery clay, golden ochre, research blue, soft white. Clay for small text uses a darker text-safe clay (`--clay-text`, 5.1:1 on paper). Calm corners: 6px on controls and panels, 10px on photographs in panels.
- Type: Newsreader over Inter, the guidelines' preferred pair. Inter is loaded on the homepage; inner pages fall back to DM Sans until they are rebuilt.
- Wordmark: lowercase "growing minds" in Newsreader with a widely tracked "SCIENCE" descriptor, in the header, the footer and the footer's full-width close. The sprout mark is retired from the chrome (the guidelines ask for type before symbol and no sprout or tree marks).
- Photography: the four generated photographs and Matthew's own pictures. No stock. No silhouette figures. Drawn figures, where any are needed, must pass the plan's G5 proportion gate.

## The three compositions

Built as working pages at `/lab/a/`, `/lab/b/` and `/lab/c/` (PR #107, kept as the record), all on the same copy, tokens and eight-section story:

- **A, The lens.** The observation motif from the guidelines' cover as the page's structure: a forest first screen, type at poster scale, the four rings as the four steps, a relationship map in the Lens.
- **B, Annotated observation.** Signature move 01 as the whole page: a real moment fills the first screen and the visitor reveals typeset labels over it. The Lens is the same plate, re-labelled step by step.
- **C, The field guide entry.** Signature move 03 as the object: the moment as Entry 01 with field marks, where found and a range bar; the five periods as tiles that grow with age; the classes on a timeline.

## The decision

Matthew chose **B**. It became the homepage in `index.html`, `assets/css/home.css` and `assets/js/home.js`. From C, the age-period tiles and the classes timeline are worth reusing on the classes hub and the Explore hub. From A, the relationship map is the model for Lens diagrams.

## Consequences for the plan

- Phase 3 as built on `redesign/field-guide-phase-3` applied the rejected system to the inner pages. It is not merged. The inner pages are rebuilt on the homepage's system instead: `home.css` is the model, the hub pages come first, and every page carries real photographs or none, never silhouettes.
- The standalone Lens page still carries the silhouette plate. It is replaced with the homepage's photograph plate in the same pass as the inner pages.
- The Lens science remains marked as awaiting source review until checkpoint C3.
