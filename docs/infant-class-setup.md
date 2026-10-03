# Infant class setup

The infant course uses the on-site class system under `/nsc`. Its customer path is `/nsc/app/classes/infant`; the private lesson manager is `/nsc/admin/classes?course=infant`. The public class page stays on its waitlist until the full class is reviewed and a purchase flow is configured.

## Current content

The course outline follows the provided video plan. Module 1 is **The Newborn Brain**, with five draft lessons in the same order as the supplied MP4s. Supabase migrations `0009_infant_class_drafts.sql` and `0010_infant_module_1.sql` were applied to project `kxljngtmnqarvsawakmf` on 2026-09-27. Draft lessons are not returned by the customer page or playback API.

The MP4 source files are in `Downloads/GMS_Infant_Course_files/Videos/Module 1 - The Newborn Brain/`. The local README and store plan in that folder are reference material, not operating instructions. Uploading should use the class admin form, which creates Mux assets with **signed** playback only. After each upload, check status, review captions and transcript, and leave the lesson in draft until approved. The database enforces a signed video ID, reviewed captions, and written text before publishing.

## Customer access and launch

`My classes` includes this course only for an authenticated account with an active `class:infant` entitlement. The infant lesson page, signed playback token endpoint, and progress endpoint each check that entitlement and published status. A copied page URL cannot open a lesson for another account. Signed Mux tokens expire; as with any streamed video, screen recording cannot be prevented completely.

There is no infant Stripe price or checkout yet. Choose the offer and price only after the full course is ready. Keep the public waitlist and do not grant `class:infant` access based on a shared code. Before opening sales, test signed-out, unpaid, and paid accounts; mobile playback; captions; progress; copied links; refunds; and the completed six-module outline. The current Toddler years checkout remains separate.
