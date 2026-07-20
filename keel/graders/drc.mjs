/* Dialogic-reading prompt-card grader (portfolio plan 3.6): CROWD
   type-correctness (a Completion card must actually be a completion frame,
   and so on), the no-book-text IP rule, age-band prompt length, and field
   completeness. Deterministic, dependency-free, CI-run. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadCards() {
  return JSON.parse(readFileSync(join(HERE, "..", "artifacts", "drc", "prompt-cards.v1.json"), "utf8"));
}

/* Type-correctness frames. A card must match its own type's marker. */
const TYPE_MARKERS = {
  completion: /\.\.\./,
  recall: /\b(happened|which .*first|was hiding|where did|favorite thing|at the start)\b/i,
  open_ended: /\b(tell me|what's happening|what do you see|what's going on|happens next)\b/i,
  wh: /^(who|what|where|when|why|how)\b/i,
  distancing: /\b(have you ever|like when we|just like you|at your house|your own|remind you|would you do|you wear|we (saw|went))\b/i,
};

/* IP rule: no proper-noun runs (book titles, character names). Two or more
   consecutive Capitalized words anywhere but sentence start is the tell. */
const TITLE_RUN = /(?<![.!?]\s)(?<!^)\b[A-Z][a-z]+ [A-Z][a-z]+/;
const KNOWN_TITLE_WORDS = /\b(goodnight moon|hungry caterpillar|brown bear|wild things|corduroy|madeline|dr\.? seuss|peppa|bluey|elmo)\b/i;

const MAX_WORDS = { "18-24": 12, "24-36": 18, "36-60": 20 };

export function gradeDrc(artifact) {
  const a = artifact || loadCards();
  const rep = { pass: true, violations: [], coverage: { cases_evaluated: 0, floors_exercised: [] } };
  const fail = (id, where, produced, required) => {
    rep.pass = false;
    rep.violations.push({ floor_id: id, case_or_path: where, produced, required });
  };

  const types = new Set(Object.keys(a.crowd));
  const bookTypes = new Set(Object.keys(a.book_types));
  const bands = new Set(a.age_bands);
  const ids = new Set();

  for (const card of a.cards) {
    rep.coverage.cases_evaluated++;
    const where = `card:${card.id || "?"}`;

    for (const f of ["id", "crowd_type", "book_type", "age_band", "prompt_text", "follow_up"]) {
      if (!card[f] || !String(card[f]).trim()) fail("required_fields", where, `missing ${f}`, "all fields present");
    }
    if (ids.has(card.id)) fail("unique_id", where, "duplicate id", "unique ids");
    ids.add(card.id);

    if (!types.has(card.crowd_type)) fail("crowd_enum", where, card.crowd_type, [...types].join("|"));
    if (!bookTypes.has(card.book_type)) fail("book_type_enum", where, card.book_type, [...bookTypes].join("|"));
    if (!bands.has(card.age_band)) fail("band_enum", where, card.age_band, [...bands].join("|"));

    const marker = TYPE_MARKERS[card.crowd_type];
    if (marker && !marker.test(card.prompt_text || "")) {
      fail("crowd_type_correctness", where, card.prompt_text, `matches ${card.crowd_type} frame`);
    }

    const both = `${card.prompt_text} ${card.follow_up}`;
    if (KNOWN_TITLE_WORDS.test(both) || TITLE_RUN.test(card.prompt_text || "")) {
      fail("no_book_text", where, card.prompt_text, "no titles, character names, or quoted book text");
    }

    const words = (card.prompt_text.match(/\S+/g) || []).length;
    const cap = MAX_WORDS[card.age_band] || 20;
    if (words > cap) fail("band_prompt_length", where, `${words} words`, `<= ${cap} for ${card.age_band}`);
  }

  /* Coverage: every CROWD type appears in every band except completion/wh at
     36-60 optional... simpler contract: every type has >= 5 cards and every
     band has >= 10 cards. */
  for (const t of types) {
    const n = a.cards.filter((c) => c.crowd_type === t).length;
    rep.coverage.cases_evaluated++;
    if (n < 5) fail("type_coverage", t, `${n} cards`, ">= 5 per CROWD type");
  }
  for (const b of bands) {
    const n = a.cards.filter((c) => c.age_band === b).length;
    rep.coverage.cases_evaluated++;
    if (n < 10) fail("band_coverage", b, `${n} cards`, ">= 10 per age band");
  }
  return rep;
}

export const DRC_FIXTURES = [
  {
    name: "drc_completion_without_blank",
    description: "a Completion card with no ellipsis blank",
    apply(a) {
      const c = structuredClone(a);
      c.cards.find((x) => x.crowd_type === "completion").prompt_text = "The cow says moo, right?";
      return c;
    },
  },
  {
    name: "drc_quoted_book_title",
    description: "a card that names a famous book",
    apply(a) {
      const c = structuredClone(a);
      c.cards[10].follow_up += " Works beautifully with Goodnight Moon.";
      return c;
    },
  },
  {
    name: "drc_overlong_toddler_prompt",
    description: "an 18-24m card with a prompt far past the band's length cap",
    apply(a) {
      const c = structuredClone(a);
      const card = c.cards.find((x) => x.age_band === "18-24" && x.crowd_type === "wh");
      card.prompt_text = "What in this whole entire picture is the very small duck doing right now under the bridge with the boat?";
      return c;
    },
  },
  {
    name: "drc_unknown_crowd_type",
    description: "a card with a type outside the CROWD taxonomy",
    apply(a) {
      const c = structuredClone(a);
      c.cards[3].crowd_type = "quiz";
      return c;
    },
  },
];
