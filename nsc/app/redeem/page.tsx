import Link from "next/link";
import { getUser } from "@/lib/auth";
import { redeemGift } from "./actions";
import { Button, Card, EnrichmentFooter, Field, Input } from "@/components/ui";
import { brand } from "@/lib/config/brand";

export const metadata = { title: "Redeem a gift — Number Path" };

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Redeem your gift
        </h1>
      </div>

      {user ? (
        <Card>
          <form action={redeemGift} className="flex flex-col gap-4">
            <Field label="Gift code" htmlFor="code" hint="Like NP-7Q4K-2M8P">
              <Input
                id="code"
                name="code"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="NP-••••-••••"
                required
              />
            </Field>
            {error && (
              <p className="text-sm text-[#9C4429]" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-2">
              Unlock the full plan
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-ink">
            First, sign in or create a free account for your child &mdash; the
            gift unlocks on that account, yours for good.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/signup?next=/redeem"
              className="inline-flex items-center justify-center rounded-full bg-teal px-6 py-3 text-base font-semibold text-white hover:bg-teal-soft"
            >
              Create account
            </Link>
            <Link
              href="/login?next=/redeem"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-teal underline"
            >
              Sign in
            </Link>
          </div>
        </Card>
      )}

      <EnrichmentFooter text={brand.enrichmentFooter} />
    </main>
  );
}
