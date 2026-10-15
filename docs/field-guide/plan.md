# The Field Guide: plan to done

Written 2026-10-14, after Phases 0 to 2 shipped (PRs #101, #102, #103) and the Phase 3 build finished on its own branch. This is the working plan for the rest of the brief, with the quality gate every pull request must pass and the checkpoints where Matthew looks before work continues.

## The goal

One definition of done, in six measurable parts:

1. Every page on growingmindsscience.com, Number Path included, reads as one Field Guide. Test: with the wordmark hidden, a stranger shown any two pages says they belong to the same site.
2. The brand guidelines' approval checklist passes on every surface: recognisable without a logo; one lead message per surface with the four lines in their roles; honest uncertainty; a hurried parent on a phone reaches hard-moment support in two taps from any page; every purchased class and existing tool still works.
3. The three doors exist and share one content base: by age, by moment, by topic.
4. The Lens on leaving the playground carries scientific copy Matthew has reviewed against sources, and the "prototype" label is gone.
5. Every page meets the ship gate below: taste inspector 0 FAIL at three widths, axe 0 violations, keyboard and no-script walks clean, Lighthouse mobile performance at 90 or above on the homepage, the Lens and the classes hub.
6. The Phase 4 validation report is written from screenshots of the live site, not from the code, and Matthew has approved the final deploy.

When all six hold, the redesign is finished. Anything after that is new work with its own brief.

## Status 2026-10-15

S0 to S8 have merged, and C5 was approved with PR 132. The one gate C5 missed, LCP under 2.5s on the three Lighthouse pages, passes on the live site since PRs 133 and 134 (`validation-report.md`, check 4). Two checks from the definition of done wait on Matthew: the login and class-access walk with the test account, and the Growing Minds AI Pro checkout, which returns 502. The table below is the state on 2026-10-14, kept as written.

## Decisions recorded 2026-10-14

- C0 is answered: all five recommendations below are adopted as written (guideline hex values, both sages, research blue for sources, DM Sans kept with Newsreader, 6px corners on controls, inputs and panels only, the hero and lead-line split, the lowercase wordmark). They ship in S2 and are not reopened.
- PRs #99 and #100 (Terrain era) are closed as superseded by the Field Guide. S6 restyles nsc; S8 rewrites `DESIGN.md`.
- Execution shape: one Opus session runs S0 to S8 in order and stops at every checkpoint. This replaces the "Model tiers" paragraph under the ship gate; no Sonnet workers.

## Where things stand

| Area | State |
| --- | --- |
| Design system, homepage, Lens | Live on main. Four defended inspector warnings. |
| Photographs | Four of five placed. Founder portrait is still the old photo. |
| Inner pages (Phase 3) | Built on `redesign/field-guide-phase-3`, 67 files. Based on the commit before #102 and #103, so it conflicts with main in `index.html` and the Lens page. Not reviewed with screenshots. Not pushed. |
| Explore hub | Does not exist. The nav's Explore link points at the homepage anchor. No by-moment or by-topic door. |
| Lens science | Prototype label on the page. No source review yet. |
| Number Path (nsc) | Still on the Seminar look. Phase 3 report lists what it needs. |
| Brand guidelines | Supplied today. Token values, the type pairing, corners and the hero line differ from what shipped. Summarised in `brand-guidelines.md`. |
| Dead code | `terrain.js`, `home.js` unused; `decor.js`, `animate.js` loaded by older inner pages. |

## The ship gate

Every pull request on this project passes all of this before it is offered for merge. Results go in the PR description; screenshots are attached to the PR with `gh pr comment --attach`. A gate that was not run is written as "not run" with the reason, never implied.

**G1. Repository gates.** `stamp-assets --check`, `check-canonicals`, `build-claims --check`, nsc tests. These already run in CI; they also run locally before the PR opens.

**G2. Lint.** Taste lint on every changed stylesheet: 0 FAIL. Known false positive: `shadow-none`.

**G3. Inspector.** Taste inspector on every changed page at 1440, 768 and 390: 0 FAIL. Every WARN is either fixed or defended in one sentence in `design-critique.md`. The four standing defences (paper read as cream, size count, card rows for real tablists, no footage) carry over; a new warning needs a new sentence.

**G4. Eyes on the page.** Fresh playwright-cli screenshots of every changed page at 1440 and 390, full height, read one screen at a time as a juror would. The critique is written in the `critique.md` format with scores, the top three problems are fixed, and one more round confirms the fixes. Three rounds at most. A problem visible in a screenshot is real whatever the code says. This is the gate that failed on the first homepage delivery, and it is the one that does not get skipped.

**G5. Figures.** Every drawn figure is screenshotted alone at 2x and checked against the proportion sheet: an adult about 7.5 heads tall, a toddler about 4, an infant about 3.5; an arm three heads from shoulder to fingertip; a leg four heads from hip to sole. The posture test: the figure's action must be nameable in one sentence from the picture alone. If it cannot be named, it is redrawn from parts, not nudged.

**G6. Function.** On every page that carries a control: the page rendered with JavaScript off still shows all its content; a keyboard walk reaches every control in reading order with visible focus and Escape closes anything that opens; the reduced-motion run shows every element in place; axe reports 0 violations; every tap target at 390 is at least 44px.

**G7. Brand.** The guidelines' approval checklist, item by item, on the changed surface. Plus the house rules: no em dashes, no stock photography, no clay, ochre or amber at any size larger than an annotation mark, no eyebrows or kickers, one lead message per surface.

**G8. Performance.** Lighthouse mobile on the homepage, the Lens and the classes hub whenever a shared stylesheet, script or image changes: performance 90 or above, cumulative layout shift under 0.1, largest contentful paint under 2.5 seconds.

**G9. Preview on a phone.** The Vercel preview URL for the PR is opened at phone width (playwright-cli with the mobile device) and the first screen, the header, the footer and every control are checked on the deployed build, not the local server. Matthew opens the same preview on his own phone before saying merge.

**One command.** Step S0 adds `scripts/fg-gate.mjs`, which runs G1, G2, G3, G6 and G8 over a page list and writes the report to `docs/field-guide/gate-reports/`. Gates G4, G5, G7 and G9 are judgement and stay manual, but the script prints their checklist at the end so none is forgotten.

**Model tiers.** Mechanical steps (merges, template application across many files, gate runs, report writing) go to Sonnet sessions with a tight brief. Design judgement (G4, G5, compositions, figure drawing, critique) stays with Fable. Nothing merges on a session's own report; the diff and the screenshots are checked here first.

## Design checkpoints

A checkpoint is a place where work stops until Matthew has looked. Each one says what he sees, what he decides, and what happens if he says nothing.

**C0. Brand reconciliation (before any further page work).**
What he sees: this document and `brand-guidelines.md`.
What he decides:
- Colour values: adopt the guidelines' hex values (ink `#193C39`, paper `#F7F4EC`, verdigris `#245F58`, white `#FFFDF8`) in place of the brief's earlier proposals. Recommendation: yes. The change is a token swap and a contrast re-check.
- Sage: the guidelines' sage mist `#E0EBE5` is a pale explanatory surface; the shipped sage `#A9C3B2` is a mid-tone field that whole sections sit on. Recommendation: keep both, sage mist for panels and explanatory surfaces, the deeper sage for the field sections and figure fills, and check both against the 70/20/10 proportion on each page.
- Research blue `#426B91`: adopt for sources, citations and the claims library's technical detail. Recommendation: yes.
- Type: Inter (preferred) or DM Sans (the named second direction, shipped). Recommendation: keep DM Sans. It is already measured and tuned across every page, and the guidelines allow it. Switching is a two-line token change if he wants Inter.
- Corners: the guidelines ask for calm rounded corners; the shipped system is square. Recommendation: 6px on controls, inputs and panels; photographs, bands and tables stay square.
- Hero: the guidelines put "See what's growing." in the hero. The shipped headline is "See what's growing beneath the behavior." Recommendation: the headline becomes "See what's growing." and the supporting sentence carries "beneath the behavior". Then "The first five years, understood." leads the classes hub, "Mental models, not scripts." leads About, and "Less pressure. Better explanations." leads the close.
- Wordmark: lowercase "growing minds" with tracked "SCIENCE". Recommendation: adopt in the header and footer.
If he says nothing: the recommendations are the defaults and are shipped in S2.

**C1. Phase 3 review deck (before the Phase 3 merge).**
What he sees: a page of screenshots at 1440 and 390 for the nine hub pages, one article, one tool page and one claims page, with the critique and its scores, and the Vercel preview URL.
What he decides: merge, or the list of what to fix first.
If he says nothing: nothing merges. Phase 3 waits.

**C2. Explore hub composition (before the hub is built out).**
What he sees: two compositions for `/explore/` as screenshots of a working first screen at both widths, each with its one idea in a sentence.
What he decides: which composition.
If he says nothing: the one the critique scores higher is built.

**C3. Lens source sheet (before the prototype label comes off).**
What he sees: every scientific sentence on the Lens page in a table with its candidate source from the claims library or the class sources, its evidence grade, and a proposed rewording where the sentence overreaches.
What he decides: approve, reword or cut each line. This is his review as the scientist; it is not delegated.
If he says nothing: the label stays. The page remains a labelled prototype indefinitely rather than carry unreviewed claims.

**C4. Number Path preview (before the nsc deploy).**
What he sees: screenshots of the nsc home, a lesson and the class login on the preview, beside the same pages on the main site.
What he decides: deploy or fix.

**C5. Final verification (before the last deploy).**
What he sees: the Phase 4 validation report with live screenshots, the gate reports, the Lighthouse scores and the regression results for purchase links, login and class access.
What he decides: the redesign is done, or what remains.

**Standing checkpoint.** Every PR has a Vercel preview. He looks at it on his phone before saying merge. No merge is made on this side without his word, as on PRs #101 to #103.

## The steps, in order

Each step is one pull request with the ship gate in its description. Dates are working days from the day C0 is answered.

**S0. Foundations (day 1).**
Commit `plan.md` and `brand-guidelines.md`. Write `scripts/fg-gate.mjs` and a `docs/field-guide/gate-reports/` folder. Confirm Lighthouse and axe run locally; if either is missing, say so in the first gate report rather than skipping silently. Sonnet session for the script; checked here.
Output: the gate runs on the homepage and the Lens and its report is the baseline.

**S1. Land Phase 3 (days 1 to 3).**
Merge main into `redesign/field-guide-phase-3`. The two conflicts (`index.html`, the Lens page) are resolved by taking main's version and re-splicing the Phase 3 header and footer fragments, so neither the polish nor the chrome is lost. Run the full gate on the nine hubs, one article, one tool and one claims page. Write the review deck. Fix the top three per page. Checkpoint C1. Merge on his word. Verify live with playwright-cli at both widths.
Mechanical merge and gate run: Sonnet. Critique and fixes: here.
Known debt carried forward: the four-photograph floor on text pages (brand rule: no stock, so it waits for custom assets); the sticky header reported as covered text (the chrome, not the content).

**S2. Brand tokens (days 3 to 4).**
Apply the C0 decisions in `tokens-field-guide.css`, the header and footer fragments, the hero and the lead lines on classes, about and the close. Re-check every contrast pair the guidelines list and the ones they do not (ink-muted on paper, on-ink-muted on the ink field, sage-mist text pairs). Inspector on the homepage, the Lens and all nine hubs. Lighthouse on the three pages.
Output: one PR, one gate report, the critique updated.

**S3. The Explore hub (days 4 to 8).**
Build `/explore/` with three doors on one page: by age (the homepage explorer's stages, each linking to its classes, articles and tools), by moment (the Lens, the hard-moment guides and the tools, each as a recognisable situation), by topic (communication, learning, play, relationships, sleep, behaviour, regulation, each a list of the existing articles, guides and claims). Metadata lives in one JSON file so the three doors read one content base, and the homepage explorer reads the same file. The nav's Explore link moves from the homepage anchor to `/explore/`. Checkpoint C2 after the two first-screen compositions. Full gate. The Lens gets its age and topic metadata and its contextual links from the same file.
Compositions and page: here. Metadata file and link audit: Sonnet.

**S4. The older inner pages (days 8 to 12).**
Rebuild on `field-guide-pages.css`, in batches: the eight articles; the guides under `/tools/`; the claims template in `build-claims.mjs`; FAQ, contact, 404, thank-you, the arcade hub. Each batch is a PR with the gate; one page per batch gets the full G4 critique, the rest get the inspector and a screenshot pass. The research-blue source module from S2 goes on every article and claims page. `decor.js` and `animate.js` stop loading where nothing needs them.
Template application: Sonnet with the first page done here as the model.

**S5. The Lens sources (days 8 to 12, in parallel with S4).**
Build the source sheet for C3 from the claims library and the class sources. On his answers, reword, add the references module, remove the prototype label, update `lens-plan.md`. Gate on the Lens page.
Sheet: here. Nothing on the page changes before C3.

**S6. Number Path (days 12 to 15).**
Port the tokens and fonts into the nsc app's `globals.css`, give it the Field Guide header and footer, strip the Seminar remnants the Phase 3 report lists, keep every cert-gated behaviour. Redeploy without build cache and verify the live CSS carries the tokens. Checkpoint C4.
Port: Sonnet. Review: here.

**S7. Assets (when the pictures exist).**
Founder portrait (asset brief slot 5) placed on the homepage and About. Optional playground loop as a muted poster-framed clip in the Lens band. Four-photograph floor re-checked on the text pages with any new custom pictures.

**S8. Phase 4 verification (days 15 to 18).**
Full-site run: inspector, axe and the no-script walk on every HTML page; Lighthouse on the three pages; every purchase link walked to the Stripe page and stopped there; login and class access with the existing test account on the preview; redirects, sitemap and canonicals; `terrain.js` and `home.js` deleted; `DESIGN.md` rewritten as the Field Guide system (the Terrain note removed); the validation report rewritten from live screenshots. Checkpoint C5. Final deploy on his word.

## Rules that hold throughout

- No deploy without his word. Preview first, merge second, verify live third.
- The brief and the guidelines win over taste. Where they differ from the shipped system, C0 settles it once, in writing, and the answer is not re-litigated.
- No scientific sentence is added or changed outside C3.
- No new stock photography. Drawn figures pass G5 or are redrawn.
- Git: this session works in the field-guide worktree; the Phase 3 branch has its own worktree; the stash is shared, so WIP commits instead of stashes.
- Vercel: the Hobby build throttle can silently block a git deploy; if a preview does not appear, deploy from the CLI and say so.
- Every session brief names the files, the gate and what done looks like. A session's report is not proof; the diff and the screenshots are.
