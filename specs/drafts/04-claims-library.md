# Evidence-Graded Claims Library: Build Spec (draft)

> **Status: draft for domain-expert review. Not approved. Nothing here is built.**
> This document proposes a grading framework, a production pipeline, and a
> publishing surface. Every grade level, every rubric threshold, and every launch
> claim in it is a proposal awaiting Matthew's read. No claim in this document has
> been through the pipeline it describes, and no grade appearing here is a verdict.

Inherits `specs/drafts/00-CONVENTIONS.md`: the fourteen-section skeleton, the
brand tokens, the citation states, the no-DDL rule, and the no-em-dash rule.
Deviations from the conventions are recorded in §0.6.

Codename: `claims`. Product name is Matthew's call. Candidates: **The Claims
Library**, **Graded**, **What the Evidence Says**.

---

## 0. Product summary

**One-liner:** Parenting claims stated the way a parent actually says them, each
graded on two axes (how strong the evidence is, and how much the field agrees),
with a free public summary that ranks in search and a member breakdown that
shows the working.

**Positioning:** the consumer edition of the Child Evidence honesty framework.
The product's differentiator is not that it answers parenting questions. It is
that it tells you how much to trust the answer, including when the honest answer
is that nobody knows yet.

**Target segment:** the curiosity track from plan §4.1. Skeptical, search-arriving
parents who have already read four contradictory blog posts and want to know who
is right. This is deliberately not the worry track: a parent in an anxiety moment
gets routed to the Navigator, not to a literature grading.

**Architecture thesis:** the same one that shipped Number Path. Content is drafted
offline by a model, graded mechanically, approved by a human, then frozen and
published. Runtime is a static/ISR page render from an approved row. Zero runtime
model calls on any claim surface, no exception scoped.

**This product IS the SEO engine** (plan §4.2, §5.2). Every architectural decision
below that looks like an SEO decision is a first-order product decision, not a
marketing garnish.

### 0.1 v1 scope

| In | Out (v1.x or never) |
|---|---|
| 25 to 40 graded claims across eight domains | Personalized "claims for your child" feeds (v1.2) |
| Two-axis grade with published rubric | User-submitted claims (v1.1, moderated) |
| Free public summary on every claim | Comments or community grading (**never**: the grade is authored, not crowdsourced) |
| Member-gated full breakdown | Numeric confidence scores or percentages (**never**: see §1.5) |
| Eight domain hub pages with graded index tables | Medical advice, dosing, or treatment recommendations (**never**) |
| The Evidence Map (two-axis shareable grid) | Grading of an individual child's situation (**never**: that is the Navigator's job and it is not a grading job) |
| Review-due tracking and freshness badges | Automated re-grading on new literature (**never** without a human pass) |
| Cross-links to Navigator domains and activities | Real-time literature monitoring (v2, and only as a queue-filler, never as a publisher) |

### 0.2 The one success metric and the one rework trigger

- **Success metric:** claims indexed and holding position. 25 or more claims
  indexed within 30 days of the public-pages PR, with Search Console impressions
  trending up by week 8. Per plan §4.4, judge trajectory, not absolutes.
- **Rework trigger:** if more than 20% of dossiers are rejected by Matthew at the
  verification step for reasons the mechanical grader should have caught, the
  grader is wrong, not the drafter. Stop drafting, fix §7, resume.

### 0.3 What this product is not allowed to become

A claims library that grades everything eventually grades things it should not.
Three standing prohibitions, enforced at the backlog gate (§2.3):

1. No claim whose honest resolution requires clinical judgment about a specific
   child.
2. No claim about a named commercial product's efficacy where the only evidence is
   manufacturer-funded. The gradeability score handles most of this; the gate
   catches the rest.
3. No claim framed so that either grade outcome shames a parent for a choice
   already made. Claims are reframed at intake, not softened at publication. See
   §3.4.

### 0.5 What already exists (verified against the repo, 2026-07-19)

This section exists because it is tempting to describe this product as an
assembly of existing parts. It is not. **Most of this product is not built.**
Here is the accurate accounting.

**Exists and is directly reusable:**

| Asset | Path | What it gives this product |
|---|---|---|
| Shared review queue | `nsc/supabase/migrations/0006_activity_library.sql`, `nsc/app/admin/` | The `review_items` table already enumerates `'claim'` as a legal `content_type`, alongside activity, navigator_node, guidance_block, prompt_card. The queue table, its RLS posture (service-role only, admin allowlist via `ADMIN_EMAILS`, 404 rather than 403 for non-admins in `nsc/lib/admin.ts`), the pending/approved/rejected workflow, `grader_report` storage, and `reject_reason` all exist and work. |
| Citation registry | `corpus/citations.json` | 11 registered organizational sources, all `verified: true`, plus a `claims` array recording replication status (`supported` / `contested` / `attenuated` / `failed-replication`) for six specific findings. This is the closest existing thing to a graded claim and it is the conceptual seed of this product. |
| Corpus certifier | `scripts/corpus/certify.mjs`, `corpus/manifest.json` | A working, deterministic, content-hashed cert artifact with hard gates on citation resolution. Manifest currently green: 304 cards, 11 registered sources, 3 contested claims, 6 library entries. |
| Library pipeline | `library/README.md`, `library/entries/*.json`, `tools/library/grader.mjs`, `scripts/build-library.mjs` | The closest working analogue of the claims pipeline: JSON source entries, a mechanical grader with a shared banned-lexicon check imported from `evals/lib/checks.mjs`, a Flesch-Kincaid reading-grade gate, a planted-violation selftest in CI, and a draft/approved status flip that gates publication. Six entries exist, all `status: "draft"`. |
| Shared lint lexicon | `evals/lib/checks.mjs` | One behavioral standard already shared between the live AI and published library pages. The claims grader imports the same module rather than forking a second lexicon. |
| Eval discipline | `evals/README.md`, `evals/behavioral-spec.md`, `evals/gold/`, `evals/labels/` | The judge-validation-before-trust pattern, with a human-labeled validation set requiring 90% per-dimension agreement. Directly transferable to any LLM-assisted step in §6. |
| Article + FAQPage schema emitter | `scripts/build-library.mjs` | Already emits `Article` + `FAQPage` + `BreadcrumbList` JSON-LD on library pages. The claims schema work is an extension, not a start. |
| Navigator domain vocabulary | `keel/artifacts/navigator/trees.v1.json` | Eight live domains: `talking`, `understanding`, `walking_movement`, `hands_fine_motor`, `play`, `social_eye_contact`, `hearing_responding`, `behavior_regulation`. These are the cross-link targets in §10. |
| Activities table | `nsc/supabase/migrations/0006_activity_library.sql` | `activities` rows with slug, domains, age range, `is_free`. The cross-link target for the 2 to 3 activity links per claim page. |
| Vetting log | `marketing/carousels/daily-log.md` | 17 lines. Two approved topics, three rejected findings (30-million-word gap, marshmallow test, helper/hinderer). This is the informal practice this product formalizes, and it is a log, not a system. |

**Does not exist. This is the build.**

- **No claim-grading code of any kind.** A repository-wide search for
  `grade_strength`, `grade_consensus`, `claims_library`, or any equivalent returns
  nothing outside the portfolio plan itself.
- **No `claims` table.** The review queue anticipates the content type; nothing
  consumes it. `nsc/app/admin/actions.ts` hard-rejects any item whose
  `content_type` is not `'activity'` with `?error=unsupported-type`.
- **No grading rubric.** The four replication statuses in `corpus/citations.json`
  are a one-axis vocabulary about single findings. The two-axis framework in §1
  is new work.
- **No dossier format, no dossier grader, no retrieval layer.** The Consensus MCP
  retrieval step in the plan is unwired.
- **No claim pages, no hub pages, no Evidence Map, no verdict badge, no gate on
  claim content, no review-due cron, no freshness badge.**
- **No DOI handling anywhere in the repository.** Existing citations are prose
  strings plus URLs. DOIs appear only inside `keel/artifacts/shared/floor_sources.v1.json`
  as literal fields on a handful of sources, with no validation.
- **No claims exist.** Zero. The launch set in §4.4 is a proposal.

Honest summary: this product reuses a review queue, a lint lexicon, a reading-level
check, a schema emitter, and a cert-report pattern. It builds a grading framework,
a dossier pipeline, a claims data model, five page types, and a visualization.
Call it 20% reuse by effort.

### 0.6 Deviations from the shared conventions

- The **enrichment lint** applies with one documented carve-out (§3.5): the strings
  `insufficient` and `contradicted` are grade labels in this product and must be
  permitted in grading context while remaining banned in child-directed copy.
- This product is not governed by `keel/`. It touches no instrument, no threshold,
  and no terminal class in the Communication Snapshot or the Navigator, so the
  floors grader is unaffected. It must nonetheless never contradict a floor: see
  §3.6.

---

## 1. Domain model: the two-axis grading framework

This is the scientific core of the product and it carries the whole brand. A
grade that cannot be reproduced by a second reader from the rubric alone is not a
grade, it is an opinion with a badge on it.

### 1.1 Why two axes

One axis collapses two genuinely different failure modes. "The evidence is weak"
and "the experts disagree" are not the same statement, and parents are misled by
products that merge them. A claim can rest on strong evidence that the field
still argues about (measurement disputes, generalizability disputes), and a claim
can enjoy near-total professional consensus resting on limited direct evidence
(much of infant safety guidance, where the trial that would settle it is
unethical). The two-axis grid makes both cases legible instead of averaging them
into a misleading middle.

**Named tradeoff (decided):** a single composite score would be far easier to
render, sort, and share. It also reintroduces exactly the false precision the
product exists to refuse, and it makes the "strong evidence, contested field"
cell invisible. Two axes win. The cost is a harder visual design problem, solved
in §9.4.

### 1.2 Axis one: `grade_strength`

How much weight the underlying evidence can bear, judged on the body of evidence,
not the best single study.

| Level | Operational rubric (all conditions must hold) | Parent-facing gloss |
|---|---|---|
| `strong` | At least one systematic review or meta-analysis of randomized trials, **or** at least two independent well-powered randomized trials with concordant direction; plus no credible contradicting body of evidence; plus effects that survive the obvious confounds; plus at least one replication by a group unaffiliated with the originating lab. | "This is about as settled as parenting research gets." |
| `moderate` | At least one well-conducted randomized trial **or** a systematic review of consistent observational studies with plausible mechanism and dose-response; plus no major unresolved confound that would plausibly reverse the direction; plus at least one independent replication of the direction, though not necessarily the magnitude. | "The evidence points one way, and it could still shift." |
| `limited` | Evidence exists and points somewhere, but rests on small samples, single labs, short follow-up, observational designs without confound control, or surrogate outcomes standing in for the outcome parents care about. | "There is some evidence. It is thin." |
| `insufficient` | The question has not been studied adequately enough to answer. Includes the case where studies exist but none measure the thing the claim asserts. **This is a real answer and the product treats it as one**, not as a failure to find something. | "Nobody has actually studied this well enough to say." |
| `contradicted` | The body of evidence points **against** the claim: a well-powered trial or meta-analysis finds no effect or the opposite effect, or a foundational finding failed to replicate at adequate power. | "The evidence does not support this, and here is what it shows instead." |

**Mandatory downgrade rules.** These are mechanical, checked at §7, and exist so
the grade cannot drift up under enthusiasm:

1. If the only supporting trials are funded by a party with a commercial interest
   in the outcome, the grade is capped at `limited`.
2. If the claim's key finding has a documented failed replication at adequate
   power, the grade is capped at `limited` regardless of the original effect size,
   and `contradicted` must be actively considered in the dossier.
3. If the effect is established only on a surrogate outcome and the claim asserts
   the real-world outcome, cap at `moderate`.
4. If the largest single study drives more than 70% of the pooled weight, cap at
   `moderate`.
5. If the claim is a negative ("X does not cause Y"), `strong` requires evidence
   powered to detect an effect of the size parents care about. Absence of evidence
   grades `insufficient`, never `contradicted`.

Rule 5 is the one most likely to be gotten wrong by a drafting model and it is the
one with the most reputational downside. It gets a dedicated red-team fixture.

**Named tradeoff (decided):** an established instrument such as GRADE would give
this axis external legitimacy and a large body of published guidance. It would
also import a five-level clinical vocabulary that reads as hospital paperwork to a
parent at 2am, and it is designed for treatment recommendations rather than
practice claims. The rubric above is GRADE-informed in its logic (risk of bias,
inconsistency, indirectness, imprecision, publication bias) but stated in the
product's own plain language. GRADE-informed wins over GRADE-branded. The
methodology page (§9.5) states this relationship openly rather than implying
formal GRADE compliance.

### 1.3 Axis two: `grade_consensus`

How much the relevant professional field agrees, judged independently of how good
the evidence is. Assessed against current position statements from major
professional bodies, current review-article framing, and whether active
disagreement appears in the recent literature.

| Level | Operational rubric | Parent-facing gloss |
|---|---|---|
| `consensus` | Major professional bodies whose remit covers the claim agree, and no substantial dissent appears in the recent peer-reviewed literature. Dissent that exists is confined to a small number of authors without a body of supporting work. | "Essentially everyone in the field agrees." |
| `majority` | Most of the field agrees and at least one professional body has taken a position, but a substantive minority position exists in the literature with its own supporting work. | "Most researchers agree, and there is a real minority view." |
| `divided` | The field is genuinely split, with active disagreement in recent literature, competing position statements, or a live methodological dispute that determines the answer. | "Researchers genuinely disagree about this." |
| `fringe` | The claim is advocated primarily outside the mainstream of the relevant field, with little or no support in peer-reviewed literature or professional guidance. | "This is not a mainstream position among researchers." |

**Consensus is assessed independently of strength, always.** The grader
(§7.2) rejects a dossier whose consensus justification argues from the evidence
quality rather than from the field's stated positions. That circularity is the
single most common way a two-axis framework silently collapses into one axis.

**Which bodies count** is enumerated per domain, not left to the drafter, and the
enumeration is versioned as part of the rubric artifact. The organizational
sources already registered and verified in `corpus/citations.json` (AAP
HealthyChildren, CDC Learn the Signs Act Early, ZERO TO THREE, NAEYC,
Pathways.org, Child Development Institute, and the Harvard Center on the
Developing Child concept pages) are the starting registry. Additions require the
same registration and verification step, so consensus assessment inherits the
existing corpus gate rather than inventing a second one.

### 1.4 The grid, and which cells are interesting

Twenty cells. They are not equally populated and they are not equally useful.

| | consensus | majority | divided | fringe |
|---|---|---|---|---|
| **strong** | Settled. Low editorial value, high search value. | The interesting cell: good evidence, live argument. | Rare and important: usually a measurement dispute. | Near-empty. Investigate the grade if it lands here. |
| **moderate** | Common. The workhorse cell for practice guidance. | Common. | Common and high-value: "here is why you keep reading opposite things." | Uncommon. |
| **limited** | Common in infant safety: precaution outruns evidence, legitimately. Say so plainly. | Common. | Common. | Common. |
| **insufficient** | "Everyone agrees, and nobody has checked." The most under-served cell on the parenting internet. | Uncommon. | Common. | Common. |
| **contradicted** | The debunk cell. High share value, highest care required (§3.4). | Uncommon. | Uncommon. | The classic pseudoscience cell. |

The launch set (§4.4) is deliberately weighted toward cells that carry editorial
value, not just cells that are easy to fill. A library of twenty `moderate` plus
`majority` claims teaches a parent nothing about how evidence works.

### 1.5 What the grade explicitly is not

- Not a probability. No percentages, no confidence intervals on the grade itself,
  no "87% confident." Banned in copy and checked at §7.
- Not a recommendation. The grade describes the evidence; the practical bottom
  line is a separate, clearly labeled section that may say "your call."
- Not stable. Every grade carries `last_reviewed` and `review_due` and renders a
  freshness state (§9.3). A grade with no visible date is a claim about eternity.
- Not transferable to a specific child. Standing footer on every claim page, static
  and never triggered, per conventions §5.

### 1.6 The eight domains

The primary routing key. Domains are fixed at launch; adding one is a product
decision with hub-page, sitemap, and cross-link consequences.

| Domain | Scope | Navigator cross-link target | Notes |
|---|---|---|---|
| `sleep` | Sleep training, co-sleeping, night weaning, regressions, safe sleep | `behavior_regulation` | Highest anxiety, highest search, most contested. Handle with §3.4 care. |
| `feeding` | Solids introduction, baby-led weaning, allergens, picky eating, milk supply | none direct | Nutrition claims sit closest to the medical line. §0.3 gate is tightest here. |
| `screens` | Time thresholds, content type, video chat, background TV, co-viewing | `talking` | Where "the evidence is thinner than the guidance" is most often true. |
| `discipline` | Timeout, praise, consequences, gentle-parenting claims, tantrum response | `behavior_regulation` | Ideologically loaded. Grade the evidence, never the parenting philosophy. |
| `language` | Bilingual exposure, reading aloud, baby signs, word-gap claims, TV-and-language | `talking`, `understanding` | Matthew's home turf. Highest confidence, fastest verification. |
| `milestones` | Walking ranges, teething, tummy-time dosage, crawling skipping, pointing | `walking_movement`, `hands_fine_motor`, `play`, `social_eye_contact` | Adjacent to the worry track. Routing rules in §10.3 are strict. |
| `pregnancy_postpartum` | Prenatal exposures, postpartum recovery claims, breastfeeding claims | none | Highest liability. Requires the §0.3 gate plus an explicit medical-adjacency flag. |
| `products_gear` | Walkers, jumpers, sleep positioners, "developmental" toys, monitors | `walking_movement` | The commercial-funding downgrade rule (§1.2 rule 1) fires most often here. |

---

## 2. The core loop: backlog, scoring, and the queue

### 2.1 What the product asks

Not of the user. Of Matthew. The core loop of this product is an editorial queue,
not an instrument. The question the system answers is: **which claim gets the next
verification hour?**

### 2.2 Priority scoring

`priority_score = log10(monthly_searches) x anxiety_weight x gradeability`

| Input | Source | Range |
|---|---|---|
| `monthly_searches` | Keyword tool estimate for the claim's head term, recorded with its date and tool. Floor of 10 so the log stays defined and a zero-volume claim does not zero the product. | integer |
| `anxiety_weight` | Matthew's judgment, 1 to 3. How much distress the parent searching this is in. 1 = curious, 2 = worried, 3 = up at 3am. | 1, 2, 3 |
| `gradeability` | Matthew's judgment, 1 to 3. How gradeable the literature is. 1 = thin and messy, 2 = gradeable with work, 3 = clean body of evidence with a review to anchor on. | 1, 2, 3 |

Matthew sets the two subjective weights when the claim enters the backlog. The
queue sorts itself thereafter. Both weights are stored with the entering date so
that re-weighting is visible as a change rather than silent.

**Named tradeoff (decided):** multiplying anxiety into priority pushes
high-distress topics to the top of the publishing queue, which is exactly where a
careless library does damage. The alternative, sorting on search volume alone,
produces a library that answers easy questions well and hard questions never.
Multiplication wins, and the risk is handled downstream: high-anxiety claims get
the §3.4 framing rules and the Navigator handoff, not a lower rank.

**A `gradeability` of 1 is not a rejection.** A thin literature is often the most
valuable claim in the library, because `insufficient` is the answer no one else
publishes. Gradeability scores the cost, not the worth. If a claim scores 1 on
gradeability and 3 on anxiety, it belongs in the launch set, and the spec says so
in §4.4.

### 2.3 The intake gate

Before scoring, every candidate passes four checks. Failing any one removes it
from the backlog with a recorded reason.

1. **Statable as a claim.** It must be phrasable as a declarative sentence a parent
   would recognize as something they have been told. "Is screen time bad?" is a
   topic. "Screen time before age 2 harms language development" is a claim.
2. **Falsifiable in principle.** There must be an observation that would change the
   grade. The dossier is required to state it (§6.3, "what would change this").
3. **Not clinical.** Per §0.3.1.
4. **Not shaming under either outcome.** Per §0.3.3. Reframe at intake or drop.

### 2.4 Capacity, keyed to D4

`keel/DECISIONS.md` D4 sets the tiers, and this spec does not invent a number
outside them:

| Matthew's verification capacity | Claims per month | Alongside |
|---|---|---|
| 4 hrs/wk | 8 | 2 activity batches |
| 2 hrs/wk | 4 | 1 activity batch |
| below 2 hrs/wk | **0. Claims pause.** | Tool-artifact review only |

Consequences the rest of this spec must respect:

- The 25 to 40 claim launch set is **3 to 10 months of verification** at the two
  supported tiers. It is not a sprint. Build sequencing (§12) therefore ships the
  pages before the full set exists, and the hub pages must be designed to look
  intentional at 8 claims, not just at 40.
- No copy anywhere on the site promises a publishing frequency. The claims digest
  email (plan §4.2, "one graded claim per week") **exceeds even the 4 hrs/wk tier**
  and must be renamed or repositioned as a digest of the library rather than a
  promise of weekly new claims. Flagged as open decision §13.2.
- The drafting side is not the constraint and must not be run as though it were.
  Over-drafting produces a queue of stale dossiers whose literature moved before
  Matthew reached them. Drafting runs at most two months ahead of verification.

---

## 3. Output structure and copy safety

### 3.1 The public summary (free, always)

Roughly 200 words, and it is the whole SEO surface. Structure, in fixed order:

1. **The claim, verbatim**, as a parent says it.
2. **The verdict line**: one plain sentence, generated from the grade pair but
   authored, not templated. A templated verdict line reads as machine output and
   destroys the E-E-A-T signal the product depends on.
3. **The two badges** with their plain-language glosses.
4. **Two to four sentences of substance.** This must contain a real answer. A
   summary that withholds the answer to force the gate is the single fastest way
   to lose the trust this product sells. See §3.3.
5. **The freshness line**: "Last reviewed {month year}."
6. **The static footer** (conventions §5), never triggered, routing to the
   pediatrician.

### 3.2 The gated breakdown (member)

1. **What the research actually did.** Study designs in plain language, sample
   sizes, populations, what was measured.
2. **Effect sizes translated.** Never a bare Cohen's d. "About the difference
   between X and Y" or "roughly one child in twenty."
3. **Where it gets shaky.** Confounds, funding, replication status, generalizability.
4. **What would change this grade.** Required, and it is the section that proves
   the grade is falsifiable rather than an opinion.
5. **The practical bottom line.** Explicitly allowed to say "this is a values call,
   not an evidence call."
6. **Sources**, every one with a DOI where one exists, rendered as a citation list.
7. **Related claims, one Navigator domain, 2 to 3 activities** (§10.2).

### 3.3 The gate placement rule

**Named tradeoff (decided):** the gate could sit after the verdict badge alone,
maximizing conversion pressure, or after a genuinely useful free answer, maximizing
trust and ranking. Trust wins, for three converging reasons: a thin free summary
ranks worse (thin content, high bounce), it burns the exact brand asset the
product is built on, and plan §4.1 forbids monetizing the anxiety moment. The
free summary must be independently useful. The member gate sells the working, not
the answer.

Operational rule, checked mechanically at §7.2: the public summary must contain
the grade, the verdict, and at least one substantive statement about the evidence.
A summary whose final sentence is a cliffhanger fails cert.

### 3.4 Copy safety on `contradicted` grades

A `contradicted` grade will frequently land on something a reader has already
done, bought, or believed. The grade is about the evidence and must never read as
a judgment of the parent.

Binding rules, mechanically checked where possible:

- No second person in a `contradicted` verdict line. Grade the claim, never "you."
- No mockery vocabulary anywhere in claim copy: `myth`, `debunked`, `nonsense`,
  `snake oil`, `pseudoscience`, `fell for`, `waste of money`. Banned by regex.
  (`pseudoscience` remains permitted in the methodology page, which is not
  child-directed or parent-directed claim copy; the lint is scoped by surface.)
- Every `contradicted` claim must carry a **"what to do instead"** sentence in the
  free summary. A debunk with no replacement leaves the parent worse off.
- Where a claim is contradicted but the practice is harmless, the copy says so
  explicitly. "It does not do what people say. It also does not hurt anything."
- No `contradicted` claim may be the hero of a social asset without the "what to
  do instead" line traveling with it.

### 3.5 Lint layers

**The enrichment lint** (conventions §5) applies to all claim copy, with one
scoped carve-out. The grade labels `insufficient` and `contradicted` are product
vocabulary and must be permitted in three positions only: the badge component, the
verdict line, and the methodology page. Everywhere else in claim prose, and
everywhere in any child-directed copy the claim page links to or renders, the
enrichment lint applies unmodified. The allowlist is positional, not global, and
the grader carries a fixture proving that moving `insufficient` from a badge into
a sentence about a child fails the lint.

The banned terms from conventions §5 (`delayed`, `behind`, `deficit`, `disorder`,
`diagnos*`, `at risk`, `red flag`, `abnormal`, `percentile`, `normal range`,
`should be able to`, `by now`, `falling`, `struggl*`, `gifted`, `advanced for`,
`ahead of`) apply in full to claim prose. This is workable because a claims page
describes evidence, not a child. Where a claim's own text contains a banned word
(a parent-stated claim may legitimately contain "behind"), the claim text field is
exempt and the exemption is recorded per claim with Matthew's sign-off, not
granted automatically.

The lexicon is imported from `evals/lib/checks.mjs`, not reimplemented, so the AI,
the library pages, and the claims pages are graded against one standard.

**Reading level:** grade 8 or below on the public summary, mechanically checked
(Flesch-Kincaid, the same check `tools/library/grader.mjs` already runs at grade 9
for library entries). The gated breakdown is permitted grade 10 because it is
doing genuinely harder work, and this is a deliberate exception recorded here
rather than a drift.

### 3.6 Non-contradiction with the safety keel

This product is not governed by `keel/` and changes no instrument. It can still do
harm by publishing a claim whose bottom line would talk a parent out of an action
a Navigator floor exists to trigger. Binding rule: no claim in the `milestones`,
`language`, or `sleep` domains may publish a practical bottom line that
discourages seeking evaluation. A claim page that touches a Navigator domain
renders the Navigator handoff module, not a reassurance. Checked as a static rule
at §7.2 against the eight domain ids in `keel/artifacts/navigator/trees.v1.json`.

---

## 4. Content library

### 4.1 The claim record (field list, not DDL)

Prose description with annotated fields, per conventions §3.

- `id`, `slug`: `slug` is the URL segment and is stable forever. A regrade never
  changes a slug; a reframe that changes the slug requires a redirect.
- `domain`: one of the eight in §1.6.
- `claim_text`: the claim as a parent states it. The exemption surface for §3.5.
- `grade_strength`: one of `strong`, `moderate`, `limited`, `insufficient`,
  `contradicted`.
- `grade_consensus`: one of `consensus`, `majority`, `divided`, `fringe`.
- `verdict_label`: one authored plain sentence.
- `summary_public`: roughly 200 words of MDX. Always free. The SEO surface.
- `body_gated`: full MDX breakdown per §3.2.
- `sources`: a list of objects, each carrying `doi` (nullable only where the source
  genuinely has none, such as a professional body's position page), `citation` as
  a full formatted string, `role` from a controlled vocabulary
  (`primary_trial`, `systematic_review`, `meta_analysis`, `replication`,
  `failed_replication`, `position_statement`, `background`), and `registry_id`
  linking to `corpus/citations.json` where the source is an organizational one
  already registered.
- `grade_justification_strength`, `grade_justification_consensus`: two separate
  prose fields, deliberately separate so the grader can check §1.3's
  non-circularity rule.
- `what_would_change_it`: required, non-empty.
- `related_claim_ids`, `navigator_domain`, `activity_slugs`: cross-link fields,
  cardinality enforced at §7.2.
- `priority_score`, `anxiety_weight`, `gradeability`, `monthly_searches`,
  `searches_measured_on`: the backlog fields, retained after publication so the
  queue's reasoning stays auditable.
- `last_reviewed`, `review_due`, `review_cadence_months` (12 default, 6 for
  fast-moving), `status` (`backlog`, `drafting`, `graded_pending_verification`,
  `approved`, `published`, `retired`), `version`.
- `claim_text_lint_exemption`: nullable, records Matthew's per-claim sign-off when
  the claim text itself contains an otherwise-banned word.

### 4.2 The rubric artifact

`claims.rubric.v1.json`: the §1.2 and §1.3 tables, the downgrade rules, and the
per-domain enumeration of which professional bodies count for consensus. It is a
frozen, versioned, hash-certified artifact like every other artifact in this
repository. **The rubric is versioned because a rubric change silently regrades the
whole library.** Every published claim records the rubric version it was graded
under. A rubric bump does not regrade anything automatically; it flags every claim
graded under the old version for review, which is a queue event, not a publish
event.

### 4.3 Worked examples

Two examples follow. Read the framing on each carefully.

**Example A. Grounded in the existing verified registry.**

The finding known as the "30 million word gap" is recorded in
`corpus/citations.json` with `status: "contested"`, citing Hart and Risley (1995)
with a failed replication by Sperry, Sperry and Miller (2019), and a standing
instruction: do not present as settled, emphasize interaction quality over word
count. That registry entry is `verified: true` in the corpus pool.

This is a real, verified basis for a `language` domain claim, and it is the
closest thing in the repository to a graded claim today. Under §1.2 rule 2 (a
documented failed replication at adequate power caps the grade at `limited` and
requires `contradicted` to be actively considered), a claim stated as "how many
words you say to your baby determines their vocabulary" would enter the pipeline
with a strength ceiling already set by rule, before any drafting happens. That is
the rubric doing its job.

**What this example does not do is state the verdict.** The grade pair, the
verdict line, and the source set are produced by §6, not by this spec. Matthew's
grade is the grade.

**Example B. Format only. Grade and sources are placeholders.**

> **Claim:** `{claim as a parent states it}`
> **Verdict:** `{one authored plain sentence}`
> **Badges:** `{grade_strength}` x `{grade_consensus}`
> **Summary:** `{~200 words, must contain a real answer}`
> **Last reviewed:** `{month year}`

This block is illustrative of the **format** only. It carries no grade because
inventing one would be exactly the failure this product exists to prevent. No
worked example in this spec, in any PR description, in any fixture, or in any
marketing asset may present an ungraded claim as if it had a verdict. Test
fixtures use nonsense claim text (`"widgets improve foo"`) with obviously fake
placeholder sources so a fixture can never be mistaken for content, and the
grader carries a check that no published claim's sources contain a
fixture-namespace DOI.

### 4.4 The launch set: 25 to 40 claims

The plan names ten. Those ten are reproduced below as given. The remainder are
**proposals from this spec** and are marked as such. Every entry, named or
proposed, is a candidate only: none has been scored, drafted, graded, or verified,
and no grade is asserted for any of them here.

**From the plan (10, given):**

| # | Claim area | Domain |
|---|---|---|
| 1 | Sleep training and attachment | `sleep` |
| 2 | Screen time thresholds | `screens` |
| 3 | Baby-led weaning versus purees | `feeding` |
| 4 | Tummy time dosage | `milestones` |
| 5 | Pacifiers and speech | `language` |
| 6 | Bilingual "confusion" | `language` |
| 7 | Sleep regressions | `sleep` |
| 8 | Teething symptom claims | `milestones` |
| 9 | Milk supply claims | `feeding` |
| 10 | Walkers and jumpers | `products_gear` |

**Proposed by this spec (20, all proposals requiring Matthew's approval at intake):**

| # | Claim area | Domain | Why proposed |
|---|---|---|---|
| 11 | Reading aloud and later vocabulary | `language` | High volume, Matthew's strongest verification speed, likely a clean grade. |
| 12 | Word count input and vocabulary outcomes | `language` | The registry already flags this contested (§4.3 Example A). Rule-capped before drafting. |
| 13 | Baby sign language and speech onset | `language` | Very high search, heavily marketed, commercial-funding rule likely fires. |
| 14 | Video chat as an exception to screen rules | `screens` | Under-served; the nuance is the product. |
| 15 | Background TV and language exposure | `screens` | Different mechanism from screen time, commonly conflated. |
| 16 | "Educational" apps for under-2s | `screens` | `products_gear` overlap; commercial funding endemic. |
| 17 | Co-sleeping risk framing | `sleep` | Highest care required. Precaution-outruns-evidence cell is the honest one, and §0.3.3 reframing at intake is mandatory. |
| 18 | Night weaning and sleeping through | `sleep` | 3am search volume. |
| 19 | Timeout and later behavior | `discipline` | Ideologically loaded; grade the evidence only. |
| 20 | Praise type and motivation | `discipline` | A widely cited literature with real replication questions. |
| 21 | Gentle parenting and outcomes | `discipline` | Extremely high volume, likely `insufficient`, which is the point. |
| 22 | Early allergen introduction | `feeding` | Closest to the medical line; §0.3 gate must be applied explicitly. |
| 23 | Picky eating and forced tasting | `feeding` | High anxiety, gradeable. |
| 24 | Crawling as a prerequisite for walking | `milestones` | Common belief, gradeable, low harm either way. |
| 25 | Walking age and later ability | `milestones` | Directly adjacent to the worry track; §3.6 handoff rule applies. |
| 26 | Pointing and later language | `milestones` | Cross-links an existing library entry (`my-1-year-old-isnt-pointing`). |
| 27 | Baby monitors that track vitals | `products_gear` | Commercial funding rule; consumer-safety relevance. |
| 28 | "Developmental" toy claims | `products_gear` | Likely a domain-level pattern claim rather than one product. |
| 29 | Prenatal audio exposure and later ability | `pregnancy_postpartum` | Classic `fringe` cell; high share value. |
| 30 | Postpartum recovery timeline claims | `pregnancy_postpartum` | High anxiety, under-served, medical-adjacency flag required. |

Thirty candidates against a 25 to 40 target leaves deliberate slack: intake
(§2.3) is expected to reject some, and the `divided` and `insufficient` cells
should be filled by claims discovered during drafting rather than pre-selected.

**Cell coverage target for the launch set** (a cert check at §7.3, not a
suggestion): at least three claims must land in `insufficient` and at least two in
`contradicted`, or the library is quietly biased toward claims with tidy answers.
This target constrains the *set*, never an individual grade. If Matthew's honest
grading does not produce that spread, the correct response is to add candidate
claims to the backlog, never to adjust a grade.

---

## 5. Architecture

### 5.1 Content as compiled, human-approved artifact

The Number Path pattern, applied without modification: drafted offline, graded
mechanically, approved by a human, frozen, published. Zero runtime model calls on
any claim surface. Runtime is a static or ISR page render from an approved row.

Where this product differs from Number Path: Number Path compiles a large catalog
in batch. Claims arrive one at a time, gated on human hours (§2.4). The unit of
compilation is therefore the **dossier**, not the batch, and the cert report is
per claim rather than per artifact set.

### 5.2 Artifacts

| Artifact | Contents |
|---|---|
| `claims.rubric.v1.json` | §1.2, §1.3, downgrade rules, per-domain consensus body enumeration |
| `claims.lint.v1.json` | The §3.4 and §3.5 term lists, with positional allowlist scoping |
| `claims.crosslinks.v1.json` | The compiled cross-link map (§10.2), regenerated on publish |
| `claims.cert.<slug>.v<n>.json` | Per-claim grader output. A claim renders only with a matching passing report. |

The one-invariant-everywhere rule from plan §5.1 holds: runtime refuses any
artifact whose hash lacks a passing cert report. This is already true in
`nsc/lib/artifacts.ts` and is not new work for this product beyond registering
the new artifact types.

### 5.3 Retrieval

The plan names Consensus MCP as the retrieval layer. Nothing is wired. Retrieval
is a drafting-time concern only, never a runtime one, so a retrieval outage
degrades the drafting queue and cannot affect a published page. Requirements on
whatever retrieval layer is chosen: it must return DOIs, it must expose
publication year and study design, and its output must be recorded verbatim in
the dossier so the grader can check that every cited source was actually
retrieved rather than recalled. **A source that the model produced from memory
rather than from retrieval is a hard cert failure**, and the dossier format makes
this detectable by requiring a retrieval provenance stamp per source.

### 5.4 Runtime stack

Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, as in `nsc/`. No new
infrastructure. Claim pages are static with on-demand revalidation on publish
(plan §5.2). Target LCP under 2 seconds on mobile.

---

## 6. The production pipeline

Five steps, taken from the Child Evidence discipline as the plan states it. The
model proposes, Matthew disposes.

### 6.1 Step one: backlog, scored

Per §2.2 and §2.3. Output: a scored, sorted, gated backlog row.

### 6.2 Step two: the model drafts a grading dossier

Input: the claim, the rubric artifact, and retrieved literature. Output: a
structured dossier, not prose. Required contents:

- Every retrieved source with **DOI required** where one exists, plus retrieval
  provenance per §5.3.
- Study design, sample size, population, and outcome measured, per source.
- A proposed `grade_strength` with justification citing specific sources.
- A proposed `grade_consensus` with justification citing **positions**, not
  evidence quality (§1.3).
- An explicit statement of which §1.2 downgrade rules were considered and whether
  each fires.
- The `what_would_change_it` statement.
- A draft public summary and draft gated body.

The dossier is the graded object. The published claim is derived from it.

### 6.3 Step three: the mechanical grader on the dossier

Runs with no API key, deterministic, no network. Detailed in §7.2. Output is a
pass or fail plus a machine-readable report, stored in the `grader_report` column
the review queue already has.

### 6.4 Step four: Matthew verifies and grades

Into the existing `/admin` review queue, as `content_type: 'claim'`. The queue
already accepts this type; the approval action does not yet handle it (§0.5), and
extending it is PR1.

**His grade is the grade.** The dossier's proposal is a proposal. The review
interface presents the proposed grade pair and the justification side by side with
the sources, and Matthew can accept, change either axis, or reject with a reason.
A changed grade is recorded as a disagreement, and the disagreement rate is a
first-class quality signal on the drafting step (§11).

Verification is the scarce resource (§2.4). The review interface is therefore
designed around it: one claim per screen, sources one click from the justification
they support, and a grade change requiring a typed reason so the disagreement
record is useful rather than a bare delta.

### 6.5 Step five: publish

On approval: the claim row is written, `last_reviewed` is set to today,
`review_due` is set to today plus `review_cadence_months` (12 default, 6 for
fast-moving topics, set by Matthew at approval, not inferred), the cross-link
artifact is regenerated, on-demand revalidation fires for the claim page, its
domain hub, and the Evidence Map.

A monthly cron surfaces claims whose `review_due` has passed into the same review
queue, as a distinct queue state so a due review never competes visually with a
new claim. Overdue claims render a stale freshness badge (§9.3) rather than
silently going unreviewed, which is the failure mode of every evidence site that
has ever existed.

---

## 7. Certification harness

Pattern mirror: `tools/library/grader.mjs` plus its planted-violation selftest,
and the corpus certifier's hard-gate posture.

### 7.1 Where it runs

On every dossier at enqueue time, and again at publish. A claim cannot enter the
review queue with a failing report, and Matthew cannot approve one either. The
grader is the trust boundary, so the volume of drafting never costs quality.

### 7.2 The checks

**Sourcing.**

1. Every empirical statement in the dossier resolves to a source in the dossier's
   own source list. Unsourced empirical statements are a hard fail.
2. Every source carries a DOI, or an explicit `no_doi_reason` naming why (position
   statement, book, government page).
3. DOI syntactic validity, and no duplicate DOIs presented as independent sources.
4. Retrieval provenance present on every source (§5.3).
5. Organizational sources resolve to a registered, verified entry in
   `corpus/citations.json`, reusing the existing corpus gate.

**Grade justification.**

6. The strength justification references at least **N** sources, where N is 3 for
   `strong` and `moderate`, 2 for `limited` and `contradicted`, and 1 for
   `insufficient` (where the honest justification is often a single review noting
   the absence).
7. Where a systematic review or meta-analysis exists in the retrieved set, the
   strength justification must reference at least one. Where none exists, the
   dossier must state so explicitly rather than staying silent.
8. Non-circularity: the consensus justification must cite at least one position
   statement or professional-body source and must not be satisfiable by evidence
   quality alone (§1.3).
9. Every applicable §1.2 downgrade rule is explicitly addressed.
10. Rule 5 (negative claims) has a dedicated red-team fixture set: dossiers that
    grade an absence of evidence as `contradicted` must fail.

**Language.**

11. No causal language above the claim's grade. Below `moderate`, verbs of
    causation (`causes`, `leads to`, `results in`, `prevents`, `improves`) are
    banned outside quotation of the claim itself. This is the hedging check the
    plan specifies, stated as a regex set over a grade-indexed permission table.
12. Enrichment lint per §3.5, with positional allowlist.
13. `contradicted` copy rules per §3.4, including the mandatory "what to do
    instead" sentence.
14. No probability language on the grade (§1.5).
15. Reading level: public summary at grade 8 or below, gated body at grade 10 or
    below.
16. Public summary substance check (§3.3): contains grade, verdict, and at least
    one substantive evidence statement; does not end on a cliffhanger construction.

**Structure and links.**

17. `what_would_change_it` non-empty.
18. Cross-link cardinality: at least 1 related claim (waived only while the library
    holds fewer than 4 claims), exactly 1 Navigator domain or an explicit `none`,
    2 to 3 activity slugs, all resolving to existing rows.
19. §3.6 non-contradiction: claims in `milestones`, `language`, or `sleep` render
    the Navigator handoff and carry no discouraging bottom line.
20. No fixture-namespace DOI in a published claim (§4.3).

### 7.3 Set-level checks

Run over the whole published library, not one claim:

21. Cell coverage per §4.4 at the launch gate.
22. No orphan pages: every claim receives at least 3 inbound internal links
    (plan §5.2).
23. Cross-link graph is symmetric where it claims to be, and contains no dangling
    slugs.
24. No two published claims with materially duplicate `claim_text`, normalized.

### 7.4 Selftest

A planted-violation suite in the pattern of `tools/library/selftest.mjs`: one
deliberately broken fixture per check above, all of which must fail, plus a clean
fixture that must pass. Runs in CI with no API key. A grader that has never been
proven to fail is not a grader.

---

## 8. Data model

Prose plus annotated field lists. **No DDL in this folder** (conventions §3). When
this spec is approved, the migration lands in `nsc/supabase/migrations/`, not here.

**`claims`.** One row per claim, fields per §4.1. Public read of `status =
'published'` only, matching the existing `activities` policy exactly. Writes are
service-role only, through the review queue. Indexed on `(domain, status)` for hub
pages and on `review_due` for the cron.

**`claim_sources`.** Sources normalized out of the claim row rather than left as
a JSON blob, because the grader queries across them (duplicate DOI detection at
§7.2.3, and the registry join at §7.2.5) and because a source cited by six claims
should be one row. Fields: claim id, DOI or null, `no_doi_reason`, full citation
string, `role` from the controlled vocabulary, `registry_id` nullable into
`corpus/citations.json`, retrieval provenance, ordering.

**`claim_revisions`.** Append-only. Every grade change after first publication
records the old pair, the new pair, the rubric version, the reason, and the date.
This table is the product's honesty ledger and it is publicly readable: the "this
grade changed, and here is why" module on a claim page (§9.2) reads from it. A
library that quietly regrades is a library that cannot be trusted, and making the
history public is cheap insurance against ever wanting to.

**`review_items`.** Already exists, already accepts `content_type: 'claim'`. Reused
unchanged. `payload` holds the dossier, `grader_report` holds the §7 output,
`published_id` points at the created claim row.

**Privacy.** This product holds no child data and no user-generated content. It is
the only product in the portfolio with no privacy surface beyond standard
analytics, and the analytics rules from plan §5.1 apply unchanged (IP
anonymization on, no session replay on worry surfaces, which claims pages are not
but which they may link into).

---

## 9. Screens

Mobile first. Tidepool tokens only: deep teal ink `#15393C`, brand teal `#1E5F62`,
teal-soft `#2E7A77`, aqua mist ground `#F0F5F3`, surface white, sea glass
`#CFE3DE`, exactly one warm accent, coral `#DE7356` (with `#9C4429` deep and
`#E78D6F` on dark), line `#D4E0DC`, ink-soft `#3D5A5A`. Bricolage Grotesque for
display and headline, Source Serif 4 for body. Pill controls at 48px, 14px card
radius. Anti-references from conventions §4 bind here: no gradient hero, no
hospital-blue clinical sterility, no deficit framing.

### 9.1 The verdict badge (the signature component)

Above the fold on every claim page, and the OG image, and the Pinterest card, and
the Evidence Map's plotted point. It is the product's one memorable element, so
everything else on the page stays quiet.

Composition: two stacked chips inside one bordered card. Strength chip on top,
consensus chip below, each with its label and its plain-language gloss. The card
carries a 14px radius, a `#D4E0DC` line, and a white surface on the aqua mist
ground.

**Color encoding, and the constraint that makes it hard.** The obvious design is a
red-to-green scale, and it is wrong three times over: the brand permits exactly one
warm accent, a red `contradicted` badge reads as a scolding (§3.4), and a green
`strong` badge implies a recommendation the grade does not make. The encoding is
therefore **not by valence**. It is:

- **Strength encodes as fill weight within the teal family.** `strong` renders as
  a solid `#1E5F62` fill with white text; `moderate` as `#2E7A77` fill;
  `limited` as `#CFE3DE` fill with `#15393C` text; `insufficient` as white fill
  with a `#D4E0DC` border and `#3D5A5A` text. The visual metaphor is density, not
  goodness. More evidence renders as more ink.
- **`contradicted` is the one badge that uses coral**, at `#DE7356` on white with
  `#9C4429` text, and its shape differs: it is the only chip that carries a leading
  glyph, a small horizontal bar. Coral here is not "bad." It is "this one points
  the other way," which is why the glyph is a bar rather than a cross or a warning
  triangle. No red, no octagon, no exclamation. On dark surfaces coral shifts to
  `#E78D6F` per the token set.
- **Consensus encodes as pattern, not color**, so the two axes never compete for
  the same channel: `consensus` is a solid underline, `majority` a dashed
  underline, `divided` a split underline in two segments, `fringe` a dotted
  underline. All in `#3D5A5A` on light.

Accessibility: every combination is legible at 4.5:1 or better, and no state is
distinguished by color alone. The glosses are always rendered, never
hover-revealed, because the badge appears in OG images and printed PDFs where
hover does not exist.

### 9.2 Claim page (`/claims/[domain]/[slug]`)

1. Breadcrumb, then claim text as an H1 set in Bricolage Grotesque with the
   signature coral serif-italic on the operative phrase.
2. Verdict badge, above the fold, always.
3. Verdict line.
4. Public summary.
5. Freshness line and, where applicable, the "this grade changed" module reading
   from `claim_revisions`.
6. The member gate. One `<MemberGate>` component (plan §5.3), variant copy: "Read
   the full evidence breakdown." Fires `paywall_view`. Never an interstitial, never
   a modal, never on scroll. It is a clean horizontal boundary with the gated
   section's headings visible above it, so the reader can see what they are buying.
7. Gated body for members, per §3.2.
8. Cross-links: related claims, the Navigator handoff module where §3.6 applies,
   2 to 3 activities.
9. Author byline with credentials, linked to the author page. E-E-A-T is the whole
   game in this category (plan §5.2), so the byline is a product requirement, not a
   footer detail.
10. Static pediatrician footer.

Schema markup: `Article` plus `FAQPage`. The claim-and-verdict structure maps
unusually cleanly onto FAQ rich results, which is the single highest-leverage
technical SEO fact about this product. `BreadcrumbList` as well, reusing the
emitter `scripts/build-library.mjs` already has.

### 9.3 Freshness states

| State | Condition | Render |
|---|---|---|
| Current | `review_due` in the future | "Last reviewed {month year}" in `#3D5A5A` |
| Due | `review_due` passed, under 60 days | Same line, plus "review scheduled" |
| Stale | `review_due` passed by 60 days or more | Coral-bordered note: "This claim is past its review date." Visible to everyone. |

The stale state is deliberately public and deliberately uncomfortable. It is the
mechanism that keeps the library honest when capacity slips, and hiding it would
convert a capacity problem into a credibility problem.

### 9.4 Domain hub (`/claims/[domain]`)

A graded index table, which is the linkable reference asset. Columns: claim,
strength badge, consensus badge, last reviewed. Sortable and filterable by either
axis, client side, no route change. Above the table: two or three sentences on
what this domain's evidence looks like as a whole, which is genuinely useful and
is also the text that ranks for the head term.

**Must look intentional at 8 claims**, per §2.4. The design is a table with a
short editorial header, not a grid of cards that reads as empty. A "claims in
progress for this domain" list, showing backlogged claim areas without grades,
turns a thin hub into a roadmap instead of a gap. Those entries carry no badge and
are visually distinct from graded rows so nothing reads as an ungraded verdict.

### 9.5 The Evidence Map (`/claims/map`)

The shareable artifact and the digital-PR asset (plan §5.4). The consumer twin of
the Child Evidence Honesty Map.

A 5 by 4 grid: strength on the vertical axis, `strong` at the top through
`contradicted` at the bottom; consensus on the horizontal, `consensus` at the left
through `fringe` at the right. Every published claim plots as a dot in its cell,
with cells laid out as small bounded regions rather than a scatter, since the data
is categorical and a scatter would imply a continuous position the grades do not
have.

- Cell background: aqua mist `#F0F5F3`, with sea glass `#CFE3DE` gridlines. No
  heat map. A heat map would recreate the valence encoding §9.1 rejects.
- Dots: `#1E5F62`, sized uniformly. Dot count per cell is shown numerically so a
  dense cell is readable without counting.
- The `contradicted` row uses coral dots at `#DE7356`, consistent with §9.1, and
  the row carries a plain label reading "evidence points the other way" so the
  bottom of the map is never read as a wall of shame.
- Domain filter chips above the map. Hover or tap a dot reveals the claim text and
  links through. Keyboard navigable, arrow keys move between dots, because a
  data visualization that is mouse-only is not shippable.
- Below the map, the same data as an accessible table. The table is the source of
  truth and the visualization is a rendering of it, never the reverse.
- `next/og` renders a static version for sharing, with the teal and coral system
  intact and the axis labels legible at Twitter card size.

Motion: one signature reveal, the dots settling into their cells on first paint,
respecting `prefers-reduced-motion` with an instant fallback. Nothing else on the
page moves.

### 9.6 Methodology page (`/claims/how-we-grade`)

The rubric, in full, in public. Both axes, both level tables, the downgrade rules,
the statement that the framework is GRADE-informed rather than GRADE-compliant
(§1.2), the review cadence, and the note that the grade is the human's. This page
is a trust asset and it is also the page journalists will cite, so it is written
for both audiences.

---

## 10. Ecosystem slot

### 10.1 Three layers

**Layer 1 (free, traffic and trust):** every claim's public summary, every domain
hub, the Evidence Map, the methodology page. These exist to rank, get shared, and
capture emails. They are complete enough to be worth linking to on their own.

**Layer 2 (membership, $9/mo or $79/yr per D7):** every `body_gated` breakdown,
the full source lists, the new-claims member digest. The claims library is not a
standalone SKU and is not sold separately, per plan §2.1: the products cross-link
by design and per-tool pricing would force walls between things that are stronger
together.

**Layer 3 (courses):** claims are the evidence substrate courses cite. The
bilingual myth claims feed the Bilingual Parenting Guide's launch list directly
(plan §4.2, "the 5 bilingual parenting myths, graded").

**Capture surface:** the claims digest opt-in, the lowest-friction capture on the
site, tagged to the curiosity segment at capture per plan §4.1. Naming is an open
decision (§13.2) because the plan's "one graded claim per week" outruns D4.

### 10.2 Cross-links, as an artifact

Every claim page links, and the cardinality is cert-checked at §7.2.18:

- **Related claims:** 2 to 4, chosen by domain and by shared source overlap, not by
  keyword similarity. Two claims resting on the same meta-analysis are genuinely
  related; two claims sharing the word "sleep" may not be.
- **One Navigator domain**, from the eight in `keel/artifacts/navigator/trees.v1.json`,
  or an explicit `none`. Rendered as a handoff module, not a banner.
- **2 to 3 Activity Library activities**, resolving to `activities` slugs, chosen
  by domain and age relevance. At least one must be `is_free = true` so the link
  is not a wall.
- **The existing library entries** where they overlap (`library/entries/`), which
  is a free inbound-link win against pages that already exist.

The map is compiled to `claims.crosslinks.v1.json` and regenerated on publish. The
no-orphan grader check (§7.3.22) reads it.

### 10.3 The worry-track boundary

A parent who arrives at a `milestones` claim while worried about their own child
must be routed, not graded at. The Navigator handoff module is the mechanism, and
plan §4.1's rule binds: never monetize the anxiety moment. On any claim page
rendering a Navigator handoff, the member gate copy softens and the exit-intent
capture is suppressed, matching the existing `/worried/*` suppression rule in plan
§5.3.

---

## 11. Telemetry

Aggregate and anonymized. PostHog for product events, Plausible for traffic, per
plan §5.1.

| Signal | Target | Why |
|---|---|---|
| Claims indexed | 25+ within 30 days of the public-pages PR | The success metric (§0.2) |
| Search Console impressions | Trending up by week 8, judged on trajectory | Plan §4.4 |
| Claim page to email capture | 1 to 2% (plan §4.3 blended target for claims pages) | Curiosity-track capture |
| `paywall_view` to trial start | Instrumented from day one, no target at launch | Unknown until measured |
| Public summary scroll depth | Reaching the gate on a majority of sessions | If readers do not reach the gate, the summary is too long or the answer is buried |
| Grade disagreement rate | Reported, not targeted | Matthew changing the model's proposed grade is the drafting-quality signal (§6.4). A rate near zero means the grader is rubber-stamping. |
| Verification throughput | Claims per month against the declared D4 tier | The capacity reality check |
| Claims past `review_due` | Zero is the target; nonzero is visible publicly anyway (§9.3) | Freshness integrity |
| Evidence Map shares and inbound links | Reported quarterly | The digital-PR thesis, tested |

No child data, no user names, no claim content in any event payload.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge, acceptance criteria on every PR, eval
gate blocks merge.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR1** `claims/schema-and-queue` | Claim tables per §8, RLS matching the `activities` posture, extension of `nsc/app/admin/actions.ts` to handle `content_type: 'claim'`, review interface per §6.4. **DDL gate: migration written only after this spec is approved, and applied only on Matthew's explicit go.** | RLS tests pass, no cross-user access, a claim can be enqueued, reviewed, grade-changed with a typed reason, approved, and rejected. |
| **PR2** `claims/grader` | The §7 grader, the rubric artifact, the lint artifact, and the §7.4 planted-violation selftest. No API key, runs in CI. | Every planted violation fails, the clean fixture passes, the negative-claim red-team set (§7.2.10) fails correctly. |
| **PR3** `claims/pipeline` | Dossier format, retrieval wiring per §5.3, drafting harness, provenance stamping. Cost flag before any batch run. | Three dossiers drafted end to end and enqueued with passing reports. Token estimate signed off. |
| **PR4** `claims/public-pages` | Claim pages, domain hubs, verdict badge, `Article` + `FAQPage` + `BreadcrumbList` schema, sitemap entries stitched across zones (plan §5.2), `next/og` images. | Rich-results validation passes on a live claim page, LCP under 2s on mobile, sitemap coherent across the static site and the hub app, badge legible at 4.5:1 in every state. |
| **PR5** `claims/gating` | `<MemberGate>` integration, member rendering of `body_gated`, `paywall_view` events, worry-track suppression per §10.3. | Free and member boundary tests, gate never renders above the public summary, suppression verified on Navigator-handoff pages. |
| **PR6** `claims/evidence-map` | The §9.5 map, the accessible table, the static OG render, domain filters. | Keyboard navigable, table matches the plot exactly, reduced-motion fallback instant, static render legible at card size. |
| **PR7** `claims/review-cron` | Monthly `review_due` sweep into the queue, freshness badges, `claim_revisions` and the public "grade changed" module. | Cron surfaces due claims as a distinct queue state, stale badge renders publicly, a simulated regrade produces a correct public history entry. |
| **PR8** `claims/crosslinks` | The compiled cross-link artifact, related modules on every page, the no-orphan grader check. | No orphan pages, every page has at least 3 inbound internal links, all cross-link cardinalities cert-green. |

Critical path: PR2 gates PR3, PR3 gates content, PR4 can build against fixtures in
parallel with PR2 and PR3. **Content production runs in parallel with the build**
(plan §2.3), because it consumes Matthew's verification hours rather than build
hours. That parallelism is the whole reason this product can ship alongside the
others, and it is also why §2.4's capacity math is binding rather than advisory.

---

## 13. Risks and open decisions

**Routed to Matthew:**

1. **D4 tier declaration.** Nothing in this spec resolves until the tier is picked.
   The launch set is 3 to 10 months of verification depending on the answer, and
   the hub-page design, the digest naming, and the launch gate all key off it.
2. **The claims digest promise.** Plan §4.2 says "one graded claim per week." Even
   the 4 hrs/wk tier supports 8 per month, not 4.3 per week. Either the digest is
   renamed to something the library can sustain, or it becomes a rotating digest of
   existing claims rather than new ones. Recommend the latter: a weekly email that
   resurfaces the library is better retention than a weekly email that runs out.
3. **`pregnancy_postpartum` scope.** This domain sits closest to medical advice and
   carries the most liability. Options: include with a medical-adjacency flag and
   a stricter intake gate, or defer the domain entirely to v1.1. This spec includes
   it because two of the highest-search parenting claims live there, but it is a
   defensible cut and it interacts with D3's attorney review.
4. **Attorney review scope (D3).** D3 currently blocks the Navigator launch. A
   claims library making evidence assertions about feeding, sleep safety, and
   pregnancy is plausibly inside the same scoped review. Recommend folding claims
   copy into the same engagement rather than commissioning a second one.
5. **Rubric external review.** The §1 rubric is the product. It should be read by
   someone who grades evidence professionally before the first claim publishes.
   This is cheaper than any later correction and it is a credibility asset.
6. **Consensus-body enumeration per domain.** §1.3 requires it; this spec does not
   supply it beyond the already-registered organizational sources. It is a
   half-day of Matthew's time and it blocks PR2.

**Risks accepted with mitigation:**

7. **A wrong grade is a brand-level event.** Mitigated by the human gate, the
   public rubric, the public revision ledger, and the fact that every grade states
   what would change it. A library that visibly changes its mind is more credible
   than one that never does.
8. **A drafting model fabricating a source.** The highest-severity failure mode in
   this product. Mitigated at three layers: DOI required, retrieval provenance
   required, and the grader rejecting any source not present in the recorded
   retrieval output. This is why §5.3 makes provenance a hard requirement rather
   than a nicety.
9. **SEO does not compound on the timeline anyone wants.** Accepted per plan §4.4.
   Months 1 to 3 are instrumentation and inventory. Do not judge this product on
   week-8 traffic, and do not spend on paid acquisition before the activation
   metric is known.
10. **Capacity slips and the library goes stale.** Mitigated by making staleness
    public (§9.3) rather than hiding it, and by D4's rule that below 2 hrs/wk
    claims pause entirely rather than degrading in quality.

---

## 14. Definition of done

Launch bar for v1:

- The §1 rubric published at `/claims/how-we-grade`, externally reviewed per §13.5.
- The §7 grader green, with the full planted-violation selftest passing in CI,
  including the negative-claim red-team set.
- At least **25 claims published**, each through all five pipeline steps, each with
  a passing per-claim cert report, each with Matthew's recorded grade.
- Cell coverage met: at least 3 `insufficient` and at least 2 `contradicted` in the
  published set, reached by adding candidates rather than by adjusting grades.
- Every published claim carries DOI-bearing sources with retrieval provenance, and
  zero sources are unregistered or unverified. No claim ships on a `verified: false`
  citation (conventions §7).
- Eight domain hubs live, each looking intentional at its actual claim count.
- The Evidence Map live, keyboard navigable, with its accessible table, and its
  static OG render.
- Gating live: free summaries complete and useful, `body_gated` member-only,
  `paywall_view` instrumented, worry-track suppression verified.
- `Article` + `FAQPage` schema validating, sitemaps coherent across zones,
  Search Console and Bing wired, 25+ claims indexed within 30 days of PR4.
- Review cron live, freshness badges rendering, `claim_revisions` public.
- Cross-link artifact green: no orphans, every page at least 3 inbound links.
- D4 tier declared, and the publishing cadence stated internally in terms that tier
  supports. No public promise of a claims-per-month number.
- Lighthouse accessibility 95 or above on claim, hub, and map pages.
