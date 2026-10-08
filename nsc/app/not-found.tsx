import Link from "next/link";
import { Card } from "@/components/ui";

/** Calm 404 (also what non-admins see for /admin). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 text-ink">
          The link may be old, or the page may have moved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/app"
            className="inline-flex min-h-12 items-center justify-center rounded-control bg-teal px-6 py-3 text-base font-semibold text-white hover:bg-teal-hover"
          >
            Back to your children
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-ink-muted underline">
            Number Path home
          </Link>
        </div>
      </Card>
    </main>
  );
}
