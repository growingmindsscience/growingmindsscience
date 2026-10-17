#!/usr/bin/env node
// Builds the word data for the daily puzzles. See scripts/arcade/README.md.
//   node scripts/arcade/build-words.mjs
// Writes assets/data/arcade/five.json (Five Letters) and nest.json (Letter Nest).
// Deterministic: same inputs, same output.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "assets", "data", "arcade");

const DICT_PATH = ["/usr/share/dict/words", "/usr/share/dict/web2"].find(existsSync);
if (!DICT_PATH) { console.error("No system dictionary found."); process.exit(1); }

const alpha = (w) => /^[a-z]+$/.test(w);
const dict = new Set(readFileSync(DICT_PATH, "utf8").split("\n").filter(alpha));
const ranked = readFileSync(join(HERE, "words-20k.txt"), "utf8").split("\n").map((w) => w.trim()).filter(alpha);
const rankOf = new Map(ranked.map((w, i) => [w, i]));

// Names, abbreviations and web words that sit in both lists but are not
// answers anyone would enjoy. propernames ships beside the dictionary.
const NAMES_PATH = "/usr/share/dict/propernames";
const names = new Set(existsSync(NAMES_PATH) ? readFileSync(NAMES_PATH, "utf8").split("\n").map((w) => w.trim().toLowerCase()) : []);
const EXCLUDE = new Set(("dont cant wont isnt didnt doesnt corp admin yahoo coco inc ltd llc www http html org com net edu gov etc misc info " +
  "asap faq url usa uk ny la dc tv pc mp dvd cd gif jpg png pdf xml php sql ascii ebay msn aol ibm cgi ftp ssl seo url blog blogs " +
  "donna irene allan dorado amino alias dover drake aspen adobe anime demos").split(" "));

// Words that are common AND in the dictionary, in frequency order.
const common = ranked.filter((w) => dict.has(w) && !names.has(w) && !EXCLUDE.has(w));

// A short list of words a family site should not surface as an answer or a
// pangram. Guesses are not filtered (a guess is private to the player).
const BLOCK = new Set(("anal anus arse balls bitch boob boobs butt cock crap damn dick dildo fuck hell homo nazi negro nigga " +
  "penis piss porn porno prick pussy rape rapist sex sexy shit slut tits whore sperm vagina erotic nude nudes nudity screw").split(" "));

// ---------- Five Letters ----------
const five = common.filter((w) => w.length === 5 && !BLOCK.has(w));
// Answers: the familiar end of the list, skipping plural-looking words whose
// singular is also common (so "games" is a guess, not an answer).
const commonSet = new Set(common);
const answers = five.filter((w, i) => i < 2200 && !(w.endsWith("s") && commonSet.has(w.slice(0, -1))))
  .filter((w) => (rankOf.get(w) ?? 1e9) < 12000);
// A few words of this house, whichever rank they hold.
const HOUSE = "child learn grow sleep laugh smile story stack block spoon crawl words sense voice touch brain nurse adult teach watch".split(" ")
  .filter((w) => w.length === 5 && dict.has(w));
for (const w of HOUSE) if (!answers.includes(w)) answers.push(w);
const guessSet = new Set([...dict].filter((w) => w.length === 5));
for (const w of answers) guessSet.add(w);
const guesses = [...guessSet].sort();
writeFileSync(join(OUT, "five.json"), JSON.stringify({
  note: "answers: common five-letter words; guesses: every five-letter dictionary word, concatenated (5 chars each, sorted)",
  answers: answers.sort(),
  guesses: guesses.join("")
}));
console.log(`five.json: ${answers.length} answers, ${guesses.length} guesses`);

// ---------- Letter Nest ----------
// Valid words: common dictionary words of 4 to 10 letters.
const nestWords = common.filter((w) => w.length >= 4 && w.length <= 10 && !BLOCK.has(w));
const distinct = (w) => new Set(w.split("")).size;
// Pangram candidates: common words with exactly seven distinct letters.
const pangramCandidates = nestWords.filter((w) => distinct(w) === 7 && (rankOf.get(w) ?? 1e9) < 9000);
const seen = new Set();
const sets = [];
for (const pw of pangramCandidates) {
  const letters = [...new Set(pw.split(""))].sort().join("");
  if (seen.has(letters)) continue;
  seen.add(letters);
  const inSet = nestWords.filter((w) => [...w].every((ch) => letters.includes(ch)));
  let bestSet = null;
  for (const center of letters) {
    const words = inSet.filter((w) => w.includes(center));
    if (words.length < 18 || words.length > 60) continue;
    const pangrams = words.filter((w) => distinct(w) === 7 && [...w].every((ch) => letters.includes(ch)));
    if (!pangrams.length || pangrams.some((p) => BLOCK.has(p))) continue;
    // Prefer sets with a healthy spread of lengths and a few pangrams.
    const score = Math.min(words.length, 45) + pangrams.length * 3 + (words.filter((w) => w.length >= 6).length > 4 ? 4 : 0);
    if (!bestSet || score > bestSet.score) bestSet = { letters, center, words, pangrams, score };
  }
  if (bestSet) sets.push(bestSet);
}
sets.sort((a, b) => b.score - a.score);
const chosen = sets.slice(0, 140).map((s) => ({ letters: s.letters, center: s.center, words: s.words.sort(), pangrams: s.pangrams.sort() }));
writeFileSync(join(OUT, "nest.json"), JSON.stringify({ note: "letters: the seven letters; center: required letter; words: accepted words; pangrams: words using all seven", sets: chosen }));
console.log(`nest.json: ${chosen.length} sets (from ${sets.length} candidates); nest dictionary ${nestWords.length} words`);
