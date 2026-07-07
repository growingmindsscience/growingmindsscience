import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getCitations } from "@/lib/content.server";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { Ladder } from "@/components/ladder";
import { brand } from "@/lib/config/brand";

export default async function Home() {
  const user = await getUser();
  const citations = await getCitations();
  const exclusion = citations.citations.find((c) => c.tag_id === "ev.exclusion.ans");
  const start = user ? "/app" : "/signup";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.parentSite}
        </p>
        <h1 className="text-4xl font-semibold text-ink-deep sm:text-5xl">
          {brand.productName}
        </h1>
        <p className="max-w-md text-lg text-ink">
          {brand.tagline} A ten-minute check-in places your child on the counting
          ladder, then hands you a week of playful, evidence-backed games.
        </p>
        <p className="text-sm text-teal-soft">Ten minutes. A bowl. A bear.</p>
        <LinkButton href={start}>Start the game</LinkButton>
        {!user && (
          <p className="text-sm text-teal-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-teal underline">
              Sign in
            </Link>
          </p>
        )}
        <Ladder className="mt-4 w-full" />
      </section>

      <section>
        <Card className="bg-sea-glass/30">
          <h2 className="mb-2 text-lg font-semibold text-ink-deep">
            What we deliberately left out
          </h2>
          <p className="text-ink">
            We don&rsquo;t sell brain-training or flash-card drills, and we
            don&rsquo;t train the &ldquo;number sense&rdquo; some apps promise.{" "}
            {exclusion
              ? "The evidence that it transfers to real math is genuinely contested, so we won't charge you for it."
              : ""}{" "}
            Number Path only does what the research actually supports: everyday
            counting, together.
          </p>
        </Card>
      </section>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
