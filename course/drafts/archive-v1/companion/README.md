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
| `DECISIONS.md` | Every resolved decision (cadence, price, enrollment route, social proof) with its research basis and its honest limits. |
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

## Decisions: all six scope flags are resolved

The six flags raised during drafting were researched and decided on 2026-07-19.
**See `DECISIONS.md` for each decision, its evidence, and the places where the
evidence did not settle the question and a judgment call was made instead.**

In brief:

1. **Email cadence:** 12 teaching emails plus a closing request across 84 days
   (Day 0, 2, 5, 9, 14, 21, 28, 35, 42, 56, 70, 84). Weekly is the cadence with
   trial evidence behind it. The *calm* part is a brand decision, not an
   empirical one, and `DECISIONS.md` says so plainly.
2. **Price and the ask:** $49, matching the toddler class, with $39 early-bird
   for the existing waitlist and a $79 two-course bundle. The sequence is
   post-purchase, so no purchase ask belongs in it at all; the ask lives on the
   landing page.
3. **Enrollment route:** Thinkific, following the toddler-class precedent, not
   the site's Stripe checkout (which is subscription-only). CTAs point at the
   existing waitlist pre-launch.
4. **Social proof:** launch without testimonials, collect via email 13 with
   per-quote consent.
5. **and 6.** The two withheld quiz questions stay withheld. Final.

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
