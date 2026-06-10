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
  const yearMatch = q.match(/(\d)\s*(?:-|to)?\s*(?:year|yr|yo\b)/);
  const months = monthMatch ? parseInt(monthMatch[1], 10) : null;
  const years = yearMatch ? parseInt(yearMatch[1], 10) : null;
  const totalMonths = months != null ? months : years != null ? years * 12 : null;

  if (totalMonths != null) {
    if (totalMonths <= 3) bands.add("0-3 months");
    else if (totalMonths <= 6) bands.add("4-6 months");
    else if (totalMonths <= 9) bands.add("7-9 months");
    else if (totalMonths <= 12) bands.add("10-12 months");
    else if (totalMonths <= 18) bands.add("13-18 months");
    else if (totalMonths <= 24) bands.add("19-24 months");
    else if (totalMonths <= 36) bands.add("25-36 months");
    else bands.add("3-5 years");
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

/**
 * Return the top-k most relevant knowledge cards for a question.
 * @param {string} question
 * @param {number} k
 * @returns {Array<{card: object, score: number}>}
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
    scored.push({ card, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
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
      : card.source?.label || "Growing Minds knowledge base";
    return `[${i + 1}] ${card.title}\nSource: ${src}\n${card.text}`;
  });
  return blocks.join("\n\n");
}
