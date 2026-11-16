"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui";
import { type AccessPoller, startAccessPolling } from "@/lib/access-polling";

/**
 * Re-asks the server for class access a few times over about a minute, then
 * stops and says access isn't showing yet. "Check again" is a plain link to
 * this same URL (an empty href keeps the query, including the checkout
 * reference), so it works as a full reload with or without JavaScript.
 */
export function AwaitClassAccess() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expired, setExpired] = useState(false);
  const poller = useRef<AccessPoller | null>(null);

  useEffect(() => {
    const current = startAccessPolling({
      refresh: () => startTransition(() => router.refresh()),
      onExpire: () => setExpired(true),
      isHidden: () => document.visibilityState === "hidden",
    });
    poller.current = current;
    return () => {
      current.stop();
      if (poller.current === current) poller.current = null;
    };
  }, [router]);

  // The next check waits until this refresh has rendered, so they never overlap.
  useEffect(() => {
    if (!isPending) poller.current?.refreshSettled();
  }, [isPending]);

  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <p role="status" className="text-sm text-ink-muted">
        {expired
          ? "Access isn't showing on your account yet. Automatic checking has stopped."
          : "Checking your account. This page updates by itself for about a minute."}
      </p>
      <noscript>
        <p className="text-sm text-ink-muted">With JavaScript off, use Check again to reload this page.</p>
      </noscript>
      <a href="" className={buttonClasses(expired ? "primary" : "ghost", "md", "w-full sm:w-auto")}>Check again</a>
    </div>
  );
}
