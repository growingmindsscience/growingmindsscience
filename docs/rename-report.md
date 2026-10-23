# Rename report: Growing Minds Science to From Little Onward

Branch: `rename/from-little-onward`, cut from `main` at `bd45952` on 2026-10-23. Not pushed, not merged, not deployed. Nothing was changed in Stripe, Resend, Supabase, Mux, ElevenLabs, Vercel or Instagram.

## Before you read the rest: where the brief and the repo disagree

The brief describes an older state of the site in four places. I followed the repo and the live site, and did not invent anything to match the brief.

1. **Typography.** The brief says Lora and Instrument Sans. The site uses Newsreader (display) and Inter (text), on main and live. I kept Newsreader and Inter, and built the wordmark in Newsreader.
2. **The stale classes page (step 7).** `/classes/` on main and on growingmindsscience.com is already the current template: three open classes at $49 with links to `/nsc/class-signup?next=...`, family systems "In development" with a waitlist, "Watch a lesson free", and the refund line. No Thinkific link, no "Enroll now", no "coming soon". I checked the live page with `curl` on 2026-10-23. Nothing to rebuild, so I changed only its name strings.
3. **The Thinkific sentence in the terms of sale (step 6).** It is not there. The terms of sale on main and live never mention Thinkific. Quote from the brief: "is sold and delivered through Thinkific." Quote from the page: none; the Classes section reads "Each class is a self-paced set of recorded lessons ..." and the FAQ says the classes run "under My classes". There is no conflict to flag. Every remaining `thinkific` hit in the repo is listed below.
4. **AI Pro.** AI Pro was retired on 2026-10-18. Pricing has no AI Pro card and no "unlimited ... for life" line. The terms of sale say "AI Pro is no longer sold." The hidden subscriber panel on the AI tool page is still wired, unchanged, and still opens with `?subscribed=1`.

Also: the Pricing H1 is "Prices, stated plainly.", not "Start free. Add more when you want it." I added the mission sentence to the lead paragraph under the actual H1.

## What changed, by page

**Every page (header and footer).** The lockup now reads `from little` in Newsreader with a tracked `ONWARD` after it, the same two-part treatment as `growing minds` + `SCIENCE`. The arcs-and-leaf mark stays (no letters; you confirmed only the brain logo is retired). The footer tagline is the mission line, "Science-backed parent education, open to any parent who seeks it." The big footer wordmark reads `from little / ONWARD`. The copyright line reads "© 2026 From Little Onward" with `<!-- TODO legal: confirm entity name and structure with attorney -->` beside it. The Tools menu entry is "Ask the research: A calm, research-grounded answer to a parenting question." The Instagram link URL is unchanged. The same changes are in the claims, library and explore generators, so generated pages stay in sync (their `--check` gates pass).

**Titles, meta, social tags.** Every `<title>`, meta description, `og:title`, `og:description`, `og:site_name`, `og:image:alt`, Twitter tag and JSON-LD `name` swaps the name. Canonicals, `og:url`, the sitemap and every absolute link stay on growingmindsscience.com.

**Homepage.** New "Why this exists." block between "Three things worth understanding" and "If something is hard right now", with the mission statement and one link, "How we teach" to `/about/`. It uses the same section padding and display type as its neighbours. The closing block adds "Open to any parent who seeks it." The meta description is the one in the brief; `og:description` and `og:image:alt` follow it. `Organization.description` and `WebSite.description` are the mission line. The Lens citation reads "Diamond, 2013; From Little Onward toddler class, Module 4." (also on `/lens/leaving-the-playground`).

**About.** The opening is the early-intervention sentence, then the mission statement, then the "Who this is for." line. The H2 is "How we teach." The meta and og descriptions are the ones in the brief. The `worksFor` Organization in the JSON-LD carries the mission line. The founder photo alt reads "Matthew McArthur, founder of From Little Onward."

**For programs.** The new mission line sits after the intro sentence.

**Pricing.** "The free tier stays free because the mission is access, not upsell." is appended to the lead.

**FAQ, classes, class pages, tools, articles, claims, explore, arcade, milestones, contact, thank-you, 404, from-instagram, lab comps.** Name swaps. I rewrote three sentences where the new name read badly: "a milestone tracker for parents, made by From Little Onward" (milestones), "You'll hear from us when a new class opens" (thank-you), and "ten arcade games by From Little Onward" (arcade).

**Ask the research (was Growing Minds AI).**
- The page moved from `tools/growing-minds-ai.html` to `tools/ask-the-research.html` and is canonical at `/tools/ask-the-research`.
- `vercel.json` permanently redirects (308) `/tools/growing-minds-ai`, `/tools/growing-minds-ai/` and `/tools/growing-minds-ai.html` to the new path. `_redirects` mirrors them.
- The sitemap lists only the new slug.
- Every internal link points at the new slug: nav, footers, explore data, `gms-tools.js` "Ask" links, the library generator, the nsc account pages and the nsc site chrome.
- The "GM" avatar is now the arcs-and-leaf mark in amber on the ink disc.
- "How this works" now says "...developmental research and From Little Onward class material."
- **System prompt** (`api/growing-minds-ai.js`): the assistant now introduces itself as "Ask the research, a developmental science tutor for From Little Onward". The knowledge base and class material are now called From Little Onward's, and so is the website it points people to for contact options. Behaviour, safety language, limits and the "never a diagnosis" framing are unchanged.
- The error strings in `api/` and on the page name the new tool.
- The API route stays at `/api/growing-minds-ai` because it is a code identifier.

**AI sources.** The answers' source labels now read "From Little Onward class, Toddler Years (1 to 3): Lesson ...". I changed only the generated metadata lines in `knowledge/sources/*.md`, the exporter and the compiler, then rebuilt `api/_knowledge-data.js`. A full re-export would also have pulled five unrelated wording changes from the class scripts (British spellings such as "labelling" and "programme"), so I reverted it and applied only the label lines.

**Account area (nsc).** The wordmark, the footer and the copyright line (with the legal TODO) are updated. Account, My classes, toddler enroll, gift-code admin and admin pages now use the new name. The parent-site name in `nsc/lib/config/brand.ts` is "From Little Onward". Page titles such as "Sign in to your classes | From Little Onward" changed through the shared swap.

**Emails and forms.** nsc's own emails (Number Path engagement and gift code) already send as "Number Path" and never named Growing Minds. The static site's form and purchase notifications to you now read "..., From Little Onward" and drop the em dashes beside the old name. The hidden form subjects on the articles and family-systems pages match the API allow-list. From-addresses are unchanged.

**Legal pages.** Terms of use, terms of sale and privacy are dated October 23, 2026, and name From Little Onward with no entity type. The legal TODO sits beside each line that names the operator, seller or copyright holder.

**OG images.** `scripts/build-og-cards.mjs` now renders "From Little Onward" with the arcs-and-leaf mark instead of the retired brain. Article cards keep the "Research, explained" kicker. All 13 cards were regenerated. The five `site-*.jpg` cards are photographs with no text, so they stay.

**Domain move (prepared, inactive).** `docs/domain-move.md` is the checklist. `docs/domain-move-redirects.json` holds the host-based 301 block. It lives in `docs/`, which never deploys, so it cannot fire. Nothing in `vercel.json` changed for the domain.

## Commits

1. `Rename inventory: every Growing Minds hit before the rename`
2. `Rename the site to From Little Onward: wordmark, footer, titles, meta`
3. `Ask the research: new slug, 301 from growing-minds-ai, prompt and API strings`
4. `Account area: From Little Onward wordmark and Ask the research strings`
5. `Make the mission prominent: homepage block, About opening, programs, pricing`
6. `Legal pages: From Little Onward as operator, entity TODOs, dated today`
7. `OG cards and AI source labels carry From Little Onward`
8. `Prepare the fromlittleonward.com move without activating it`
9. `QA: report, screenshots, inventory statuses`

## QA

- `node --test tests/api/*.test.mjs`: 101 pass. Tests updated for the new subjects, the prompt opening and the page path.
- nsc: `tsc --noEmit` clean, vitest 325 pass, `npm run cert` ran.
- The keyless gates all pass: arcade tests, eval selftest, keel selftest, the claims and explore drift checks, the `stamp-assets` cache-bust check (pages restamped after the `home.css` and `gms-tools.js` changes), the library selftest and compile, corpus certification, and absolute canonicals (92 pages).
- Browser, local server (`scripts/fg-gate.mjs --serve`), screenshots in `docs/rename-screenshots/`. Each page has a phone (375 px) light shot and a desktop (1280 px) dark shot. The homepage adds mission-block and footer shots in both. The homepage also has a desktop light shot. I did not capture the other two combinations (phone dark, desktop light) for every page; the light and dark themes share the same markup. The desktop-dark homepage hero shows an empty photo panel. That comes from the hidden browser pane at capture time: the image is loaded, and the page shows the photo normally. There is no horizontal scroll at 375 px.
- `?subscribed=1` on `/tools/ask-the-research` opens the subscriber unlock panel and strips the parameter, as before.
- **Redirects, verified on the Vercel preview of commit `0efb1d4` (2026-10-23, `vercel curl` through deployment protection):** `/tools/growing-minds-ai`, `/tools/growing-minds-ai/`, `/tools/growing-minds-ai.html` and `/tools/ask-the-research.html` all answer `308` with `location: /tools/ask-the-research`. `?q=why%20tantrums` and `?subscribed=1` carry through to the new URL. `/tools/ask-the-research` answers `200` with the new title, the canonical on growingmindsscience.com and the mark avatar. Vercel's `"permanent": true` sends 308 rather than 301; search engines treat both as permanent.
- The only console errors locally are 404s for `/_vercel/insights/script.js` and `/nsc/api/entitlements/me`, which exist only on Vercel.

## Remaining hits after the rename

`docs/rename-inventory.md` has every pre-rename hit with its status and the count left. What is left on deployed files:

- **Code identifiers, kept on purpose (rule 7):** the `gms-` storage keys and file names, `/api/growing-minds-ai`, the `#growing-minds-ai` anchor on the tools index, the `growing minds material` retrieval tag, the Instagram handle URL, and the domain.
- **Code comments:** CSS and JS file headers, `api/_retrieval.js`, `knowledge/curated.mjs`, `scripts/build-knowledge.mjs`, nsc lib comments, `.env.example` headings, `lab/lab.css`, `scripts/brand-mark/build.py`.
- **Descriptive English:** "one growing mind" on the homepage and class figures (allowed by the brief), and "The living field guide to the growing mind" as the hero subline of design comp `lab/a`.

## Lesson material that still says Growing Minds (out of scope, untouched)

- **Preschool Lesson 4.3, "Early math: the counting ladder".** The narration says "Number Path on the Growing Minds Science site is a short check-in...". It appears in:
  - `knowledge/sources/preschool-4-3-early-math-the-counting-ladder.md` line 79
  - the compiled `api/_knowledge-data.js`, so Ask the research can quote it
  - `nsc/supabase/migrations/0019_preschool_transcripts_from_scripts.sql` line 1375, the written lesson transcript in the database
  - the class script, audio and captions it came from, which live outside this repo
- **The archived first-draft infant class (not deployed).** `course/drafts/archive-v1/` has 14 files: module drafts, worksheets, quizzes, a landing page and DECISIONS.md.
- I did not query the transcripts stored in Supabase for the infant and toddler classes. Only the preschool one is visible in a migration. A read-only search of the lesson transcript column would settle it.

## Thinkific hits (all of them)

- `assets/css/chrome.css:287`: a code comment about an old "My classes" chooser.
- `nsc/supabase/migrations/0017_free_preview_lesson.sql:6`: a migration comment.
- Internal only (not deployed): `.impeccable/critique/*` (7 files), `docs/field-guide/*` (4), `docs/on-site-classes-*.md` (2), `docs/phase-3-identity-convergence.md`, `marketing/toddler-launch.md`, `course/drafts/archive-v1/companion/*` (3).

No page, link or legal text mentions Thinkific.

## Needs me (outside this repo)

- **Stripe:**
  - product names and descriptions for the three classes, Number Path and gift codes
  - receipt footer and statement descriptor (the Stripe account itself is named "Growing minds science" per nsc/README.md)
  - customer portal branding
  - the account's public business name and website
- **Email:**
  - the Resend sender display name if one is set there, and the `NSC_EMAIL_FROM` env var (default "Number Path <hello@...>")
  - Supabase auth email templates (sign-up confirmation and password reset), which live in the Supabase dashboard
  - Web3Forms notification settings
- **Mux:** player or branding metadata, if any. Add fromlittleonward.com to the playback referrer restriction before the domain move.
- **Instagram:** the handle `growingmindsscience`, the bio, the bio link, and post drafts in `marketing/` that name the old brand (17 files).
- **Google:** Search Console and Analytics property names.
- **Ads, directory listings, LinkedIn,** and anything else that uses the old name.
- **The new domain:** buy fromlittleonward.com, set up DNS and add it to Vercel, then work through `docs/domain-move.md`.
- **Legal:** confirm the entity name and structure with an attorney. Every footer copyright line and each operator or seller line in the legal pages carries the TODO.
- **Assets for you to decide on:**
  - Retired brain logos with "Growing Minds Science" text, unreferenced but publicly served: `assets/img/logo*.jpeg`, `logo-128.png`, `mission-logo.jpeg`.
  - Retired brain marks without text, now unused by any page or generator: `assets/img/original-logo-mark-no-words-*.png` and `nsc/public/logo-mark.png`. Old carousel build scripts in `marketing/` still reference them.
  - The four `assets/img/brand/lockup-*.svg` files, which outline "growing minds / SCIENCE" as paths. Regenerate them with `scripts/brand-mark/build.py` or delete them.
  - The class lesson slides, videos and narration, which were out of scope.

## Judgment calls

| Where | What I chose | Alternative |
|---|---|---|
| Wordmark | Lowercase `from little` in the display serif plus a tracked `ONWARD`, the exact lockup CSS the site already uses | The full `from little onward` in the serif with no descriptor |
| AI tool name inside sentences | "Ask the research, the AI tool, is included with your class..." the first time a sentence needs it to read as a product; plain "Ask the research" in links, headings and labels | Always the bare name, which can read like an instruction ("Ask the research is included...") |
| AI page context line | Kept "Ask the research · free, no account needed". The line under it already says "Get a calm, research-grounded answer...". The brief's context line is the nav description. | Put "a calm, research-grounded answer to a parenting question" in the label too (I tried it; it doubled the sentence below) |
| Footer tagline vs. AI page | The mission line everywhere, including the AI page | n/a |
| Homepage mission heading | "Why this exists." with a period, as written in the brief | No period, to match "Three things worth understanding" |
| About opening | Three paragraphs (experience, mission, who it is for) instead of one long lead | One paragraph |
| Pricing sentence | Appended to the lead under "Prices, stated plainly." | A separate line under the H1 |
| OG card mark | The small arcs-and-leaf drawing (`mark-small.svg`) | No mark, text only |
| OG alt format | "From Little Onward \| Title", matching what the pages already used | "Title \| From Little Onward" |
| Legal TODO on the terms of sale | Beside the meta description, the only line that names the seller | Also beside the "Buying" section, which names Stripe, not the seller |
| Notification subjects | "Program inquiry, From Little Onward" (comma replaces the em dash) | "From Little Onward: Program inquiry" |
| `growing minds material` retrieval tag | Kept (internal search keyword, never shown) | Rename and rebuild |
