// Arcade gates (keyless): every game key in arcade-core's registry has a file
// and a hub card, every game file parses, and no game file carries a retired
// brand color. Runs with: node --test "tests/arcade/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const core = readFileSync(join(ROOT, "assets/js/arcade-core.js"), "utf8");
const hub = readFileSync(join(ROOT, "arcade/index.html"), "utf8");

const registryBlock = core.slice(core.indexOf("var GAME_JS = {"), core.indexOf("};", core.indexOf("var GAME_JS = {")));
const entries = [...registryBlock.matchAll(/^\s*([a-z]+):\s*"\/assets\/js\/([\w-]+\.js)\?v=/gm)].map((m) => ({ key: m[1], file: m[2] }));

test("the registry lists every game and daily puzzle", () => {
  const keys = entries.map((e) => e.key).sort();
  assert.deepEqual(keys, ["asteroids", "blocks", "breakout", "dino", "echo", "five", "groups", "hopper", "invaders", "maze", "mini", "nest", "pong", "six", "snake"]);
});

for (const { key, file } of entries) {
  const path = join(ROOT, "assets/js", file);
  test(`${key}: file exists and parses`, () => {
    assert.ok(existsSync(path), `${file} missing`);
    execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
  });
  test(`${key}: hub has a Play button`, () => {
    assert.match(hub, new RegExp(`data-arcade-game="${key}"`), `arcade/index.html has no button for ${key}`);
  });
  test(`${key}: defines itself under the same key`, () => {
    const src = readFileSync(path, "utf8");
    assert.match(src, new RegExp(`defineGame\\("${key}"`), `${file} does not call A.defineGame("${key}", ...)`);
  });
  test(`${key}: no retired brand colors`, () => {
    const src = readFileSync(path, "utf8");
    for (const hex of ["FD951F", "9FCB43", "40C099", "D5BE98", "0E2A2D"]) {
      assert.ok(!new RegExp(hex, "i").test(src), `${file} still carries #${hex}`);
    }
  });
}

test("the shell stylesheet and core v2 exports are present", () => {
  for (const name of ["makeShell", "makeCanvas", "theme", "makeStory", "makePowerups", "dailySeed", "streak", "runSummary", "loadJSON"]) {
    assert.match(core, new RegExp(`\\n\\s+${name}: ${name},`), `core does not export ${name}`);
  }
  const css = readFileSync(join(ROOT, "assets/css/arcade.css"), "utf8");
  assert.match(css, /\.gms-arcade-prompt__card/);
  assert.match(css, /\.gms-arcade-pip/);
});
