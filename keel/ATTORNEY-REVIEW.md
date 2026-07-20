# Milestone Navigator — attorney review packet

Prepared 2026-07-19 for the scoped legal review that is the Navigator's launch
blocker (DECISIONS.md D3; budget placeholder $1,500-$3,000, scoped as a
disclaimer/terms review). Everything counsel needs should be in this packet,
the generated copy inventory beside it, and the live page.

## What is being reviewed

**Milestone Navigator**, a free, no-account web tool at
`https://growingmindsscience.com/tools/milestone-navigator` (currently live but
unlinked and noindexed pending this review). A parent picks a developmental
worry (talking, understanding, walking/movement, hands, play, social
connection, hearing, behavior), answers 2-6 plain-language yes/no/not-yet
questions about their child, and receives one of three results:

- **typical_range** — reassurance that nothing reported crosses a published
  research line, always ending with a standing invitation to raise anything
  that still feels off with their pediatrician;
- **discuss** — a suggestion to bring specific observations to their
  pediatrician (or audiology, for hearing), with practical steps;
- **priority_discuss** — a suggestion to call and ask for an appointment
  "soon, ideally within a week or two", explicitly framed as not an emergency
  and not a diagnosis.

The result never names a condition, never assigns risk or probability, never
recommends or discourages treatment, and never tells a parent not to seek
care. The most cautious result a parent can receive is "you're fine, and you
can still ask"; the strongest is "call your pediatrician soon".

A companion tool, the **Communication Snapshot**
(`/tools/communication-snapshot`), is already launched and uses the same
architecture and disclaimer posture; counsel may wish to skim it since any
finding here likely applies there.

## Where every user-visible word lives

- `ATTORNEY-REVIEW-copy.md` (beside this file) — every question, help text,
  flag, note, result body, and call script, generated directly from the
  shipping data file. This is the complete dynamic copy.
- `tools/milestone-navigator.html` — the static copy: hero ("what this is,
  and isn't" card), the disclaimer paragraphs, and the "How this works"
  section.

Current disclaimer language (appears under the tool and again under every
result):

> This tool offers educational information, not medical advice, diagnosis, or
> screening. It cannot see your child; it can only organize what you report.
> Decisions about your child's health belong with you and your child's
> clinician. If your child is in immediate danger or distress, call your local
> emergency number.

Site-wide footer on every page: "Educational content only. Not medical or
psychological advice."

## Substantiation posture

Every threshold that changes a result class is tied to a published source
(AAP guidance, CDC/Zubler milestones, JCIH 2019, and the primary screening
literature), stored in `keel/artifacts/shared/floor_sources.v1.json`, and a
deterministic CI check fails any site update that would classify a
red-line observation more softly than the stored floors. A separate scientific
verification pass (keel/REVIEW.md) is running in parallel with this review.

## Data practices

- No account, no sign-in, no server-side processing. Answers are held in
  page memory and discarded on navigation; nothing about the child is
  transmitted to us or any third party.
- The optional site-wide child profile (name/birthdate for age prefill) lives
  in the browser's localStorage only.
- The site serves Vercel Analytics (aggregate page views). No answer data
  reaches it.
- The printable "notes for our visit" sheet is generated client-side and goes
  only to the user's printer.

## Questions for counsel

1. **Disclaimer adequacy and placement.** Is the disclaimer above sufficient
   in content and placement (under the tool + under every result + site
   footer), or should it require acknowledgment (e.g. a "start" interstitial)?
2. **Practice-of-medicine / individualized-assessment line.** The tool maps
   parent-reported observations to published referral thresholds and returns
   educational framing. Does the age-specific, child-specific output move it
   toward regulated territory (state practice-of-medicine, FDA
   general-wellness/CDS guidance), and if so what wording or structural
   changes keep it clearly educational?
3. **The severity vocabulary.** "Worth a conversation with your pediatrician"
   and "call your pediatrician and ask for an appointment soon" — any concern
   with the urgency implied by the latter, or conversely with reassurance
   implied by "in the typical range right now"? The reassurance side is the
   one we consider higher-risk and it always carries the standing invitation.
4. **Terms of use.** The site currently has no clickwrap terms. Is a terms
   page (limitation of liability, no clinician-patient relationship,
   informational use) needed before launch, and does it need affirmative
   assent for this tool specifically?
5. **Minors' data.** Parents enter observations about their child; nothing is
   transmitted or stored server-side. Confirm COPPA and state minor-privacy
   statutes are satisfied by the local-only design, and whether the privacy
   representations on the page ("everything stays on this device") create any
   warranty exposure.
6. **The hearing pathway.** For hearing, the tool advises seeking a hearing
   test on caregiver concern alone (consistent with JCIH 2019) and, on the
   priority path, asking for an "urgent audiology referral". Comfortable?
7. **Geographic scope.** Copy references US structures (early intervention,
   "most US states"). Any need for a US-only statement or geo-neutral wording?

## Launch mechanics once cleared

Three marked changes (`NAVIGATOR-LAUNCH` in the code): remove the page's
robots noindex meta, uncomment the tools-index card, add the sitemap entry.
Nothing else moves.
