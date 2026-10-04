export const TODDLER_COURSE = {
  slug: "toddlerhood",
  title: "Toddler years: language, autonomy, and big feelings",
  shortTitle: "Toddler years",
  scope: "class:toddlerhood",
  product: "class_bundle_toddlerhood",
  priceDisplay: "$49",
  ages: "Ages 1 to 3",
  blurb: "Five modules of developmental science and practical guidance for everyday family life.",
  detailsPath: "/classes/toddlerhood.html",
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
  product: "class_infant",
  priceDisplay: "$49",
  ages: "Birth to 12 months",
  blurb: "Four modules on the first year of development and everyday connection.",
  detailsPath: "/classes/birth-to-12-months.html",
  modules: [
    "The Newborn Brain",
    "Reading Your Baby's Cues",
    "Attachment in the First Year",
    "The Explorer: Language, Movement, and Play",
  ],
} as const;

export const CLASS_COURSES = {
  toddlerhood: TODDLER_COURSE,
  infant: INFANT_COURSE,
} as const;

export type ClassCourseSlug = keyof typeof CLASS_COURSES;

export function courseForProduct(product: string | undefined) {
  return Object.values(CLASS_COURSES).find((course) => course.product === product);
}

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

/** Published lessons each infant module must have before sales open. */
export const INFANT_MODULE_LESSON_COUNTS = [5, 4, 3, 4] as const;

export type SalesGate = { open: true } | { open: false; reason: string };

/**
 * Whether infant enrollment is open, and if not, which condition failed.
 * Pure so it can be tested; `reason` is written to server logs, so it
 * describes each value (set or not, length) and never includes the value.
 */
export function infantSalesGate(input: {
  salesFlag: string | undefined;
  vercelEnv: string | undefined;
  previewUserId: string | undefined;
  /** One account allowed to buy before sales open, for a live test purchase. */
  testUserId?: string | undefined;
  userId: string | undefined;
  /** Published lesson count per module, module 1 first. */
  moduleCounts: number[];
}): SalesGate {
  // Env values pasted into a dashboard or piped from a shell often carry a
  // trailing newline or space; compare the trimmed value.
  const flag = input.salesFlag?.trim().toLowerCase();
  const viewerId = input.userId?.trim().toLowerCase();
  const tester = input.testUserId?.trim().toLowerCase();
  const isTester = Boolean(tester) && viewerId === tester;
  if (flag !== "1" && flag !== "true" && !isTester) {
    return {
      open: false,
      reason: (input.salesFlag === undefined
        ? "INFANT_CLASS_SALES_ENABLED is not set for this deployment"
        : `INFANT_CLASS_SALES_ENABLED is set but is not "1" (length ${input.salesFlag.length})`) +
        (tester ? "; the signed-in user is not INFANT_CLASS_TEST_USER_ID" : "; INFANT_CLASS_TEST_USER_ID is not set"),
    };
  }
  if (input.vercelEnv === "preview") {
    const allowed = input.previewUserId?.trim().toLowerCase();
    if (!allowed) {
      return { open: false, reason: "preview deployment and INFANT_CLASS_PREVIEW_USER_ID is not set" };
    }
    const viewer = viewerId;
    if (!viewer) {
      return { open: false, reason: "preview deployment and no signed-in user id was passed" };
    }
    if (viewer !== allowed) {
      return {
        open: false,
        reason: "preview deployment and the signed-in user is not INFANT_CLASS_PREVIEW_USER_ID " +
          `(configured length ${allowed.length}, a user id is ${viewer.length} characters)`,
      };
    }
  }
  const short = INFANT_MODULE_LESSON_COUNTS
    .map((need, index) => ({ module: index + 1, need, have: input.moduleCounts[index] ?? 0 }))
    .filter((row) => row.have !== row.need);
  if (short.length) {
    return {
      open: false,
      reason: "published lesson counts do not match: " +
        short.map((row) => `module ${row.module} has ${row.have}, needs ${row.need}`).join("; "),
    };
  }
  return { open: true };
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
  amountTotal: number | null;
  product: string | undefined;
  ownerId: string | null;
  metadataOwnerId: string | undefined;
  lineItems: { priceId: string | undefined; quantity: number | null }[];
  expectedPriceId: string;
  expectedProduct: string;
}): boolean {
  return input.mode === "payment" &&
    (input.paymentStatus === "paid" ||
      (input.paymentStatus === "no_payment_required" && input.amountTotal === 0)) &&
    input.product === input.expectedProduct &&
    Boolean(input.ownerId) && input.ownerId === input.metadataOwnerId &&
    Boolean(input.expectedPriceId) &&
    input.lineItems.length === 1 &&
    input.lineItems[0].priceId === input.expectedPriceId &&
    input.lineItems[0].quantity === 1;
}

/**
 * A lesson transcript as readable paragraphs. Transcripts come from caption
 * files, so they arrive as short lines broken mid-sentence with no paragraph
 * breaks. Blank lines, when an author has added them, are kept as the
 * paragraph breaks; otherwise the text is reflowed and grouped a few
 * sentences at a time.
 */
export function transcriptParagraphs(transcript: string | null | undefined): string[] {
  const text = (transcript ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  const unwrap = (block: string) => block.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  if (/\n[ \t]*\n/.test(text)) {
    return text.split(/\n[ \t]*\n+/).map(unwrap).filter(Boolean);
  }
  const sentences = unwrap(text).split(/(?<=[.?!]["\u201d\u2019)]?)\s+(?=["\u201c\u2018(]?[A-Z])/);
  const paragraphs: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    current.push(sentence);
    length += sentence.length;
    if (current.length >= 4 || length >= 420) {
      paragraphs.push(current.join(" "));
      current = [];
      length = 0;
    }
  }
  if (current.length) paragraphs.push(current.join(" "));
  return paragraphs;
}
