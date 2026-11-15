import { TODDLER_COURSE } from "@/lib/classes";
import { requireClassAuth } from "@/lib/auth";
import { checkoutSessionId } from "@/lib/class-paths";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";

export default async function ClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const sessionId = checkoutSessionId((await searchParams).session_id);
  const path = "/app/classes/toddlerhood/success";
  const user = await requireClassAuth(sessionId ? `${path}?session_id=${sessionId}` : path);
  let paid = false;
  if (sessionId) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id && session.metadata?.product === TODDLER_COURSE.product) {
        await fulfillClassCheckout(session);
        paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id);
  const first = ready ? (await publishedLessons())[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {paid && sessionId && <TrackPurchase classId="toddlerhood" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug="toddlerhood" firstLessonSlug={first?.slug} />
    </main>
  );
}
