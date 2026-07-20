# Companion assets

**Status: DRAFT. Not published. Not merged. Nothing here is wired into the site.**

Branch: `course/first-year-2026-07-19`
Drafted: 2026-07-19

The surround for the six-module first-year course in `../`. Worksheets, an
onboarding email sequence, quizzes, and a landing page draft.

## Files

| File | What it is |
| --- | --- |
| `00-COMPANION-BRIEF.md` | The governing brief. Contains the protected-corrections table that every asset here was written against. |
| `worksheet-module-1-what-is-being-built.md` | Worksheet, aligned to Module 1's five activities. |
| `worksheet-module-2-reading-your-baby.md` | Worksheet, Module 2. |
| `worksheet-module-3-language-ready-baby.md` | Worksheet, Module 3. |
| `worksheet-module-4-connection-and-security.md` | Worksheet, Module 4. |
| `worksheet-module-5-bodies-in-motion.md` | Worksheet, Module 5. |
| `worksheet-module-6-everyday-life.md` | Worksheet, Module 6. |
| `email-sequence-onboarding.md` | 12-email onboarding sequence. |
| `quizzes.md` | Six parent-facing quizzes, one per module. |
| `landing-page.html` | Course landing page draft, Tidepool design system. |

## The risk this folder carries

Companion material is where careful claims get flattened. A worksheet compresses
a paragraph into a bullet. An email needs a hook. A landing page needs a promise.
A quiz needs a clean right answer. Every one of those pressures pushes toward the
punchier, wronger version of a claim.

The course went through a citation verification pass on 2026-07-19 that corrected
seven specific errors. Those corrections are listed in `00-COMPANION-BRIEF.md` as
a binding table, and every asset here was written against it. **If you edit
anything in this folder, read that table first**, because in each case the wrong
version is the more marketable one.

The corrections most likely to be undone by a well-meaning edit:

- The six-week crying peak, which the largest meta-analysis does not support.
- The daily crying figure, which is fussing and crying combined, not crying.
- "Sleep training is safe," which overstates a trial with roughly 14 infants per arm.
- Early allergen introduction generalized beyond peanut and beyond high-risk infants.

## Open decisions for a human (the scope flags)

Six flags were raised. Find them with `grep -rn "SCOPE FLAG" .`. None of them is
a defect; each is a place where an asset would have had to invent something, and
stopped instead.

**Commercial decisions, which are yours and not a drafting question:**

1. **Email cadence is invented.** The "Send: Day N" timings are a proposed
   rhythm. Nothing in the course specifies a release schedule, so these need
   resetting against the real one.
2. **The email sequence does no commercial work.** No price, no deadline, no
   upsell, no referral ask. That follows directly from the calm-over-urgency
   rule, which removes the usual conversion levers. Whether an onboarding
   sequence that never asks for anything is acceptable is a business call.
3. **The landing page has no enrollment destination.** Both CTAs point at
   on-page anchors, because there is no pricing, no enrollment mechanism, and no
   launch date to point them at.
4. **The landing page has an empty social-proof slot**, marked with a comment
   instructing that it not be filled with invented quotes or counts. It needs
   something real or it should be deleted.

**Content decisions:**

5. **No quiz question on tummy time dose.** The hourly target is consensus
   guidance rather than a trial-derived threshold, so any clean correct answer
   would imply precision the evidence does not have.
6. **No quiz question on breastfeeding and cognitive outcomes.** The honest
   answer is that it is unsettled, but every workable distractor set read as a
   verdict on a feeding decision many parents cannot freely make. Judged not
   worth the cost to a tired reader.

One further item, raised by a drafter rather than flagged in a file: in
`quizzes.md`, "the evidence does not settle this" is the correct answer on some
items and an incorrect answer on others. That is deliberate, so the option
cannot be gamed as always-correct, but it should be confirmed it does not read
as a trap.

## Before any of this is used

1. The modules themselves still have an open citation queue and a clinical review
   queue. See `../REVIEW-FLAGS.md`. Companion assets inherit every one of those.
2. Search this folder for `SCOPE FLAG` to find places where an asset wanted a
   claim the modules do not support and stopped instead of writing it.
3. The landing page contains no pricing, no testimonials, no enrollment numbers,
   and no outcome statistics, because inventing them would be fabricating
   marketing claims. Where a slot structurally wants social proof, there is a
   marked HTML comment placeholder for a human to fill with something real.
4. Nothing here has had a human read for voice. The modules are Matthew's
   subject matter; the surround is drafted in his register and needs checking
   against his ear.
