# Infant class setup

The infant course uses the on-site class system under `/nsc`. Its customer path is `/nsc/app/classes/infant`; the private lesson manager is `/nsc/admin/classes?course=infant`. The public class page stays on its waitlist until the full class is reviewed and a purchase flow is configured.

## Current content

The course follows the supplied four-module, 16-lesson video plan. All 16 signed Mux videos are attached as drafts, and their generated transcripts have been imported. Supabase migrations `0009` through `0013` record the outline. Draft lessons are not returned by the customer page or playback API.

Uploading uses the class admin form, which creates Mux assets with **signed** playback only. After each upload, check status, review captions and transcript, and leave the lesson in draft until approved. The database enforces a signed video ID, reviewed captions, and written text before publishing. Replacing a video clears the previous transcript and caption approval; review the new version before publishing.

## Customer access and launch

`My classes` includes this course only for an authenticated account with an active `class:infant` entitlement. The infant lesson page, signed playback token endpoint, and progress endpoint each check that entitlement and published status. A copied page URL cannot open a lesson for another account. Signed Mux tokens expire; as with any streamed video, screen recording cannot be prevented completely.

The infant checkout uses a separate $49 one-time Stripe price (`INFANT_CLASS_PRICE_ID`) and grants only `class:infant`. Its `INFANT_CLASS_SALES_ENABLED` switch remains off until all 16 lessons are published. Keep the public waitlist until that switch, Stripe price, webhook, and purchase flow are verified. Do not grant `class:infant` access based on a shared code. Before opening sales, test signed-out, unpaid, and paid accounts; mobile playback; captions; progress; copied links; and refund revocation. The current Toddler years checkout remains separate.
