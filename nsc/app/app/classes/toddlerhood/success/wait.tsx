"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sitePath } from "@/lib/site";

export function AwaitClassAccess() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p role="status" className="mt-5 text-sm text-ink-muted">
      Checking payment status… If this takes more than a minute,{" "}
      <a href={sitePath("/contact/")} className="font-semibold text-teal underline">contact us</a> with your receipt.
    </p>
  );
}
