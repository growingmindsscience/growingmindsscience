import { requireClassAuth } from "@/lib/auth";
import { ownedClassSlugs, publishedLessons } from "@/lib/classes.server";
import type { ClassBundle } from "@/lib/classes";
import { BundleWelcome } from "@/components/class-welcome";
import { stripe } from "@/lib/stripe";
import { TrackPurchase } from "@/components/track";
import { fulfillClassCheckout } from "@/lib/class-orders.server";

/** The thank-you page shared by both bundles. */
export async function BundleSuccess({ bundle, sessionId }: { bundle: ClassBundle; sessionId?: string }) {
  const user = await requireClassAuth(`/app/classes/${bundle.slug}/success`);
  if (sessionId?.startsWith("cs_") && sessionId.length < 200) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id === user.id && session.metadata?.owner_id === user.id &&
          session.metadata?.product === bundle.product) {
        await fulfillClassCheckout(session);
      }
    } catch { /* The signed webhook remains the primary fulfillment path. */ }
  }
  const owned = await ownedClassSlugs(user.id);
  const ready = bundle.courses.every((slug) => owned.includes(slug));
  const starts = await Promise.all(bundle.courses.map(async (courseSlug) => ({
    courseSlug,
    firstLessonSlug: ready ? (await publishedLessons(courseSlug))[0]?.slug : undefined,
  })));
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-center">
      {sessionId?.startsWith("cs_") && <TrackPurchase classId={bundle.slug} sessionId={sessionId} />}
      <BundleWelcome title={bundle.title} ready={ready} starts={starts} />
    </main>
  );
}
