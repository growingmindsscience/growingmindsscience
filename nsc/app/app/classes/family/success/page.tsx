import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { FAMILY_COURSE } from "@/lib/classes";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to Family systems and stress" };

export default async function FamilyClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/family/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === FAMILY_COURSE.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id, FAMILY_COURSE.slug);
  const first = ready ? (await publishedLessons(FAMILY_COURSE.slug))[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId="family" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug={FAMILY_COURSE.slug} firstLessonSlug={first?.slug} />
    </main>
  );
}
