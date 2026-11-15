import { requireClassAuth } from "@/lib/auth";
import { checkoutSessionId } from "@/lib/class-paths";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { PRESCHOOL_COURSE } from "@/lib/classes";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to Preschool years" };

export default async function PreschoolClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const sessionId = checkoutSessionId((await searchParams).session_id);
  const path = "/app/classes/preschool/success";
  const user = await requireClassAuth(sessionId ? `${path}?session_id=${sessionId}` : path);
  let paid = false;
  if (sessionId) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === PRESCHOOL_COURSE.product) {
        await fulfillClassCheckout(session);
        paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id, PRESCHOOL_COURSE.slug);
  const first = ready ? (await publishedLessons(PRESCHOOL_COURSE.slug))[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {paid && sessionId && <TrackPurchase classId="preschool" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug={PRESCHOOL_COURSE.slug} firstLessonSlug={first?.slug} />
    </main>
  );
}
