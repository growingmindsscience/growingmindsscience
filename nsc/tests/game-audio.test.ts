import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clipResponse, gameClipResponse, readGameClip, type GameClipDeps } from "../lib/game-audio";

vi.mock("server-only", () => ({}));

// The route's live dependencies, replaced so a test can say who is asking.
const session = vi.hoisted(() => ({
  userId: null as string | null,
  full: false,
  freeIds: [] as string[],
}));
vi.mock("@/lib/auth", () => ({
  getUser: async () => (session.userId ? { id: session.userId } : null),
}));
vi.mock("@/lib/entitlements.server", () => ({ hasFullAccess: async () => session.full }));
vi.mock("@/lib/plan.server", () => ({ freeGameClipIds: async () => session.freeIds }));
vi.mock("@/lib/tz.server", () => ({ getTimeZone: async () => "UTC" }));

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "content/audio.manifest.v1.json"), "utf8")) as {
  checkin: string[];
  games: string[];
};
const [paidId, teaserId] = manifest.games;
const checkinId = manifest.checkin[0];

const CLIP = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const request = (headers: Record<string, string> = {}) =>
  new Request("https://example.test/nsc/api/audio/x", { headers });

function deps(over: Partial<GameClipDeps> = {}): GameClipDeps {
  return {
    userId: async () => "user-1",
    gameIds: async () => [paidId, teaserId],
    fullAccess: async () => false,
    freeClipIds: async () => [teaserId],
    readClip: vi.fn(async () => CLIP),
    ...over,
  };
}

describe("game clip gate", () => {
  it("serves a game clip to an account with Number Path", async () => {
    const res = await gameClipResponse(request(), paidId, deps({ fullAccess: async () => true }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toMatch(/^private/);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(CLIP);
  });

  it("serves the free game's clips to a free account", async () => {
    const res = await gameClipResponse(request(), teaserId, deps());
    expect(res.status).toBe(200);
  });

  it("refuses a paid game's clip to a free account", async () => {
    const d = deps();
    const res = await gameClipResponse(request(), paidId, d);
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(d.readClip).not.toHaveBeenCalled();
  });

  it("refuses a signed-out request", async () => {
    const d = deps({ userId: async () => null, fullAccess: async () => true });
    expect((await gameClipResponse(request(), paidId, d)).status).toBe(401);
    expect(d.readClip).not.toHaveBeenCalled();
  });

  it("404s an id that is not a game clip, even with full access", async () => {
    const d = deps({ fullAccess: async () => true });
    expect((await gameClipResponse(request(), "0123456789abcdef", d)).status).toBe(404);
    expect((await gameClipResponse(request(), checkinId, d)).status).toBe(404);
    expect(d.readClip).not.toHaveBeenCalled();
  });

  it("rejects path traversal before anything touches the disk", async () => {
    const d = deps({ fullAccess: async () => true, gameIds: async () => ["../../content/x", paidId] });
    for (const id of ["../../content/x", "..%2F..%2Fcontent%2Fx", `${paidId}/..`, `${paidId}.mp3`, ""]) {
      expect((await gameClipResponse(request(), id, d)).status).toBe(404);
    }
    expect(d.readClip).not.toHaveBeenCalled();
  });

  it("404s when the manifest lists a clip whose file is missing", async () => {
    const res = await gameClipResponse(request(), paidId, deps({ fullAccess: async () => true, readClip: async () => null }));
    expect(res.status).toBe(404);
  });
});

describe("reading a clip from disk", () => {
  it("reads a committed game clip, and nothing outside private/audio", async () => {
    const onDisk = readFileSync(join(root, "private/audio", `${paidId}.mp3`));
    expect(Buffer.from((await readGameClip(paidId))!).equals(onDisk)).toBe(true);
    expect(await readGameClip("ffffffffffffffff")).toBeNull();
    expect(await readGameClip("../content/audio.manifest.v1")).toBeNull();
    // Check-in clips are public files, not part of the gated folder.
    expect(await readGameClip(checkinId)).toBeNull();
  });
});

describe("byte ranges (Safari plays audio only from a server that honors them)", () => {
  const body = async (res: Response) => [...new Uint8Array(await res.arrayBuffer())];

  it("answers a range with 206 and the slice", async () => {
    const res = clipResponse(CLIP, "bytes=0-1");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-1/10");
    expect(res.headers.get("content-length")).toBe("2");
    expect(await body(res)).toEqual([1, 2]);
  });

  it("handles open-ended and suffix ranges", async () => {
    expect(await body(clipResponse(CLIP, "bytes=7-"))).toEqual([8, 9, 10]);
    expect(await body(clipResponse(CLIP, "bytes=-2"))).toEqual([9, 10]);
    expect(clipResponse(CLIP, "bytes=5-500").headers.get("content-range")).toBe("bytes 5-9/10");
  });

  it("416s a range past the end, and serves the whole clip for forms it doesn't parse", async () => {
    const past = clipResponse(CLIP, "bytes=10-");
    expect(past.status).toBe(416);
    expect(past.headers.get("content-range")).toBe("bytes */10");
    expect(clipResponse(CLIP, "bytes=0-1,4-5").status).toBe(200);
    expect(clipResponse(CLIP, null).headers.get("accept-ranges")).toBe("bytes");
  });
});

describe("GET /api/audio/[id]", () => {
  beforeEach(() => {
    session.userId = null;
    session.full = false;
    session.freeIds = [];
  });

  const get = async (id: string, headers: Record<string, string> = {}) => {
    const { GET } = await import("../app/api/audio/[id]/route");
    return GET(request(headers), { params: Promise.resolve({ id }) });
  };

  it("streams the real committed clip to an entitled account", async () => {
    session.userId = "user-1";
    session.full = true;
    const res = await get(paidId);
    expect(res.status).toBe(200);
    const onDisk = readFileSync(join(root, "private/audio", `${paidId}.mp3`));
    expect(Buffer.from(await res.arrayBuffer()).equals(onDisk)).toBe(true);
  });

  it("gives a free account its teaser clip and nothing else", async () => {
    session.userId = "user-1";
    session.freeIds = [teaserId];
    expect((await get(teaserId)).status).toBe(200);
    expect((await get(paidId)).status).toBe(403);
  });

  it("refuses signed-out, unknown and traversal requests", async () => {
    expect((await get(paidId)).status).toBe(401);
    session.userId = "user-1";
    session.full = true;
    expect((await get("ffffffffffffffff")).status).toBe(404);
    expect((await get("../../content/audio.manifest.v1.json")).status).toBe(404);
    expect((await get(checkinId)).status).toBe(404);
  });

  it("serves an iPhone's opening range probe", async () => {
    session.userId = "user-1";
    session.full = true;
    const res = await get(paidId, { range: "bytes=0-1" });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-length")).toBe("2");
  });
});
