# Evidence-Graded Claims Library: Build Spec (draft)

> **Status: draft for domain-expert review. Not approved. Nothing here is built.** Every grade level, rubric threshold, and launch claim below is a proposal awaiting Matthew's read. No claim in this document has been through the pipeline it describes, and no grade appearing here is a verdict.

Inherits `specs/drafts/00-CONVENTIONS.md`: the fourteen-section skeleton, brand tokens, citation states, no-DDL, no-em-dash. Deviations recorded in §0.6. Codename `claims`. Product name is Matthew's call.

---

## 0. Product summary

**One-liner:** Parenting claims stated the way a parent says them, each graded on two axes (how strong the evidence is, and how much the field agrees), with a free public summary that ranks in search and a member breakdown that shows the working.

**Positioning:** the consumer edition of the Child Evidence honesty framework. The differentiator is not that the product answers parenting questions. It is that it tells you how much to trust the answer, including when the honest answer is that nobody knows yet.

**Target segment:** the curiosity track (plan §4.1). Skeptical, search-arriving parents who have read four contradictory blog posts and want to know who is right. Deliberately not the worry track: a parent in an anxiety moment gets routed to the Navigator, not to a literature grading.

**Architecture thesis:** the Number Path pattern. Drafted offline by a model, graded mechanically, approved by a human, frozen, published. Runtime is a static or ISR render of an approved row. Zero runtime model calls, no exception scoped.

**This product IS the SEO engine** (plan §4.2, §5.2). Decisions below that look like marketing decisions are first-order product decisions.

**Relationship to Child Evidence:** shared philosophy, completely separate codebase, corpus, and brand. GMS grades parenting-practice claims. Child Evidence grades forensic and legal claims. No shared judge, no shared data, no shared corpus, no shared deployment. The two-axis method travels with its author; nothing else crosses.

### 0.1 v1 scope

| In | Out (v1.x or never) |
|---|---|
| 25 to 40 graded claims across eight domains | Personalized claim feeds (v1.2) |
| Two-axis grade with a published rubric | User-submitted claims (v1.1, moderated) |
| Free public summary on every claim | Community grading (**never**: the grade is authored) |
| Member-gated full breakdown | Numeric confidence scores (**never**, §1.5) |
| Eight domain hubs with graded index tables | Medical advice, dosing, treatment (**never**) |
| The Evidence Map | Grading an individual child's situation (**never**: the Navigator's job) |
| Review-due tracking and freshness badges | Automated regrading on new literature (**never** without a human pass) |

### 0.2 Success metric and rework trigger

- **Success metric:** 25 or more claims indexed within 30 days of the public-pages PR, Search Console impressions trending up by week 8. Per plan §4.4, judge trajectory, not absolutes.
- **Rework trigger:** if more than 20% of dossiers are rejected for reasons the mechanical grader should have caught, the grader is wrong, not the drafter. Stop drafting, fix §7, resume.

### 0.3 Standing prohibitions, enforced at intake (§2.3)

1. No claim whose honest resolution requires clinical judgment about a specific child.
2. No claim about a named commercial product where the only evidence is manufacturer-funded.
3. No claim framed so that either grade outcome shames a parent for a choice already made. Reframe at intake, never soften at publication (§3.4).

### 0.5 What already exists (verified against the repo, 2026-07-19)

**Most of this product is not built.** The accurate accounting:

**Exists and is directly reusable:**

| Asset | Path | What it gives us |
|---|---|---|
| Shared review queue | `nsc/supabase/migrations/0006_activity_library.sql`, `nsc/app/admin/` | `review_items` already enumerates `'claim'` as a legal `content_type`. The table, its service-role-only RLS, the `ADMIN_EMAILS` allowlist with 404-not-403 for non-admins (`nsc/lib/admin.ts`), the pending/approved/rejected workflow, `grader_report`, and `reject_reason` all work today. |
| Citation registry | `corpus/citations.json` | 11 registered organizational sources, all `verified: true`, plus a `claims` array recording replication status (`supported`, `contested`, `attenuated`, `failed-replication`) for six findings. The conceptual seed of this product. |
| Corpus certifier | `scripts/corpus/certify.mjs`, `corpus/manifest.json` | A working deterministic content-hashed cert artifact with hard gates on citation resolution. Currently green: 304 cards, 11 sources, 3 contested claims, 6 library entries. |
| Library pipeline | `library/`, `tools/library/grader.mjs`, `scripts/build-library.mjs` | The closest working analogue: JSON source entries, a mechanical grader, a Flesch-Kincaid gate, a planted-violation selftest in CI, and a draft/approved flip that gates publication. Six entries exist, all draft. |
| Shared lint lexicon | `evals/lib/checks.mjs` | One behavioral standard already shared between the live AI and published pages. The claims grader imports it rather than forking a second lexicon. |
| Eval discipline | `evals/README.md`, `evals/behavioral-spec.md`, `evals/labels/` | Judge-validation-before-trust, with a human-labeled set requiring 90% per-dimension agreement. |
| Schema emitter | `scripts/build-library.mjs` | Already emits `Article` + `FAQPage` + `BreadcrumbList` JSON-LD. |
| Navigator domains | `keel/artifacts/navigator/trees.v1.json` | Eight live domains: `talking`, `understanding`, `walking_movement`, `hands_fine_motor`, `play`, `social_eye_contact`, `hearing_responding`, `behavior_regulation`. The §10 cross-link targets. |
| Activities table | `nsc/supabase/migrations/0006_activity_library.sql` | `activities` rows with slug, domains, age range, `is_free`. The activity cross-link target. |
| Vetting log | `marketing/carousels/daily-log.md` | 17 lines. Two approved topics, three rejected findings (30-million-word gap, marshmallow, helper/hinderer). The informal practice this product formalizes. It is a log, not a system. |

**Does not exist. This is the build.**

- **No claim-grading code of any kind.** A repository search for `grade_strength`, `grade_consensus`, or any equivalent returns nothing outside the plan.
- **No `claims` table.** The queue anticipates the content type; nothing consumes it. `nsc/app/admin/actions.ts` hard-rejects any non-`'activity'` item with `?error=unsupported-type`.
- **No grading rubric.** The four replication statuses in `corpus/citations.json` are a one-axis vocabulary about single findings. §1 is new work.
- **No dossier format, no dossier grader, no retrieval layer.** The Consensus MCP retrieval step is unwired.
- **No claim pages, hub pages, Evidence Map, verdict badge, content gate, review-due cron, or freshness badge.**
- **No DOI handling anywhere.** Existing citations are prose strings plus URLs. DOIs appear only as unvalidated literal fields inside `keel/artifacts/shared/floor_sources.v1.json`.
- **No claims exist. Zero.** §4.4 is a proposal.

Honest summary: this product reuses a review queue, a lint lexicon, a reading-level check, a schema emitter, and a cert-report pattern. It builds a grading framework, a dossier pipeline, a data model, five page types, and a visualization. Call it 20% reuse by effort.

### 0.6 Deviations from the conventions

- The enrichment lint applies with one carve-out (§3.5): `insufficient` and `contradicted` are grade labels, allowlisted positionally, never globally.
- This product is not governed by `keel/`. It touches no instrument, threshold, or terminal class, so the floors grader is unaffected. It must still never contradict a floor: §3.6.

---

## 1. Domain model: the two-axis grading framework

The scientific core. A grade a second reader cannot reproduce from the rubric alone is not a grade, it is an opinion with a badge on it.

### 1.1 Why two axes

One axis collapses two different failure modes. "The evidence is weak" and "the experts disagree" are not the same statement. A claim can rest on strong evidence the field still argues about (measurement or generalizability disputes), and a claim can enjoy near-total professional consensus resting on limited direct evidence (much of infant safety guidance, where the settling trial would be unethical). Two axes make both legible instead of averaging them into a misleading middle.

**Named tradeoff (decided):** a single composite score is far easier to render, sort, and share. It also reintroduces the false precision the product exists to refuse, and it makes the "strong evidence, contested field" cell invisible. Two axes win. The cost is a harder visual problem, solved in §9.1 and §9.5.

### 1.2 Axis one: `grade_strength`

How much weight the evidence can bear, judged on the body of evidence, not the best single study.

| Level | Operational rubric (all conditions must hold) | Parent-facing gloss |
|---|---|---|
| `strong` | A systematic review or meta-analysis of randomized trials, **or** two or more independent well-powered randomized trials concordant in direction; no credible contradicting body; effects survive the obvious confounds; at least one replication by a group unaffiliated with the originating lab. | "About as settled as parenting research gets." |
| `moderate` | One well-conducted randomized trial **or** a systematic review of consistent observational studies with plausible mechanism and dose-response; no major unresolved confound that would plausibly reverse direction; at least one independent replication of direction, though not necessarily magnitude. | "The evidence points one way, and it could still shift." |
| `limited` | Evidence exists and points somewhere, but rests on small samples, single labs, short follow-up, uncontrolled observational designs, or surrogate outcomes standing in for the outcome parents care about. | "There is some evidence. It is thin." |
| `insufficient` | The question has not been studied adequately. Includes the case where studies exist but none measure what the claim asserts. **A real answer, treated as one**, not a failure to find something. | "Nobody has studied this well enough to say." |
| `contradicted` | The body of evidence points **against** the claim: a well-powered trial or meta-analysis finds no effect or the opposite, or a foundational finding failed to replicate at adequate power. | "The evidence does not support this, and here is what it shows instead." |

**Mandatory downgrade rules**, mechanical and checked at §7, so the grade cannot drift up under enthusiasm:

1. If the only supporting trials are funded by a party with a commercial interest in the outcome, cap at `limited`.
2. If the key finding has a documented failed replication at adequate power, cap at `limited` and require the dossier to actively consider `contradicted`.
3. If the effect is established only on a surrogate outcome and the claim asserts the real-world outcome, cap at `moderate`.
4. If the largest single study drives more than 70% of pooled weight, cap at `moderate`.
5. For negative claims ("X does not cause Y"), `strong` requires evidence powered to detect an effect of the size parents care about. Absence of evidence grades `insufficient`, **never** `contradicted`.

Rule 5 is the one a drafting model is most likely to get wrong and the one with the most reputational downside. It gets a dedicated red-team fixture set (§7.2.10).

**Named tradeoff (decided):** adopting GRADE outright would buy external legitimacy and a large published guidance base. It would also import a clinical vocabulary that reads as hospital paperwork to a parent at 2am, and it is built for treatment recommendations rather than practice claims. The rubric above is GRADE-informed in its logic (risk of bias, inconsistency, indirectness, imprecision, publication bias) and stated in the product's own plain language. GRADE-informed beats GRADE-branded, and §9.6 states the relationship openly rather than implying formal compliance.

### 1.3 Axis two: `grade_consensus`

How much the relevant field agrees, judged independently of how good the evidence is: current position statements from major professional bodies, current review-article framing, and whether active disagreement appears in recent literature.

| Level | Operational rubric | Parent-facing gloss |
|---|---|---|
| `consensus` | Major professional bodies whose remit covers the claim agree, and no substantial dissent appears in recent peer-reviewed literature. Dissent that exists is confined to a few authors without a supporting body of work. | "Essentially everyone in the field agrees." |
| `majority` | Most of the field agrees and at least one body has taken a position, but a substantive minority position exists with its own supporting work. | "Most researchers agree, and there is a real minority view." |
| `divided` | Genuinely split: active disagreement in recent literature, competing position statements, or a live methodological dispute that determines the answer. | "Researchers genuinely disagree about this." |
| `fringe` | Advocated primarily outside the mainstream of the relevant field, with little or no support in peer-reviewed literature or professional guidance. | "Not a mainstream position among researchers." |

**Consensus is assessed independently of strength, always.** The grader rejects any dossier whose consensus justification argues from evidence quality rather than from the field's stated positions. That circularity is the single most common way a two-axis framework silently collapses into one axis.

**Which bodies count** is enumerated per domain in the rubric artifact, not left to the drafter. The organizational sources already registered and verified in `corpus/citations.json` (AAP HealthyChildren, CDC Learn the Signs Act Early, ZERO TO THREE, NAEYC, Pathways.org, Child Development Institute, and the Harvard Center on the Developing Child concept pages) are the starting registry. Additions require the same registration and verification, so consensus assessment inherits the existing corpus gate rather than inventing a second one.

### 1.4 The grid, and which cells are interesting

| | consensus | majority | divided | fringe |
|---|---|---|---|---|
| **strong** | Settled. Low editorial value, high search value. | The interesting cell: good evidence, live argument. | Rare and important, usually a measurement dispute. | Near-empty. Investigate the grade if it lands here. |
| **moderate** | Common. The workhorse of practice guidance. | Common. | High value: "why you keep reading opposite things." | Uncommon. |
| **limited** | Common in infant safety: precaution legitimately outruns evidence. Say so plainly. | Common. | Common. | Common. |
| **insufficient** | "Everyone agrees, and nobody has checked." The most under-served cell on the parenting internet. | Uncommon. | Common. | Common. |
| **contradicted** | The debunk cell. High share value, highest care required (§3.4). | Uncommon. | Uncommon. | The classic pseudoscience cell. |

The launch set is weighted toward cells with editorial value, not just cells that fill easily. Twenty `moderate` plus `majority` claims teach a parent nothing about how evidence works.

### 1.5 What the grade is not

- Not a probability. No percentages, no "87% confident." Banned in copy, checked at §7.
- Not a recommendation. The grade describes evidence; the practical bottom line is a separate labeled section that may say "your call."
- Not stable. Every grade carries `last_reviewed` and `review_due` and renders a freshness state (§9.3). A grade with no visible date is a claim about eternity.
- Not transferable to a specific child. Static pediatrician footer on every page, per conventions §5.

### 1.6 The eight domains

The primary routing key. Fixed at launch; adding one has hub-page, sitemap, and cross-link consequences.

| Domain | Scope | Navigator cross-link | Note |
|---|---|---|---|
| `sleep` | Sleep training, co-sleeping, night weaning, regressions, safe sleep | `behavior_regulation` | Highest anxiety, highest search, most contested. §3.4 care. |
| `feeding` | Solids, baby-led weaning, allergens, picky eating, milk supply | none | Closest to the medical line. The §0.3 gate is tightest here. |
| `screens` | Time thresholds, content type, video chat, background TV, co-viewing | `talking` | Where "the evidence is thinner than the guidance" is most often true. |
| `discipline` | Timeout, praise, consequences, gentle-parenting claims, tantrum response | `behavior_regulation` | Ideologically loaded. Grade the evidence, never the philosophy. |
| `language` | Bilingual exposure, reading aloud, baby signs, word-gap claims | `talking`, `understanding` | Matthew's home turf. Fastest verification. |
| `milestones` | Walking ranges, teething, tummy time, crawling, pointing | `walking_movement`, `hands_fine_motor`, `play`, `social_eye_contact` | Adjacent to the worry track. §10.3 routing is strict. |
| `pregnancy_postpartum` | Prenatal exposures, postpartum recovery, breastfeeding claims | none | Highest liability. §0.3 gate plus a medical-adjacency flag. |
| `products_gear` | Walkers, jumpers, sleep positioners, "developmental" toys, monitors | `walking_movement` | The commercial-funding downgrade fires most often here. |

---

## 2. Core loop: backlog, scoring, and the queue

### 2.1 What the product asks

Not of the user. Of Matthew. The core loop is an editorial queue, not an instrument, and the question it answers is: **which claim gets the next verification hour?**

### 2.2 Priority scoring

`priority_score = log10(monthly_searches) x anxiety_weight x gradeability`

| Input | Source | Range |
|---|---|---|
| `monthly_searches` | Keyword-tool estimate for the head term, recorded with date and tool. Floored at 10 so the log stays defined and a zero-volume claim does not zero the product. | integer |
| `anxiety_weight` | Matthew's judgment. How much distress the searching parent is in. 1 = curious, 2 = worried, 3 = up at 3am. | 1 to 3 |
| `gradeability` | Matthew's judgment. How gradeable the literature is. 1 = thin and messy, 2 = gradeable with work, 3 = clean body with a review to anchor on. | 1 to 3 |

Matthew sets the two subjective weights at intake; the queue sorts itself thereafter. Both are stored with their entry date so re-weighting is visible rather than silent.

**Named tradeoff (decided):** multiplying anxiety into priority pushes high-distress topics to the top, which is exactly where a careless library does damage. Sorting on search volume alone produces a library that answers easy questions well and hard questions never. Multiplication wins, and the risk is handled downstream by §3.4 framing and the Navigator handoff, not by a lower rank.

**A `gradeability` of 1 is not a rejection.** A thin literature is often the most valuable claim in the library, because `insufficient` is the answer nobody else publishes. Gradeability scores cost, not worth. A claim scoring 1 on gradeability and 3 on anxiety belongs in the launch set.

### 2.3 The intake gate

Before scoring, four checks. Failing any one removes the candidate with a recorded reason.

1. **Statable as a claim.** "Is screen time bad?" is a topic. "Screen time before age 2 harms language development" is a claim.
2. **Falsifiable in principle.** Some observation must be able to change the grade, and the dossier states it (§6.2).
3. **Not clinical** (§0.3.1).
4. **Not shaming under either outcome** (§0.3.3). Reframe or drop.

### 2.4 Capacity, keyed to D4

`keel/DECISIONS.md` D4 sets the tiers. This spec invents no number outside them.

| Verification capacity | Claims per month | Alongside |
|---|---|---|
| 4 hrs/wk | 8 | 2 activity batches |
| 2 hrs/wk | 4 | 1 activity batch |
| below 2 hrs/wk | **0. Claims pause.** | Tool-artifact review only |

Consequences the rest of this spec respects:

- The 25 to 40 launch set is **3 to 10 months of verification** at the two supported tiers. Not a sprint. §12 therefore ships the pages before the full set exists, and §9.4 requires hub pages to look intentional at 8 claims.
- **No copy anywhere promises a publishing frequency.** The claims digest email (plan §4.2, "one graded claim per week") exceeds even the 4 hrs/wk tier and must be renamed or repositioned. Open decision §13.2.
- Drafting is not the constraint and must not be run as though it were. Over-drafting produces stale dossiers whose literature moved before Matthew reached them. Drafting runs at most two months ahead of verification.

---

## 3. Output and copy safety

### 3.1 The public summary (free, always)

Roughly 200 words, and the whole SEO surface. Fixed order:

1. The claim, verbatim, as a parent says it.
2. The verdict line: one plain sentence, generated from the grade pair but **authored, not templated**. A templated verdict reads as machine output and destroys the E-E-A-T signal this product depends on.
3. The two badges with their plain-language glosses.
4. Two to four sentences of substance containing a real answer (§3.3).
5. The freshness line.
6. The static pediatrician footer, never triggered.

### 3.2 The gated breakdown (member)

1. **What the research actually did:** designs in plain language, sample sizes, populations, what was measured.
2. **Effect sizes translated.** Never a bare Cohen's d. "About one child in twenty."
3. **Where it gets shaky:** confounds, funding, replication status, generalizability.
4. **What would change this grade.** Required. This section is what proves the grade is falsifiable rather than an opinion.
5. **The practical bottom line**, explicitly permitted to say "this is a values call, not an evidence call."
6. **Sources**, every one with a DOI where one exists.
7. Cross-links per §10.2.

### 3.3 Gate placement

**Named tradeoff (decided):** the gate could sit right after the badge, maximizing conversion pressure, or after a genuinely useful free answer, maximizing trust and ranking. Trust wins for three converging reasons: thin free content ranks worse and bounces harder, a withheld answer burns the exact brand asset the product sells, and plan §4.1 forbids monetizing the anxiety moment. **The member gate sells the working, not the answer.**

Mechanical rule (§7.2.16): the public summary must contain the grade, the verdict, and at least one substantive evidence statement. A summary ending on a cliffhanger construction fails cert.

### 3.4 Copy safety on `contradicted` grades

A `contradicted` grade frequently lands on something the reader has already done, bought, or believed. The grade is about the evidence and must never read as a judgment of the parent.

- **No second person in a `contradicted` verdict line.** Grade the claim, never "you."
- **No mockery vocabulary** anywhere in claim copy: `myth`, `debunked`, `nonsense`, `snake oil`, `pseudoscience`, `fell for`, `waste of money`. Regex-banned. (`pseudoscience` stays permitted on the methodology page; the lint is scoped by surface.)
- **Every `contradicted` claim carries a "what to do instead" sentence in the free summary.** A debunk with no replacement leaves the parent worse off.
- Where a claim is contradicted but the practice is harmless, say so: "It does not do what people say. It also does not hurt anything."
- No `contradicted` claim is the hero of a social asset without that "what to do instead" line traveling with it.

### 3.5 Lint layers

**The enrichment lint** (conventions §5) applies to all claim copy with one scoped carve-out. The grade labels `insufficient` and `contradicted` are product vocabulary permitted in three positions only: the badge component, the verdict line, and the methodology page. Everywhere else in claim prose, and everywhere in any child-directed copy a claim page renders or links, the lint applies unmodified. The allowlist is **positional, never global**, and the grader carries a fixture proving that moving `insufficient` out of a badge and into a sentence about a child fails the lint.

The full banned set from conventions §5 applies to claim prose, which is workable because a claims page describes evidence, not a child. Where a parent-stated claim legitimately contains a banned word ("behind"), the `claim_text` field is exempt, and the exemption is recorded per claim with Matthew's sign-off rather than granted automatically.

The lexicon is imported from `evals/lib/checks.mjs`, not reimplemented, so the AI, the library pages, and the claims pages are graded against one standard.

**Reading level:** grade 8 or below on the public summary (Flesch-Kincaid, the check `tools/library/grader.mjs` already runs at grade 9 for library entries). Grade 10 on the gated breakdown, a deliberate exception recorded here rather than a drift, because that section is doing genuinely harder work.

### 3.6 Non-contradiction with the safety keel

This product changes no instrument and is not governed by `keel/`. It can still do harm by publishing a bottom line that talks a parent out of an action a Navigator floor exists to trigger. Binding rule: **no claim in `milestones`, `language`, or `sleep` may publish a practical bottom line that discourages seeking evaluation**, and any claim touching a Navigator domain renders the handoff module rather than a reassurance. Checked statically at §7.2.19 against the eight domain ids in `keel/artifacts/navigator/trees.v1.json`.

---

## 4. Content library

### 4.1 The claim record (annotated field list, not DDL)

- `id`, `slug`. The slug is the URL segment and is stable forever. A regrade never changes a slug; a reframe that does requires a redirect.
- `domain`: one of the eight in §1.6.
- `claim_text`: as a parent states it. The §3.5 exemption surface.
- `grade_strength`, `grade_consensus`: the two enumerations from §1.2 and §1.3.
- `verdict_label`: one authored plain sentence.
- `summary_public`: ~200 words MDX, always free, the SEO surface.
- `body_gated`: the full breakdown per §3.2.
- `grade_justification_strength`, `grade_justification_consensus`: two separate prose fields, deliberately separate so the grader can check §1.3 non-circularity.
- `what_would_change_it`: required, non-empty.
- `related_claim_ids`, `navigator_domain`, `activity_slugs`: cross-links, cardinality enforced at §7.2.18.
- `priority_score`, `anxiety_weight`, `gradeability`, `monthly_searches`, `searches_measured_on`: retained after publication so the queue's reasoning stays auditable.
- `last_reviewed`, `review_due`, `review_cadence_months` (12 default, 6 for fast-moving), `rubric_version`, `status` (`backlog`, `drafting`, `graded_pending_verification`, `approved`, `published`, `retired`), `version`.
- `claim_text_lint_exemption`: nullable, records Matthew's per-claim sign-off.

### 4.2 The rubric artifact

`claims.rubric.v1.json` holds the §1.2 and §1.3 tables, the downgrade rules, and the per-domain enumeration of which bodies count for consensus. Frozen, versioned, hash-certified like every other artifact here. **The rubric is versioned because a rubric change silently regrades the whole library.** Every published claim records the rubric version it was graded under. A rubric bump regrades nothing automatically; it flags every claim graded under the old version for review, which is a queue event, not a publish event.

### 4.3 Worked examples

**Example A. Grounded in the existing verified registry.** `corpus/citations.json` records the "30 million word gap" with `status: "contested"`, citing Hart and Risley (1995) with a failed replication by Sperry, Sperry and Miller (2019), and a standing instruction not to present it as settled. That registry entry is `verified: true` in the corpus pool.

Under §1.2 rule 2, a `language` claim stated as "how many words you say to your baby determines their vocabulary" enters the pipeline with a strength ceiling of `limited` already set by rule, before any drafting happens, and with `contradicted` required to be actively considered. That is the rubric doing its job before a model touches the claim. **This example deliberately states no verdict.** The grade pair, verdict line, and source set are produced by §6, not by this spec. Matthew's grade is the grade.

**Example B. Format only. Grade and sources are placeholders.**

> **Claim:** `{claim as a parent states it}`
> **Verdict:** `{one authored plain sentence}`
> **Badges:** `{grade_strength}` x `{grade_consensus}`
> **Summary:** `{~200 words, must contain a real answer}`
> **Last reviewed:** `{month year}`

Illustrative of the **format** only. It carries no grade because inventing one is exactly the failure this product exists to prevent. No worked example in this spec, in any PR description, in any fixture, or in any marketing asset may present an ungraded claim as though it had a verdict. Test fixtures use nonsense claim text (`"widgets improve foo"`) with obviously fake placeholder sources, and the grader checks that no published claim's sources contain a fixture-namespace DOI (§7.2.20).

### 4.4 The launch set: 25 to 40 claims

The plan names ten, reproduced as given. The remainder are **proposals from this spec**. Every entry is a candidate only: none has been scored, drafted, graded, or verified, and no grade is asserted for any of them.

**From the plan (10, given):** sleep training and attachment (`sleep`); screen time thresholds (`screens`); baby-led weaning versus purees (`feeding`); tummy time dosage (`milestones`); pacifiers and speech (`language`); bilingual "confusion" (`language`); sleep regressions (`sleep`); teething symptom claims (`milestones`); milk supply claims (`feeding`); walkers and jumpers (`products_gear`).

**Proposed by this spec (20, all requiring Matthew's approval at intake):**

| # | Claim area | Domain | Why proposed |
|---|---|---|---|
| 11 | Reading aloud and later vocabulary | `language` | High volume, fastest verification, likely a clean grade. |
| 12 | Word-count input and vocabulary outcomes | `language` | Registry already flags it contested (§4.3). Rule-capped before drafting. |
| 13 | Baby sign language and speech onset | `language` | Heavily marketed; the commercial-funding rule likely fires. |
| 14 | Video chat as an exception to screen rules | `screens` | Under-served. The nuance is the product. |
| 15 | Background TV and language exposure | `screens` | Different mechanism from screen time, commonly conflated. |
| 16 | "Educational" apps for under-2s | `screens` | `products_gear` overlap; commercial funding endemic. |
| 17 | Co-sleeping risk framing | `sleep` | Highest care required. The precaution-outruns-evidence cell is the honest one; §0.3.3 reframing mandatory. |
| 18 | Night weaning and sleeping through | `sleep` | 3am search volume. |
| 19 | Timeout and later behavior | `discipline` | Ideologically loaded. Grade the evidence only. |
| 20 | Praise type and motivation | `discipline` | Widely cited, with real replication questions. |
| 21 | Gentle parenting and outcomes | `discipline` | Very high volume, likely `insufficient`, which is the point. |
| 22 | Early allergen introduction | `feeding` | Closest to the medical line; §0.3 gate applied explicitly. |
| 23 | Picky eating and forced tasting | `feeding` | High anxiety, gradeable. |
| 24 | Crawling as a prerequisite for walking | `milestones` | Common belief, gradeable, low harm either way. |
| 25 | Walking age and later ability | `milestones` | Adjacent to the worry track; §3.6 applies. |
| 26 | Pointing and later language | `milestones` | Cross-links the existing `my-1-year-old-isnt-pointing` library entry. |
| 27 | Vitals-tracking baby monitors | `products_gear` | Commercial-funding rule; consumer-safety relevance. |
| 28 | "Developmental" toy claims | `products_gear` | Likely a domain-level pattern claim rather than one product. |
| 29 | Prenatal audio exposure and later ability | `pregnancy_postpartum` | Classic `fringe` cell, high share value. |
| 30 | Postpartum recovery timeline claims | `pregnancy_postpartum` | High anxiety, under-served, medical-adjacency flag required. |

Thirty candidates against a 25 to 40 target leaves deliberate slack: intake will reject some, and the `divided` and `insufficient` cells should be filled by claims discovered during drafting rather than pre-selected.

**Cell coverage target** (a set-level cert check at §7.3.21, not a suggestion): at least three published claims in `insufficient` and at least two in `contradicted`, or the library is quietly biased toward claims with tidy answers. This constrains the **set**, never an individual grade. If honest grading does not produce that spread, the correct response is to add candidates to the backlog, never to adjust a grade.

---

## 5. Architecture

### 5.1 Content as compiled, human-approved artifact

The Number Path pattern, unmodified: drafted offline, graded mechanically, approved by a human, frozen, published. Zero runtime model calls on any claim surface. Where this differs from Number Path: that product compiles a large catalog in batch. Claims arrive one at a time, gated on human hours (§2.4). **The unit of compilation is the dossier, not the batch**, and the cert report is per claim rather than per artifact set.

### 5.2 Artifacts

| Artifact | Contents |
|---|---|
| `claims.rubric.v1.json` | §1.2, §1.3, downgrade rules, per-domain consensus bodies |
| `claims.lint.v1.json` | §3.4 and §3.5 term lists with positional allowlist scoping |
| `claims.crosslinks.v1.json` | The compiled cross-link map (§10.2), regenerated on publish |
| `claims.cert.<slug>.v<n>.json` | Per-claim grader output. A claim renders only with a matching passing report. |

The portfolio invariant holds: runtime refuses any artifact whose hash lacks a passing cert report. `nsc/lib/artifacts.ts` already does this; registering the new artifact types is the only work.

### 5.3 Retrieval

The plan names Consensus MCP. Nothing is wired. Retrieval is a drafting-time concern only, never runtime, so an outage degrades the drafting queue and cannot affect a published page. Requirements on whatever layer is chosen: it must return DOIs, expose publication year and study design, and have its output recorded verbatim in the dossier. **A source the model produced from memory rather than from retrieval is a hard cert failure**, and the per-source retrieval provenance stamp is what makes that detectable.

### 5.4 Runtime stack

Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, as in `nsc/`. No new infrastructure. Claim pages static with on-demand revalidation on publish. Target LCP under 2 seconds on mobile.

---

## 6. The production pipeline

Five steps, taken from the Child Evidence discipline as the plan states it. The model proposes, Matthew disposes.

### 6.1 Backlog, scored

Per §2.2 and §2.3. Output: a scored, sorted, gated backlog row.

### 6.2 The model drafts a grading dossier

Input: the claim, the rubric artifact, retrieved literature. Output: a structured dossier, not prose. Required contents:

- Every retrieved source with **DOI required** where one exists, plus retrieval provenance (§5.3).
- Study design, sample size, population, and outcome measured, per source.
- A proposed `grade_strength` justified against specific sources.
- A proposed `grade_consensus` justified against **positions**, not evidence quality (§1.3).
- An explicit statement of which §1.2 downgrade rules were considered and whether each fires.
- The `what_would_change_it` statement.
- A draft public summary and draft gated body.

The dossier is the graded object. The published claim is derived from it.

### 6.3 The mechanical grader on the dossier

Deterministic, no API key, no network. Detailed in §7.2. Output is a pass or fail plus a machine-readable report, stored in the `grader_report` column the review queue already has.

### 6.4 Matthew verifies and grades

Into the existing `/admin` queue as `content_type: 'claim'`. The queue accepts the type; the approval action does not yet handle it (§0.5), and extending it is PR1.

**His grade is the grade.** The dossier proposes. The interface presents the proposed pair and both justifications beside the sources; Matthew accepts, changes either axis, or rejects with a reason. A changed grade is recorded as a disagreement, and the disagreement rate is a first-class quality signal on the drafting step (§11).

Verification is the scarce resource, so the interface is designed around it: one claim per screen, sources one click from the justification they support, and a grade change requiring a typed reason so the record is useful rather than a bare delta.

### 6.5 Publish

On approval: the claim row is written, `last_reviewed` set to today, `review_due` set to today plus `review_cadence_months` (12 default, 6 for fast-moving, set by Matthew at approval rather than inferred), the cross-link artifact regenerated, and on-demand revalidation fired for the claim page, its domain hub, and the Evidence Map.

A monthly cron surfaces claims past `review_due` into the same queue as a distinct state, so a due review never competes visually with a new claim. Overdue claims render a stale freshness badge (§9.3) rather than silently going unreviewed, which is the failure mode of every evidence site that has ever existed.

---

## 7. Certification harness

Pattern mirror: `tools/library/grader.mjs` and its planted-violation selftest, plus the corpus certifier's hard-gate posture.

### 7.1 Where it runs

On every dossier at enqueue, and again at publish. A claim cannot enter the queue with a failing report, and Matthew cannot approve one either. The grader is the trust boundary, so drafting volume never costs quality.

### 7.2 Per-claim checks

**Sourcing.**
1. Every empirical statement resolves to a source in the dossier's own source list. Unsourced empirical statements are a hard fail.
2. Every source carries a DOI, or an explicit `no_doi_reason` (position statement, book, government page).
3. DOI syntactic validity; no duplicate DOIs presented as independent sources.
4. Retrieval provenance present on every source (§5.3).
5. Organizational sources resolve to a registered, verified entry in `corpus/citations.json`, reusing the existing corpus gate.

**Grade justification.**
6. The strength justification references at least N sources: N=3 for `strong` and `moderate`, N=2 for `limited` and `contradicted`, N=1 for `insufficient`, where the honest justification is often a single review noting the absence.
7. Where a systematic review or meta-analysis exists in the retrieved set, the strength justification must reference at least one. Where none exists, the dossier must say so explicitly rather than stay silent.
8. Non-circularity: the consensus justification cites at least one position statement or professional-body source and is not satisfiable by evidence quality alone (§1.3).
9. Every applicable §1.2 downgrade rule is explicitly addressed.
10. Rule 5 red-team set: dossiers grading an absence of evidence as `contradicted` must fail.

**Language.**
11. No causal language above the claim's grade. Below `moderate`, causal verbs (`causes`, `leads to`, `results in`, `prevents`, `improves`) are banned outside quotation of the claim itself. A grade-indexed permission table drives the regex set.
12. Enrichment lint per §3.5, with positional allowlist.
13. `contradicted` copy rules per §3.4, including the mandatory "what to do instead" sentence.
14. No probability language on the grade (§1.5).
15. Reading level: public summary grade 8 or below, gated body grade 10 or below.
16. Public summary substance check (§3.3).

**Structure and links.**
17. `what_would_change_it` non-empty.
18. Cross-link cardinality: at least 1 related claim (waived while the library holds fewer than 4), exactly 1 Navigator domain or an explicit `none`, 2 to 3 activity slugs, all resolving to existing rows.
19. §3.6 non-contradiction for `milestones`, `language`, `sleep`.
20. No fixture-namespace DOI in a published claim (§4.3).

### 7.3 Set-level checks

21. Cell coverage per §4.4 at the launch gate.
22. No orphan pages: every claim receives at least 3 inbound internal links (plan §5.2).
23. The cross-link graph is symmetric where it claims to be and contains no dangling slugs.
24. No two published claims with materially duplicate normalized `claim_text`.

### 7.4 Selftest

A planted-violation suite in the pattern of `tools/library/selftest.mjs`: one deliberately broken fixture per check above, all of which must fail, plus a clean fixture that must pass. Runs in CI with no API key. **A grader that has never been proven to fail is not a grader.**

---

## 8. Data model

Prose plus annotated field lists. **No DDL in this folder** (conventions §3). When approved, the migration lands in `nsc/supabase/migrations/`, not here.

**`claims`.** One row per claim, fields per §4.1. Public read of published rows only, matching the existing `activities` policy exactly. Writes service-role only, through the review queue. Indexed on `(domain, status)` for hubs and on `review_due` for the cron.

**`claim_sources`.** Sources normalized out of the claim row rather than left as a JSON blob, because the grader queries across them (duplicate-DOI detection at §7.2.3, registry join at §7.2.5) and because a source cited by six claims should be one row. Fields: claim id, DOI or null, `no_doi_reason`, full citation string, `role` from a controlled vocabulary (`primary_trial`, `systematic_review`, `meta_analysis`, `replication`, `failed_replication`, `position_statement`, `background`), `registry_id` nullable into `corpus/citations.json`, retrieval provenance, ordering.

**`claim_revisions`.** Append-only. Every grade change after first publication records the old pair, the new pair, the rubric version, the reason, and the date. This is the product's honesty ledger and it is **publicly readable**: the "this grade changed, and here is why" module (§9.2) reads from it. A library that quietly regrades cannot be trusted, and making the history public is cheap insurance against ever wanting to.

**`review_items`.** Exists, already accepts `content_type: 'claim'`. Reused unchanged: `payload` holds the dossier, `grader_report` holds the §7 output, `published_id` points at the created claim row.

**Privacy.** This product holds no child data and no user-generated content. It is the only product in the portfolio with no privacy surface beyond standard analytics; plan §5.1 rules apply unchanged.

---

## 9. Screens

Mobile first. Tidepool tokens only: deep teal ink `#15393C`, brand teal `#1E5F62`, teal-soft `#2E7A77`, aqua mist `#F0F5F3`, surface white, sea glass `#CFE3DE`, exactly one warm accent, coral `#DE7356` (with `#9C4429` deep and `#E78D6F` on dark), line `#D4E0DC`, ink-soft `#3D5A5A`. Bricolage Grotesque for display and headline, Source Serif 4 for body. Pill controls at 48px, 14px card radius. The conventions §4 anti-references bind: no gradient hero, no hospital-blue clinical sterility, no deficit framing.

### 9.1 The verdict badge (the signature component)

Above the fold on every claim page, and on the OG image, the Pinterest card, and the Evidence Map's plotted point. It is the one memorable element, so everything else on the page stays quiet. Composition: two stacked chips in one bordered card, strength above consensus, each with its label and its plain-language gloss. 14px radius, `#D4E0DC` line, white surface on the aqua mist ground.

**Color encoding, and the constraint that makes it hard.** The obvious design is a red-to-green scale, and it is wrong three times over: the brand permits exactly one warm accent, a red `contradicted` badge reads as a scolding (§3.4), and a green `strong` badge implies a recommendation the grade does not make. The encoding is therefore **not by valence**:

- **Strength encodes as fill weight within the teal family.** `strong` is a solid `#1E5F62` fill with white text; `moderate` a `#2E7A77` fill; `limited` a `#CFE3DE` fill with `#15393C` text; `insufficient` white with a `#D4E0DC` border and `#3D5A5A` text. The metaphor is density, not goodness. More evidence renders as more ink.
- **`contradicted` is the one badge that uses coral**, `#DE7356` on white with `#9C4429` text, and its shape differs: it is the only chip with a leading glyph, a small horizontal bar. Coral here does not mean "bad." It means "this one points the other way," which is why the glyph is a bar and not a cross, an X, or a warning triangle. No red, no octagon, no exclamation. On dark surfaces coral shifts to `#E78D6F`.
- **Consensus encodes as pattern, not color**, so the two axes never compete for one channel: `consensus` a solid underline, `majority` dashed, `divided` a two-segment split, `fringe` dotted. All `#3D5A5A` on light.

Accessibility: every combination reaches 4.5:1 or better, and no state is distinguished by color alone. Glosses always render, never hover-revealed, because the badge appears in OG images and printed PDFs where hover does not exist.

### 9.2 Claim page (`/claims/[domain]/[slug]`)

1. Breadcrumb, then the claim text as an H1 in Bricolage Grotesque with the signature coral serif-italic on the operative phrase.
2. Verdict badge, above the fold, always.
3. Verdict line.
4. Public summary.
5. Freshness line, plus the "this grade changed" module where `claim_revisions` has entries.
6. The member gate: one `<MemberGate>` (plan §5.3), variant copy "Read the full evidence breakdown," firing `paywall_view`. Never an interstitial, never a modal, never on scroll. A clean horizontal boundary with the gated section's headings visible above it, so the reader can see what they are buying.
7. Gated body for members (§3.2).
8. Cross-links: related claims, the Navigator handoff where §3.6 applies, 2 to 3 activities.
9. Author byline with credentials, linked to the author page. E-E-A-T is the whole game in this category (plan §5.2), so the byline is a product requirement, not a footer detail.
10. Static pediatrician footer.

Schema: `Article` plus `FAQPage` plus `BreadcrumbList`, reusing the emitter `scripts/build-library.mjs` already has. The claim-and-verdict structure maps unusually cleanly onto FAQ rich results, which is the single highest-leverage technical SEO fact about this product.

### 9.3 Freshness states

| State | Condition | Render |
|---|---|---|
| Current | `review_due` in the future | "Last reviewed {month year}" in `#3D5A5A` |
| Due | Passed, under 60 days | Same line plus "review scheduled" |
| Stale | Passed by 60 days or more | Coral-bordered note: "This claim is past its review date." Visible to everyone. |

The stale state is deliberately public and deliberately uncomfortable. It keeps the library honest when capacity slips; hiding it would convert a capacity problem into a credibility problem.

### 9.4 Domain hub (`/claims/[domain]`)

A graded index table, the linkable reference asset. Columns: claim, strength badge, consensus badge, last reviewed. Sortable and filterable by either axis, client side, no route change. Above it, two or three sentences on what this domain's evidence looks like as a whole, which is genuinely useful and is also the text that ranks for the head term.

**Must look intentional at 8 claims** (§2.4). The design is a table with a short editorial header, not a card grid that reads as empty. A "claims in progress for this domain" list showing backlogged areas without grades turns a thin hub into a roadmap instead of a gap; those entries carry no badge and are visually distinct from graded rows, so nothing reads as an ungraded verdict.

### 9.5 The Evidence Map (`/claims/map`)

The shareable artifact and the digital-PR asset (plan §5.4), the consumer twin of the Child Evidence Honesty Map. A 5 by 4 grid: strength vertical, `strong` at the top through `contradicted` at the bottom; consensus horizontal, `consensus` at the left through `fringe` at the right. Every published claim plots as a dot in its cell, with cells as small bounded regions rather than a scatter, since the data is categorical and a scatter would imply a continuous position the grades do not have.

- Cell background aqua mist `#F0F5F3` with sea glass `#CFE3DE` gridlines. **No heat map**, which would recreate the valence encoding §9.1 rejects.
- Dots `#1E5F62`, uniformly sized. Dot count per cell shown numerically so a dense cell is readable without counting.
- The `contradicted` row uses coral dots at `#DE7356`, consistent with §9.1, and the row carries a plain label reading "evidence points the other way" so the bottom of the map is never read as a wall of shame.
- Domain filter chips above. Hover or tap reveals the claim text and links through. Keyboard navigable, arrow keys between dots: a visualization that is mouse-only is not shippable.
- Below the map, the same data as an accessible table. **The table is the source of truth and the visualization renders it, never the reverse.**
- `next/og` renders a static version for sharing, teal and coral intact, axis labels legible at card size.

Motion: one signature reveal, dots settling into cells on first paint, honoring `prefers-reduced-motion` with an instant fallback. Nothing else on the page moves.

### 9.6 Methodology page (`/claims/how-we-grade`)

The rubric in full, in public: both axes, both level tables, the downgrade rules, the GRADE-informed-not-GRADE-compliant statement (§1.2), the review cadence, and the note that the grade is the human's. A trust asset, and the page journalists will cite, so it is written for both audiences.

---

## 10. Ecosystem slot

### 10.1 Three layers

**Layer 1 (free, traffic and trust):** every public summary, every domain hub, the Evidence Map, the methodology page. Complete enough to be worth linking to on their own.

**Layer 2 (membership, $9/mo or $79/yr per D7):** every `body_gated` breakdown, the full source lists, the new-claims member digest. The claims library is **not a standalone SKU** and is not sold separately, per plan §2.1: the products cross-link by design, and per-tool pricing would force walls between things that are stronger together.

**Layer 3 (courses):** claims are the evidence substrate courses cite. The bilingual myth claims feed the Bilingual Parenting Guide launch list directly (plan §4.2).

**Capture:** the claims digest opt-in, the lowest-friction capture on the site, tagged to the curiosity segment at capture (plan §4.1). Naming is open decision §13.2 because the plan's "one graded claim per week" outruns D4.

### 10.2 Cross-links, as an artifact

Every claim page links, with cardinality cert-checked at §7.2.18:

- **Related claims:** 2 to 4, chosen by domain and shared source overlap, not keyword similarity. Two claims resting on the same meta-analysis are genuinely related; two claims sharing the word "sleep" may not be.
- **One Navigator domain**, from the eight in `keel/artifacts/navigator/trees.v1.json`, or an explicit `none`. Rendered as a handoff module, not a banner.
- **2 to 3 Activity Library activities**, resolving to `activities` slugs, chosen by domain and age relevance. At least one must be `is_free = true` so the link is not a wall.
- **Existing library entries** where they overlap (`library/entries/`), a free inbound-link win against pages that already exist.

Compiled to `claims.crosslinks.v1.json`, regenerated on publish. The no-orphan check (§7.3.22) reads it.

### 10.3 The worry-track boundary

A parent arriving at a `milestones` claim while worried about their own child must be routed, not graded at. The Navigator handoff module is the mechanism, and plan §4.1 binds: never monetize the anxiety moment. On any claim page rendering a handoff, the gate copy softens and exit-intent capture is suppressed, matching the existing `/worried/*` suppression rule in plan §5.3.

---

## 11. Telemetry

Aggregate and anonymized. PostHog for product events, Plausible for traffic.

| Signal | Target | Why |
|---|---|---|
| Claims indexed | 25+ within 30 days of PR4 | The success metric (§0.2) |
| Search Console impressions | Trending up by week 8, judged on trajectory | Plan §4.4 |
| Claim page to email capture | 1 to 2% (plan §4.3) | Curiosity-track capture |
| `paywall_view` to trial start | Instrumented day one, no launch target | Unknown until measured |
| Public summary scroll depth | Majority of sessions reach the gate | If they do not, the summary is too long or the answer is buried |
| Grade disagreement rate | Reported, not targeted | Matthew changing the proposed grade is the drafting-quality signal (§6.4). A rate near zero means the grader is rubber-stamping. |
| Verification throughput | Claims per month against the declared D4 tier | The capacity reality check |
| Claims past `review_due` | Zero, and nonzero is publicly visible anyway (§9.3) | Freshness integrity |
| Evidence Map shares and inbound links | Reported quarterly | The digital-PR thesis, tested |

No child data, no user names, no claim content in any event payload.

---

## 12. Build sequencing

Branch and PR discipline, no auto-merge, acceptance criteria on every PR, eval gate blocks merge.

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR1** `claims/schema-and-queue` | §8 tables, RLS matching the `activities` posture, extension of `nsc/app/admin/actions.ts` to handle `content_type: 'claim'`, review interface per §6.4. **DDL gate: the migration is written only after this spec is approved and applied only on Matthew's explicit go.** | RLS tests pass, no cross-user access; a claim can be enqueued, reviewed, grade-changed with a typed reason, approved, and rejected. |
| **PR2** `claims/grader` | The §7 grader, rubric artifact, lint artifact, §7.4 selftest. No API key, runs in CI. | Every planted violation fails, the clean fixture passes, the rule-5 red-team set fails correctly. |
| **PR3** `claims/pipeline` | Dossier format, retrieval wiring (§5.3), drafting harness, provenance stamping. **Cost flag before any batch run.** | Three dossiers drafted end to end and enqueued with passing reports; token estimate signed off. |
| **PR4** `claims/public-pages` | Claim pages, domain hubs, verdict badge, `Article` + `FAQPage` + `BreadcrumbList`, sitemap entries stitched across zones (plan §5.2), `next/og` images. | Rich-results validation passes live, LCP under 2s on mobile, sitemaps coherent across the static site and the hub app, badge at 4.5:1 in every state. |
| **PR5** `claims/gating` | `<MemberGate>` integration, member rendering of `body_gated`, `paywall_view`, worry-track suppression (§10.3). | Free/member boundary tests; the gate never renders above the public summary; suppression verified on handoff pages. |
| **PR6** `claims/evidence-map` | §9.5 map, accessible table, static OG render, domain filters. | Keyboard navigable, table matches the plot exactly, reduced-motion fallback instant, static render legible at card size. |
| **PR7** `claims/review-cron` | Monthly `review_due` sweep, freshness badges, `claim_revisions` and the public "grade changed" module. | Cron surfaces due claims as a distinct state, stale badge renders publicly, a simulated regrade produces a correct public history entry. |
| **PR8** `claims/crosslinks` | The cross-link artifact, related modules on every page, the no-orphan check. | No orphans, every page at least 3 inbound links, all cardinalities cert-green. |

Critical path: PR2 gates PR3, PR3 gates content, PR4 builds against fixtures in parallel with PR2 and PR3. **Content production runs in parallel with the build** (plan §2.3), because it consumes verification hours rather than build hours. That parallelism is why this product can ship alongside the others, and it is also why §2.4's capacity math is binding rather than advisory.

---

## 13. Risks and open decisions

**Routed to Matthew:**

1. **D4 tier declaration.** Nothing here resolves until the tier is picked. The launch set is 3 to 10 months of verification depending on the answer, and the hub design, digest naming, and launch gate all key off it.
2. **The claims digest promise.** Plan §4.2 says "one graded claim per week." Even the 4 hrs/wk tier supports 8 per month, not 4.3 per week. Either rename the digest or make it a rotating digest of existing claims. Recommend the latter: a weekly email that resurfaces the library retains better than one that runs out.
3. **`pregnancy_postpartum` scope.** Closest to medical advice, highest liability. Include with a medical-adjacency flag and a stricter intake gate, or defer to v1.1. This spec includes it because two of the highest-search claims live there, but cutting it is defensible and it interacts with D3.
4. **Attorney review scope (D3).** D3 blocks the Navigator launch. A claims library asserting things about feeding, sleep safety, and pregnancy is plausibly inside the same scoped review. Recommend folding claims copy into that engagement rather than commissioning a second one.
5. **Rubric external review.** §1 is the product. Someone who grades evidence professionally should read it before the first claim publishes. Cheaper than any later correction, and a credibility asset.
6. **Consensus-body enumeration per domain.** §1.3 requires it; this spec supplies only the already-registered organizational sources. Roughly a half-day of Matthew's time, and it blocks PR2.

**Risks accepted with mitigation:**

7. **A wrong grade is a brand-level event.** Mitigated by the human gate, the public rubric, the public revision ledger, and every grade stating what would change it. A library that visibly changes its mind is more credible than one that never does.
8. **A drafting model fabricating a source.** The highest-severity failure mode here. Mitigated at three layers: DOI required, retrieval provenance required, and the grader rejecting any source absent from the recorded retrieval output. This is why §5.3 makes provenance a hard requirement rather than a nicety.
9. **SEO does not compound on the timeline anyone wants.** Accepted per plan §4.4. Months 1 to 3 are instrumentation and inventory. Do not judge this product on week-8 traffic, and do not spend on paid acquisition before the activation metric is known.
10. **Capacity slips and the library goes stale.** Mitigated by making staleness public (§9.3) rather than hiding it, and by D4's rule that below 2 hrs/wk claims pause entirely rather than degrade.

---

## 14. Definition of done (v1 launch)

- The §1 rubric published at `/claims/how-we-grade`, externally reviewed per §13.5.
- The §7 grader green, full planted-violation selftest passing in CI, including the rule-5 red-team set.
- **At least 25 claims published**, each through all five pipeline steps, each with a passing per-claim cert report, each carrying Matthew's recorded grade.
- Cell coverage met: at least 3 `insufficient` and at least 2 `contradicted`, reached by adding candidates rather than by adjusting grades.
- Every published claim carries DOI-bearing sources with retrieval provenance; zero unregistered or unverified sources. Nothing ships on a `verified: false` citation (conventions §7).
- Eight domain hubs live, each looking intentional at its actual claim count.
- The Evidence Map live, keyboard navigable, with its accessible table and static OG render.
- Gating live: free summaries complete and useful, `body_gated` member-only, `paywall_view` instrumented, worry-track suppression verified.
- `Article` + `FAQPage` validating, sitemaps coherent across zones, Search Console and Bing wired, 25+ claims indexed within 30 days of PR4.
- Review cron live, freshness badges rendering, `claim_revisions` public.
- Cross-link artifact green: no orphans, every page at least 3 inbound links.
- D4 tier declared, and cadence stated internally in terms that tier supports. **No public promise of a claims-per-month number.**
- Lighthouse accessibility 95 or above on claim, hub, and map pages.
