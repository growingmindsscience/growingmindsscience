import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { PRESCHOOL_COURSE } from "@/lib/classes";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to Preschool years" };

export default async function PreschoolClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/preschool/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === PRESCHOOL_COURSE.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id, PRESCHOOL_COURSE.slug);
  const first = ready ? (await publishedLessons(PRESCHOOL_COURSE.slug))[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId="preschool" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug={PRESCHOOL_COURSE.slug} firstLessonSlug={first?.slug} />
    </main>
  );
}
