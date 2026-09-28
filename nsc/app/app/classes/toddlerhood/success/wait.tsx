"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AwaitClassAccess() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [router]);
  return <p role="status" className="mt-5 text-sm text-teal-soft">Checking payment status… If this takes more than a minute, contact us with your receipt.</p>;
}
