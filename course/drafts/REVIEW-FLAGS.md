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

## Queue B: citation verification

A verification pass ran on 2026-07-19 against primary sources (journal pages,
PubMed, publisher and health-body pages). Results below, split into what is now
closed and what still needs human eyes.

### B1. VERIFIED and closed (no further action)

| Source | Outcome |
| --- | --- |
| **Gradisar et al. (2016), Pediatrics 137(6):e20151486** | Every claim held. N = 43, aged 6 to 16 months, three arms (14/15/14), salivary cortisol and Strange Situation at 12 months, all nulls. Full citation now in Module 5. Caveat added: with ~14 per arm this is undetected harm, not demonstrated safety. |
| **WHO Multicentre Growth Reference Study Group (2006), Acta Paediatrica 95(Suppl 450):86-95** | Held, and improved. All six windows now given with exact percentile bounds. The non-crawler figure is exact: 35 of 816 children (4.3%) never crawled on hands and knees. Note the draft named Brazil as a motor-data site; Brazil contributed no motor data, so the country list was corrected. |
| **Price et al. (2012), Pediatrics 130(4):643-651** | Held. 326 children, 225 at follow-up, null on behavior, sleep, relationship quality, cortisol, and parent mood. Full citation added. |
| **Lucca et al. (2025), Developmental Science 28(1):e13581** | Held. ManyBabies4, 1,018 infants, 567 included, 37 labs. Both conditions at chance. Full citation now in Modules 4 and 6. |

### B2. CORRECTED in the drafts (verify the fix, not the original)

| Item | What was wrong | What it now says |
| --- | --- | --- |
| **Wolke et al. (2017), J Pediatr 185:55-61.e4** | Two errors. Figures were wrong (draft said 110 to 118 min at 1 to 2 weeks; actual is 117.3), and the measure was unlabelled (it is fussing **and** crying combined, so the number reads as roughly double what a parent calls crying). | Correct per-timepoint means, explicitly labelled fuss-plus-cry, with the pooled sample (8,690 infants). |
| **The six-week crying peak** | **The most serious finding of this pass.** Module 2 asserted Barr's peak-at-six-weeks curve as established and cited Wolke et al. for the numbers, but Wolke et al. explicitly report *no statistical evidence for a universal peak*. The citation was cutting against the claim attached to it. | Lesson 2.3 rewritten: the decline by three months is the solid finding, the peak is presented as the popular framing that the data does not support. Barr reclassified `[contested]` as to the peak. |
| **Kagan "15 to 20 percent high-reactive"** | Not a figure Kagan reported as a population rate. Across the three Fox et al. (2015) cohorts it ran 20%, 14%, 12%, ~11%. It is a threshold on a continuous distribution, so the proportion is partly an artifact of the cut. | "Between about one in ten and one in five depending on the cohort and where the threshold was drawn." Kagan & Snidman (1991) and Fox et al. (2015) now cited. |
| **Perinatal depression prevalence** | "One in seven to one in eight" had no citation and conflated two different denominators: one in seven is *perinatal* (pregnancy plus first year), one in eight is *postpartum symptoms* specifically. | Narrowed to the postpartum frame with the CDC PRAMS figure (13.2%, 31 sites) and cited to Bauman et al. (2020), MMWR 69(19):575-581. |
| **Du Toit et al. (2015), NEJM 372(9):803-813 (LEAP)** | The study is real and the draft's use of it was too broad. LEAP tested **peanut only** and enrolled **high-risk infants only** (severe eczema, egg allergy, or both). The draft implied a general early-allergen-introduction result. | Lesson 5.5 rewritten to state the actual trial, the actual numbers, and both scope limits explicitly, including that egg trials have produced mixed results. |
| **Hiscock & Wake maternal benefit** | Draft implied the maternal depression benefit persisted. It did not: it was present at the 2-year follow-up and gone by child age 6. | Stated with its expiry date. |
| **Meltzoff & Moore neonatal imitation** | Was on the hard-ban list as a clean failed replication. It is not. Oostenbroek et al. (2016) found no evidence, but a re-analysis dispute followed, and Davis et al. (2021) found a pooled d = 0.68 across 336 effect sizes with heterogeneity tracking *researcher affiliation*. | Reclassified `contested`. Module 1 now carries a passage that refuses the confident version without asserting the opposite. **If a registry entry is added to `corpus/citations.json`, it must be `contested`, not `failed-replication`.** |

### B3. STILL UNVERIFIED, needs human eyes

**Volume and page numbers given from memory, not yet spot-checked:**

- Goldstein, King and West (2003), PNAS 100:8030-8035.
- Kirk et al. (2013), Child Development 84:574-590.
- DeLoache et al. (2010), Psychological Science 21:1570-1574.
- ManyBabies Consortium (2020), AMPPS 3:24-52.
- Sperry, Sperry and Miller (2019), Child Development 90:1303-1318.
- Tronick et al. (1978) volume and pages, given as journal only.
- Mesman, van IJzendoorn and Bakermans-Kranenburg (2009) article title.

**Numbers still stated approximately:**

- Night-waking prevalence at 6 to 12 months, "a quarter to a third."
- Newborn focal distance "eight to twelve inches", widely repeated, primary
  source not identified. Framed as a rough description, not a measurement.
- BEIP placement-age effects, hedged rather than given a crisp cutoff because
  the threshold differs by outcome domain.

**Cited by author and topic only, needs a specific reference or removal:**

- Tronick and Gianino, mismatch and repair.
- Adolph and Robinson; Thelen.
- Diamond (A-not-B), Baillargeon, Murray and Cooper.
- NICHD Early Child Care Research Network, cited as a research program rather
  than a specific paper. Pin to one paper before publication.

**Worth considering:**

- A companion commentary to the ManyBabies4 replication, *The Study of Early
  Social Evaluation: Contextualizing Failures to Replicate and Looking Forward*
  (Open Mind), exists if the course wants to represent the live debate rather
  than only the null.
- ACOG Committee Opinion No. 757 (2018) was replaced in June 2023 by Clinical
  Practice Guideline No. 4. Do not let 757 appear anywhere as current guidance.

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
