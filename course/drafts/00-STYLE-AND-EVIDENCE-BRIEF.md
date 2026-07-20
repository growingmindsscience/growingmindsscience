# The First Year: style and evidence brief

Status: DRAFT. Not published, not merged, not wired into `knowledge/sources/`.
Branch: `course/first-year-2026-07-19`.

This file governs every module draft in this folder. It exists so six modules
written in parallel read as one course and rest on one evidence standard.

## Who this course is for

A parent or primary caregiver of a baby somewhere in the first twelve months.
They are tired. They are probably reading this on a phone, one-handed, at an
hour they would rather be asleep. They are not stupid, and they are not
fragile. They have almost certainly been told at least three contradictory
things by people who were very confident.

## Voice rules

1. **Warm, not saccharine.** Address the reader as "you." Name the hard parts
   out loud before explaining them.
2. **Evidence-grounded, not lecture-y.** Every scientific claim carries its
   source in the text or in the module's citation list. Say what the study
   actually showed, including sample size or scope when it matters.
3. **Never condescending.** No "mama," no "little one" as a substitute for
   "your baby," no implication the reader needs to be managed. Do not moralize
   about feeding, sleep arrangements, or return-to-work decisions.
4. **No em dashes anywhere.** Use commas, colons, periods, or parentheses.
   This is a house style rule and it is not negotiable.
5. **No pressure framing.** Nothing that implies a window is closing, that a
   missed opportunity is permanent, or that ordinary caregiving is insufficient
   without a technique. This is the single most common failure mode in
   first-year parenting content and it is the one this course refuses.
6. **Pronouns.** Refer to a generic baby as "your baby" or "they." Refer to a
   generic caregiver as "you" or "they." Never assume a two-parent household,
   a gestational parent, or a birth parent.
7. **Variation is the norm, not the exception.** Whenever a timeline appears,
   say plainly that the range is wide and that being outside it is information,
   not a verdict.

## Structure every module follows

```
## Module N · <Title>
<one-paragraph orientation: what this module is for>

### Lesson N.1 · <Title>
<full lesson prose, 900 to 1,600 words>

### Lesson N.2 · <Title>
...

### Try this week
<3 to 5 concrete parent-facing activities, each with: what to do,
 what you are actually looking for, and what it means if nothing happens>

### What this module is not saying
<explicit list of the overclaims this module refuses to make>

### Module summary
<8 to 12 bullet takeaways a tired person can read in ninety seconds>

### Citations
<numbered list, real references only, with a status marker>
```

## Evidence standard (inherited from the repo)

This project already maintains a replication-vetted standard in
`corpus/citations.json` and `marketing/carousels/daily-log.md`. Module drafts
inherit it directly.

**Status markers.** Every citation carries one:

- `[supported]`: replicated, or a large multi-lab or meta-analytic result.
- `[correlational]`: real and useful, but the design cannot establish cause.
- `[contested]`: serious replication trouble or active dispute in the field.
- `[attenuated]`: the effect survives but is much smaller than the popular
  telling.
- `[failed-replication]`: do not use as evidence for anything. Appears only in
  the "what this module is not saying" section.

**Hard bans.** These claims may not be asserted anywhere in this course:

| Claim | Why banned |
| --- | --- |
| Hart & Risley "30 million word gap" | `contested` in the registry. Sperry, Sperry & Miller (2019) failed to replicate. Emphasize interaction quality, never word count. |
| Marshmallow test as destiny | `attenuated` in the registry. Watts, Duncan & Quan (2018) found the predictive effect largely disappears once background is controlled. |
| Hamlin helper/hinderer as innate morality | `failed-replication` in the registry. Lucca et al. (2025), ManyBabies, 1,018 infants. |
| Meltzoff & Moore neonatal imitation | Oostenbroek et al. (2016), 106 infants longitudinal, found no evidence. |
| "Mozart effect" for infants | No supporting evidence in infants. |
| Baby sign language accelerates speech | Kirk et al. (2013) RCT found no advantage. |
| Educational baby videos teach words | DeLoache et al. (2010) found no word learning. |
| "The first three years determine everything" | Overclaim. Plasticity is real and continues. Say so. |

**Flag, do not delete.** Where evidence is mixed rather than dead, the draft
should present it honestly and mark it inline with `> **REVIEW FLAG:**` so the
human review pass can find every one with a grep. Running list of expected
flags: breastfeeding and IQ, bilingual executive-function advantage, sleep
training long-term outcomes, violation-of-expectation infant cognition, ACEs
scores as individual-level prediction, probiotics for colic, screen-time effect
sizes.

**No invented citations.** If a claim cannot be attached to a reference the
writer is confident actually exists, with correct authors and approximate year,
the claim comes out. A softer sentence with no citation is always better than a
confident sentence with a fabricated one. Where the writer is unsure of a
volume or page number, give authors, year, and journal only.

## The six modules

1. **What Is Actually Being Built**: brain architecture, plasticity, the
   sequence of development, why "responsive" beats "enriching."
2. **Reading Your Baby**: states, cues, crying, temperament, goodness of fit.
3. **The Language-Ready Baby**: speech perception, babbling, contingency,
   what actually predicts later language.
4. **Connection and Security**: attachment, still-face, separation and
   stranger wariness, co-regulation, repair.
5. **Bodies in Motion**: motor development, tummy time, milestone variability,
   sleep, feeding, safety.
6. **Everyday Life**: play, object permanence, joint attention, routines,
   screens, stress and buffering, when to ask for help, caregiver wellbeing.
