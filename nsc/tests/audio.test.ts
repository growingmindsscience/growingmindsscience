import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  audioClipId,
  checkinAudioIds,
  checkinLines,
  clipIdsForLines,
  gameAudioIds,
  gameClipPath,
  isAudioClipId,
  voiceableText,
} from "../lib/audio";
// The runtime's own interpolate() (vitest resolves the @/ alias), so this
// test can't drift from what the screen renders — including "one block".
import { interpolate } from "../lib/assessment";
import type { AssessmentCopy, GamesCatalog } from "../lib/content-types";

const root = join(__dirname, "..");
const readJson = <T>(rel: string) => JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
const manifest = readJson<{ checkin: string[]; games: string[] }>("content/audio.manifest.v1.json");
const copy = readJson<AssessmentCopy>("content/assessment.copy.v1.json");
const catalog = readJson<GamesCatalog>("content/games.catalog.v1.json");
const ids = new Set(manifest.checkin);
const gameIds = new Set(manifest.games);
const everyId = [...manifest.checkin, ...manifest.games];

describe("audio clip ids", () => {
  it("voiceableText fills {objects} and rejects residual placeholders", () => {
    expect(voiceableText("Put {objects} in the bowl.")).toBe("Put blocks in the bowl.");
    expect(voiceableText("Don't count for {name}.")).toBeNull();
    expect(voiceableText("Is that three?")).toBe("Is that three?");
  });

  it("ids are deterministic and 16 hex chars", () => {
    const id = audioClipId("Is that three? Can you count and check?");
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(audioClipId("Is that three? Can you count and check?")).toBe(id);
  });

  it("the runtime-rendered text resolves to the same id the generator voiced", () => {
    // A name-free line: interpolate() (runtime) must equal voiceableText()
    // (generator) so the id matches and audio is found.
    const raw = "Can you feed the bear three {objects}? Put three in the bowl.";
    const rendered = interpolate(raw, { name: "Mia", objects: "blocks" });
    expect(rendered).toBe(voiceableText(raw));
    expect(ids.has(audioClipId(rendered))).toBe(true);
  });

  it("N=1 lines render the singular and still find their clip", () => {
    const raw = "Can you feed the bear one {objects}? Put one in the bowl.";
    const rendered = interpolate(raw, { name: "Mia", objects: "blocks", objectsSingular: "block" });
    expect(rendered).toBe("Can you feed the bear one block? Put one in the bowl.");
    expect(rendered).toBe(voiceableText(raw));
    expect(ids.has(audioClipId(rendered))).toBe(true);
  });

  it("every manifest id has a committed mp3 in its folder", () => {
    for (const id of manifest.checkin) {
      expect(existsSync(join(root, "public/audio", `${id}.mp3`))).toBe(true);
    }
    for (const id of manifest.games) {
      expect(existsSync(join(root, "private/audio", `${id}.mp3`))).toBe(true);
    }
  });

  it("a name-bearing line has no clip (graceful no-button)", () => {
    const raw = "Read each line exactly. Don't count for {name}.";
    // Runtime interpolates the name in; that text was never voiced.
    const rendered = interpolate(raw, { name: "Mia", objects: "blocks" });
    expect(ids.has(audioClipId(rendered))).toBe(false);
  });
});

describe("who can fetch which clip", () => {
  // A copy edit without new audio just leaves a line with no button, so
  // these check the split, not that every line has a clip.
  const checkinLineIds = new Set(clipIdsForLines(checkinLines(copy)));
  const gameOnly = (id: string) =>
    !checkinLineIds.has(id) && catalog.games.some((g) => clipIdsForLines(g.script).includes(id));

  it("the manifest files every game line's clip as a game clip, never as check-in", () => {
    for (const id of manifest.checkin) expect(gameOnly(id)).toBe(false);
    for (const g of catalog.games) {
      for (const id of clipIdsForLines(g.script)) expect(ids.has(id) && gameOnly(id)).toBe(false);
    }
    expect(manifest.games.length).toBeGreaterThan(0);
  });

  it("public/audio holds only check-in clips: game narration is never a static file", () => {
    const served = readdirSync(join(root, "public/audio"));
    expect(served.length).toBeGreaterThan(0);
    for (const file of served) {
      expect(file).toMatch(/^[0-9a-f]{16}\.mp3$/);
      expect(ids.has(file.slice(0, 16))).toBe(true);
      expect(gameOnly(file.slice(0, 16))).toBe(false);
    }
  });

  it("the check-in page gets only check-in clip ids, even offered every clip", () => {
    const sent = checkinAudioIds(copy, everyId);
    expect(sent.length).toBe(manifest.checkin.length);
    expect(new Set(sent)).toEqual(ids);
    for (const id of sent) expect(gameIds.has(id)).toBe(false);
  });

  it("the check-in page drops ids with no generated clip", () => {
    const some = manifest.checkin.slice(0, 3);
    expect(checkinAudioIds(copy, some).sort()).toEqual([...some].sort());
    expect(checkinAudioIds(copy, [])).toEqual([]);
  });

  it("a game card gets only its own script's clips", () => {
    const [game] = catalog.games;
    const own = new Set(clipIdsForLines(game.script));
    const sent = gameAudioIds(game, everyId);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.length).toBeLessThan(manifest.games.length);
    for (const id of sent) expect(own.has(id)).toBe(true);
    expect(gameAudioIds(game, manifest.checkin)).toEqual([]);
  });

  it("game clips play through the gated route, not the static folder", () => {
    expect(gameClipPath("0123456789abcdef")).toBe("/nsc/api/audio/0123456789abcdef");
    expect(isAudioClipId("0123456789abcdef")).toBe(true);
    for (const bad of ["../content/x", "0123456789ABCDEF", "0123456789abcde", "0123456789abcdef.mp3", ""]) {
      expect(isAudioClipId(bad)).toBe(false);
    }
  });
});
