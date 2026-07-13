import Link from "next/link";
import { startGiftCheckout } from "./actions";
import { Button, Card, EnrichmentFooter } from "@/components/ui";
import { brand } from "@/lib/config/brand";
import { PRICE_DISPLAY } from "@/lib/stripe";

export const metadata = {
  title: "Give Number Path — a gift",
  description:
    "Gift a warm, screen-free early-math ritual. One payment, no subscription — a code the family redeems whenever they're ready.",
};

export default async function GiftPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-16">
      <section className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.parentSite}
        </p>
        <h1 className="text-4xl font-semibold text-ink-deep">
          Give Number Path
        </h1>
        <p className="max-w-md text-lg text-ink">
          A warm, screen-free way to share numbers with a two-to-five-year-old
          — ten minutes, a bowl, and a bear. One payment, no subscription to
          cancel.
        </p>
      </section>

      <Card className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">
          A gift, not a subscription
        </p>
        <p className="mt-2 text-ink">
          You pay once ({PRICE_DISPLAY}) and get a redemption code to hand over
          — on a printable card, or forwarded by email. The family redeems it
          whenever they&rsquo;re ready, and it&rsquo;s theirs for good. Nothing
          renews, nothing to remember.
        </p>
        <form action={startGiftCheckout}>
          <Button type="submit" className="mt-5">
            Buy a gift &middot; {PRICE_DISPLAY}
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-[#9C4429]" role="alert">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-teal-soft">
          No account needed to buy. We&rsquo;ll email your code and a card to
          print.
        </p>
      </Card>

      <p className="text-center text-sm text-teal-soft">
        Have a code to redeem?{" "}
        <Link href="/redeem" className="font-semibold text-teal underline">
          Redeem it here
        </Link>
      </p>

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
