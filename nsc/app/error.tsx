"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

/**
 * Calm fallback for an unexpected error anywhere under the root layout.
 * Says what happened in plain words, reassures that nothing saved is lost,
 * and offers a retry. Never shows the raw error to a parent.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">This page didn&rsquo;t load</h1>
        <p className="mt-3 text-ink">
          That&rsquo;s on our side, not yours. Your children, check-ins and
          plans are saved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/app" className="inline-flex min-h-11 items-center text-sm text-ink-muted underline">
            Back to your children
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-ink-muted">Reference: {error.digest}</p>
        )}
      </Card>
    </main>
  );
}
