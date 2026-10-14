# Phase 3 report: the Field Guide on every inner page

Branch `redesign/field-guide-phase-3`, cut from `redesign/field-guide` on 2026-10-14. Nothing was pushed or deployed. No URL, form, payment, auth or tool behaviour changed.

## What changed

### Tokens, type and chrome (every page)

- `styles.css` and `home.css` import `tokens-field-guide.css`. `tokens-terrain.css` is deleted; nothing referenced it afterwards. The Terrain-only names the inner sheets read (`--contour`, `--woodland`, `--water`, `--amber-tint`) resolve through the aliases the new token file already carried; the one component that drew with them, the terrain inset on `/tools/`, is gone with that page's rebuild.
- Every page loads the Newsreader and DM Sans link that `index.html` uses. The Geologica and Literata fallbacks went with the Terrain token file. The milestones tracker's inline tokens (light and dark) map onto the field-guide palette and faces, and its eyebrow is hidden.
- The header and footer on all 50 pages that carry the shared chrome are the fragments in `docs/field-guide/fragments/`, with `aria-current` on the page's own section (the Tools summary and the matching submenu link for tools, claims and the tracker; the Enroll button hides itself on `/classes/`; the footer link for the page's own URL is marked too). The `/nsc/class-login` utility link stays. The claims template in `scripts/build-claims.mjs` and the header in `scripts/build-library.mjs` were updated the same way, and the claims pages regenerated so the drift gate still passes. Pages that never had the chrome (`/tools/right-now`, `/login`, `/account`) still do not; they only pick up the tokens and fonts.
- `chrome.css` now renders the field-guide look itself (paper bar, Newsreader wordmark, DM Sans links, one forest action, the ink-field footer with the wordmark at full width, four footer columns), so `field-guide.css` no longer overrides it. The menu description moved from muted to soft ink for AA contrast on the menu surface.

### House rules (the inner-page stylesheets)

`styles.css`, `refresh.css`, `tools.css` and the inline styles of the article, tool and claims pages lost every shadow at rest, non-zero radius, gradient, italic accent, tracked label and hairline rule; real form fields keep a 1.5px ink line. The two older override layers at the end of `refresh.css` (Seminar, Terrain) are replaced by one Field Guide layer: paper ground, display-size page titles, headings in Newsreader 500, running text in DM Sans at the body step, one forest button shape, panels and rows that separate by a tone step, kickers and index numbers hidden, figures in the plate style, and entrances for the first screen's parts and for headings as they enter the viewport. `seminar.css` was brought to the rules first and then deleted, because the only pages that loaded it (the classes hub, the four class pages and pricing) were rebuilt on the field-guide templates.

### The hub pages

A new stylesheet, `assets/css/field-guide-pages.css`, holds the inner-page editorial templates on top of `field-guide.css`: the title block with its notes in the margin zone and the title on the 42% axis, sections whose heading sits on the axis with the body hanging from it, bands of paper, paper-2, sage and ink that always alternate, rows that separate by a tone step, the field guide's own tables, the plate style for the two class figures, the curriculum bars, forms, the enroll close on the ink field, and the phone-only enroll bar as a tone step.

- `/classes/`: the curriculum bars in the margin, the title on the axis, then the four classes compared in one table with the class photographs in its header, and a sage band of things to try first.
- The four class pages: facts and the class photograph in the margin; the plate figure (infant, toddler) under "One idea from the class"; the sage field of what you will learn; the lesson sample (toddler); the syllabus as rows with lessons as a real ordered list; sources as rows; who it is for; the educator with a real portrait; free reading as linked rows; questions as details rows; the enroll close on the ink field with the price, what is included, the real checkout link and the refund terms. The family-systems page keeps its waitlist form inside the close. Checkout links, the Thinkific note on the toddler class, `#enroll`, `#waitlist`, `#syllabus`, `#sample` and the `[data-enroll-bar]` hook that `main.js` reads are all preserved.
- `/pricing`: the terms in the margin, then Free, Classes and Also available as three tables (what, what you get, price, action), and the questions as details rows. The AI Pro checkout link and `rel="nofollow"` are unchanged.
- `/tools/`: the notebook photograph, the hard-moment door and the child profile in the margin; the interactive tools as a left-aligned table; guides by topic as linked rows that keep `data-gms-tool-list` and the age ranges so the profile still reorders and flags them; the saved shelf section; a sage close to the classes. `tools.css` still loads here for the shelf and profile that `gms-tools.js` injects.
- `/articles/`: the reading photograph in the margin, the eight articles as linked rows (the former kickers are now the row's meta, with the read time), a sage band of what to expect, and the email form on a paper-2 band with its ids and attributes intact.
- `/about/`: the facts in the margin, why it exists, Matthew with the portrait as a drop capital, how it teaches on a sage field, the background as a small table, and the classes as the close.

Headlines on the hubs were shortened to the two-line rule: "One class for each window.", "Free tools, by what you need", "The science, in plain language.", "Science, for the people living it.", and the class names as the class-page titles with the subject in the lead. No claim, number or citation was added; copy was carried over.

### Gates

Filled in below after the final inspector run.

## What the nsc app still needs

The Number Path and class app at `/nsc` is a separate Next.js deploy and was not touched. To match the rest of the site it needs:

1. Tokens: `nsc/app/globals.css` still declares the Seminar system (Besley over Atkinson Hyperlegible Next, an amber highlighter, 6 to 10px radii, cream grounds). It should read the same names as `tokens-field-guide.css` (paper, ink, forest, sage; Newsreader over DM Sans; radius 0; no shadows at rest), with the dark theme keyed to `data-theme="dark"` and the `gms-theme` key so the toggle follows the visitor across the proxy.
2. Chrome: its header and footer should be the fragments in `docs/field-guide/fragments/` (or a component that renders the same markup), styled by `chrome.css`, so `/nsc/class-login` and the class pages meet the same bar and footer.
3. House rules: no eyebrows, pills, hairline cards or amber fills on the class-login, class-signup, enroll and lesson pages; tables and tone-stepped rows instead of card grids; the plate style for any figure.
4. Printables and the lesson player keep their own layout but should take the type and colour from the shared tokens.

## Left open

- The sticky header (and the phone enroll bar on class pages) passes over headings as the page scrolls; the inspector reports that as covered text. It is the chrome, not the content.
- The inspector asks for four photographs on every page. The brand rule is no new stock photography, so the hub pages carry the site's existing photographs where one is honest (the class photographs, the notebook, the reading photograph, the portrait) and the text pages (articles, guides, claims, tools) carry none. That stays a reported failure until custom assets exist (see `asset-brief.md`).
- The inspector flags the paper ground as a cream; it is the direction's chosen palette.
- `terrain.js` and `home.js` are no longer loaded by any page and can be deleted in a later pass; `decor.js` and `animate.js` are still loaded by the older inner pages (their motifs are hidden by the Field Guide layer).
- The older inner pages (articles, guides, claims, FAQ, contact, 404, thank-you, the arcade hub) keep their markup; they render the system through tokens and the Field Guide layer, and will look most finished once they are rebuilt on `field-guide-pages.css` in a later phase.
