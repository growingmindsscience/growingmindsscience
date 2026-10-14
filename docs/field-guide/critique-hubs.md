# Design critique: the tools, articles, about and pricing hubs

The four remaining hub pages on the annotated-observation system, built on the same primitives as the homepage and the classes pages (`fg-base.css`), with their own `hubs.css`. Screenshots were taken with playwright at 1440 (half scale) and 390, sliced into screen pairs and read one screen at a time. They are working files, not committed. Scored in the taste skill's `critique.md` format.

## What the pages are now

- **`/tools/`.** Title and lede, with the hard-moment door as a dark panel beside them: the first screen's action, as the guidelines ask. The six interactive tools are rows beside the generated notebook photograph. On a phone the photograph follows the list, so a hurried parent reaches the tools first. The guides by topic follow as rows under real topic headings, with the child profile beside them. Every `gms-tools` hook is kept: with a 0 to 3 month child saved, "What's typical, by stage" is flagged "For your child", tinted, and moved first in its topic. The Milestone Navigator row stays commented out until attorney review (D3). 743 to 528 words (29% fewer).
- **`/articles/`.** Title and lede beside the generated blocks photograph (replacing the old stock reading photograph). The eight articles are rows: category and read time, title, and a one-line dek. The email form is unchanged except for the button's class. The "Now publishing" notice, the promo banner and the "What you can expect" section are cut. 469 to 297 words (37% fewer).
- **`/about/`.** "Mental models, not scripts." leads, per C0, with Matthew's reading photograph. Then why it exists, the biography beside his portrait, the five teaching principles on sage mist, the background, and the close. The biography's facts are unchanged. 518 to 368 words (29% fewer).
- **`/pricing`.** Title and lede in one column. Free, Classes and Also available are price rows with every checkout href unchanged. Five questions, down from seven; the two cut answers repeated the rows. 710 to 550 words (23% fewer; the rest is prices and terms).

## Round 1 (first render)

```
ROUND 1
Seen in one second: the page's headline beside one picture or, on tools, the dark hard-moment panel.
Idea (one sentence): each hub is the homepage's page grammar (a lead line, quiet rows, one picture) applied to one kind of thing.
Live thing: tools reorders its guides for a saved child; articles and pricing are lists; about is the founder.
Scores: tools design 6 · usability 6 · creativity 6.5 · content 7.5 → 6.3; articles 6.5 · 7 · 6 · 7.5 → 6.7; about 7 · 7.5 · 6.5 · 8 → 7.2; pricing 6 · 7 · 5.5 · 7.5 → 6.4
Caps applied: fewer than four real pictures on every page (design ≤ 6.5; about has two, so ≤ 6.5 as well).
Top three problems (most visible first):
1. Tools: "Add your child" rendered as plain text. Main's `.fg button` reset (0,1,1) outranked `.btn` (0,1,0) on every `<button>`, the same bug found on the closed Phase 3 branch and never fixed on main. Fix: the reset sits at `:where()` weight in field-guide.css. The homepage's computed styles show no declared change at 1440 or 390.
2. Tools: the topic labels ("Behavior", "Sleep") were 13px clay labels above the first row of each topic, reading as eyebrows. Fix: real headings in Newsreader at the subhead size, with more space above each topic.
3. Articles h1 at three lines in a half-width column at 1440; about's "Parents don't need more pressure. They need better explanations." at four lines; pricing's title with an empty right half. Fix: a 7/5 title grid; the about heading split at the sentence, word for word; pricing's title in one column.
```

## Round 2

```
ROUND 2
Scores: tools design 6.5 · usability 7.5 · creativity 6.5 · content 7.5 → 6.9; articles 6.5 · 7.5 · 6 · 7.5 → 6.8; about 6.5 · 8 · 6.5 · 8 → 7.0; pricing 6.5 · 7.5 · 5.5 · 7.5 → 6.7
Caps applied: fewer than four real pictures (design ≤ 6.5). The inspector's few-pictures FAIL caps every page at 6.0 overall until Matthew's pictures exist; the uncapped scores show the change.
Top three problems (most visible first):
1. Row names were 39px tall at 390 on tools, articles and pricing (the gate's tap-target check). Fix: a 10px hit margin on each row's link, so every name is 44px or more; the topic jump links are 44px wide too.
2. Tools and articles barely moved (`still-page`): each list rose as one block. Fix: each row rises on its own as it enters.
3. Tools' close heading ran three lines at 768 and 390, and on phones the notebook photograph sat between the section's sentence and the tools. Fix: the heading is "Everything here stays free." and "The classes explain the why." opens its paragraph; on phones the photograph follows the list.
Also: the "For your child" flag lost the tan pill tools.css gave it; it is forest text, like the rest of the page's metadata.
```

## Fails and warnings kept, with the defence

The standing defences in `critique-classes.md` carry over: quiet rules (`hairline`, the guidelines' instruction), the quiet button's inset outline (`shadow`), field paper (`palette-cream`), the wordmark lockup (`mixed-font-headline`, `micro-label`), the size count, and no footage. New for these pages:

- `few-pictures` (FAIL): tools, articles and about carry one or two of the generated pictures or Matthew's own; pricing carries none. No stock is allowed. A custom picture for articles (a parent reading) would fit better than the blocks photograph; that is a brief for Matthew.
- Escape leaves the pricing questions open: they are in-page `details` content, not overlays.

## Design pass (Matthew's review, with the impeccable skill's layout and craft-floor checks)

Matthew flagged the homepage's reading photograph: it ran the full width of the page, sat flush on the portrait below it, and the heading touched its paragraph. Two things were wrong, and the second turned out to be site-wide.

1. **Composition.** A full-width photograph turned a moment of teaching into a banner. The photograph now sits in the left half at 4:3, beside "Mental models, not scripts." and its paragraph. On phones it leads the section at full width. The separate headshot is dropped from this section: Matthew is in the photograph, and the about page carries the portrait.
2. **Cancelled spacing.** `field-guide.css` reset margins with `.fg h1, .fg p, .fg figure` and the rest at (0,1,1), which outranks any single-class rule such as `.trust__para { margin-top: 20px }` (0,1,0). Every component's own spacing was silently zeroed. On the homepage that was the hero headline's top margin (72px at 1440), the lead and the "Something hard right now?" line, the classes intro and terms, the tools evidence note, and the age and Lens footnotes. The reset now sits at `:where()` weight, so the spacing the homepage's designer wrote applies. A computed-style diff confirms the only changes are those margins. The Lens page shows no margin change.

Found in the same inspection round (desktop and phone captured together) and fixed in one batch:

- On phones, the homepage's tools photograph rendered at full width before the tool list (an older `.tools__photo` rule in `field-guide.css` shares the name). The list now comes first and the photograph follows, as on the tools hub.
- About: the five principles sat in a two-column grid with the fifth alone beside a hole. They are now rows, the name left and its line right.
- The close bands on tools and about floated their buttons far right, away from the statement they answer. Statement and action now sit together on the left.
- Hub leads ran the full width on pricing, about 110 characters a line, because the page-level `p { max-width: none }` outranked `.hb-lead`. Leads keep a 52ch measure.

The skill's mechanical layout scan (`impeccable detect --scope layout`) reported nothing on any of these files before or after; every finding above came from the screenshots.
