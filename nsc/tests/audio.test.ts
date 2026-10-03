import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { audioClipId, voiceableText } from "../lib/audio";
// The runtime's own interpolate() (vitest resolves the @/ alias), so this
// test can't drift from what the screen renders — including "one block".
import { interpolate } from "../lib/assessment";

const root = join(__dirname, "..");
const manifest = JSON.parse(
  readFileSync(join(root, "content/audio.manifest.v1.json"), "utf8"),
) as { ids: string[] };
const ids = new Set(manifest.ids);

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

  it("every manifest id has a committed mp3", () => {
    for (const id of manifest.ids) {
      expect(existsSync(join(root, "public/audio", `${id}.mp3`))).toBe(true);
    }
  });

  it("a name-bearing line has no clip (graceful no-button)", () => {
    const raw = "Read each line exactly. Don't count for {name}.";
    // Runtime interpolates the name in; that text was never voiced.
    const rendered = interpolate(raw, { name: "Mia", objects: "blocks" });
    expect(ids.has(audioClipId(rendered))).toBe(false);
  });
});
