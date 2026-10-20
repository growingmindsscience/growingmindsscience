# Design critique: the guides under /tools/

S4 batch (b). The nine guides rebuilt on the annotated-observation system with `guide.css`, on `fg-base.css`, `tools.css` (the decoder and the gms-tools controls) and the close band in `hubs.css`. `co-regulation-primer` is the model page; the others got the inspector, G6 and a screenshot pass of the components they do not share with it (the tabs in `limits-without-escalation`, the scenario builder and repair steps in `repair-after-the-hard-moment`, the pattern chooser and routine list in `routines-transitions-night-waking`). playwright-cli at 1440 and 390. Working files, not committed.

The six interactive tools (`right-now`, Communication Snapshot, activity library, reading prompt cards, Milestone Navigator, Growing Minds AI) carry their own app logic and are not in this batch.

## What the pages are now

- A title block: the guide's name in Newsreader, its lede, one meta line (Tools, then the old eyebrow's age and topic), its two jump actions, and "what this covers" on sage mist beside it.
- One column at a reading measure, sharing the title block's left edge. Section headings in Newsreader; panels on sage mist; the summary on soft white.
- Choices (decoder, pattern, scenario, stage, tabs) as calm outlined buttons, forest when chosen; the answer on a soft white panel with the "move" under a quiet rule and the gms-tools Save / Listen / Ask controls under it.
- Steps and principles as columns under an ink rule with Newsreader numerals; comparisons as two columns under forest and muted rules; repair steps and routines as numbered rows.
- Sources in the research-blue module, whichever markup the guide used.
- The CTA strip becomes the hubs' close band.

Every section's markup and every `gms-tools.js` and tab hook is kept; the decoder, tabs and pattern choices were clicked through and switch as before. Tag labels that sat above a heading ("Their system needs: ...", "One-minute summary") now sit below it as a subline; labels that stood alone ("What is happening") title their panel. The words are checked against the originals in order; the only words dropped are the hero card's "At a glance" label.

## Round 1

```
ROUND 1
Seen in one second: the guide's name beside the sage "what this covers" panel.
Idea (one sentence): a field reference: one column, choices that answer back, the science in panels.
Live thing: the state chooser answers in place, with Save, Listen and Ask under each answer.
Scores (co-regulation-primer): design 6.5 · usability 7.5 · creativity 6 · content 8 → 7.0
Caps applied: no pictures (no stock allowed).
Before the gate, from screenshots:
- The body class `guide` collided with the tools hub's `.guide` row (a two-column grid): the whole page split in two. Renamed `gpage`.
- The tag-moving step could reach across elements and lifted a decoder heading into the "What is happening" panel. The pattern is now bounded, and the build checks the reading order is unchanged.
- The body column was centered while the title block sat on the left edge. The column now shares the edge.
Top problems from the gate (most visible first):
1. Save / Listen / Ask controls 33px tall at 390 (tools.css). Fix: 44px on the guides.
2. Source links 20px tall where a guide used a bare .source-list. Fix: the same research module and 44px links.
3. Close statements of 12 to 15 words at four lines on phones. Fix: a step smaller with a wider measure.
```

## Round 2 (confirming)

```
ROUND 2
Scores (co-regulation-primer): design 7 · usability 8 · creativity 6 · content 8 → 7.3
Remaining: two close statements of 14 and 15 words wrap to three lines at 390. Kept: the words are the guides' own.
```

## Fails and warnings kept, with the defense

The standing defences in the earlier critiques carry over: quiet rules (`hairline`), field paper (`palette-cream`), the wordmark lockup, the size count, no footage, no pictures (`few-pictures`, `focal-point`: no stock; a type-led first screen), and `still-page` (the title and close rise; a reference page stays still). New here:

- `shadow` on `guide.css`: the choice buttons' outline is an inset box-shadow, the same technique as the quiet button (`hb-btn--quiet`), not a drop shadow.
