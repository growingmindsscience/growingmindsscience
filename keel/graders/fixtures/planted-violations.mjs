/* Ten planted violations: each takes the real artifacts and makes them
   deliberately softer than a floor (or breaks a policy floor). The grader is
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
];
