import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { CLASS_GIFT_REDEEM_PATH } from "@/lib/class-gift";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { redeemClassGift } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redeem a gift code" };

const ERRORS: Record<string, string> = {
  unknown: "That code isn't right. Check it and try again.",
  already_redeemed: "That code has already been used.",
  error: "Something went wrong. Please try again.",
};

export default async function RedeemClassGiftPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireClassAuth(CLASS_GIFT_REDEEM_PATH);
  const { error } = await searchParams;
  const message = error ? ERRORS[error] ?? ERRORS.error : null;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-7 px-6 py-10">
      <header>
        <Link href="/app/classes" className="inline-flex min-h-11 items-center text-sm text-ink-muted underline">← My classes</Link>
        <h1 className="mt-2 text-3xl text-ink-deep">Redeem a gift code</h1>
        <p className="mt-3 text-ink">A class gift code opens every class in this account, for life.</p>
      </header>
      <Card>
        <form action={redeemClassGift} className="flex flex-col gap-4">
          <Field label="Gift code" htmlFor="code">
            <Input id="code" name="code" required autoComplete="off" autoCapitalize="characters" placeholder="GM-XXXX-XXXX" />
          </Field>
          {message && <p role="alert" className="text-sm text-danger">{message}</p>}
          <SubmitButton className="mt-2" pendingLabel="Checking…">Redeem</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
