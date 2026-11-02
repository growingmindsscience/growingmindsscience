/* Milestone Navigator engine.
   Pure, deterministic, dependency-free ES module shared verbatim by the
   browser page (tools/milestone-navigator.html) and the CI floors grader
   (keel/graders/floors.mjs). The grader exhaustively enumerates every path
   through this exact code, so what CI certified is what parents get. */

export const CLASS_ORDER = ["typical_range", "discuss", "priority_discuss"];

export function classAtLeast(a, b) {
  return CLASS_ORDER.indexOf(a) >= CLASS_ORDER.indexOf(b);
}

export function correctedAge(ageMonths, weeksEarly, policy) {
  var p = policy || { weeks_early_gt: 3, applies_under_months: 24 };
  var w = Number(weeksEarly) || 0;
  if (w > p.weeks_early_gt && ageMonths < p.applies_under_months) {
    return { months: Math.max(0, ageMonths - w / 4.345), corrected: true };
  }
  return { months: ageMonths, corrected: false };
}

/* Questions asked for a domain at a given (corrected) age, in artifact order. */
export function askedQuestions(domain, effectiveMonths) {
  return domain.questions.filter(function (q) {
    if (q.always_asked) return true;
    if (q.asked_from_months != null && effectiveMonths < q.asked_from_months) return false;
    if (q.asked_until_months != null && effectiveMonths >= q.asked_until_months) return false;
    return true;
  });
}

/* answers = { question_id: value }. Unanswered questions trigger nothing.
   Terminal class is the maximum class across triggered flags; recheck notes
   accumulate inside typical_range and never change the class. */
export function classify(domain, effectiveMonths, answers) {
  var flags = [];
  var notes = [];
  askedQuestions(domain, effectiveMonths).forEach(function (q) {
    var a = answers[q.id];
    if (a == null) return;
    (q.flags || []).forEach(function (f) {
      if (a !== f.on) return;
      if (f.age_gte != null && effectiveMonths < f.age_gte) return;
      if (f.age_lt != null && effectiveMonths >= f.age_lt) return;
      flags.push({
        question_id: q.id,
        label: f.label,
        class: f.class,
        floor_id: f.floor_id || null
      });
    });
    /* recheck is one note or a list of notes. Each fires on its answer inside
       its own window [age_gte, age_lt); notes never change the class. */
    [].concat(q.recheck || []).forEach(function (r) {
      if (a !== r.on) return;
      if (r.age_lt != null && effectiveMonths >= r.age_lt) return;
      if (r.age_gte != null && effectiveMonths < r.age_gte) return;
      notes.push({ question_id: q.id, note: r.note });
    });
  });

  var cls = "typical_range";
  flags.forEach(function (f) {
    if (!classAtLeast(cls, f.class)) cls = f.class;
  });

  return { class: cls, flags: flags, notes: notes };
}

/* True when the domain declares the (corrected) age as a thin-coverage band:
   [from, until) ranges where the tree has few or no age-specific questions,
   so a clean result there says less than it would elsewhere. */
export function isThin(domain, effectiveMonths) {
  return (domain.thin_months || []).some(function (b) {
    return effectiveMonths >= b[0] && effectiveMonths < b[1];
  });
}

/* Full result for the page: terminal copy + invitation where required.
   A typical_range outcome inside a thin band uses the domain's
   typical_range_thin copy; the class itself never changes. Every
   typical_range result carries the standing invitation, whichever copy
   it uses. */
export function resolve(trees, domainKey, ageMonths, weeksEarly, answers) {
  var domain = trees.domains[domainKey];
  var age = correctedAge(ageMonths, weeksEarly, trees.corrected_age);
  var outcome = classify(domain, age.months, answers);
  var thin = outcome.class === "typical_range" && isThin(domain, age.months) && !!domain.terminals.typical_range_thin;
  var terminal = thin ? domain.terminals.typical_range_thin : domain.terminals[outcome.class];
  var invite = terminal.includes_invitation || outcome.class === "typical_range";
  return {
    domain: domainKey,
    class: outcome.class,
    thin: thin,
    flags: outcome.flags,
    notes: outcome.notes,
    terminal: terminal,
    invitation: invite ? trees.required_copy.parent_gut_invitation : null,
    sudden_change: outcome.class === "priority_discuss" ? (trees.required_copy.sudden_change || null) : null,
    corrected: age.corrected,
    effective_age_months: age.months
  };
}
