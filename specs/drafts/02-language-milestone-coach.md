# Language Milestone Coach (LMC): Build Spec v1 draft

**Status: draft for domain-expert review. Not approved. Nothing here is a
commitment to build.** A v0 of this product is already live (see §0.5); this
spec describes the membership product it becomes, and it inherits
`00-CONVENTIONS.md` in full. Where this spec and the portfolio plan §3.2
disagree, §2.4 names the disagreement and rules on it.

**Codename:** `lmc`. Consumer-facing name of the instrument: **Communication
Snapshot** (already shipped under that name). Product name for the membership
surface is Matthew's call; "Language Milestone Coach" is an internal label.

**Gates before content freeze:** (G1) citation verification for every
`verified: false` seed in §6.2; (G2) compile cost sign-off before any batch
authoring run; (G3) the floors review packet in `keel/REVIEW.md` flipping every
LMC artifact out of `drafted_pending_matthew_verification`.

---

## 0. Product summary

**One-liner:** A monthly parent-completed communication snapshot for children
roughly 6 to 36 months that compiles into a calm, evidence-tagged read on where
communication sits right now, a personalized monthly plan of language-building
strategies and activities, and conservative routing into the Milestone
Navigator when an observation crosses a research-backed line.

**Positioning:** not a screener, not a test, not a diagnosis. It is a
structured way to notice, plus the words to bring to a pediatrician if noticing
turns into a question. Built by a developmental scientist who co-developed a
published early comprehension measure, which is the credibility asset on the
product page and belongs there whichever instrument path v1 takes.

**Target segment:** members with a child 6 to 36 months. Two emotional
entrances: the parent who wants to help language grow, and the parent who is
quietly counting words at 2am. The product must serve both without letting the
first feel screened or the second feel dismissed.

**Architecture thesis:** zero runtime model calls. Instrument, interpretation
rules, and floors are frozen versioned JSON artifacts; the scoring engine is a
pure dependency-free ES module shared verbatim by the page and by CI. This is
already true of the shipped v0 and is not up for renegotiation.

### v1 scope

| In | Out (v1.x or never) |
|---|---|
| Communication Snapshot: 2 vocabulary estimates plus 12 behavior items | Word checklist by category (**not in v1**, see §2.4; possible v2 behind the CDI exclusion attestation) |
| Severity read: `none` / `watch` / `discuss` / `priority_discuss` | Percentiles, norms, standard scores, CDI comparability claims (**never** without a Brookes license) |
| Corrected age for children born more than 3 weeks early, under 24 months | Diagnosis, diagnostic labels, probability-of-diagnosis language (**never**) |
| Growth band (Emerging / Expanding / Established) as a **plan-routing** axis only (§2.4) | Band presented as the headline result, or as a score (**never**) |
| Monthly plan: 2 to 3 named strategies plus 4 to 6 prescribed Activity Library activities | Therapy. LMC never prescribes treatment; it prescribes conversation and everyday interaction |
| Monthly re-snapshot, progress view over vocabulary estimate and severity history | Child-facing screens, audio or video capture of the child (**never in v1**, privacy) |
| Concern routing into the Navigator with the snapshot pre-filled | Automated referral, contacting a clinician on the parent's behalf (**never**) |
| Printable visit notes | Spanish UI (v1.1; the item bank is authored bilingually from day one) |

**Success metric:** at least 60% of members with an in-range child complete a
first snapshot within 30 days of joining, and at least 40% of those complete a
second within 45 days.
**Rework trigger:** if the second-snapshot rate misses, the re-snapshot nudge
loop is rebuilt before any new product starts. The nudge loop, not the
instrument, is the suspect: the instrument is cert-gated and the nudge is not.

---

## 0.5 What already exists (verified against the repository, 2026-07-19)

This is the only spec in this folder describing a product with shipped code.
Read this section as constraints, not as background.

**Live surface.** `tools/communication-snapshot.html` is live, linked from
`tools/index.html`, present in `sitemap.xml`, and cross-linked from
`milestones.html`. It is the LMC v0. It is a single static page, free and
unauthenticated, with no account and no server round trip.

**The engine.** `keel/lib/lmc.mjs` (119 lines) is a pure, dependency-free ES
module exporting `compile`, `askedItems`, `correctedAge`, `evalCondition`,
`severityAtLeast`, and `SEVERITY_ORDER`. The browser page imports it from
`/keel/lib/lmc.mjs` and the CI grader imports the same file. Whatever the
module decides is exactly what CI certified. There are two copies of nothing.

**The artifacts**, all three at version `1.0.0` and all three carrying
`status: "drafted_pending_matthew_verification"`:

- `keel/artifacts/lmc/instrument.v1.json` defines the instrument: age range 6
  to 36 months, `vocab_says` and `vocab_understands` (asked from 9 months,
  bucketed in the UI, bucket boundaries deliberately aligned to the thresholds
  the rules use at 0, 10, and 50 so no bucket straddles a red line), and 12
  behavior items with `yes` / `sometimes` / `not_yet` values, except
  `lost_skills` which is `yes` / `no`. Items carry `asked_from_months` and
  optional `asked_until_months`; the UI hides items outside the child's
  corrected age window.
- `keel/artifacts/lmc/floors.v1.json` holds 8 floors: `skill_loss_any_age`
  (priority_discuss, any age), `no_response_to_name_12m`,
  `no_conventional_gestures_12m`, `no_pointing_to_show_15m`, `no_words_16m`,
  `late_talker_24m`, `no_one_step_directions_24m` (all discuss), and
  `bilingual_no_discount`, a policy floor with no case-grid condition.
- `keel/artifacts/lmc/interpretation.v1.json` holds 20 rules (7 mirroring the
  non-policy floors by construction, 3 additional discuss-level rules, 10
  watch-level rules), 4 severity templates, and 7 guidance blocks.

**Severity, not bands.** The shipped output is a single severity value
`none < watch < discuss < priority_discuss`, computed as the maximum severity
over all matched rules at corrected age. There are no bands anywhere in the
shipped code. See §2.4.

**No word checklist.** The instrument ships direct count estimates with bucket
labels, deliberately. `keel/artifacts/lmc/cdi_exclusion/README.md` is the
binding contract governing any future word list: a local-only
`cdi_reference.local.json` supplied by Matthew from materials he has legitimate
research access to, gitignored, never generated or reconstructed from memory,
with CI seeing only a hash-committed `attestation.json`. Because v1 asks for
counts and not items, that harness is a stub and the item-overlap question does
not arise at all.

**The grader.** `keel/graders/floors.mjs` (395 lines) evaluates the
interpretation artifact against a generated case grid: every integer age in the
instrument range, times every vocabulary bucket value, times every combination
of floor-referenced behavior values, with non-floor behaviors pinned to `yes`
(the hardest test, since extra absences can only raise severity). It also
checks referential integrity, condition-schema conformance, coverage (every
floor must be exercisable at its boundary age), and two hand-written
corrected-age cases. `keel/graders/selftest.mjs` runs it plus ten
planted-violation fixtures. A run on 2026-07-19 reports
**372,689 cases evaluated, all passing**, with all ten planted violations
correctly failing.

**Pending human verification.** `keel/REVIEW.md` is the working packet that
flips artifacts from drafted to verified: nine sources to pull, tier 1 floors,
tier 2 rules that exceed the floors, tier 3 factual claims in copy. The grader
proves the tool matches the artifacts. Only Matthew can prove the artifacts
match the literature. **Nothing in this spec ships before that packet is
signed.**

**Decision already locked.** `keel/DECISIONS.md` D2: Path A, original
instrument, qualitative bands, no percentile claims; Brookes licensing parked
as a v2 evaluation gated on LMC traction.

**What does not exist:** accounts, saved snapshots, monthly re-snapshot,
progress charting, the plan, guidance beyond the seven blocks, Activity Library
prescription, Navigator handoff with pre-filled data, emails, telemetry, and
the gold-set eval harness. That gap is what this spec is for.

---

## 1. Domain model

### 1.1 Primary routing key: severity

Severity is the product's spine and its safety contract. It is ordinal:

| Severity | Meaning to the parent | Product behavior |
|---|---|---|
| `none` | Nothing crosses a research-backed line right now | Plan only. Standing invitation copy included. |
| `watch` | Nothing crosses a line; something is worth noticing on purpose for 4 to 6 weeks | Plan plus a watch-on-purpose block plus a dated re-snapshot nudge. |
| `discuss` | An observation has reached the point where the research says bring it up | Plan plus visit script plus Navigator route. No invitation copy (the invitation is for parents who were told nothing was flagged; repeating it here would soften a real signal). |
| `priority_discuss` | Call and ask for an appointment soon, not at the next routine visit | Everything at `discuss`, plus the regression block, plus the Navigator route presented before the plan. |

Severity is the maximum across matched rules. It is never averaged, never
weighted, and never reduced by anything else in the snapshot. A child with
eleven strong items and one skill loss is `priority_discuss`.

### 1.2 Secondary routing keys

- `age_bucket` for plan selection: `6-11m`, `12-17m`, `18-23m`, `24-29m`,
  `30-36m`. Computed on corrected age.
- `tags` produced by matched rules: `expressive`, `receptive`,
  `social_communication`, `hearing`, `regression`. These drive guidance-block
  inclusion today and drive strategy selection in v1.
- `growth_band`: `emerging` / `expanding` / `established`, a plan-routing axis
  only, defined in §2.4 and constrained in §2.5.
- `primary_languages` for context copy only. It **never** enters a severity
  condition. The condition-schema guard in the grader makes this structurally
  checkable: a rule mentioning any field outside the declared vocabulary fails
  before any lexicon scan runs.

### 1.3 Corrected age

If the child was born more than 3 weeks early and chronological age is under 24
months, every age comparison uses corrected age counted from the due date, at
4.345 weeks per month. This is implemented in `correctedAge()` and is tested in
CI by two hand-written cases: a chronological 18-month-old born 8 weeks early
(about 16.2 months corrected) must still reach the `no_words_16m` floor, and
one born 12 weeks early (about 15.2 months corrected) must not.

**Named tradeoff (decided):** correcting age softens flags for preterm
children, which cuts against the product's conservative posture. Correction
wins anyway. Using birth date alone would flag a large share of preterm
children on arithmetic rather than observation, and a tool that cries wolf for
one predictable group teaches those parents to ignore it. The floors are
written at outer bounds precisely so that correction does not push a real
concern past the point of usefulness.

### 1.4 Age gating

Under 6 months and over 36 months, the snapshot is not offered. Under 6 months
the parent is routed to the milestone guide and the standing pediatrician line.
Over 36 months the parent is routed to the Navigator's Talking and
Understanding domains, which run to 40 months and carry the
stranger-intelligibility floor that LMC does not model.

---

## 2. Instrument and core loop

### 2.1 The instrument as shipped

Two vocabulary estimates and 12 behavior items, described in §0.5. The design
rules that are load-bearing and must survive any revision:

1. **`sometimes` is a real answer and never satisfies an absence condition.**
   Absence conditions match `not_yet` only. This is enforced in `evalCondition`
   and stated in the artifact contract. It is why the instrument can afford a
   three-value scale without inflating flags.
2. **Counts are across all languages the family speaks**, stated in the help
   text of both vocabulary items.
3. **Consistent word approximations count as words.** This makes `no_words_16m`
   strictly harder to trigger, which is the conservative direction for a floor
   that says "no words at all."
4. **Bucket boundaries align to rule thresholds.** No bucket may straddle 0,
   10, or 50. Any new threshold requires a bucket audit.
5. **Items are hidden outside their age window**, so a parent of an
   8-month-old is never asked whether the child combines two words.

### 2.2 The monthly loop

1. Parent opens the snapshot from the dashboard. Age prefills from the shared
   child profile; corrected-age question prefills from the profile if already
   answered.
2. Snapshot is chunked, resumable, and autosaved per section. Target 6 to 10
   minutes. The plan's 10 to 15 minute estimate assumed a word checklist; with
   count estimates the instrument is shorter, which is a retention asset.
3. `compile()` produces severity, matched flags, guidance blocks, corrected-age
   status, and effective age. No network call, no model call.
4. The report renders severity first, flags second, plan third, recap and print
   sheet last. On `discuss` and above, the Navigator route renders above the
   plan.
5. Re-snapshot opens 28 days after the last completed snapshot. It is nudged by
   email at 30 days and once more at 45 days, then not again until the parent
   returns. Watch-severity results additionally carry an in-report re-snapshot
   date 4 to 6 weeks out, matching the `recheck_plan` guidance block already
   shipped.
6. Progress view charts the vocabulary estimate and the severity history over
   time. It charts the child against the child, never against other children,
   and carries no reference curve of any kind.

**Named tradeoff (decided):** a 28-day re-snapshot lock frustrates the parent
who wants to retake it weekly after a worrying result. The lock wins. Weekly
retaking of an instrument with bucketed counts produces noise that reads as
movement, and the specific failure mode is a parent watching a fake improvement
and postponing a call. The unlock copy routes those parents to the Navigator or
to the visit script instead, which is what they actually needed.

### 2.3 Concern routing into the Navigator

Any compiled result at `discuss` or above renders a calm interstitial before
the plan. Copy pattern: name the specific observation, state that it is worth
discussing with a pediatrician, offer the Navigator to build the action sheet,
and offer the print sheet. Never a modal, never red, never an alarm sound,
never a blocking overlay the parent has to dismiss to see their plan.

The four thresholds named in the portfolio plan map onto shipped floors as
follows, and each is at least as conservative as the plan asked:

| Plan threshold | Shipped floor | Severity | Note |
|---|---|---|---|
| No words at 16m | `no_words_16m` | `discuss` | Exact match. |
| No combinations at 26m | `late_talker_24m` | `discuss` | Fires at **24m**, and also on fewer than 50 words alone. Stricter than the plan on both age and condition. |
| No pointing at 14m | `no_pointing_to_show_15m` | `discuss` | Fires at 15m for declarative pointing; `no_conventional_gestures_12m` fires at 12m when both gesture items are absent, so the 14m case is covered earlier by the gesture floor. |
| Loss of previously acquired words at any age | `skill_loss_any_age` | `priority_discuss` | The strongest routing, short-circuiting everything else, at any age from 6 months. |

The Navigator handoff passes: child id, corrected age, the matched flag ids,
and the tag set. It does not pass free text. The Navigator opens on the domain
implied by the highest-severity tag (`expressive` and `receptive` to Talking
and Understanding, `hearing` to Hearing and Responding, `social_communication`
to Social and Eye Contact, `regression` to Talking with the regression question
pre-answered). The two tools share floor ids where they overlap, and
`checkIntegrity` fails the build if a shared id carries different thresholds in
the two files. **The two tools can never disagree on a red line.**

### 2.4 The conflict this spec must resolve

The portfolio plan §3.2 describes a core loop built on "a word checklist
chunked by category" reported as bands named Emerging / Expanding /
Established. The shipped artifacts contain neither. This is a real conflict and
it resolves in two parts.

**Part one: the word checklist. The shipped design wins. No word checklist in
v1.** The reason is in `cdi_exclusion/README.md`. A category-chunked word
checklist for children 6 to 36 months is the artifact whose resemblance to the
MacArthur-Bates CDI is hardest to argue about, and defending it requires an
exclusion harness that cannot run until Matthew places a licensed reference
list on his own machine. Asking for a count estimate collects the same
progress-charting signal, takes a third of the time, and makes the question
disappear rather than manage it. The checklist is a v2 candidate, gated on: a
current attestation with zero collisions, a completed instrument-length review,
and evidence from telemetry that parents want finer granularity than buckets
give.

**Named tradeoff (decided):** the checklist yields a better vocabulary estimate
than a bucketed guess, and better estimates make the progress chart more
honest. The count estimate wins for v1 anyway, on three grounds: legal surface,
completion rate (the retention engine is monthly repetition, and a 15-minute
instrument repeated monthly is a churn mechanism), and the fact that every
threshold the product acts on sits at 0, 10, or 50 words, where a bucketed
estimate and a checklist rarely disagree.

**Part two: the bands. Both survive, on separate axes.** Severity stays the
headline and the safety spine. It is what the floors govern, what the grader
proves, and what routes to the Navigator. Bands come back as `growth_band`, a
plan-routing axis with no safety authority:

| Band | Rough shape | What it does |
|---|---|---|
| `emerging` | Communication is mostly pre-verbal for the child's age bucket: gestures, sounds, turn-taking, few or no words | Selects strategies about serve-and-return, gesture modeling, and imitation |
| `expanding` | Single words growing, combinations not yet established | Selects expansions, parallel talk, and wait time |
| `established` | Combinations in use, vocabulary well past the bucketed thresholds | Selects narration at length, question variety, and book-based dialogic strategies |

Band is computed by a frozen band table in the interpretation artifact keyed on
`(age_bucket, vocab_says bucket, combines_two_words, follows_one_step)`. It is
a pure function of the same snapshot, with no independent thresholds.

**Named tradeoff (decided):** one axis would be simpler to explain and simpler
to certify. Two axes win because collapsing them forces a choice between two
bad outcomes. If band carries the safety signal, then "Emerging" has to mean
both "a typical 9-month-old" and "a 24-month-old with no words," which is
either alarming or misleading depending on which parent reads it. If severity
carries the plan, then every `none` result gets the same plan regardless of
where the child actually is, which guts the coaching product. Separating them
lets the report say the calm true thing and the plan say the useful specific
thing.

### 2.5 Constraints binding the band axis

These are cert-enforced, and they exist so the band can never become a soft
back-channel around the floors:

1. Band never appears above severity in the report, and never in an email
   subject line, notification, or share card.
2. No band copy may reassure. Band copy describes what the plan is for. The
   never-diagnostic lint (§3.2) scans band copy with the same rules as the
   rest.
3. Band never modifies severity, and no interpretation rule may read
   `growth_band`. The condition-schema guard enforces this structurally: the
   allowed condition keys are `all`, `any`, `behavior`, `metric`, `op`,
   `value`, `meta`, and nothing else.
4. Band is never charted as a score, a level, or an axis with a target.
   Progress charts band as a labeled stripe, never as a number going up.
5. Every `(age_bucket, band)` cell must be reachable, and every band table row
   must resolve to a plan. Cert fails on a gap or an unreachable cell.

### 2.6 Licensing constraint (D2, restated as a build rule)

The MacArthur-Bates CDI is a licensed instrument published by Brookes
Publishing. The rules that bind every artifact and every marketing string:

- Never reproduce the CDI's item list, item ordering, category composition, or
  scoring.
- Never claim comparability with CDI norms, and never publish a percentile, a
  standard score, or a normed count.
- Wordbank's item-level data **is** CDI items. Using Wordbank may mean using
  its category structure and acquisition-trajectory statistics to inform
  original authoring. It may never mean copying items.
- Overlap on individual common words is unavoidable and fine. Individual words
  are not copyrightable. The distinctive thing is the list, not the word.
- Path B (approach Brookes for a digital license) stays parked per D2, revisited
  only on LMC traction.

---

## 3. Output and copy safety

### 3.1 Report structure

1. **Severity chip and headline**, from the frozen `severity_templates`.
2. **Lead paragraph** with `{age_phrase}` substituted.
3. **Standing invitation** on `none` and `watch` only: the parent-gut line
   already in `required_copy.parent_gut_invitation`. It is required copy, and
   the grader checks that the typical-range and none templates carry it.
4. **Matched flags**, sorted by severity, each with title and body from the
   interpretation artifact.
5. **Navigator route**, on `discuss` and above, placed above the plan.
6. **This month's plan:** 2 to 3 strategies plus 4 to 6 Activity Library
   activities (§4).
7. **Guidance blocks**, expandable, always including `talk_boost` and
   `bilingual_note`.
8. **Recap of what the parent shared**, plus the print sheet for the visit.
9. **Static, never-triggered pediatrician footer.** Static precisely so that
   seeing it carries no signal.

### 3.2 The never-diagnostic lint

This is the narrower lint of `00-CONVENTIONS.md` §5, not the enrichment lint.
LMC must be able to say "delay" and "typical range" honestly. It must never
imply a diagnosis, a probability of one, or a clinical judgment.

**Banned outright, case-insensitive with word boundaries, in every compiled
string and every UI string:**

`diagnos*`, `disorder`, `autism`, `autistic`, `ASD`, `apraxia`, `dyspraxia`,
`aphasia`, `syndrome`, `abnormal`, `deficit`, `impairment`, `pathology`,
`percentile`, `standard score`, `norm-referenced`, `screen positive`,
`screen negative`, `fails the screen`, `red flag`, `warning sign`, `alarming`,
`urgent`, `emergency`, `we recommend`, `you should`, `likely has`,
`probably has`, `suggests that your child`, `indicates that your child`,
`consistent with`, `rule out`, `CDI`, `MacArthur`, `Bates`, `Wordbank`.

**Banned patterns:** any sentence comparing the child to another named or
implied child; any sentence attributing a cause to an observation; any
imperative directed at the child's development rather than the parent's next
step; any use of a number as a score.

**Required, and checked positively:**

- Every `discuss` and `priority_discuss` template must contain a pediatrician
  route.
- Every `none` and `watch` template must contain the standing invitation.
- Every flag body must name a next step, not only an observation.
- The phrase family "worth discussing with your pediatrician" is the canonical
  routing phrase. Approved variants are enumerated in the artifact and the
  lexicon grader accepts only those.

**Approved vocabulary:** typical range, wide range, worth a conversation, worth
watching on purpose, not yet, right now, at this age, checkable, evaluation,
early intervention, hearing test, speech-language pathologist.

**Bilingual softening scan** (the `bilingual_no_discount` policy floor): no
string may pair a language-exposure phrase with a waiting or discounting phrase.
The shipped `bilingual_note` block states the opposite explicitly, and that
posture is a floor, not a preference.

Reading level: grade 7 or below across all compiled copy, mechanically checked
at cert. Note this is stricter than the grade 8 that the enrichment products
carry, because a parent reading a `discuss` result is reading under stress.

### 3.3 Tone

Calm, specific, second person, short sentences. Never breezy about a real flag
and never grave about a typical result. Two shipped lines are the tone
reference: the parent-gut invitation, and the `discuss` lead that says this is
not a diagnosis and not an emergency, it means the child has earned a proper
look from someone who can actually evaluate. Every new string is written to sit
beside those two without a seam.

---

## 4. Content library

### 4.1 Strategy blocks

Roughly 30 to 40 named strategy explainers, model-drafted and Matthew-verified,
each carrying sources. Illustrative shape:

```json
{
  "id": "strategy.expansion",
  "name": "Add one word",
  "age_buckets": ["12-17m", "18-23m", "24-29m", "30-36m"],
  "bands": ["expanding", "established"],
  "tags": ["expressive"],
  "one_line": "Take what your child says and give it back with one more word.",
  "body": "…4 to 8 sentences, grade 7, second person…",
  "in_practice": ["…3 concrete moments from ordinary routines…"],
  "activity_ids": ["act.book.label-and-wait", "act.snack.choice-offer"],
  "sources": ["…citation ids…"],
  "evidence": { "strength": "…", "consensus": "…" }
}
```

Seed strategy set by band: serve and return, gesture modeling, imitation games,
sound play and babble echoing (`emerging`); expansions, parallel talk, wait
time, choice offering, labeling in routines (`expanding`); narration at length,
open questions, story recall, dialogic reading moves, describing before naming
(`established`). Cross-band: reading every day, screen-free talk windows,
following the child's lead.

### 4.2 Coverage matrix (cert-enforced)

Every `(age_bucket, growth_band)` cell must resolve to at least 3 eligible
strategies and at least 8 eligible activities, so a plan of 2 to 3 strategies
and 4 to 6 activities can be built without repetition inside a two-month
window. Fifteen cells (5 buckets by 3 bands). Every cell reachable; no cell
empty; no dangling activity id; no dangling source id.

### 4.3 Plan assembly

The plan is a pure function of `(age_bucket, growth_band, tags, month_index)`.
`month_index` rotates the selection so the second snapshot's plan is not the
first snapshot's plan. Tag presence promotes matching strategies to the top;
tags never add or remove a flag. A `hearing` tag never yields a strategy, only
the hearing guidance block, because the correct response to a hearing question
is a hearing test and not a talking activity.

### 4.4 Guidance blocks

The seven shipped blocks (`hearing_check`, `regression_next_steps`,
`talk_boost`, `visit_script`, `recheck_plan`, `corrected_age_note`,
`bilingual_note`) stay as they are, subject to the REVIEW.md read. v1 adds
blocks for the Navigator handoff, the progress view, and the first-snapshot
onboarding. Every added block carries the same inclusion vocabulary already
implemented in `compile()`: `always`, `when_tags`, `min_severity`,
`exact_severity`, `when_corrected`.

---

## 5. Architecture

### 5.1 Protocol as code, content as compiled artifact

The split is already made and is correct: the scoring engine is auditable
TypeScript-shaped JavaScript in `keel/lib/lmc.mjs`, and everything a parent
reads is data in a versioned artifact. v1 keeps the split and adds artifacts,
never logic.

### 5.2 Artifacts

| Artifact | Contents | Status today |
|---|---|---|
| `lmc/instrument.v1.json` | Items, ages, help text, buckets | Shipped, pending verification |
| `lmc/floors.v1.json` | 8 floors, red lines only | Shipped, pending verification |
| `lmc/interpretation.v1.json` | 20 rules, 4 templates, 7 guidance blocks, required copy | Shipped, pending verification |
| `lmc/bands.v1.json` | Band table, band copy, plan-routing keys | **New in v1** |
| `lmc/strategies.v1.json` | 30 to 40 strategy blocks per §4.1 | **New in v1** |
| `lmc/plans.v1.json` | `(age_bucket, band, tags, month_index)` to ordered strategy and activity ids | **New in v1** |
| `shared/floor_sources.v1.json` | 9 sources shared with the Navigator | Shipped, pending verification |
| `lmc/cert.report.v1.json` | Grader output; runtime refuses artifacts without a matching passing report | **New in v1** |

Any artifact change bumps its version. Runtime pins exact versions. Every
compiled report records the artifact versions it was produced under, so a
progress chart spanning an artifact change can be annotated honestly rather
than silently re-scored.

### 5.3 Migration from the static page

The live page stays live and free. It is the top-of-funnel taste and it is
indexed. The membership build adds persistence, the plan, progress, and the
Navigator handoff behind auth, importing the same engine and the same
artifacts. **Under no circumstances does the membership build fork the engine
or the artifacts.** If the two surfaces ever produce different severities for
the same answers, the product has lost its only real claim.

Anonymous-to-member continuity: a parent who completes the free snapshot and
then joins can carry that one result forward from local storage at their
explicit choice. Nothing is uploaded silently.

### 5.4 Runtime model calls

Zero for scoring, banding, and plan assembly. One optional scoped exception,
shipped only if it clears cert and dropped without regret otherwise: an
explain-my-plan box restricted to explaining the delivered plan, with a frozen
system prompt, fail-closed on anything diagnostic, refusing any question about
whether the child has a condition, and certified against a reject-hold set
before launch. **If in doubt, ship without it.** The product is complete
without it and the failure mode is severe.

---

## 6. Evidence layer

### 6.1 Two-axis tags

Every strategy and every guidance claim carries `strength` and `consensus`
chips in the shared Claims Library visual language. Floors and rules carry
source ids rather than chips, because a red line is not a research finding to
be weighed, it is a threshold to be cited.

### 6.2 Seed citation table

⚠ **G1 gate.** Every `verified: false` row must be checked against the actual
paper before content freeze: full cite, findings, effect sizes. No artifact
ships carrying a `verified: false` row. Do not ship numbers from memory, and do
not fill in a volume or a DOI by guessing.

**Pool A, carried from `keel/artifacts/shared/floor_sources.v1.json`** (drafted
and pending Matthew's read per `keel/REVIEW.md`, and reused here unchanged):

| id | Role in LMC | verified |
|---|---|---|
| `zubler2022` | Typical-range framing; the 2022 CDC milestone revision | true |
| `cdc_ltsae` | Public-domain milestone checklists | true |
| `filipek1999` | No babbling by 12m, no gesturing by 12m, no single words by 16m, no two-word phrases by 24m, any loss at any age | true |
| `aap_referral` | Surveillance to screening to referral pathway | true |
| `rescorla1989` | Late-talker criterion at 24m | true |
| `jcih2019` | Caregiver hearing concern warrants audiological referral; no wait and see | true |
| `zwaigenbaum2015` | Response to name by 12m; joint attention and pointing to show; regression | true |
| `flipsen2006` | Intelligibility; used by the Navigator, cited by LMC only in the over-36m handoff copy | true |
| `noritz2013` | Motor floors; not used by LMC rules, listed because the shared file is referentially checked | true |

**Pool B, organizational sources from `corpus/citations.json`**, available to
LMC copy under the existing registry rules (`zero-to-three`, `naeyc`,
`pathways`, `harvard-serve-return`, and the rest of the 11 registered entries):
`verified: true` as registered, with the same standing rule that a registered
organizational source backs framing, never a threshold.

**Pool C, new seeds proposed by this spec for the strategy library.** These are
**not verified**, are named at the level of author and topic only, and carry no
invented volume, page, or DOI. Each requires a full G1 pass that produces the
complete citation before it may appear in an artifact.

| Seed id | Anchor (author and topic only) | Claim scope | verified |
|---|---|---|---|
| `ev.lmc.dialogic-reading` | Whitehurst and colleagues, dialogic reading with young children | Adult questioning and expansion during shared book reading supports expressive vocabulary | **false** |
| `ev.lmc.responsivity` | Tamis-LeMonda and colleagues, maternal responsiveness and language milestones | Prompt, contingent responses to child communication relate to timing of language milestones | **false** |
| `ev.lmc.input-quantity` | Hart and Risley, and the substantial later literature revisiting it | Quantity and quality of child-directed talk relate to vocabulary growth; the replication debate must be represented honestly rather than the headline number repeated | **false** |
| `ev.lmc.conversational-turns` | Romeo and colleagues, conversational turns and language outcomes | Back-and-forth turns, not adult word count alone, carry much of the association | **false** |
| `ev.lmc.gesture-predicts` | Rowe and Goldin-Meadow, early gesture and later vocabulary | Early gesture use predicts later vocabulary, supporting gesture items and gesture-modeling strategies | **false** |
| `ev.lmc.late-talker-outcomes` | Late-talker outcome literature following Rescorla's cohorts | Many late talkers catch up and a minority do not, which is why the product routes to conversation rather than reassurance or alarm | **false** |
| `ev.lmc.bilingual-no-delay` | Bilingual first language acquisition literature, total-vocabulary counting | Bilingual exposure does not cause language delay; conceptual vocabulary counted across languages is the appropriate measure | **false** |

`ev.lmc.input-quantity` renders as an honesty card in the strategy library:
what the original claim was, what replication showed, and what the product does
about it. The anti-pseudoscience posture made tangible, exactly as the Number
Path spec does with its exclusion note.

---

## 7. Certification harness

### 7.1 Inherited and already green

`node keel/graders/selftest.mjs` runs the floors grader over the generated case
grid (372,689 cases on the 2026-07-19 run) plus ten planted-violation fixtures,
and must stay green on every PR. Any change to the instrument, a threshold, or
a severity class in this product must state how the grader continues to pass,
and must assume the ten fixtures still fail.

**How the v1 additions keep it passing.** Bands, strategies, and plans are
downstream of `compile()` and cannot influence it: they read the compiled
result and never feed it. No new field enters a rule condition, so the
condition-schema guard is unaffected. The case grid is unchanged because the
floor-referenced behavior set is unchanged. If v1 ever adds a rule, it may only
flag earlier or harder, and the grid will prove it.

### 7.2 The gold-set eval gate

40 synthetic child profiles, authored by Matthew, each carrying an expected
band, an expected guidance set, and an expected concern-flag set. CI requires
**40/40 identity on band and 40/40 identity on flags** before any
`interpretation.v1.json` or `bands.v1.json` version ships. Nothing merges on a
red run, and no threshold is adjusted to make a profile pass without a written
note in the PR saying which is wrong, the rule or the label.

Composition, so the set does not become 40 easy cases:

| Slice | Count | Purpose |
|---|---|---|
| Typical across the age range | 8 | Every age bucket produces `none` when it should |
| Watch-tier only | 6 | Watch rules fire without leaking into `discuss` |
| Single-floor cases, one per non-policy floor | 7 | Each floor fires exactly at its boundary |
| Boundary pairs, one month either side of a floor | 6 | Off-by-one detection |
| Corrected-age cases | 4 | Including one that crosses a floor only after correction |
| Multi-flag cases | 4 | Maximum-severity behavior, not accumulation |
| Regression cases | 3 | `priority_discuss` short-circuits, including one otherwise entirely typical |
| Band-boundary cases | 2 | Same severity, different band, different plan |

### 7.3 Static checks per artifact

1. JSON Schema validation for every artifact.
2. Never-diagnostic lint (§3.2), zero tolerance, with red-team fixtures proving
   the lint catches planted violations.
3. Reading level at grade 7 or below.
4. Coverage matrix (§4.2); every `(age_bucket, band)` cell populated and
   reachable.
5. Every strategy carries at least one source; every source id resolves; every
   citation row is `verified: true`.
6. Every artifact hash has a matching passing cert report, or the runtime
   refuses to load it. This mirrors the refusal already implemented in
   `nsc/lib/artifacts.ts`.
7. Attestation check: if a future version ships any word list, the artifact
   cannot promote past the review queue without a current `attestation.json`
   matching its version and reporting zero collisions.

---

## 8. Data model

**No DDL in this file.** Prose and annotated field lists only. A real migration
is written after approval, in the owning app's migrations directory.

**Children** is the shared spine record from the Phase 0 infrastructure work,
extended with `primary_languages` (list of language tags, used for context copy
only) and `weeks_early` (integer, 0 for full term). Nickname and birth month,
never a full birth date, never a full legal name if the parent does not offer
one.

**Snapshots.** One row per completed or in-progress snapshot: owning child,
taken-at timestamp, instrument version, status (in progress, complete,
abandoned), and the responses map. Responses hold the two vocabulary bucket
values and the behavior answers by item id. **The responses map is the sensitive
payload of this product** and is treated accordingly in §8.1.

**Compiled reports.** One row per compiled snapshot: owning snapshot, severity,
growth band, vocabulary estimate, matched flag ids, guidance block ids, plan
id, artifact versions (all of them, individually), created-at. Reports are
immutable. Recompiling under a new artifact version writes a new report and
annotates the progress chart rather than rewriting history.

**Plans.** One row per served monthly plan: owning report, routing key, ordered
strategy ids, ordered activity ids, month index, artifact version.

**Snapshot items.** The instrument itself lives in the artifact, not a table. If
a table is ever needed for authoring workflow, it holds id, item type, category,
`label_en`, `label_es`, sort order, and the instrument versions in which the
item is active. The artifact remains the runtime source of truth.

**Guidance and strategy content.** Artifact-resident, not table-resident. The
admin review queue tracks approval state by artifact version.

**Access control.** Every row is owner-scoped at the database level. No
cross-user read is possible, including for support. There is no admin surface
that displays a named child's snapshot responses.

### 8.1 Data sensitivity

Snapshot responses are developmental data about a named child. Binding rules:

- **No snapshot content in analytics events, ever.** The event is
  `snapshot_completed` with properties limited to severity, band, and age
  bucket. No item answers, no vocabulary value, no flag ids, no child id.
- **Excluded from session-replay tooling** at the DOM level, by attribute, not
  by URL rule, so a route change cannot leak it.
- **Export and hard delete** from the account page. Delete is a real delete of
  responses and reports, not a soft flag, and it cascades from the child record.
- **Not in email bodies.** Re-snapshot nudges say a snapshot is due. They never
  restate a result, a flag, or a severity.
- **Not in URLs.** No severity, flag, or child identifier in a query string,
  including on the Navigator handoff, which passes state through the session
  rather than the address bar.
- **No third-party tag on the snapshot or report routes.** Not analytics
  vendors, not ad pixels, not heatmaps.
- **Print sheet is client-side only.** The visit notes are assembled in the
  browser, as they already are in the shipped page, and never round-trip.

---

## 9. Screens

Tidepool tokens throughout: deep teal ink `#15393C`, brand teal `#1E5F62` for
action, coral `#DE7356` as the single warm accent, aqua mist `#F0F5F3` ground,
Bricolage Grotesque for display and Source Serif 4 for body, pill controls at
48px, 14px card radius. Coral is reserved for the severity chip at `discuss`
and above and for nothing else in this product, so its meaning stays legible.
No gradient hero, no hospital blue, no deficit framing.

1. **Snapshot intro.** What this is, what it is not, how long it takes, and the
   pediatrician footer. One screen, one primary action.
2. **Age and prematurity.** Prefilled from the child profile. The corrected-age
   note appears inline the moment it applies, not later in the report.
3. **Vocabulary estimates.** Two questions, bucket chips, help text visible by
   default rather than behind an info icon, because the counting rules change
   the answer.
4. **Behavior items**, chunked by section with progress indication, three large
   value buttons per item, autosaved per section, resumable across days.
5. **Report.** Order fixed by §3.1. Severity chip, headline, lead, invitation
   or route, flags, plan, guidance, recap, print.
6. **Navigator interstitial**, on `discuss` and above. Calm, one paragraph, two
   actions: build the action sheet, or continue to the plan. Never blocking.
7. **Monthly plan.** Strategies with in-practice moments, then prescribed
   activities, then the re-snapshot date chip.
8. **Progress.** Vocabulary estimate over time as a simple line, severity
   history as labeled dots, band as a stripe. No reference curve, no target, no
   comparison to other children, no projection.
9. **Print sheet.** Already implemented in v0: a clean, black-on-white visit
   summary listing what the parent shared and the flagged items.

Accessibility: every item answerable by keyboard, severity never conveyed by
color alone (chip carries text), `prefers-reduced-motion` honored, one
restrained reveal on the report and nothing else.

---

## 10. Ecosystem slot

**Layer 2, Growing Minds Membership** ($9/mo or $79/yr per D7). LMC is the
flagship membership tool and the deepest moat, and the monthly re-snapshot is
the retention engine for the whole membership. The free Communication Snapshot
stays in **Layer 1** as the taste: one result, no account, no plan, no
progress, no saved history.

**Named tradeoff (decided):** giving the full severity read away free weakens
the paywall. It stays free anyway. Withholding a conservative safety read from
a worried parent to protect a $9 subscription is the wrong trade on the merits,
and the free read is also the single best demonstration of what the membership
is made of. The paid boundary sits at the plan, the history, and the progress
chart, which is where the recurring value actually is.

Cross-links to the other five products:

| Product | Link direction | Mechanism |
|---|---|---|
| **Milestone Navigator** (Layer 1, free) | LMC routes out at `discuss` and above; Navigator routes in when a parent's answers are language-shaped and they are a member | Shared floor ids, referentially checked so the two can never disagree on a threshold. Navigator launch is blocked on D3 attorney review; the LMC handoff ships dark and enables with the Navigator. |
| **Intention-Based Activity Library** (Layer 2) | LMC prescribes into it | Plans reference activity ids filtered to the language domain, band, and age bucket. The Activity Library must expose that filter; LMC does not maintain its own copy. |
| **Claims Library** (Layer 1 free summaries, Layer 2 full) | LMC cites out | Strategy evidence chips deep-link to claim pages, including the honesty card for the input-quantity literature. |
| **Dialogic Reading Coach** (Layer 2) | LMC prescribes into it at `established` band, and it prescribes back | Shared reading-strategy vocabulary; DRC is the depth version of what LMC's book strategies introduce. |
| **Bilingual Parenting Guide** (Layer 3 course, $69) | LMC surfaces it contextually | The bilingual guidance block links to module 6. The item bank's `label_es` authoring is what makes that module's tooling possible, which is why bilingual authoring is a day-one requirement and not a v1.1 nicety. |
| **Number Path** (existing, $34 one-time, also included in membership) | Sibling, not linked in-flow | Shares the compile-and-certify pattern and the shared child profile. A parent with both sees both children's cards on one dashboard. Entitlements are additive; buying nothing revokes anything. |

---

## 11. Telemetry

Aggregate and anonymized. Nothing in this section may violate §8.1.

| Signal | Target | Why |
|---|---|---|
| Join to first snapshot within 30 days | ≥ 60% of members with an in-range child | The success metric |
| First to second snapshot within 45 days | ≥ 40% | The retention engine; missing it triggers the nudge rebuild |
| Snapshot start to complete | ≥ 85% | The instrument is short; a lower rate means an item is confusing |
| Per-section abandon rate | No section above 5% | Locates the confusing item without reading answers |
| Median completion time | ≤ 10 minutes | Guards the monthly cadence |
| Severity distribution by age bucket | Monitored, never surfaced to users | If the home-administered distribution drifts far from the literature, the instrument's wording needs work. Product health only. |
| Navigator handoff take-rate at `discuss` and above | Monitored, no target | A target here would create pressure to route more or less than the floors say. There is no correct number. |
| Plan open rate, strategy expand rate | Monitored | Content pruning signal for the next compile |

Explicitly not collected: item-level answers, vocabulary values, flag ids, and
any per-child event property beyond severity, band, and age bucket.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge, cost flag before any batch compile.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR0** `lmc/verify-artifacts` | Work `keel/REVIEW.md`; flip all three LMC artifacts plus `floor_sources` out of drafted status | Every checkbox in REVIEW.md signed; `selftest.mjs` green after any edits; any threshold change documented in DECISIONS.md |
| **PR1** `lmc/persistence` | Auth-gated snapshot storage, resumable and autosaved, owner-scoped access, export and hard delete | Cross-user read impossible in tests; delete cascades and leaves no report rows; analytics payload asserted to contain no snapshot content |
| **PR2** `lmc/bands` | `bands.v1.json`, band computation downstream of `compile()`, band copy through the lint | Every `(age_bucket, band)` cell reachable; no rule reads band; `selftest.mjs` still green; lint green on band copy |
| **PR3** `lmc/strategies` | Strategy artifact authored and graded, Matthew-approved through the review queue (**cost gate G2 first; G1 flips the `verified` flags**) | Coverage matrix green; every strategy sourced; zero `verified: false` rows in the shipped artifact |
| **PR4** `lmc/plans` | Plan assembly, Activity Library prescription join, plan screen | Every routing key resolves; no repeat inside a two-month window; every activity id resolves in the Activity Library |
| **PR5** `lmc/goldset` | 40 synthetic profiles per §7.2, harness wired into CI as a merge blocker | 40/40 band identity and 40/40 flag identity; a deliberately mislabeled profile fails the run |
| **PR6** `lmc/progress` | Progress view, monthly re-snapshot unlock, nudge emails via Loops (D6) | 28-day lock enforced server-side; emails contain no result content |
| **PR7** `lmc/navigator-handoff` | Interstitial, pre-filled handoff, shared-floor consistency test (**ships dark until D3 clears**) | Handoff carries no free text and no URL parameters; shared floor ids identical across both files |
| **PR8** `lmc/polish` | Telemetry, a11y pass, reading-level pass, session-replay exclusion attributes | Lighthouse a11y ≥ 95; replay exclusion verified on the report route by attribute, not URL rule |

PR0 blocks everything. PR2 and PR3 can run in parallel after PR1. PR5 should
land before PR3's content is approved, so the gold set grades the content
rather than trailing it.

---

## 13. Risks and open decisions

1. **The artifacts are unverified.** The grader proves the tool matches the
   artifacts; nobody has yet proved the artifacts match the literature. This is
   the single largest risk in the product and PR0 exists to close it.
   `keel/REVIEW.md` flags the weakest items itself: the under-10-words-at-18m
   watch threshold is the most invented number in the set, and the
   both-gestures-absent encoding of the Filipek gesture criterion needs a
   fidelity read.
2. **`no_babble_12m` is a discuss-level rule but not a floor.** REVIEW.md
   suggests promoting it in v1.1. Matthew's call. Promotion is safe for the
   grader (a floor that an existing rule already satisfies) and would make the
   red line explicit rather than incidental.
3. **Bands are new surface area.** They are constrained hard in §2.5, but they
   are still a place where reassuring copy could grow. Recommend the lexicon
   grader treat band copy as the strictest tier.
4. **Free tier boundary.** §10 recommends free severity, paid plan. If that
   proves to be the wrong revenue trade, move the progress chart, not the
   severity read.
5. **The explain-my-plan model box** (§5.4). Recommend not shipping it in v1.
   The certification cost is real and the product does not need it.
6. **D3 blocks the Navigator, and therefore blocks the handoff.** LMC can ship
   without the handoff if it must, with `discuss` results routing to the print
   sheet and the visit script alone. Confirm that fallback is acceptable rather
   than assuming it.
7. **Word checklist in v2.** Requires the CDI exclusion attestation, which
   requires materials only Matthew can supply. Do not begin it as a side
   project; it is a gated build.
8. **Over-36-months parents.** The instrument stops at 36 months and the
   Navigator picks up. Confirm the handoff copy does not read as being turned
   away.
9. **Legal read of the never-diagnostic posture.** The lint plus the static
   footer is the engineering control. A scoped human read of the four severity
   templates and the Navigator interstitial is cheap insurance and can fold
   into the D3 attorney scope.

---

## 14. Definition of done

- `keel/REVIEW.md` signed and dated; all four LMC-relevant artifacts out of
  `drafted_pending_matthew_verification`.
- `node keel/graders/selftest.mjs` green, with the full case grid passing and
  all ten planted violations failing.
- Gold set at 40/40 band identity and 40/40 flag identity, wired as a merge
  blocker.
- Never-diagnostic lint green across every compiled string, proven against
  red-team fixtures; reading level at grade 7 or below.
- Zero `verified: false` citations in any shipped artifact.
- No snapshot content in any analytics event, any email, any URL, or any
  session replay, verified by test rather than by inspection.
- Export and hard delete working end to end from the account page.
- Free snapshot and member snapshot produce identical severity for identical
  answers, asserted in CI against the same engine and the same artifacts.
- A beta cohort of at least 10 families completes a first snapshot, a plan, and
  a second snapshot, with zero banned-language sightings in the wild.
