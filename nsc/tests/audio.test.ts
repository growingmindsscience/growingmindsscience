import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { audioClipId, voiceableText } from "../lib/audio";

// Mirrors lib/assessment.ts interpolate() — kept inline so the test doesn't
// pull that module's @/ alias imports through vitest.
const interpolate = (line: string, v: { name: string; objects: string }) =>
  line.replaceAll("{name}", v.name).replaceAll("{objects}", v.objects);

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
