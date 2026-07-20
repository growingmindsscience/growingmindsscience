# Shared conventions for the product build specs

**Status:** draft for domain-expert review. Nothing here is approved, and nothing
here has been built. Read `README.md` in this folder first for provenance and for
the two discrepancies flagged against the dispatch brief.

Every spec in this folder inherits the conventions below. Specs do not restate
them; they reference this file and record only their deviations.

---

## 1. The structural template

All six specs follow the section skeleton of `nsc-build-spec-v1.md` (the Number
Path / Number Sense Coach build spec), because that product shipped on it and it
is the house pattern:

| § | Section | Purpose |
|---|---|---|
| 0 | Product summary | One-liner, positioning, segment, architecture thesis, in/out scope table |
| 1 | Domain model | The science spine and the primary routing key |
| 2 | Instrument or core loop | What the product asks and how it decides |
| 3 | Output and copy safety | Result structure, banned-language lint, tone |
| 4 | Content library | Schemas, coverage matrix, authoring plan |
| 5 | Architecture | Protocol-as-code, frozen artifacts, compiler, runtime |
| 6 | Evidence layer | Two-axis tags plus the seed citation table behind the G1 gate |
| 7 | Certification harness | Mechanical graders and property tests that gate merge |
| 8 | Data model | Described in prose plus illustrative shapes. **No DDL.** |
| 9 | Screens | Screen-by-screen behavior, mobile first |
| 10 | Ecosystem slot | Which of the three layers, pricing, cross-links |
| 11 | Telemetry | Aggregate signals and their targets |
| 12 | Build sequencing | PRs with acceptance criteria |
| 13 | Risks and open decisions | Explicitly routed to Matthew |
| 14 | Definition of done | Launch bar |

## 2. Global rules inherited from the portfolio plan

Every product carries the same contract, stated once here:

- Compiled artifacts pass through the shared cert harness before shipping.
- Every PR carries acceptance criteria, and an eval gate blocks merge.
- **Zero runtime model calls** unless a spec explicitly scopes an exception, and
  any exception ships fail-closed with a certified reject-hold set.
- Each product has one success metric and one rework trigger.
- Entitlements are additive grants from enumerated sources. No entitlement is
  ever revoked by buying something else.
- Cost flag before any batch compile. No batch runs without a token estimate and
  a sign-off.
- Content is drafted by model, graded mechanically, and **approved by a human in
  the shared review queue**. The model proposes, Matthew disposes.

## 3. No DDL in this folder

Data models are described in prose with illustrative field lists. These are
sketches for review, not migrations. Nothing in `specs/drafts/` may be executed
against a database. When a spec has been approved and a real migration is
written, it lands in the owning app's `supabase/migrations/` directory, not here.

Field-shape blocks are written as annotated lists rather than `create table`
statements, deliberately, so that no file here can be pasted into a SQL editor.

## 4. Brand tokens

Source of truth is the repository's `DESIGN.md` (the "Tidepool" system), verified
against `assets/css/styles.css` and `assets/css/home.css` on 2026-07-19.

**Palette.** Deep teal ink `#15393C` for text and dark bands; brand teal
`#1E5F62` for action; teal-soft `#2E7A77`; aqua mist ground `#F0F5F3`; surface
white `#FFFFFF`; sea glass `#CFE3DE`; exactly one warm accent, coral `#DE7356`
(with `#9C4429` deep and `#E78D6F` on dark); line `#D4E0DC`; ink-soft `#3D5A5A`.

**Typography.** Bricolage Grotesque for display, headline, title, and eyebrow.
Source Serif 4 for body. The signature move is a coral serif-italic phrase set
inside an otherwise grotesque headline.

**Note:** the dispatch brief specified "Deep Teal, Amber, Warm Cream" and "Lora
and Instrument Sans." That palette and pairing appear nowhere in the shipped
site. See `README.md` section 3 for the provenance of that discrepancy and the
decision taken here.

**Shape and motion.** Pill controls at 48px height, 14px card radius, the arch
motif for imagery. Motion is restrained: one signature reveal per product,
everything else quiet, `prefers-reduced-motion` honored with an instant
fallback.

**Anti-references, binding on every screen in every spec.** Not generic SaaS: no
gradient hero, no hero-metric template, no endless identical icon-card grids, no
purple-on-white. Not clinical: no hospital-blue sterility, no deficit-framed "is
your child behind?" messaging.

## 5. Copy safety

Two lint layers apply across all six products.

**The enrichment lint** (inherited from the Number Path spec §3.2) applies to any
product that is not a concern-routing tool. Banned, case-insensitive with word
boundaries: `delayed`, `delay`, `behind`, `deficit`, `disorder`, `diagnos*`,
`at risk`, `red flag`, `abnormal`, `percentile`, `normal range`,
`should be able to`, `by now`, `falling`, `struggl*`, `gifted`, `advanced for`,
`ahead of`. Also banned: any sentence comparing the child to another child.
Allowed reassurance vocabulary: stage, rung, typical, wide range, climbing.

**The never-diagnostic lint** applies to the two concern-routing tools, the
Language Milestone Coach and the Navigator, where "delay" and "typical range"
must be discussable but a diagnosis must never be implied. That lint is
narrower and is specified per product. It is already implemented for the
shipped tools in `keel/graders/floors.mjs`.

Reading level: grade 8 or below for enrichment products, grade 7 or below for
the Navigator, mechanically checked at cert.

Every product-level output carries a static, never-triggered footer routing to
the pediatrician. It is static precisely so that seeing it carries no signal.

## 6. The safety keel

Two of these six products are governed by an existing safety layer in `keel/`,
and specs for them must not contradict it:

- `keel/artifacts/lmc/floors.v1.json` holds red lines the Communication Snapshot
  may never undercut.
- `keel/artifacts/navigator/floors.v1.json` holds the same for the Navigator.
- Floors are red lines, not targets. For any answer pattern matching a floor at
  or beyond its age, using corrected age where applicable, the compiled result
  must be **at least** the floor's severity. Tools may flag earlier or harder
  than a floor. Never later, never softer.
- `keel/graders/selftest.mjs` proves this by brute force in CI: a generated case
  grid for the Snapshot at roughly 370k cases, and exhaustive path enumeration
  for the Navigator.

Any spec that changes an instrument, a threshold, or a terminal class in those
two products must state how the floors grader continues to pass, and must
assume the ten planted-violation fixtures still fail.

The floors artifacts themselves remain `drafted_pending_matthew_verification`.
The grader guarantees the tools match the artifacts. Only Matthew can certify
that the artifacts match the literature.

## 7. Citations and the G1 gate

Citations in these specs are in one of two states, and every seed table marks
which:

- **`verified: true`** means the entry is carried over from a source already
  verified in this repository. Three pools qualify: `nsc/content/citations.v1.json`
  (19 entries, G1-verified 2026-07-07), `keel/artifacts/shared/floor_sources.v1.json`
  (9 entries, drafted and pending Matthew's read), and `corpus/citations.json`
  (11 registered organizational sources).
- **`verified: false`** means the entry is a seed proposed by this spec and has
  **not** been checked against the paper. It carries the same G1 gate the Number
  Path spec carried: verify the full cite, the findings, and the effect sizes
  against the actual paper before content freeze. Do not ship numbers from
  memory.

No artifact ships with a `verified: false` citation. The cert harness enforces
this, the same way `nsc/lib/artifacts.ts` already refuses any artifact whose
hash lacks a matching passing report.

## 8. Writing rules for these documents

- No em dashes anywhere. Use commas, colons, or a new sentence.
- Name tradeoffs explicitly and state which side won and why. The Number Path
  spec's "Named tradeoff (decided)" pattern is the model.
- Prefer a table to a paragraph when the content is a matrix.
- Every threshold gets a citation or is marked as a product decision, never
  presented as science when it is a judgment call.
