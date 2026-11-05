import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { INFANT_COURSE } from "@/lib/classes";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to Birth to 12 months" };

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
  const first = ready ? (await publishedLessons(INFANT_COURSE.slug))[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId="infant" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug={INFANT_COURSE.slug} firstLessonSlug={first?.slug} />
    </main>
  );
}
