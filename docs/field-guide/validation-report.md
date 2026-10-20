# Field guide validation report (C5)

Final verification of the redesign on the live site, https://growingmindsscience.com, on 2026-10-15, after S0 to S8 merged. Everything below was run against production, not a local server, except the repo gates. The automated gates come from `node scripts/fg-gate.mjs --label c5-live --base https://growingmindsscience.com` over every page in the sitemap (55 pages; nsc is checked separately), and the full output is `gate-reports/2026-10-15-c5-live.md`. Screenshots are live captures in `reference/c5/`, each page at 1440 and 390, plus seven dark-theme pages.

Five small fixes were made during the run (listed at the end). They shipped with PR 132, and a recheck on the live site on 2026-10-15 confirmed each one. Two follow-up PRs then cleared the one target C5 missed, largest contentful paint: PR 133 self-hosts the fonts and PR 134 removes the last render-blocking import and serves the Lens image as WebP. Check 4 gives the numbers before and after.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Taste inspector, every page at 1440, 768 and 390 | No defects among the automated fails; three small items for Matthew (homepage and claim kickers, arcade dingbats, the AI input ring) |
| 2 | Axe, every page | Pass, 0 violations on all 55 pages at 1440 and 390 |
| 3 | No JavaScript, reduced motion, keyboard, tap targets | Pass; the four flags are content hidden until opened and one inline link |
| 4 | Lighthouse mobile (home, Lens, classes hub) | Pass after PRs 133 and 134: performance 98 on all three, LCP 2.29 to 2.30s (first run: 2.6 to 3.3s, over the target) |
| 5 | Sitemap and canonicals | Pass, 56 of 56 URLs return 200 and each canonical names itself |
| 6 | Redirects | Pass, 45 of 45 live redirects land where `vercel.json` says, the 3 added in C5 included |
| 7 | Purchase links | Pass for the classes up to the account step; **the Growing Minds AI Pro checkout fails (502)**, Matthew is checking |
| 8 | Login and class access | Not run; needs Matthew and the test account |
| 9 | Dark theme | Pass by eye on seven pages |
| 10 | Repo gates | Pass |
| 11 | Old system removed | Pass |

## 1. Taste inspector

The inspector ran on all 55 pages at 1440, 768 and 390. It reports something on every page, so its findings are split three ways below. `/milestones` did not return a report (the inspector's output breaks on that page, as it did on the S8 run). The full list is in the gate report.

**Rules that contradict the brand guidelines or the known quirks, so not defects.** These account for almost every line:
- `hairline` (53 pages): the guidelines call for quiet 1px rules.
- `palette-cream`: the paper color, #F7F4EC.
- `no-footage` and `still-page`: the site is meant to be calm.
- `few-pictures` (53): photographs wait on S7, and stock is not allowed.
- `covered-text` on `/classes/preschool` at 390: the sticky header, a known quirk.
- `micro-label` "science": the tracked SCIENCE in the wordmark lockup.
- "01" to "04" on the homepage and the Lens page: the four Lens steps in their real order.

**Judgment calls flagged for C5:**
- `focal-point` (32 pages): the first screen has no single dominant element. That is true of the text pages by design, where the headline leads.
- `headline-lines` (28): long titles wrap to three lines at 390. These are mostly claim questions and the right-now choices, where the full sentence is the point.

**Real, small, and left for Matthew's call rather than changed in C5:**
1. Kickers above headings, which the guidelines do not allow:
   - On the homepage: "The Developmental Lens" above "Leaving the playground", and the two class meta lines ("29 lessons in 5 modules, about 5 hours" and "15 lessons in 4 modules") above their class titles.
   - On the claim pages: "Scientific consensus" above the answer.
   - The homepage ones are part of composition B as approved, and the claim one is the verdict label. Two flagged lines are a short line ending a block just above a heading (toddler class at 390, FAQ at 768), the inspector's distance quirk, not kickers.
2. `/arcade/` uses decorative dingbats (✦ ✧ ✉ ♪ ✺) in the game UI, and its stylesheet uses `100vh` twice.
3. The Growing Minds AI input box draws its 1px forest border as a box-shadow ring. It reads as a border, not a shadow.

## 2. Axe

0 WCAG 2.2 A and AA violations on all 55 pages at 1440 and 390 (110 runs), including color contrast.

## 3. No JavaScript, reduced motion, keyboard and tap targets

- **No JavaScript:** passes on 54 of 55 pages. On `/milestones`, the tracker's progress counter ("0 of 42 milestones marked as noticed") and "Your notes" only exist with script. They are features that save to the browser, and the milestone content itself shows without script.
- **Reduced motion:** passes on 53 of 55 pages. The two flags are content that is hidden until opened: the homepage plate's labels, which appear when "Show what's growing" is pressed, and the Growing Minds AI topic sheet.
- **Keyboard:** no page has a tab stop out of document order. Escape closes every disclosure.
- **Tap targets:** every control is at least 44px at 390. The one flag is the "Communication Snapshot" link inside a sentence on `/milestones` (194 by 20). WCAG 2.5.8 exempts inline links in text.

## 4. Lighthouse

Mobile, simulated throttling, on the live site. First run, at C5:

| Page | Performance | LCP | CLS | TBT | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 95 | 2.77s | 0.002 | 0ms | 100 | 100 | 100 |
| `/lens/leaving-the-playground` | 96 | 2.58s | 0.017 | 0ms | 99 | 100 | 100 |
| `/classes/` | 92 | 3.25s | 0.001 | 0ms | 100 | 100 | 100 |

Performance cleared 90 everywhere, but LCP was over the 2.5s target on all three pages. The cause was the same on each: the Google Fonts stylesheet blocked rendering for about 810ms, and the font files came from a second origin after it, even though both origins were preconnected. On `/classes/` the LCP is the lead paragraph, so it waited for Newsreader (2.6s render delay).

Two PRs fixed it, each kept out of C5 because it touches every page's head:
- **PR 133** self-hosts Newsreader and Inter. The files are the same woff2 files Google served, latin and latin-ext subsets only, with the OFL licenses alongside, in `assets/fonts/`. They are preloaded and cached for a year. The CSP now allows fonts and styles from this site only. After it, the classes hub came under the target, but the Lens got slower (3.03 to 3.15s), because its LCP image now competed with the font files for the early bandwidth.
- **PR 134** removes the last render-blocking chain and lightens the Lens image. `field-guide.css` no longer `@import`s the tokens; every page links `tokens-field-guide.css` directly, so the browser fetches both at once instead of one after the other. The Lens photograph is served as WebP at 640 and 1122 wide (64KB and 137KB) through `<picture>`, with the JPEG kept as the fallback. The homepage Lens band uses the same files.

Rerun on the live site after both merged (`gate-reports/2026-10-15-c5-live-g8.md`):

| Page | Performance | LCP | CLS | TBT | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 98 | 2.29s | 0.001 | 36ms | 100 | 100 | 100 |
| `/lens/leaving-the-playground` | 98 | 2.30s | 0.001 | 0ms | 99 | 100 | 100 |
| `/classes/` | 98 | 2.29s | 0.000 | 85ms | 100 | 100 | 100 |

All three pages now meet G8: performance 90 or above, CLS under 0.1, LCP under 2.5s. Separate runs after PR 134 put the homepage at 2.36 to 2.49s, so its margin is the thinnest. The homepage's LCP is its headline, which waits for the Newsreader file (131KB), so taking it further would mean a design change, such as a smaller font subset.

## 5. Sitemap and canonicals

The live `sitemap.xml` lists 56 URLs. Every one returns 200, and for every non-nsc page the `<link rel="canonical">` is exactly the sitemap URL. On the first run, three class pages were still listed and canonicalised at their `.html` addresses (`/classes/birth-to-12-months.html`, `/classes/preschool.html`, `/classes/family-systems.html`) while the other class page and the rest of the site used clean URLs. PR 132 moved their sitemap entries, canonicals, `og:url` and JSON-LD to the clean addresses and added 308 redirects from the `.html` ones. Rechecked live after the merge: 56 of 56 URLs return 200 with a matching canonical. `node scripts/check-canonicals.mjs` passes on main.

## 6. Redirects

Each literal redirect in `vercel.json` was requested on the live site without following it. On the first run, 42 returned a 308 to exactly the configured destination, and the three new `.html` class redirects above returned 200 because they were not deployed yet. After PR 132 merged, all 45 return a 308 to their destination. There are no pattern redirects.

## 7. Purchase links

Every enroll link on the four class pages and `/pricing` was followed to the step before payment, and stopped there. No account was created and no form was submitted.

| Link | Live result |
|------|-------------|
| Birth to 12 months, "Enroll" | `/nsc/class-signup?next=/app/classes/infant/enroll`, 200. The page shows "Step 1 of 2: create your account", "Step 2: pay securely with Stripe", "$49 once" and the 14-day refund policy |
| Preschool years, "Enroll" | Same page for `/app/classes/preschool/enroll`, 200 |
| Enroll pages without an account | `/nsc/app/classes/infant/enroll` and `/preschool/enroll` return 307 to `/nsc/class-login?next=...`, so the sign-in wall holds and keeps the destination |
| Toddler years | Thinkific course page and Thinkific sign-in, both 200 (this class has not moved off Thinkific yet) |
| Gift a class | `/nsc/gift`, 200 |
| Family systems | Sign-in link only (the class is not on sale yet), 200 |
| Growing Minds AI Pro (`/pricing`) | `POST /api/create-checkout-session` returns **502** `{"error":"Could not start checkout. Please try again."}` every time. Stripe is rejecting the session: either the price behind `AI_PRO_PRICE_ID` is inactive or `STRIPE_SECRET_KEY` has changed. This predates the redesign and is outside its scope; Matthew is checking the price and key |

The Stripe checkout page itself is reached only after signing in, so it was not opened for the classes (that is check 8).

## 8. Login and class access

Not run. It needs the existing test account on the live site, and passwords are not entered on Matthew's behalf. Matthew will sign in, open a class he owns and play a lesson.

## 9. Dark theme

Captured live in dark: home, Explore, an article, the Communication Snapshot, a claim page, the milestone tracker and the class sign-in (`reference/c5/dark-*.jpg`). All seven switch to the dark field with light text, the header and footer follow, and nothing reads low contrast by eye.

## 10. Repo gates

On the branch: `stamp-assets --check` (every CSS/JS reference is stamped, 39 assets, 121 files), `check-canonicals`, `build-claims --check` (11 files match the artifact), `build-explore --check` (7 files match the data), nsc `npm test` (283 passed) and `npm run typecheck` all pass.

## 11. Old system removed

`terrain.js`, `lens.js`, `lens.css`, `decor.js`, `animate.js`, `seminar.css` and `arcade-page.css` are deleted (S8), and no page references them. `DESIGN.md` and `.impeccable/design.json` describe the Field Guide system, with no Terrain note left. `assets/js/home.js` still exists by name, but it is not the Terrain script the plan meant: composition B rewrote it as the Field Guide homepage's own script (the plate labels, the Lens tabs and entrances), and 54 pages load it for the entrances. `styles.css`, `refresh.css` and `tokens-terrain.css` remain only because the answers-library template (`build-library.mjs`) still uses them; that page is not in the sitemap.

## Fixes made during C5 (live since PR 132, each rechecked on the live site)

1. Homepage: the "Is that claim true?" row linked `/tools/library/`, which 404s; it now opens `/claims/`.
2. Three class pages moved to clean URLs: sitemap, canonical, `og:url`, JSON-LD, and 308 redirects from the `.html` addresses.
3. The header "Enroll, from $49" button was the last square control from the old chrome; it takes the system's 6px corners and Inter 500. Pages restamped.
4. The Growing Minds AI page's share image pointed at the retired logo PNG; it now uses the site card.
5. The nsc tab titles (class sign-in and sign-up, the classes area, activities, Should I Be Worried?, gift, redeem, evidence) used an em dash before "Growing Minds Science"; they now use " | ", as the static pages do.

## Still open (not blockers for the redesign)

- **AI Pro checkout 502** (check 7): Matthew.
- **Login and class access** (check 8): Matthew.
- **Explore tags** in `assets/data/explore.json`: Matthew's review.
- **Claims library** stays marked draft until Matthew's own source check (Macknin 2000 temperature table, Price 2012 methods, Markman 2009).
- **S7 photographs**: the pictures on the new pages are placeholders until Matthew's custom assets arrive (`asset-brief.md`).
- Em dashes remain in some product copy outside the redesign's pages: the right-now JSON, game copy, and Number Path copy such as the printables blurbs.
- The answers-library template still uses the old stylesheets; `scripts/smoke-tools.mjs` is out of date.
- Module 4 audio (lessons 4.2 and 4.3) needs a rebuild after the toddler-no source changes (#130).
