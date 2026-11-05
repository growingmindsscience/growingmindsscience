import { requireClassAuth } from "@/lib/auth";
import { hasClassAccess, publishedLessons } from "@/lib/classes.server";
import { ClassWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";

export default async function ClassSuccessPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/toddlerhood/success");
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const ready = await hasClassAccess(user.id);
  const first = ready ? (await publishedLessons())[0] : undefined;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId="toddlerhood" sessionId={sessionId} />}
      <ClassWelcome ready={ready} courseSlug="toddlerhood" firstLessonSlug={first?.slug} />
    </main>
  );
}
