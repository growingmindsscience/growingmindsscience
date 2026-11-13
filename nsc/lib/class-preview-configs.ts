import type { ClassCourseSlug } from "@/lib/classes";
import { FAMILY_MODULE_LESSON_COUNTS, INFANT_MODULE_LESSON_COUNTS, PRESCHOOL_MODULE_LESSON_COUNTS, TODDLER_MODULE_LESSON_COUNTS } from "@/lib/classes";
import { FAMILY_ENROLL_PATH, INFANT_ENROLL_PATH, PRESCHOOL_ENROLL_PATH, TODDLER_ENROLL_PATH } from "@/lib/class-paths";
import type { ClassPreviewConfig } from "@/components/class-preview-page";

/** The free lesson page for each class: the copy that differs, and where enrolling leads. */
export const CLASS_PREVIEW_CONFIGS: Record<ClassCourseSlug, ClassPreviewConfig> = {
  infant: {
    courseSlug: "infant",
    moduleLessonCounts: INFANT_MODULE_LESSON_COUNTS,
    enrollPath: INFANT_ENROLL_PATH,
    span: "the first year",
    modulesSentence: "the newborn brain, reading your baby\u2019s cues, attachment, and language, movement, and play.",
    leadIns: {
      "serve-and-return":
        "You are joining at lesson 3, which is why it opens with \u201cwelcome back.\u201d Lessons 1 and 2 showed that babies arrive built to connect with the people around them, and that the brain wires itself from ordinary family life; this lesson names the pattern inside that everyday life.",
    },
  },
  toddlerhood: {
    courseSlug: "toddlerhood",
    moduleLessonCounts: TODDLER_MODULE_LESSON_COUNTS,
    enrollPath: TODDLER_ENROLL_PATH,
    span: "ages one to three",
    modulesSentence: "the toddler brain, everyday language, autonomy and \u201cno,\u201d and big feelings, transitions, and repair.",
    leadIns: {
      "inside-a-tantrum":
        "You are joining at lesson 10, the start of Module 4. It leans on one idea from Module 1: in a toddler, the alarm that sets off big feelings is fast, and the brakes that calm it are still slow to develop. When it mentions earlier lessons, that is the thread they share.",
    },
  },
  preschool: {
    courseSlug: "preschool",
    moduleLessonCounts: PRESCHOOL_MODULE_LESSON_COUNTS,
    enrollPath: PRESCHOOL_ENROLL_PATH,
    span: "ages three to five",
    modulesSentence: "how preschoolers think, play as their work, friends and feelings, and getting ready for school.",
    leadIns: {
      "sharing-fairness-and-helping":
        "You are joining at lesson 10, the second lesson in Module 3, on friends and feelings. It mentions earlier lessons in passing, but it stands on its own.",
    },
  },
  family: {
    courseSlug: "family",
    moduleLessonCounts: FAMILY_MODULE_LESSON_COUNTS,
    enrollPath: FAMILY_ENROLL_PATH,
    span: "the whole family, at any age",
    modulesSentence: "the family as a system, the adults, siblings, and stress, work, and recovery.",
    leadIns: {
      "when-parents-argue":
        "You are joining at lesson 4, the start of Module 2. Module 1 looked at the family as a system, where stress passes from one person to the next; this module turns to the adults at its center.",
    },
  },
};
