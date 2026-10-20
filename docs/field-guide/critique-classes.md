# Design critique: the classes hub and the four class pages

The first inner pages on the annotated-observation system (composition B, `compositions.md`). Screenshots were taken with playwright, sliced into screen pairs at 1440 (half scale) and at 390, and read one screen at a time. They are working files and are not committed. Scored in the taste skill's `critique.md` format.

## What the pages are now

- **`/classes/`**: the lead line "The first five years, understood." with the homepage's supporting sentence, the terms in one line, and Fig. 1, the four classes across birth to five (composition C's timeline, rebuilt in HTML so it follows the theme and stacks on phones). The four classes follow as rows with quiet rules: name, one sentence, meta, price and the real checkout link. A sage-mist panel offers the free lesson. 314 words in `<main>`, down from 508.
- **The four class pages**: the class name as the title; the lede; the facts as quiet metadata; Enroll and a quiet second action; the class's own chart as Fig. 1 (infant, toddler) or the curriculum timeline with this class leading (preschool, family). Then the outcomes, the syllabus with the sources as a research-blue module, the educator, free reading as one sage-mist panel, the questions, and the enroll or waitlist close on sage mist. Words in `<main>` are down 26% to 30%. The rest is citations, syllabi, figure captions and the toddler lesson sample, which were left whole.
- **No photographs.** The `class-*.jpg` pictures are lamp-lit, golden and shallow-focus, unlike the four generated pictures, which are flat daylight on a neutral grade. As briefed, they were dropped and the slot was left to copy and the timeline.

## Round 1 (first render)

```
ROUND 1
Seen in one second: "The first five years, understood." beside four bars across a five-year axis.
Idea (one sentence): the classes are four windows on one timeline of the same growing mind, and the page reads the timeline first and the prices second.
Live thing: the timeline rows jump to each class; on a class page the class's own row leads.
Layout words by section: title=split + figure / classes=rows / free=panel; class page: title=split + figure / outcomes=split / syllabus=rows / sources=split module / educator=split / reading=panel / questions=rows / close=panel
Scores: hub design 6.5 · usability 6 · creativity 7 · content 8 → 6.6; class pages design 6 · usability 5 · creativity 6.5 · content 7.5 → 5.9
Caps applied: fewer than four real pictures (design ≤ 6.5); content clipped off-screen on the infant page at 390 (usability ≤ 5).
Top three problems (most visible first):
1. Infant page at 390 scrolled sideways: the lede, the buttons and the chart ran past the right edge (390 t1). Cause: single-column grids at `1fr` grew to their content's minimum width. Fix: every collapsed grid is `minmax(0, 1fr)`.
2. Hub at 390: Fig. 1's bars were too narrow for their names ("Birth to 12 months" on three lines in a 64px bar, 390 t1). Fix: each timeline row is one link holding a name and a bar; on a phone the name takes its own line above a thin bar, right-aligned when the bar ends the axis.
3. Class pages at 1440: the sources list fell into the narrow left column beside its lede, leaving a hole the height of eight citations (1440 t2). The free-reading rows had no inner padding, because `.fg ul[class]` outranked the panel rule. Fix: the list spans the right column; the panel selector is `.cp ul.reading`.
Also fixed in the round: the per-row range bars on the hub only repeated Fig. 1 (removed); the dimmed rows on the class timeline used opacity and lost contrast (now sage-mist bars with ink text); the footer's last link touched the wordmark at 390 on every page (a row gap in the footer grid, which also fixes the homepage).
```

## Round 2

```
ROUND 2
Seen in one second: the same; on a class page, the class name beside its own chart.
Scores: hub design 6.5 · usability 8 · creativity 7 · content 8 → 7.1; class pages design 6.5 · usability 7 · creativity 6.5 · content 7.5 → 6.8
Caps applied: fewer than four real pictures (design ≤ 6.5). The inspector's few-pictures FAIL caps the overall score at 6.0 until photographs exist; the uncapped scores are given so the change is visible.
Top three problems (most visible first):
1. The outcomes heading ("By the end of the class, you'll have a clearer picture of what your toddler is doing, and why.") set three to four lines in the left column at 1440. Fix: the heading is "By the end of the class" and the rest of the sentence, word for word, is its lead line.
2. The hub's h1 wrapped to three lines at 1440 (84px in a 5/12 column). Fix: a 6/6 title grid and a 68px top size; two lines at every width.
3. The inspector read Fig. 1's names as light text on the light panel, because the colored bar was a sibling element; axe found the infant enroll fine print's links overlapping as targets; the hub's class-name links were 28px tall at 390. Fix: on wide screens the name carries its bar's color itself; the fine print has 2.1 line spacing instead of a padding trick; the class-name links have a 44px hit area.
Also: the class pages barely moved (`still-page`); their content blocks now rise once as they enter (the headline does not, so the largest paint is not delayed), using the homepage's own script.
```

## Warnings and fails kept, with the defense

- `hairline` (lint and inspector): quiet rules between rows are the guidelines' own instruction ("quiet rules"); `compositions.md` records the defense for the system.
- `shadow` on `.btn--ghost` and `.hb-btn--quiet`: an inset outline drawing the quiet button, not a shadow; same defense as the homepage.
- `few-pictures` (FAIL): no photographs by decision. The class photographs were stock placeholders that do not match the generated series, and stock is not allowed. These pages wait on Matthew's pictures.
- `covered-text` at 390 on the class pages: the phone enroll bar, a sticky overlay that appears once the hero buttons scroll away; it is chrome, not content.
- `micro-label` ("science"): the wordmark's tracked descriptor, from the guidelines.
- `palette-cream`: field paper, `#F7F4EC`, the guidelines' editorial background.
- `size-count`: the homepage's scale plus the chrome's own sizes and the figure labels.
- `no-footage`: no honest clip of the subject exists.
- `mixed-font-headline`: the report does not name the element; it fires on every page, the homepage included, and the only large mixed-face text common to all of them is the footer's wordmark lockup (the name in Newsreader, the tracked descriptor in Inter), which is the guidelines' lockup.
- Escape leaves the FAQ rows open: they are in-page `details` content, not overlays.
