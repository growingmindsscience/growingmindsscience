export const TODDLER_COURSE = {
  slug: "toddlerhood",
  title: "Toddler years: language, autonomy, and big feelings",
  shortTitle: "Toddler years",
  scope: "class:toddlerhood",
  product: "class_bundle_toddlerhood",
  priceDisplay: "$49",
  modules: [
    "The Toddler Brain, Briefly",
    "Language: The Everyday Version",
    "Autonomy and “No”",
    "Big Feelings, Meltdowns, and Repair",
    "Transitions and Routines",
  ],
} as const;

export const INFANT_COURSE = {
  slug: "infant",
  title: "Birth to 12 months: cues, attachment, and the first year",
  shortTitle: "Birth to 12 months",
  scope: "class:infant",
  modules: [
    "The Newborn Brain",
    "Reading Your Baby's Cues",
    "Attachment in the First Year",
    "Sleep: What the Science Actually Says",
    "Language Before Words",
    "Motor and Sensory Development",
  ],
} as const;

export const CLASS_COURSES = {
  toddlerhood: TODDLER_COURSE,
  infant: INFANT_COURSE,
} as const;

export type ClassCourseSlug = keyof typeof CLASS_COURSES;

export function isClassCourseSlug(value: string): value is ClassCourseSlug {
  return Object.prototype.hasOwnProperty.call(CLASS_COURSES, value);
}

export interface ClassLesson {
  id: string;
  course_slug: string;
  module_number: number;
  position: number;
  slug: string;
  title: string;
  summary: string;
  transcript: string;
  mux_upload_id: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
  captions_ready: boolean;
  status: "draft" | "published";
}

export function isCourseSlug(slug: string): slug is typeof TODDLER_COURSE.slug {
  return slug === TODDLER_COURSE.slug;
}

export function lessonPath(slug: string, courseSlug: ClassCourseSlug = TODDLER_COURSE.slug): string {
  return `/app/classes/${courseSlug}/lessons/${slug}`;
}

export interface ClassGrantRow {
  expires_at: string | null;
  source: string;
  source_ref: string;
}

export function ownsToddlerClass(grants: ClassGrantRow[], now: Date): boolean {
  return grants.some((grant) =>
    // A shared code is not evidence that this account bought the class.
    !(grant.source === "comp" && grant.source_ref === "class-access-code") &&
    (grant.expires_at === null || Date.parse(grant.expires_at) > now.getTime())
  );
}

/** Defense in depth before turning a Stripe Checkout Session into access. */
export function validClassPayment(input: {
  mode: string | null;
  paymentStatus: string;
  product: string | undefined;
  ownerId: string | null;
  metadataOwnerId: string | undefined;
  lineItems: { priceId: string | undefined; quantity: number | null }[];
  expectedPriceId: string;
}): boolean {
  return input.mode === "payment" &&
    input.paymentStatus === "paid" &&
    input.product === TODDLER_COURSE.product &&
    Boolean(input.ownerId) && input.ownerId === input.metadataOwnerId &&
    Boolean(input.expectedPriceId) &&
    input.lineItems.length === 1 &&
    input.lineItems[0].priceId === input.expectedPriceId &&
    input.lineItems[0].quantity === 1;
}
