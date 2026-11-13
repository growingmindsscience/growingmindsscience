import { requireClassAuth } from "@/lib/auth";
import { ownedClassSlugs, publishedLessons } from "@/lib/classes.server";
import { CLASS_BUNDLE } from "@/lib/classes";
import { BundleWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to all four classes" };

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
  const starts = await Promise.all(CLASS_BUNDLE.courses.map(async (courseSlug) => ({
    courseSlug,
    firstLessonSlug: ready ? (await publishedLessons(courseSlug))[0]?.slug : undefined,
  })));
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId="bundle" sessionId={sessionId} />}
      <BundleWelcome ready={ready} starts={starts} />
    </main>
  );
}
