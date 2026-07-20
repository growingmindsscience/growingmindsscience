# Safety keel

The governing safety layer for the two developmental-concern tools:

- **Communication Snapshot** (`tools/communication-snapshot.html`) — the "LMC":
  vocabulary estimates + 12 behavior items, compiled to a severity report
  (none < watch < discuss < priority_discuss).
- **Milestone Navigator** (`tools/milestone-navigator.html`) — eight
  worry-domain question sets, each ending in a terminal class
  (typical_range < discuss < priority_discuss).

## How it fits together

```
artifacts/shared/floor_sources.v1.json   sources every floor must cite
artifacts/lmc/floors.v1.json             red lines the Snapshot may never undercut
artifacts/lmc/instrument.v1.json         what the Snapshot asks
artifacts/lmc/interpretation.v1.json     how answers compile to a report
artifacts/navigator/floors.v1.json       red lines the Navigator may never undercut
artifacts/navigator/trees.v1.json        the eight question sets + terminal copy
lib/lmc.mjs, lib/navigator.mjs           the engines; imported UNCHANGED by both
                                         the browser pages and the CI grader
graders/floors.mjs                       the floors grader (implements floors.contract.ts)
graders/selftest.mjs                     CI gate: artifacts pass + 10 planted violations fail
graders/fixtures/planted-violations.mjs  the ten deliberately-softened artifacts
```

The floors files are **red lines, not targets**: for any answer pattern that
matches a floor at or beyond its age (corrected age where applicable), the
compiled result must be at least the floor's severity/class. Tools may flag
earlier or harder than a floor; never later or softer. The grader proves this
in CI by brute force: a generated case grid for the Snapshot (~370k cases) and
exhaustive path enumeration for the Navigator, both run through the same engine
modules the pages import. Policy floors (the standing parent-gut invitation on
every typical result; no bilingual softening or discounting anywhere) are
enforced by copy checks and a lexicon scan in the same grader.

Run locally: `node keel/graders/selftest.mjs`
CI: the "Safety keel" step in `.github/workflows/gates.yml` (keyless, every push/PR).

## Certification status

Per `graders/floors.contract.ts`, the grader gates merges only after the ten
planted-violation fixtures all fail and the approved artifacts pass. Both hold
as of 2026-07-19. The artifacts themselves remain
`drafted_pending_matthew_verification`: every floor and every source in
`floor_sources.v1.json` still needs Matthew's read-through before that status
flips. The grader guarantees the tools match the artifacts; only Matthew can
certify the artifacts match the literature.

## Launch status

- **Communication Snapshot: launched.** Linked from /tools, in the sitemap, indexed.
- **Milestone Navigator: built, held** per `DECISIONS.md` D3 (attorney review is
  the launch blocker; build proceeds, launch does not). It is fully functional
  at `/tools/milestone-navigator` for review, with `noindex`, no sitemap entry,
  and no tools-index card. To launch, make the three changes marked
  `NAVIGATOR-LAUNCH` (robots meta in the page, card in `tools/index.html`,
  entry in `sitemap.xml`).

## Word-list note (CDI exclusion)

v1 deliberately ships with direct count estimates and **no word checklist**, so
the CDI item-overlap question never arises. If a checklist version is ever
built, `artifacts/lmc/cdi_exclusion/README.md` is the binding contract for it.
