# Intention-Based Activity Library: build spec v1 (draft)

> **Status: draft for domain-expert review. Not approved. Nothing has been
> built from this document.** Parts of this product already exist in the
> repository (see §0.5); this spec inventories that surface and specs forward
> from it. Where the portfolio plan and the shipped code disagree, the
> disagreement is named, not smoothed over.

**Product:** Intention-Based Activity Library (portfolio plan §3.1).
**Codename:** `activities` (already the route and table name; no rename proposed).
**Inherits:** `specs/drafts/00-CONVENTIONS.md` in full. Conventions are not restated here.
**Gates before content freeze:** G1 citation verification (§6), G2 batch compile cost sign-off (§5.4), G3 IP position confirmation (D1, §13).

---

## 0. Product summary

**One-liner:** A filterable library of developmental activities for ages 0 to
36 months (extendable to 60 months), where every activity states the
developmental intention in one plain sentence and carries an easier version and
a harder version, plus two habit surfaces (Today's 3 and the printable weekly
plan) that convert a browse product into a Monday-morning routine.

**Positioning:** the opposite of Pinterest activity content. Every entry says
what it is for in mechanism terms, uses materials already in the house, and is
graded mechanically before a human sees it. The intention line is the product.

**Target segment:** parents of 0 to 3s who want structure without a curriculum,
and who have been burned by activity content that is really a craft-supply
shopping list. Secondary: the worry-track parent handed off from the Navigator
or the Communication Snapshot, who needs something constructive to do.

**Architecture thesis:** zero runtime model calls. Fable drafts activities
offline in batches, a deterministic TypeScript grader hard-fails them before
they reach a queue, Matthew approves each by hand, approved rows publish.
Runtime selection (Today's 3, weekly plan) is pure deterministic TypeScript over
the published catalog, seeded by child id and date, property-tested.

### v1 scope

| In | Out (v1.x or never) |
|---|---|
| 150 to 300 activities, 0 to 36 months | 36 to 60 month extension (v1.1, schema already allows it) |
| Six domains, controlled mechanism vocabulary | Free-text "developmental benefit" prose (never; that is the thing being replaced) |
| Browse and filter, public detail pages | Child-facing screens or child accounts (never) |
| Today's 3, deterministic daily picks | Model-generated per-child activities at runtime (never; cost, safety, and audit all fail) |
| Printable weekly plan with mess and time budget | Video demonstrations (v2 at the earliest; production cost) |
| 20 free sample activities as public SEO pages | Percentiles, norms, or scoring of any kind (never; enrichment product) |
| Completion logging and domain coverage | Community submissions or user-generated activities (never; the grader cannot certify what it did not draft) |
| Favorites | Spanish locale (v1.1; `locale` column already exists) |

**Success metric (one, from the plan):** at least 40% of active members open the
weekly planner in a given week by month 2.
**Rework trigger:** below 40% at month 2, the planner is redesigned before any
new product starts. Not the library, the planner. The library is not the
retention surface and must not be blamed for the planner's failure.

---

## 0.5 What already exists (inventory, verified against the code 2026-07-19)

This section exists because the product is partly built and a spec that ignores
that would generate rework. Every claim below was read out of the file named.

### Shipped and working

| File | Lines | What it is |
|---|---|---|
| `nsc/lib/activity-types.ts` | 61 | Six domains, three settings, six age bands (0-6, 6-12, 12-18, 18-24, 24-30, 30-36m), `ActivityMaterial`, `ActivityDraft`, `ActivityRow` |
| `nsc/tools/activities/mechanisms.ts` | 61 | Controlled vocabulary: **44 mechanism tags** across the six domains, each with a one-line gloss |
| `nsc/tools/activities/safety.ts` | 113 | Under-36m hazard lexicon: **10 absolute** patterns (balloon, button and coin cell, magnet, marble, coin, hard candy, popcorn, whole nut, gum, plastic bag) and **6 mitigable** patterns (grape, hot dog, cherry and grape tomato, string and cord, small beads and buttons, water basin), each mitigable pattern paired with a mitigation regex that may be satisfied by the same string or by `safety_notes` |
| `nsc/tools/activities/grader.ts` | 208 | Eight checks: required-fields, enums, mechanism-vocabulary, safety-lexicon, readability, banned-language, materials-household, duplicate-similarity. `gradeActivity` and `gradeBatch` |
| `nsc/tests/activities-grader.test.ts` | 204 | 12 planted violations, each asserted to fail on its intended check; the clean base draft asserted to pass every check; batch-001 asserted grader-clean, 18 drafts, 3 per band, 1 free per band, unique slugs |
| `nsc/tools/activities/batches/batch-001.json` | 479 | **18 drafts**, 3 per band across all six bands, 6 marked `is_free` |
| `nsc/lib/activities.server.ts` | ~55 | `listActivities` with band-overlap, domain, theme, mess, duration, setting filters; `getActivity` by slug. Both fail soft to empty rather than crashing when the table is absent |
| `nsc/lib/todays-three.ts` | ~150 | Deterministic daily picks: age pool, 14-day recency exclusion with oldest-first backfill, 28-day domain-coverage ranking, date-rotated domain priority, FNV-seeded hash tie-break |
| `nsc/lib/weekly-activity-plan.ts` | present | Weekly plan generator behind `/activities/week` |
| `nsc/app/activities/page.tsx` | 213 | Browse and filter |
| `nsc/app/activities/[slug]/page.tsx` | 130 | Detail page, steps gated on `is_free` or a live membership entitlement |
| `nsc/app/activities/today/page.tsx` + `actions.ts` | 274 + 58 | Today's 3, child creation, `markDone` |
| `nsc/app/activities/week/page.tsx` | 231 | Printable weekly plan with mess and time budget in the query string |
| `nsc/app/admin/page.tsx` + `actions.ts` | 147 + 190 | Review queue index, batch import, approve, reject, save edits. Approve **re-grades at decision time** and refuses to publish a failing draft |
| `nsc/app/admin/review/[id]/page.tsx` | 150 | Per-item review view with the grader report |
| `nsc/tests/todays-three.test.ts`, `nsc/tests/weekly-activity-plan.test.ts` | present | Determinism and coverage property tests for both habit surfaces |

Read as PR coverage against the plan's own sequence: **PR1 through PR4 are
substantially built, PR6 (free gating) is built, PR5 is the real gap.**

### Drafted, not published

`batch-001.json` holds 18 activity drafts. They are grader-clean and slug-unique
(the test suite proves both), and they are the only content that exists. Nothing
in that batch has been approved or published, because approval is a manual act
in the queue and the queue runs against a live database. Against a 150-activity
floor, **the library is at roughly 12% of minimum content and 0% of published
content.**

### Migration status: the brief and the repository disagree

The dispatch brief states migration 0006 is not yet applied, and `nsc/README.md`
supports that reading (it labels `0006_activity_library.sql` with an
apply-to-the-project warning). `docs/phase-3-identity-convergence.md`
contradicts it directly, listing migrations 0005, 0006, and 0007 as already
applied to the dedicated Supabase project, marked done, no action.

**This spec treats the README warning as stale and the phase-3 note as
current**, because phase-3 is the later operational record and the shipped code
paths assume the tables resolve. That is not a safe inference to build on.
**Open decision D-AL-1 (§13): confirm against the live project and correct the
loser.** No batch imports until it is settled, because an import against a
missing table fails silently through the fail-soft read path.

### Not built

- Printable activity cards and an activity-specific print stylesheet. The weekly
  plan has a print button; individual activities do not.
- Favorites.
- Domain-coverage donut per child.
- The 20 free samples as public, individually indexed SEO pages. Only 6 free
  activities exist, and there is no per-activity metadata or structured data.
- Any evidence-tag linkage. `evidence_note` is free prose with no citation id.
  This is the largest structural gap versus the Number Path pattern (§6).
- Embedding-based duplicate detection. The grader ships a token-set Jaccard
  stand-in, documented as such in the source.

### Named contradictions between the plan and the shipped code

1. **Status vocabulary.** The plan's data model uses `draft | approved |
   published`. The shipped type and the migration use `draft | published |
   retired`, with approval represented by the review item's own status rather
   than the activity row's. **The shipped model wins.** Approval is a queue
   event, not a content state, and `retired` is a real need the plan omitted.
2. **Duplicate threshold.** The plan specifies embedding cosine above 0.92 via
   pgvector. The grader implements token-set Jaccard above 0.60. **The Jaccard
   stand-in wins for v1** (see §7.3): it is deterministic, needs no provider, is
   already proven against a planted near-duplicate, and 0.60 on a token set is
   deliberately stricter than it sounds because tokens under four characters are
   dropped. Revisit at 150 activities, where the false-positive rate starts to
   cost real drafts.
3. **Completion uniqueness.** The plan writes `unique (child_id, activity_id,
   completed_at::date)`. The shipped migration stores a plain date column and
   makes the triple unique directly. **The shipped model wins**; it is the same
   constraint without an expression index.

---

## 1. Domain model

### 1.1 Primary routing key

The primary key is **integer age in months**, not a band. Bands are display
labels derived from months, which is why `ACTIVITY_BANDS` lives in a types file
and not in the database. This is load-bearing: it lets the library join cleanly
against the shared `children` spine and against the Communication Snapshot,
which reasons in corrected months.

Pool membership, as implemented: an activity is in a child's pool when
`months_min <= age_months < months_max`. Half-open at the top, so bands tile
without overlap. Browse filtering uses a looser overlap test on purpose (a
parent browsing "12 to 18 months" should see an activity spanning 9 to 15).

**Named tradeoff (decided):** one pool test for both surfaces would be simpler.
Two tests won. Browse is exploratory and should be generous; daily selection is
prescriptive and should be exact. Serving a 13-month-old a 9-month activity as
"today's pick" reads as carelessness; seeing it in a filtered list reads as
range.

### 1.2 Secondary keys

| Key | Values | Role |
|---|---|---|
| `domains` | language, fine_motor, gross_motor, cognitive, social_emotional, sensory | Coverage balancing in Today's 3; browse facet |
| `mechanism_tags` | 44-term controlled vocabulary | The audit spine; the intention line must name one |
| `themes` | lower_snake free-ish slugs (household, food, routines, quiet_play, active_play, outdoors, seasonal, books, music, family, sensory_play observed in batch-001) | Browse facet only, never routing |
| `mess_level` | 1 to 3 | Weekly-plan budget |
| `duration_min` | 1 to 60 | Weekly-plan budget |
| `setting` | indoor, outdoor, on_the_go | Browse facet |

**Themes are deliberately not a controlled vocabulary**; the grader only checks
slug shape. **Named tradeoff (decided):** a closed theme list would give cleaner
facets and prevent near-synonyms (`outdoors` versus `outdoor`). Open themes won
for v1 because theme drift is cosmetic and recoverable by a normalization pass,
while a closed list forces a vocabulary decision before the content exists to
inform it. Revisit and normalize at batch 5.

### 1.3 The intention line

One sentence, minimum eight words (grader-enforced), naming a mechanism from the
vocabulary in parent-readable words, not the tag itself. "Practice knowing that
a hidden toy still exists, the root of object permanence" is the shipped gold
standard. The grader cannot verify that the sentence and the tag agree; that is
what Matthew's approval is for, and it is the highest-value thing he does in the
queue.

---

## 2. Core loop

The library has three loops, not one, and they are stacked by commitment.

**Loop A, browse (no account).** Filter, read an activity, hit the membership
wall on a paid activity's steps. Public, indexed, the top of the funnel.

**Loop B, Today's 3 (account + child).** Three picks a day, deterministic per
(child, date, catalog, completion history). Mark done, optionally rate. As
shipped: age pool, drop anything completed in the last 14 days (oldest-first
backfill when that starves the pool below three), rank by least-covered domain
over the trailing 28 days, tie-break by a date-rotated domain priority and then
a seeded FNV hash of child id plus date. The date-rotated priority is the part
that matters: it provably cycles every domain through the top slot, which is
what makes the all-six-domains-in-14-days property true for a child with no
history.

**Loop C, weekly plan (membership).** A printable seven-day grid, one anchor and
one backup per day, honoring a parent-set mess ceiling and time ceiling. Same
determinism contract, seeded on the ISO week rather than the date.

**Named tradeoff (decided):** Today's 3 could re-roll on demand. It does not.
Determinism won: a re-roll button turns a prescription into a slot machine and
destroys the property test that is the only mechanical guarantee of domain
coverage. The escape hatch is browse, always one tap away.

---

## 3. Output and copy safety

### 3.1 Activity output structure

Detail page order, which is also the print order: title, age range, intention,
time and mess and setting chips, materials (household items marked as such),
numbered steps (3 to 8, grader-enforced), make-it-easier, make-it-harder,
what-the-evidence-says, safety note, static pediatrician footer.

The intention sits **above** the steps. That is a positioning decision rendered
as layout: a parent who reads only the top of the card has still learned the why.

### 3.2 Lints

The enrichment lint from `00-CONVENTIONS.md` §5 applies in full and is already
implemented (`lintBanned`, reused from the Number Path compiler), as is the
Flesch-Kincaid grade 8 ceiling. Two activity-specific rules sit on top, both
enforced: **materials-household** (any `household_common: false` material must
carry a note justifying the ask) and the **safety lexicon** (absolute hits fail
outright; mitigable hits fail unless a mitigation phrase appears in the same
string or in `safety_notes`; applied only below 36 months by design).

**Proposed addition, not yet built.** A **promise lint** banning comparative and
causal-outcome claims in the intention and evidence lines. Candidate patterns:
`boost*`, `accelerat*`, `smarter`, `IQ`, `brain-building` used as a claim,
`will learn to`, `guarantee*`, `by \d+ months your child will`. The
banned-language lint catches deficit framing; nothing currently catches
overpromise framing, which is the failure mode this product's positioning exists
to oppose. One regex table, one test.

### 3.3 Tone

Warm, direct, second person to the parent, never to the child. Steps are things
the parent does or says. No apologizing empty states.

---

## 4. Content library

### 4.1 Schema

The authoritative shape is `ActivityDraft` in `nsc/lib/activity-types.ts`. It is
not restated here; changing it means changing that file, and a spec copy would
only rot. What this spec adds:

- `evidence_tags: string[]` (proposed, new). Ids resolving into the citation
  table of §6. Currently absent, and the reason evidence claims in this product
  are weaker than in Number Path.
- `locale` already exists and stays `en` in v1.

### 4.2 Coverage matrix (proposed cert rule, not yet enforced)

| Dimension | v1 floor | Rationale |
|---|---|---|
| Activities per age band | ≥ 25 | 25 per band across six bands is 150, the plan's floor. Below 25, the 14-day recency exclusion starves the Today's 3 pool for a heavy user |
| Activities per (band × domain) cell | ≥ 3 | 36 cells. The domain-coverage ranker cannot balance a domain that has nothing in it at that age |
| Free activities | exactly 20, ≥ 3 per band | The plan's free tier; currently 6 |
| Distinct mechanism tags used | ≥ 30 of 44 | Guards against the compiler collapsing onto a handful of easy mechanisms |
| Activities requiring only household-common materials | ≥ 80% | The product promise |
| `mess_level = 1` activities per band | ≥ 8 | The weekly-plan mess budget is unusable if low-mess options are scarce |

The pool-starvation arithmetic, stated plainly: with 25 per band and the 14-day
exclusion, a parent completing all three picks daily exhausts a band in roughly
8 days and starts hitting backfill. At 50 per band the same parent runs 16 days
clean. **This is the strongest argument for 300 rather than 150.** Recommend 300
as the target, 150 as the launch floor.

### 4.3 Authoring plan

Batches of 18 to 24, one per (band × domain emphasis) sweep, following the
batch-001 pattern already proven end to end. Batch-001's shape (3 per band, 1
free per band) becomes the batch template.

| Batch | Focus | Target count | Cumulative |
|---|---|---|---|
| 001 | Proof batch, all bands, mixed domains (**exists, unpublished**) | 18 | 18 |
| 002-004 | Language and cognitive depth, all bands | 24 each | 90 |
| 005-007 | Motor and sensory depth, all bands | 24 each | 162 |
| 008-010 | Social-emotional, routines, on-the-go | 24 each | 234 |
| 011-012 | Coverage-gap fill, driven by the §4.2 matrix report | 24 each | 282 |
| 013 | Free-tier curation pass (select and polish the 20) | 0 new | 282 |

Rejects feed the next batch prompt as negative exemplars. This is already how
the queue is designed (`reject_reason` is stored); the compiler side of that
loop is not built.

---

## 5. Architecture

### 5.1 Protocol as code, content as approved row

Unlike Number Path, this product's content is not a frozen JSON artifact. It is
database rows behind a review queue. **Named tradeoff (decided):** frozen
artifacts give hash certification and reproducible builds; database rows give
per-activity approval, incremental publishing, and retirement without a
recompile. **Rows won**, because a 300-item library grows continuously and a full
recompile to add one activity is absurd. The certification guarantee is
preserved differently: the grader runs at enqueue **and again at approve**, so no
row reaches `published` without a passing report at the moment of publication.
Already implemented in `approveItem`. The honest consequence is that no single
hash covers the whole library; §7.4 proposes the compensating control.

### 5.2 Runtime

Pure TypeScript over published rows. `todaysThree` and `weeklyActivityPlan` are
pure functions taking the catalog, the child's age, the completion history, the
child id, and a date. No model calls anywhere, at any layer. Already true, and
it must stay true.

### 5.3 Compiler

`nsc/tools/activities/` holds the grader and vocabularies. The **drafting** side
(prompt template, gold exemplars, batch runner) is not in the repository;
batch-001 exists as output with no reproducible producer. **Proposed:
`nsc/tools/activities/compile.ts`**, taking a batch spec sheet (band grid,
domain emphasis, target count, theme hints, negative exemplars from prior
rejects) and emitting a batch JSON the existing `gradeBatch` consumes. Without
it, batch 002 is hand-prompted and the pipeline is not a pipeline.

### 5.4 Cost flag (G2 gate, per the shared conventions)

No batch runs without a sign-off. Estimate per activity, from measuring
batch-001: roughly **900 to 1,100 output tokens** per activity draft (18
activities in a 479-line JSON), plus prompt and gold exemplars amortized across
the batch.

| Run | Output tokens | Notes |
|---|---|---|
| One 24-activity batch | ~24k to 27k | Plus ~15% for regeneration of grader-failed drafts |
| Full path to 282 activities (batches 002-012) | **~290k to 340k output tokens** | Excluding retries |
| With a 20% retry allowance | **~350k to 410k output tokens** | Plan against this number |

Sign off before batch 002. Run one batch, review the whole thing by hand, and
recalibrate the estimate before committing to the remaining ten.

---

## 6. Evidence layer

This is the product's weakest seam and the spec should say so. Every activity
carries an `evidence_note` in free prose, tied to nothing: a parent cannot check
it and the cert harness cannot validate it.

**Proposed structure:** add `evidence_tags` resolving into a citation table on
the Number Path model, rendered with the same two-axis strength and consensus
chips used elsewhere in the portfolio.

### 6.1 Reusable verified pools

These entries are already verified in this repository and may be cited as
`verified: true` without further work.

| tag_id | Source | Pool | verified |
|---|---|---|---|
| `ev.org.harvard-serve-return` | Center on the Developing Child, Harvard, Serve and Return | `corpus/citations.json` | true |
| `ev.org.harvard-brain-architecture` | Center on the Developing Child, Harvard, Brain Architecture | `corpus/citations.json` | true |
| `ev.org.harvard-executive-function` | Center on the Developing Child, Harvard, Executive Function | `corpus/citations.json` | true |
| `ev.org.zero-to-three` | ZERO TO THREE, early development | `corpus/citations.json` | true |
| `ev.org.naeyc-dap` | NAEYC, Developmentally Appropriate Practice, infants and toddlers | `corpus/citations.json` | true |
| `ev.org.pathways` | Pathways.org milestones | `corpus/citations.json` | true |
| `ev.org.cdc-actearly` | CDC, Learn the Signs. Act Early. | `corpus/citations.json` | true |
| `ev.milestones.zubler2022` | Zubler et al. (2022), *Pediatrics*, evidence-informed milestones | `keel/artifacts/shared/floor_sources.v1.json` | true |
| `ev.numbertalk.levine2010` | Levine et al. (2010), parent number talk 14-30m | `nsc/content/citations.v1.json` | true |
| `ev.numbertalk.gunderson2011` | Gunderson & Levine (2011), talk about present sets | `nsc/content/citations.v1.json` | true |
| `ev.spatial.pruden2011` | Pruden, Levine & Huttenlocher (2011), spatial language input | `nsc/content/citations.v1.json` | true |

`corpus/citations.json` also records six claims with replication status
(`statistical-learning`, `perceptual-narrowing`, and `serve-and-return`
supported; `word-gap-30m` **contested**; `marshmallow-test` **attenuated**;
`helper-hinderer` **failed replication**). **Binding rule:** no activity's
evidence note may lean on a contested, attenuated, or failed-replication claim
without naming that status. `word-gap-30m` is the live risk, because
language-activity copy drifts toward word-count framing by default.

### 6.2 Seed citations proposed by this spec (G1 gate)

⚠ **Every row below is `verified: false`. Each must be pulled and read, and its
full citation, findings, and effect sizes checked against the paper, before any
of it ships. Do not write numbers from memory into activity copy.** No artifact
and no published row may carry a `verified: false` tag. The cert harness
enforces this, on the pattern already implemented in `nsc/lib/artifacts.ts`.

Deliberately short. Four solid anchors beat twenty shaky ones, and three of the
four are already load-bearing elsewhere in the portfolio.

| tag_id | Anchor | Claim scope | verified |
|---|---|---|---|
| `ev.dialogic.whitehurst1988` | Whitehurst et al. (1988) | Dialogic reading: adult questioning and expansion during picture-book reading affects toddler expressive language. Underwrites every books-theme activity | false |
| `ev.responsive.tamislemonda2001` | Tamis-LeMonda, Bornstein & Baumwell (2001) | Maternal responsiveness predicts timing of early language milestones. Underwrites the serve-and-return and joint-attention tags | false |
| `ev.jointattention.mundy2007` | Mundy & Newell (2007) | Joint attention as a foundation of social and language learning. Underwrites the joint-attention mechanism itself | false |
| `ev.selftalk.vygotsky` | Vygotsky, *Mind in Society* (1978 translation) | Zone of proximal development. This is the theoretical warrant for the adapt-down and adapt-up fields being mandatory, and should be tagged `strength: theory-derived`, never presented as an effect | false |

Anything an activity wants to claim beyond these four gets a reputable-org tag
from §6.1 or gets rewritten to claim less. That is the intended default.

### 6.3 Honesty card

Mirror Number Path's "what we deliberately left out" card: this library sells no
flashcards, no screen-based programs, no brain-training, and makes no claim that
any activity raises any score. Render it on the library landing page.

---

## 7. Certification harness

### 7.1 Already enforced (per draft, at enqueue and again at approve)

Eight checks in `grader.ts`, listed in §0.5. Notable thresholds as shipped:
Flesch-Kincaid grade ceiling 8; steps between 3 and 8; intention at least 8
words; `months_max` at most 60 and strictly greater than `months_min`;
`duration_min` 1 to 60; `mess_level` 1 to 3; theme slugs `lower_snake`; safety
lexicon applied only below 36 months.

### 7.2 Already enforced (the eval gate)

`activities-grader.test.ts` runs 12 planted violations and asserts each fails on
its **intended** check, not merely that it fails. That distinction is the value
of the test, and it satisfies the plan's PR1 criterion (12 of 12 rejected). It
also asserts the clean base draft passes every check, guarding against a grader
that rejects everything.

### 7.3 Proposed additions

| Check | Rule | Why |
|---|---|---|
| Coverage matrix | The §4.2 floors, run over published rows, reported not blocking until 150 activities exist | A blocking coverage check on an empty library blocks forever |
| Promise lint | §3.2 pattern table, zero tolerance | The overpromise gap |
| Evidence resolution | Every `evidence_tags` id resolves; every resolved citation is `verified: true` | The G1 gate, mechanically |
| Free-tier shape | Exactly 20 `is_free`, at least 3 per band | Prevents the free tier drifting as batches land |
| Duplicate escalation | Keep Jaccard at 0.60 as the hard fail; add a 0.45 to 0.60 warn band surfaced in the queue | At 150+ activities the reviewer needs a soft signal, not just a wall |
| Mechanism spread | At least 30 distinct tags across published rows | Anti-collapse |

### 7.4 The missing hash

Because content is rows rather than a frozen artifact (§5.1), no library-wide
certification hash exists. **Proposed compensating control:** a nightly job that
re-grades every published row against the current grader and writes a dated
catalog report (row count, per-check pass and fail, coverage matrix, content
hash of the ordered slug and version pairs). Rows failing a re-grade after a
grader or lexicon update are **flagged, not auto-retired**: auto-retiring on a
lexicon change lets one regex edit silently empty the library. Flag, review,
retire by hand.

---

## 8. Data model

**No DDL appears in this document, deliberately.** The shipped migration
`nsc/supabase/migrations/0006_activity_library.sql` is the authority for what
exists; this section describes it in prose and names only the proposed
additions. Nothing here is executable, and nothing in `specs/drafts/` may be run
against a database.

### 8.1 What exists

**`review_items`** is a shared, content-type-generic review queue, not an
activity table. It carries a content type constrained to activity, claim,
navigator node, guidance block, and prompt card, plus a batch id, the draft
payload, the grader report captured at enqueue, a status of pending, approved,
or rejected, a reject reason, a pointer to the row created on approval, and
decision timestamp and admin email. Row-level security is enabled with no
policies at all, making it service-role only; admin routes verify the signed-in
user against an admin allowlist server side and then use the service client,
the same posture as the gift-code table. **Building this queue generically was
the right call; all five other products should reuse it rather than re-spec it.**

**`activities`** mirrors `ActivityDraft` field for field, plus `locale`,
`is_free`, `status` (draft, published, retired), `version`, a nullable pointer
back to the review item that produced it, and `published_at`. RLS allows public
select of published rows only; writes are service-role through the queue. A
partial index on the month range covers the published-pool read.

**`activity_completions`** links a user, a child (into the existing children
spine), and an activity, with a completion date and an optional 1 to 3 rating,
unique on child plus activity plus date. RLS is own-row for select, insert, and
delete.

### 8.2 Proposed additions

- **`evidence_tags`**, a text array on activities, resolving into a citation
  table (§6). Add the citation table itself only when the second product needs
  it; until then, resolve against the existing JSON pools.
- **`activity_favorites`**, a thin user plus activity plus timestamp record with
  own-row RLS. Deliberately keyed to the user, not the child: parents favorite
  things they liked doing, not things a particular child liked.
- **Nothing else.** The weekly plan and Today's 3 must stay derived, never
  stored. Storing a plan makes it stale the moment an activity is retired, and
  it breaks the determinism property test, which is currently the only proof
  that the habit surfaces behave.

### 8.3 Privacy

Nickname and birth month only, inherited from the children spine. No free text
about the child anywhere in this product. Ratings are 1 to 3 integers, not
comments. Deletion cascades from user and from child.

---

## 9. Screens

Mobile first. A parent reads this holding a phone in one hand with the other
hand occupied. Tidepool tokens throughout: deep teal ink `#15393C`, brand teal
`#1E5F62` for action, teal-soft `#2E7A77`, aqua mist ground `#F0F5F3`, coral
`#DE7356` as the single warm accent, sea glass `#CFE3DE`, line `#D4E0DC`.
Bricolage Grotesque for display and headings, Source Serif 4 for body. Pill
controls at 48px, 14px card radius, the arch motif for imagery.

**Signature element: the intention line as a coral serif-italic phrase set
inside an otherwise grotesque activity title block.** The house signature move
applied to this product's one distinguishing feature, and also the Pinterest
crop. One reveal only: the Today's 3 cards settle in on load, with an instant
`prefers-reduced-motion` fallback. Nothing else animates.

| # | Screen | Status | Behavior |
|---|---|---|---|
| 1 | `/activities` browse | Built | Filters: band, domain, mess, time, setting. Filters compose and live in the query string, so a filtered view is shareable. Needs: an empty state that offers to widen the filter rather than apologizing |
| 2 | `/activities/[slug]` detail | Built | Intention above steps. Steps gated on `is_free` or membership. Needs: per-activity metadata and structured data, and the print stylesheet |
| 3 | `/activities/today` | Built | Three cards, mark done, add a child inline. Needs: the domain-coverage donut |
| 4 | `/activities/week` | Built | Seven-day grid, anchor plus backup, mess and time budget in the query string, print button. Needs: print stylesheet audit against real paper |
| 5 | Free sample landing pages | **Not built** | 20 activities as public pages targeting "activities for a {n} month old". The single largest SEO surface this product has |
| 6 | Favorites | **Not built** | One list, user-scoped |
| 7 | `/admin` queue | Built | Batch import, per-item grader report, approve, reject with reason, edit and re-grade |

The membership wall shows the intention, the materials, and the first step, then
stops. **Named tradeoff (decided):** showing nothing behind the wall converts
better on curiosity; showing the intention converts better on trust. Trust won,
because the intention is the thing being sold and hiding it hides the product's
differentiator behind a paywall.

---

## 10. Ecosystem slot

### 10.1 The three layers

**Layer 1 (free, traffic and trust):** 20 sample activities, each a public
indexed page, with full intention, steps, and adaptations. Complete value, not
teasers, and the "10 evidence-graded activities" lead magnet in downloadable
form.

**Layer 2 (Growing Minds Membership, $9/mo or $79/yr, annual pushed):** full
library, Today's 3, weekly planner, favorites, completion tracking, coverage.
**The Activity Library is the anchor tenant of the membership.** Per the plan's
build sequence it ships second, right after Phase 0 infrastructure, precisely
because it gives the membership something to sell beyond the AI tier and Number
Path on day one.

**Layer 3 (courses):** no direct SKU; the library cross-sells into courses by
behavior (§10.3).

Entitlement checking is already implemented as `hasMembership()`, and
entitlements remain additive grants from enumerated sources. Nothing a member
buys later revokes library access, and cancelling membership never revokes a
one-time purchase from another product.

### 10.2 Cross-links to the other five products

| Product | Direction | Link |
|---|---|---|
| **Navigator** (free, worry track) | Navigator to Library | After the Navigator's action sheet, day 4 and later in the worry sequence: three free activities in the domain of concern, framed as supporting development, never as fixing a problem. The funnel's "never monetize the anxiety moment" rule binds here absolutely |
| **Language Milestone Coach / Communication Snapshot** | Both ways | LMC prescribes library activities by domain and month age. This is the plan's stated reason for membership over per-tool pricing, and it requires the Library's month-integer key to match LMC's corrected-age key exactly. Library detail pages link back to the Snapshot for parents who want to track. **Open obligation, see below** |
| **Number Path** | Both ways | Library activities tagged `number_sense` or `one_to_one_correspondence` link to Number Path; Number Path's post-purchase 30-day membership trial lands on Today's 3. Number Path stays purchasable standalone at $34 forever |
| **Claims Library** | Library to Claims | Every `evidence_tags` chip links to its claim summary page. This is what makes the evidence layer of §6 worth building: the chips stop being decoration and become navigation into the SEO engine |
| **Dialogic Reading Coach** | Both ways | Books-theme activities and the `dialogic_engagement` tag route to DRC; DRC prescribes books-theme activities. Both lean on `ev.dialogic.whitehurst1988`, so G1 verification of that one citation serves two products |
| **Bilingual Parenting Guide** | Library to course | The `locale` field and future Spanish batches feed the bilingual segment; a bilingual household flag plus heavy language-domain usage is a course trigger |

**Open obligation from `02-language-milestone-coach.md` §10.** That spec states
that LMC plans reference activity ids "filtered to the language domain, band, and
age bucket," and that "the Activity Library must expose that filter; LMC does not
maintain its own copy." Two of those three keys exist here today: `domains`
contains `language`, and `months_min` / `months_max` give the age bucket. **The
band key does not exist in this product and is not proposed anywhere in this
spec.** Band is an LMC construct computed downstream of its own compile step.

This is an unresolved dependency between two drafts, recorded here rather than
silently assumed. Three ways it can resolve, and the choice belongs to whoever
reviews both specs together:

1. LMC maps band to an existing Library key before querying, so the Library
   never learns what a band is. Cheapest, and it keeps the coupling one-way.
2. The Library adds a band-compatible tag to language-domain activities, which
   means the Library takes a dependency on LMC's banding table and both must
   version together.
3. The prescription join moves into a shared routing artifact owned by neither.

**Recommendation: option 1.** The Library should stay a content service that
knows nothing about any consuming product's scoring, for the same reason the
Number Path titration FSM does not know about the games catalog. Options 2 and 3
both create a version-coupling between a content library and an instrument, which
is exactly the coupling the frozen-artifact architecture exists to avoid.

### 10.3 Funnel role

TOFU through the free activity pages and Pinterest (every printable gets a
pin-optimized image; activity cards are native Pinterest content). Capture
through the sampler PDF on the curiosity track. Retention through the Monday
planner email and the age-triggered birthday-month automation, which needs date
of birth on the children spine and nothing new from this product. Activation
metric, instrumented from day one: **child profile created plus one tool used in
the first session.** For this product that is a child created on Today's 3 plus
one activity marked done.

---

## 11. Telemetry

Aggregate and anonymized. No per-child analytics leaves the owner's rows.

| Signal | Target | Reads as |
|---|---|---|
| Weekly planner opens / active members / week | **≥ 40% by month 2** | The one success metric. Below it, the planner is redesigned |
| Browse to detail rate | ≥ 35% | Filter and card quality |
| Detail to membership-wall click | ≥ 8% on gated activities | Wall placement |
| Today's 3 completion rate (at least one of three) | ≥ 45% of days with a session | Whether the picks are actually doable |
| Backfill rate in Today's 3 | < 10% of picks | The catalog-starvation alarm. Rising backfill means write more activities, not tune the algorithm |
| Domain coverage spread per child over 28 days | All six domains for ≥ 80% of active children | Proves the ranker in the wild, not just in the property test |
| Rating distribution per activity | Flag any activity below 1.8 mean with n ≥ 20 | Content pruning signal for the next batch |
| Grader fail rate per batch | < 25% | Above it, the prompt is wrong, not the drafts |

Placement of the last one is deliberate: it is a compiler-health signal, never
shown to users, exactly like Number Path's placement-distribution check.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge. PRs 1 through 4 and 6 of the plan's
original sequence are substantially built; this is the forward sequence from
where the code actually is.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR-A** `activities/migration-truth` | Resolve D-AL-1: confirm 0006's applied state, correct whichever document is wrong | The two documents agree; a smoke read of `activities` and `review_items` from the deployed app is recorded in the PR |
| **PR-B** `activities/batch-001-publish` | Import and hand-review batch-001 through the queue | 18 items reviewed one by one; approved count and reject reasons recorded; every published row renders at its slug |
| **PR-C** `activities/compiler` | `compile.ts` batch runner, prompt template, gold exemplars, reject-feedback loop | Regenerating batch-001's spec sheet produces a grader-clean batch of the same shape; **G2 cost sign-off recorded before the first run** |
| **PR-D** `activities/evidence` | `evidence_tags`, citation resolution, chip rendering, Claims Library links | Every published row has ≥ 1 tag; every tag resolves; every resolved citation is `verified: true`; **G1 pass complete for the §6.2 seeds** |
| **PR-E** `activities/cert-additions` | §7.3 checks: promise lint, coverage matrix report, free-tier shape, warn band, mechanism spread | Planted-violation fixtures for the promise lint fail on the promise lint specifically; coverage report renders in the admin queue |
| **PR-F** `activities/batches-002-004` | Three batches to ~90 activities | Each batch grader-clean before enqueue; per-batch grader fail rate < 25% recorded |
| **PR-G** `activities/print-and-favorites` | Print stylesheet for activity cards and the weekly grid, favorites | Print fidelity checked on real paper at Letter and A4; favorites own-row RLS tested |
| **PR-H** `activities/free-tier-seo` | 20 curated free activities as public pages, per-page metadata and structured data, Pinterest image generation | Exactly 20 free, ≥ 3 per band; canonical URLs absolute (the netlify-mirror hazard); Lighthouse SEO ≥ 95 |
| **PR-I** `activities/coverage-ui` | Domain-coverage donut per child, completion history | Donut matches the trailing-28-day computation used by the ranker, proven by a shared test fixture |
| **PR-J** `activities/batches-005-012` | Remaining batches to ~282 | §4.2 coverage floors all met; backfill rate in simulation < 10% at 3 picks a day for 30 days |
| **PR-K** `activities/nightly-cert` | §7.4 catalog report job | Report writes daily; a deliberately broken lexicon flags rows without retiring any |

PR-A blocks everything. PR-C and PR-D are parallel. PR-F depends on PR-C and
PR-E. PR-H depends on enough content to curate from, so it follows PR-F.

---

## 13. Risks and open decisions (routed to Matthew)

1. **D-AL-1, migration truth (blocking).** `nsc/README.md` and
   `docs/phase-3-identity-convergence.md` disagree on whether 0006 is applied.
   Confirm against the live project. Nothing imports until this is settled.
2. **D1, IP position (blocking, from the plan).** The DML activities manual was
   authored during employment. The conservative position is assumed here: reuse
   the method (theme organization, intention lines, adaptations), regenerate
   every activity fresh. **No batch may be seeded with text from that manual,
   and no gold exemplar may be lifted from it.** Confirm the position, or get an
   opinion, before PR-C.
3. **Catalog size: 150 or 300.** This spec recommends 300, on the pool-starvation
   arithmetic in §4.2. 150 launches sooner and starves heavy users in about a
   week per band. Matthew's call, and it roughly doubles the G2 cost estimate.
4. **Evidence layer: build now or defer.** §6 is the honest weak seam. Building
   it in PR-D costs a G1 session; deferring it ships a library whose evidence
   claims are unverifiable prose. Recommend building it, because the Claims
   Library cross-link (§10.2) does not exist without it.
5. **Theme vocabulary.** Open now, normalize at batch 5. Confirm.
6. **Duplicate threshold at scale.** Jaccard 0.60 is untested above 18
   activities. Watch the warn band from PR-E and revisit at 150.
7. **Re-grade after a lexicon change.** §7.4 flags rather than retires. Confirm
   that a human review pass on flagged rows is acceptable versus automatic
   unpublishing. Recommend flagging; automatic unpublishing on a regex edit is
   how a library empties itself overnight.
8. **Rating scale.** The shipped constraint is 1 to 3, matching the plan's
   loved/fine/flopped intent. Confirm the labels before they ship in copy.

---

## 14. Definition of done (v1 launch)

- D-AL-1 resolved, D1 position confirmed, G1 and G2 gates cleared.
- At least 150 published activities, all §4.2 coverage floors met, every one
  approved by hand in the queue.
- Every published row: grader-green at approval time, at least one resolving
  `verified: true` evidence tag, zero banned-language hits, zero promise-lint
  hits, Flesch-Kincaid grade 8 or below.
- Exactly 20 free activities, at least 3 per band, each a public indexed page
  with absolute canonical URLs.
- Today's 3 and the weekly plan determinism property tests green, and the
  all-six-domains-in-14-days property proven for a child with no history.
- Print output checked on real paper.
- Telemetry flowing, activation metric instrumented, and the 40% planner-open
  metric on a dashboard from launch day rather than retrofitted at month 2.
- Cross-links live in both directions with the Navigator, the Communication
  Snapshot, and Number Path. Claims Library links live if the Claims Library has
  shipped, stubbed behind a flag if it has not.
