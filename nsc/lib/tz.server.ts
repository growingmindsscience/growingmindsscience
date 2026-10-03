import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TZ, isValidTimeZone, TZ_COOKIE } from "@/lib/tz";

/** The parent's IANA time zone from the cookie the browser sets, else UTC. */
export async function getTimeZone(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(TZ_COOKIE)?.value;
  if (!raw) return DEFAULT_TZ;
  let tz = raw;
  try {
    tz = decodeURIComponent(raw);
  } catch {
    return DEFAULT_TZ;
  }
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}
