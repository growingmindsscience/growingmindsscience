import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { importBatch001 } from "./actions";

export const dynamic = "force-dynamic";

interface QueueRow {
  id: string;
  content_type: string;
  batch_id: string;
  status: string;
  created_at: string;
  payload: { slug?: string; title?: string; claim_text?: string };
  grader_report: { pass?: boolean } | null;
}

export default async function AdminQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; skipped?: string }>;
}) {
  await requireAdmin();
  const { imported, skipped } = await searchParams;
  const service = createServiceClient();

  const { data, error } = await service
    .from("review_items")
    .select("id, content_type, batch_id, status, created_at, payload, grader_report")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as QueueRow[];
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending").slice(-10).reverse();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          Growing Minds — internal
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
          Review queue
        </h1>
        <p className="mt-1 text-sm text-teal-soft">
          The model proposes, you dispose. Nothing publishes without an
          approval here.
        </p>
      </header>

      {imported !== undefined && (
        <Card className="bg-rung-glow/50">
          <p className="text-ink-deep">
            Batch import: {imported} enqueued, {skipped} skipped (already
            queued, published, or grader-failed).
          </p>
        </Card>
      )}

      {error ? (
        <Card className="bg-sea-glass/30">
          <h2 className="font-semibold text-ink-deep">Spine not migrated yet</h2>
          <p className="mt-2 text-sm text-ink">
            The review tables aren&rsquo;t reachable ({error.code ?? "query error"}).
            Apply <code>supabase/migrations/0005</code> and <code>0006</code> in
            the Supabase SQL editor, then reload this page.
          </p>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
                Pending ({pending.length})
              </h2>
              <form action={importBatch001}>
                <Button type="submit" className="px-4 py-2 text-sm">
                  Import activity batch 001
                </Button>
              </form>
            </div>
            {pending.length === 0 && (
              <Card>
                <p className="text-ink">
                  Queue is empty. Import a batch to start reviewing.
                </p>
              </Card>
            )}
            {pending.map((r) => (
              <Link key={r.id} href={`/admin/review/${r.id}`}>
                <Card className="transition-colors hover:bg-sea-glass/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink-deep">
                        {r.payload.title ?? r.payload.slug ?? r.payload.claim_text ?? r.id}
                      </p>
                      <p className="mt-0.5 text-xs text-teal-soft">
                        {r.content_type} · {r.batch_id || "no batch"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        r.grader_report?.pass
                          ? "bg-sea-glass/50 text-ink-deep"
                          : "bg-rung-glow text-ink-deep",
                      ].join(" ")}
                    >
                      grader: {r.grader_report?.pass ? "green" : "red"}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </section>

          {decided.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
                Recently decided
              </h2>
              {decided.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-sea-glass/60 bg-surface px-4 py-2 text-sm"
                >
                  <span className="text-ink">
                    {r.payload.title ?? r.payload.slug ?? r.id}
                  </span>
                  <span
                    className={
                      r.status === "approved" ? "text-teal" : "text-teal-soft"
                    }
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
