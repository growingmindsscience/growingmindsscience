# On-site classes: implementation scope

Prepared 2026-09-27. This is a scope and recommendation, not a change to the live purchase or lesson flow.

## Recommendation

Keep the existing public class pages on `growingmindsscience.com`. Deliver purchased lessons in the existing `/nsc` Next.js app on the same domain, using its Supabase login, Stripe checkout/webhook, and `entitlements` table. Add **My classes** to `/nsc/app/account`. Host video with **Mux signed playback** for the first release. The repository's course-format decision already names Mux for future courses; using it here gives one video workflow. Cloudflare Stream is a good substitute if predictable, simple metered billing is the priority. The video provider does not need to host the website or customer accounts.

## What exists now

- Public Toddlerhood sales pages link to Thinkific. The offer says $49, lifetime access, 5 modules, 29 lessons, and unlimited Growing Minds AI.
- `/account` sends customers to `/nsc/app/account`; `/nsc` is a same-domain proxy to a separate Vercel Next.js deployment.
- Supabase Auth handles customer login. The `entitlements` table already supports `class:<slug>` scopes, and the Stripe grant rules already map `class_bundle_toddlerhood` to `class:toddlerhood` plus `ai:unlimited`.
- The account currently displays a Thinkific link. There is no on-site lesson catalog, playback gate, course progress, or class checkout route.
- The current **shared** class access code grants permanent `class:toddlerhood` access to any signed-in account with the code. It cannot remain a way to claim paid classes if access is meant to be non-transferable.

## Customer journey

1. A visitor browses the public class page and chooses Enroll.
2. They sign in or create the same customer account used by Number Path. Return them to the intended class after authentication.
3. A server-created Stripe Checkout session ties a fixed, allowlisted class SKU to that authenticated user ID. The customer pays on Stripe.
4. A verified, idempotent webhook grants `class:toddlerhood` only after confirmed payment and records the order. A success page waits for the entitlement if the webhook is still processing, then links to the class.
5. **My classes** shows only classes the customer owns, with a Continue button and progress. A customer can return directly to `/nsc/app/classes/toddlerhood` after signing in.
6. Inside the class, modules and lessons are mobile friendly. Each lesson has video, captions, a written version, and any class resources. The customer can mark a lesson complete or resume it later.

## Build work

| Workstream | Scope |
| --- | --- |
| Course catalog | Add course/module/lesson records with stable slugs, ordering, publication status, video playback ID, written content, and resource references. Keep public descriptions separate from private lesson content. |
| Account and class UI | Add My classes, course overview, lesson player, next/previous lesson navigation, saved completion/progress, and useful empty/locked states. |
| Commerce | Add one-time Toddlerhood Stripe price and authenticated checkout action; bind order to account ID; verify webhook signatures; make processing idempotent; handle delayed payment success and failed/cancelled payments; reconcile missed webhooks. Preserve the advertised lifetime access and AI bundle. |
| Access control | Check authenticated user plus active `class:<slug>` entitlement **server side** for every lesson, private resource, and playback-token request. Keep video IDs and lesson files out of publicly served static paths. Configure private/signed playback, allowed site domain, and short token lifetime. |
| Video and resources | Upload source videos; attach and review captions and written versions; use a private bucket with short-lived signed links for downloadable PDFs. Configure a player that works on phones and with keyboard controls. |
| Existing customers | Export the Thinkific roster and purchase records; verify and import lifetime class grants to matching, verified customer accounts. For unmatched purchasers, use individualized, single-use claim links or support-assisted matching. Remove the shared-code route as a class-entitlement grant after migration. |
| Operations | Provide a small admin workflow or documented import for publishing lessons, replacing videos, issuing support grants, and reconciling Stripe/Thinkific orders. Monitor webhook failures and playback errors. |
| Cutover | Pilot with a few existing buyers; verify access and migration; switch all public Enroll/structured-data links to on-site checkout; email existing students; retain Thinkific access during a defined transition period. |

### Access model

The lesson page, transcript, resource endpoint, and playback-token endpoint each check the user's session and course entitlement. Only the server holds the Mux signing key. Tokens expire after a short viewing window, with refresh for longer lessons; the player is restricted to this site's domain. Private video assets have **signed** playback IDs and no public playback ID. PDF downloads use private storage rather than files in the static site. Add `Cache-Control: private, no-store` to entitlement and token responses.

This stops a copied lesson URL or permanent video URL from unlocking the class. A valid playback URL can still be copied and used until its token expires, and someone can share their account or record their screen. No normal web implementation can guarantee that paid content is impossible to share. Account session controls, playback anomaly review, and optional visible watermarks or DRM can make abuse harder; the first release should focus on paid-account gating and short-lived links.

### Payment and migration decisions

- Keep lifetime class ownership if that is the existing offer. Define whether a full refund or chargeback revokes access and implement that policy in Stripe reconciliation. Do not infer ownership from the checkout success redirect alone.
- Verify whether the existing Thinkific class can be exported with all 29 video sources, transcripts, downloads, and student records. Content migration effort depends on what can actually be exported; the public sales page is not a content inventory.
- Decide whether course progress should start fresh or be imported from Thinkific. Progress import can be deferred if records are unavailable, but tell existing students before cutover.
- The current shared code may have been copied beyond actual buyers. A verified purchase/roster import is the only reliable basis for migrated class access.

## Provider comparison (published pricing checked 2026-09-27)

| Provider | Fit and security | Example video cost* |
| --- | --- | --- |
| **Mux — recommended** | Signed playback tokens, optional domain/referrer restrictions, captions, player, analytics, and optional DRM. Fits the existing course-format decision. Pay-as-you-go is needed for a 29-video course because the Free plan limits stored videos to 10. | At 300 stored minutes of 1080p basic video and 12,000 minutes delivered in a month: about **$0.90** listed storage, with delivery within the plan's stated first 100,000 free minutes; actual bill depends on plan/credits and video settings. |
| **Cloudflare Stream** | Private videos with signed tokens, allowed origins, caption support, and simple storage/delivery rates. Works with the current Vercel app; moving the whole site to Cloudflare is unnecessary. | At the same usage: **$5 storage capacity + $12 delivery = about $17/month**. |

\*Illustrations only, excluding Stripe fees, Supabase/Vercel, taxes, optional DRM, and content-production costs. Confirm the selected plan and current rates before purchase. Provider references: [Mux pricing](https://www.mux.com/pricing), [Mux secure playback](https://www.mux.com/docs/guides/secure-video-playback), [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/), [Cloudflare Stream security](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/).

## Estimated delivery

Rough engineering estimate for a production-ready first class: **11–19 developer days**, plus content preparation and the Thinkific export. This assumes the 29 source videos and written lessons are available and that the existing Supabase/Stripe deployment is functioning. A useful sequence is:

1. Inventory/export, provider setup, and data model: 2–3 days.
2. Checkout, grant/reconciliation logic, and access gates: 3–5 days.
3. My classes, lesson player, progress, and resources: 3–5 days.
4. Migration, end-to-end verification, accessibility review, and cutover: 3–6 days.

Acceptance checks: an unpaid/signed-out visitor cannot load lesson content, resources, or mint a video token; paid purchase unlocks the right account and appears in My classes; copied lesson links fail without an entitlement and copied playback links fail after token expiry; existing verified buyers retain access; refunds follow the chosen policy; 29 lessons play on mobile with reviewed captions and readable written content; progress survives sign-out; failed/retried webhooks do not create incorrect grants.
