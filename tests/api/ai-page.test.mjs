// Page-side behaviour of Ask the research (tools/ask-the-research.html) that
// can be checked without a browser: the answer renderer, which links an
// answer may carry, and the live-region, limit and print contracts.
// The browser paths (streaming, errors, limits, print) are exercised with
// Playwright route mocks during review.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PAGE = readFileSync(fileURLToPath(new URL("../../tools/ask-the-research.html", import.meta.url)), "utf8");
const SCRIPT = PAGE.slice(PAGE.indexOf("const TOPICS"));

// The renderer section is plain functions with no DOM access, so it can run here.
function loadRenderer() {
  const start = SCRIPT.indexOf("/* ── Markdown renderer");
  const end = SCRIPT.indexOf("/* Further reading the server sent");
  assert.ok(start > 0 && end > start, "renderer section found");
  // eslint-disable-next-line no-new-func
  return new Function(`${SCRIPT.slice(start, end)}\nreturn { renderMarkdown, applyInline, safeUrl };`)();
}
const { renderMarkdown, safeUrl } = loadRenderer();
const NB = "‑";

test("renderer: a bullet list is one valid <ul> with no <br> or empty paragraphs", () => {
  const html = renderMarkdown("Some babies cry more at six weeks.\n\n- Hold and rock\n- Lower the lights\n- Take turns\n\nCall your pediatrician if crying comes with a fever.");
  assert.equal(html,
    "<p>Some babies cry more at six weeks.</p>" +
    "<ul><li>Hold and rock</li><li>Lower the lights</li><li>Take turns</li></ul>" +
    "<p>Call your pediatrician if crying comes with a fever.</p>");
  assert.ok(!/<ul>[^]*<br>[^]*<\/ul>/.test(html));
  assert.ok(!html.includes("<p></p>"));
});

test("renderer: a list right after a line of text, numbered lists, and single line breaks", () => {
  assert.equal(renderMarkdown("Try these:\n- one\n- two"), "<p>Try these:</p><ul><li>one</li><li>two</li></ul>");
  assert.equal(renderMarkdown("1. Notice\n2. Name\n3. Wait"), "<ol><li>Notice</li><li>Name</li><li>Wait</li></ol>");
  assert.equal(renderMarkdown("Line one\nline two"), "<p>Line one<br>line two</p>");
  assert.equal(renderMarkdown("  \n\n\n"), "");
  assert.equal(renderMarkdown("**Key idea** and *a nuance*"), "<p><strong>Key idea</strong> and <em>a nuance</em></p>");
});

test("renderer: model text can never inject markup", () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)> [click](javascript:alert(1)) "quoted"');
  assert.ok(!html.includes("<img"));
  assert.ok(!/href="javascript/i.test(html));
  assert.ok(html.includes("&lt;img"));
});

test("renderer: only verified source hosts become links", () => {
  const ok = renderMarkdown("See https://developingchild.harvard.edu/science/key-concepts/serve-and-return/.");
  assert.match(ok, /<a class="msg__src" href="https:\/\/developingchild\.harvard\.edu\/science\/key-concepts\/serve-and-return\/" target="_blank" rel="noopener noreferrer">/);
  assert.ok(ok.endsWith("</a>.</p>"), "trailing full stop stays outside the link");
  const md = renderMarkdown("[the AAP](https://www.healthychildren.org/English/Pages/default.aspx) says so.");
  assert.match(md, /<a class="msg__src" href="https:\/\/www\.healthychildren\.org\/English\/Pages\/default\.aspx"[^>]*>the AAP<\/a> says so\./);
  for (const bad of ["https://evil.example/login", "http://www.cdc.gov/", "https://www.cdc.gov.evil.example/", "https://user:pw@www.cdc.gov/"]) {
    assert.ok(!renderMarkdown(`Go to ${bad} now`).includes("<a"), bad);
  }
  assert.equal(renderMarkdown("[free gift](https://evil.example/)"), "<p>free gift</p>");
  assert.equal(safeUrl("javascript:alert(1)"), null);
});

test("renderer: help lines and 911/988 become tap-to-call links; other numbers do not", () => {
  const html = renderMarkdown(`Call Poison Help at 1${NB}800${NB}222${NB}1222 now, or call 911. You can call or text 988.`);
  assert.ok(html.includes(`<a class="msg__tel" href="tel:+18002221222">1${NB}800${NB}222${NB}1222</a>`));
  assert.ok(html.includes('call <a class="msg__tel" href="tel:911">911</a>'));
  assert.ok(html.includes('call or text <a class="msg__tel" href="tel:988">988</a>'));
  assert.ok(renderMarkdown("Childhelp: 1-800-422-4453").includes('href="tel:+18004224453"'));
  assert.ok(!renderMarkdown("Not 1-800-222-1223, and 911 people came.").includes("<a"));
});

test("live region: never busy; a status line speaks, streaming text is hidden until finished", () => {
  assert.ok(!/aria-busy="/.test(PAGE), "no aria-busy attribute in the markup");
  assert.ok(!/setAttribute\('aria-busy'/.test(SCRIPT), "the script never sets aria-busy");
  assert.match(PAGE, /id="chatMessages" role="log"[^>]*aria-live="polite"/);
  assert.match(PAGE, /<p class="sr-only" id="chatStatus" role="status"><\/p>/);
  assert.match(SCRIPT, /statusEl\.textContent = 'Writing an answer'/);
  assert.match(SCRIPT, /answer\.wrap\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(SCRIPT, /shown\.removeAttribute\('aria-hidden'\);\s*answer\.wrap\.replaceWith\(shown\)/);
});

test("limits: the topic cards go away at the free limit, and a blocked send moves focus to the limit panel", () => {
  assert.match(SCRIPT, /topicBrowserEl\.hidden = !canAsk;/);
  assert.match(SCRIPT, /browseBtn\.hidden = !canAsk;/);
  assert.match(SCRIPT, /if \(questionsRemaining\(\) <= 0\) \{\s*updateTierBadge\(\);\s*limitEl\.focus\(\);/);
  assert.match(PAGE, /id="limitReached" class="chat-limit" tabindex="-1" hidden/);
  // A partly streamed answer counts locally, as it does on the server.
  assert.match(SCRIPT, /if \(fullText\.trim\(\) && !isUnlimited\(\)\) incrementUsage\(\);/);
});

test("print: the whole conversation prints, the controls do not", () => {
  const print = PAGE.slice(PAGE.indexOf("@media print"));
  assert.match(print, /\.chat-messages \{ max-height: none; overflow: visible;/);
  for (const sel of [".chat-toolbar", "#inputArea", ".plans-strip", ".topic-sheet"]) assert.ok(print.includes(sel), sel);
  assert.ok(!/\.chat-meta__left[^{]*\{[^}]*display: none/.test(print.slice(0, print.indexOf("@media (prefers-reduced-motion"))), "the safety line still prints");
});
