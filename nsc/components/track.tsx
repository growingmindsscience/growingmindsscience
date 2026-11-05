"use client";

import { useEffect } from "react";

// Funnel events for Vercel Web Analytics, matching the static site's
// window.floTrack (assets/js/chrome.js). The insights script is loaded by the
// root layout from the parent site's origin, so these land in the same
// project as the marketing pages' events.
type VaQueue = { (...args: unknown[]): void };
declare global {
  interface Window { va?: VaQueue; vaq?: unknown[][] }
}

export function track(name: string, data: Record<string, string> = {}) {
  try {
    window.va = window.va || function (...args: unknown[]) { (window.vaq = window.vaq || []).push(args); };
    window.va("event", { name, data: { from: window.location.pathname.replace(/^\/nsc/, "") || "/", ...data } });
  } catch { /* analytics is never worth an error */ }
}

/** Sends one "Purchase" event per Stripe Checkout session, however often the success page re-renders. */
export function TrackPurchase({ classId, sessionId }: { classId: string; sessionId: string }) {
  useEffect(() => {
    const key = `flo-purchase-${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* storage blocked: still count it once for this render */ }
    track("Purchase", { class: classId });
  }, [classId, sessionId]);
  return null;
}
