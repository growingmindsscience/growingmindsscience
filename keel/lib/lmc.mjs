/* Communication Snapshot engine.
   Pure, deterministic, dependency-free ES module shared verbatim by the
   browser page (tools/communication-snapshot.html) and the CI floors grader
   (keel/graders/floors.mjs). Anything this module decides is therefore
   exactly what CI certified. */

export const SEVERITY_ORDER = ["none", "watch", "discuss", "priority_discuss"];

export function severityAtLeast(a, b) {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b);
}

/* Corrected age: applies when born more than `weeks_early_gt` weeks early and
   chronological age is under `applies_under_months`. One month = 4.345 weeks. */
export function correctedAge(ageMonths, weeksEarly, policy) {
  var p = policy || { weeks_early_gt: 3, applies_under_months: 24 };
  var w = Number(weeksEarly) || 0;
  if (w > p.weeks_early_gt && ageMonths < p.applies_under_months) {
    return { months: Math.max(0, ageMonths - w / 4.345), corrected: true };
  }
  return { months: ageMonths, corrected: false };
}

function cmp(op, actual, value) {
  switch (op) {
    case "eq": return actual === value;
    case "lt": return typeof actual === "number" && actual < value;
    case "lte": return typeof actual === "number" && actual <= value;
    case "gt": return typeof actual === "number" && actual > value;
    case "gte": return typeof actual === "number" && actual >= value;
    default: return false;
  }
}

/* Condition language shared with floors.v1.json. A missing answer never
   matches anything; "sometimes" only matches an explicit eq "sometimes". */
export function evalCondition(cond, snapshot) {
  if (!cond) return false;
  if (cond.all) return cond.all.every(function (c) { return evalCondition(c, snapshot); });
  if (cond.any) return cond.any.some(function (c) { return evalCondition(c, snapshot); });
  if (cond.behavior) {
    var v = snapshot.behaviors ? snapshot.behaviors[cond.behavior] : null;
    if (v == null) return false;
    return cmp(cond.op, v, cond.value);
  }
  if (cond.metric) {
    var m = snapshot[cond.metric];
    if (m == null || isNaN(m)) return false;
    return cmp(cond.op, Number(m), cond.value);
  }
  return false;
}

/* snapshot = { age_months, weeks_early, vocab_says, vocab_understands,
                behaviors: { id: "yes" | "sometimes" | "not_yet" | "no" } } */
export function compile(snapshot, interpretation) {
  var age = correctedAge(snapshot.age_months, snapshot.weeks_early, interpretation.corrected_age);
  var m = age.months;

  var matched = [];
  for (var i = 0; i < interpretation.rules.length; i++) {
    var r = interpretation.rules[i];
    if (m < r.age_months_gte) continue;
    if (r.age_months_lt != null && m >= r.age_months_lt) continue;
    if (evalCondition(r.condition, snapshot)) matched.push(r);
  }

  var severity = "none";
  matched.forEach(function (r) {
    if (!severityAtLeast(severity, r.severity)) severity = r.severity;
  });

  /* The report shows only the flags that carry the outcome: at 'discuss' and
     above, watch-tier matches on the same ground are still listed (they are
     real observations) but the severity is the max. */
  var tags = {};
  matched.forEach(function (r) { (r.tags || []).forEach(function (t) { tags[t] = true; }); });

  var guidance = [];
  var blocks = interpretation.guidance_blocks || {};
  Object.keys(blocks).forEach(function (key) {
    var b = blocks[key];
    var include = false;
    if (b.always) include = true;
    if (b.when_tags && b.when_tags.some(function (t) { return tags[t]; })) include = true;
    if (b.min_severity && severityAtLeast(severity, b.min_severity)) include = true;
    if (b.exact_severity && severity === b.exact_severity) include = true;
    if (b.when_corrected && age.corrected) include = true;
    if (include) guidance.push({ key: key, title: b.title, body: b.body });
  });

  var template = interpretation.severity_templates[severity];
  var invitation = template && template.includes_invitation
    ? interpretation.required_copy.parent_gut_invitation
    : null;

  return {
    severity: severity,
    flags: matched,
    guidance: guidance,
    template: template,
    invitation: invitation,
    corrected: age.corrected,
    effective_age_months: m
  };
}

/* Which instrument items apply at this (corrected) age. */
export function askedItems(instrument, effectiveMonths) {
  var out = { vocab_says: false, vocab_understands: false, behaviors: [] };
  out.vocab_says = effectiveMonths >= instrument.vocab.vocab_says.asked_from_months;
  out.vocab_understands = effectiveMonths >= instrument.vocab.vocab_understands.asked_from_months;
  out.behaviors = instrument.behaviors.filter(function (b) {
    if (effectiveMonths < b.asked_from_months) return false;
    if (b.asked_until_months != null && effectiveMonths >= b.asked_until_months) return false;
    return true;
  });
  return out;
}
