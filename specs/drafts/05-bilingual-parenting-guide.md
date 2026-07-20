# BPG, Bilingual Parenting Guide: End-to-End Build Spec v1 (draft)

> **Status: draft for domain-expert review. Not approved. Nothing here is built.**
> This document proposes a product. It is not a decision record. Every citation
> marked `verified: false` is a seed that has not been checked against the paper,
> every threshold marked "product decision" is a judgment call and says so, and
> the whole thing is subject to Matthew's read before a single PR opens.

**Project:** Growing Minds Science (growingmindsscience.com)
**Codename:** `bpg`
**Plan reference:** portfolio plan §3.5, ecosystem §2.1, funnel §4.2
**Inherits:** `specs/drafts/00-CONVENTIONS.md` in full. Deviations are recorded in §0.6.
**Gates before content freeze:** (G1) citation verification pass, (G2) batch compile cost sign-off, (G3) keel lexicon scan extended to course artifacts and passing.

---

## 0. Product summary

**One-liner:** A six-module course for parents raising bilingual children, plus an Exposure Planner that turns the family's actual weekly schedule into a language exposure map, a gap analysis against the family's own stated goal, and three to five concrete schedule changes.

**Positioning:** "The bilingual parenting advice you get is either folklore or a language-school ad. This is what the input literature actually supports, including the parts that are uncomfortable." Built on the author's Friend-lab research background and English/Spanish instrument work.

**Target segment:** Parents in bilingual or heritage-language households, ages roughly 0 to 6. Two sub-segments with different emotional entry points: the aspiring bilingual household (curiosity track, wants a plan) and the worried bilingual household (worry track, has been told by a relative or a teacher to "drop the second language"). The second sub-segment is the one nobody serves honestly.

**Architecture thesis:** Course content is compiled, human-approved, frozen, and served statically. The Exposure Planner is pure deterministic computation over a compiled recommendation ruleset. Zero runtime model calls anywhere in this product, no exceptions requested.

**Price:** $69 one-off, per D7 (locked). Layer 3 course. The Exposure Planner is a Layer 2 membership tool that is also unlocked, perpetually, by course purchase.

### 0.1 v1 scope

| In | Out (v2 or never) |
|---|---|
| 6 modules: narrated slides plus full written version plus 1-page action sheet | On-camera module video (**never in v1**, D5) |
| One 90-second on-camera course intro (D5, one per course) | Spanish-language version of the course (v2, hold until English proves demand) |
| Exposure Planner tool, household schedule to exposure map | Live coaching, office hours, cohort community (never; no capacity) |
| Gap analysis against a family-stated goal | Any per-child assessment or score inside BPG (**never**; concern routing lives in the Snapshot and the Navigator, not here) |
| Compiled recommendation ruleset, 3 to 5 adjustments | "Bilingual advantage" executive-function claims (**never** as a selling point; see §6.3 honesty card) |
| Bilingual-adjusted handoff copy into the Snapshot and the Navigator | Language-proficiency testing of the child (never) |
| Printable action-sheet pack and a household language plan PDF | Third-language households beyond a simple two-plus-other model (v2) |
| Lead magnet: "The 5 Bilingual Parenting Myths, Graded" | Deaf/HoH bimodal bilingualism (ASL plus spoken) as a first-class path (v2, real and underserved, but needs its own literature pass) |

### 0.2 Success metric and rework trigger

- **Success metric:** module 6 completion rate among purchasers at 30 days, target 55%. Module 6 is the moat and the cross-sell hinge; if people do not reach it, the product has not done its job.
- **Rework trigger:** if Exposure Planner sessions that reach the report screen fall below 60% of sessions that start block entry, the entry UX is the problem and PR2 reopens before any content work continues.

---

## 0.5 What already exists, verified in the repo on 2026-07-19

Read accurately, because three of the four dependencies below do not exist yet and the spec is dishonest if it implies otherwise.

**Exists.**

- **Static-HTML classes.** `classes/birth-to-12-months.html`, `classes/toddlerhood.html`, `classes/preschool.html`, `classes/family-systems.html`, plus `classes/index.html`. Each is a single self-contained page of roughly 400 to 475 lines: sales copy, a `Course` JSON-LD block, and the class content inline. There is no module structure, no lesson records, no progress state, no per-lesson entitlement check, no resume position, no completion event. The word "module" appears in `classes/toddlerhood.html` as prose, not as a data structure.
- **Entitlement plumbing.** `nsc/lib/grants.ts` is a pure, no-I/O module that maps Stripe objects to additive grants over an enumerated `GrantSource` set (`stripe_sub`, `stripe_otp`, `stripe_otp_legacy`, `gift`, `comp`, `trial`), with a documented rule that nothing is ever revoked and that a lapse is expressed through `expires_at`, not deletion. It already carries a `class:<slug>` scope shape, granted today only by the legacy $49 bundle path. `nsc/supabase/migrations/0005_spine_entitlements.sql` provides the `entitlements` and `subscriptions` tables with read-own row-level security and service-role-only writes, and it has already grown `nsc_children.primary_languages`, with a comment naming BPG as a consumer. **This is described in prose only; BPG proposes no schema changes to either file.**
- **The safety keel.** `keel/` governs the Communication Snapshot (live) and the Milestone Navigator (built, launch-held per D3). `keel/artifacts/lmc/floors.v1.json` contains the policy floor `bilingual_no_discount`. `keel/graders/floors.mjs` enforces it two ways: a structural check that no interpretation rule may carry a language-keyed field, and a lexicon scan with three regexes that reject bilingual softening frames. `keel/graders/fixtures/planted-violations.mjs` includes `lmc_bilingual_softening`, which must keep failing. The Snapshot instrument already instructs parents to count words "in any language your family speaks," and `interpretation.v1.json` already ships a `bilingual_note` guidance block. **BPG changes none of this and depends on all of it.**
- **Citation pools.** `nsc/content/citations.v1.json` (G1-verified 2026-07-07), `keel/artifacts/shared/floor_sources.v1.json` (drafted, pending Matthew), `corpus/citations.json` (11 registered organizational sources).

**Does not exist.**

- **A course platform.** There is no `courses`, `modules`, or `lessons` anything, in the static site or in `nsc/app`. `nsc/app` has routes for assess, activities, worried, gift, redeem, admin review, and account. Nothing course-shaped. **PR1 of this product is the course platform upgrade, and it is a real, blocking, non-trivial dependency, not a formality.** BPG is the first product to run the course production brief end to end on it, which means BPG absorbs the platform's teething problems. Budget for that.
- **A course production brief.** No file in the repo matches it. The plan refers to "the existing course production brief" as though it exists; it does not exist in this repository. Either it lives outside the repo or it needs writing. **Flagged to Matthew in §13.**
- **A bilingual LMC item bank.** The plan states the Language Milestone Coach authors its item bank bilingually from day one, with `label_es` on every item. A repository-wide search for `label_es` returns zero matches. The shipped Snapshot instrument is English-only in its labels; its bilingual posture is the counting instruction and the `bilingual_note`, not a Spanish item bank. **BPG module 6's handoff assumes bilingual-aware item labels. It does not assume `label_es`.** See §13.3 for how module 6 ships without it.
- **A bilingual email segment.** No segment tagging exists. Loops is the D6 vendor and is not yet wired. The 300-subscriber launch gate therefore has a build dependency of its own (§10.4).

---

## 0.6 Deviations from the shared conventions

1. §8 contains no DDL and no `sql` fenced blocks at all, not even gated ones. The NSC template used a gated DDL block; the conventions file supersedes it.
2. The enrichment lint applies to all BPG surfaces, with four product-specific additions (§3.2).
3. BPG copy is additionally scanned by the existing keel bilingual-softening lexicon, which no other enrichment product is subject to (§3.4). This is a tightening, never a loosening.

---

## 1. Domain model

### 1.1 The household as the routing key

Unlike every other product in the portfolio, BPG's primary routing key is not the child. It is the **household language configuration**. Two children of the same age in the same city with the same vocabulary can need opposite advice depending on who speaks what to them and when.

`household_shape`, the primary key, is an enumerated set of eight:

| Code | Shape | Characteristic pressure |
|---|---|---|
| `H1` | Two caregivers, both fluent in the minority language | Highest ceiling; risk is drift to the community language as the child ages |
| `H2` | Two caregivers, one fluent in the minority language | The OPOL default; risk is the minority parent's hour count |
| `H3` | Single caregiver, minority language | High-quality input, low total hours; risk is exhaustion |
| `H4` | Minority-language grandparent or relative in the home | Often the strongest source; risk is that it ends when they leave |
| `H5` | Minority-language relative remote or intermittent | Video-call structure matters more than anything else |
| `H6` | Childcare in the majority language, minority at home | The most common configuration in the target market |
| `H7` | Childcare in the minority language, majority at home | Reverses every default assumption in the popular advice |
| `H8` | No fluent minority-language adult in the child's regular life | Honest answer required; see §3.3 |

`H8` exists because the product must be able to tell a family that the plan they want is not reachable with the inputs they have, and to offer the reachable version instead. A ruleset that cannot say that is a ruleset that sells hope.

### 1.2 Secondary keys

- `child_age_band`: `0-11m`, `12-23m`, `24-35m`, `36-47m`, `48-72m`. Drives waking-hour math (§2.2) and module emphasis, not module gating. All six modules are available to every purchaser immediately.
- `goal_tier`, family-stated, never inferred: `active_use` (child speaks it), `receptive` (child understands it), `connection` (child has warm contact with it), `undecided`.
- `minority_language_status`: `community_present` (the language has speakers, media, and services nearby) or `community_absent`. Materially changes what is achievable and what the ruleset may propose.

### 1.3 What BPG deliberately does not model

No proficiency estimate, no per-language vocabulary count, no developmental placement, no risk tier. BPG holds a schedule and a goal. The moment a parent's question turns into "is my child okay," BPG hands off (§3.5) and stops talking.

---

## 2. The Exposure Planner

The tool. Everything in this section is deterministic arithmetic over parent-entered data plus a compiled ruleset. Zero runtime model calls.

### 2.1 Inputs

**Household setup, one screen.**
- Languages, one to three. One is designated the **goal language** (the one the family is trying to protect). The others are labeled without judgment; the product never uses "minority" or "majority" in parent-facing copy, because those words carry freight. Internally they are `goal_lang` and `other_lang[]`.
- Caregivers and regular speakers, up to eight. Each: a label the parent types (nickname only, no full names, see §8), the languages they speak to the child, and whether they are `in_home`, `childcare`, or `remote`.
- `goal_tier` (§1.2), stated by the parent, one tap.
- Child's age band, prefilled from the shared `children` spine when a child profile exists.

**Schedule blocks, up to 40.** Each block:
- `day`: one of the seven, or a `weekdays` / `weekend` shorthand that expands at ingest.
- `start`, `end`: local clock times, 15-minute granularity. Blocks crossing midnight are split at ingest into two blocks.
- `caregiver_id`: who is with the child.
- `language`: which language is spoken to the child in that block. A caregiver who switches within a block is entered as two blocks; the UI offers a "split this block" affordance rather than a mixed-language option, because a mixed-language block cannot be scored without inventing a ratio.
- `interaction_quality`: one of three, defined for the parent in plain words:
  - `directed`, someone is talking with the child, back and forth, in that language.
  - `ambient`, the language is being spoken nearby, to someone else, and the child is present.
  - `media`, screens or audio in that language, with no live speaker.

**Sleep.** Either derived from the age band (§2.2) or entered directly as a bedtime and a wake time plus a nap block.

### 2.2 Waking hours, the denominator

Waking hours per day by age band. **These are product decisions**, anchored to the pediatric sleep-duration consensus, rounded for legibility, and adjustable by the parent. They are not a finding about bilingualism and are never presented as one.

| Age band | Assumed sleep h/day | Waking h/day | Waking min/week |
|---|---|---|---|
| `0-11m` | 13.0 | 11.0 | 4,620 |
| `12-23m` | 12.0 | 12.0 | 5,040 |
| `24-35m` | 11.5 | 12.5 | 5,250 |
| `36-47m` | 11.0 | 13.0 | 5,460 |
| `48-72m` | 10.5 | 13.5 | 5,670 |

Parent-entered sleep overrides the table entirely. When it does, the report says so, so that no parent is quietly compared to an assumption they did not make.

### 2.3 The computation, stated precisely

**Step 1, canonicalize.** Expand shorthand days. Split midnight-crossing blocks. Snap all times to the 15-minute grid. **Deduplicate:** two blocks with an identical `(day, start, end, caregiver_id, language, interaction_quality)` tuple collapse to one. This is what makes the idempotence property in §7.2 hold; without it, a parent who enters the same block twice would double that language's weight.

**Step 2, build the waking grid.** The week is 672 slots of 15 minutes. Mask out sleep slots. Let `W` be the set of waking slots, `|W|` from §2.2.

**Step 3, resolve each slot.** For a waking slot `s`, let `B(s)` be the set of active blocks. Each block `b` carries a quality weight:

| `interaction_quality` | Weight `w(b)` | Rationale |
|---|---|---|
| `directed` | 1.00 | The reference case. Contingent, interactive input is what the literature supports (`ev.input.kuhl2003`, `ev.input.weisleder2013`). |
| `ambient` | 0.40 | Overheard speech is not nothing and is not equivalent. **Product decision**, one of the two most citation-sensitive numbers in this product. |
| `media` | 0.10 | Non-interactive audio and video, deliberately weighted near zero (`ev.input.kuhl2003`). **Product decision.** |

Then for each language `L`:

- `numer_L(s) = Σ w(b) for b ∈ B(s) with b.language = L`
- `denom(s) = Σ w(b) for all b ∈ B(s)`
- `share_L(s) = numer_L(s) / denom(s)` when `denom(s) > 0`

**Multi-caregiver overlap resolves by weight share, not by winner-take-all.** Two caregivers in the same slot, one `directed` in Spanish and one `ambient` in English, give Spanish `1.00 / 1.40 = 71.4%` of that slot and English `28.6%`. Three concurrent `directed` speakers in the same language do not triple that language's slot share; the ratio is scale-invariant within a slot, which is correct: a slot is fifteen minutes of a child's life no matter how many adults are in it.

**Step 4, unmapped slots.** A waking slot with `B(s) = ∅` is **unmapped**. Unmapped time is never redistributed and never silently attributed. It is reported as a coverage figure.

- `coverage = |{s ∈ W : denom(s) > 0}| / |W|`
- Percentages are computed over mapped slots only, and every figure in the report is labeled "of the time you mapped," not "of the week."
- **If `coverage < 0.70`, the gap analysis and the recommendations are suppressed** and replaced with a single prompt to map more of the week, naming the largest unmapped stretch. **Named tradeoff (decided):** showing a confident-looking percentage over a third of a week is worse than showing nothing, because the parent will act on it. Suppression wins.

**Step 5, two headline figures.** Report both, always, side by side.

- **Quality-weighted share**, the headline: `Σ_s share_L(s) / |mapped slots|`.
- **Clock share**, the reality check: the same computation with all weights set to 1.00.

**Named tradeoff (decided):** the quality-weighted figure could stand alone and would be simpler. It is also easy to misread as "my child hears Spanish 40% of the time," which is false when half of that came from media. Showing both, with the gap between them called out in one sentence when it exceeds 10 percentage points, wins. The gap between the two numbers is itself the most useful thing on the screen for a media-heavy household.

**Step 6, gap analysis.** Target share for the goal language by `goal_tier`:

| `goal_tier` | Reference share (quality-weighted) | Status |
|---|---|---|
| `active_use` | 30% | **Product decision** informed by `ev.input.pearson1997` and `ev.input.thordardottir2011` |
| `receptive` | 18% | **Product decision**, same seeds |
| `connection` | 8% | **Product decision**, no direct literature anchor, honest about it |
| `undecided` | none | No gap shown; the report is descriptive only |

⚠ **These four numbers are the single most citation-sensitive element of this product.** The input literature reports a continuous dose-response relationship, not a cliff. Any copy implying that 29% fails and 31% succeeds is false and is banned by §3.2. The reference share is rendered as a soft band on a track, never as a line, and every gap sentence carries the phrase "more is more, and there is no magic number." G1 must resolve these four before content freeze; if the literature will not support them, the feature ships as descriptive-only with no targets, and that is an acceptable outcome.

Gap bands: `met` (at or above), `near` (within 5 points), `short` (5 to 15 points), `far` (more than 15 points).

**Step 7, recommendations.** Match the compiled ruleset (§4.2) against the household facts, take the top 3 to 5 by priority, and **for each one, simulate it against this family's actual timeline to compute its real percentage-point delta.** The number shown to the parent is computed, not authored. A rule whose simulated delta is `≤ 0` for this household is dropped, even if it matched. If fewer than three survive, the report shows what survived and says plainly that the schedule is already close to what the inputs allow.

### 2.4 What the Planner may never do

- Never propose reducing sleep. Property-tested (§7.2).
- Never propose dropping or reducing a language, in either direction. Not the goal language, and not the community language. Rules may only add time, convert quality within an existing slot, or move an existing block. Property-tested.
- Never output a number about the child. Only about the schedule.
- Never imply that the current schedule is causing or preventing a language problem.

---

## 3. Output and copy safety

### 3.1 The report

1. **The week, drawn.** A seven-column grid, one color per language, quality shown as opacity. Unmapped time is left as ground, not filled with grey, so that it reads as "not yet entered" rather than "empty."
2. **Two numbers per language**, quality-weighted and clock, with the difference sentence when it exceeds 10 points.
3. **Coverage line:** "You mapped 82% of a typical week."
4. **Goal track:** the goal language's share against the reference band, soft-edged.
5. **Three to five adjustments**, each with its computed delta, an effort band (`easy`, `some rearranging`, `big change`), and a one-line why with an evidence chip.
6. **Evidence footer**, the two-axis chips for the rules that fired.
7. **Static neutral footer**, identical on every report, never triggered: the pediatrician routing line required by the conventions.

### 3.2 Lint

The enrichment lint from the conventions applies in full to every BPG surface, course and tool. Four product-specific additions, all case-insensitive with word boundaries:

- `not enough`, `too little`, `losing the language`, `too late`, `critical period` used as a deadline, `window is closing`, `native-like` as a goal, `fluent by`.
- Any sentence asserting that a percentage threshold must be met, as opposed to approached. Detected by a regex family over `at least {n}%` and `need {n}%` constructions in proximity to the goal-language nouns.
- Any sentence comparing this household to another household. Same shape as the child-comparison ban.
- Any sentence attributing a language outcome to a parent's schedule choice in the past tense. "If you had started earlier" and its variants.

Reading level: grade 8 or below across course and tool, mechanically checked at cert.

### 3.3 The honest-limits posture

For `H8` households and for `community_absent` families with an `active_use` goal, the report leads with the reachable version of the goal rather than the stated one, and says why in one sentence without apology. The tone rule from the NSC spec holds: direct, never vaguely apologetic. This is the same instinct as the Number Path "what we left out" honesty card, applied to a family's plan instead of to the science.

### 3.4 The tension, and how the copy resolves it

This product carries a real tension and must not paper over it.

**What the course teaches:** bilingual exposure does not cause language delay. Monolingual single-language norms mislead when applied to a bilingual child. Total-vocabulary and conceptual scoring are the right ways to count.

**What the tools enforce:** the Communication Snapshot and the Navigator apply the same floors to every child. `keel/artifacts/lmc/floors.v1.json` carries the policy floor `bilingual_no_discount`, whose rationale states that "wait because bilingual" is a documented driver of late referral, and that guidance "may add bilingual context; it may never downgrade severity." `keel/graders/floors.mjs` enforces it structurally and lexically, and `keel/graders/fixtures/planted-violations.mjs` keeps a planted softening fixture that must keep failing.

**These are not in conflict. They are the same claim pointed in two directions.** The confusion comes from a third proposition that the course must name and reject explicitly:

| Proposition | Status | Where it is taught |
|---|---|---|
| A. Bilingual exposure does not cause delay | True, taught | Modules 1 and 6 |
| B. Bilingualism is never a reason to wait on a concern | True, taught | Modules 1 and 6, and every handoff surface |
| C. "Bilingual kids are just late talkers, give it time" | **False, named and rejected by name** | Module 1 opening, module 6 core |

C is the folk conclusion people draw from A. It is the reason bilingual children are referred late. A course that teaches A without disowning C actively causes harm, and this product would be the vector.

**Resolution in copy, four mechanisms:**

1. **B appears in module 1, not only module 6.** A parent who buys the course, watches the myth-busting module, and never finishes must still have heard "this is not a reason to wait."
2. **Total-vocabulary counting is taught as accuracy, never as adjustment.** The framing is: counting only one language undercounts a bilingual child, and the Snapshot already counts across all languages, so use it as designed. The framing is never: your child looks lower than the line, so recount and feel better. Module 6's action sheet states the difference in one sentence.
3. **Conceptual scoring is taught as what a good evaluator does, not as a parent-applied correction.** It is a reason to ask an evaluator whether they scored conceptually, not a reason for a parent to move their own child out of a band.
4. **Mechanical enforcement.** Every BPG artifact string is run through the existing `keel/graders/floors.mjs` bilingual-softening lexicon scan, which BPG registers as a scanned surface set. That scan already rejects "because bilingual, wait / later / no need to worry" constructions and their variants. G3 gates content freeze on it. This is the only enrichment product in the portfolio subject to a keel scan, deliberately.

The one-sentence version, which appears verbatim in module 1, module 6, the Planner report, and the sales page: **"Two languages do not cause a delay, and two languages are never a reason to wait."**

### 3.5 Handoff, not assessment

Any BPG surface where a parent might express concern routes to the Communication Snapshot (ages 6 to 36 months) or the Navigator (per its domains, subject to D3 launch hold). The handoff copy is compiled, keel-scanned, and carries no bilingual qualifier of any kind on the severity side. It carries exactly one bilingual context line, which is the accuracy point from §3.4 mechanism 2 and nothing more.

---

## 4. Content library

### 4.1 Course structure and the module schema

Per **D5 (locked):** narrated slides plus a full written version, no on-camera module video in v1, one 90-second on-camera course intro. Each module targets 12 to 18 minutes of narration and a written version that stands alone for a parent who will never press play, which is the sleeping-baby use case D5 names.

Module artifact entries in `bpg.modules.v1.json` carry, as an annotated field list: a stable id; title; order; a one-line promise; three to five learning objectives; the slide deck as an ordered list of `{slide_id, visual_note, narration_script, on_screen_text}`; the written version as structured sections; the action sheet as a one-page block; an ordered list of empirical claims, each with its own `tag_ids`, `strength`, and `consensus`; cross-link targets; and the module's keel-scan status.

**Every empirical claim in every module is a first-class object with its own citation slot.** A module cannot compile with a claim that has zero `tag_ids`. This is the same rule NSC applies to games, tightened: NSC required one tag per game, BPG requires one per claim.

### 4.2 The recommendation ruleset, `planner.rules.v1.json`

Rule fields, as an annotated list: `id`; `when`, a predicate over an enumerated fact vocabulary; `priority`, an integer; `applies_to_shapes`, a subset of `H1` through `H8`; `applies_to_bands`, a subset of the gap bands; `copy`, the parent-facing sentence; `effort_band`; `simulation`, a structured description of the schedule change to apply when computing the delta; and `tag_ids`.

**The fact vocabulary is closed and enumerated**, so that predicates are machine-checkable and a rule cannot reference a fact the engine does not compute. Roughly 30 facts, including: `media_share_gt(x)`, `ambient_share_gt(x)`, `unmapped_stretch_exists(daypart)`, `goal_speaker_count(n)`, `goal_speaker_hours_lt(h)`, `childcare_language_is_goal`, `remote_relative_present`, `bedtime_routine_language`, `mealtime_language`, `weekend_block_available`, `caregiver_switches_within_day`, `community_absent`.

**Coverage matrix, cert-enforced:** every `(household_shape × gap_band)` cell, 8 by 4 = 32 cells, must resolve to **at least three** applicable rules for the synthetic reference household of that cell. Target ruleset size v1: roughly **110 rules**, of which **8 are hand-authored gold references** spanning the extremes (`H3`/`far`, `H8`/`far`, `H1`/`met`, `H7`/`short`).

**Rule families**, as authoring guidance: convert a recurring `media` block to `directed` in the same slot; move the bedtime routine to the goal language; assign a specific meal to the goal language; structure remote-relative video calls around an activity rather than an interview; recruit the second caregiver for a single fixed daily block; convert commute time; use the weekend morning stretch; give one caregiver a consistent slot instead of a diffuse effort; add a goal-language playgroup or library storytime where `community_present`; and, for `H8`, redirect from `active_use` to `connection` with a concrete plan.

### 4.3 Action sheets and the printable

Six one-page action sheets, one per module, plus a **Household Language Plan** PDF generated from the Planner report: the week grid, the two figures, the chosen adjustments, and a signature line for both caregivers. The signature line is not decoration. A language plan two adults have both looked at is the difference between a strategy and an intention. This is the giftable, shareable artifact, and it is the Pinterest asset per plan §5.4.

### 4.4 Production, gates, and cost flag

Content runs through the course production brief with approval gates: Fable research pass, scripting pass, mechanical grading, then **Matthew's verification pass per module**, module by module, in the shared admin review queue. No module advances on a green grader alone.

⚠ **G2 cost flag, rough order, sign off before any batch run:**

| Batch | Rough output tokens |
|---|---|
| 6 module scripts, roughly 2,400 words each | ~25k |
| 6 written versions, roughly 3,500 words each | ~37k |
| 6 action sheets plus slide on-screen text | ~15k |
| ~102 non-gold planner rules at ~250 tokens | ~26k |
| Report copy pack, handoff copy, lead magnet | ~15k |
| **Total per full compile, before retries** | **~120k output tokens** |

Compile one module end to end first, take it all the way through Matthew's pass, and only then batch the rest. The first module is the calibration run, and its cost is not representative.

---

## 5. Architecture

### 5.1 Split

- **Planner engine, pure TypeScript**, `lib/bpg/exposure.ts`, roughly 350 lines: canonicalization, the waking grid, slot resolution, coverage, the two shares, gap banding, rule matching, and delta simulation. This is the auditable core and it is exhaustively property-tested (§7.2). It performs no I/O and imports no artifact loader, exactly as `keel/lib/lmc.mjs` is imported unchanged by both the browser page and the CI grader.
- **All copy, all rules, all course content: compiled, frozen, hash-certified artifacts.**

### 5.2 Frozen artifacts

| Artifact | Contents |
|---|---|
| `bpg.modules.v1.json` | Six modules per §4.1, scripts, written versions, action sheets, claims |
| `bpg.planner.copy.v1.json` | Every parent-facing string in the Planner, keyed by report state |
| `planner.rules.v1.json` | ~110 rules per §4.2 |
| `planner.params.v1.json` | Waking-hour table, quality weights, target shares, gap bands, coverage threshold. **Isolated deliberately** so that a G1 outcome that moves the target shares is a one-file, one-review change |
| `bpg.evidence.v1.json` | Citation table and two-axis tags (§6) |
| `bpg.handoff.v1.json` | Snapshot and Navigator handoff copy, the keel-scanned surface |
| `cert.report.v1.json` | Output of §7; runtime refuses any artifact whose hash lacks a matching passing report |

### 5.3 Runtime

The upgraded course platform from PR1, plus the existing stack. Artifacts served from the repo. Narration audio hosted per the D5 note. No new infrastructure.

---

## 6. Evidence layer

### 6.1 Tags

Two-axis `strength × consensus` chips, same visual language as the rest of the portfolio.

### 6.2 Seed citation table

⚠ **G1 gate. Every row below is `verified: false` unless marked otherwise, meaning it is a seed proposed by this spec and has not been checked against the paper.** Anchors are given as author and year only. **No DOIs, volumes, or page numbers appear here, deliberately, because inventing them is worse than omitting them.** Verify the full cite, the findings, and the effect sizes before content freeze.

| tag_id | Anchor | Claim scope | verified |
|---|---|---|---|
| `ev.bi.genesee1989` | Genesee (1989) | One language system or two; early differentiation, the empirical answer to the confusion myth | false |
| `ev.bi.grosjean1989` | Grosjean (1989) | The bilingual is not two monolinguals in one person; the framing that underwrites the whole course | false |
| `ev.bi.byersheinlein2010` | Byers-Heinlein, Burns & Werker (2010) | Newborn discrimination of the two prenatally heard languages | false |
| `ev.bi.byersheinlein2013` | Byers-Heinlein & Lew-Williams (2013) | Practitioner-facing synthesis: what the science does and does not say | false |
| `ev.bi.petitto2001` | Petitto et al. (2001) | Bilingual milestone timing broadly parallel to monolingual timing | false |
| `ev.input.pearson1993` | Pearson, Fernández & Oller (1993) | Total and conceptual vocabulary scoring in bilingual infants; the module 6 spine | false |
| `ev.input.pearson1997` | Pearson, Fernández, Lewedeg & Oller (1997) | Relative input percentage predicts relative vocabulary; the Planner's whole premise | false |
| `ev.input.hoff2012` | Hoff, Core, Place, Rumiche, Señor & Parra (2012) | Dual language exposure and early development; each language tracks its own input | false |
| `ev.input.place2011` | Place & Hoff (2011) | Properties of dual language exposure, including number of speakers, not only hours | false |
| `ev.input.thordardottir2011` | Thordardottir (2011) | Input amount and bilingual vocabulary outcomes | false |
| `ev.input.weisleder2013` | Weisleder & Fernald (2013) | Child-directed speech quantity, processing efficiency, vocabulary; quality over ambient | false |
| `ev.input.kuhl2003` | Kuhl, Tsao & Liu (2003) | Live social interaction supports phonetic learning where audio and video do not; the `media` weight anchor | false |
| `ev.input.ramirez2014` | Ramírez-Esparza, García-Sierra & Kuhl (2014) | Infant-directed speech style and later vocabulary in bilingual contexts | false |
| `ev.mix.genesee2004` | Genesee, Paradis & Crago (2004) | Dual language development and disorders; code-mixing as rule-governed competence | false |
| `ev.mix.paradis2011` | Paradis, Genesee & Crago (2011) | Bilingual acquisition and impairment, practitioner reference | false |
| `ev.dld.paradis2010` | Paradis (2010) | Bilingualism does not cause or worsen language impairment | false |
| `ev.dld.kohnert2010` | Kohnert (2010) | Bilingual children with primary language impairment; dropping a language does not help | false |
| `ev.assess.bedore2008` | Bedore & Peña (2008) | Assessment of bilingual children; why monolingual norms misidentify in both directions | false |
| `ev.lit.cummins1979` | Cummins (1979) | Linguistic interdependence; the transfer hypothesis behind module 5 | false |
| `ev.lit.melbylervag2011` | Melby-Lervåg & Lervåg (2011) | Meta-analysis of cross-linguistic transfer in reading | false |
| `ev.read.whitehurst1988` | Whitehurst et al. (1988) | Dialogic reading; the DRC bridge | false |
| `ev.read.valdezmenchaca1992` | Valdez-Menchaca & Whitehurst (1992) | Dialogic reading effects in Spanish; the home-language version works | false |
| `ev.sleep.paruthi2016` | Paruthi et al. (2016) | Pediatric sleep-duration consensus; the §2.2 waking-hour table | false |
| `ev.ef.paap2013` | Paap & Greenberg (2013) | No consistent bilingual executive-function advantage | false |
| `ev.ef.debruin2015` | de Bruin, Treccani & Della Sala (2015) | Publication bias in the bilingual-advantage literature | false |
| `ev.floor.rescorla1989` | Carried from `floor_sources.v1.json` | Late-talker criterion; module 6 uses the same line the Snapshot uses | **true** (pool) |
| `ev.floor.filipek1999` | Carried from `floor_sources.v1.json` | Absolute red flags; module 6 states them without bilingual qualification | **true** (pool) |
| `ev.floor.zubler2022` | Carried from `floor_sources.v1.json` | Typical-range framing, CDC 2022 revision | **true** (pool) |
| `ev.org.cdc_actearly` | Carried from `corpus/citations.json` | Public-domain milestone checklists | **true** (pool) |
| `ev.org.aap` | Carried from `corpus/citations.json` | Pediatric routing and media guidance | **true** (pool) |

If a seed does not survive G1, the claim it supports is cut from the module. The module is not shipped with a weaker citation substituted quietly.

### 6.3 The honesty card

`ev.ef.paap2013` and `ev.ef.debruin2015` render as the course's honesty card, the direct analogue of the Number Path ANS card: **"The brain-benefits claim, and why we are not selling it."** Bilingualism is worth doing for family, identity, and connection. The executive-function advantage is contested and publication-bias-affected, and this course will not use it as a closing argument. Putting this in the sales page is a positioning asset, not a liability, and it is the single clearest signal that this product is different from what else is on the market.

---

## 7. Certification harness

### 7.1 Static checks

1. JSON Schema validation for every artifact.
2. Enrichment lint plus the four §3.2 additions, across every string. Zero tolerance.
3. **Keel bilingual-softening lexicon scan (G3)** across `bpg.modules.v1.json`, `bpg.handoff.v1.json`, and `bpg.planner.copy.v1.json`, using `keel/graders/floors.mjs` unchanged. A planted-violation fixture is added to the BPG suite in the same shape as `lmc_bilingual_softening`, and it must fail.
4. Reading level at or below grade 8.
5. Every empirical claim in every module has at least one `tag_id`; every `tag_id` resolves; every resolved citation is `verified: true`.
6. Rule coverage matrix: all 32 `(shape × band)` cells resolve to at least three rules against their reference household.
7. Every rule's `when` predicate references only facts in the closed vocabulary; every `simulation` is expressible as add-block, convert-quality, or move-block, and nothing else.
8. Module 1 and module 6 each contain the §3.4 verbatim sentence. Checked by exact string match, because this is the sentence the whole safety argument rests on.

### 7.2 Planner property tests

Generated households, 10k per configuration, deterministic seed:

- **Conservation:** for every mapped slot, language shares sum to 1.0 within 1e-9. Over the week, reported shares sum to 1.0 within 1e-6.
- **Idempotence:** submitting a duplicate of any existing block produces a byte-identical report. Holds only because of the §2.3 step-1 dedupe, which is the point of testing it.
- **Monotonicity, quantity:** adding a `directed` block in language L never decreases L's reported share.
- **Monotonicity, quality:** upgrading any block from `media` to `ambient`, or `ambient` to `directed`, never decreases that language's share.
- **Scale invariance within a slot:** duplicating every block in a slot across all languages leaves that slot's shares unchanged.
- **Sleep invariant:** no emitted recommendation's `simulation` reduces sleep minutes. Assert over all 32 reference households and the fuzz corpus.
- **No-language-removal invariant:** no emitted recommendation's `simulation` reduces any language's absolute minutes. Rules add, convert, or move only.
- **Positive-delta invariant:** every emitted recommendation has a simulated delta strictly greater than zero for the household it was emitted to.
- **Recommendation count:** exactly 3 to 5 emitted, or zero with the low-coverage suppression message, or fewer than 3 with the already-close message. No other outcome.
- **Suppression:** for every household with `coverage < 0.70`, the report contains no percentage-against-target and no recommendations. Checked structurally, not by string search.
- **Determinism:** identical input yields a byte-identical report and a stable hash.
- **Fuzz:** 10k random households including degenerate cases (zero blocks, one block, 40 overlapping blocks, all-media, single 15-minute week) produce a valid report or a typed refusal, never a crash and never a NaN.

### 7.3 CI wiring

Runs on every BPG PR. Cert report committed with artifacts. Runtime refuses any artifact whose hash lacks a matching passing report, the one invariant the plan applies everywhere.

---

## 8. Data model

**No DDL in this document.** Prose and annotated field lists only, per the conventions. When approved, a real migration lands in the owning app's `supabase/migrations/`.

**Reads, no changes proposed.** BPG reads `entitlements` and the `children` spine, including `primary_languages`, exactly as they exist today. It reads course access through the same additive-grant logic in `nsc/lib/grants.ts`, extended by PR1 with a `course:<slug>` scope alongside the existing `class:<slug>`.

**New, owned by BPG.**

*Household.* One per user, or a small number: the user reference; the ordered language list with one flagged as the goal language; `goal_tier`; `household_shape`; `minority_language_status`; optional link to a child in the spine; timestamps. No free text about the child, no full names.

*Speakers.* Per household: a parent-typed short label, capped in length; the languages they speak to the child; their relationship type from an enumerated set; their presence type (`in_home`, `childcare`, `remote`). Labels are nicknames by instruction and by copy; the field is never used for anything but display.

*Exposure blocks.* Per household: day, start, end, speaker reference, language, `interaction_quality`. Stored post-canonicalization, so a stored block never crosses midnight and is always on the 15-minute grid.

*Exposure reports.* Per household: the computed report as a structured blob, the pinned versions of `planner.rules` and `planner.params`, the input hash, and a timestamp. Reports are immutable and versioned; a parent can see how the plan changed, which is the retention hook.

*Module progress.* Owned by the PR1 course platform, not by BPG: user, course, module, furthest position, completed flag, timestamps.

**Row-level security:** read-own on every table, service-role-only writes for anything grant-derived. Same posture as `entitlements` today.

**Privacy:** no child names, no free text about the child, no audio, no video. Caregiver labels are nicknames. Deletion cascades. The schedule of a family's week is unusually identifying data and is treated as sensitive: it is never included in any analytics event, and §11 carries only shape-level aggregates.

---

## 9. Screens

Tidepool tokens throughout: deep teal ink `#15393C`, brand teal `#1E5F62` for action, coral `#DE7356` as the single warm accent, aqua mist `#F0F5F3` ground, Bricolage Grotesque for display and Source Serif 4 for body, 48px pill controls, 14px card radius, the arch motif for imagery.

**Signature visual: the week grid.** Seven columns, languages as color, interaction quality as opacity, unmapped time left as ground. It is the product's one memorable element, it is the printable, and it is the Pinterest asset. Everything else stays quiet. One signature reveal, the grid filling in column by column when the report first renders, with an instant `prefers-reduced-motion` fallback. No confetti anywhere.

1. **`/courses/bilingual` sales page.** Static, indexed, `Course` JSON-LD extending the pattern already in `classes/toddlerhood.html`. The 90-second on-camera intro above the fold, the §3.4 sentence stated plainly, the honesty card below the fold, module 6 named as the reason to buy.
2. **Course home.** Six module cards, progress ring per module, the Planner entry point pinned at the top once unlocked, resume affordance.
3. **Module player.** Narrated slides with a persistent, prominent **Read instead** toggle. Not a fallback link in the corner: a peer control, because D5's written-first rationale is only real if the written version is as easy to reach as the audio. Transcript always present. Action sheet download at the end.
4. **Planner, household setup.** One screen: languages, goal language, goal tier, speakers.
5. **Planner, block entry.** The hardest screen in the product and the rework trigger in §0.2. Mobile-first. Starts from a skeleton week derived from the age band and childcare answer, so the parent edits rather than composes. Tap a slot, pick a speaker, pick a language, pick a quality. "Same as yesterday" duplication. A live coverage meter, because coverage is the gate and the parent should watch it climb.
6. **Planner report.** §3.1, in order.
7. **Adjustment detail.** One adjustment, what it changes on the grid shown as a before-and-after, the computed delta, the evidence chip, and a "we are doing this" toggle that persists into the printable.
8. **Household plan printable.** Preview and download, with the two-signature line.
9. **Handoff surface.** Reached from module 6 and from any concern affordance. Routes to the Snapshot or the Navigator, carries the §3.4 sentence, carries no severity qualifier.

---

## 10. Ecosystem slot

### 10.1 Layers

- **Layer 3, course, $69 one-off (D7, locked).** Sold standalone, forever. Founding-cohort early-access pricing during module-by-module release, per plan §3.5 PR3.
- **Layer 2, membership.** The Exposure Planner is a membership tool. Course purchase grants the Planner perpetually, as an additive grant with source `stripe_otp`. Per the ecosystem rule, no entitlement is ever revoked: a member who later cancels but bought BPG keeps both the course and the Planner.
- **Layer 1, free.** The lead magnet (§10.4), the sales page, and a public myths page that is the SEO surface.
- BPG counts toward the three-course threshold for the deferred $149 all-access annual.

### 10.2 Cross-links to the other five products

| Product | Direction | Mechanism |
|---|---|---|
| **Language Milestone Coach / Communication Snapshot** | BPG to LMC, and LMC to BPG | Module 6 hands off to the Snapshot with the §3.5 copy. The Snapshot's existing `bilingual_note` guidance block is the natural place for a BPG link once BPG exists, subject to keel review, because that block is governed copy and BPG does not get to edit it unilaterally. |
| **Milestone Navigator** | BPG to Navigator | Same handoff surface, gated on the D3 launch hold. Module 6 references the Navigator only if it has launched; the module artifact carries a feature flag on that paragraph so content does not need recompiling on launch day. |
| **Dialogic Reading Coach** | BPG to DRC, strongest cross-sell | Module 5 is built as the bridge: dialogic reading in the home language, `ev.read.valdezmenchaca1992` as the anchor that the technique works in Spanish. The module 5 action sheet ends with the DRC offer. Plan §4.2 already specifies behavior-triggered course cross-sells. |
| **Activity Library** | BPG to AL | Planner adjustments that create a new interaction block link to age-banded activities to fill it. "You freed up twenty minutes" is worthless without "here is what to do in it." |
| **Claims Library** | Both directions | Every myth in module 1 and every lead-magnet myth maps to a graded claim page. The claim pages are the SEO surface; the course is the depth. Claims link to the course, the course cites the claims. |
| **Number Path** (existing) | Weak, honest about it | One line in module 5 noting that counting transfers across languages, matching the `bilingual_note` already in the NSC game schema. Not a headline cross-sell. |

### 10.3 Build order dependency

BPG is last in the plan's build sequence for a reason: it needs the email list the first six products build. Do not reorder it forward to get a course shipped. A $69 course launched to a cold list is a failed launch that also burns the launch.

### 10.4 The lead magnet and the 300-subscriber gate

**"The 5 Bilingual Parenting Myths, Graded."** A PDF through the templated lead-magnet pipeline, one page per myth, each with a two-axis verdict chip, roughly 120 words, and one citation. The five myths:

1. Two languages confuse a baby. (`ev.bi.genesee1989`, `ev.bi.byersheinlein2010`)
2. Bilingual children talk later. (`ev.bi.petitto2001`, `ev.input.pearson1993`; and the §3.4 sentence appears here, in the magnet, before anyone has paid anything)
3. Mixing languages means the child does not know the difference. (`ev.mix.genesee2004`)
4. If a child has a language difficulty, drop one language. (`ev.dld.paradis2010`, `ev.dld.kohnert2010`)
5. Cartoons in the second language count. (`ev.input.kuhl2003`)

Myth 2 is the one that carries the safety load, and it is deliberately in the free magnet rather than behind the paywall. The claim that keeps a child from being referred on time is not a premium feature.

**Capture surfaces:** the public myths page, in-content on any bilingual article, exit-intent on the claims pages tagged bilingual, and the Snapshot's completion screen only where a family has entered more than one language and only in the non-concern path. Never on a concern result. That restriction is absolute and follows the funnel's rule against monetizing the anxiety moment.

Every capture requests DOB gently, per the funnel's age-triggered automation design, and writes segment tag `bilingual` plus a sub-tag for the capture surface.

**The gate: do not launch until the `bilingual` segment exceeds 300 subscribers.** This is a launch gate, not a build gate. Build proceeds, launch does not, the same posture D3 takes with the Navigator. The gate needs Loops wired with segment tagging first (D6), which is Phase 0 work, not BPG work, and BPG should not absorb it.

---

## 11. Telemetry

Aggregate and anonymized. No schedule data, no caregiver labels, no child data in any event.

- Funnel: magnet capture to segment size (the launch gate itself is the metric), sales page to purchase, purchase to module 1 start, module 1 to module 6 completion (the §0.2 success metric, target 55% at 30 days).
- Planner: setup start to block entry, block entry to report (the §0.2 rework trigger, target 60%), median blocks entered, median coverage achieved, low-coverage suppression rate (target below 25%).
- Report: adjustment "we are doing this" toggle rate, printable download rate, return-visit rate at 4 weeks.
- Rule health: which rules fire, which fire and are never adopted. A rule adopted by nobody across a season is a content-pruning signal for the v1.1 recompile.
- Household-shape distribution, shape-level only. Useful for knowing which cells of the coverage matrix carry real weight. Never surfaced to users.
- Cross-sell: module 5 to DRC click rate, module 6 to Snapshot handoff rate. The handoff rate is watched but is **never optimized upward**. It is a routing path, not a conversion.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge, acceptance criteria on every PR, eval gate blocks merge.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR1** `bpg/course-platform` | The platform upgrade. Course, module, lesson structure; progress tracking; entitlement gating extended with `course:<slug>`; the four existing static classes migrated onto it without losing their URLs or their `Course` JSON-LD | All four existing classes render from the platform at their current URLs; legacy `class:toddlerhood` grant still unlocks toddlerhood; progress persists across devices; grant-rule tests green including the additive-only invariant |
| **PR2** `bpg/planner-engine` | `lib/bpg/exposure.ts` plus the full §7.2 property suite, against hand-authored gold rules only | Every property green, 10k fuzz households clean, deterministic hashes stable across runs |
| **PR3** `bpg/planner-ux` | Screens 4 to 8, the week grid, the printable | Coverage meter behaves, suppression path correct, print fidelity checked, Lighthouse a11y at or above 95 |
| **PR4** `bpg/content-module-1` | One module end to end through the production brief, plus the lead magnet. **The calibration run** | Matthew's verification pass complete; cert green including G3 keel scan; the verbatim §3.4 sentence present |
| **PR5** `bpg/rules-compile` | Full ruleset compile. **G2 cost sign-off first** | 32-cell coverage matrix green; every rule's simulation expressible in the closed vocabulary; positive-delta invariant holds across the reference set |
| **PR6** `bpg/content-modules-2-6` | Remaining five modules, module by module, each with its own approval gate. **G1 must have flipped every cited row to `verified: true` before module 6** | Per-module cert green; no artifact ships with `verified: false` |
| **PR7** `bpg/launch-surfaces` | Sales page, honesty card, cross-links in §10.2, handoff surface, Navigator paragraph behind its flag | Cross-link map has no orphans; handoff copy passes the keel scan |
| **PR8** `bpg/telemetry-polish` | §11 events, copy pass, a11y pass, reduced-motion | Events flowing; no schedule or label data in any payload, asserted by a test |

PR2 can run in parallel with PR1. PR4 blocks PR6. Nothing ships until the §10.4 subscriber gate clears.

---

## 13. Risks and open decisions, routed to Matthew

1. **The course production brief does not exist in this repository (§0.5).** If it lives elsewhere, point at it. If it does not exist, it must be written before PR4, and it is a dependency of DRC too, so it should not be scoped as BPG work.
2. **The target-share numbers in §2.3 step 6.** Four product decisions carrying more weight than anything else in the product. G1 must resolve them. If the literature will not support thresholds, ship the Planner descriptive-only. That is an acceptable, honest outcome and the spec is built so it costs one artifact file to take.
3. **No `label_es` anywhere in the repository (§0.5).** Module 6's handoff is designed to need only the Snapshot's existing cross-language counting instruction, which already ships, so **module 6 does not block on a bilingual item bank.** But the plan asserts the bank exists from day one, and it does not. Either the LMC spec grows that requirement explicitly or the plan's claim is corrected.
4. **The quality weights, 1.00 / 0.40 / 0.10.** The `media` weight is defensible on `ev.input.kuhl2003`. The `ambient` weight at 0.40 is a judgment call with thinner support. G1 should look hard at it, and it lives in `planner.params.v1.json` precisely so it can move cheaply.
5. **Whether the Snapshot's `bilingual_note` should link to BPG.** That block is keel-governed copy on a live safety tool. Commercial linking from a concern surface deserves a deliberate decision, not a quiet PR. The default in this spec is no link from the concern path and a link only from the non-concern completion screen.
6. **D3 and module 6.** If the Navigator has not launched when BPG ships, module 6 references only the Snapshot. The flagged paragraph handles it without a recompile, but somebody has to remember to flip it.
7. **Spanish version of the course.** The obvious v2 and a real differentiator, per the plan. Hold until English proves demand. Note that the compiled-artifact architecture makes it a translation pass plus a recompile, not a rebuild, which is the same compounding the NSC spec claimed for its Spanish fast-follow.
8. **Legal read.** Module 6 is the closest any enrichment product in this portfolio comes to the medical-adjacent line. It stays on the right side of it by refusing to assess and by routing outward, but it should ride along with the D3 attorney review rather than getting its own engagement.

---

## 14. Definition of done, v1 launch

- PR1 through PR8 merged by Matthew. Cert report green. G1, G2, and G3 all cleared.
- Zero `verified: false` citations in any shipped artifact.
- The keel bilingual-softening scan passes on every BPG artifact, and the BPG planted-violation fixture fails as designed.
- The verbatim §3.4 sentence present in module 1, module 6, the Planner report, the sales page, and the lead magnet. Checked mechanically, not by eye.
- The four existing classes still work, at their existing URLs, on the new platform.
- The `bilingual` email segment exceeds 300 subscribers, and the launch goes to that segment, not cold.
- Ten beta households complete setup, block entry, and a report, with a coverage-suppression rate below 25% and zero lint sightings in the wild.
- The Household Language Plan printable is downloadable and prints correctly on both paper sizes.
