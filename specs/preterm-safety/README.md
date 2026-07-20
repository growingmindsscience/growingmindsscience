# Preterm corrected-age safety amendment

> **STATUS: DRAFTS FOR REVIEW. NOT APPROVED. NO CODE CHANGED, NO BUILD RUN.**
>
> Branch `specs/preterm-safety-2026-07-19`, branched from
> `specs/product-batch-2026-07-19` so the documents it amends are present. Not
> merged.

Closes, on paper, the coverage gap found during Job 5: corrected-age logic sits
outside the safety grader that certifies the two developmental-concern tools.

---

## The finding in one paragraph

The safety keel's governing rule is that tools may flag earlier or harder than a
floor, never later or softer. **Corrected age is the one exception, and the only
mechanism in the keel that can move a result downward in severity.** That is
correct and clinically necessary: a baby born ten weeks early should be compared
against a younger baby. But it is ungraded. Enumerated across the shipped
artifacts, corrected age suppresses a floor in **8,826 cases** out of 66,768
preterm cases, across **15 floors** and **7 of 8 domains**. The certification
suite exercises **none** of them. Total preterm coverage across the whole keel
today is **two hand-written LMC spot checks**, out of 372,689 certified cases.

Nothing found here is a known wrong answer. The behavior appears correct. The
problem is that its correctness is currently **unfalsifiable**: a future edit to
the correction constant, the trigger, the cutoff, the rounding, or any floor
under 24 months would ship with a fully green certification and zero coverage of
the affected population. That population is preterm infants, who carry elevated
baseline developmental risk. **The group most likely to need an early referral
is the group whose routing the suite does not test.**

## The documents

| File | Covers |
|---|---|
| [`01-corrected-age-amendment.md`](01-corrected-age-amendment.md) | How corrected age enters the graded surface. The rounding ruling and its evidence. The four safety invariants. Scope across all three engines |
| [`02-grader-integration-design.md`](02-grader-integration-design.md) | What the grader must enumerate. Full test-case tables A through E, the four planted-violation fixtures, the non-integer tripwire, the PR sequence |
| [`03-display-convergence.md`](03-display-convergence.md) | The 276 divergent preterm pairs and what a family is shown |

## The three rulings

1. **Convention: floored**, in all three engines. Verified safety-neutral by
   enumeration (0 classification differences across 179,204 cases), not argued.
   The equivalence rests on all 112 age thresholds being integers, which is
   currently true and is why the tripwire exists.

2. **Corrected age becomes a graded input.** The grader enumerates `weeksEarly`
   alongside age and routes through `resolve()` rather than `classify()`, which
   is what puts the corrected-age computation inside the graded surface at all.
   Seven sampled `weeksEarly` values chosen to hit every boundary.

3. **Display is separated from computation.** Flooring is right for comparison
   and wrong for copy: at 3 months born 9 weeks early it renders "0 months." The
   engine floors, the screen renders through its own rules, and the display
   value is a string that can never enter a comparison.

## The single most important test

`nav_preterm_skill_loss_suppressed` (`02` Table E). It encodes the exact failure
this amendment exists to prevent: **a preterm baby who has lost skills being
routed more softly than a term baby who has lost skills.** Skill loss at any age
is the strongest signal in the entire product and the one floor that must never
soften for anyone.

Verified today: it does not soften. `skill_loss_any_domain` has
`applies_age_months_gte: 0` and corrected age clamps at 0, so it is structurally
non-suppressible. The fixture exists to keep that true.

## Corrections to the Job 5 report

Two, both from re-deriving the numbers rather than carrying them forward.

1. **"2,208 divergent `(age, weeksEarly)` pairs" was imprecise.** There are
   **276** distinct pairs; 2,208 counts them once per domain. The display work
   is a factor of eight smaller than reported.

2. **The gap was reported as Navigator-only. It is not.** The LMC shares the
   same corrected-age function, the same policy object, and the same fractional
   convention, with two spot checks of coverage. The amendment covers all three
   engines.

## Scope discipline

Per the dispatch: **prose and test-case tables only.** No engine change, no
grader change, no build, no migration, no API calls. Every number was produced
by read-only enumeration against the shipped artifacts; `01` §6 states how to
reproduce each one.

The working tree contains no modification to `keel/`, `nsc/`, or any runtime
file. The only change on this branch is the addition of this directory.

## A note on method

The first run of the suppression analysis reported **0 suppression events**. It
was wrong: the script read the floors artifact with the wrong key shape,
resolved an empty floor list, and reported a confident zero. That is the same
failure mode as the grader gap being investigated, reproduced by the
investigation itself.

It is written into the design as a hard requirement rather than a lesson:
`02` §2.4 specifies that the enumeration must **fail loudly** when it resolves
zero floors, zero preterm cases, or zero suppressions. A safety grader that
silently measures nothing is indistinguishable from one that passes.
