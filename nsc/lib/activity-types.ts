/** Activity Library shared types (plan 2.1). Used by the grader, the admin
 * review queue, and the public browse/detail UI. */

export const ACTIVITY_DOMAINS = [
  "language",
  "fine_motor",
  "gross_motor",
  "cognitive",
  "social_emotional",
  "sensory",
] as const;
export type ActivityDomain = (typeof ACTIVITY_DOMAINS)[number];

export const ACTIVITY_SETTINGS = ["indoor", "outdoor", "on_the_go"] as const;
export type ActivitySetting = (typeof ACTIVITY_SETTINGS)[number];

/** Age bands for browse/filter labels; storage is integer months. */
export const ACTIVITY_BANDS = [
  { label: "0–6 months", slug: "0-6m", min: 0, max: 6 },
  { label: "6–12 months", slug: "6-12m", min: 6, max: 12 },
  { label: "12–18 months", slug: "12-18m", min: 12, max: 18 },
  { label: "18–24 months", slug: "18-24m", min: 18, max: 24 },
  { label: "24–30 months", slug: "24-30m", min: 24, max: 30 },
  { label: "30–36 months", slug: "30-36m", min: 30, max: 36 },
] as const;

export interface ActivityMaterial {
  item: string;
  household_common: boolean;
  /** Required when household_common is false — why it's worth the ask. */
  note?: string;
}

export interface ActivityDraft {
  slug: string;
  title: string;
  months_min: number;
  months_max: number;
  themes: string[];
  domains: ActivityDomain[];
  intention: string;
  mechanism_tags: string[];
  materials: ActivityMaterial[];
  steps: string[];
  adapt_down: string;
  adapt_up: string;
  evidence_note: string;
  duration_min: number;
  mess_level: number;
  setting: ActivitySetting[];
  safety_notes: string;
  is_free?: boolean;
}

export interface ActivityRow extends ActivityDraft {
  id: string;
  locale: string;
  status: "draft" | "published" | "retired";
  version: number;
  published_at: string;
}
