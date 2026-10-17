#!/usr/bin/env node
// Fills 5x5 crossword grids with common words so clues can be written against
// real fills. Prints candidate fills; nothing is written. Usage:
//   node scripts/arcade/fill-mini.mjs [count] [seed]
// Patterns use "." for a white cell and "#" for a black one; every pattern is
// rotationally symmetric and every word is three letters or longer.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT_PATH = ["/usr/share/dict/words", "/usr/share/dict/web2"].find(existsSync);
const alpha = (w) => /^[a-z]+$/.test(w);
const dict = new Set(readFileSync(DICT_PATH, "utf8").split("\n").filter(alpha));
const names = new Set(existsSync("/usr/share/dict/propernames") ? readFileSync("/usr/share/dict/propernames", "utf8").split("\n").map((w) => w.trim().toLowerCase()) : []);
const ranked = readFileSync(join(HERE, "words-20k.txt"), "utf8").split("\n").map((w) => w.trim()).filter(alpha);
const EXCLUDE = new Set("penis spam das san gnu anal anus sex sexy porn nude rape nazi damn hell piss crap tits dick cock slut whore semen sperm boob boobs drug drugs died dead kill guns gun bomb nuke tnt thats dont cant wont isnt corp admin yahoo coco inc ltd llc www http html org com net edu gov etc misc info asap faq url usa uk ny la dc tv pc mp dvd cd gif jpg png pdf xml php sql ebay msn aol ibm cgi ftp ssl seo blog".split(" "));
// Five-letter answers stay at the familiar end of the list; three- and
// four-letter crossings may reach further down (still everyday words).
const LIMIT5 = 7000, LIMIT34 = 15000;
const common = ranked.filter((w, i) => i < (w.length === 5 ? LIMIT5 : LIMIT34) && dict.has(w) && !names.has(w) && !EXCLUDE.has(w) && w.length >= 3 && w.length <= 5);
const byLen = { 3: [], 4: [], 5: [] };
for (const w of common) byLen[w.length].push(w);

const PATTERNS = [
  ["#....", ".....", ".....", ".....", "....#"],
  ["....#", ".....", ".....", ".....", "#...."],
  ["##...", ".....", ".....", ".....", "...##"],
  ["...##", ".....", ".....", ".....", "##..."],
  ["#...#", ".....", ".....", ".....", "#...#"],
  ["#....", "#....", ".....", "....#", "....#"],
  ["....#", "....#", ".....", "#....", "#...."],
];

function slots(p) {
  const out = [];
  for (let r = 0; r < 5; r++) {
    let c = 0;
    while (c < 5) {
      if (p[r][c] === "#") { c++; continue; }
      let s = c; while (c < 5 && p[r][c] !== "#") c++;
      if (c - s >= 3) out.push({ dir: "A", r, c: s, len: c - s });
      else throw new Error("across run shorter than three");
    }
  }
  for (let c = 0; c < 5; c++) {
    let r = 0;
    while (r < 5) {
      if (p[r][c] === "#") { r++; continue; }
      let s = r; while (r < 5 && p[r][c] !== "#") r++;
      if (r - s >= 3) out.push({ dir: "D", r: s, c, len: r - s });
      else throw new Error("down run shorter than three");
    }
  }
  return out;
}

function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Letter-position index per length: index[len][pos][letter] -> Set of words.
const index = {};
for (const len of [3, 4, 5]) {
  index[len] = [];
  for (let pos = 0; pos < len; pos++) index[len].push({});
  for (const w of byLen[len]) for (let pos = 0; pos < len; pos++) (index[len][pos][w[pos]] ||= new Set()).add(w);
}
const commonSet = new Set(common);
function fill(pattern, rnd) {
  const grid = pattern.map((row) => row.split(""));
  const sl = slots(pattern);
  const used = new Set();
  // a per-attempt order for each length: common words first, jittered
  const order = {};
  for (const len of [3, 4, 5]) order[len] = byLen[len].map((w, i) => ({ w, k: i + rnd() * 500 })).sort((a, b) => a.k - b.k).map((x) => x.w);
  const rank = {};
  for (const len of [3, 4, 5]) order[len].forEach((w, i) => { rank[w] = i; });
  function cells(s) { const out = []; for (let i = 0; i < s.len; i++) out.push(s.dir === "A" ? [s.r, s.c + i] : [s.r + i, s.c]); return out; }
  function candidates(s) {
    const cs = cells(s);
    let set = null;
    for (let i = 0; i < cs.length; i++) {
      const g = grid[cs[i][0]][cs[i][1]];
      if (g === ".") continue;
      const hit = index[s.len][i][g] || new Set();
      set = set ? new Set([...set].filter((w) => hit.has(w))) : new Set(hit);
      if (!set.size) return [];
    }
    const list = set ? [...set] : order[s.len].slice();
    return list.filter((w) => !used.has(w) && !(w.length === 5 && taken.has(w))).sort((a, b) => rank[a] - rank[b]);
  }
  let steps = 0;
  function solve() {
    if (++steps > 20000) return false;
    let best = null, bestList = null;
    for (const s of sl) {
      const cs = cells(s);
      if (cs.every(([r, c]) => grid[r][c] !== ".")) {
        // completed by crossings: it still has to be a real, unused word
        const w = cs.map(([r, c]) => grid[r][c]).join("");
        if (!commonSet.has(w) || (w.length === 5 && taken.has(w))) return false;
        continue;
      }
      const list = candidates(s);
      if (!list.length) return false;
      if (!best || list.length < bestList.length) { best = s; bestList = list; }
    }
    if (!best) return true;
    const cs = cells(best);
    for (const w of bestList.slice(0, 50)) {
      const prev = cs.map(([r, c]) => grid[r][c]);
      cs.forEach(([r, c], k) => { grid[r][c] = w[k]; });
      used.add(w);
      if (solve()) return true;
      used.delete(w);
      cs.forEach(([r, c], k) => { grid[r][c] = prev[k]; });
    }
    return false;
  }
  if (!solve()) { if (process.env.DEBUG) console.error("no solve", pattern.join("/"), "steps", steps); return null; }
  const words = sl.map((s) => ({ ...s, word: cells(s).map(([r, c]) => grid[r][c]).join("") }));
  if (!words.every((w) => commonSet.has(w.word))) { if (process.env.DEBUG) console.error("uncommon", words.map((w) => w.word).join(",")); return null; }
  if (new Set(words.map((w) => w.word)).size !== words.length) return null;
  return { grid: grid.map((r) => r.join("")), words };
}

const count = +(process.argv[2] || 12);
const seed = +(process.argv[3] || 7);
const rnd = mulberry(seed);
let made = 0, tries = 0;
const seenGrid = new Set();
const taken = new Set(); // words already used by an accepted fill: forces variety
const EASY = [2, 3, 5, 6, 0, 1, 4]; // patterns with fewer five-letter slots first
while (made < count && tries < count * 40) {
  tries++;
  const p = PATTERNS[EASY[tries % EASY.length]];
  const f = fill(p, rnd);
  if (!f) continue;
  const key = f.grid.join("/");
  if (seenGrid.has(key)) continue;
  seenGrid.add(key);
  made++;
  for (const w of f.words) taken.add(w.word);
  console.log(`--- fill ${made}`);
  console.log(f.grid.join("\n"));
  console.log(f.words.map((w) => `${w.dir}${w.r},${w.c}:${w.word}`).join("  "));
}
