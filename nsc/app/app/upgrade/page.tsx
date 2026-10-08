import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { hasFullAccess } from "@/lib/entitlements.server";
import { startCheckout } from "./actions";
import { Card, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PRICE_DISPLAY } from "@/lib/stripe";
import { brand } from "@/lib/config/brand";

/** What the purchase unlocks (the check-in, re-check-ins, one weekly game
 * and today's prompt are free for everyone). */
const INCLUDED = [
  "Every game matched to your child's exact rung, fresh each week",
  "The whole week of number-talk prompts, to read ahead",
  "Where they sit in the typical range for their age, and how it moves",
  "The printable pack: board game, dot cards, ladder poster, prompt cards",
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
        <p className="text-[0.9375rem] font-semibold text-amber-deep">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Unlock the whole thing
        </h1>
        <p className="mt-2 text-sm text-ink-muted">One payment. Yours for good.</p>
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
        <p className="mt-4 text-sm text-ink-muted">
          The check-in, every re-check-in, and today&rsquo;s prompt stay free.
        </p>
        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <form action={startCheckout} className="mt-6">
          <SubmitButton className="w-full" pendingLabel="Opening checkout…">
            Get {brand.productName}
          </SubmitButton>
        </form>
      </Card>

      <Link href="/app" className="mx-auto inline-flex min-h-11 items-center text-sm text-ink-muted underline">
        Maybe later
      </Link>
      <p className="text-center text-xs text-ink-muted">
        Buying it for someone else?{" "}
        <Link href="/gift" className="font-semibold text-teal underline">
          Give it as a gift
        </Link>
      </p>
    </main>
  );
}
