import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { TODDLER_COURSE, lessonPath } from "@/lib/classes";
import { Card, LinkButton } from "@/components/ui";
import { AwaitClassAccess } from "./wait";
import { stripe } from "@/lib/stripe";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to Toddler years" };

export default async function ClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/toddlerhood/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === TODDLER_COURSE.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id, TODDLER_COURSE.slug);
  const first = ready ? (await publishedLessons(TODDLER_COURSE.slug))[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">{ready ? "Welcome. Your class is ready." : "Thank you for enrolling"}</h1>
        <p className="mt-3 text-ink">{ready
          ? "Toddler years is yours to keep, along with unlimited Growing Minds AI. Your place is saved as you go."
          : "We're confirming your payment and adding the class to your account."}</p>
        {ready ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <LinkButton href={first ? lessonPath(first.slug, TODDLER_COURSE.slug) : "/app/classes/toddlerhood"}>
              {first ? "Start the first lesson" : "Open class"}
            </LinkButton>
            {first && <Link href="/app/classes/toddlerhood" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">See all lessons</Link>}
          </div>
        ) : <AwaitClassAccess />}
        <p className="mt-4 text-xs text-teal-soft">You can always return through <Link href="/app/classes" className="underline">My classes</Link>.</p>
      </Card>
    </main>
  );
}
