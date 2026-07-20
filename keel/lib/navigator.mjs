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
    if (q.recheck && a === q.recheck.on && effectiveMonths < q.recheck.age_lt) {
      notes.push({ question_id: q.id, note: q.recheck.note });
    }
  });

  var cls = "typical_range";
  flags.forEach(function (f) {
    if (!classAtLeast(cls, f.class)) cls = f.class;
  });

  return { class: cls, flags: flags, notes: notes };
}

/* Full result for the page: terminal copy + invitation where required. */
export function resolve(trees, domainKey, ageMonths, weeksEarly, answers) {
  var domain = trees.domains[domainKey];
  var age = correctedAge(ageMonths, weeksEarly, trees.corrected_age);
  var outcome = classify(domain, age.months, answers);
  var terminal = domain.terminals[outcome.class];
  return {
    domain: domainKey,
    class: outcome.class,
    flags: outcome.flags,
    notes: outcome.notes,
    terminal: terminal,
    invitation: terminal.includes_invitation ? trees.required_copy.parent_gut_invitation : null,
    corrected: age.corrected,
    effective_age_months: age.months
  };
}
