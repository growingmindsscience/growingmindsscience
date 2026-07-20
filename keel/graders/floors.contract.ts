/**
 * Floors grader contract. Deterministic, zero model calls, runs in CI.
 * Certification requirement before first real use: 10 planted-violation fixtures
 * (artifacts deliberately softer than a floor) must all fail, and the current
 * approved artifacts must pass, before this grader gates any merge.
 */

export type Severity = "none" | "watch" | "discuss" | "priority_discuss";
export const SEVERITY_ORDER: Severity[] = ["none", "watch", "discuss", "priority_discuss"];

export type TerminalClass = "typical_range" | "discuss" | "priority_discuss";
export const CLASS_ORDER: TerminalClass[] = ["typical_range", "discuss", "priority_discuss"];

export interface FloorPredicate {
  binding?: string;            // navigator: logical observable bound per-tree
  behavior?: string;           // lmc: behavior item id
  metric?: "vocab_says" | "vocab_understands";
  op?: "eq" | "lt" | "lte" | "gt" | "gte";
  value?: string | number;
  all?: FloorPredicate[];
  any?: FloorPredicate[];
  meta?: "policy";             // policy floors are enforced by lexicon/copy graders, skipped by the case grid
}

export interface Floor {
  id: string;
  applies_age_months_gte: number;
  applies_age_months_lt?: number;   // for inverted floors like early_hand_preference_12m
  predicate?: FloorPredicate;
  condition?: FloorPredicate;       // lmc naming
  min_severity?: Severity;          // lmc
  min_class?: TerminalClass | "policy"; // navigator
  sources: string[];
  rationale: string;
}

/**
 * LMC check: generate the case grid (age buckets x vocab counts sampled at
 * every floor-relevant boundary +/- 1 x full behavior-value combinations for
 * behaviors referenced by any floor; ~50k cases). For every case matching a
 * non-policy floor within its age window, run the interpretation artifact's
 * compiler and assert output severity >= min_severity. Also assert:
 *  - every floor source id resolves in floor_sources
 *  - every behavior/metric id referenced exists in the instrument version under test
 *  - no two floors with the same id disagree across LMC and Navigator files
 */
export declare function checkLmcFloors(
  interpretationArtifact: unknown,
  floors: Floor[],
  instrumentItems: unknown
): GraderReport;

/**
 * Navigator check: each tree declares a bindings map { binding: { node_id, answer_value } }.
 * Grader asserts (1) every floor binding for that domain is declared by the tree,
 * (2) exhaustive path enumeration: any path whose answers satisfy a floor predicate
 * within the age window terminates in class >= min_class, (3) skill_loss floor holds
 * in every domain via the always_asked node, (4) shared floor ids (no_response_to_name_12m,
 * no_pointing_to_show_15m, no_one_step_directions_24m) carry identical thresholds
 * everywhere they appear, cross-file.
 */
export declare function checkNavigatorFloors(
  treeArtifact: unknown,
  domainFloors: Floor[],
  globalFloors: Floor[]
): GraderReport;

export interface GraderReport {
  pass: boolean;
  violations: Array<{
    floor_id: string;
    case_or_path: unknown;
    produced: string;
    required: string;
  }>;
  coverage: { cases_evaluated: number; floors_exercised: string[] };
}

/**
 * Policy floors (meta: "policy") route to the copy/lexicon grader suite instead:
 *  - bilingual_no_discount: interpretation artifact and guidance blocks may not contain
 *    severity-conditional logic keyed on primary_languages length; lexicon scan for
 *    softening frames ("because your child is learning two languages, wait").
 *  - parent_gut_concern_never_dismissed: every typical_range terminal template must
 *    contain the standing-invitation sentence (exact-match on a required copy token).
 */
