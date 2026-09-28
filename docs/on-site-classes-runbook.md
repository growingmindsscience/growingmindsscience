# On-site Toddler class: setup and launch

The code is ready for MP4s, but the live Thinkific checkout must remain until the assets, credentials, database migration, and buyer import are complete. New on-site class sales are disabled unless `TODDLER_CLASS_SALES_ENABLED=1` **and** 29 lessons are published.

## 1. Apply database migration

Completed on 2026-09-27 for Growing Minds Science (`kxljngtmnqarvsawakmf`). Applied `0008_classes.sql` and recorded migration `0008` in one transaction. Verified RLS on all three tables, no policies on lesson content, and customer-only policies on progress and order reads. Existing remote migrations use timestamp versions rather than local `0001`–`0007`; do not bulk-push those older local migrations without reconciling their history. The class application has not yet been deployed.

Apply [`nsc/supabase/migrations/0008_classes.sql`](../nsc/supabase/migrations/0008_classes.sql) to the same Supabase project used by `/nsc`. It adds private lesson records, per-customer progress, and a service-written class order ledger. Confirm RLS is enabled and that `class_lessons` has no browser-readable policy.

## 2. Set up Mux

Connection completed on 2026-09-27 in Mux organization Growing Minds Science (`b87eba`), Production environment (`1e018o`). The five `MUX_*` settings below are saved as sensitive Production environment variables in Vercel project `nsc`. The API token has Video read/write permissions only. Playback restriction allows `growingmindsscience.com` and `www.growingmindsscience.com`, with missing-referrer playback denied. Verified API authentication, application JWT signing, and creation of a signed-only direct upload; cancelled that unused test upload without sending video data. Real MP4 playback remains untested, and the application still needs deployment to use these settings.

Billing remains on Mux Video Free (10 stored videos). The owner must add a payment method and select Pay as you go before uploading the full 29-lesson library. No paid plan was selected during connection setup.

1. Create a Mux environment on a paid/pay-as-you-go plan (the free plan's 10 stored video limit is below the advertised 29 lessons).
2. Create a Mux API token with Video read/write access. Set `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` in the **nsc Vercel project**.
3. Create a URL signing key; store its key ID as `MUX_SIGNING_KEY_ID` and its Base64 PEM private key as `MUX_SIGNING_PRIVATE_KEY`. These are server-only secrets.
4. Create a playback restriction permitting `growingmindsscience.com`, with no-referrer playback disallowed. Set its ID as `MUX_PLAYBACK_RESTRICTION_ID`. The app refuses to issue playback tokens until this is configured.
5. Set `CLASS_ADMIN_USER_IDS` to the exact Supabase `auth.users.id` UUID(s) that may upload/publish lessons. The existing `ADMIN_EMAILS` allowlist must also include their email address.

Admin page: `/nsc/admin/classes`. Add a lesson, open it, upload an MP4 directly to Mux, and select **Check video status** after processing. This uses resumable browser uploads. The sync action verifies that the video has a signed playback ID and requests English captions. Check status again when captions are ready; the app attempts to import the generated transcript as a starting draft. Review and edit that text, review captions in Mux, check the captions box, and publish. The database refuses to publish without a signed video, written text, and caption-review confirmation.

## 3. Configure Stripe

Create a **$49 one-time** Toddler years Price in the existing Growing Minds Science Stripe account. Set `TODDLER_CLASS_PRICE_ID` in the nsc project. The server checks this exact price before granting class access. The class checkout carries the authenticated Supabase user ID in `client_reference_id` and metadata.

Ensure the existing `/nsc/api/stripe-webhook` endpoint receives these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `charge.dispute.created`

The success page verifies its Checkout Session against the signed-in owner as a fallback when the webhook is delayed. Full refunds and new disputes expire only that order's class/AI grants. A won dispute needs manual review before restoring access.

## 4. Bring over previous buyers

Export a **paid order** roster from Thinkific. Review it before import: an enrollment list alone may contain complimentary or trial students. Convert the verified orders to JSON:

```json
[
  { "email": "buyer@example.com", "purchaseId": "order-123", "status": "paid" }
]
```

Run from `nsc/` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the shell:

```bash
node scripts/import-thinkific-buyers.mjs /absolute/path/verified-paid-buyers.json
node scripts/import-thinkific-buyers.mjs /absolute/path/verified-paid-buyers.json --apply
```

The first command is a dry run. Only confirmed Supabase accounts with a matching email receive the class and AI grants. The import is idempotent by Thinkific purchase ID. For unmatched buyers, invite them to create and confirm an account with their purchase email, then rerun the import. Do not use the old shared access code as proof of a class purchase; it now grants AI only.

## 5. Verify and cut over

1. Upload, caption-review, and publish all **29** lessons across five modules. Verify mobile playback and the written version of each.
2. Test: signed-out access, unpaid signed-in access, paid checkout, automatic grant, My classes, resume/completion, copied lesson links, copied video tokens after expiry, full refund, and duplicate webhooks.
3. Run the Thinkific buyer import and review unmatched rows. Keep Thinkific available during the transition.
4. Set `TODDLER_CLASS_SALES_ENABLED=1` in nsc and deploy. Confirm the on-site enrollment button works.
5. Change the public Toddlerhood, class index, and structured-data URLs from Thinkific to `/nsc/app/classes/toddlerhood`. Update old account copy when the transition ends.

Provider reference: [Mux direct uploads](https://www.mux.com/docs/guides/upload-files-directly), [Mux secured playback](https://www.mux.com/docs/guides/secure-video-playback), [Mux caption generation](https://www.mux.com/docs/guides/add-autogenerated-captions-and-use-transcripts), [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment).
