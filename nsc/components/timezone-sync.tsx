"use client";

import { useEffect } from "react";
import { TZ_COOKIE } from "@/lib/tz";

/**
 * Reports the browser's IANA time zone in a cookie so server-rendered
 * "today" (the daily prompt, "done today", the Monday turnover) follows the
 * parent's calendar instead of UTC. Renders nothing; writes only on change.
 */
export function TimeZoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const value = encodeURIComponent(tz);
      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${TZ_COOKIE}=`))
        ?.slice(TZ_COOKIE.length + 1);
      if (current === value) return;
      document.cookie = `${TZ_COOKIE}=${value}; path=/nsc; max-age=31536000; samesite=lax`;
    } catch {
      // No cookie access: the server falls back to UTC.
    }
  }, []);
  return null;
}
