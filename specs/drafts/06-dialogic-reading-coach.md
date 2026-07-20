# DRC: Dialogic Reading Coach build spec v0.1 (draft)

> **Status: DRAFT FOR DOMAIN-EXPERT REVIEW. NOT APPROVED. NOTHING HERE IS BUILT.**
> This document is a proposal. No citation in it has been verified against a
> paper, no schema in it has been migrated, and no price or threshold in it is
> final except where it restates a locked decision in `keel/DECISIONS.md`.
> Two gates precede content freeze: **G1** citation verification and **G2**
> compile cost sign-off. A third gate, **G3**, is new to this product: legal
> sign-off on the IP control in §7.4.

**Project:** Growing Minds Science **Codename:** `drc` **Inherits:**
`specs/drafts/00-CONVENTIONS.md` in full. Deviations are recorded inline and marked
**Deviation**. **Locked decisions respected:** D5 (course format is narrated slides plus a full
written version, no on-camera video for v1, one 90-second on-camera intro allowed), D7
(mini-course price is $29).

---

## 0. Product summary

**One-liner:** A $29 mini-course that teaches parents the PEER and CROWD dialogic reading method
in 60 to 90 minutes, plus a membership Prompt Card Library that turns any children's book the
family already owns into an interactive language session.

**Positioning:** Dialogic reading is one of the best-evidenced parent-implementable language
interventions in the literature, and almost nobody has productized it well for parents. The
product's claim is not "read more to your child." It is "here is the specific way of talking
during a book that the research keeps testing, and here is a card for tonight's book."

**Target segment:** Membership parents of 18-month-olds to 5-year-olds who already read at
bedtime and suspect they are doing it passively. Secondary: parents routed in from the Language
Milestone Coach and from the Bilingual Parenting Guide's module on shared reading in two
languages.

**Architecture thesis:** Same as every other product in this portfolio. Zero runtime model
calls. Cards and course copy are compiled offline into frozen, versioned, hash-certified
artifacts, graded mechanically, and approved by a human in the shared review queue. The runtime
is a filter over a JSON deck plus a print renderer.

**Why this product is small:** it invents no instrument. There is no assessment, no placement,
no titration, no scoring of a child. The only interesting engineering is the grader (§7), and
specifically the IP control inside it.

### v1 scope

| In | Out (v2 or never) |
|---|---|
| 5-lesson mini-course, narrated slides plus written version | On-camera lesson video (**never in v1**, per D5) |
| Prompt Card Library, browse and filter by book type, age band, CROWD type | User-submitted cards (never: IP surface we cannot grade) |
| Printable deck PDFs, per book type and per age band | Per-title card sets (**never**, see §7.4) |
| Weekly Reading Plan slot inside the Activity Library planner | Reading logs, streak mechanics beyond current week |
| Card grader with the five type-correctness checks and the IP detector | Interactive practice mode with a model playing the child (**v2**, §12.6) |
| Course completion state and a certificate-free finish screen | Any child-facing screen or child account (never) |
| Cross-sell surfaces to BPG module 5 and to the Activity Library | Any scoring, percentile, or comparison of a child (never) |

**Success metric (one):** share of members who print or open at least one deck and return to a
second deck within 14 days. **Rework trigger:** if fewer than 25 percent of course completers
ever open a card deck, the course and the library are not actually one product and the packaging
is wrong.

---

## 0.5 What already exists

Reported from the repository as of 2026-07-19. This matters because the spec below deliberately
reuses rather than rebuilds, and because one hard dependency is owned by a different product.

**Exists and will be reused as-is:**

- **The content compilation pipeline.** `nsc/tools/activities/grader.ts` (208 lines) is a
  working mechanical grader with the exact shape this product needs: named checks, each
  returning `pass` or `fail` with human-readable details, aggregated into a `GradeReport`, plus
  a `gradeBatch` entry point that gives every draft the rest of the batch as duplicate-detection
  context. Its primitives are the ones DRC needs: `lintBanned` from the Number Path compiler,
  `fleschKincaidGrade`, and a token-set Jaccard duplicate check at a 0.6 fail line. DRC's grader
  is a sibling module, not a fork.
- **The mechanism vocabulary.** `nsc/tools/activities/mechanisms.ts` already carries
  `dialogic_engagement` ("Child as active partner in shared reading and talk"), plus
  `joint_attention`, `serve_and_return`, `expressive_vocabulary`, `receptive_vocabulary`, and
  `narrative_skills`. Every card tags into this existing controlled vocabulary. No new tag is
  required for v1.
- **The admin review queue.** `nsc/app/admin/page.tsx` and `nsc/app/admin/review/[id]/page.tsx`
  exist. Migration `0006_activity_library.sql` defines `review_items` with a `content_type`
  check constraint that **already includes `'prompt_card'`**. This product was anticipated in
  the queue design. Nothing in the queue needs to change to accept DRC drafts.
- **The entitlements spine.** `nsc/lib/grants.ts` (147 lines) is pure, testable, additive-only
  grant logic over enumerated sources (`stripe_sub`, `stripe_otp`, `stripe_otp_legacy`, `gift`,
  `comp`, `trial`). DRC adds two product scopes and no new mechanism.

**Exists but is not yet applied:**

- **Migration `0006_activity_library.sql` is flagged unapplied.** `nsc/README.md` line 66 marks
  it "apply to the project, after 0005," and `0007_navigator.sql` is flagged the same way behind
  it. Until 0006 is applied there is no `review_items` table in the live project, which means
  the DRC card pipeline has no queue to write into. This is a sequencing fact, not a DRC task:
  DRC PR1 is blocked on the Activity Library's migration landing, and should not work around it
  by creating its own queue.

**Does not exist and is a hard dependency owned by another product:**

- **The course platform.** There is no course runtime in the repository. A grep across `nsc/app`
  and `nsc/lib` finds "course" only inside the account page's legacy class-bundle copy. There is
  no lesson model, no narrated-slide player, no progress state, no video or audio hosting
  wiring. **The course platform is delivered by the Bilingual Parenting Guide's PR1 and DRC
  consumes it.** DRC does not build it, does not fork it, and does not ship its mini-course
  until it exists. If the sequencing changes and DRC must ship first, the correct move is to
  ship the Prompt Card Library alone as a membership feature and hold the $29 SKU, not to build
  a second course runtime.

**Summary of the dependency line:** the card library is buildable today against an applied 0006.
The mini-course is not buildable until BPG PR1 lands. §12 sequences accordingly.

---

## 1. Domain model

### 1.1 The two spines

DRC has no placement key. It has two taxonomies, both from the literature, and both used as
filters rather than as diagnoses.

**PEER** is the interaction sequence the parent performs. It is the course's spine and appears
on every card as a footer, because the card supplies only the first letter.

| Step | Parent does | Note |
|---|---|---|
| **P**rompt | Asks the card's question or offers the frame | The only part the card gives you |
| **E**valuate | Responds to what the child said, warmly and specifically | Never "no." Interest, not correction |
| **E**xpand | Restates the child's utterance with a little more added | The step most parents skip. The course spends the most time here |
| **R**epeat | Invites the child to try the expanded version | Optional, never pressed |

**CROWD** is the taxonomy of prompt types. It is the primary card key.

| Code | Type | What it is | Mechanically checkable signature (§7.2) |
|---|---|---|---|
| `C` | Completion | A cloze frame with a predictable slot the child fills | Exactly one blank, terminal, carrier phrase of 3+ words |
| `R` | Recall | A question about something already read | Retrospective marker plus `page_dependency: "prior"` |
| `O` | Open-ended | An invitation to talk about the whole scene | No leading auxiliary, no bounded disjunction |
| `W` | Wh- | A who/what/where/when/why/how question about the visible page | Leading wh-word, `answerable_from: "current_page"` |
| `D` | Distancing | A bridge from the book to the child's own life | Both a book anchor and a life anchor present |

### 1.2 Secondary routing keys

- `age_band`: `18-24m`, `24-36m`, `36-48m`, `48-60m`. Four bands.
- `book_type`: `animal`, `vehicle`, `bedtime`, `lift_the_flap`, `wordless`. Five types. This is
  the load-bearing choice of the product, and §7.4 explains why it is book *type* and never book
  title.
- Composite deck key: `(book_type, age_band)` returns an ordered deck spanning all five CROWD
  types. Composite card key: `(crowd_type, book_type, age_band)`.

### 1.3 Age framing

Age bands select language complexity and prompt-type mix. They never gate, never place, and
never appear in copy as an expectation. Copy says "cards we picked for around this age," never
"by now your child should."

**Named tradeoff (decided):** four bands rather than the Activity Library's finer month ranges.
Finer bands would quadruple the compile and the coverage matrix while the underlying
prompt-language differences between, say, 38 and 44 months are not defensible from the
literature. Four bands wins. If beta shows the 24-36m band is doing two different jobs, split
that one band only.

---

## 2. The mini-course

60 to 90 minutes total, five lessons, each delivered per D5 as **narrated slides plus a complete
written version that stands alone**. The written version is not a transcript afterthought; it is
the accessibility path, the sleeping-baby path, and the searchable path, and it is authored
first. One 90-second on-camera intro for the whole course, not per lesson.

Every lesson has the same four parts: objectives, an empirical spine with citation slots, the
teaching content, and a one-page action sheet the parent can print. Action sheets share the
print treatment of the cards (§9.3).

### 2.1 Lesson 1: Why shared reading works, and what changes when the child talks

- **Length:** 12 to 15 minutes.
- **Objectives:** (1) State the difference between reading *to* a child and reading *with* a
  child. (2) Name the child's talk, not the parent's, as the active ingredient the research
  keeps isolating. (3) Set the expectation that this method makes books slower and shorter, and
  that this is correct.
- **Empirical spine (citation slots, all G1-pending):** `ev.dr.whitehurst1988` as the founding
  demonstration that changing adult reading behavior changes child language; `ev.dr.mol2008` as
  the meta-analytic summary of where effects are and are not found; `ev.hlm.senechal2002` for
  the distinction between shared reading and direct teaching in the home literacy model;
  `ev.org.aap-healthychildren` (carried over, verified) for the general shared reading
  recommendation.
- **Honesty beat, on brand:** the lesson states plainly that effects are strongest for oral
  language and vocabulary, that the picture for later reading outcomes is more mixed, and that
  anyone selling this as a reading-readiness guarantee is overselling. **No effect size is
  stated anywhere in this lesson until G1 clears it.** The slide currently carries a
  `{{G1:effect_size}}` placeholder and the compiler hard-fails on any unresolved placeholder.
- **Action sheet:** "Tonight, say nothing declarative for one page." A single page, one
  instruction, deliberately smaller than the lesson.

### 2.2 Lesson 2: PEER, and the step everyone skips

- **Length:** 15 to 18 minutes. The longest lesson.
- **Objectives:** (1) Perform the four PEER steps in order from memory. (2) Produce an expansion
  from a child utterance, which is the skill the rest of the product depends on. (3) Recognize
  and drop the correction reflex.
- **Empirical spine:** `ev.dr.whitehurst1988` and `ev.dr.arnold1994` for the trained-parent
  procedure itself; `ev.dr.zevenbergen2003` for the conceptual account of why the sequence is
  shaped this way.
- **Teaching core:** the Expand step gets roughly half the lesson. The written version carries a
  table of 20 worked pairs, child utterance on the left, one expansion on the right, drawn from
  generic scenes only. The narrated slides walk six of them.
- **Explicit anti-pattern taught:** "Evaluate" does not mean judge. A child who says "dog" about
  a fox has said something worth building on. The lesson names the correction reflex, explains
  that it ends the turn, and gives the swap ("that does look like a dog, it is a fox, a fox has
  a big bushy tail").
- **Action sheet:** the Expansion Ladder, one card, four rungs: repeat, repeat plus one word,
  repeat plus a phrase, repeat plus a new idea.

### 2.3 Lesson 3: CROWD, five kinds of prompt

- **Length:** 15 to 18 minutes.
- **Objectives:** (1) Name all five prompt types and give one example of each. (2) Match a
  prompt type to a moment. (3) Know that Distancing is the one that carries the most language
  and the one parents use least.
- **Empirical spine:** `ev.dr.whitehurst1988` and `ev.dr.lonigan1998` for the taxonomy in use;
  `ev.reading.reese1999` for the finding that adult reading *style* varies and that style
  differences matter.
- **Teaching core:** one segment per type, each ending with the mechanical signature the grader
  also checks, because a parent who can hear "that was a yes-or-no question, so it was not
  open-ended" has learned the real skill. This is a deliberate alignment: the course teaches the
  same rule the grader enforces (§7.2), so the cards and the teaching cannot drift.
- **Action sheet:** the CROWD wheel, five wedges, one frame per wedge, in the print palette.

### 2.4 Lesson 4: Adapting from 18 months to 5 years

- **Length:** 12 to 15 minutes.
- **Objectives:** (1) Pick the right prompt mix for the child in front of you. (2) Expect and
  accept single-word and no-word answers at the youngest band. (3) Know when to drop a prompt
  type entirely for a while.
- **Empirical spine:** `ev.reading.fletcher2005` for shared reading with the youngest end of the
  range; `ev.org.zero-to-three` and `ev.org.cdc-actearly` (both carried over, verified) for the
  age framing language.
- **The mix table (product decision, not science, and labeled as such in-lesson):**

| Age band | Lean on | Use sparingly | Typical answer |
|---|---|---|---|
| `18-24m` | Wh- (what, where), Completion | Distancing, Recall | A point, a sound, one word |
| `24-36m` | Completion, Wh-, first Recall | Long Open-ended | Two to three words |
| `36-48m` | Open-ended, Recall, Distancing | Heavy Completion | A phrase or a sentence |
| `48-60m` | Distancing, Open-ended, Recall | Simple labeling Wh- | Several sentences, and questions back |

- **Action sheet:** a fridge card with the four bands and their lean-on types.

### 2.5 Lesson 5: Troubleshooting

- **Length:** 10 to 12 minutes.
- **Objectives:** (1) Keep reading with a child who will not sit. (2) Reframe the
  same-book-400-times child correctly. (3) Have a plan for the child who answers nothing.
- **Empirical spine:** `ev.repeat.horst2011` for repeated reading of the same book and word
  learning, which is the empirical basis for the reframe; `ev.dr.mol2008` for the honest note
  that not every child responds and that this is expected.
- **The child who will not sit.** The lesson refuses the premise. Reading is not a seated
  activity, it is a talking activity. Concrete moves: read one page, read standing, read the
  book the child is carrying around, read while the child builds, count it as reading when the
  child narrates the picture and walks off. The lesson explicitly states that a two-minute book
  with four turns of talk beats a twenty-minute book read at a silent child.
- **The same book 400 times, reframed as a feature.** This is the emotional center of the course
  and the most shareable thing in it. The frame: repetition is the condition under which the
  child stops decoding the pictures and starts having capacity for the words. The parent is
  bored because the parent has learned the book. The child is not bored because the child is
  still working. The product move: a repeated book is the only book where you can run the full
  CROWD arc, because you can shift prompt type each night. This is exactly what the Weekly
  Reading Plan's rotating focus (§5) operationalizes. The lesson ends by telling the parent to
  stop trying to introduce new books to fix boredom and instead change their own prompt type.
- **The child who answers nothing.** Wait longer than feels natural, five full seconds. Then
  model the answer and move on without a second ask. Never turn a prompt into a quiz.
- **Action sheet:** three scripts, one per scenario.

### 2.6 Course copy safety

The enrichment lint of `00-CONVENTIONS.md` §5 applies to every course string. DRC is not a
concern-routing tool, so the full banned list applies with no carve-outs, including `delay`,
`behind`, `struggl*`, and `should be able to`. Reading level grade 8 or below, mechanically
checked. The static pediatrician footer appears on the course completion screen and on every
printable, never triggered, so that seeing it carries no signal.

---

## 3. Card output and copy safety

### 3.1 What a card is

A card is one prompt, one follow-up, and enough metadata for the grader. It is not a script and
never a page-by-page plan. The parent holds the deck, looks at the book they already have, and
picks a card.

Rendered front, on screen and in print:

1. **The prompt frame,** set large. This is the only line the parent reads aloud.
2. **The type chip:** one of the five CROWD letters, in the type's tint (§9.2).
3. **The follow-up line,** smaller: what to do with whatever the child says. This is always an
   expansion, which is how PEER gets into the card.
4. **The PEER footer,** a fixed four-letter strip, identical on every card, with the current
   step (P) marked. Present because the card is only the P.

Rendered back (print only, deck-level rather than per-card to save ink): the band note, the
book-type note, and the static pediatrician footer.

### 3.2 Lints

Enrichment lint per conventions §5, applied to `prompt_text`, `follow_up`, and every deck-level
string. Reading level grade 8 or below on the deck-level copy; cards themselves are too short
for Flesch-Kincaid to be meaningful, so cards get a word-length and clause-count rule instead
(§7.3) rather than a bogus FK score.

**Deviation from conventions §5:** the enrichment lint's ban on `by now` needs a carve-out
check, not an exception. The phrase appears naturally in Recall prompts ("what has happened by
now?"). Rather than weaken the lint, the card style guide bans that construction outright and
the compiler is instructed to produce "what has happened so far?" The lint stays absolute.

### 3.3 Tone

Cards sound like something a person would actually say out loud at bedtime. Warm, short, no
jargon, no exclamation marks stacked, no "let's explore." A card that a tired parent would feel
silly reading aloud is a failed card, and the gold reference set (§4.4) exists to hold that
line.

---

## 4. The Prompt Card Library

### 4.1 Card schema

Illustrative field list. **No DDL** per conventions §3.

- `id`: stable string, `card.{crowd}.{book_type}.{band}.{nn}`.
- `crowd_type`: one of `completion`, `recall`, `open_ended`, `wh`, `distancing`.
- `book_type`: one of the five in §1.2.
- `age_band`: one of the four in §1.2.
- `prompt_text`: the line the parent says. The graded surface.
- `follow_up`: the expansion move. Also graded.
- `mechanism_tags`: from the existing `mechanisms.ts` vocabulary, at least one.
- `page_dependency`: `current` | `prior` | `none`. Load-bearing in §7.2.
- `answerable_from`: `current_page` | `prior_pages` | `child_life`.
- `expected_slot_class`, Completion only: `noun` | `rhyme` | `refrain_word`.
- `target_referent`, Wh- only: a term from the book type's scene vocabulary.
- `book_anchor` and `life_anchor`: Distancing only, both required, both must appear in
  `prompt_text`.
- `retrospective_marker`, Recall only: the marker phrase the grader matched.
- `evidence_tag_ids`: resolve to the §6 citation table.
- `ip_scan`: the §7.4 detector's report, frozen with the card.
- `status`, `version`: review queue state and artifact version.

Field names deliberately echo the plan's sketch (`prompt_cards ( id, crowd_type, book_type,
age_band, prompt_text, follow_up, status, version )`) and add only the fields the grader needs
to be mechanical rather than assertive.

### 4.2 Coverage matrix (cert-enforced)

Every `(crowd_type × book_type × age_band)` cell carries a floor count. Floors are
differentiated, because a uniform floor would force the compiler to invent Distancing cards for
18-month-olds that no one should use. `N/A` cells are declared, not left empty, and the grader
fails on an undeclared empty cell.

Floors per cell, by CROWD type and age band, applied across all five book types unless a
book-type note overrides:

| CROWD type | `18-24m` | `24-36m` | `36-48m` | `48-60m` |
|---|---|---|---|---|
| Completion | 8 | 8 | 6 | 4 |
| Recall | 2 | 5 | 8 | 8 |
| Open-ended | 3 | 6 | 8 | 8 |
| Wh- | 8 | 8 | 6 | 6 |
| Distancing | 2 | 5 | 8 | 10 |

Book-type overrides:

| Book type | Override |
|---|---|
| `wordless` | Completion floor drops to 2 in every band. There is no text to complete, so these are parent-invented refrains only, and the style guide restricts them to repeated-action frames. |
| `lift_the_flap` | Recall floor rises by 2 in `36-48m` and `48-60m`. Flaps create natural before-and-after structure and this is the type's strength. |
| `bedtime` | Distancing floor rises by 2 in `36-48m` and `48-60m`. Routine books bridge to the child's own routine trivially. |
| `vehicle` | Open-ended floor drops by 1 in `18-24m`. Honest: labeling dominates at that band for this type. |

**Resulting v1 catalog size:** 100 cells, floors summing to roughly **610 cards**. Compile
targets 750 drafts to absorb grader rejects at an assumed 20 percent reject rate.

Additional matrix rules the grader enforces:

1. No `(book_type, age_band)` deck may draw more than 40 percent of its cards from one CROWD
   type.
2. Every deck of 20 must contain at least two cards of each CROWD type that has a nonzero floor
   in that cell.
3. Duplicate similarity, reusing the existing Jaccard check at the 0.6 fail line, computed
   within `(crowd_type, book_type)` across all bands, so the same prompt cannot be relabeled
   into two bands.

### 4.3 Compilation pipeline

Four steps, mirroring the Activity Library's proven flow.

1. **Draft.** Model drafts a batch per cell against the schema, the gold references, and the
   type's mechanical signature stated in the prompt. Batches are per `(book_type, age_band)` so
   the model has coherent context, matching the existing
   `nsc/tools/activities/batches/batch-001.json` convention.
2. **Grade.** `tools/drc/grader.ts` runs §7. Hard fails never reach the queue, exactly as the
   activity grader behaves today.
3. **Review.** Passing drafts enqueue into `review_items` with `content_type: 'prompt_card'` and
   their grader report attached. Matthew approves or rejects with a reason. The model proposes,
   Matthew disposes.
4. **Freeze.** Approved cards compile into `prompt_cards.deck.v1.json`, hashed, with
   `cert.report.v1.json` co-frozen. The runtime refuses any artifact whose hash lacks a matching
   passing report, the same posture as `nsc/lib/artifacts.ts`.

**Cost flag (G2, blocking).** Estimate for a full deck compile: 750 drafts at roughly 180 output
tokens each for prompt, follow-up, anchors, and metadata, which is about **135k output tokens**.
Add roughly 30 percent for retries on grader rejects and for the two gold-calibration passes,
giving a working estimate of **175k to 200k output tokens** for the card library. The course
adds roughly **60k to 80k output tokens** across five lessons of narrated-slide script plus the
written version plus five action sheets. **Full-product working estimate: 240k to 280k output
tokens.** Do not run the full compile before sign-off. Compile one cell first (`wh × animal ×
24-36m`), review the reject rate, and only then extrapolate.

### 4.4 Gold references

Ten hand-authored cards, two per CROWD type, spanning at least three book types and three bands.
These are the style anchor for the compiler and the fixtures for the grader's own tests. Ten
more hand-authored **red-team** cards, each engineered to fail exactly one check, are committed
alongside, so that a grader regression is caught by a test rather than by a bad card reaching
print.

---

## 5. Weekly Reading Plan

A reading slot inside the Activity Library's existing weekly planner, not a second planner.

- The slot appears once per week per child and reads "Reading this week."
- It names **one rotating CROWD focus**, not a book. Rotation order is fixed and deterministic:
  Completion, Wh-, Recall, Open-ended, Distancing, repeating. Deterministic because it must be
  reproducible in tests and because a random focus cannot be explained to the parent.
- The rotation is keyed to the child's age band, so a band with a Distancing floor of 2 sees
  Distancing come around with a lighter card set, not with cards that do not exist.
- The slot links to the three highest-fit cards for the week's focus given the child's band and
  the family's most recently viewed book type.
- **This is the mechanism that operationalizes Lesson 5's reframe.** The same book, a different
  prompt type each week, is exactly the "read it 400 times" advice made into a product surface.
- No streaks beyond the current week, matching the restraint decided for the Number Path
  dashboard. No guilt mechanics, no broken-streak shaming.

---

## 6. Evidence layer

### 6.1 Two-axis tags

Every card and every lesson claim carries `strength × consensus` chips in the shared Child
Evidence visual language. Cards mostly resolve to the same small set of tags; that is honest and
the chips should not be inflated to look varied.

### 6.2 Seed citation table

⚠ **G1 gate.** Entries marked `verified: false` are seeds proposed by this spec and have **not**
been checked against the papers. Verify the full cite, the findings, and every effect size
against the actual paper before content freeze. No DOIs, volumes, or page numbers are guessed
here; those fields are omitted rather than invented. **No effect size appears anywhere in this
document or in any draft artifact.** Every effect-size slot in course copy is a
`{{G1:effect_size}}` placeholder and the compiler hard-fails on any unresolved placeholder
reaching an artifact.

| tag_id | Anchor | Claim scope | verified |
|---|---|---|---|
| `ev.dr.whitehurst1988` | Whitehurst et al. (1988, *Developmental Psychology*) | The founding dialogic reading demonstration: training adults to change shared-reading behavior changes child language | `false` |
| `ev.dr.whitehurst1994` | Whitehurst et al. (1994, *Developmental Psychology*) | Dialogic reading extended beyond the original middle-class sample | `false` |
| `ev.dr.arnold1994` | Arnold, Lonigan, Whitehurst & Epstein (1994, *Journal of Educational Psychology*) | Video-based parent training in the method; the "can this be taught at scale" question | `false` |
| `ev.dr.lonigan1998` | Lonigan & Whitehurst (1998, *Early Childhood Research Quarterly*) | Relative efficacy of parent-delivered versus teacher-delivered dialogic reading | `false` |
| `ev.dr.mol2008` | Mol, Bus, de Jong & Smeets (2008, *Early Education and Development*) | Meta-analysis of dialogic reading; where effects hold and where they attenuate | `false` |
| `ev.dr.zevenbergen2003` | Zevenbergen & Whitehurst (2003, chapter in *On Reading Books to Children*) | Conceptual account of the PEER and CROWD structure | `false` |
| `ev.hlm.senechal2002` | Sénéchal & LeFevre (2002, *Child Development*) | Home literacy model; shared reading and direct teaching are different pathways | `false` |
| `ev.reading.reese1999` | Reese & Cox (1999, *Developmental Psychology*) | Adult reading style varies and style differences matter for emergent literacy | `false` |
| `ev.reading.fletcher2005` | Fletcher & Reese (2005, *Developmental Review*) | Picture book reading with infants and the youngest end of the range | `false` |
| `ev.repeat.horst2011` | Horst, Parsons & Bryan (2011, *Frontiers in Psychology*) | Repeated reading of the same book and word learning; the empirical basis for the Lesson 5 reframe | `false` |
| `ev.wwc.dialogic` | What Works Clearinghouse dialogic reading intervention report | Independent effectiveness rating; the skeptic's cross-check | `false` |
| `ev.org.aap-healthychildren` | AAP HealthyChildren (registered in `corpus/citations.json`) | General shared-reading recommendation | `true` |
| `ev.org.zero-to-three` | ZERO TO THREE (registered in `corpus/citations.json`) | Age framing language for the youngest bands | `true` |
| `ev.org.cdc-actearly` | CDC Learn the Signs Act Early (registered in `corpus/citations.json`) | Age framing language; public-domain derivative | `true` |

Three entries are `verified: true` because they are carried over from `corpus/citations.json`, a
pool already registered and verified in this repository. Eleven are seeds. **No artifact ships
with a `verified: false` citation**, enforced at cert exactly as the Number Path harness
enforces it.

**Deliberate exclusion, rendered as an honesty card in marketing and in-app:** DRC does not
claim that dialogic reading raises IQ, prevents reading difficulty, or produces durable gains on
standardized reading measures. It claims an oral-language and vocabulary effect and says the
longer-range picture is mixed. The tag `ev.exclusion.dr-overclaim` carries this position note
and renders as "what we deliberately do not claim, and why."

---

## 7. Certification harness

Artifacts ship only on green. This section is the engineering core of the product.

### 7.1 Static checks (inherited)

Reused from `nsc/tools/activities/grader.ts` with card-appropriate parameters: JSON schema
validation, enrichment banned-language lint (zero tolerance), mechanism-tag membership against
`mechanisms.ts`, duplicate similarity at Jaccard 0.6 within `(crowd_type, book_type)`, coverage
matrix per §4.2, and evidence-tag resolution with `verified: true` required.

### 7.2 The five type-correctness checks

The plan's requirement is that "a Completion card must actually be a completion frame." An
assertion is not a check. Each type below has a mechanical rule that runs on `prompt_text` plus
the card's declared fields. Every rule is deterministic and reports which clause fired, so a
reviewer sees the reason, not a verdict.

**C1. Completion must be a cloze frame with a predictable slot.**

1. `prompt_text` contains exactly one blank token matching `/_{3,}/`. Zero or two or more is a
   fail.
2. The blank is terminal: after it, only whitespace, a period, or an ellipsis may follow. A
   blank in the middle is a fail, because a mid-sentence blank is not a frame a child can
   complete in speech.
3. The carrier phrase before the blank has at least three word tokens. A two-word carrier does
   not constrain the slot.
4. `prompt_text` contains no `?`. A completion frame is not a question, and a parent reading it
   with question intonation gets a different behavior.
5. `prompt_text` does not begin with a token from the closed wh-set. That would be a Wh- card
   wearing a blank.
6. `expected_slot_class` is present and is one of `noun`, `rhyme`, `refrain_word`. If it is
   `rhyme`, the carrier's final word before the blank must be non-empty and the style guide
   requires the rhyme partner to be generic, never a specific book's refrain (§7.4 also scans
   this).
7. `follow_up` must be an expansion, checked by E1 below.

**C2. Recall must reference something already read.**

1. `prompt_text` matches at least one marker from a closed retrospective lexicon: `remember`,
   `what happened`, `earlier`, `before that`, `at the beginning`, `first`, `already`, `so far`,
   `who did we meet`, `where did .* go`. The matched marker is written back into
   `retrospective_marker`, so the card records why it passed.
2. `page_dependency` equals `prior` and `answerable_from` equals `prior_pages`. Any other value
   is a fail, which prevents a Wh- card being relabeled Recall.
3. `prompt_text` contains no present-page deictic from the closed set `this page`, `right here`,
   `look at`, `see the`, `point to`, `on this page`. Those anchor to the visible page and
   contradict a Recall card by construction.
4. `prompt_text` ends with `?` or begins with `tell me`.
5. Band rule: in `18-24m`, Recall cards may reference only the immediately prior page, enforced
   by requiring the marker to come from the short subset `remember`, `what happened`, `where did
   .* go`.

**C3. Open-ended must not be answerable with yes or no.**

1. The first word token is not in the closed leading-auxiliary set: `is`, `are`, `was`, `were`,
   `do`, `does`, `did`, `can`, `could`, `will`, `would`, `should`, `has`, `have`, `had`, `am`,
   `may`, `might`, `shall`. Subject- auxiliary inversion is the mechanical signature of a polar
   question in English, and this is the check that catches it.
2. `prompt_text` contains no bounded disjunction matching `/\b\w+ or \w+\s*\?/`. "Is it a cat or
   a dog?" is a two-option question wearing an open-ended coat.
3. `prompt_text` matches at least one frame from a closed open-invitation set: `tell me about`,
   `tell me what`, `what is happening`, `what do you think`, `what do you see happening`, `talk
   to me about`, `describe`, `what is going on`. This is what separates an Open-ended card from
   a Wh- card, since both may begin with "what."
4. At least five word tokens.
5. `answerable_from` equals `current_page` and `page_dependency` equals `current`, and
   `target_referent` is absent. Presence of a single `target_referent` means the card is
   targeting one thing, which is a Wh- card.

**C4. Wh- must begin with a wh-word and be answerable from the page.**

1. The first word token is in the closed wh-set `what`, `where`, `who`, `when`, `why`, `which`,
   `how`. Only one leading conjunction (`and`, `so`, `oh`) may precede it, and it is stripped
   before the test.
2. `prompt_text` ends with `?`.
3. `answerable_from` equals `current_page` and `page_dependency` equals `current`.
4. `target_referent` is present and is a member of the book type's **scene vocabulary**, a
   per-book-type controlled list of generic page elements. For `animal`: `animal`, `tail`,
   `ear`, `paw`, `sound`, `nest`, `food`, `water`, and so on. For `vehicle`: `wheel`, `driver`,
   `road`, `load`, `horn`, `light`. Membership in this list is what makes "answerable from the
   page" mechanical rather than a claim: the referent is a thing that a book of this type has on
   its pages by definition. A `target_referent` outside the list is a fail, and extending the
   list is a reviewed commit, the same posture as the mechanism vocabulary.
5. `prompt_text` contains no Distancing life-anchor marker (see C5 clause 2). "Where does your
   grandma live?" is a Distancing card, not a Wh- card.
6. Band rule: `why` and `how` are barred in `18-24m` and `24-36m`. They are causal-explanatory
   and belong in the older bands. This is a product decision informed by the mix table in §2.4,
   not a claimed finding, and is labeled as such.

**C5. Distancing must bridge from the book to the child's own life.**

1. Both `book_anchor` and `life_anchor` are present and non-empty, and the normalized text of
   each appears as a substring of the normalized `prompt_text`. This is the structural core: a
   Distancing prompt has two sides, and the card must declare both and actually contain both. A
   card with only a life side is a conversation starter, not a distancing prompt.
2. `prompt_text` matches at least one marker from a closed life-anchor lexicon: `remember when
   you`, `remember when we`, `have you ever`, `do you ever`, `at our house`, `in your room`, `at
   the park`, `when we went`, `at grandma`, `at your school`, `last time you`, `like you do`,
   `like we do`.
3. `prompt_text` contains a second-person or first-person-plural pronoun: `you`, `your`, `we`,
   `our`, `us`.
4. `page_dependency` equals `none` and `answerable_from` equals `child_life`.
5. `follow_up` must invite elaboration, not confirmation, checked by E1. Distancing prompts
   frequently open with "have you ever," which is polar on its face; the card is valid only
   because the follow-up carries the opening. This is the one place a polar opener is permitted,
   and it is permitted only with a passing E1.

**E1. The follow-up expansion check** (applies to all five types.) `follow_up` must (a) not be a
question, or if it is, must pass C3 clause 1, and (b) match at least one expansion frame from a
closed set: `say it back`, `add a word`, `you can add`, `then say`, `stretch it`, `repeat what`,
`build on`. This is how the Expand step of PEER is forced into every card rather than being
assumed.

**X1. Type exclusivity (a property test, not a per-card check).** For every card, run all five
type checks. The card must pass its declared type and **fail at least one clause of each of the
other four**. A card that satisfies two type signatures is ambiguous, and an ambiguous card
teaches the taxonomy wrong. This is the check that keeps the five types from collapsing into "a
question" over successive recompiles, and it is the DRC analogue of the Number Path spec's
titration property tests: it tests the classification system, not just each instance.

**X2. Coverage of the checks themselves.** The ten red-team fixtures (§4.4) each target one
clause. CI asserts that each fixture fails on exactly the clause it was written for. A grader
that gets laxer in a refactor fails this test before it fails a parent.

### 7.3 Age-band language appropriateness

Cards are too short for Flesch-Kincaid to be meaningful, so the band check is structural.

| Band | Max words in `prompt_text` | Max clauses | Barred constructions |
|---|---|---|---|
| `18-24m` | 8 | 1 | subordinate clauses, `why`, `how`, conditionals, past perfect |
| `24-36m` | 12 | 1 | conditionals, past perfect, `why`, `how` |
| `36-48m` | 16 | 2 | past perfect, stacked conditionals |
| `48-60m` | 22 | 2 | none beyond the enrichment lint |

Clause counting is mechanical: count finite verbs, or count clause-boundary markers from a
closed list (`because`, `when`, `if`, `that`, `who`, `which`, `after`, `before`, `while`).
Vocabulary is checked against a maintained band-appropriate word list for the two youngest bands
only, with out-of-list words permitted when the card's `book_type` scene vocabulary contains
them, so that "excavator" is allowed on a vehicle card and not on a bedtime card.

### 7.4 The IP control: the quoted-text detector

**This is a legal control. It fails closed.** The product's entire structural premise is that
cards attach to book *types* and generic scenes, never to titles. A card that names a title and
quotes its line is a reproduction of copyrighted text on a printable artifact distributed to
paying members. That is the one failure mode in this product with a cost that is not measured in
tokens.

**What it scans.** Every string that can reach a parent's eye or printer: `prompt_text`,
`follow_up`, `book_anchor`, `life_anchor`, `target_referent`, card titles, deck front matter,
deck back matter, print headers and footers, image alt text, and course lesson copy. It also
runs a second time **against the extracted text layer of the rendered PDF**, after templating,
so that a string introduced by a print template rather than by a card is still caught. A control
that only inspects the input misses the output.

**Layer 1: the title and character denylist.** A maintained list of well-known children's book
titles and coined character names, matched case-insensitively on normalized text with word
boundaries and punctuation stripped. Matching is on the **full multiword string only**.
Single-word entries are barred from the denylist by a lint on the denylist itself, so that no
one can ever ban the word `bear`, `moon`, or `truck` and break half the animal and bedtime
decks. Coined single-word names are the sole exception and require an explicit
`single_word_justified: true` flag plus a written reason in the list entry, which makes adding
one a reviewed commit.

**Layer 2: the quotation detector.** Any straight or curly double quotation mark anywhere in a
card string is a hard fail. Any single-quote-wrapped span of three or more words is a hard fail.
Cards never quote anything, from any source, so this rule needs no exceptions and catches the
"quote a line from the book" failure mode regardless of whether the quoted text is in the
denylist. It is the cheapest and highest-yield layer.

**Layer 3: the n-gram collision index.** A local index of hashed 5-grams built from a list of
well-known refrains and opening lines that Matthew supplies. **Only salted hashes are stored,
never the source text**, so the repository never contains copied text and the control does not
itself create the problem it prevents. Any exact normalized 5-gram match is a hard fail.

**Why 5-grams.** 3-grams collide constantly in this register: "in the big" and "where the wild"
are ordinary English and would fire on innocent cards all day. 7-grams miss short refrains
entirely, and short refrains are exactly the ones a compiler is most likely to regurgitate. 5 is
the working choice, and it is a product decision, not a finding. The tuning procedure is stated
so it can be redone: run the index against the full gold set plus 200 known-clean cards, measure
the innocent-hit rate, and move the threshold only if that rate exceeds 2 percent.

**How innocent collisions are handled.** They will happen, and the design assumes they will. The
path is deliberately slow:

1. The card is **rejected**, not flagged for review. It never reaches the queue.
2. The compiler regenerates. In the overwhelming majority of cases this is the end of it, and
   the cost is a few hundred tokens.
3. If a specific string is genuinely necessary and genuinely innocent, it goes on an **allowlist
   keyed by exact normalized string, with a written justification and Matthew's initials,
   checked into the repository**. There is no runtime override, no admin toggle, and no
   environment flag. An override is a commit, reviewable in a diff, forever.

**False-positive posture: fails closed, deliberately.**

> **Named tradeoff (decided):** a permissive detector loses fewer good cards; a
> strict detector loses good cards but never ships a bad one. The costs are not
> symmetric. A false positive costs one regenerated card, roughly 200 tokens and
> zero human minutes. A false negative costs a copyright exposure on a printable
> artifact that members have already downloaded and cannot be recalled. Strict
> wins, and it is not close. The detector is tuned toward over-rejection, the
> reject rate is a monitored compile-health number rather than a thing to
> optimize down, and no reviewer may approve a card whose `ip_scan` is anything
> other than clean. The queue does not render an override button, because a
> button that exists gets pressed at 11pm.

**G3 gate.** Before the first printable ships, a real lawyer reads §7.4 and the gold deck. The
engineering control is not a substitute for that read, it is what makes the read cheap.

### 7.5 CI wiring

The grader runs on every compiler PR. `cert.report.v1.json` is committed with the artifacts. The
runtime refuses to load an artifact whose hash lacks a matching passing report. The red-team
fixtures (§4.4, §7.2 X2) run on every commit to the grader, not only on content PRs.

---

## 8. Data model

Prose plus annotated field lists. **No DDL in this folder** per conventions §3. When approved,
the real migration lands in `nsc/supabase/migrations/` as `0008` or later, behind the
already-flagged-unapplied 0006 and 0007.

**Prompt cards.** Published, approved cards. Public-read content in the same posture as
`activities`: anyone may read published rows because deck previews are a marketing surface, and
writes are service-role only through the review queue. Fields: the §4.1 schema, plus
`published_at` and `artifact_version`. Deck membership is derived from `(book_type, age_band)`
rather than stored, so there is no deck table to drift.

**Review rows.** None. DRC reuses `review_items` from migration 0006 with `content_type:
'prompt_card'`, which that migration's check constraint already permits. This is the single most
important reuse decision in the spec: DRC adds zero admin surface.

**Course progress.** Owned by the course platform that BPG PR1 delivers, not by DRC. DRC
contributes a course definition, not a progress model. If BPG's design does not include
per-lesson completion state, that is a note against BPG's spec, not a reason for DRC to grow a
table.

**Reading plan state.** Owned by the Activity Library planner. DRC contributes the
rotating-focus function, which is pure and deterministic given `(age_band, week_index)` and
therefore stores nothing.

**Entitlements.** Two new product scopes in `nsc/lib/grants.ts`: `drc_course` granted
perpetually by the $29 one-time purchase with source `stripe_otp`, and the card library covered
by the existing `membership` scope. Additive only, consistent with the spine's one rule. A
member who buys the course and later cancels the membership keeps `drc_course` forever and loses
card access, which is the correct and explainable behavior. The all-access annual, deferred by
D7 until three courses exist, will grant `drc_course` as a third source without touching either
of the first two.

**Privacy.** DRC stores nothing about a child. No nickname, no birth date, no free text. The age
band comes from the child record the Activity Library already owns. The product's data footprint
is card views and print events, both aggregate.

---

## 9. Screens

Mobile first. The parent is holding a phone in one hand and a board book in the other. Tidepool
tokens throughout, per conventions §4.

### 9.1 Screen list

1. **`/reading` landing (in-app).** What dialogic reading is in three sentences, the CROWD wheel
   as the hero, one sample deck open and readable without purchase, the course CTA below the
   fold. The honesty card ("what we do not claim") sits above the footer.
2. **Course player.** Delivered by the BPG course platform. DRC supplies five lessons of
   narrated slides, five written versions, and five action sheets. The written version is a
   first-class tab, not a download.
3. **Deck browser.** Two filters, book type and age band, rendered as chip rows rather than
   selects because two taps beats a picker. Results are a card grid.
4. **Card view.** One card, large, swipeable to the next in the deck. The type chip, the
   follow-up, and the fixed PEER footer. Nothing else on the screen.
5. **Print sheet.** Deck preview with a page count, an ink-economy toggle, and a single download
   button.
6. **Weekly Reading Plan slot.** Lives inside the Activity Library planner (§5), not on a DRC
   screen.

### 9.2 Screen treatment

Ground is aqua mist `#F0F5F3`. Cards are surface white `#FFFFFF` with a 14px radius and a
`#D4E0DC` hairline. Prompt text is Source Serif 4 in deep teal ink `#15393C`, set large, because
it is a line to be read aloud. Type chips and section eyebrows are Bricolage Grotesque. Actions
are brand teal `#1E5F62` in 48px pill controls. Coral `#DE7356` is the single warm accent and is
spent in exactly one place: the current step marker on the PEER footer strip.

The five CROWD types are distinguished by **letter plus label plus position**, not by five
colors. Five accent colors would break the one-warm-accent rule and would not survive the
monochrome print path. On screen the type chip uses a teal-family tint ladder: `#15393C`,
`#1E5F62`, `#2E7A77`, `#CFE3DE` with deep teal text, and a white chip with a teal hairline for
the fifth.

Signature reveal, one per product per conventions §4: the CROWD wheel rotates once to the week's
focus on the planner slot. Everything else is quiet. `prefers-reduced-motion` gets an instant
state change with no rotation.

**Anti-references hold:** no gradient hero, no hero-metric template, no identical icon-card
grid, no purple-on-white, no hospital-blue, no "is your child behind" framing anywhere near this
product.

### 9.3 Print fidelity and ink economy

The cards are a printable artifact and the print path is a first-class design target, not an
export.

- **Layout.** Six cards per US Letter page and six per A4, on a 2 × 3 grid with crop marks at
  3mm, sized so a card fits a standard business-card sleeve or a jar on the nightstand. Both
  paper sizes ship; the renderer picks from locale and the user can override.
- **Ink economy is the default, not a toggle away.** The default print is **line-only**: deep
  teal `#15393C` text on unprinted paper, a hairline border, no filled backgrounds, no
  full-bleed color. The type chip prints as an outlined letter, not a filled circle. A parent
  printing all five decks on a home inkjet is the modal user and must not be punished for it.
- **The toggle adds color, it does not remove it.** "Print in color" is opt-in and adds the teal
  tint ladder to chips only. There is never a full-bleed color print option.
- **Contrast under monochrome.** Every deck is verified rendered in grayscale. The tint ladder
  must remain distinguishable at 300dpi grayscale, which is checked mechanically at cert by
  rasterizing the deck and asserting a minimum luminance separation between adjacent tints. This
  is why the types are keyed to letters first.
- **Legibility.** Prompt text at a minimum 11pt Source Serif 4. If a card's prompt does not fit
  at 11pt in its cell, the card fails cert rather than auto-shrinking. The §7.3 word caps make
  this rare by construction.
- **Bleed and margins.** 5mm safe margin on all sides so a misaligned home printer does not clip
  a prompt.
- **The static pediatrician footer** appears once per printed page, small, in ink-soft
  `#3D5A5A`, never triggered.

---

## 10. Ecosystem slot

Three layers, per the portfolio plan §2.1. **DRC sits in two of them, and this is intentional.**

- **Layer 3, Courses.** The mini-course at **$29 one-time**, per D7, locked at launch and
  revisited at 90 days with conversion data. It is the cheapest course in the catalog and is
  positioned as the entry course, the one someone buys to find out whether they like how this
  brand teaches. It counts toward the three-course threshold that unlocks the deferred $149
  all-access annual.
- **Layer 2, Membership.** The Prompt Card Library is a membership feature at $9/mo or $79/yr,
  per D7. It is not sold separately and never will be. Its job is to make the membership
  stickier for the 18-month to 5-year window, which is the same window the Activity Library and
  the Language Milestone Coach serve.
- **Layer 1, Free.** One open deck, `animal × 24-36m`, fully readable and printable without an
  account. This is the capture surface. A parent who prints it and uses it once has experienced
  the product.

**The two-layer split is the interesting packaging decision.**

> **Named tradeoff (decided):** bundling the cards into the $29 course would
> make a cleaner offer and a simpler landing page. Splitting them means
> explaining two things on one page, which costs conversion. But the cards are
> the thing with ongoing value across three years of a child's life, and
> ongoing value belongs in the recurring product. A course teaches you something
> once; a deck is opened on a Tuesday in March. Split wins. The mitigation for
> the conversion cost is that the course's checkout offers a 30-day membership
> trial in the same flow, mirroring the Number Path post-purchase trial offer
> already described in the plan's SKU reconciliation.

### Cross-links

| From | To | Surface |
|---|---|---|
| **Bilingual Parenting Guide module 5** (shared reading in two languages) | DRC course and card library | The primary cross-sell. BPG module 5 teaches shared reading in a bilingual home and hands off the method itself to DRC rather than duplicating it. DRC cards carry a one-line bilingual note ("this works in either language, and a child answering in the other language is answering"). BPG buyers get the DRC course at a bundle price, which is a pricing decision routed to Matthew in §13. |
| **Activity Library weekly planner** | DRC Weekly Reading Plan slot | §5. The reading slot is the DRC surface most members will touch, and most of them will never see the course. |
| **Language Milestone Coach** | DRC card decks | LMC prescribes Activity Library activities; for expressive-language goals it should prescribe a DRC deck by band. Routed through the same prescription mechanism, not a new one. **Constraint:** the handoff copy must clear the never-diagnostic lint on the LMC side and the enrichment lint on the DRC side, which means the link text is "cards for building talk during books," never "cards to help catch up." |
| **Claims Library** | DRC evidence chips | The §6 tags resolve to claim pages, giving DRC's chips somewhere to go and giving the claim pages an internal link. |
| **Number Path** | DRC | Both are "the thing you already do, done with intent." Cross-promoted in the membership onboarding as a pair, not competitors for attention. |

---

## 11. Telemetry

Anonymized and aggregate. No child-level anything.

- Funnel: `/reading` landing → free deck open → membership or course conversion.
- Deck opens by `(book_type, age_band)`. Cells nobody opens are pruning candidates at the v1.1
  recompile.
- **Print events by deck, and the color-toggle rate.** If the color toggle rate is under 10
  percent, the ink-economy default was correct and the toggle can be simplified later.
- Return rate: share of deck openers who open a second deck within 14 days. This is the
  product's one success metric (§0). Target 40 percent.
- Course: start-to-complete rate across the five lessons, and per-lesson drop-off. Target 55
  percent complete, which is high for a course and achievable at 60 to 90 minutes.
- Compile health, internal only: grader reject rate by check, and specifically **the IP
  detector's reject rate by layer**. A spike in Layer 3 hits means the drafting prompt has
  started leaning on remembered text and needs correcting. This is a compile-health signal and
  is never surfaced to users.
- Weekly Reading Plan slot: engagement per rotating focus. If Distancing weeks consistently
  underperform, the Lesson 5 framing needs work, not the cards.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge. Every PR carries acceptance criteria and an eval gate
blocks merge.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR0** (not DRC's) | Migration `0006_activity_library.sql` applied | `review_items` exists in the live project. **DRC PR1 is blocked on this.** |
| **PR1** `drc/grader` | `tools/drc/` schema, the five type checks, band checks, IP detector, 10 gold cards, 10 red-team fixtures | Every gold card passes; every red-team fixture fails on exactly its target clause; X1 exclusivity holds across all 10 golds; IP detector catches all 10 planted quote fixtures with zero hits on the gold set |
| **PR2** `drc/compile-cards` | Full deck compile behind **G2 cost sign-off** and **G1 citation verification** | 610+ approved cards, every cell at or above floor, every declared `N/A` justified, cert report green, zero `verified: false` tags in the artifact |
| **PR3** `drc/deck-ui` | Deck browser, card view, free-deck gate, entitlement wiring | Every `(book_type, age_band)` deck resolves; free deck reachable logged out; paid decks unreachable without `membership` |
| **PR4** `drc/print` | PDF renderer, both paper sizes, ink-economy default, grayscale contrast check | Print-fidelity check passes at 300dpi grayscale; no card clipped; 11pt floor holds; **G3 legal read complete before merge** |
| **PR5** `drc/planner` | Weekly Reading Plan slot inside the Activity Library planner | Rotating focus is deterministic and unit-tested for all `(band, week_index)` pairs; slot renders with three resolvable cards in every case |
| **PR6** `drc/course` | Five lessons into the BPG course platform, $29 SKU, `drc_course` grant | **Blocked on BPG PR1.** Grant tests cover purchase, membership cancel with course retained, and the deferred all-access path; enrichment lint green on every lesson string |
| **PR7** `drc/crosslinks` | BPG module 5 handoff, LMC prescription link, Claims Library chips, telemetry, a11y pass | Both lints green on every handoff string; Lighthouse a11y at or above 95; reduced-motion path verified |

**Critical path.** PR1 through PR5 are the Prompt Card Library and are shippable as a membership
feature without the course. PR6 is the only thing gated on another product. If BPG slips, ship
PR1 through PR5 and PR7's non-course links, and hold the $29 SKU. The plan's "two-week product
once infrastructure exists" estimate is credible for PR1 through PR5 and excludes PR6.

### 12.6 Deferred to v2: the interactive practice mode

The plan describes a practice mode where a model plays the child in a simulated read-along and a
frozen rubric scores the parent's prompts. It is genuinely novel, it is the most interesting
thing in the product, and **it is explicitly out of v1 scope.** Nothing in PR1 through PR7
builds toward it beyond the taxonomy the grader already enforces.

**Why deferred.** It breaks the portfolio's zero-runtime-model-calls rule. Every other DRC
surface is a filter over frozen JSON. A practice mode is a live model in a conversational loop
with a parent, producing unbounded text, and scoring that text against a rubric. That is a
certified-judge build, not a content build. Three specific costs:

1. **The child simulator is unbounded generation to a parent.** It needs a reject-hold set and a
   fail-closed posture, and it needs the same red-team treatment the Navigator's terminal
   classes got.
2. **The rubric is a judge, and an unvalidated judge is worse than no score.** Scoring a
   parent's prompt as a weak prompt is a strong claim. It requires a frozen rubric certified
   against Matthew's own hand labels before any parent sees a score, matching the Child Evidence
   frozen-judge pattern.
3. **The failure mode is emotional, not technical.** A parent told they prompted badly, by a
   machine, about their own child, is a churn event and a brand event. The bar is higher than
   for content.

**What must ship first.** The Language Milestone Coach. LMC is the portfolio's first
certified-judge build and it establishes the pattern: a frozen rubric, a gold label set, a judge
validated against Matthew's own labels before the score is trusted, a reject-hold set, and a
fail-closed runtime. DRC v2 follows that pattern rather than inventing a second one.
**Concretely: no DRC practice-mode work begins until LMC's judge certification is green in CI
and has survived one production cycle.**

**Scope fence.** If practice mode appears in a DRC PR before then, it is scope creep and the PR
is rejected. The v1 course teaches the parent to self-check against the same five mechanical
signatures the grader uses (§2.3), which is the cheap 80 percent of what practice mode would
deliver, with none of the risk.

---

## 13. Risks and open decisions (Matthew to rule)

1. **G1 citation verification.** Eleven seeds in §6.2 are unverified. Nothing compiles until
   they are checked against the papers. Effect sizes especially: the course currently states
   none, and every slot is a placeholder that hard- fails the compiler. Schedule this before
   PR2.
2. **G3 legal read of the IP control.** §7.4 is an engineering control, not a legal opinion. A
   real lawyer reads it and the gold deck before PR4 merges.
3. **The denylist source.** Layer 1 and Layer 3 both need a maintained list that only Matthew
   can supply. Who assembles it, how large it starts, and how it is reviewed are open.
   Recommendation: start small, roughly 100 titles, and treat Layer 2's quotation ban as the
   workhorse.
4. **BPG bundle pricing.** §10 proposes a bundle price for BPG buyers. D7 locks $29 standalone
   and says nothing about bundles. Matthew's call.
5. **Four bands or five.** §1.3 argues for four. If beta shows the 24-36m band splitting,
   revisit that band only.
6. **The wordless book type.** It is the most distinctive type and the hardest to compile
   against, since Completion barely applies. If its reject rate exceeds 40 percent in the pilot
   cell, consider dropping it to v1.1 rather than lowering its floors further.
7. **Course platform slip.** If BPG PR1 slips past the card library, confirm the decision to
   ship cards alone and hold the SKU rather than build a second course runtime.
8. **The 40 percent return-rate target** in §11 is a guess, not a benchmark. It is labeled as a
   product decision and should be reset after 60 days of real data rather than defended.

---

## 14. Definition of done (v1 launch)

- All PRs merged by Matthew. Cert report green. **G1, G2, and G3 all cleared.**
- Every coverage cell at or above its floor, or declared `N/A` with a reason.
- The IP detector is green across the full artifact, and the ten planted-quote fixtures still
  fail. Zero override entries on the allowlist, or every entry carries a written justification
  and initials.
- X1 type exclusivity holds across every shipped card.
- The free `animal × 24-36m` deck is reachable and printable logged out.
- A beta cohort of at least 10 families prints one deck and uses it, with zero enrichment-lint
  sightings in the wild and zero reports of a card naming a book.
- Grayscale print check passes on a real home inkjet, not only in the renderer.
- The mini-course ships at $29 on the BPG course platform, with the written version complete and
  standing alone, per D5.
- The Weekly Reading Plan slot renders for every band and week index.
- Telemetry flowing, including the IP detector's per-layer reject rate.
