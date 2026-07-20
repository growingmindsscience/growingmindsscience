# Amendment 2: Grader integration design

> **STATUS: DRAFT FOR REVIEW. NOT APPROVED. NO CODE CHANGED.**
>
> Design and test tables only. Nothing here has been implemented. The tables
> below are the acceptance criteria for the PR that closes the gap, not a
> description of anything that exists.

**Companion to:** `01-corrected-age-amendment.md`
**Expands:** the PR0 acceptance criterion sketched in
`specs/drafts/03-worried-navigator.md` §7.4.1

---

## 1. What the grader must do differently

Today the Navigator enumeration is, in effect:

```
for each domain
  for age in 0..40
    for each answer path
      classify(domain, age, answers)
```

`weeksEarly` never appears, and `resolve()` is never called, so `correctedAge`
is never reached. The proposed enumeration adds one loop and one call-site
change:

```
for each domain
  for age in 0..40
    for weeksEarly in the sampled set (§2.2)
      for each answer path
        resolve(trees, domain, age, weeksEarly, answers)
```

Two changes, both small. The loop is the coverage. **Routing through `resolve()`
rather than `classify()` is the more important of the two**, because it is what
puts the corrected-age computation inside the graded surface at all. A future
change to `correctedAge` would then be caught by construction rather than by
someone remembering to test it.

---

## 2. The enumeration

### 2.1 Dimensions

| Dimension | Range | Rationale |
|---|---|---|
| Domain | all 8 | Unchanged from today |
| Chronological age | 0 to 40 months, integer | Unchanged from today |
| `weeksEarly` | see §2.2 | New |
| Answer path | exhaustive per `(domain, corrected age)` | Unchanged in kind |

### 2.2 Named tradeoff (decided): sample `weeksEarly`, do not enumerate it fully

Full enumeration of `weeksEarly` 0 to 20 multiplies the Navigator case count by
21. Measured, the preterm slice at `weeksEarly` 4 to 16 alone is 66,768 cases;
a full 0 to 20 sweep lands the Navigator portion in the low hundreds of
thousands, on top of the existing 372,689. That is a real CI cost for a check
that runs on every push.

**Decision: enumerate a sampled set, chosen so that every boundary is hit.**

```
weeksEarly ∈ { 0, 3, 4, 8, 12, 16, 20 }
```

Seven values, chosen for what each one proves:

| Value | What it exercises |
|---|---|
| `0` | Term baseline. Must reproduce today's results exactly (§2.3) |
| `3` | The trigger boundary from below. Policy is `weeks_early_gt: 3`, so 3 must **not** correct |
| `4` | The trigger boundary from above. The smallest correcting value, and empirically the minimum that suppresses every suppressible floor |
| `8`, `12` | Mid-range, and 8 and 12 are the two values the existing LMC spot checks use, so those checks fold in rather than being duplicated |
| `16` | Maximum correction under the current ceiling, 3.68 months |
| `20` | The proposed raised ceiling (`01-corrected-age-amendment.md` §5 question 1). Include it now so raising the ceiling is a config change, not a test rewrite |

**Why sampling is sufficient here, and where it would not be.** Corrected age is
a monotone function of `weeksEarly` compared against integer thresholds. The
behavior is a step function whose steps land at predictable places, so boundary
values plus the extremes cover the space. Sampling would **not** be sufficient
if a non-integer threshold were introduced, which is precisely why §5's tripwire
is a hard gate rather than a warning.

**Cost estimate.** 7 sampled values against today's 372,689-case suite. The
preterm-reachable subset is bounded by ages under 24 months, so the increase is
well under 7x. Expected landing zone is roughly 1.5M to 2M cases, which is the
same order as the LMC grid already runs. If measured runtime exceeds the CI
budget, cut `12` first: it is the least load-bearing of the seven.

### 2.3 The term-baseline regression gate

**`weeksEarly: 0` must reproduce the current 372,689-case result exactly:
same pass set, same ten planted violations failing.**

This is the cheapest and most valuable check in the whole design. It proves the
new enumeration did not change term-baby behavior while adding preterm coverage.
Any divergence here means the refactor to `resolve()` altered something it
should not have.

### 2.4 The vacuity guard (mandatory)

**The enumeration must hard-fail, not warn, if any of these is true:**

| Condition | Why |
|---|---|
| Zero floors resolved for any domain | The floors artifact shape changed and the grader is silently measuring nothing |
| Zero preterm cases evaluated | The `weeksEarly` loop is not reaching the corrected-age path |
| Zero suppression events across the whole run | Corrected age is not being applied at all; a green run here would be meaningless |
| `resolve()` not called at least once per domain | The grader has drifted back to `classify()` and lost the corrected-age surface |

This section exists because the analysis that produced these numbers initially
reported **0 suppressions** due to reading the floors artifact with a wrong key
shape, and that zero looked exactly like a clean bill of health. A safety grader
that measures nothing must be loud about it. **Silence is not success.**

---

## 3. Test-case tables

### Table A: the four invariants

Each row is a property test over the full enumeration, not a single case.

| # | Invariant | Assertion | Failure meaning |
|---|---|---|---|
| **I1** | Global floors never suppressible | For every floor with `applies_age_months_gte: 0`, no `(age, weeksEarly, path)` exists where the floor applies chronologically but not at corrected age | A preterm child who lost skills routes more softly than a term child. **The most serious failure in the suite** |
| **I2** | Suppression bounded by max correction | No floor with threshold `N` is suppressed at chronological age `>= N + 4` | Correction is exceeding its own arithmetic bound; likely a constant or clamp error |
| **I3** | No correction at or above 24 months | Every floor with threshold `>= 24` is non-suppressible at every `weeksEarly` | The `applies_under_months` cutoff is not being honored |
| **I4** | Monotonicity | For fixed `(domain, age, path)`, increasing `weeksEarly` never raises the severity class and never lowers it below the floor that still applies at the corrected age | Correction is inverting; a more premature child is being treated as older |

### Table B: per-floor suppression boundaries

Derived by enumeration against the shipped artifacts. **Every row with a
suppression window must be exercised in both states: suppressed and not
suppressed.** The "must also test" column gives the unsuppressed control case
that proves the floor still fires when it should.

| Floor | Domain | Threshold | Suppressible window | Min weeksEarly to suppress | Must also test (fires) |
|---|---|---|---|---|---|
| `no_social_smile_4m` | social_eye_contact | 4m | 4m to 7m | 4w | 8m/16w |
| `not_reaching_6m` | hands_fine_motor | 6m | 6m to 9m | 4w | 10m/16w |
| `persistent_fisting_6m` | hands_fine_motor | 6m | 6m to 9m | 4w | 10m/16w |
| `not_sitting_9m` | walking_movement | 9m | 9m to 12m | 4w | 13m/16w |
| `no_hand_transfer_9m` | hands_fine_motor | 9m | 9m to 12m | 4w | 13m/16w |
| `no_sound_localization_9m` | hearing_responding | 9m | 9m to 12m | 4w | 13m/16w |
| `no_response_to_name_12m` | understanding | 12m | 12m to 15m | 4w | 16m/16w |
| `no_response_to_name_12m` | social_eye_contact | 12m | 12m to 15m | 4w | 16m/16w |
| `no_response_to_name_12m` | hearing_responding | 12m | 12m to 15m | 4w | 16m/16w |
| `no_weight_bearing_12m` | walking_movement | 12m | 12m to 15m | 4w | 16m/16w |
| `no_finger_thumb_grasp_12m` | hands_fine_motor | 12m | 12m to 15m | 4w | 16m/16w |
| `no_social_games_12m` | play | 12m | 12m to 15m | 4w | 16m/16w |
| `no_shared_enjoyment_12m` | social_eye_contact | 12m | 12m to 15m | 4w | 16m/16w |
| `no_pointing_to_show_15m` | social_eye_contact | 15m | 15m to 18m | 4w | 19m/16w |
| `no_words_16m` | talking | 16m | 16m to 19m | 4w | 20m/16w |
| `no_point_following_18m` | understanding | 18m | 18m to 21m | 4w | 22m/16w |
| `not_walking_18m` | walking_movement | 18m | 18m to 21m | 4w | 22m/16w |

`no_response_to_name_12m` appears three times by design. It is bound by the same
floor id in three domains so that whichever door a parent enters, the same
observation meets the same red line. **All three must be tested separately**, or
the three could drift apart in exactly the way the shared id exists to prevent.

### Table C: non-suppressible floors (I1 and I3 controls)

Every row must be proven non-suppressible at every sampled `weeksEarly`.

| Floor | Domain | Threshold | Why non-suppressible |
|---|---|---|---|
| `skill_loss_any_domain` | global | 0m | Corrected age clamps at 0 |
| `parent_gut_concern_never_dismissed` | global | 0m | Policy floor, clamps at 0 |
| `hearing_concern_any_age` | hearing_responding | 0m | Clamps at 0 |
| `no_sound_response_any_age` | hearing_responding | 0m | Clamps at 0 |
| `asymmetry_any_age` | walking_movement | 0m | Clamps at 0 |
| `early_hand_preference_12m` | walking_movement | 0m | Clamps at 0 |
| `skill_loss_behavior` | behavior_regulation | 0m | Clamps at 0 |
| `repeated_self_injury` | behavior_regulation | 0m | Clamps at 0 |
| `no_two_word_phrases_24m` | talking | 24m | At or above the 24m cutoff |
| `no_one_step_directions_24m` | understanding | 24m | At or above the 24m cutoff |
| `no_pretend_play_30m` | play | 30m | Above the cutoff |
| `stranger_intelligibility_36m` | talking | 36m | Above the cutoff |

### Table D: policy-boundary cases

Small, exact, hand-checkable. These are the cases a reviewer can verify with
arithmetic on paper, which matters for a safety review.

| # | Chronological | weeksEarly | Corrected (floored) | Expected | Proves |
|---|---|---|---|---|---|
| D1 | 16m | 3w | 16m | `no_words_16m` **fires** | 3 weeks does not trigger correction (`weeks_early_gt: 3`) |
| D2 | 16m | 4w | 15m | `no_words_16m` **suppressed** | 4 weeks does trigger correction |
| D3 | 20m | 16w | 16m | `no_words_16m` **fires** | Correction applied, floor still reached |
| D4 | 19m | 16w | 15m | `no_words_16m` **suppressed** | The upper edge of the suppression window |
| D5 | 24m | 16w | 24m | `no_two_word_phrases_24m` **fires** | Correction does not apply at 24m |
| D6 | 23m | 16w | 19m | Correction applied | The last month correction applies |
| D7 | 2m | 16w | 0m | Clamped, not negative | The zero clamp |
| D8 | any | any | any | `skill_loss` reaches `priority_discuss` | **I1, the critical one** |
| D9 | 18m | 8w | 16m | LMC `no_words_16m` **fires** | Folds in the existing LMC spot check |
| D10 | 18m | 12w | 15m | LMC `no_words_16m` **suppressed** | Folds in the existing LMC negative check |

D9 and D10 are the two checks that exist in `keel/graders/floors.mjs` today.
They are reproduced here so the new enumeration subsumes them and the
hand-written pair can be deleted rather than left to rot beside a general
mechanism.

### Table E: planted-violation fixtures

The keel's certification discipline is that the grader must be proven able to
catch violations, not merely to pass. Ten fixtures exist. **These four are
added, and each must fail the grader.** If any passes, the new coverage is
decorative.

| Fixture | Mutation | Must be caught by |
|---|---|---|
| `nav_preterm_skill_loss_suppressed` | Make `skill_loss_any_domain` respect corrected age, so a 2m/16w baby's skill loss stops routing to `priority_discuss` | **I1** |
| `nav_preterm_overcorrection` | Change the constant from `4.345` to `4.0`, overstating correction by roughly 8 percent and widening every suppression window | **I2** |
| `nav_preterm_cutoff_ignored` | Remove the `applies_under_months: 24` check so correction applies at all ages | **I3** |
| `nav_preterm_inverted` | Flip the sign so `weeksEarly` *increases* corrected age | **I4** |

**`nav_preterm_skill_loss_suppressed` is the fixture that matters.** It encodes
the exact failure this amendment exists to prevent: a preterm baby who has lost
skills being routed more softly than a term baby who has lost skills. If the
suite catches only one of these four, it must be that one.

---

## 4. The corrected-age note as a graded copy requirement

`keel/artifacts/navigator/floors.v1.json` states, in the `not_walking_18m`
rationale, that "the tree must surface the corrected-age note on this path."
**There is no grader check behind that sentence today.** It is an obligation
written in prose inside a machine-readable artifact, enforced by nobody.

**Proposed:** promote it to a graded requirement. Wherever `resolve()` returns
`corrected: true`, the rendered result must contain the corrected-age note, and
the grader asserts its presence in the same way it already asserts the standing
parent-gut invitation on every `typical_range` terminal.

This matters beyond tidiness. A preterm family receiving a reassuring result
without being told the comparison was made against a corrected age has been
given a number they cannot interpret and cannot challenge. The note is what
makes the suppression legible to the person it affects.

**Copy requirement:** the note states the correction in the parent's terms and
names the practice as standard, in one sentence, on the result itself, not in a
footnote. Draft copy already exists in `specs/drafts/03-worried-navigator.md`
§1.2 and needs a review pass, not a rewrite.

---

## 5. The non-integer-threshold tripwire

The safety-neutrality of floored rounding rests entirely on every age threshold
being an integer (`01-corrected-age-amendment.md` §2.3). That is true of all 112
thresholds today. It is not guaranteed to stay true, and if it stops being true,
**nothing currently notices.**

### 5.1 The check

A cert-time scan over every age-bearing field in all five artifacts. **Hard
failure, not a warning**, on any non-integer value.

| Property | Specification |
|---|---|
| Scope | Every numeric field whose key contains `age` or `month`, in both floors artifacts, both Navigator and LMC interpretation or trees artifacts, and the instrument artifact |
| Condition | `Number.isInteger(value)` |
| On failure | Fail the build. Do not warn |
| Failure message | Must name the artifact, the key path, and the value, and must state why: the floored-rounding equivalence proof in `01-corrected-age-amendment.md` §2.3 no longer holds, and the rounding convention needs re-deriving before this artifact can ship |
| Current baseline | 112 thresholds scanned, 0 non-integer |

### 5.2 Why a tripwire and not a lint

A lint suggests a preference. This is a **load-bearing precondition for a safety
argument**. The reasoning chain is: floored is safe because it is equivalent to
fractional; it is equivalent because thresholds are integers; therefore a
non-integer threshold silently invalidates the safety argument for a routing
decision affecting preterm infants.

The failure message must carry that chain, because the person who adds an
`18.5` threshold two years from now will have no idea it interacts with rounding
at all. **The tripwire's job is to explain itself to someone who has never read
this document.**

### 5.3 The escape hatch, and its cost

If a non-integer threshold is ever genuinely needed, the path is not to weaken
the tripwire. It is to:

1. Re-run the rounding equivalence enumeration and record the new result.
2. If the conventions now diverge, pick one on safety grounds and converge all
   three engines.
3. Update `01-corrected-age-amendment.md` §2.3 with the new evidence.
4. Only then add the threshold.

No runtime override, no config flag, no admin bypass. The cost of the escape
hatch is deliberately a document revision, because the thing being protected is
an argument, and arguments are revised in prose.

---

## 6. PR sequence

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR-P1** | Enumeration change: add the `weeksEarly` loop, route through `resolve()`, add the §2.4 vacuity guard | Term baseline reproduces 372,689 cases exactly with the same ten fixtures failing (§2.3); vacuity guard proven by deliberately breaking the floors key shape and confirming a hard failure |
| **PR-P2** | The four invariants as property tests (Table A), plus Tables B, C, D as cases | All four invariants green; every row in Table B exercised in both states; every row in Table C proven non-suppressible; all ten Table D cases pass |
| **PR-P3** | The four planted-violation fixtures (Table E) | All four fail the grader. `nav_preterm_skill_loss_suppressed` failing is the merge gate |
| **PR-P4** | Non-integer tripwire (§5) | 112 thresholds scanned, 0 non-integer, and a deliberately planted `18.5` threshold hard-fails with the §5.1 message |
| **PR-P5** | Converge the three engines on floored (`01` §2.2); delete the two superseded LMC spot checks now subsumed by Table D | All prior suites still green; `verify-rounding.mjs` still exits 0; no behavior change at `weeksEarly: 0` |
| **PR-P6** | Corrected-age note as graded copy requirement (§4) | Every `corrected: true` result carries the note; a fixture stripping it fails |

**Critical path: PR-P1 then PR-P3.** The enumeration without the fixtures is
unproven coverage, and the fixtures without the enumeration have nothing to run
against. PR-P2 can land between them. **PR-P5 must come last**, because
converging the engines before the coverage exists would be making an unverified
change to a safety path, which is the exact posture this amendment is written to
end.

## 7. Definition of done

- The Navigator floors grader enumerates `weeksEarly` and routes through
  `resolve()`. Corrected age is inside the graded surface for both tools.
- All four invariants hold, with I1 proven by a fixture that fails.
- Every suppressible floor is exercised in both states; every non-suppressible
  floor is proven non-suppressible.
- The non-integer tripwire is armed and demonstrated against a planted value.
- All three engines share one rounding convention.
- The two hand-written LMC spot checks are deleted, subsumed by the general
  mechanism.
- The suppression count is reported as a CI coverage number, so a future change
  that silently drops preterm coverage to zero is visible rather than green.
