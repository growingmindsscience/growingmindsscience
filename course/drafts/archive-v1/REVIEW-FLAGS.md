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

### B3. RESOLVED 2026-07-19 by a second verification pass

A second research pass took the remaining queue to primary sources. Everything
that was open is now either verified, corrected in the drafts, or explicitly
closed with a reason. Nothing in this section is still waiting on a human.

**All seven page ranges were correct as drafted.** Verified against PubMed,
publisher pages, and Crossref: Goldstein, King & West (2003) PNAS 100(13),
8030-8035; Kirk et al. (2013) Child Development 84(2), 574-590; DeLoache et al.
(2010) Psychological Science 21(11), 1570-1574; ManyBabies Consortium (2020)
AMPPS 3(1), 24-52; Sperry, Sperry & Miller (2019) Child Development 90(4),
1303-1318; Tronick et al. (1978) JAACP 17(1), 1-13; Mesman et al. (2009)
Developmental Review 29(2), 120-162. Full locators and findings now sit in the
module citation lists.

**Three corrections were needed, and were applied:**

| Item | What was wrong | Now |
| --- | --- | --- |
| **Thelen** | The leg-weighting and water-submersion stepping experiments were attributed loosely to Thelen, and are routinely mis-cited to Thelen & Fisher (1982). They are in **Thelen, Fisher & Ridley-Johnson (1984)**, Infant Behavior and Development 7(4), 479-493. | Module 5 splits the 1982 premise from the 1984 three-study test. The citation entry carries an explicit "do not re-attribute this to 1982" warning, since this is a widely propagated error a future editor might "fix" back. |
| **NICHD 2001 follow-up** | Cited to the wrong journal. It is *Developmental Psychology* 37(6), 847-862, not Child Development. | Corrected, and both papers pinned. The 1997 primary is Child Development 68(5), 860-879, N = 1,153, Strange Situation at 15 months. |
| **Newborn focal distance** | "Eight to twelve inches" had no defensible source and the fixed-focus premise behind it (Haynes, White & Held, 1965) was superseded by Braddick et al. (1979) and by the large depth of focus that follows from low newborn acuity. | Removed from Module 1, its worksheet, Module 2, and Module 2's worksheet. The passage now runs on low acuity, low contrast sensitivity, and "close, and high contrast." The Module 1 activity was renamed from "The eight inch face" to "Close, and high contrast." |

**The three approximate figures are now pinned or rewritten:**

- **Night waking** is no longer a bare range. Module 5 now makes the definitional
  problem the content: on the same 75 infants, 15% had not met a
  midnight-to-5am or eight-consecutive-hours criterion at 12 months, while 28%
  had not met a 10pm-to-6am criterion, which the authors argue is the
  family-congruent one (Henderson et al., 2010, Pediatrics 126(5), e1081-e1087).
  Weinraub et al. (2012), Developmental Psychology 48(6), 1511-1528, N > 1,200,
  adds the two-class result: 66% "sleepers" waking about one night a week, 34%
  "transitional sleepers" waking roughly seven nights a week at 6 months.
- **Newborn focal distance:** cut, per the table above.
- **BEIP placement age** is now domain-specific rather than "roughly two years":
  24 months for IQ, attachment, and EEG; 15 months for expressive and receptive
  language; and **no timing effect at all** for psychiatric outcomes, where
  foster care reduced internalizing disorders regardless of placement age and did
  not affect externalizing disorders. The IQ advantage had narrowed to
  non-significance by age 8 (Fox et al., 2011, JCPP 52(9), 919-928). The passage
  explicitly refuses the "past two years is too late" reading.

**Author-only references are now pinned:**

- **NICHD** to the 1997 Child Development paper (primary) and the 2001
  Developmental Psychology follow-up, framed around the actual finding: childcare
  by itself did not predict insecurity, and risk appeared only where low maternal
  sensitivity coincided with poor-quality, extensive, or unstable care.
- **Tronick and Gianino** split three ways, because the popular "30%" is
  Tronick's own rounded summary rather than a printed result. The
  ">70% of interaction time mismatched" finding goes to Tronick & Cohn (1989),
  Child Development 60(1), 85-92 (54 dyads, first 2-minute normal episode, not
  still-face data, repair roughly every 3 to 5 seconds); the "about 30% or less"
  phrasing to Tronick (1989), American Psychologist 44(2), 112-119; the model to
  Gianino & Tronick (1988). Two traps are recorded in the citation entry: the 70%
  figure is often misattributed to a "1975 still-face study," and Tronick &
  Gianino (1986) separately reported that about a third of interactive errors are
  repaired in the very next step, which is a different statistic frequently
  conflated with the coordination figure.
- **Thelen** to the 1984 paper, the 1982 premise, and Thelen & Smith (1994).
- **Adolph and Robinson** to the 2015 Handbook chapter, with Adolph & Hoch (2019),
  Annual Review of Psychology 70, 141-164 preferred where checkable open-access
  wording matters, since the Wiley chapter is paywalled and its specific
  sub-claims could not be read.
- **Diamond** split: 1985, Child Development 56(4), 868-883 carries the
  memory/delay half (the delay needed to produce the error rose about 2 seconds
  per month, from under 2 seconds at 7.5 months to over 10 seconds at 12 months);
  1990, Annals of the NYAS 608, 637-669 carries the inhibitory-control and
  prefrontal claim. Both are cited because the module makes the combined claim.
- **Baillargeon** to Baillargeon, Spelke & Wasserman (1985), Cognition 20(3),
  191-208, with the review flag strengthened rather than the finding retracted:
  Rivera, Wakeley & Langer (1999) ran the drawbridge with no obstructing block at
  all and infants still looked longer at 180-degree rotations, and Bogartz et al.
  (2000) drew a Baillargeon reply in the same issue. The debate is live, not
  settled against her.
- **Murray and Cooper** to Murray, Fiori-Cowley, Hooper & Cooper (1996), Child
  Development 67(5), 2512-2526, with the mediation made explicit: the cognitive
  effect runs through interaction quality rather than depression itself,
  attachment and cognition run through different routes, and social adversity
  disrupts responsiveness much as depression does. The citation carries a "do not
  claim gender moderation" note, since that sub-claim could not be verified.

**Three editorial notes that came out of the verification:**

- **DeLoache sample size stays absent.** The publisher reports 96 families,
  secondary sources circulate 72, and the discrepancy was not resolvable without
  the full text. The course states no number, which is the right call.
- **ManyBabies lab count.** 67 labs is the paper's own abstract figure; the
  project site says 69 contributed data. The drafts use 67 and 2,329 infants and
  note the discrepancy. Module 3 also now teaches the survives-and-shrinks point:
  the replicated effect was d = 0.35 against d = 0.67 in the prior literature.
- **Sperry framing.** The refusal was already built on the measurement critique
  and within-SES variation rather than "the word gap was debunked," which is the
  defensible framing. A published rebuttal exists (Golinkoff et al., 2019,
  "Language Matters") and is now noted in the citation, since a public-facing
  refusal should expect it to be raised.

**Still genuinely open, and small:**

- The Adolph & Robinson (2015) chapter text could not be read (paywalled), so its
  specific sub-claims are attributed on the strength of Adolph citing it herself.
- Diamond (1990) has no abstract available; its argument is attributed on title
  and citation record rather than read text.
- Mesman et al. (2009) has a published erratum that was not retrieved. The module
  cites it only for the qualitative robustness claim, so present use is
  unaffected, but anyone quoting its effect sizes must read the erratum first.

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

Both original notes are now resolved.

- ~~Module 5, Lesson 5.4 runs 1,750 words, over the ceiling.~~ **Done.** Split
  into Lesson 5.4 (sleep) and Lesson 5.5 (feeding). Module 5 now has five
  lessons, and the course has 26 lessons total.
- ~~Meltzoff and Moore neonatal imitation appears nowhere, not even as a
  refusal.~~ **Done, and the classification changed in the process.** It is in
  Module 1 now, but as `contested` rather than as a banned failed replication.
  See the Queue B2 table.

Two notes added by the second pass:

- **Module 3's Kirk bullet now concedes a positive maternal effect** inside a
  section whose job is refusal. That is accurate (the trial found no infant
  language advantage but did find mothers became more responsive to nonverbal
  cues) but it is a slightly awkward shape for a "what this module is not
  saying" item. Worth a read for tone.
- **Module 4's NICHD passage changed meaning** when it was corrected, from a
  broad compounding-disadvantage framing to the narrower and more accurate
  interaction finding. The "Two honest limits" paragraph and the review flag
  below it both predate that rewrite and should be re-read against it.
