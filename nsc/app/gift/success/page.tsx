import Link from "next/link";
import { giftCodeForSession } from "@/lib/gift.server";
import { Card, EnrichmentFooter, LinkButton } from "@/components/ui";
import { brand } from "@/lib/config/brand";

export const metadata = { title: "Your gift is ready — Number Path" };

export default async function GiftSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const code = session_id ? await giftCodeForSession(session_id) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-16 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.parentSite}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Thank you &mdash; the gift is ready
        </h1>
      </div>

      {code ? (
        <Card>
          <p className="text-sm text-teal-soft">The code to give</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-teal">
            {code}
          </p>
          <p className="mt-4 text-ink">
            We&rsquo;ve emailed it to you as well. Print a card to hand over, or
            just pass along the code &mdash; the family redeems it whenever
            they&rsquo;re ready.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <LinkButton href={`/gift/card?code=${code}`}>
              Print a gift card
            </LinkButton>
            <Link
              href="/redeem"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-teal underline"
            >
              Where they redeem it
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-ink">
            Your payment went through. The code is being created &mdash; check
            your email in a moment, or refresh this page.
          </p>
        </Card>
      )}

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
