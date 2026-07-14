import { PrintButton } from "@/components/print-button";
import { normalizeGiftCode } from "@/lib/gift.server";

export const metadata = { title: "Number Path gift card" };

/** A printable card the buyer hands over. Public: it only displays the code
 *  passed in the link (the buyer's own), it grants nothing. */
export default async function GiftCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const shown = code ? normalizeGiftCode(code) : "NP-XXXX-XXXX";

  return (
    <main className="min-h-screen bg-white p-8 text-ink-deep">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">Your gift card</h1>
          <PrintButton />
        </div>

        <div className="rounded-3xl border-2 border-[#1E5F62] p-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1E5F62]">
            A gift for you
          </p>
          <h2 className="mt-4 text-3xl font-semibold">Number Path</h2>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed">
            Ten minutes, a bowl, and a bear &mdash; a warm, screen-free way to
            share numbers with your little one. It&rsquo;s yours for good, no
            subscription.
          </p>
          <div className="mx-auto my-7 h-px w-24 bg-[#CFE3DE]" />
          <p className="text-sm">Redeem your code at</p>
          <p className="text-lg font-semibold text-[#1E5F62]">
            growingmindsscience.com/nsc/redeem
          </p>
          <p className="mt-4 font-mono text-2xl font-bold tracking-[0.25em] text-[#1E5F62]">
            {shown}
          </p>
        </div>
      </div>
    </main>
  );
}
