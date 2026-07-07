import { notFound } from "next/navigation";
import { requirePaid } from "@/lib/entitlements.server";
import { createClient } from "@/lib/supabase/server";
import { getPromptsDeck } from "@/lib/content.server";
import { ageBand } from "@/lib/age";
import { PrintButton } from "@/components/print-button";

/** Number-talk cards for the child's current band, personalized and cut-ready. */
export default async function PromptsSheet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePaid();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("nsc_children")
    .select("nickname, birth_month")
    .eq("id", id)
    .single();
  if (!child) notFound();

  const band = ageBand(child.birth_month, new Date());
  const deck = await getPromptsDeck();
  const prompts = (deck.bands[band] ?? [])
    .slice(0, 24)
    .map((p) => p.replaceAll("{name}", child.nickname));

  return (
    <main className="min-h-screen bg-white p-8 text-ink-deep">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">Number-talk cards</h1>
          <PrintButton />
        </div>
        <p className="mb-6 text-sm text-ink print:mb-3">
          Cut these out and drop them by the table, the tub, the door. One a day
          is plenty.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {prompts.map((p, i) => (
            <div
              key={i}
              className="flex min-h-24 items-center rounded-xl border border-dashed border-[#1E5F62] p-3 text-sm"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
