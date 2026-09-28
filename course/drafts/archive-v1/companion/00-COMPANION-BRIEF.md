# Companion assets: governing brief

Status: DRAFT. Not published, not merged.
Branch: `course/first-year-2026-07-19`.

These assets surround the six drafted modules: worksheets, an onboarding email
sequence, quizzes, and a landing page. Everything in
`00-STYLE-AND-EVIDENCE-BRIEF.md` still applies. This file adds what is specific
to companion material.

## The one rule that matters most

**Companion assets may not make a claim the module text does not already
support.** This is the failure mode for surround material: a worksheet compresses
a careful paragraph into a confident bullet, an email needs a hook, a landing
page needs a promise, and the nuance that took a verification pass to establish
gets flattened back out.

If you find yourself wanting a stronger claim than the module makes, the answer
is a better sentence, not a bigger claim. If you genuinely cannot write the
asset without going beyond the modules, stop and flag it with
`> **SCOPE FLAG:**` rather than writing it.

## Protected corrections: do not reintroduce these

A verification pass on 2026-07-19 corrected seven specific errors. Companion
material is the most likely place for them to creep back, because each one is
the punchier version of the truth. Do not restore any of them.

| Do NOT write | Because |
| --- | --- |
| "Crying peaks at six weeks" as a fact | Wolke et al. (2017) found **no statistical evidence for a universal peak**. Say: crying is high in the early weeks and declines by around three months. The decline is the solid finding. |
| "Babies cry about two hours a day" without qualification | The figure is **fussing and crying combined**, roughly 117 min/24h at 1 to 2 weeks and about 68 min by 10 to 12 weeks. Always label it fuss-plus-cry, or the number reads as double what a parent means by crying. |
| "15 to 20 percent of babies are high-reactive" | Not a reported population rate. Ran 11 to 20 percent across cohorts, and it is a threshold on a continuous distribution. |
| "Introduce allergens early to prevent allergies" | LEAP tested **peanut only**, in **high-risk infants only** (severe eczema, egg allergy, or both). Egg trials are mixed. Do not generalize. |
| "One in seven mothers get postpartum depression" | Conflates two denominators. Use the postpartum frame: about one in eight women with a recent live birth report postpartum depressive symptoms (CDC PRAMS, 13.2%). |
| "Sleep training is proven safe" | Gradisar et al. had ~14 infants per arm. It is *no adverse effects detected*, not demonstrated safety. Also: the maternal mood benefit in the Hiscock and Wake cohort did **not** persist to child age 6. |
| "Newborns imitate you" (or "newborn imitation was debunked") | Contested in **both** directions. Oostenbroek et al. (2016) found no evidence; a re-analysis disputed that; Davis et al. (2021) found a pooled effect whose heterogeneity tracks researcher affiliation. Assert neither. |

Also still banned from the original brief: the 30-million-word gap, the
marshmallow test as destiny, Hamlin helper/hinderer as innate morality, the
infant Mozart effect, baby sign as a speech accelerator, and educational baby
videos as a teaching medium.

## Voice, restated for surround material

1. **No em dashes anywhere.** Zero. Grep-verified before commit.
2. **Calm over urgency.** This is the site's stated principle and it governs the
   marketing assets hardest. No countdown pressure, no "spots running out," no
   "don't miss the window," no fear-of-falling-behind framing. The site's design
   system explicitly rejects "is your child behind?" deficit framing. So does
   this course.
3. **No condescension.** No "mama," no baby-talk register aimed at the parent.
4. **The reader is tired.** Short paragraphs. The most useful sentence first.
5. **Confidence-building, not gotcha.** Especially in quizzes. A parent should
   finish feeling more capable, not caught out.
6. **Pronouns.** "Your baby" and "they." Never assume household structure, birth
   parent, or feeding method.

## Voice, for the landing page specifically

The site's design system describes the voice as "a knowledgeable friend who
happens to be a developmental scientist, reassurance and competence in equal
measure. A tired, skeptical parent should arrive and exhale."

It explicitly rejects two registers: generic SaaS launch page (no gradient hero,
no hero-metric template, no endless identical icon-card grids), and clinical or
medical (no sterile hospital-blue, no deficit framing).

The differentiator worth selling is honesty, not novelty. This course tells
parents which popular claims do not hold up and why. That is the actual product
distinction and it is more compelling than any urgency hook, because every
competitor promises confidence and none of them promises to tell you when the
science is thin.

## Design tokens for the landing page

Pull from the repo's `DESIGN.md` (the Tidepool system). Key values:

- Ground: mist `#F0F5F3` (cool aqua, never cream). Surface `#FFFFFF`.
  Bands: sea-glass `#CFE3DE`, pine `#15393C`, pine-deep `#0E2A2D`.
- Text: pine `#15393C`, ink-soft `#3D5A5A`, ink-muted `#4E6564` (meta only).
  On pine: on-dark `#EDF4F1`, on-dark-soft `#BCD2CC`, on-dark-muted `#8BA59F`.
- Action: teal `#1E5F62`, hover teal-soft `#2E7A77`.
- Accent: coral `#DE7356` for decor and large display only.
  **coral-deep `#9C4429` for coral text on light grounds.**
  **coral-on-dark `#E78D6F` for small coral text on pine.**
- Lines: `#D4E0DC`, `#E2EAE7`.
- Type: Bricolage Grotesque 600, tight (-0.015em), for display and headings.
  Source Serif 4, 400, 1.0625rem, 1.65 line-height, for body. Prose max-width
  60ch.
- Eyebrow: Bricolage, 0.75rem, 600, uppercase, 0.18em tracking.
- Radii: xs 4, sm 8, control 10, md 14, card 16, lg 20, pill 999.
- Buttons: pill, min-height 48px, teal ground with white text.

**Named rules to honor:** the One-Coral Rule (coral punctuates, never carries),
the Coral-Size Rule (match coral to its background per above), the Cool-Ground
Rule (never a warm/cream background), and the Signature-Phrase Rule (the coral
serif-italic `.hl` inside a grotesque headline is the one flourish, used on at
most one or two headlines).

Landing page must support light and dark, be responsive, and honor
`prefers-reduced-motion`.

## Asset inventory

| File | What it is |
| --- | --- |
| `worksheet-module-N-*.md` | One printable-style worksheet per module, aligned to that module's five "Try this week" activities. |
| `email-sequence-onboarding.md` | 12 emails, warm, evidence-grounded, sequenced across the course. |
| `quizzes.md` | Six short parent-facing quizzes, one per module. |
| `landing-page.html` | Course landing page draft, Tidepool system, self-contained. |

## What "printable-style" means here

These are markdown drafts, not final print artifacts. Write them so a designer
could set them on one or two pages: clear field labels, obvious write-in space
marked with underscores or bracketed blanks, no dependence on color to carry
meaning, and no instruction that requires a screen. Each worksheet stands alone,
because a parent will print one and lose the others.
