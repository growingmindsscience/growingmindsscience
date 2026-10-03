// Best-effort, in-memory rate limiting for the Edge functions (the AI chat,
// login, subscription verification, checkout, contact and waitlist).
//
// THIS IS A SOFT LIMIT, NOT A QUOTA. Every counter below lives in the memory of
// one Edge isolate: it starts empty on each cold start and is not shared between
// isolates or regions, so a client that reaches many isolates, or that sends
// from many addresses, gets many budgets. It blunts casual abuse and scripted
// bursts at zero cost and with no extra infrastructure, and nothing more.
//
// The real fix is a shared store with an atomic increment and a TTL (Vercel KV,
// Upstash Redis, or a Supabase table), keyed the same way as `clientKey` below,
// plus a monthly spend limit on the Anthropic workspace that owns
// ANTHROPIC_API_KEY. Until then, that spend limit is the only hard cap on the
// cost of the free AI tier.

import { jsonResponse } from "./_security.js";

// Ceiling per map, so a flood of distinct addresses cannot grow memory without bound.
export const MAX_KEYS = 10000;

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  // Vercel overwrites x-forwarded-for with the real client address (clients
  // cannot spoof it there); take the first hop. Fall back to a shared bucket
  // (still limited) rather than skipping the limit when the header is missing.
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function ipv4ToGroups(dotted) {
  const parts = dotted.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return [((parts[0] << 8) | parts[1]).toString(16), ((parts[2] << 8) | parts[3]).toString(16)];
}

function expandIpv6(value) {
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const last = tail.length ? tail : head;
  if (last.length && last[last.length - 1].includes(".")) {
    const v4 = ipv4ToGroups(last.pop());
    if (!v4) return null;
    last.push(...v4);
  }
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...new Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16).toString(16));
}

// The key a client is counted under. IPv4 addresses count individually. An
// IPv6 client usually controls a whole /64 (2^64 addresses), so IPv6 is counted
// per /64; otherwise rotating addresses inside one network would reset every
// limit on each request.
export function ipKey(ip) {
  let value = String(ip || "").trim().toLowerCase();
  if (!value) return "unknown";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    value = end > 0 ? value.slice(1, end) : value.slice(1);
  }
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  if (!value.includes(":")) return value;
  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  const groups = expandIpv6(value);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : value;
}

export function clientKey(request) {
  return ipKey(clientIp(request));
}

// Makes room for one more key: drops stale entries first, then the oldest ones
// (a Map iterates in insertion order) down to 90% of the cap, so a full sweep
// is rare even under a flood of new keys.
function makeRoom(map, maxKeys, isStale) {
  if (map.size < maxKeys) return;
  for (const [key, entry] of map) {
    if (isStale(entry)) map.delete(key);
  }
  if (map.size < maxKeys) return;
  const target = Math.floor(maxKeys * 0.9);
  for (const key of map.keys()) {
    if (map.size <= target) break;
    map.delete(key);
  }
}

// Fixed-window counter: at most `limit` hits per key per `windowMs`.
export function createWindowLimiter({ limit, windowMs, maxKeys = MAX_KEYS, now = Date.now }) {
  const entries = new Map();

  function current(key, t) {
    const entry = entries.get(key);
    return entry && t - entry.start < windowMs ? entry : null;
  }
  function retryAfter(entry, t) {
    return Math.max(1, Math.ceil((windowMs - (t - entry.start)) / 1000));
  }

  return {
    limit,
    windowMs,
    // Counts one hit. `limited` is true once this key has gone over `limit`.
    hit(key) {
      const t = now();
      let entry = current(key, t);
      if (!entry) {
        entries.delete(key);
        makeRoom(entries, maxKeys, (e) => t - e.start >= windowMs);
        entry = { start: t, count: 0 };
        entries.set(key, entry);
      }
      entry.count += 1;
      return entry.count > limit
        ? { limited: true, retryAfter: retryAfter(entry, t) }
        : { limited: false, retryAfter: 0 };
    },
    // Whether this key has already used its whole budget, without counting a hit.
    check(key) {
      const t = now();
      const entry = current(key, t);
      return entry && entry.count >= limit
        ? { limited: true, retryAfter: retryAfter(entry, t) }
        : { limited: false, retryAfter: 0 };
    },
    size: () => entries.size,
  };
}

// Per-UTC-day allowance (the AI free tier). `reserve` takes one unit before the
// paid call; `refund` gives it back when the call produced no answer, so a
// failure upstream never costs the visitor one of their free questions.
export function createDailyAllowance({ limit, maxKeys = MAX_KEYS, now = Date.now }) {
  const entries = new Map();
  const today = () => new Date(now()).toISOString().slice(0, 10);

  return {
    limit,
    remaining(key) {
      const entry = entries.get(key);
      return !entry || entry.day !== today() ? limit : Math.max(0, limit - entry.count);
    },
    reserve(key) {
      const day = today();
      let entry = entries.get(key);
      if (!entry || entry.day !== day) {
        entries.delete(key);
        makeRoom(entries, maxKeys, (e) => e.day !== day);
        entry = { day, count: 0 };
        entries.set(key, entry);
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    refund(key) {
      const entry = entries.get(key);
      if (entry && entry.day === today() && entry.count > 0) entry.count -= 1;
    },
    size: () => entries.size,
  };
}

// One limiter per endpoint `key`, so endpoints never share a budget.
const endpointLimiters = new Map();

// Returns { limited, retryAfter } and counts this request.
export function checkRateLimit(request, { key, limit, windowMs }) {
  let limiter = endpointLimiters.get(key);
  if (!limiter || limiter.limit !== limit || limiter.windowMs !== windowMs) {
    limiter = createWindowLimiter({ limit, windowMs });
    endpointLimiters.set(key, limiter);
  }
  return limiter.hit(clientKey(request));
}

// Standard JSON 429 with Retry-After, matching the site's jsonResponse shape.
export function rateLimitResponse(retryAfter) {
  return jsonResponse(
    429,
    { error: "Too many requests. Please wait a moment and try again.", code: "rate_limited" },
    { "Retry-After": String(retryAfter) },
  );
}
