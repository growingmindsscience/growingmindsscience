import Link from "next/link";
import { requireClassAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_GIFT_REDEEM_PATH, MAX_CLASS_GIFT_BATCH, newestUnusedCodes } from "@/lib/class-gift";
import { siteOrigin } from "@/lib/site";
import { Button, Card, Field, Input } from "@/components/ui";
import { makeClassGiftCodes } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Class gift codes" };

interface GiftRow {
  code: string;
  note: string;
  created_at: string;
  created_by: string | null;
  redeemed_at: string | null;
}

// A fixed message: the URL says only that minting failed, never why.
const MINT_ERROR = "Something went wrong making codes. Any that were made are in the list below.";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function ClassGiftCodesPage({ searchParams }: {
  searchParams: Promise<{ made?: string; error?: string }>;
}) {
  const admin = await requireClassAdmin();
  const params = await searchParams;
  const redeemUrl = `${siteOrigin()}/nsc${CLASS_GIFT_REDEEM_PATH}`;
  const { data, error } = await createServiceClient()
    .from("class_gift_codes")
    .select("code, note, created_at, created_by, redeemed_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as GiftRow[];
  // The URL carries only how many were just made; the codes come from here.
  const made = newestUnusedCodes(rows, admin.id, Number(params.made)).map((row) => row.code);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href="/admin/classes" className="text-sm text-ink-muted underline">← Classes</Link>
        <h1 className="mt-5 text-2xl font-semibold text-ink-deep">Class gift codes</h1>
        <p className="mt-2 text-sm text-ink">
          Each code gives one person every class, plus Growing Minds AI, for life. A code works once.
          They redeem it at <span className="font-semibold">{redeemUrl}</span> after making a free account.
        </p>
      </header>

      {(params.error || error) && (
        <p role="alert" className="rounded-xl bg-rung-glow p-4 text-sm text-danger">
          {params.error ? MINT_ERROR : `Gift codes unavailable: ${error?.message}. Has migration 0023_class_gift_codes.sql been applied?`}
        </p>
      )}

      {made.length > 0 && (
        <Card className="bg-rung-glow/50">
          <h2 className="text-lg font-semibold text-ink-deep">{made.length === 1 ? "Your new code" : `Your ${made.length} new codes`}</h2>
          <ul className="mt-3 flex flex-col gap-1 font-mono text-lg text-ink-deep">
            {made.map((code) => <li key={code}>{code}</li>)}
          </ul>
          <p className="mt-4 text-sm text-ink">A message you can send with a code:</p>
          <p className="mt-2 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
            Here is a gift for you: every Growing Minds Science class, for life. Go to {redeemUrl}, make a free
            account, and enter this code: {made[0]}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">Make codes</h2>
        <form action={makeClassGiftCodes} className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Who is it for? (only you see this)" htmlFor="note">
            <Input id="note" name="note" maxLength={120} placeholder="For example: Sam, from the library talk" className="w-full" />
          </Field>
          <Field label="How many" htmlFor="count">
            <Input id="count" name="count" type="number" min={1} max={MAX_CLASS_GIFT_BATCH} defaultValue={1} required />
          </Field>
          <Button type="submit" className="sm:col-span-2">Make gift codes</Button>
        </form>
      </Card>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-3 text-lg font-semibold text-ink-deep">Recent codes</h2>
        {rows.length ? (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.code} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-5 py-4">
                <span>
                  <span className="font-mono font-semibold text-ink">{row.code}</span>
                  {row.note && <span className="ml-3 text-sm text-ink-soft">{row.note}</span>}
                </span>
                <span className="text-sm text-ink-muted">
                  Made {day(row.created_at)} · {row.redeemed_at ? `Used ${day(row.redeemed_at)}` : "Not used yet"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No codes yet.</p>
        )}
      </section>
    </main>
  );
}
