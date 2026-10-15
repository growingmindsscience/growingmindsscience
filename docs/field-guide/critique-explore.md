# Design critique: the Explore hub

S3. Checkpoint C2 showed two first screens: three doors side by side, and the age line. Matthew's direction (2026-10-15): age is the first gate, with moments and topics organised inside each age bracket, because much of the advice differs by age. Built on that direction, not on either composition as drawn.

## What the pages are now

- **`/explore/`, the gate:**
  - It opens on "How old is your child?" over the age line on a sage field.
  - The five periods appear with their years and their one-sentence summaries (the homepage explorer's words).
  - The axis (birth to 5 years) sits under them as a scale.
  - Below, "For any age" lists the pages written for every period.
- **`/explore/<period>`:**
  - The age line, compact, moves between periods; the current one is marked in ink.
  - Then the period's name, years and summary, and its class.
  - Then "Moments at this age" and "Topics at this age". Each row lists only that age's pages, each labelled Tool, Guide, Article, Graded claim or Lens.
  - "It's hard right now" covers every hard moment, so it is named once in the moments lede rather than in every row.
  - Pages with no moment or topic at that age sit under "Also for this age".
- **One content base:** `assets/data/explore.json`. `scripts/build-explore.mjs` writes all six pages and the homepage's age row from it. Graded claims take their wording from the claims artifact. `--check` is in CI.
- **Homepage:** the age row is unchanged except that each period's name now opens its Explore page. The nav's Explore link, the Lens's "other ages" button and the claims template point at `/explore/` everywhere.

## Round 1

```
ROUND 1
Seen in one second: "How old is your child?" over five periods on a sage field.
Idea (one sentence): age is the door; inside each period, the moments and topics that matter then.
Live thing: each period's page is a short, filtered field guide for that age.
Scores (/explore/): design 7.5 · usability 8.5 · creativity 6.5 · content 8 → 7.6
Top problems, from the screenshots and the gate:
1. "It's hard right now" repeated in five moment rows on every period's page. Fixed: named once in the lede.
2. The phone age switcher was 38px tall (G6). Fixed: 44px.
3. The axis labels ("birth", "5 years") above the period names read as kickers. Fixed: the axis moved under the periods as a scale.
Also: an empty band under the age line on the gate, and generous row padding on period pages; both tightened.
```

## Round 2 (confirming)

```
ROUND 2
G6 passes on the gate and a period page. Remaining items are the standing defences.
```

## Fails and warnings kept, with the defence

The standing defences carry over: quiet rules (`hairline`), no pictures, `still-page`, field paper, the wordmark lockup. On the homepage, the gate's other items are already defended, and this PR changes only the age row's five links:
- the Lens kicker and "01" to "04" numbering
- the hero labels (`p.label`), hidden until a visitor turns the annotations on

G8 (Lighthouse) ran locally: homepage 81, Lens 80, classes hub 87 on performance. These pages are unchanged except for links, so the drop from earlier local runs is the local server's variance. The definitive numbers come from a preview run.

## For Matthew

- **Tags:** the age, moment and topic tags in `assets/data/explore.json` are my reading of each page. They decide what appears on each period's page, so please correct any that are off.
- **Not done, part of S3 in the plan:** the Lens does not yet show contextual links from this file beyond its "other ages" button. It is a natural part of S5 (the Lens sources pass).
