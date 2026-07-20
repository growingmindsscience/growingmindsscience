# The First Year: course draft

**Status: DRAFT. Not published. Not merged. Not wired into the knowledge base.**

Branch: `course/first-year-2026-07-19`
Drafted: 2026-07-19

## What this is

A complete six-module parent-facing course on the first twelve months of life.
Full lesson prose, not outlines. Every module carries parent-facing activities,
an explicit list of the overclaims it refuses to make, a summary, and a
citation list with replication-status markers.

## What this is not, yet

This has had **no human review pass**. It is a draft written to the repo's
evidence standard, but the standard includes a requirement that a person
scrutinize every contested claim before anything reaches a parent. That pass
has not happened.

Specifically, before any of this goes anywhere near a learner:

1. **Verify every citation.** The drafts were written to a citation spine of
   references chosen for being real and well known, but authors, years, journals,
   and especially volume and page numbers need checking against the actual
   sources. Treat any unverified reference as unverified.
2. **Work the review flags.** Every place the evidence is mixed is marked
   inline. See `REVIEW-FLAGS.md` for the consolidated index.
3. **Clinical and legal read.** Modules 2, 5, and 6 contain safety content
   (crying and abusive head trauma, safe sleep, perinatal mental health and
   crisis routing). That content should be reviewed by someone qualified before
   publication, on the same principle as the `keel/` attorney review gate.

## Files

| File | Contents |
| --- | --- |
| `00-STYLE-AND-EVIDENCE-BRIEF.md` | The governing voice and evidence rules all six modules were written to. |
| `module-1-what-is-being-built.md` | Brain architecture, plasticity, the developmental sequence, serve and return. |
| `module-2-reading-your-baby.md` | Behavioral states, cues, crying, temperament and goodness of fit. |
| `module-3-language-ready-baby.md` | Speech perception, statistical learning, babbling, what predicts language. |
| `module-4-connection-and-security.md` | Attachment, still-face and repair, separation, co-regulation. |
| `module-5-bodies-in-motion.md` | Motor development, tummy time, sleep, feeding, safety. Five lessons; sleep and feeding are separate. |
| `module-6-everyday-life.md` | Play, joint attention, routines and stress, screens, caregiver wellbeing. |
| `REVIEW-FLAGS.md` | Consolidated index of every contested claim flagged for human scrutiny. |

## How this honors the repo's existing evidence standard

`corpus/citations.json` and `marketing/carousels/daily-log.md` already record
which popular findings this project refuses to repeat. Those bans are carried
into the course as hard constraints, and each is named explicitly in the
relevant module's "what this module is not saying" section rather than merely
being omitted, so a reader who has heard the claim elsewhere gets the
correction rather than a silence.

Claims banned outright: the Hart & Risley 30-million-word gap, the marshmallow
test as destiny, Hamlin helper/hinderer as innate morality, Meltzoff & Moore
neonatal imitation, the infant Mozart effect, baby sign as a speech
accelerator, and educational baby videos as a teaching medium.

## Not done here, on purpose

- No merge to `main`.
- No publish.
- No changes to `knowledge/sources/`, so `scripts/build-knowledge.mjs` output
  and the certified corpus are untouched. If this course is eventually approved,
  promoting it into the AI's retrieval corpus is a separate, gated decision that
  runs the certifier and the eval harness, exactly like the corpus cutover plan
  in `corpus/README.md` describes.
