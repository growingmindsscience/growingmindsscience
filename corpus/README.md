# The certified corpus

One source of truth for the developmental science this project stands on, and an
integrity gate that keeps every surface honest about it.

## The problem this solves

Knowledge currently lives in several places and drifts:

- `api/_knowledge-data.js` — 304 compiled cards (the parent AI's retrieval corpus),
  built by `scripts/build-knowledge.mjs` from 42 milestones, 18 curated cards, and
  244 chunks of uploaded course material in `knowledge/sources/`.
- `library/entries/*.json` — the developmental library, whose `evidence` fields
  reference those cards by id.
- `articles/*.html` — hand-written citations.
- `nsc/` — the Navigator's `part_c_directory` and citation set.
- `marketing/carousels/daily-log.md` — vetted (and rejected) research findings.

Nothing enforced consistency across these. Delete a card and a library page cites
a ghost; cite a contested finding in one place that another place debunks; add an
external source no one verified. This corpus layer makes those failures loud.

## What is here

- **`citations.json`** — the registry. Every external source a card may cite is
  listed and marked `verified`. `claims` records the replication status of
  specific findings (`supported` / `contested` / `attenuated` /
  `failed-replication`) so no surface presents a shaky result as settled. This
  promotes the vetting in `marketing/carousels/daily-log.md` into structured,
  enforceable data (30-million-word gap = contested; marshmallow = attenuated;
  helper/hinderer = failed replication).
- **`scripts/corpus/certify.mjs`** — the certifier. Treats the compiled knowledge
  base as the canonical corpus and cross-checks every surface against it, then
  writes a hash-stamped manifest. Runnable with no API key; deterministic (the
  manifest carries a content hash, not a timestamp, so a clean re-run is
  byte-identical). Same spirit as the nsc cert reports.
- **`manifest.json`** — the certified artifact (generated). Content hash, card
  counts by provenance, external-source coverage, the list of consumers, and the
  check results.

### Hard gates (fail the build)

1. No duplicate card ids.
2. **Every library entry's `evidence` id resolves to a real card** — the
   cross-surface integrity check. (Verified: planting a dangling reference turns
   the corpus red.)
3. Every external `source.url` a card cites is registered **and** verified in
   `citations.json`.
4. Registered source URLs are well-formed.

### Metrics (reported, not gating)

External-source coverage is a metric, not a gate: 244 of the 304 cards are chunks
of Matthew's own course material, whose source *is* the curriculum, so "no
external URL" is expected and legitimate for those.

## Run it

```bash
node scripts/corpus/certify.mjs      # green/red + writes corpus/manifest.json
```

Wire it as a pre-deploy gate alongside `evals/selftest.mjs`,
`tools/library/selftest.mjs`, and `npm run build`.

## Cutover plan (staged, gated — not yet done)

Today this layer *certifies* the existing sources without changing how anything is
built, so it is safe and additive. Full convergence, in order:

1. **Gate, don't rebuild (done).** `certify.mjs` green is a required check. Any new
   card, library entry, or citation must keep it green.
2. **Point the library grader at `citations.json`.** Have
   `tools/library/grader.mjs` reject any entry whose prose asserts a `contested` /
   `failed-replication` claim as settled — reusing the same registry.
3. **Fold article + Navigator citations into the registry** so every public claim
   traces to one verified list, and the certifier checks those surfaces too.
4. **Make `build-knowledge.mjs` a corpus consumer.** Re-point it (and the parent
   AI retrieval) at the certified corpus as the single input. **Gated on the eval
   harness (`evals/`) being green with a validated judge** — re-grounding the live
   AI must not regress behavior. This step needs `ANTHROPIC_API_KEY` and is queued
   for human sign-off.

Steps 2–4 are deliberately left for review because 3 and 4 touch live surfaces
(the AI's grounding). This is the architecture and the enforced integrity floor;
the cutover is a decision, not a surprise.
