/* Planted violations: each takes the real artifacts and makes them
   deliberately softer than a floor (or breaks a policy floor or an integrity
   rule). The first ten are the original certification set; the rest were
   added 2026-11-02 with the Snapshot's hearing and intelligibility floors and
   the stricter integrity checks. The grader is
   certified only if it catches every one of these AND passes the real
   artifacts. See the certification requirement in floors.contract.ts. */

export const FIXTURES = [
  {
    name: "lmc_soften_no_words_16m",
    description: "no_words_16m rule downgraded from discuss to watch",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.find((r) => r.id === "no_words_16m").severity = "watch";
      return c;
    },
  },
  {
    name: "lmc_late_talker_requires_both",
    description: "late_talker_24m OR condition tightened to AND (softer: both required)",
    apply(a) {
      const c = structuredClone(a);
      const r = c.interpretation.rules.find((r) => r.id === "late_talker_24m");
      r.condition = { all: r.condition.any };
      return c;
    },
  },
  {
    name: "lmc_skill_loss_downgrade",
    description: "skill loss compiled to discuss instead of priority_discuss",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.find((r) => r.id === "skill_loss_any_age").severity = "discuss";
      return c;
    },
  },
  {
    name: "lmc_delayed_window",
    description: "no_words_16m rule window shifted to start at 20 months",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.find((r) => r.id === "no_words_16m").age_months_gte = 20;
      return c;
    },
  },
  {
    name: "lmc_dropped_invitation",
    description: "typical-range template loses the standing parent-gut invitation",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.severity_templates.none.includes_invitation = false;
      return c;
    },
  },
  {
    name: "lmc_bilingual_softening",
    description: "guidance copy tells bilingual families to wait",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.guidance_blocks.bilingual_note.body +=
        " Because your child is learning two languages, it is normal to wait longer before worrying about these lines.";
      return c;
    },
  },
  {
    name: "nav_missing_binding",
    description: "talking tree drops its combines_words binding",
    apply(a) {
      const c = structuredClone(a);
      delete c.trees.domains.talking.bindings.combines_words;
      return c;
    },
  },
  {
    name: "nav_hearing_downgrade",
    description: "no response to loud sounds routes to discuss instead of priority_discuss",
    apply(a) {
      const c = structuredClone(a);
      const q = c.trees.domains.hearing_responding.questions.find((q) => q.id === "hr_loud");
      q.flags[0].class = "discuss";
      return c;
    },
  },
  {
    name: "nav_skill_loss_unwired",
    description: "play domain's skill-loss answer no longer flags anything",
    apply(a) {
      const c = structuredClone(a);
      c.trees.domains.play.questions.find((q) => q.id === "pl_skill_loss").flags = [];
      return c;
    },
  },
  {
    name: "nav_asymmetry_downgrade",
    description: "movement asymmetry routes to discuss instead of priority_discuss",
    apply(a) {
      const c = structuredClone(a);
      const q = c.trees.domains.walking_movement.questions.find((q) => q.id === "wm_asym");
      q.flags[0].class = "discuss";
      return c;
    },
  },
  {
    name: "lmc_hearing_concern_unwired",
    description: "a parent's hearing concern no longer flags anything in the Snapshot",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules = c.interpretation.rules.filter((r) => r.id !== "hearing_concern_any_age");
      return c;
    },
  },
  {
    name: "lmc_soften_stranger_intelligibility",
    description: "a 3-year-old whom unfamiliar adults mostly cannot understand drops to watch",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.find((r) => r.id === "stranger_intelligibility_36m").severity = "watch";
      return c;
    },
  },
  {
    name: "lmc_understands_unused",
    description: "the 'how many words does your child understand' answer is collected but no rule reads it",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules = c.interpretation.rules.filter((r) => !JSON.stringify(r.condition).includes("vocab_understands"));
      return c;
    },
  },
  {
    name: "lmc_misspelled_answer_value",
    description: "a rule tests an answer value the instrument can never produce, so it silently never fires",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.find((r) => r.id === "watch_turns_6m").condition.all[0].value = "notyet";
      return c;
    },
  },
  {
    name: "lmc_curly_quote_bilingual_softening",
    description: "a bilingual softening frame hidden behind a typographic apostrophe",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.guidance_blocks.bilingual_note.body +=
        " Because your child is bilingual, don\u2019t worry about these lines yet.";
      return c;
    },
  },
  {
    name: "lmc_grid_unsound_positive_condition",
    description: "a rule needs a typical answer on an item the floors grid never varies",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.rules.push({
        id: "planted_needs_babble", age_months_gte: 30,
        condition: { all: [{ behavior: "babbles_consonants", op: "eq", value: "yes" }] },
        severity: "watch", tags: [], title: "x", body: "x", sources: ["cdc_ltsae"],
      });
      return c;
    },
  },
  {
    name: "lmc_unresolved_guidance_source",
    description: "the visit script cites a source id that is not in floor_sources",
    apply(a) {
      const c = structuredClone(a);
      c.interpretation.guidance_blocks.visit_script.sources = ["made_up_source"];
      return c;
    },
  },
];
