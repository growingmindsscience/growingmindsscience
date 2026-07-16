import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { approveItem, rejectItem, saveItemEdits } from "../../actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  "bad-json": "That JSON didn't parse. Nothing was saved.",
  "grader-failed":
    "The grader failed this draft at approval time, so it did not publish. The fresh report is below.",
  "reason-required": "A reject needs a reason — it feeds the next batch prompt.",
  "unsupported-type": "Only activity items publish automatically so far.",
};

interface GradeCheck {
  name: string;
  status: "pass" | "fail";
  details: string;
}

export default async function ReviewItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error: errorKey } = await searchParams;
  const service = createServiceClient();

  const { data: item } = await service
    .from("review_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  const report = item.grader_report as { pass: boolean; checks: GradeCheck[] } | null;
  const decided = item.status !== "pending";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/admin" className="text-sm text-teal-soft underline">
          ← Queue
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-deep">
          {(item.payload as { title?: string }).title ?? item.id}
        </h1>
        <p className="mt-1 text-sm text-teal-soft">
          {item.content_type} · {item.batch_id || "no batch"} · status:{" "}
          {item.status}
          {item.decided_by ? ` by ${item.decided_by}` : ""}
        </p>
        {item.reject_reason && (
          <p className="mt-1 text-sm text-ink">Reason: {item.reject_reason}</p>
        )}
      </header>

      {errorKey && (
        <Card className="bg-rung-glow">
          <p className="text-ink-deep">
            {ERROR_COPY[errorKey] ?? decodeURIComponent(errorKey)}
          </p>
        </Card>
      )}

      {report && (
        <Card className={report.pass ? "bg-sea-glass/30" : "bg-rung-glow/60"}>
          <h2 className="font-semibold text-ink-deep">
            Grader: {report.pass ? "green" : "red"}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {report.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span
                  className={
                    c.status === "pass" ? "text-teal" : "font-bold text-ink-deep"
                  }
                >
                  {c.status === "pass" ? "✓" : "✗"}
                </span>
                <span className="text-ink">
                  <span className="font-medium">{c.name}</span>: {c.details}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {decided ? (
        <Card>
          <p className="text-ink">
            This item is {item.status}. Decisions are final here — a fresh
            draft goes through a new queue item.
          </p>
        </Card>
      ) : (
        <>
          <form action={saveItemEdits.bind(null, item.id)} className="flex flex-col gap-3">
            <label htmlFor="payload" className="text-sm font-semibold uppercase tracking-wide text-teal">
              Draft payload (edit, then save to re-grade)
            </label>
            <textarea
              id="payload"
              name="payload"
              rows={26}
              defaultValue={JSON.stringify(item.payload, null, 2)}
              className="w-full rounded-xl border border-sea-glass bg-surface p-4 font-mono text-xs text-ink focus:border-teal focus:outline-none"
              spellCheck={false}
            />
            <Button type="submit" variant="ghost" className="self-start border border-sea-glass">
              Save edits &amp; re-grade
            </Button>
          </form>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <form action={approveItem.bind(null, item.id)}>
              <Button type="submit">Approve &amp; publish</Button>
            </form>
            <form
              action={rejectItem.bind(null, item.id)}
              className="flex flex-1 flex-col gap-2"
            >
              <textarea
                name="reason"
                rows={2}
                placeholder="Reject reason (feeds the next batch prompt)"
                className="w-full rounded-xl border border-sea-glass bg-surface px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              />
              <Button
                type="submit"
                variant="ghost"
                className="self-start border border-sea-glass"
              >
                Reject
              </Button>
            </form>
          </div>
        </>
      )}
    </main>
  );
}
