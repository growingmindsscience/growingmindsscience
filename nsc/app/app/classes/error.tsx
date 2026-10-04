"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { sitePath } from "@/lib/site";

/** Error fallback for the classes area, in class terms (the root one speaks Number Path). */
export default function ClassRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl font-semibold text-ink-deep">This page didn&rsquo;t load</h1>
        <p className="mt-3 text-ink">
          That&rsquo;s on our side, not yours. Your classes and your place in each lesson are saved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/app/classes" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">
            Back to My classes
          </Link>
          <a href={sitePath("/contact/")} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline">
            Contact us
          </a>
        </div>
        {error.digest && <p className="mt-4 text-xs text-ink-muted">Reference: {error.digest}</p>}
      </Card>
    </main>
  );
}
