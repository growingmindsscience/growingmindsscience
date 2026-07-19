# Programmatic developmental library

Calm, research-grounded answers to the long-tail questions parents of children
0–5 actually search at 2 a.m. — "is it normal my 2-year-old isn't talking",
"my 18-month-old isn't walking", "how much screen time" — compiled from
structured, evidence-tagged source entries into on-brand static pages.

This is a content moat, an SEO surface, and a grounding corpus at once, built on
the same discipline as the rest of the repo: **compile offline, grade
mechanically, never ship ungraded content, require human sign-off to publish.**

## Pipeline

```
library/entries/*.json      ──▶  tools/library/grader.mjs  ──▶  scripts/build-library.mjs  ──▶  answers/*.html
   (source of truth)              (cert gate: must be green)      (draft → preview → publish)     (generated, gitignored)
```

1. **Source** — one JSON entry per answer (`library/entries/<slug>.json`).
   Schema: `slug`, `status` (`draft`|`approved`), `question`, `ageBand`,
   `domain`, `shortAnswer`, `sections[]`, `tryTonight[]`, `whenToReachOut`,
   `evidence[]` (knowledge-card ids from `api/_knowledge-data.js`), `related`.
2. **Grader** (`tools/library/grader.mjs`) — mechanical, no API key. Enforces:
   structure; the **same no-fear / no-diagnosis / no-dosing lexicon the parent AI
   is graded against** (imported from `evals/lib/checks.mjs` — one behavioral
   standard for AI answers and published pages); a calm "when to reach out"
   section; every claim tied to a **resolvable** knowledge-card citation; and a
   Flesch–Kincaid reading grade ≤ 9. Self-tested by `tools/library/selftest.mjs`
   (planted-violation gate, runs in CI).
3. **Compiler** (`scripts/build-library.mjs`) — renders each green entry to an
   on-brand page (reusing the site CSS) with JSON-LD (`Article` + `FAQPage` +
   `BreadcrumbList`), source citations, related articles/class, and an
   "Ask Growing Minds AI about this" prefill. **Cert gate: a non-green entry is
   never emitted.**

## Commands

```bash
node tools/library/selftest.mjs        # grader soundness (no key, CI gate)
node scripts/build-library.mjs         # grade all + report; writes nothing
node scripts/build-library.mjs --preview   # render ALL green entries as noindex drafts for local review
node scripts/build-library.mjs --publish   # render ONLY status:"approved" entries as live, indexed pages
```

## Publishing = human sign-off

Every seed entry ships as `status: "draft"`. Drafts are **never committed and
never deployed** (`answers/` is gitignored). To take an answer live:

1. Review it locally: `--preview`, open `answers/<slug>.html`.
2. Flip its `status` to `"approved"` in the source entry.
3. `node scripts/build-library.mjs --publish`, then commit the generated page(s).
4. Add the URL to `sitemap.xml`. Optionally add a `/answers/:slug*` clean-URL
   rewrite in `vercel.json` and flip canonicals from `.html` to clean.

This mirrors the Navigator / Activity Library rule: draft content is invisible in
production until a human approves it.

## Seed batch (batch-001, all draft)

Six grounded entries spanning the search-heavy worries, each grader-green:
talking (19–24m), walking (13–18m), tantrums (19–24m), pointing (10–12m), potty
(25–36m), screen time (13–18m).

## Scaling it

The entry schema is deliberately model-friendly. To grow the library, generate
candidate entries (e.g. via Claude over the knowledge base), then run every one
through the grader — nothing publishes until it is green **and** approved. The
grader is the trust boundary, so quantity never costs quality.
