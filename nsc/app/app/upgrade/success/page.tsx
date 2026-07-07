import { requireAuth } from "@/lib/auth";
import { hasFullAccess } from "@/lib/entitlements.server";
import { Card, LinkButton } from "@/components/ui";
import { brand } from "@/lib/config/brand";

/**
 * Post-checkout landing. The entitlement is granted by the webhook, which may
 * land a beat after the redirect — so we reassure either way and point home,
 * where access re-checks on every load.
 */
export default async function UpgradeSuccessPage() {
  await requireAuth();
  const full = await hasFullAccess();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">
          {full ? "You're in!" : "Thank you!"}
        </h1>
        <p className="mt-3 text-ink">
          {full
            ? `The whole of ${brand.productName} is yours now. Go climb.`
            : "Your payment went through. Access unlocks in a moment — refresh your plan if a game still looks locked."}
        </p>
        <LinkButton href="/app" className="mt-6">
          Back to your children
        </LinkButton>
      </Card>
    </main>
  );
}
