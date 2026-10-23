# Domain move: growingmindsscience.com to fromlittleonward.com

Status: **prepared, not active.** The site is From Little Onward in name but still lives on growingmindsscience.com. Nothing below has been done. The redirect block is in `docs/domain-move-redirects.json`, which is never deployed, so it cannot fire by accident.

Do the steps in order. The old domain keeps working the whole time; the switch is the redirect in step 4.

## 1. Get the new domain ready

- [ ] Buy fromlittleonward.com (and consider www and common misspellings).
- [ ] Decide where its DNS lives. growingmindsscience.com is registered at Netlify, and Netlify still holds its DNS zone; never delete either.
- [ ] Add fromlittleonward.com and www.fromlittleonward.com to the static Vercel project (`growingmindsscience`), and wait for the certificate.
- [ ] Add the same domains to the nsc Vercel project if it is ever reached directly (today it is reached through the `/nsc` rewrite, so this may not be needed).
- [ ] Load https://fromlittleonward.com/ and https://fromlittleonward.com/nsc/class-login and confirm both serve.

## 2. Point the code at the new origin

All of these hard-code `https://growingmindsscience.com` today:

- [ ] Every page's `<link rel="canonical">`, `og:url`, `og:image` and `twitter:image` (about 120 HTML files; `scripts/check-canonicals.mjs` enforces absolute canonicals and holds the expected `ORIGIN`).
- [ ] The `ORIGIN` constant in `scripts/build-claims.mjs`, `scripts/build-explore.mjs`, `scripts/build-library.mjs`, `scripts/build-structured-data.mjs`, `scripts/check-canonicals.mjs`, and the absolute URL in `scripts/build-og-cards.mjs`. Rerun each generator after the change.
- [ ] JSON-LD `url` fields (Organization, WebSite, Person, BreadcrumbList) on the homepage, About, classes, articles and claims pages.
- [ ] `sitemap.xml` (every `<loc>`) and the `Sitemap:` line in `robots.txt`.
- [ ] nsc: `DEFAULT_SITE_ORIGIN` in `nsc/lib/site.ts`, the redirects in `nsc/next.config.ts`, and the `NEXT_PUBLIC_SITE_URL` env var on the nsc Vercel project.
- [ ] The entitlements URL the AI tool page calls (`tools/ask-the-research.html`).
- [ ] Share text in the arcade daily puzzles (`assets/js/daily-*.js` print `growingmindsscience.com/arcade`).
- [ ] Tests that assert the old origin (`tests/api`, `nsc/tests/site.test.ts`).

## 3. Outside the repo

- [ ] Email from-address: verify fromlittleonward.com in Resend (SPF, DKIM, DMARC), then set `NSC_EMAIL_FROM` and the static site's sender. Keep replies going to the Gmail inbox.
- [ ] Stripe: update the webhook endpoint URLs, Checkout success and cancel URLs (env vars), the customer portal's return URL, receipt links, and the business website in account settings.
- [ ] Supabase auth (project `xtepkichenvvyewqpolg`): Site URL and allowed redirect URLs, and the links in the auth email templates.
- [ ] Mux: the playback restriction's allowed referrers must include the new domain before the switch, or class videos stop playing.
- [ ] Web3Forms or other form endpoints that check the origin.
- [ ] Instagram bio link, and any other profile or listing that links the site.
- [ ] Google Search Console: add the new domain property, then use Change of Address from the old property after the redirect is live. Update the Analytics property name.

## 4. Switch

- [ ] Copy the two entries from `docs/domain-move-redirects.json` to the top of `redirects` in `vercel.json`, open a PR, and deploy.
- [ ] Verify: `curl -sI https://growingmindsscience.com/pricing` returns `301` with `location: https://fromlittleonward.com/pricing`; the same for `/nsc/class-login`, `/tools/ask-the-research?q=test` (query string kept) and `/tools/growing-minds-ai` (should reach `/tools/ask-the-research` on the new domain).
- [ ] Buy a class with a test card on a preview, sign in, play a lesson, and confirm the receipt and access emails link to the new domain.

## 5. Afterwards

- [ ] Keep growingmindsscience.com registered and renewing indefinitely, with the redirect in place. Old links in emails, posts and other sites depend on it.
- [ ] Keep `/tools/growing-minds-ai` redirecting forever.
