# Product build specs, batch of 2026-07-19

**Status: drafts for domain-expert review. Nothing here is approved. Nothing has
been built from these documents. Do not treat any threshold, citation, or data
model in this folder as settled.**

Branch: `specs/product-batch-2026-07-19`. Not merged, and not intended to merge
until the specs have had a domain read.

---

## 1. What is in here

Complete build specs for the six planned products in the portfolio plan, drafted
against the structural template of the Number Path build spec.

| File | Product | Ecosystem layer | Price | Build state today |
|---|---|---|---|---|
| `01-activity-library.md` | Intention-Based Activity Library | Layer 2 membership, 20 free samples | in $9/mo | Partly built, migration unapplied |
| `02-language-milestone-coach.md` | Language Milestone Coach | Layer 2 membership | in $9/mo | v0 live as Communication Snapshot |
| `03-worried-navigator.md` | "Should I Be Worried?" Navigator | Layer 1 free | $0 | Built, launch-held on D3 |
| `04-claims-library.md` | Evidence-Graded Claims Library | Layer 1 summaries, Layer 2 depth | in $9/mo | Not built |
| `05-bilingual-parenting-guide.md` | Bilingual Parenting Guide | Layer 3 course, Planner in membership | $69 | Not built |
| `06-dialogic-reading-coach.md` | Dialogic Reading Coach | Layer 3 mini-course, cards in membership | $29 | Not built |

`00-CONVENTIONS.md` holds everything shared: the section skeleton, the global
build contract, the brand tokens, the copy-safety lints, the safety keel rules,
and the citation policy. Read it before any individual spec.

Number Path is deliberately not in this set. It is already shipped and selling
at $34 one-time, and the portfolio plan treats it as the architectural template
and the first citizen of the ecosystem rather than a future product.

## 2. Provenance, and a single-point-of-failure worth fixing

The two documents these specs derive from are **not in this repository**:

- `~/Downloads/gms-portfolio-funnel-infrastructure-plan.md`, "Growing Minds
  Science: Product Portfolio, Funnel, and Traffic Infrastructure Plan (v2)"
- `~/Downloads/nsc-build-spec-v1.md`, "NSC, Number Sense Coach: End-to-End Build
  Spec v1.0"

Both live in an unversioned Downloads folder. Shipped code cites them by section
number in at least four places (`nsc/lib/grants.ts` cites plan 2.2,
`nsc/lib/activity-types.ts` cites 2.1, `nsc/lib/navigator-types.ts` cites 3.3,
and `nsc/supabase/migrations/0005_spine_entitlements.sql` cites Part 5.1).

**Recommendation: commit both to `docs/` before anything else in this batch is
acted on.** They are load-bearing and currently one accidental delete from gone.
This is outside the scope of this drafting job, so it has not been done here.

## 3. Two discrepancies against the dispatch brief

Flagged rather than silently resolved, because both are judgment calls that
belong to Matthew.

### 3.1 Brand tokens

The brief specified "Deep Teal, Amber, Warm Cream palette; Lora and Instrument
Sans typography." That combination appears nowhere in the shipped site.

Verified on 2026-07-19 against `DESIGN.md`, `assets/css/styles.css`, and
`assets/css/home.css`: the live system is "Tidepool", built on deep teal ink
`#15393C`, brand teal `#1E5F62`, an aqua mist ground `#F0F5F3` that the design
system calls out as **deliberately not cream**, and exactly one warm accent,
coral `#DE7356`. Type is Bricolage Grotesque over Source Serif 4. There is no
amber token and no Lora or Instrument Sans reference anywhere in the CSS or the
HTML.

The brief's wording traces to §9 of the NSC build spec, which reads "Deep Teal
primary, Amber accent, Warm Cream ground." That spec is dated 2026-07-06 and
predates the current design system, so the brief appears to have inherited a
stale line.

**Decision taken here:** all six specs use the shipped Tidepool tokens, because
a spec that contradicts the live design system produces UI that has to be redone.
If the amber and cream direction is an intentional forward change rather than a
stale reference, these specs need a palette pass and `DESIGN.md` needs updating
first.

### 3.2 The Navigator's existing work

The brief noted that "the Navigator already has a built Talking-domain draft in
`nsc/`." That is true but incomplete. There are **two** parallel Navigator
implementations in this repository:

- The static-HTML one at `tools/milestone-navigator.html`, governed by
  `keel/artifacts/navigator/`, covering **all eight** worry domains, fully
  functional, and held from launch by D3. Launch is one command.
- The Next.js one under `nsc/`, with a pure-TS walker and a compiler-grade
  grader, covering **one** domain (Talking) as a draft artifact.

They use different terminal vocabularies. `03-worried-navigator.md` treats
reconciling them as its central design question rather than assuming either one
is the real product.

### 3.3 Migration status: the repo contradicts itself

Found while drafting `01-activity-library.md`, and worth fixing independently of
this batch.

`nsc/README.md` flags migrations 0005, 0006, and 0007 with "⚠ apply to the
project," implying none is live. `docs/phase-3-identity-convergence.md` states
the opposite: "Migrations: 0005/0006/0007 already applied to
`kxljngtmnqarvsawakmf` (done) ... No action."

Git dates settle which is likelier current. `docs/phase-3-identity-convergence.md`
was last committed 2026-07-19; `nsc/README.md` was last committed 2026-07-16,
three days earlier, in the Navigator PR1 commit. The newer document explicitly
records the apply as done.

**Treated here as: applied, and `nsc/README.md` is stale.** This was not
confirmed against the live database, which is the only authoritative check, so
it is recorded as evidence rather than fact. `01-activity-library.md` carries it
as blocking decision D-AL-1. Someone should query the project and then correct
whichever document is wrong, because a stale "not applied" banner on a migration
that is in fact live is the kind of thing that causes a duplicate apply attempt.

## 4. How these specs handle citations

Two states, marked on every entry in every seed table.

`verified: true` means the entry is carried from a pool already verified in this
repository: `nsc/content/citations.v1.json` (19 entries, G1-verified
2026-07-07), `keel/artifacts/shared/floor_sources.v1.json` (9 entries, drafted
and pending Matthew's read), and `corpus/citations.json` (11 registered
organizational sources).

`verified: false` means the entry is a seed proposed by the spec and has **not**
been checked against the paper. It carries the same G1 gate the Number Path spec
carried, and no artifact ships until it is checked. Effect sizes in particular
are marked G1-pending wherever they appear.

This mirrors how Number Path actually shipped: a seed table drafted first, then
a verification session that flipped the flags, then content freeze.

## 5. Review order suggested

1. `00-CONVENTIONS.md`, since everything inherits it.
2. `03-worried-navigator.md`, because it is launch-blocked on an outside review
   and because the two-implementation question should be settled before more
   domains get authored either way.
3. `02-language-milestone-coach.md`, because it is the deepest build and because
   its instrument decision interacts with the shipped keel floors.
4. The remaining three in any order. `01-activity-library.md` is the most
   nearly-built and therefore the cheapest to correct.

## 6. Findings that came out of the drafting, ranked

Drafting against the real code surfaced things that are not in either source
document. These are the parts most worth a reviewer's attention.

**1. The Navigator's D3 attorney packet may become inaccurate.**
`keel/ATTORNEY-REVIEW.md` tells counsel there is "no account, no sign-in, no
server-side processing," and that answers are not "transmitted or stored
server-side." That is true of the static tool. It is **false of the Next.js
implementation**, which has a `navigator_sessions` table. Converging on the
Next.js shape is therefore a privacy regression relative to what counsel is
being asked to review, and it has to be re-disclosed before launch rather than
after. Tracked as R3 in `03-worried-navigator.md`.

**2. The two Navigator implementations diverge more than expected.** Not only in
terminal vocabulary and domain coverage, but in domain slugs, in whether an
"I'm not sure" answer exists, in whether citations attach per node or per floor,
and in corrected-age rounding. The static tool's `trees.v1.json` is a misleading
filename: it is a flat age-gated questionnaire taking a max over triggered
flags, not a branching tree. Converting it is authoring work, not a
transformation, and the recommendation in `03-worried-navigator.md` names that
cost rather than hiding it.

**3. The corrected-age rounding question is now resolved by measurement, and it
exposed a coverage gap in the safety keel.**

`keel/lib/navigator.mjs` returns a fractional corrected age; `nsc/lib/navigator.ts`
floors to a whole month. An earlier draft recommended flooring and argued it was
safe. That argument was wrong in its mechanism, so it was tested instead. Run
locally 2026-07-19, detailed in `03-worried-navigator.md` §7.4.1:

- Baseline `keel/graders/selftest.mjs`: 372,689 cases pass, all ten planted
  violations fail, exit 0.
- With flooring applied: **identical**, still green.
- **That green is vacuous.** `correctedAge` is only called inside `resolve()`;
  the grader calls `classify()` directly and never passes `weeksEarly`. The
  Navigator floors grader **never exercises corrected age**, so a green run after
  a corrected-age change proves nothing.
- A differential enumeration over 179,204 cases (every domain x age 0-40 x
  weeksEarly 0-16 x every path) found **0 classification differences** and 0
  question-set differences, though the two conventions differ numerically in
  2,208 pairs. The cause is structural: all 77 age thresholds are integers, and
  `floor(x) >= N` exactly when `x >= N` for integer `N`.
- The engine change was **reverted**. This branch contains no edit to `keel/`.

**Conclusion: flooring is verified safety-neutral, and the rounding split is a
display-consistency bug rather than the safety bug it first appeared to be.** The
real finding is the gap: a safety-relevant computation for preterm babies sits
outside the grader that certifies the product. Introduce one non-integer
threshold and today's result silently stops holding. A PR0 acceptance criterion
to close it is written into §7.4.1.

The differential test is committed as `verify-rounding.mjs` so this is
reproducible rather than taken on trust. `node specs/drafts/verify-rounding.mjs`
is read-only, needs no network, and exits non-zero if the two conventions ever
diverge or if a non-integer age threshold is introduced.

**4. Migration status is contradicted between two repo documents.** See §3.3.

**5. The plan's claim that the LMC item bank is bilingual from day one is not
true today.** `label_es` appears zero times in the repository. Bilingual
Parenting Guide module 6 is specced as depending on it, so that dependency is
currently unmet rather than merely unbuilt.

**6. No "course production brief" exists in the repository**, though the plan
refers to it as existing and both Layer 3 products route their content through
it. It may live outside the repo. Both course specs flag it as a risk.

**7. One unresolved dependency between two drafts in this batch.** The LMC spec
requires the Activity Library to expose a band filter; the Activity Library has
no band concept. Recorded in `01-activity-library.md` §10.2 with three
resolutions and a recommendation, rather than silently assumed on either side.

## 7. What these specs deliberately do not contain

- **No DDL.** Data models are prose and annotated field lists. Nothing in this
  folder can be pasted into a SQL editor. Real migrations belong in the owning
  app's `supabase/migrations/`.
- **No approved content.** Every artifact described is a plan for an artifact,
  not an artifact.
- **No merge.** These are drafts on an unmerged branch.
