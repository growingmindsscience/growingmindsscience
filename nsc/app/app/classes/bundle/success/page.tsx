import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { ownedClassSlugs } from "@/lib/classes.server";
import { CLASS_BUNDLE } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";
import { AwaitClassAccess } from "@/app/app/classes/toddlerhood/success/wait";
import { stripe } from "@/lib/stripe";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to all three classes" };

export default async function BundleSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/bundle/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === CLASS_BUNDLE.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const owned = await ownedClassSlugs(user.id);
  const ready = CLASS_BUNDLE.courses.every((slug) => owned.includes(slug));
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl text-ink-deep sm:text-3xl">{ready ? "Welcome. All three classes are ready." : "Thank you for enrolling"}</h1>
        <p className="mt-3 text-ink">{ready
          ? "Birth to 12 months, Toddler years, and Preschool years are yours to keep. Start with whichever matches your child today."
          : "We're confirming your payment and adding the classes to your account."}</p>
        {ready ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <LinkButton href="/app/classes">Go to My classes</LinkButton>
          </div>
        ) : <AwaitClassAccess />}
        <p className="mt-4 text-xs text-ink-muted">You can always return through <Link href="/app/classes" className="underline">My classes</Link>.</p>
      </Card>
    </main>
  );
}
