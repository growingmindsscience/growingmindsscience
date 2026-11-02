// Lightweight, dependency-free retrieval for the Growing Minds knowledge base.
//
// Given a question, returns the most relevant knowledge cards by scoring term
// overlap with light stemming, plus boosts for matches in a card's title and
// tags and for the age range the question is about. This needs no vector
// database, no embeddings, and no extra API key, which keeps it fast and cheap
// on the edge runtime. The corpus is small and curated, so lexical scoring is a
// good fit. (It can be upgraded to embeddings later without touching callers.)

import { KNOWLEDGE } from "./_knowledge-data.js";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "do", "does",
  "did", "have", "has", "had", "my", "our", "your", "their", "his", "her",
  "its", "it", "this", "that", "these", "those", "i", "we", "you", "he", "she",
  "they", "me", "us", "them", "at", "by", "from", "as", "so", "than", "too",
  "very", "can", "will", "just", "should", "would", "could", "about", "how",
  "what", "when", "why", "who", "which", "there", "here", "get", "got", "make",
  "like", "want", "need", "help", "child", "childs", "kid", "kids", "baby",
  "toddler", "year", "old", "months", "month",
]);

// Crude but effective stemmer: collapse common English suffixes so that
// "regulating", "regulation", and "regulate" match each other.
function stem(word) {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith("ation")) w = w.slice(0, -5) + "at";
  else if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
  return w;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

// Age bands the question seems to be about, so cards for that age get a boost.
const AGE_BANDS = [
  "0-3 months", "4-6 months", "7-9 months", "10-12 months",
  "13-18 months", "19-24 months", "25-36 months", "3-5 years",
];
function inferAgeBands(question) {
  const q = question.toLowerCase();
  const bands = new Set();
  const monthMatch = q.match(/(\d{1,2})\s*(?:-|to)?\s*(?:month|mo\b)/);
  // "2.5-year-old" is thirty months, not five years.
  const yearMatch = q.match(/(\d(?:\.\d)?)\s*(?:-|to)?\s*(?:year|yr|yo\b)/);
  const months = monthMatch ? parseInt(monthMatch[1], 10) : null;
  const years = yearMatch ? parseFloat(yearMatch[1]) : null;
  const totalMonths = months != null ? months : years != null ? Math.round(years * 12) : null;

  if (totalMonths != null) {
    if (totalMonths <= 3) bands.add("0-3 months");
    else if (totalMonths <= 6) bands.add("4-6 months");
    else if (totalMonths <= 9) bands.add("7-9 months");
    else if (totalMonths <= 12) bands.add("10-12 months");
    else if (totalMonths <= 18) bands.add("13-18 months");
    else if (totalMonths <= 24) bands.add("19-24 months");
    else if (totalMonths <= 36) bands.add("25-36 months");
    else bands.add("3-5 years");
    // A three-year-old is the end of toddlerhood and the start of preschool.
    if (totalMonths === 36) bands.add("3-5 years");
  }
  if (/\bnewborn\b/.test(q)) bands.add("0-3 months");
  if (/\binfant\b/.test(q)) { bands.add("4-6 months"); bands.add("7-9 months"); }
  if (/\btoddler\b/.test(q)) { bands.add("13-18 months"); bands.add("19-24 months"); bands.add("25-36 months"); }
  if (/\bpreschool|preschooler\b/.test(q)) bands.add("3-5 years");
  return bands;
}

// Precompute a token bag for each card once per cold start.
const INDEX = KNOWLEDGE.map((card) => {
  const titleTokens = new Set(tokenize(card.title));
  const tagTokens = new Set((card.tags || []).flatMap(tokenize));
  const bodyTokens = tokenize(card.text);
  const bodyFreq = new Map();
  for (const t of bodyTokens) bodyFreq.set(t, (bodyFreq.get(t) || 0) + 1);
  return { card, titleTokens, tagTokens, bodyFreq };
});

const BY_ID = new Map(KNOWLEDGE.map((card) => [card.id, card]));

// ── Pinned guidance ───────────────────────────────────────────────────────
// Lexical scoring misses the highest-stakes questions when parents phrase
// them naturally ("he stopped saying words", "she doesn't turn to her name"):
// the words match "name the feeling" and early-literacy chunks instead. These
// narrow patterns run on the raw question (straight or curly apostrophes) and
// put the right guidance first, whatever the lexical score. They deliberately
// do not fire on "sleep regression", "stopped napping" or "stop hitting".
// The pinned cards say plainly that none of these signs is a diagnosis.
const RED_FLAG = new RegExp([
  String.raw`\b(?:stop(?:ped|s)?|quit)\s+(?:talking|saying|using\s+words|babbling|waving|pointing|responding|smiling|making\s+eye\s+contact)\b`,
  String.raw`\b(?:lost|losing|loses|lose)\s+(?:(?:his|her|their|some|all|the)\s+)?(?:words?|speech|skills?|language)\b`,
  String.raw`\bno\s+longer\s+(?:talks?|says?|waves?|points?|babbles?|responds?|smiles?)\b`,
  String.raw`\b(?:language|speech|skills?|developmental)\s+regression\b`,
  String.raw`\b(?:doesn[’']?t|does\s+not|won[’']?t|isn[’']?t|not|never|rarely|stopped)\s+(?:\w+\s+){0,2}?(?:respond|react|turn|look|answer)\w*\b[^.?!]{0,30}\bname\b`,
  String.raw`\b(?:no|little|poor|avoids?|doesn[’']?t\s+make|won[’']?t\s+make)\s+eye\s+contact\b`,
  // "Is this autism?" scores low lexically (one word); the floor would drop it.
  String.raw`\bautis(?:m|tic)\b`,
].join("|"), "i");
export const RED_FLAG_CARDS = Object.freeze([
  "milestones-are-ranges",
  "source-toddler-2-3-late-talkers-and-when-to-check-12",
]);

// A parent at the edge with a crying baby: the class's put-the-baby-down plan.
const AT_THE_EDGE = [
  /\b(?:shak(?:e|es|ing|en)|shook)\s+(?:(?:my|the|our|a|this)\s+)?(?:baby|babies|newborn|infant|son|daughter|him|her|them)\b/i,
  /\bhurt\s+(?:my|the|our)\s+(?:baby|newborn|infant)\b/i,
];
const LOSING_IT = /\b(?:lose|losing|lost)\s+(?:it|control|my\s+temper|my\s+mind)\b/i;
const CRYING = /\b(?:cry|cries|crying|cried|scream\w*)\b/i;
export const AT_THE_EDGE_CARDS = Object.freeze([
  "source-infant-1-4-states-crying-and-the-borrowed-nervous-system-12",
]);

function pinnedFor(question) {
  const q = String(question || "");
  const pins = [];
  if (AT_THE_EDGE.some((re) => re.test(q)) || (LOSING_IT.test(q) && CRYING.test(q))) pins.push(...AT_THE_EDGE_CARDS);
  if (RED_FLAG.test(q)) pins.push(...RED_FLAG_CARDS);
  return pins;
}

// Relevance floor: a result must match two of the question's words (or half
// of a short question's), score at least MIN_SCORE, and reach MIN_SHARE of
// the best match, so a question the library does not cover
// ("swallowed a button battery") is not handed four unrelated chunks as its
// "primary" source.
const MIN_SCORE = 8;
const MIN_SHARE = 0.4;
const MIN_COVERAGE = 0.5;

/**
 * Return the top-k most relevant knowledge cards for a question.
 * @param {string} question
 * @param {number} k
 * @returns {Array<{card: object, score: number, matched: number, pinned?: boolean}>}
 */
export function retrieve(question, k = 4) {
  const qTokens = [...new Set(tokenize(question))];
  if (!qTokens.length) return [];
  const ageBands = inferAgeBands(question);

  const scored = [];
  for (const { card, titleTokens, tagTokens, bodyFreq } of INDEX) {
    let score = 0;
    let matched = 0;
    for (const t of qTokens) {
      let hit = false;
      if (titleTokens.has(t)) { score += 5; hit = true; }
      if (tagTokens.has(t)) { score += 4; hit = true; }
      const bf = bodyFreq.get(t);
      if (bf) { score += Math.min(3, 1 + Math.log2(bf)); hit = true; }
      if (hit) matched++;
    }
    if (!matched) continue;
    // Reward covering more of the distinct query terms.
    score *= 1 + matched / qTokens.length;
    // Age-band alignment boost.
    if (ageBands.size && (card.ageBands || []).some((b) => ageBands.has(b))) {
      score *= 1.25;
    }
    scored.push({ card, score, matched });
  }

  scored.sort((a, b) => b.score - a.score);
  const pins = pinnedFor(question);
  // A card must cover enough of the question, not just one of its words.
  const covering = scored.filter((r) => r.matched >= 2 || r.matched / qTokens.length >= MIN_COVERAGE);
  const best = covering.length ? covering[0].score : 0;
  const relevant = covering.filter((r) => r.score >= Math.max(MIN_SCORE, best * MIN_SHARE));
  if (!pins.length) return relevant.slice(0, k);
  const pinned = pins.map((id) => BY_ID.get(id)).filter(Boolean).map((card) => ({ card, score: Infinity, matched: 0, pinned: true }));
  const rest = relevant.filter((r) => !pins.includes(r.card.id));
  return [...pinned, ...rest].slice(0, k);
}

/**
 * Format retrieved cards into a grounding block for the system prompt.
 * @param {Array<{card: object}>} results
 * @returns {string}
 */
export function formatContext(results) {
  if (!results.length) return "";
  const blocks = results.map(({ card }, i) => {
    const src = card.source?.url
      ? `${card.source.label} (${card.source.url})`
      : card.source?.label || "From Little Onward knowledge base";
    return `[${i + 1}] ${card.title}\nSource: ${src}\n${card.text}`;
  });
  return blocks.join("\n\n");
}
