import { requirePaid } from "@/lib/entitlements.server";
import { PrintButton } from "@/components/print-button";

/** Number Path board — a linear 1–20 track (Ramani & Siegler linear-board design). */
export default async function BoardSheet() {
  await requirePaid();
  const cells = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-white p-8 text-ink-deep">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">Number Path board game</h1>
          <PrintButton />
        </div>
        <p className="mb-6 text-sm text-ink print:mb-3">
          Print, grab a token each and a die or spinner. Take turns moving, and
          say the number on every space you land on — that saying is the whole
          game.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {cells.map((n) => (
            <div
              key={n}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-[#1E5F62] text-2xl font-bold"
              style={{
                background: n % 2 ? "#F0F5F3" : "#F8E7E0",
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink">
          Start · 1 → 20 · Finish
        </p>
      </div>
    </main>
  );
}
