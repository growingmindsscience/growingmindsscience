# Domain move: growingmindsscience.com to fromlittleonward.com

Status: **live as of 2026-10-24.** The site serves at https://www.fromlittleonward.com. fromlittleonward.com, fromlittleonward.org, growingmindsscience.com and www.growingmindsscience.com are set to 308-redirect there through Vercel's domain settings. `vercel.json` also redirects both growingmindsscience.com hosts (the first two entries under `redirects`), so the redirect holds even if a domain is ever attached to the project as a serving domain instead of a redirect. The production origin lives in one place, `SITE_ORIGIN` in `scripts/site.mjs` (and `DEFAULT_SITE_ORIGIN` in `nsc/lib/site.ts` for the class app); `node scripts/check-canonicals.mjs` fails CI if a page, the sitemap, robots.txt, the nsc default or the `vercel.json` redirect disagree with it. DNS for both new domains is at Spaceship. Unchecked items below are still open.

Do the steps in order. The old domain keeps working the whole time; the switch is the redirect in step 4.

## 1. Get the new domain ready

- [x] Buy fromlittleonward.com (and consider www and common misspellings).
- [x] Decide where its DNS lives. growingmindsscience.com is registered at Netlify, and Netlify still holds its DNS zone; never delete either.
- [x] Add fromlittleonward.com and www.fromlittleonward.com to the static Vercel project (`growingmindsscience`), and wait for the certificate.
- [ ] Add the same domains to the nsc Vercel project if it is ever reached directly (today it is reached through the `/nsc` rewrite, so this may not be needed).
- [ ] Load https://fromlittleonward.com/ and https://fromlittleonward.com/nsc/class-login and confirm both serve.

## 2. Point the code at the new origin

All of these hard-code `https://growingmindsscience.com` today:

- [x] Every page's `<link rel="canonical">`, `og:url`, `og:image` and `twitter:image` (about 120 HTML files; `scripts/check-canonicals.mjs` enforces absolute canonicals and holds the expected `ORIGIN`).
- [x] The `ORIGIN` constant in `scripts/build-claims.mjs`, `scripts/build-explore.mjs`, `scripts/build-library.mjs`, `scripts/build-structured-data.mjs`, `scripts/check-canonicals.mjs`, and the absolute URL in `scripts/build-og-cards.mjs`. Rerun each generator after the change.
- [x] JSON-LD `url` fields (Organization, WebSite, Person, BreadcrumbList) on the homepage, About, classes, articles and claims pages.
- [x] `sitemap.xml` (every `<loc>`) and the `Sitemap:` line in `robots.txt`.
- [ ] nsc: `DEFAULT_SITE_ORIGIN` in `nsc/lib/site.ts` and the redirects in `nsc/next.config.ts` are done; the `NEXT_PUBLIC_SITE_URL` env var on the nsc Vercel project still needs to be set to `https://www.fromlittleonward.com`.
- [x] The entitlements URL the AI tool page calls (`tools/ask-the-research.html`).
- [x] Share text in the arcade daily puzzles (`assets/js/daily-*.js` print `growingmindsscience.com/arcade`).
- [x] Tests that assert the old origin (`tests/api`, `nsc/tests/site.test.ts`).

## 3. Outside the repo

- [x] Email from-address: fromlittleonward.com is verified in Resend and hello@fromlittleonward.com forwards to an inbox. The nsc default sender is `Tallykin <hello@fromlittleonward.com>`; replies still go to the Gmail inbox. The static site sends no email. `NSC_EMAIL_FROM` is not set on the nsc Vercel project (checked 2026-10-25), so the default applies once deployed.
- [ ] Stripe: update the webhook endpoint URLs, Checkout success and cancel URLs (env vars), the customer portal's return URL, receipt links, and the business website in account settings.
- [ ] Supabase auth (project `xtepkichenvvyewqpolg`): Site URL and allowed redirect URLs, and the links in the auth email templates.
- [ ] Mux: the playback restriction's allowed referrers must include the new domain before the switch, or class videos stop playing.
- [ ] Web3Forms or other form endpoints that check the origin.
- [ ] Instagram bio link, and any other profile or listing that links the site.
- [ ] Google Search Console: add the new domain property, then use Change of Address from the old property after the redirect is live. Update the Analytics property name.

## 4. Switch

- [x] Host redirects for growingmindsscience.com and www.growingmindsscience.com are the first two entries under `redirects` in `vercel.json` (destination `https://www.fromlittleonward.com/:path*`, permanent). Vercel's domain-level redirect, when set, runs before them.
- [ ] Verify: `curl -sI https://growingmindsscience.com/pricing` returns `308` with `location: https://www.fromlittleonward.com/pricing`; the same for `/nsc/class-login`, `/tools/ask-the-research?q=test` (query string kept) and `/tools/growing-minds-ai` (should reach `/tools/ask-the-research` on the new domain).
- [ ] Buy a class with a test card on a preview, sign in, play a lesson, and confirm the receipt and access emails link to the new domain.

## 5. Afterwards

- [ ] Keep growingmindsscience.com registered and renewing indefinitely, with the redirect in place. Old links in emails, posts and other sites depend on it.
- [ ] Keep `/tools/growing-minds-ai` redirecting forever.
