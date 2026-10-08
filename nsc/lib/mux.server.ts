import "server-only";
import { createPrivateKey, sign } from "node:crypto";

const API = "https://api.mux.com/video/v1";

export async function muxApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) throw new Error("Mux API credentials are not configured");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Mux API returned ${response.status}`);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export function signedPlaybackToken(playbackId: string, durationSeconds: number | null) {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const encodedKey = process.env.MUX_SIGNING_PRIVATE_KEY;
  const restrictionId = process.env.MUX_PLAYBACK_RESTRICTION_ID;
  if (!keyId || !encodedKey || !restrictionId) throw new Error("Mux signed playback is not fully configured");
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(3600, (durationSeconds ?? 0) + 900);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId })).toString("base64url");
  const claims: Record<string, string | number> = {
    sub: playbackId,
    aud: "v",
    exp: expiresAt,
    kid: keyId,
    playback_restriction_id: restrictionId,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const pem = encodedKey.includes("BEGIN PRIVATE KEY")
    ? encodedKey.replace(/\\n/g, "\n")
    : Buffer.from(encodedKey, "base64").toString("utf8");
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), createPrivateKey(pem)).toString("base64url");
  return { token: `${unsigned}.${signature}`, expiresAt };
}
