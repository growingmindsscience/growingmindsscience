# Number Path (`nsc`)

Parent-run early-math check-in for ages ~2–5. Places a child on the
counting-development ladder (knower-levels → cardinal principle) via a guided
Give-N assessment ("The Feed-the-Bear Game"), then serves a personalized,
evidence-tagged plan of household games and daily number-talk prompts.

Spec: `nsc-build-spec-v1.md` (Matthew's copy). This app is **PR1** of the §12
sequence.

## Architecture

- **Zero runtime model calls.** All content is compiled offline into frozen,
  versioned, hash-certified JSON artifacts. Runtime is a pure TypeScript
  state-machine walk plus artifact lookups.
- **Titration protocol** = pure TS FSM in `lib/titration.ts` (PR2), exhaustively
  property-tested. Copy lives in compiled artifacts, keyed by machine state.
- **Compiler + cert harness** in `tools/nsc-compiler/` (PR3). Artifacts ship
  only on a green cert report; the runtime loader refuses any artifact whose
  hash lacks a matching passing report.

## Hosting (multi-zone)

Separate Vercel project rooted at `nsc/`, `basePath: "/nsc"`. The static site
proxies to it — after first deploy, add to the **root** `vercel.json`:

```json
{ "source": "/nsc", "destination": "https://<nsc-deployment>.vercel.app/nsc" },
{ "source": "/nsc/:path*", "destination": "https://<nsc-deployment>.vercel.app/nsc/:path*" }
```

## Backing services

- **Supabase**: schema in `supabase/migrations/` — ⚠ **DDL gate: proposed only,
  never applied without explicit approval.** Target project TBD: the org has
  hit its 2-free-project limit (Growingmindslaw + Child Evidence). Options:
  upgrade org, or create `nsc_*` tables inside an existing project.
- **Stripe**: one-time SKU (pricing option B, $29–39 — final price TBD).
  Checkout + webhook land in the paywall PR.

## Gates (from spec)

| Gate | Status |
|---|---|
| DDL apply | ⚠ blocked — stop-and-ask |
| G1 citation verification (human pass flips `verified: true`) | ⚠ open |
| G2 compile cost sign-off (~150–250k output tokens full compile) | ⚠ open |

## Commands

```bash
npm run dev        # local dev at localhost:3000/nsc
npm test           # vitest (titration property tests + cert tests)
npm run cert:gold  # cert harness against hand-authored gold artifacts
npm run cert:full  # cert against full compiled artifacts (post-PR4)
```
