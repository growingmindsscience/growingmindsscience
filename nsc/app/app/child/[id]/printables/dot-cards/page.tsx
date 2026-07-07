import { requirePaid } from "@/lib/entitlements.server";
import { PrintButton } from "@/components/print-button";

/** Dot cards 1–6 for peek-and-count play (game.l4.dot-card-flash). */
export default async function DotCardsSheet() {
  await requirePaid();
  const cards = [1, 2, 3, 4, 5, 6];

  // Fixed dot positions per count so cards look deliberate, not random.
  const layout: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 50], [70, 50]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
  };

  return (
    <main className="min-h-screen bg-white p-8 text-ink-deep">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">Dot cards 1–6</h1>
          <PrintButton />
        </div>
        <p className="mb-6 text-sm text-ink print:mb-3">
          Print and cut along the lines. Flash a card for a second: &ldquo;How
          many?&rdquo; Then flip it back and count the dots together to check.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {cards.map((n) => (
            <div
              key={n}
              className="relative aspect-[3/2] rounded-xl border-2 border-dashed border-[#1E5F62]"
            >
              {layout[n].map(([x, y], i) => (
                <span
                  key={i}
                  className="absolute h-8 w-8 rounded-full bg-[#1E5F62]"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
