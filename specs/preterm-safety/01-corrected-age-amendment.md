# Amendment 1: How corrected age enters the graded surface

> **STATUS: DRAFT FOR REVIEW. NOT APPROVED. NO CODE CHANGED.**
>
> This is a paper amendment to `specs/drafts/03-worried-navigator.md` §1.2 and
> §7.4.1, and to the safety keel's governing semantics in
> `keel/artifacts/navigator/floors.v1.json` and
> `keel/artifacts/lmc/floors.v1.json`.
>
> Prose and test tables only. No engine change, no build, no migration.
> Every number below was produced by read-only enumeration against the shipped
> artifacts on 2026-07-19; §6 states exactly how to reproduce each one.

**Amends:** `specs/drafts/03-worried-navigator.md` §1.2, §7.4.1
**Depends on:** `specs/drafts/00-CONVENTIONS.md` §6 (the safety keel)
**Companion documents:** `02-grader-integration-design.md` (what the grader must
enumerate), `03-display-convergence.md` (the divergent preterm pairs)

---

## 1. The finding, stated plainly

The safety keel has one governing rule, written into both floors artifacts:

> Tools may flag earlier or harder than a floor. Never later, never softer.

**Corrected age is the single exception to that rule, and it is the only
mechanism in the entire keel that can move a result downward in severity.**

This is not a bug. It is the clinical point of corrected age: a baby born ten
weeks early should be compared against the development of a younger baby,
because that is what the milestone literature supports. The mechanism is
correct, intended, and clinically necessary.

The problem is narrower and worse: **it is almost entirely ungraded.**

Corrected age reduces the age used for every threshold comparison. Floors key on
`applies_age_months_gte`. A reduced age therefore moves cases *out* of floor
windows. Enumerated across the shipped Navigator artifacts:

| Measure | Count |
|---|---|
| Preterm cases enumerated (8 domains x age 0-40 x weeksEarly 4-16 x every path) | 66,768 |
| **Floor-suppression events**, meaning a floor that applies at chronological age does not apply at corrected age | **8,826** |
| Distinct floors suppressed in at least one case | 15 |
| Domains affected | 7 of 8 |
| Of those 8,826 suppressions exercised by `keel/graders/floors.mjs` today | **0** |

Every one of those 8,826 suppressions is a case where the tool tells a preterm
family something softer than it tells a term family with identical observations.
That is the correct behavior. **Nothing currently proves it is the correct
amount of softer, applied to the right children, and never applied to the floors
that must never soften.**

### 1.1 Why the existing grader cannot see this

`correctedAge` is called only inside `resolve()` in `keel/lib/navigator.mjs`.
The floors grader calls `classify()` and `askedQuestions()` directly and passes
no `weeksEarly` argument at all. Its enumeration signature is
`(domain, age, answers)`. There is no code path by which the Navigator grader
can observe corrected age.

The LMC side is better but still thin. `keel/graders/floors.mjs` runs its main
LMC case grid with `weeks_early: 0` hard-coded on every snapshot, then performs
exactly **two** hand-written preterm spot checks: chronological 18m born 8 weeks
early must still reach `no_words_16m`, and 18m born 12 weeks early must not.
Two cases, both in one floor, both in one domain.

**Total preterm coverage across the whole safety keel today: two hand-written
cases, out of a certification suite of 372,689.**

### 1.2 What a reviewer should take from this

The severity of this finding does not come from a known wrong answer. As far as
this analysis can tell, the current behavior is correct. It comes from the fact
that **correctness here is currently unfalsifiable**. A future edit to the
`4.345` constant, the 3-week trigger, the 24-month cutoff, the rounding
convention, or any floor threshold under 24 months would ship with a fully green
372,689-case certification and no coverage whatsoever of the population it
affects.

The population it affects is preterm infants, who are precisely the population
with elevated baseline developmental risk. **The one group most likely to need
an early referral is the one group whose routing logic the certification suite
does not test.**

---

## 2. The convention: floored, and why

### 2.1 The two conventions in the codebase

| Implementation | Expression | Result at 17m born 6 weeks early |
|---|---|---|
| `keel/lib/navigator.mjs`, `keel/lib/lmc.mjs` | `Math.max(0, ageMonths - w / 4.345)` | 15.619 months |
| `nsc/lib/navigator.ts` | `Math.max(0, Math.floor(chronologicalMonths - weeksEarly / 4.345))` | 15 months |

Both use the same policy object, `{ weeks_early_gt: 3, applies_under_months: 24 }`,
declared identically in `keel/artifacts/navigator/trees.v1.json` and
`keel/artifacts/lmc/interpretation.v1.json`.

### 2.2 The ruling

**Floored wins. Adopt `Math.floor` in all three engines.**

The justification is measurement, not preference. Enumerated across every
domain, every integer age 0 to 40, every `weeksEarly` 0 to 16, and every answer
path (179,204 cases, `specs/drafts/verify-rounding.mjs`):

| Measure | Result |
|---|---|
| Classification differences between the two conventions | **0** |
| Asked-question-set differences | **0** |
| `(domain, age, weeksEarly)` triples where the displayed number differs | 2,208 |
| **Distinct `(age, weeksEarly)` pairs** where the displayed number differs | **276** |

**Correction to the Job 5 report.** That report described "2,208
`(age, weeksEarly)` pairs." That was imprecise. There are **276** distinct
`(age, weeksEarly)` pairs; the figure 2,208 counts them once per domain
(276 x 8 = 2,208). The display-convergence work in `03-display-convergence.md`
is scoped to the 276, not the 2,208.

### 2.3 Why the equivalence holds, and the condition it rests on

For an integer threshold `N`, `Math.floor(x) >= N` exactly when `x >= N`. Every
age comparison in both tools is against an integer. Verified by scan:

| Artifact | Age thresholds | Non-integer |
|---|---|---|
| `keel/artifacts/navigator/floors.v1.json` | 31 (with trees) | 0 |
| `keel/artifacts/navigator/trees.v1.json` | 46 (with floors) | 0 |
| `keel/artifacts/lmc/floors.v1.json` | 8 | 0 |
| `keel/artifacts/lmc/interpretation.v1.json` | 27 | 0 |
| `keel/artifacts/lmc/instrument.v1.json` | 0 | 0 |
| **Total** | **112** | **0** |

**This equivalence is contingent, not permanent.** It holds only while every
threshold is an integer. A single fractional threshold, for example a floor at
`18.5` months, breaks it silently and the two conventions begin to disagree on
real classifications. `02-grader-integration-design.md` §5 specifies the
tripwire that makes that failure loud.

### 2.4 Named tradeoff (decided): floored over fractional

**Fractional is more numerically faithful.** A baby 17 months old born 6 weeks
early really is 15.619 months corrected, and flooring discards real information.

**Floored wins anyway**, on three grounds:

1. **It is provably safety-neutral today** (§2.2), so the choice costs nothing
   in routing accuracy.
2. **One convention beats two.** The current split means two implementations of
   the same product can show a parent two different numbers. A tool whose entire
   claim is that any door gives the same answer cannot ship two answers.
3. **It matches clinical speech.** A pediatrician says "we're calling her eleven
   months." No clinician says 10.8 months, and a parent reading "10.8 months
   corrected" on an anxious night is being handed false precision about a
   number that is itself an approximation.

**The rejected alternative, and why.** Rounding to nearest was considered and
rejected. It is not safety-neutral: rounding *up* moves a child into a floor
window they are not in under either current convention, which flags earlier.
Flagging earlier is permitted by the keel doctrine, so this is not unsafe, but
it changes behavior in a way neither implementation does today, and it would
need its own enumeration before adoption. Flooring changes nothing measured.
Prefer the change that requires no new evidence.

---

## 3. Amendment: corrected age becomes a first-class graded input

### 3.1 The rule being added

The floors semantics in both artifacts currently say floors apply at
"corrected age where applicable" and stop there. That phrase is the entire
current specification of corrected age in the graded surface, and it is why the
grader was able to omit it without failing anything.

**Proposed replacement text, for both floors artifacts' `semantics` field:**

> Floors apply at corrected age where the corrected-age policy applies. Corrected
> age is a graded input, not a display concern: the grader must enumerate
> `weeksEarly` alongside age, and every floor must be exercised both in its
> suppressed and unsuppressed state wherever suppression is reachable. Corrected
> age may lower the age used for comparison. It may never lower a result below a
> floor that still applies at the corrected age, and it may never apply to a
> floor whose `applies_age_months_gte` is 0.

### 3.2 The four invariants

These are the safety properties the grader must prove. Each is stated so that
its violation is mechanically detectable.

**I1. Global floors are never suppressible.**
Any floor with `applies_age_months_gte: 0` must be unreachable by suppression,
because corrected age is clamped at 0 and cannot go below it. **Verified today:**
`skill_loss_any_domain`, `parent_gut_concern_never_dismissed`,
`hearing_concern_any_age`, `no_sound_response_any_age`, `asymmetry_any_age`,
`early_hand_preference_12m`, `skill_loss_behavior`, and `repeated_self_injury`
are all confirmed not suppressible. This is the single most important invariant
in the amendment: **a preterm baby who has lost skills must never be routed more
softly than a term baby who has lost skills.**

**I2. Suppression is bounded by the maximum correction.**
The largest correction expressible is 16 weeks, which is 3.68 months. No floor
may be suppressed at a chronological age of `N + 4` months or beyond, where `N`
is its threshold. **Verified today:** every suppressible floor's window is
exactly `[N, N+3]`.

**I3. Corrected age never applies at or above 24 months.**
Every floor with `applies_age_months_gte >= 24` must be non-suppressible at any
`weeksEarly`. **Verified today:** `no_two_word_phrases_24m`,
`no_one_step_directions_24m`, `no_pretend_play_30m`, and
`stranger_intelligibility_36m` are all confirmed not suppressible.

**I4. Correction is monotone and never inverts.**
Increasing `weeksEarly` must never *raise* a severity class, and decreasing it
must never *lower* one. A child reported as more premature can only ever be
treated as younger.

### 3.3 What is deliberately not changed

- **The clinical policy.** The 3-week trigger, the 24-month cutoff, and the
  4.345 constant stay as they are. This amendment grades the existing policy; it
  does not revise it. Any change to those three values is a clinical decision
  requiring its own sourcing pass, and §5 records it as an open question.
- **The suppression behavior itself.** All 8,826 suppressions remain. They are
  correct. The amendment makes them visible to CI, not fewer.
- **Any artifact content.** No floor is added, removed, or retimed here.

---

## 4. Scope: this is not Navigator-only

The Job 5 finding was framed as a Navigator gap. Investigation for this
amendment found the LMC shares the same corrected-age function, the same policy
object, the same fractional convention, and nearly the same coverage hole.

| Tool | Corrected-age fn | Convention | Preterm cases in CI | Status |
|---|---|---|---|---|
| Navigator (`keel/lib/navigator.mjs`) | `correctedAge` | fractional | **0** | Ungraded |
| LMC (`keel/lib/lmc.mjs`) | `correctedAge` | fractional | **2** | Two spot checks, one floor |
| Navigator (`nsc/lib/navigator.ts`) | `correctedAgeMonths` | **floored** | 0 | Ungraded, and diverges from keel |

Three implementations of one clinical policy, two conventions, and effectively
no coverage. **The amendment applies to all three.** `02-grader-integration-design.md`
specifies the enumeration for both tools.

The LMC case additionally carries a wrinkle the Navigator does not: its two
existing spot checks include a **negative** assertion, that 18m born 12 weeks
early must *not* fire `no_words_16m`. That is the only place in the keel that
asserts a floor should stay silent. It is the correct shape of test for a
suppression mechanism, and §2 of the companion document generalizes it.

---

## 5. Open questions for Matthew

These are clinical or product decisions this amendment deliberately does not
make.

1. **Is 16 weeks the right enumeration ceiling?** The tests propose `weeksEarly`
   0 to 16. Extreme prematurity extends further, and 24 weeks gestation implies
   roughly 16 weeks early against a 40-week term. A ceiling of 20 would cover
   the tail with a proportional increase in case count. **Recommendation: raise
   to 20.** The cost is small and the population is exactly the high-risk one.
2. **Should corrected age extend past 24 months for the most preterm infants?**
   Some clinical guidance carries correction to 24 months, some to 36 for
   extremely preterm infants. The current 24-month cutoff is defensible and is
   what both artifacts declare. Flagged because it is a clinical judgment
   sitting in a config value, not because it is wrong.
3. **Should the corrected-age note be a graded copy requirement?**
   `keel/artifacts/navigator/floors.v1.json` line 65 already says the tree "must
   surface the corrected-age note on this path" for `not_walking_18m`. That is
   an artifact-level obligation with **no grader check behind it today**.
   `02-grader-integration-design.md` §4 proposes making it one.
4. **Does the D3 attorney packet need to say anything about preterm handling?**
   Not a question this document can answer, and it interacts with the separate
   disclosure item already open.

---

## 6. Reproducing every number in this document

All read-only. No network, no API calls, no writes.

| Claim | How to reproduce |
|---|---|
| 0 classification differences, 276 distinct divergent pairs | `node specs/drafts/verify-rounding.mjs` (on branch `specs/product-batch-2026-07-19`) |
| 372,689 baseline cases, 10 planted violations fail | `node keel/graders/selftest.mjs` |
| 8,826 suppressions, 66,768 preterm cases, per-floor and per-domain breakdown | Enumeration described in `02-grader-integration-design.md` §2.1; the grader change specified there makes it a permanent CI artifact rather than a one-off measurement |
| 112 age thresholds, 0 non-integer | Scan of the five artifacts listed in §2.3 |
| Per-floor suppression windows | `02-grader-integration-design.md` §3, Table B |

**A caution learned during this analysis.** The first run of the suppression
enumeration reported **0 suppression events**. That number was wrong: the script
had read the floors artifact with the wrong key shape, resolved an empty floor
list, and confidently reported zero. It was the same failure mode as the grader
gap this amendment exists to fix, reproduced by the analysis written to
investigate it. The corrected run reports 8,826.

The lesson is written into the design as a hard requirement:
`02-grader-integration-design.md` §2.4 specifies that **the enumeration must
fail loudly when it resolves zero floors or zero preterm cases**, because a
safety grader that silently measures nothing is indistinguishable from one that
passes.
