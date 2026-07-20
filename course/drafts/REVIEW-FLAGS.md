# Review flags: everything a human needs to scrutinize

Generated 2026-07-19 for branch `course/first-year-2026-07-19`.

Two separate queues below. **Queue A** is contested evidence: places where the
draft makes a claim the literature does not settle. **Queue B** is citation
verification: references the drafters were not fully confident about. Both must
clear before publication.

Find every inline flag in the drafts with:

```bash
grep -n "REVIEW FLAG" course/drafts/module-*.md
```

## Queue A: contested evidence (23 inline flags)

### Module 1, what is being built (3)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 81 | Responsiveness predicts language milestones | Correlational. Responsive caregivers differ from others in resources, time, and circumstance. |
| 115 | Bucharest Early Intervention Project applied to ordinary parenting | The central overclaim of the whole early-brain literature. BEIP studied severe institutional deprivation, which is different in kind from normal-range variation. |
| 123 | ACEs scores | Population-level association, poor individual-level prediction. |

### Module 2, reading your baby (4)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 118 | Ainsworth and Bell, prompt response reduces later crying | Directly challenged, re-analyses argue the effect is weaker or absent, and the design is correlational. |
| 132 | Probiotics for colic | Deliberately left out of the soothing repertoire. Trial results genuinely mixed. Confirm the omission is the editorial choice you want. |
| 178 | Temperament stability, including Kagan | Modest, and routinely overstated in popular writing. |
| 190 | Differential susceptibility | Contested framework. Candidate-gene versions have serious replication problems. |

### Module 3, the language-ready baby (4)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 48 | DeCasper and Fifer (1980) | Small-N classic. Sample size hedged to "roughly ten newborns" rather than asserted. |
| 103 | Bilingual executive-function advantage | Contested (Lehtonen et al. 2018). Bilingual exposure being safe and normal is separately well supported and stays. |
| 351 | Weisleder and Fernald (2013) | Correlational. Cannot license a causal instruction to parents. |
| 405 | Screen time and language | Observational, small effects, confounded. |

### Module 4, connection and security (6)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 87 | Attachment classification stability infancy to adulthood | Much weaker than commonly claimed. |
| 109 | Strange Situation cross-culturally | Applicability actively debated. |
| 134 | Disorganized attachment | Routinely over-interpreted in popular content. Draft routes worry to a clinician and states parents cannot assess this at home. Verify that framing is strong enough. |
| 210 | The "about 30% of interactions are coordinated" figure | Rests on a small observational corpus. |
| 344 | NICHD childcare and attachment | Correlational, and subject to reanalysis dispute. |
| 405 | Sensitivity predicts attachment security | Effect size is modest (roughly r = .24). The modesty is the point and must survive editing. |

### Module 5, bodies in motion (5)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 49 | Tummy time | Evidence base largely observational, dose recommendations are consensus rather than trial-derived. |
| 59 | Container-use limits | Consensus guidance, no trial establishes a threshold. |
| 73 | "Travel broadens the mind", locomotion drives cognition | Design limits, largely correlational. |
| 111 | Gradisar et al. (2016) sleep-training reassurance | Small trial (roughly 43 families across three arms). Long-term outcome data is thin in both directions. |
| 129 | Breastfeeding and cognitive outcomes | Contested. PROBIT versus sibling-comparison studies disagree. Must stay contested in the final text. |

### Module 6, everyday life (6)

| Line | Claim | Why flagged |
| --- | --- | --- |
| 23 | Violation-of-expectation infant cognition | Active replication dispute. Looking-time phenomena are real; the rich interpretation is not settled. |
| 55 | Joint attention as highly predictive | Derives substantially from autism-risk research samples. Must not become a home screening tool. |
| 89 | Positive/tolerable/toxic stress categories | Conceptual model, not empirically thresholded. |
| 93 | ACEs as individual-level prediction | Deliberately strongly worded refusal. Confirm the strength is right. |
| 115 | Madigan et al. (2019) screen time | Correlational, small effects, heavily confounded. Cannot support a causal warning. |
| 147 | Maternal depression and child outcomes | Correlational. Must not be written in a way that adds guilt to a depressed parent. |

## Queue B: citations to verify before publication

The drafters were instructed never to invent a reference, and to drop to
authors-and-year when unsure rather than fabricate volume and page numbers.
They complied, and reported the following as needing a human check against the
actual sources.

**Numbers stated from memory, verify or soften:**

- Wolke, Bilgin and Samara (2017) per-timepoint cry durations (roughly 110 to
  118 minutes/day at 1 to 2 weeks, roughly 70 minutes at 12 weeks).
- Kagan's "15 to 20 percent high-reactive" figure, approximate across samples
  rather than a single reported number.
- Gradisar et al. (2016) sample described as "roughly forty-three families."
- Night-waking prevalence at 6 to 12 months described as "a quarter to a third."
- Perinatal depression prevalence written as "roughly one in seven to one in
  eight" with no citation attached. Source it or soften it.
- Newborn focal distance "eight to twelve inches", widely repeated, primary
  source not identified. Framed as a rough description, not a measurement.
- BEIP placement-age effects, hedged rather than given a crisp cutoff because
  the threshold differs by outcome domain.

**Volume and page numbers given from memory, spot-check:**

- Goldstein, King and West (2003), PNAS 100:8030-8035.
- Kirk et al. (2013), Child Development 84:574-590.
- DeLoache et al. (2010), Psychological Science 21:1570-1574.
- ManyBabies Consortium (2020), AMPPS 3:24-52.
- Sperry, Sperry and Miller (2019), Child Development 90:1303-1318.
- Tronick et al. (1978) volume and pages, given as journal only.
- Mesman, van IJzendoorn and Bakermans-Kranenburg (2009) article title.

**Cited by author and topic only, needs a specific reference or removal:**

- Tronick and Gianino, mismatch and repair.
- Adolph and Robinson; Thelen.
- Diamond (A-not-B), Baillargeon, Barr, Murray and Cooper.
- NICHD Early Child Care Research Network, cited as a research program rather
  than a specific paper. Pin to one paper before publication.

**Added by a drafter outside the supplied citation spine, verify or cut:**

- Price et al. (2012), Pediatrics, five-year follow-up of the Hiscock and Wake
  cohort.
- Du Toit et al. (2015), NEJM (LEAP trial), supporting early allergen
  introduction.
- Lucca et al. (2025) ManyBabies helper/hinderer replication was supplied from
  the repo's own registry and was not independently re-verified here.

## Queue C: clinical and legal read

Modules 2, 5, and 6 carry safety content that should get a qualified review on
the same principle as the `keel/` attorney-review gate:

- Module 2, Lesson 2.3: abusive head trauma prevention, the put-the-baby-down
  instruction, and the "call a clinician" cry description.
- Module 5, Lesson 5.2 and 5.4: AAP safe sleep, stated deliberately without
  hedging, plus feeding and solids guidance.
- Module 6, Lesson 6.5: perinatal mood and anxiety disorders, intrusive
  thoughts, and 988 crisis routing.

Verify the guidance matches current AAP and CDC recommendations as of the
publication date rather than as of this draft.

## Editorial notes from the drafting pass

- Module 5, Lesson 5.4 runs 1,750 words, over the 1,600 ceiling, because it
  carries sleep and feeding plus the restated safe-sleep block. Consider
  splitting it.
- Meltzoff and Moore neonatal imitation is on the banned list and appears
  nowhere in the drafts, not even as a refusal. If the correction is wanted for
  parents who have heard the claim, it needs adding to Module 1.
