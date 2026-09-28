import { describe, expect, it } from "vitest";
import { createClipPlayer, type AudioLike } from "../lib/clip-player";

class FakeAudio implements AudioLike {
  currentTime = 0;
  onended: ((ev: Event) => unknown) | null = null;
  onpause: ((ev: Event) => unknown) | null = null;
  onerror: ((ev: Event) => unknown) | null = null;
  paused = true;
  playCalls = 0;
  constructor(
    readonly src: string,
    private readonly rejectPlay = false,
  ) {}
  play() {
    this.playCalls++;
    this.paused = false;
    return this.rejectPlay ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.onpause?.(new Event("pause"));
  }
}

function harness(opts: { reject?: boolean } = {}) {
  const made: FakeAudio[] = [];
  const states: boolean[] = [];
  const player = createClipPlayer({
    makeAudio: (src) => {
      const a = new FakeAudio(src, opts.reject);
      made.push(a);
      return a;
    },
    onPlayingChange: (p) => states.push(p),
  });
  return { player, made, states };
}

describe("clip player (N1: the button always plays the line on screen)", () => {
  it("plays the clip for the current line, not the first one it ever loaded", () => {
    const { player, made } = harness();
    player.toggle("/nsc/audio/one.mp3");
    player.toggle("/nsc/audio/one.mp3"); // stop
    player.toggle("/nsc/audio/three.mp3"); // the next step's line
    expect(made.map((a) => a.src)).toEqual(["/nsc/audio/one.mp3", "/nsc/audio/three.mp3"]);
    expect(made[1].playCalls).toBe(1);
    expect(player.src).toBe("/nsc/audio/three.mp3");
    expect(player.playing).toBe(true);
  });

  it("switching lines mid-play stops the old clip first", () => {
    const { player, made } = harness();
    player.toggle("/a.mp3");
    player.toggle("/b.mp3");
    expect(made[0].paused).toBe(true);
    expect(made[1].paused).toBe(false);
  });

  it("toggles the same clip off and on from the start", () => {
    const { player, made } = harness();
    player.toggle("/a.mp3");
    made[0].currentTime = 2.5;
    player.toggle("/a.mp3");
    expect(player.playing).toBe(false);
    expect(made[0].currentTime).toBe(0);
    player.toggle("/a.mp3");
    expect(made).toHaveLength(1); // same clip reuses its element
    expect(player.playing).toBe(true);
  });

  it("a rejected play() (autoplay policy, network) doesn't stick on Stop", async () => {
    const { player, states } = harness({ reject: true });
    player.toggle("/a.mp3");
    await Promise.resolve();
    await Promise.resolve();
    expect(player.playing).toBe(false);
    expect(states).toEqual([true, false]);
  });

  it("a load error and a natural end both reset the button", () => {
    const { player, made } = harness();
    player.toggle("/a.mp3");
    made[0].onerror?.(new Event("error"));
    expect(player.playing).toBe(false);
    player.toggle("/a.mp3");
    made[0].onended?.(new Event("ended"));
    expect(player.playing).toBe(false);
  });

  it("stop() releases the element so nothing plays after a step change", () => {
    const { player, made } = harness();
    player.toggle("/a.mp3");
    player.stop();
    expect(made[0].paused).toBe(true);
    expect(player.src).toBeNull();
    expect(player.playing).toBe(false);
  });
});
