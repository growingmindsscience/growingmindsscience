// Daily puzzle data gates (keyless). Runs with: node --test "tests/arcade/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = join(ROOT, "assets/data/arcade");
const load = (name) => JSON.parse(readFileSync(join(DATA, name), "utf8"));

test("Five Letters: answers are common, lowercase, five letters and all guessable", () => {
  const five = load("five.json");
  assert.ok(five.answers.length >= 500, `only ${five.answers.length} answers`);
  assert.equal(five.guesses.length % 5, 0, "guess string is not a multiple of five");
  const guessSet = new Set();
  for (let i = 0; i < five.guesses.length; i += 5) guessSet.add(five.guesses.slice(i, i + 5));
  for (const w of five.answers) {
    assert.match(w, /^[a-z]{5}$/, `bad answer ${w}`);
    assert.ok(guessSet.has(w), `answer ${w} is not in the guess list`);
  }
  assert.equal(new Set(five.answers).size, five.answers.length, "duplicate answers");
  // sorted, so the game's indexOf-by-multiple-of-five lookup stays valid
  const list = [...guessSet];
  assert.deepEqual(list, list.slice().sort(), "guess list is not sorted");
});

test("Groupings: every puzzle has four groups of four unique words with levels 1 to 4", () => {
  const { puzzles } = load("groups.json");
  assert.ok(puzzles.length >= 30, `only ${puzzles.length} puzzles`);
  const ids = new Set();
  for (const p of puzzles) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    assert.equal(p.groups.length, 4, `puzzle ${p.id} has ${p.groups.length} groups`);
    assert.deepEqual(p.groups.map((g) => g.level).sort(), [1, 2, 3, 4], `puzzle ${p.id} levels`);
    const words = p.groups.flatMap((g) => g.words);
    assert.equal(words.length, 16, `puzzle ${p.id} word count`);
    assert.equal(new Set(words).size, 16, `puzzle ${p.id} repeats a word: ${words.join(", ")}`);
    for (const g of p.groups) {
      assert.ok(g.title && g.title.length <= 40, `puzzle ${p.id} group title`);
      for (const w of g.words) assert.match(w, /^[A-Z]+$/, `puzzle ${p.id}: word ${w} must be uppercase letters`);
    }
  }
});

test("Letter Nest: every set has seven distinct letters, a centre, 18 to 60 words, a pangram", () => {
  const { sets } = load("nest.json");
  assert.ok(sets.length >= 60, `only ${sets.length} sets`);
  const seen = new Set();
  for (const s of sets) {
    assert.match(s.letters, /^[a-z]{7}$/, `letters ${s.letters}`);
    assert.equal(new Set(s.letters).size, 7, `letters repeat in ${s.letters}`);
    assert.ok(s.letters.includes(s.center), `centre ${s.center} not in ${s.letters}`);
    assert.ok(!seen.has(s.letters), `duplicate set ${s.letters}`); seen.add(s.letters);
    assert.ok(s.words.length >= 18 && s.words.length <= 60, `${s.letters}: ${s.words.length} words`);
    assert.ok(s.pangrams.length >= 1, `${s.letters} has no pangram`);
    for (const w of s.words) {
      assert.ok(w.length >= 4, `${s.letters}: ${w} too short`);
      assert.ok(w.includes(s.center), `${s.letters}: ${w} lacks the centre`);
      assert.ok([...w].every((ch) => s.letters.includes(ch)), `${s.letters}: ${w} uses a letter outside the set`);
    }
    for (const p of s.pangrams) {
      assert.ok(s.words.includes(p), `${s.letters}: pangram ${p} not in words`);
      assert.equal(new Set(p).size, 7, `${s.letters}: ${p} is not a pangram`);
    }
  }
});

test("Little Crossword: square grids, every entry three letters or longer, a clue for every entry", () => {
  const { puzzles } = load("mini.json");
  assert.ok(puzzles.length >= 10, `only ${puzzles.length} puzzles`);
  const ids = new Set();
  for (const p of puzzles) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    const n = p.grid.length;
    assert.ok(n >= 5, `puzzle ${p.id} is smaller than 5x5`);
    for (const row of p.grid) assert.equal(row.length, n, `puzzle ${p.id} is not square`);
    for (const row of p.grid) assert.match(row, /^[A-Z#]+$/, `puzzle ${p.id}: grid rows hold answer letters and #`);
    // numbering as the game derives it
    let k = 0; const need = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (p.grid[r][c] === "#") continue;
      const startsA = (c === 0 || p.grid[r][c - 1] === "#") && c + 1 < n && p.grid[r][c + 1] !== "#";
      const startsD = (r === 0 || p.grid[r - 1][c] === "#") && r + 1 < n && p.grid[r + 1][c] !== "#";
      if (startsA || startsD) { k++; if (startsA) need.push(["A", k, r, c]); if (startsD) need.push(["D", k, r, c]); }
    }
    for (const [d, num, r, c] of need) {
      const clue = p.clues[d] && p.clues[d][String(num)];
      assert.ok(clue && clue.length >= 3, `puzzle ${p.id}: no clue for ${num} ${d === "A" ? "across" : "down"}`);
      let len = 0;
      if (d === "A") { while (c + len < n && p.grid[r][c + len] !== "#") len++; } else { while (r + len < n && p.grid[r + len][c] !== "#") len++; }
      assert.ok(len >= 3, `puzzle ${p.id}: ${num} ${d} is only ${len} letters`);
    }
    // no stray runs of one or two letters anywhere
    for (let r = 0; r < n; r++) for (const run of p.grid[r].split("#")) assert.ok(run.length === 0 || run.length >= 3, `puzzle ${p.id}: row ${r} has a short run`);
    for (let c = 0; c < n; c++) { const col = p.grid.map((row) => row[c]).join(""); for (const run of col.split("#")) assert.ok(run.length === 0 || run.length >= 3, `puzzle ${p.id}: column ${c} has a short run`); }
    for (const d of ["A", "D"]) for (const num of Object.keys(p.clues[d] || {})) assert.ok(need.some((x) => x[0] === d && String(x[1]) === num), `puzzle ${p.id}: clue ${num} ${d} has no entry`);
  }
});
