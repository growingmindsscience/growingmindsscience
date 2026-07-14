import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { hasFullAccess } from "@/lib/entitlements.server";
import { startCheckout } from "./actions";
import { Button, Card, LinkButton } from "@/components/ui";
import { PRICE_DISPLAY } from "@/lib/stripe";
import { brand } from "@/lib/config/brand";

const INCLUDED = [
  "The full Feed-the-Bear check-in, as often as you like",
  "Every game matched to your child's exact rung",
  "A fresh number-talk prompt every day",
  "Re-check-ins as they climb the ladder",
  "The printable pack: board game, dot cards, ladder poster",
];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  const { error } = await searchParams;
  if (await hasFullAccess()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-ink-deep">You&rsquo;re all set</h1>
        <p className="text-ink">You have full access to {brand.productName}.</p>
        <LinkButton href="/app">Back to your children</LinkButton>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Unlock the whole thing
        </h1>
        <p className="mt-2 text-sm text-teal-soft">One payment. Yours for good.</p>
      </div>

      <Card>
        <p className="text-center text-4xl font-bold text-ink-deep">{PRICE_DISPLAY}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2 text-ink">
              <span aria-hidden className="text-teal">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {error && (
          <p className="mt-4 text-sm text-[#9C4429]" role="alert">
            {error}
          </p>
        )}
        <form action={startCheckout} className="mt-6">
          <Button type="submit" className="w-full">
            Get {brand.productName}
          </Button>
        </form>
      </Card>

      <Link href="/app" className="text-center text-sm text-teal-soft underline">
        Maybe later
      </Link>
      <p className="text-center text-xs text-teal-soft">
        Buying it for someone else?{" "}
        <Link href="/gift" className="font-semibold text-teal underline">
          Give it as a gift
        </Link>
      </p>
    </main>
  );
}
