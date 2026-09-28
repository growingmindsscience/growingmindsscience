/**
 * Post-auth `next` targets must be same-app relative paths. Rejects
 * protocol-relative URLs ("//host"), backslashes (browsers read "/\host" as
 * "//host"), and any whitespace or control character that could smuggle a
 * different parse past a naive prefix check.
 */
export function safeNextPath(raw: unknown, fallback = "/app"): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001f\u007f]/.test(v)) return fallback;
  return v;
}
