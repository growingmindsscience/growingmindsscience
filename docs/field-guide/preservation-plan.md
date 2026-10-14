# Preservation plan: Phases 0 to 2

What Phases 0 to 2 do to each existing feature, and what Phase 3 must do. Status meanings:

- **Untouched:** the page and its behaviour do not change.
- **Linked from new homepage:** the page is untouched; the new homepage keeps its link.
- **Restyled:** the page's look changes in Phases 0 to 2.

## Changes in Phases 0 to 2

- `index.html`: rewritten as the new homepage. The URL `/` stays the same.
- `lens/leaving-the-playground.html`: new Developmental Lens prototype, with one rewrite in `vercel.json` and one `sitemap.xml` entry.
- `assets/css/tokens-field-guide.css` and any new field-guide CSS or JS: new files that no existing page imports.

## Existing URLs unchanged

Every route in the Phase 0 inventory keeps its URL and behaviour, except `/`, whose content changes. This includes `/nsc/*`, every `/api/*` endpoint and the 37 redirects.

## Preservation table

| Product or feature | What it is | Phase 0-2 status | Integration work later (Phase 3) |
|---|---|---|---|
| Birth to 12 Months | Class 1, Stripe checkout | Linked from new homepage | Restyle; keep class facts in step |
| Toddler Years | Class 2, checkout on Thinkific | Linked from new homepage | Restyle; keep the off-site checkout note |
| Preschool Years | Class 3, Stripe checkout | Linked from new homepage | Restyle; keep price copy in step with class facts |
| Family Systems | Class 4, waitlist only | Linked from new homepage | Restyle; keep the waitlist form and subject label |
| Pricing | Plans and the enrol band | Linked from new homepage | Restyle; one source for offer copy |
| Lesson access and purchase flows | nsc class pages, upgrade, gift | Untouched | Restyle pre-purchase pages; keep URLs and playback APIs |
| Growing Minds AI | AI tutor page and endpoint | Linked from new homepage | Restyle; keep endpoint, limits and access-code flow |
| Number Path | Separate Next.js app at `/nsc` | Linked from new homepage | Move nsc from Seminar to field-guide tokens |
| Milestone tracker | Single file at `/milestones` | Linked from new homepage | Restyle; keep the child-profile key it reads |
| Milestone navigator | Guided questions to a next step | Untouched | Restyle |
| Communication Snapshot | Early communication check | Linked from new homepage | Restyle |
| Activity Library | Filterable activities, ages 0 to 3 | Untouched | Restyle |
| Reading Prompt Cards | Dialogic reading prompts | Untouched | Restyle |
| It's hard right now | One-tap guide for hard moments | Untouched | Decide whether it gets the shared header; it has none |
| Arcade | Ten games in retro palettes | Linked from new homepage | Restyle the hub only; keep game palettes isolated |
| Articles | Eight long-form pages | Linked from new homepage | Restyle; keep structured data markers |
| Topic guides | Nine parent guides in `tools/` | Untouched | Restyle |
| Evidence-Graded Claims Library | Claim pages at `/claims`, grader in `tools/library/` | Untouched | Restyle the generator, not the pages; keep the drift gate |
| Auth and class access | Login, Google sign-in, class access code | Untouched | None; new sign-in UI keeps the cookie and flow |
| Payments | AI Pro checkout, webhook, subscriber tokens | Untouched | Resolve the two webhook handlers before changing either |
| AI entitlements | Subscriber token and `/nsc/api/entitlements/me` | Untouched | Keep both sources agreeing |
| Locally saved child profile | `gms-child-v1` and `gms-shelf-v1` in localStorage | Untouched | Keep the keys; a rename needs a migration |
| Printable outputs | Print styles and nsc printables | Untouched | Restyle after tokens settle |
| Redirects and SEO | Redirects, sitemap, canonicals, OG cards | Untouched, plus one sitemap entry and one rewrite | Keep canonicals absolute |
| Email and waitlist | Kit waitlist, Web3Forms contact | Untouched | Restyle the forms only |
| Homepage | `index.html` | Restyled | Align header and footer with inner pages |

## Risks

- The header differs between the new homepage and inner pages until Phase 3.
- Run `stamp-assets.mjs` after any edit to `assets/css` or `assets/js`; otherwise the cache-bust gate fails and returning visitors keep old files for a year.
- The toddler class checkout happens on Thinkific, off-site. Any new copy must say so.
- Two Stripe webhook handlers (root and nsc): confirm which one Stripe calls before changing either.
- Loading `tokens-field-guide.css` on a Terrain page overrides `--ink`, `--bg`, `--primary` and the fonts. Keep the new tokens off inner pages until Phase 3.
- Not yet present in this worktree: `index.html` still loads Terrain CSS and does not reference the field-guide tokens, and `lens/` is empty. The "linked" statuses assume the new homepage keeps these links.
- The lens page needs an absolute canonical (CI-checked).
