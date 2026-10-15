# Design critique: the eight articles

S4 batch (a). The articles rebuilt on the annotated-observation system with `article.css`, on the primitives in `fg-base.css` and the close band in `hubs.css`. `serve-and-return` is the model page and got the full critique; the other seven got the inspector, G6 and a screenshot pass of the parts they do not share with it (the checklist in `cliff-at-three`, the step figure in `parents-nervous-system`, the paired cells in `milestone-worry`, the closes). Screenshots with playwright-cli at 1440 and 390, light and dark. Working files, not committed.

## What the pages are now

- A title block: the headline in Newsreader, the dek, one meta line (Articles, byline, topic, read time), and "The short version" on sage mist beside it.
- One reading column at 68ch, Inter at 18px, with the contents list beside it (sticky at desktop, above the text on phones).
- Callouts on sage mist in Newsreader; the "what the science supports / does not say" pairs as two cells under an ink rule; figures on a soft white panel with calm corners; sources in the research-blue module.
- The close band from the hubs: the article's own statement and its two actions.
- The article text, figures and sources are carried across unchanged; the build script checks every article word for word against the original. The only words added are "Dr." before Margaret Friend (Matthew, 2026-10-14). The "Research, explained" and "Practical" kickers are dropped (no eyebrows); the close's small labels ("Free tool · no account needed") move under the paragraph as a note.
- `decor.js`, `styles.css`, `refresh.css` and the inline style blocks no longer load.

## Round 1

```
ROUND 1
Seen in one second: the headline beside the sage "short version" panel.
Idea (one sentence): a research article set like a field notebook: one column, the contents in the margin, the science in panels.
Live thing: the contents follow the reader at desktop; the figures carry the argument.
Scores (serve-and-return): design 6.5 · usability 7.5 · creativity 6 · content 8 → 7.0
Caps applied: no pictures (no stock allowed; the articles carry drawn figures only).
Top problems (most visible first):
1. Source links 42px tall at 390 on six articles (G6 tap targets). Fix: each source is a 44px block.
2. Titles at three lines at 1440 (a 20ch measure on long titles). Fix: 26ch, a step smaller (52px).
3. The "Articles" link above the headline read as an eyebrow. Fix: it opens the meta line instead.
Also: the figure panel's 1px outline removed (filled surface only); the title block rises on entry; close statements get a 32ch measure.
Earlier, from screenshots before the gate: the close band had no padding, the contents label and article subheads fell back to Newsreader at small sizes, the checklist inherited the article list's indent, and the step-figure titles lost their size to the step paragraph rule. All fixed.
```

## Round 2 (confirming)

```
ROUND 2
Scores (serve-and-return): design 7 · usability 8 · creativity 6 · content 8 → 7.3
Remaining: titles of ten or more words wrap to three lines at 390 (32px). Kept: the titles are the articles' own words, and three lines of a long title on a phone read better than a smaller headline.
```

## Fails and warnings kept, with the defence

The standing defences in `critique-classes.md` and `critique-hubs.md` carry over: quiet rules (`hairline`, the guidelines' instruction), field paper (`palette-cream`), the wordmark lockup (`mixed-font-headline`, `micro-label`), the size count, no footage. New for these pages:

- `few-pictures` and `focal-point`: the articles carry no photographs. No stock is allowed and none of Matthew's pictures fit an article yet; the drawn figures carry the explanation. The first screen is type-led by design: the headline and the short version.
- `still-page`: the title block and the close rise; the reading column stays still on purpose.
- `headline-lines` at 390: above.
- Lighthouse was not run on the articles themselves (the gate's G8 covers the homepage, Lens and classes hub). The articles load no images and fewer stylesheets and scripts than before.
