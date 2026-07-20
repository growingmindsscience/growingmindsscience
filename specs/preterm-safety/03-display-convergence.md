# Amendment 3: Display convergence for divergent preterm pairs

> **STATUS: DRAFT FOR REVIEW. NOT APPROVED. NO CODE CHANGED.**
>
> Prose and tables only. This document covers what a preterm family is *shown*.
> The safety routing is covered by `01-corrected-age-amendment.md` and
> `02-grader-integration-design.md`.

**Companion to:** `01-corrected-age-amendment.md` §2.2

---

## 1. Scope correction

The Job 5 report described "2,208 divergent `(age, weeksEarly)` pairs." That
figure was imprecise and is corrected here.

| Figure | Meaning |
|---|---|
| 2,208 | `(domain, age, weeksEarly)` **triples**, counting each pair once per domain |
| **276** | **Distinct `(age, weeksEarly)` pairs**, which is the real size of the problem |

276 x 8 domains = 2,208. Corrected age does not depend on domain, so the display
work is scoped to **276 pairs**, not 2,208. The larger number overstated the
surface by a factor of eight.

## 2. What actually diverges

Nothing about routing. `01` §2.2 establishes 0 classification differences and 0
question-set differences across 179,204 cases. **What diverges is the number
printed on the result screen**, in the sentence that tells a family which age
their child was compared against.

Enumerated across ages 0 to 40 and `weeksEarly` 0 to 16:

| Property | Value |
|---|---|
| Distinct divergent pairs | 276 |
| Chronological ages affected | 1 to 23 months |
| `weeksEarly` values affected | 4 to 16 |
| Maximum fractional-minus-floored delta | 0.929 months, about 4 weeks |
| Pairs where flooring lands on a *different whole month* than rounding would | **126** |

That last row is the one that matters for copy, and it is not a rounding
nicety. In 126 of the 276 pairs, flooring and rounding disagree about which
whole month to name.

### 2.1 The case that makes this a copy problem, not a math problem

| Chronological | weeksEarly | Fractional | Floored | Rounded |
|---|---|---|---|---|
| 3m | 9w | 0.929 | **0** | 1 |
| 4m | 9w | 1.929 | **1** | 2 |
| 5m | 9w | 2.929 | **2** | 3 |

A 3-month-old born 9 weeks early is 0.929 months corrected, which is a few days
short of one month. Floored, that displays as **zero months**.

"We compared your baby to a 0-month-old" is not a sentence to put in front of a
family at 2am. It is technically downstream of a defensible convention and it
reads as either a bug or as something alarming. In the worst pairs the displayed
number is nearly a full month below the honest value, and it is *always* below,
never above, because flooring only truncates.

**This is why display and computation must be allowed to differ.**

---

## 3. The proposal: floor the computation, humanize the display

### 3.1 Named tradeoff (decided): one number for math, a different rendering for people

**Option A, show the floored integer everywhere.** Simplest, one number, no
divergence between what the engine uses and what the parent reads. Produces "0
months" in the pairs above, and understates by up to 4 weeks in 126 pairs.

**Option B, show the fractional value.** Honest to the arithmetic. Produces
"10.8 months," which is false precision on an approximation and does not match
how any clinician speaks.

**Option C, floor the computation and render the display separately. Chosen.**
The engine uses the floored integer for every threshold comparison, exactly as
`01` §2.2 rules. The result screen renders that value through a display function
with its own rules (§3.2). The two are allowed to differ, and the difference is
disclosed rather than hidden.

**Why C wins.** The safety argument in `01` §2.3 is about *comparisons*, and it
holds regardless of what is printed. Binding the display to the comparison value
buys no safety and costs clarity in 126 cases. **The constraint that actually
matters is that the display must never overstate the child's corrected age**,
because overstating it would imply a stricter comparison than the tool actually
made.

**The cost, stated.** Two representations of one quantity is a place bugs live,
and someone will eventually use the display value in a comparison. §3.3 is the
control for that.

### 3.2 Display rules

**A first draft of this section was wrong, and the way it failed is worth
recording**, because it is the trap any implementer will walk into.

That draft said: render the floored value, and express it in weeks when it falls
under two months. Checking it against its own test cases broke it. At 4 months
born 9 weeks early, the floored value is 1 month. Rendered in weeks that is
"about 4 weeks," but the child's true corrected age is 1.93 months, about 8
weeks. The rule understated by four weeks. Rendering the *fractional* value
instead fixes that case and breaks the other direction: saying "about 8 weeks"
claims a comparison against an 8-week-old when the tool actually compared
against a 1-month standard, which **overstates the age used** and is the one
thing §3.1 forbids.

Both framings fail because both try to name a **compared-to age**, and that
quantity is exactly where the rounding ambiguity lives.

**The fix is to lead with the quantity that has no ambiguity: the adjustment
itself.** Weeks early is an input. It is exact, it needs no rounding, and it is
identical under every convention.

| Condition | What the note states | Rationale |
|---|---|---|
| Correction applied, floored value **2 months or above** | The adjustment **and** the compared-to age in whole months: "born 7 weeks early, so we compared to an 11-month-old" | Both are unambiguous here, and the compared-to age is the more useful of the two |
| Correction applied, floored value **under 2 months** | The adjustment **only**: "born 9 weeks early, so we adjusted every comparison by 9 weeks" | Avoids naming a compared-to age in the range where flooring distorts it. Never prints "0 months" and never over or understates |
| Correction not applied | No note, no number | Silence is correct; a note would imply something was done |

**Draft copy, standard case** (carried from `specs/drafts/03-worried-navigator.md`
§1.2, unchanged in substance):

> Because your child was born 7 weeks early, we compared everything to an
> 11-month-old rather than a 12-month-old. That is the standard way to read
> milestones for babies born early, and it applies until age 2.

**Draft copy, under-2-months case** (new):

> Because your child was born 9 weeks early, we adjusted every milestone
> comparison by those 9 weeks. That is the standard way to read milestones for
> babies born early, and it applies until age 2.

Neither is approved; both need a tone and reading-level pass against the grade 7
bar.

**Named tradeoff (decided): lead with the adjustment, not the compared-to age.**
The compared-to age is more concrete and easier for a parent to picture, which
is a real loss in the under-2-months band. It is given up because it is the only
figure that cannot be stated without either overstating or understating what the
tool did. **An exact statement of a slightly less useful quantity beats a
friendlier statement that is wrong in 126 of 276 cases.**

### 3.3 The guard against the two values drifting

Because Option C creates two representations, the design needs one rule to keep
them from being confused:

**The display value is a string, and it is produced at the render boundary. It
is never returned as a number and never enters a comparison.**

Concretely: `resolve()` continues to return `effective_age_months` as the
floored integer, which is what the grader enumerates and what every threshold
uses. The display string is produced by a separate function taking that integer
and returning text. No caller can accidentally compare against the display form,
because it is not a number.

**Grader check:** any code path where a display string reaches a comparison is a
cert failure. This is cheap to check structurally and expensive to debug if
missed.

---

## 4. Convergence across the three engines

`01` §4 records three implementations of one policy with two conventions. The
display work interacts with that.

| Engine | Rounding today | After PR-P5 | Display today |
|---|---|---|---|
| `keel/lib/navigator.mjs` | fractional | floored | renders `effective_age_months` directly |
| `keel/lib/lmc.mjs` | fractional | floored | corrected-age note exists in the interpretation artifact |
| `nsc/lib/navigator.ts` | floored | floored, unchanged | Talking domain draft only |

**Sequencing constraint.** The display change must land **with or after** the
rounding convergence, never before. Converging the display while the engines
still disagree would produce two tools rendering the same policy differently
with no shared source value, which is worse than the current split because it
would look consistent while not being consistent.

**Recommended order:** PR-P5 (converge rounding) then PR-P6 (the corrected-age
note as a graded requirement, per `02` §4) then the display function. All three
after the coverage work in PR-P1 through PR-P4, for the reason `02` §6 gives:
no unverified changes to a safety path.

---

## 5. What this does not resolve

- **Whether the note appears at all** on results where correction applied but no
  floor was suppressed. Current draft says yes, always, whenever
  `corrected: true`. That is the conservative choice and it is also more
  copy on a screen that is already dense. Flagged, not decided.
- **The LMC's own corrected-age note.** `keel/artifacts/lmc/interpretation.v1.json`
  has a `corrected_age_note` block. It was not audited for this document and may
  need the same weeks-versus-months treatment. **Open item.**
- **Whether the 24-month cutoff should be stated to the family.** The draft copy
  says "it applies until age 2," which is honest and pre-empts the question of
  why the note disappears one month later. Kept, but it is a copy judgment.

---

## 6. Test cases for the display layer

Distinct from the safety tables in `02` §3. These verify rendering, not routing.

| # | Chronological | weeksEarly | Floored | Expected note | Proves |
|---|---|---|---|---|---|
| E1 | 12m | 7w | 10m | adjustment + "compared to a 10-month-old" | The standard case |
| E2 | 3m | 9w | **0m** | adjustment only: "adjusted by 9 weeks". **No compared-to age. Never the string "0 months"** | The case that motivated this document |
| E3 | 4m | 9w | 1m | adjustment only: "adjusted by 9 weeks" | The under-2-months rule. Must **not** say "4 weeks" (understates) or "8 weeks" (overstates) |
| E4 | 6m | 5w | 4m | adjustment + "compared to a 4-month-old" | The 2-month boundary from above |
| E5 | 8m | 9w | 5m | adjustment + "compared to a 5-month-old" | Deep correction, still above the 2-month band |
| E6 | 16m | 3w | 16m | no note, no number | Correction not triggered at 3 weeks |
| E7 | 24m | 16w | 24m | no note, no number | Correction not applied at or above 24m |
| E8 | 23m | 16w | 19m | adjustment + "compared to a 19-month-old" | The last month correction applies |
| E9 | any | any | any | the displayed string never enters a comparison | §3.3, structural |
| E10 | all 276 divergent pairs | | | note renders identically under both conventions | The display is convention-independent, which is what makes it safe to converge rounding separately |

**E2 and E3 are the pair that matter.** E2 is the case that motivated this
document. E3 is the case that broke the first draft of the rule, and it is the
better regression test of the two: it fails under *both* of the obvious wrong
designs, once by understating and once by overstating.

**E10 is the sequencing check.** If the note renders identically under fractional
and floored across all 276 divergent pairs, then the display work and the
rounding convergence cannot interfere with each other, and §4's ordering
constraint is satisfied by construction rather than by care.
