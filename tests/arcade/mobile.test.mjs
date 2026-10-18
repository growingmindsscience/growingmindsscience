// Arcade mobile contract (keyless, no browser): the shell keeps the pieces a
// phone needs and every game speaks pointer events, declares an orientation
// hook, and keeps its on-screen labels short enough for a 320px row. The
// browser-driven sweep (viewports, scale, screenshots) lives outside CI; this
// guards the structure it relies on. Runs with: node --test "tests/arcade/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const core = read("assets/js/arcade-core.js");
const css = read("assets/css/arcade.css");
const hub = read("arcade/index.html");

const GAMES = ["asteroids", "blocks", "breakout", "dino", "echo", "hopper", "invaders", "maze", "pong", "snake"];
const PUZZLES = ["five", "groups", "nest", "mini", "six"];

test("hub: the viewport meta lets the page fit the device", () => {
  assert.match(hub, /<meta name="viewport" content="width=device-width, initial-scale=1"/);
});

test("core: the canvas reports its scale, the fall transform is cleared, the body is pinned", () => {
  assert.match(core, /el\.setAttribute\("data-scale"/, "makeCanvas.fit() must publish data-scale");
  assert.match(core, /p\.style\.transform = "none";/, "tearPageAway must clear the fall transform (it widened the document on phones)");
  assert.match(core, /lockScroll\(s\);/);
  assert.match(core, /unlockScroll\(s\);/);
  assert.match(core, /classList\.add\(NS \+ "-fixed"\)/);
});

test("core: the shell dispatches orientation flips and owns the rotate hint", () => {
  assert.match(core, /game\.onViewport\(o\.charAt\(0\) === "p"\)/, "the fit wrapper must call game.onViewport on an orientation flip");
  assert.match(core, /NS \+ "-rotate"/, "the shell must build the rotate hint");
  assert.match(core, /function checkFit\(\)/);
  assert.match(core, /zone\.style\.touchAction = "none"/, "makeStick must stop the zone panning");
  assert.match(core, /actx\.state !== "running"/, "the synth must resume from iOS's interrupted state too");
  assert.match(core, /_gmsPaper/, "draw.paper must cache the dot grid");
});

test("stylesheet: scroll lock, touch-action, safe areas, the sideways layout, 44px floors", () => {
  assert.match(css, /body\.gms-arcade-fixed \{[^}]*position: fixed/);
  assert.match(css, /\.gms-arcade-overlay \{[^}]*touch-action: pan-y/);
  assert.match(css, /\.gms-arcade-overlay \{[^}]*-webkit-touch-callout: none/);
  assert.match(css, /\.gms-arcade-canvas \{[^}]*touch-action: none/);
  assert.match(css, /\.gms-arcade-panel \{[^}]*env\(safe-area-inset-left/);
  assert.match(css, /grid-template-areas: "head stage touch" "hud stage touch"/, "phones held sideways need the side layout");
  assert.match(css, /\.gms-arcade-board > \* \{ flex-shrink: 0; \}/, "a short stage must scroll a puzzle board, not squash it");
  assert.match(css, /\.gms-arcade-prompt__card \{[^}]*margin: auto/, "a tall prompt card must stay reachable by scrolling");
  assert.match(css, /\.gms-arcade-rotate \{/);
  assert.match(css, /\.gms-arcade-close \{[^}]*width: 44px; height: 44px/, "sound and close buttons are 44px");
  assert.match(css, /\.gms-arcade-choice \{[^}]*min-height: 44px/);
  assert.match(css, /\.gms-arcade-touchbtn \{[^}]*min-height: 50px/);
  assert.match(css, /\.mini__cluebtn \{[^}]*min-height: 44px/);
  // No touch target in the shell may be set below 44px anywhere in the file.
  for (const m of css.matchAll(/\.gms-arcade-(iconbtn|close|touchbtn|choice)[^{]*\{([^}]*)\}/g)) {
    const h = /(?:min-)?height: (\d+)px/.exec(m[2]);
    if (h) assert.ok(+h[1] >= 44, `${m[0].slice(0, 40)}… sets a height of ${h[1]}px`);
  }
});

for (const key of GAMES) {
  const src = read(`assets/js/${key}-game.js`);
  test(`${key}: pointer events only, an orientation hook, short on-screen labels`, () => {
    assert.doesNotMatch(src, /addEventListener\("(mouse|touch)/, "games listen to pointer events, never mouse or touch events");
    assert.match(src, /onViewport: function/, "the game must pause or re-lay on an orientation flip");
    for (const m of src.matchAll(/\{ id: "[a-z0-9]+", label: "([^"]+)"/g)) {
      assert.ok(m[1].length <= 12, `label "${m[1]}" is longer than 12 characters and will not fit a 320px touch row`);
    }
  });
}

for (const key of PUZZLES) {
  const src = read(`assets/js/daily-${key}.js`);
  test(`${key}: a DOM board on the shell, pointer and click events only`, () => {
    assert.match(src, /gms-arcade-board/);
    assert.doesNotMatch(src, /addEventListener\("(mouse|touch)/);
  });
}
