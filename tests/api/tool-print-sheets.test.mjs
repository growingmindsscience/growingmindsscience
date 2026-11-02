// The printable tools build their print sheet inside an empty container that
// toolapp.css shows only while printing (body.printing-* > #id). The 2026-10-14
// redesign dropped those containers, so every "Print" button threw on a null
// element and printed nothing. A page that looks a container up must have it,
// as a direct child of <body> (the print rule hides every other child).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TOOLS = fileURLToPath(new URL("../../tools/", import.meta.url));
const SHEETS = ["visit-sheet", "al-pocket", "rp-deck", "nv-sheet", "cp-sheet"];

for (const file of readdirSync(TOOLS).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(TOOLS + file, "utf8");
  for (const id of SHEETS) {
    if (!html.includes(`getElementById("${id}")`)) continue;
    test(`tools/${file} has its #${id} print container outside <main>`, () => {
      const at = html.indexOf(`<div id="${id}" aria-hidden="true"></div>`);
      assert.ok(at > 0, `tools/${file} reads #${id} but never declares it`);
      assert.ok(at > html.indexOf("</main>") && at < html.indexOf("<footer"), `#${id} must sit between </main> and the footer`);
    });
  }
}

// Printing from the browser menu, Ctrl+P or a phone's share sheet skips the
// tool's Print button. These two tools build their sheet for every print path:
// the checkup page keeps #cp-sheet built while the result shows (toolapp.css
// prints it under body.cp-has-page); the prompt cards build #rp-deck on
// beforeprint.
const EVERY_PRINT_PATH = {
  "checkup-prep.html": ['classList.add("cp-has-page")', 'classList.remove("cp-has-page")'],
  "reading-prompt-cards.html": ['addEventListener("beforeprint"', 'addEventListener("afterprint"'],
};
for (const [file, needles] of Object.entries(EVERY_PRINT_PATH)) {
  test(`tools/${file} builds its print sheet for every print path`, () => {
    const html = readFileSync(TOOLS + file, "utf8");
    for (const n of needles) assert.ok(html.includes(n), `tools/${file} is missing ${n}`);
  });
}
