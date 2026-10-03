import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess } from "@/lib/classes.server";
import { INFANT_COURSE } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";
import { AwaitClassAccess } from "@/app/app/classes/toddlerhood/success/wait";
import { stripe } from "@/lib/stripe";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";

export default async function InfantClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/infant/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === INFANT_COURSE.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id, INFANT_COURSE.slug);
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">{ready ? "Your class is ready" : "Thank you for enrolling"}</h1>
        <p className="mt-3 text-ink">{ready ? "Birth to 12 months is in My classes." : "We're confirming your payment and adding the class to your account."}</p>
        {ready ? <LinkButton href="/app/classes/infant" className="mt-5">Open class</LinkButton> : <AwaitClassAccess />}
        <p className="mt-4 text-xs text-teal-soft">You can always return through <Link href="/app/classes" className="underline">My classes</Link>.</p>
      </Card>
    </main>
  );
}
