# "Should I Be Worried?" Navigator: End-to-End Build Spec v1.0

> **STATUS: DRAFT FOR DOMAIN-EXPERT REVIEW. NOT APPROVED. NOTHING HERE IS A
> DECISION.**
>
> **LAUNCH IS BLOCKED BY D3.** `keel/DECISIONS.md` D3 states: attorney review
> remains the Navigator launch blocker; build proceeds, launch does not. The
> review packet is written and waiting at `keel/ATTORNEY-REVIEW.md` (budget
> placeholder $1,500 to $3,000, scoped as a disclaimer and terms review). No PR
> in this spec may remove a noindex, add a sitemap entry, add a hub card, or
> flip a tree artifact to `published` until D3 clears. The one command that
> performs the launch already exists (`keel/scripts/launch-navigator.mjs`) and
> deliberately refuses to run twice.
>
> Two further gates apply, inherited from `00-CONVENTIONS.md` §7: **G1**
> citation verification (nothing ships with `verified: false`) and **G2** cost
> sign-off before any batch compile.

**Project:** Growing Minds Science (growingmindsscience.com)
**Codename:** `navigator`. Two shipped names exist in the codebase already:
"Milestone Navigator" (the static tool) and "Should I be worried?" (the Next.js
route group). Naming reconciliation is open decision R1 in §13.
**Conventions:** inherits `specs/drafts/00-CONVENTIONS.md` in full. Deviations
are recorded inline and marked **DEVIATION**.

---

## 0. Product summary

**One-liner:** A structured, citation-backed decision-support tool that turns a
parent's vague 2am worry into a concrete action sheet: what is typical at this
age, exactly what to say to the pediatrician, and how Part C early intervention
referral works in their state.

**Positioning:** the traffic flagship, the mission statement, and the email
capture engine. It is the one product where being free is the point. The
competitive field is content farms answering "18 month old not talking" with
SEO filler; a genuinely rigorous free tool wins those queries on merit.

**Target segment:** a parent at the anxious end of the funnel. Portfolio plan
§4.1 calls this the **worry track**: anxious, urgent, trust-sensitive. Its
binding rule is **never monetize the anxiety moment itself**. The membership
pitch arrives on day 4 of the email sequence, framed as "keep supporting
development," never as "make sure nothing is wrong."

**Architecture thesis:** zero runtime model calls. Frozen, versioned,
hash-certified JSON artifacts per domain; runtime is a pure walk. This already
holds in both existing implementations and this spec does not relax it.

### v1 scope

| In | Out (v1.x or never) |
|---|---|
| Eight worry domains, all age-gated | A ninth domain (feeding, sleep) in v1 |
| Enumerated answers only, no free text anywhere | Free-text "tell us more" boxes (**never**, §2.4) |
| Corrected age for babies born more than 3 weeks early | Gestational-age math beyond the 3-week rule |
| Full action sheet on screen, ungated | Any gate in front of the result (**never**) |
| Literal pediatrician script sentences | Model-generated or personalized script text (**never**) |
| Part C explainer plus 50-state directory | Part B district contacts per district (state level only in v1) |
| Static "seek care promptly" block on every sheet | Triage of acute symptoms (**never**, out of scope by design) |
| Email PDF plus appointment prep checklist as the capture | Account requirement for the result (**never**) |
| Print stylesheet, ungated | Native app, PDF download without email (v1.1 decision, §13 R4) |
| Anonymous sessions, first-party cookie id, 12-month retention | Any third-party ad pixel on `/worried/*` (**never**) |
| Generic OG treatment | Any child-specific data in an OG image or URL (**never**) |

---

## 1. Domain model

### 1.1 The eight domains (the primary routing key)

Domain is the first thing a parent picks and the top-level artifact boundary.
One frozen tree per domain, one landing page per domain, one email segment per
domain.

| # | Domain | Parent-facing entry line | Age span the questions cover | Floors in `keel/artifacts/navigator/floors.v1.json` |
|---|---|---|---|---|
| 1 | Talking | Words, speech sounds, and being understood | 6m to 60m | 3 (no words 16m, no two-word phrases 24m, stranger intelligibility 36m) |
| 2 | Understanding | Following words, names, and pointing | 6m to 60m | 3 (response to name 12m, point-following 18m, one-step directions 24m) |
| 3 | Walking and Movement | Sitting, standing, walking, using both sides | 3m to 60m | 5 (sitting 9m, weight-bearing 12m, walking 18m, early hand preference under 12m, asymmetry any age) |
| 4 | Hands and Fine Motor | Reaching, grasping, picking things up | 3m to 60m | 4 (reaching 6m, persistent fisting 6m, hand transfer 9m, finger-thumb pickup 12m) |
| 5 | Play | Back-and-forth games and pretend | 6m to 60m | 2 (social games 12m, simple pretend 30m) |
| 6 | Social and Eye Contact | Smiling, sharing attention, pointing to show | 3m to 60m | 4 (social smile 4m, shared enjoyment 12m, pointing to show 15m, response to name 12m) |
| 7 | Hearing and Responding | Reacting to sound, voices, and their name | 0m to 60m | 4 (caregiver hearing concern any age, no sound response any age, localization 9m, response to name 12m) |
| 8 | Behavior and Regulation | Big feelings, routines, and self-injury | 6m to 60m | 3, of which one is a policy floor |

Two facts in that table are load-bearing and must survive any rewrite:

- **`no_response_to_name_12m` appears in three domains** (Understanding, Social
  and Eye Contact, Hearing and Responding) under the same floor id by design.
  Whichever door the parent walks through, the same observation hits the same red
  line. The grader binds by id, so the three cannot drift apart.
- **Behavior and Regulation carries a policy floor,
  `sparse_floor_acknowledgment`**, recording that this literature lacks crisp
  published red-line ages and that its floors are deliberately minimal rather
  than falsely precise. Do not invent numeric floors this literature does not
  support. Conservatism here comes from generous `discuss` routing and always-ask
  framing, not from fabricated thresholds.

### 1.2 Corrected age (the secondary routing key)

The rule, stated once and enforced identically in both implementations:

> If the child was born **more than 3 weeks early**, corrected age is used for
> **all comparisons under 24 months chronological**. Above 24 months,
> chronological age is used.

The policy lives in data, not code: `corrected_age: { weeks_early_gt: 3,
applies_under_months: 24 }` in `keel/artifacts/navigator/trees.v1.json`. Weeks
convert at 4.345 weeks per month. Result never goes below zero.

**The corrected-age fact must be stated plainly on the result**, in one
sentence, in the parent's own terms, not as a footnote. Draft banner copy:

> Because your child was born 7 weeks early, we compared everything to an
> 11-month-old rather than a 12-month-old. That is the standard way to read
> milestones for babies born early, and it applies until age 2.

**Named tradeoff (decided):** two rounding conventions exist in the codebase.
`keel/lib/navigator.mjs` returns a fractional corrected age; `nsc/lib/navigator.ts`
floors to a whole month.

**Verified 2026-07-19, not asserted.** An earlier draft of this spec argued that
floored was safe because flooring "moves a case out of a floor's window." That
argument was wrong in its mechanism, and if it had been right it would have
described a *softening*, which is exactly what the floors doctrine forbids. The
real situation was measured instead:

- All 77 age thresholds across `floors.v1.json` and `trees.v1.json` are
  **integers**. For an integer `N`, `Math.floor(x) >= N` exactly when `x >= N`,
  so flooring cannot change any threshold comparison. It is not a softening; it
  is a no-op on classification.
- A differential enumeration over every domain, every integer age 0 to 40, every
  `weeksEarly` 0 to 16, and every answer path (**179,204 cases**) found
  **0 classification differences** and **0 question-set differences** between the
  two conventions.
- The two conventions do produce a different *number* in **2,208** of those
  `(age, weeksEarly)` pairs. That number is shown to the parent in the
  corrected-age banner above, so the divergence is user-visible even though it is
  safety-neutral.

**Floored wins**, now on the honest grounds: it is provably safety-neutral, one
convention beats two, and the floored value matches how a pediatrician says the
number out loud. The parent is told "we compared to an 11-month-old," never
"10.8 months."

The remaining risk is not this change, it is §7.4's coverage gap: the floors
grader never exercises corrected age at all, so it cannot certify this or any
future rounding change. Fixing that gap is PR0 work.

### 1.3 Age gating and the edges

- **Below the domain's `age_min`:** no questions. The page says which
  observations become meaningful and when, and routes anything present now.
- **Above 36 months:** trees continue; the sheet swaps the Part C block for the
  Part B block (§3.3), already implemented as `PART_B_BLOCK`.
- **Above 60 months:** out of scope, routed to district and pediatrician.

---

## 2. The instrument

### 2.1 What a walk looks like

1. Parent picks a domain (§1.1).
2. Parent enters age in months. If born more than 3 weeks early, a follow-up asks
   how many weeks early. Both are enumerated pickers, not free text.
3. Parent answers between 2 and 8 questions, each concrete and observable, each
   phrased about something the parent has actually seen. Example from the shipped
   artifact: "Does your child put two words together on their own?" with help text
   drawing the line that memorized chunks like "all done" do not count.
4. The parent reaches an action sheet (§3).

**Bounded depth is a hard grader rule: every path from root terminates within 8
questions.** `nsc/tools/navigator/grader.ts` enforces `MAX_QUESTIONS = 8` via
`maxQuestionDepth`. The keel questionnaire form satisfies this trivially (the
longest domain asks 6).

### 2.2 Enumerated answers only. No free text anywhere.

There is no text input in any tree, at any node, in any domain, ever. This is
both a UX and a privacy decision, and it is why the privacy posture in §8 can be
as strong as it is.

- **UX:** a parent at 2am does not want a blank box. It asks them for a clinical
  description they lack the vocabulary for and returns answers no deterministic
  engine can route on.
- **Privacy:** free text is the only realistic way a child's name, a diagnosis, a
  provider's name, or an identifiable anecdote enters the system. Removing the
  box removes the class of exposure rather than trying to scrub it.

The type system enforces this: `QuestionNode` in `nsc/lib/navigator-types.ts`
has `options: QuestionOption[]` and no text-input variant. Adding one requires
changing the type first, which is a visible, reviewable act.

### 2.3 Conservative by construction

Four mechanisms, all mechanically checked:

1. **Every ambiguous branch resolves toward "worth discussing."** The failure
   mode must be over-referral to a conversation, never false reassurance.
2. **"I'm not sure" exists on every question and never resolves to pure
   reassurance.** Grader check `not-sure-conservative` requires exactly one such
   option per question and fails if it can reach a `typical_range` terminal.
3. **Loss of skills at any age short-circuits every tree to the strongest
   routing.** Grader check `loss-of-skills` requires the *first* question on
   every path to be loss-tagged and its "Yes" to land on the strongest terminal.
   The keel form states the same rule as an `always_asked` skill-loss node in all
   eight domains plus the `skill_loss_any_domain` global floor.
4. **"Sometimes" never triggers an absence flag** in the keel semantics, but it
   never buys reassurance stronger than the answer supports: below a flag's age
   window it produces a *recheck note* inside `typical_range`, never a class
   change and never silence.

### 2.4 What the instrument deliberately does not do

It does not score, produce a percentile, estimate a probability, or name a
condition. It maps parent-reported observations to published referral thresholds
and returns a routing class plus an action sheet. That distinction is the
substance of question 2 to counsel in `keel/ATTORNEY-REVIEW.md` and must not be
blurred to make the product feel smarter.

---

## 3. The action sheet

Every terminal in every domain renders the same block structure. This is
enforced by construction: the shared blocks live in `nsc/lib/navigator-blocks.ts`
and are tier-keyed, so a terminal cannot ship with a block missing.

### 3.1 Block order

1. **Result headline and class chip.**
2. **What you told us.** The answers restated in plain language, in the order
   asked. This is the block the parent screenshots and brings to the appointment.
3. **What is typical at this age.** Cited. Two to four short paragraphs.
4. **The corrected-age sentence**, when it applies (§1.2).
5. **The pediatrician script** (§3.2).
6. **The Part C explainer** (§3.3), or the Part B explainer above 36 months.
7. **What an evaluation actually looks like**, with realistic timelines.
8. **What to do while you wait:** three free Activity Library activities matched
   to the domain. Free tier, no gate.
9. **The static "seek care promptly" block** (§3.4).
10. **The standing invitation** (§3.5).
11. **Disclaimer**, identical wording to the one already under attorney review.
12. **Actions:** print, and the email capture (§3.6).

### 3.2 The pediatrician script, literally

A list of sentences the parent can read out loud. Static, reviewed copy, never
interpolated with anything about the child, never model-generated at runtime.
Shipped draft, from `scriptFor()` in `nsc/lib/navigator-blocks.ts`:

- Reassurance tiers: "I've been keeping notes on how my child communicates, and
  I'd like to go through them with you." / "If anything here would change your
  read, I'd like to know what to watch for next."
- Concern tiers: "I have specific concerns about how my child communicates, and
  I've written down what I'm seeing." / **"I'd like a developmental screening."**
- Strongest tier adds: **"I want to request an evaluation, not just
  monitoring."**
- Loss of skills adds, from the keel artifact: **"My child has lost skills they
  used to have."** The artifact's own rationale says these are the words that
  reliably get the right response.
- Hearing adds an audiology line, per the JCIH posture (§6).

The two bolded phrases are the words that trigger action. They are the reason
this product exists, and a copy pass may not soften them.

**DEVIATION from the shipped code:** `scriptFor()` currently says "how my child
communicates" for all eight domains, which is wrong for Walking and Movement or
Hands and Fine Motor. The script must be keyed on (tier, domain). The keel
artifact already does this correctly: each domain's terminals carry their own
`script` line ("I want to talk about how my child plays. Specifically:"). PR2
adopts the keel per-domain form.

### 3.3 The Part C explainer

Three facts, stated as facts, because most parents are never told them:

- The evaluation is **free regardless of income**.
- **A doctor's referral is not required.** A parent can refer their own child.
- If the evaluation finds the child eligible, services begin from a written plan
  the parent helps design. If it does not, the parent has traded a phone call for
  a professional look at their child.

Rendered with the parent's state agency name, phone, and link from the directory
(§4.3), plus the ECTA Center link as a permanent fallback. Above 36 months the
block swaps to Part B: the request goes in writing to the district's special
education office, the parent keeps a copy, and that written request starts a
legal clock.

### 3.4 The static "seek care promptly" block

A short block on **every** action sheet, at every tier, including pure
reassurance. Calm in tone, visually distinct from the developmental content,
never triggered by anything the parent answered.

> **Separate from all of this.** If your child ever has trouble breathing,
> becomes unresponsive, or has seizure-like movements, that is emergency care
> right now, not a developmental conversation.

Static precisely so that seeing it carries no signal, exactly as
`00-CONVENTIONS.md` §5 requires of the pediatrician footer. **It is currently
absent from `tools/milestone-navigator.html` and present in
`nsc/lib/navigator-blocks.ts` as `SEEK_CARE_BLOCK`. Adding it to the static tool
is a launch-bar item (§14).**

### 3.5 The standing invitation

Every reassurance terminal carries this verbatim, from
`trees.v1.json.required_copy.parent_gut_invitation`:

> If something still feels off to you, bring it up with your pediatrician
> anyway. Your sense of your child is real information, and raising it is never
> a waste of anyone's time.

It is enforced by a policy floor, `parent_gut_concern_never_dismissed`, whose
rationale reads: caregiver concern has real predictive validity and the tool's
reassurance must never read as a door closing. The floors grader fails the build
if a reassurance terminal drops it.

### 3.6 The capture

The full result is on screen with **no gate**, and the print stylesheet is
ungated too. The capture is:

> **Email me this as a PDF, plus a prep checklist for the appointment.**

Value on screen, portability by email. The emailed version adds the appointment
prep checklist, which the on-screen version does not have. Capture is
segment-tagged by domain at the moment it fires, driving the five-email worry
sequence (§10).

**Named tradeoff (decided):** gating the result behind email would lift capture
substantially and is the single most effective growth lever available. It is
refused. Portfolio plan §4.1 says never monetize the anxiety moment, and a gate
in front of a worried parent's answer is precisely that. Ungated wins
permanently, and the §11 target is set with that handicap priced in.

### 3.7 The never-diagnostic lint

**DEVIATION from `00-CONVENTIONS.md` §5:** the enrichment lint does not apply
here. This is a concern-routing tool, so "delay," "typical range," and "worth
discussing" must be sayable. The narrower never-diagnostic lint applies instead,
already implemented in `keel/graders/floors.mjs` and `nsc/tools/navigator/grader.ts`.

Hard-fails on any node containing a condition name (autism, ASD, cerebral palsy,
apraxia, disorder, syndrome), delay used as a noun applied to the child, any
probability or risk score, any percentile, any comparison to another child, or
any name placeholder (`{name}`, `{child}`). Condition names are permitted only
inside neutral educational sidebars that are not routing output, each reviewed
individually. Reading level: **grade 7 or below**, Flesch-Kincaid, mechanically
checked. The grader comment gives the reason plainly: worried parents at 2am.

---

## 4. Content library

### 4.1 The tree artifact

One frozen artifact per domain, versioned, content-hashed, cert-report
co-frozen. Two artifact shapes exist in the repo today (§5.1). Fields common to
both, whichever shape wins:

- `artifact`, `domain`, `version`, `status` (`draft` or `published`)
- `age_min`, `age_max`
- questions, each with: stable id, prompt, help text, an enumerated answer set,
  an age window, citation ids, and an optional `loss_of_skills` tag
- terminals, each with: stable id, class, headline, body paragraphs, citation
  ids, and an optional script addon
- a `bindings` map from the logical observables named in the floors artifact to
  concrete question ids and answer values, so floors stay stable while wording
  evolves
- the citation table for the domain

### 4.2 Coverage matrix (cert-enforced)

| Rule | Check |
|---|---|
| All eight domains have a tree | registry completeness |
| Every node reachable from entry | `reachability`, zero orphans |
| Every path terminates within 8 questions | `bounded-depth` |
| Every question offers exactly one "I'm not sure" | `not-sure-conservative` |
| Every path's first question is loss-tagged | `loss-of-skills` |
| Every node carries at least one citation id, all resolving | `citations` |
| Every terminal has a complete action block | block completeness |
| Every floor in `floors.v1.json` is exercised by at least one path | floors coverage |

### 4.3 The Part C 50-state directory

The single highest-liability content asset in the product, because a wrong phone
number sends a worried parent nowhere.

- **Seeded ONLY from human verification against the ECTA Center's public state
  contact list. Never generated. Not by a model, not by a scrape, not by a
  "check my work" pass.** A row enters the table when a human has loaded the ECTA
  page and read the entry.
- `last_verified` date per row, not per table.
- **Stale badge shown in the UI when a row is older than 6 months**, alongside
  the ECTA link so the parent can confirm for themselves. The shipped renderer
  already does this: "Last checked {date}, confirm on the ECTA directory."
- Quarterly re-verification is a standing calendar task, sized at roughly 90
  minutes for 50 rows.
- The ECTA directory link renders as a permanent fallback even when the row is
  fresh, and it is the entire block when the state is unknown.

---

## 5. Architecture, and the reconciliation

**This section is the most important judgment in this document.**

### 5.1 Two implementations exist today

They were built independently, they both work, and they disagree. Verified
against the files on 2026-07-19.

| | **A. static-HTML (`keel/` + `tools/`)** | **B. Next.js (`nsc/`)** |
|---|---|---|
| State | Built, functional, **launch-held** | Draft, invisible in production |
| Visibility | `noindex` meta, no sitemap entry, no tools-hub card | `status: "draft"`; `getTree` returns null unless `NODE_ENV=development` or `NAVIGATOR_PREVIEW=1` |
| Domain coverage | **All eight** | **One** (Talking) |
| Engine | `keel/lib/navigator.mjs`, 81 lines, dependency-free ESM shared verbatim by the browser page and the CI grader | `nsc/lib/navigator.ts`, pure TS walker with router nodes |
| Instrument shape | **Flat age-gated questionnaire.** Every applicable question is asked; class is the max over triggered flags | **Actual branching tree.** Router nodes fan out by age; question options name their own `next` node |
| Terminal vocabulary | **Three:** `typical_range` < `discuss` < `priority_discuss` | **Four:** `typical_range`, `monitor`, `discuss`, `act_now` |
| Domain slugs | `walking_movement`, `social_eye_contact`, `hearing_responding`, `behavior_regulation` | `movement`, `social`, `hearing`, `regulation` |
| "I'm not sure" answer | **Absent.** Answer sets are yes/no, yes/sometimes/not-yet, and the three-level clarity set | **Present and grader-required** on every question |
| Per-node citations | **Absent.** Citations attach to *floors*, via `sources` ids into `floor_sources.v1.json` | **Present and grader-required.** 10 citation ids in the Talking tree, all `verified: false` |
| Loss-of-skills rule | `always_asked` node in all eight domains plus a global floor | First-question rule plus "Yes" must reach `act_now` |
| Grader | `keel/graders/floors.mjs` plus `selftest.mjs`: exhaustive path enumeration, approved artifacts must pass and all ten planted-violation fixtures must fail | `nsc/tools/navigator/grader.ts`: 10 checks (structure, reachability, bounded depth, loss-of-skills, not-sure, lexicon, no-identifiers, readability FK<=7, citations, publish gate) |
| Part C explainer | **Absent** | Present (`PART_C_BLOCK`, `PART_B_BLOCK`) |
| Evaluation explainer | **Absent** | Present (`EVALUATION_BLOCK`) |
| "Seek care promptly" block | **Absent** | Present (`SEEK_CARE_BLOCK`) |
| State directory | **Absent** | `part_c_directory` reference table, public read |
| Session logging | **None by design.** Answers live in page memory, discarded on navigation | `navigator_sessions`, service-role write from a server action, first-party cookie anon id |
| Email capture | **Absent.** Print only | **Absent.** Print only |
| Corrected-age rounding | Fractional | Floored |
| Launch mechanism | `keel/scripts/launch-navigator.mjs`, one command, three spots, refuses to run twice | Flip `status` to `published` in the artifact |

**Corrections to the dispatch characterization.** Three things were stated in the
brief that the files do not bear out, and they change the recommendation:

1. The keel artifact is **not a branching decision tree**. It is a flat,
   age-gated questionnaire with flag aggregation. `trees.v1.json` is a misleading
   filename. This matters: the plan's "4-8 branching questions per domain" is
   satisfied by implementation B's shape and only approximated by A's.
2. The disagreement is **wider than terminal vocabulary and domain count**. The
   two also disagree on domain slugs, on whether "I'm not sure" exists, on
   whether citations attach per node or per floor, on corrected-age rounding, and
   on whether anything is stored at all.
3. **Neither implementation has the email capture**, which the plan calls the
   product's entire strategic purpose. Both stop at print. That is the largest
   single gap in the product and it is invisible from either codebase alone.

### 5.2 The recommended convergence path

**Named tradeoff (decided): converge on the Next.js implementation's *shape*,
governed by the keel's *floors*, and treat the static tool as the launch-ready
fallback rather than the destination.**

**Four tiers beat three.** `monitor` is the tier that lets a tool say "inside
the range, and here is when to look again" without alarming a parent or closing
a door, and the keel artifact already invents it informally through `recheck`
notes attached to `typical_range`. Making the recheck an explicit class is more
honest than hiding a fourth state inside the first. The mapping is mechanical:
`typical_range` splits into `typical_range` and `monitor` on the presence of a
recheck note; `discuss` maps to `discuss`; `priority_discuss` maps to `act_now`.

**The keel floors beat the nsc citation table** as the severity authority,
because floors are grader-enforced by exhaustive enumeration against ten
planted-violation fixtures, while the nsc trees cite CDC URLs at
`verified: false`. Convergence keeps both: floors bind severity, per-node
citations bind claims. A tree must satisfy the floors grader **and** carry a
resolving citation on every node.

**The cost, stated plainly.** This path discards roughly seven-eighths of the
authored keel content, because converting a flat eight-domain questionnaire into
seven more branching trees is authoring, not transformation. The cheap
alternative is to launch the static tool as-is after D3 with the action sheet
bolted on, which gets eight domains live in days rather than months but
permanently forfeits the branching shape, per-node citations, sessions, and the
email capture the funnel depends on.

**Interim posture, and it is not a fudge.** Until convergence completes:

- The **static tool remains the launch-ready artifact**. If D3 clears before the
  Next.js version has more than one domain, launching the static tool with the
  action sheet added (§14) is the correct call and this spec endorses it.
- The **floors artifact becomes the shared authority immediately**.
  Implementation B comes under the floors grader in PR0, before any new domain is
  authored, so the two cannot drift further while convergence is in flight.
- **Domain slugs unify on the nsc short form** (`movement`, `social`, `hearing`,
  `regulation`), since they are public URL segments and shorter URLs are better
  SEO targets. A `slug_aliases` map keeps the keel floors binding by their
  existing keys.

**Open decision R2 (§13):** run both surfaces in parallel during convergence,
risking two live tools giving two different answers, or keep the Next.js version
dark until it reaches eight domains. This spec recommends **keeping it dark**:
"two doors, one answer" is the product's core claim and is worth more than a few
months of earlier traffic on a single domain.

### 5.3 Runtime after convergence

Next.js App Router, TypeScript, Tailwind, Supabase, Vercel. Trees served from the
repo as frozen JSON. Zero runtime model calls. The engine is a pure walk; the
grader enumerates every path through the same code the parent runs, which is what
makes "what CI certified is what parents get" a true statement rather than a
slogan.

---

## 6. Evidence layer

### 6.1 The core pool

**`keel/artifacts/shared/floor_sources.v1.json` is this product's core citation
pool.** Nine entries, status `drafted_pending_matthew_verification`. Per
`00-CONVENTIONS.md` §7 these carry `verified: true` in the sense of being carried
over from an already-registered repository pool, and they remain pending
Matthew's read against the papers. CI enforces referential integrity: no floor
without a source id, no deleting a source id a floor references.

| id | Role in this product |
|---|---|
| `zubler2022` | Typical-range framing and the 2022 CDC milestone revision |
| `cdc_ltsae` | Public-domain milestone checklists, citable and reproducible |
| `filipek1999` | The canonical absolute red flags, including loss of skills at any age |
| `aap_referral` | Surveillance to screening to referral; the always-route-to-conversation posture |
| `rescorla1989` | Late-talker criterion at 24 months |
| `noritz2013` | Motor floors, early hand preference, asymmetry |
| `jcih2019` | Hearing: caregiver concern alone warrants referral, no watch-and-wait |
| `flipsen2006` | Stranger-intelligibility expectations at 36m and beyond |
| `zwaigenbaum2015` | Response to name, joint attention, pointing to show, regression |

Two further registered pools are available and may be cited as `verified: true`:
`nsc/content/citations.v1.json` (19 entries, G1-verified 2026-07-07) and
`corpus/citations.json` (11 registered organizational sources, including
ZERO TO THREE, NAEYC, and Pathways.org).

### 6.2 Seeds behind the G1 gate

The Talking tree in `nsc/content/navigator/talking.v1.json` carries ten citation
ids, **all currently `verified: false`**: seven CDC milestone-checklist pages by
age, one CDC "concerned about development" page, one AAP hearing page, and one
ECTA families page. These are real, reachable public pages, not fabrications, but
none has been through the G1 pass. They are seeds. No artifact ships with a
`verified: false` citation; the `publish-gate` check in the grader enforces
exactly this and is the reason the Talking tree cannot accidentally go live.

No DOI, volume, or page number appears anywhere in this spec that is not
transcribed from `floor_sources.v1.json`. Do not add one from memory.

---

## 7. Certification harness

### 7.1 Static checks per tree artifact

JSON Schema validation; the never-diagnostic lint across every string (§3.7);
Flesch-Kincaid grade 7 or below; the coverage matrix of §4.2; no name
placeholders anywhere.

### 7.2 Structural property checks

Reachability (zero orphans), bounded depth (8 questions maximum), router
catch-all completeness, no dangling option or route targets, node id matches map
key, every terminal has at least two body paragraphs.

### 7.3 Safety property checks

Loss-of-skills short-circuit on every path; exactly one "I'm not sure" per
question and it never reaches reassurance; every reassurance terminal carries the
standing invitation; every action sheet carries the seek-care block.

### 7.4 The floors grader

`keel/graders/floors.mjs` enumerates every path exhaustively and fails the build
if any floor-matching path lands below its `min_class`. `keel/graders/selftest.mjs`
certifies the grader itself: the approved artifacts must pass, and **all ten
planted-violation fixtures must fail**. Per `00-CONVENTIONS.md` §6, any change to
an instrument, a threshold, or a terminal class must state how the floors grader
continues to pass and must assume the ten fixtures still fail.

**For the changes this spec proposes, that statement is:**

- The three-to-four tier split (§5.2) preserves order. `typical_range` and
  `monitor` both sit below `discuss`, and every floor whose `min_class` is
  `discuss` or `priority_discuss` is unaffected. The only floors touching the
  bottom tier are the two policy floors, and the standing invitation is required
  on both `typical_range` and `monitor`, which is strictly more coverage than
  today.
- The corrected-age rounding change to floored (§1.2) is **verified
  safety-neutral**, by measurement rather than argument. See §7.4.1.
- Domain-slug unification is aliased, not renamed, so floor bindings resolve
  unchanged.

### 7.4.1 Rounding change: what was actually run, and a coverage gap it exposed

Run locally on 2026-07-19 in the spec worktree. Free, no API calls.

**Step 1, baseline.** `node keel/graders/selftest.mjs` on unmodified `main`:
approved artifacts pass at **372,689 cases**, all ten planted-violation fixtures
correctly fail, exit 0.

**Step 2, the change applied.** `correctedAge` in `keel/lib/navigator.mjs`
switched to `Math.max(0, Math.floor(ageMonths - w / 4.345))`. Selftest re-run:
**identical result**, 372,689 cases pass, ten fixtures fail, exit 0.

**Step 3, and this is the part that matters.** That green is **vacuous on its
own**, and reporting it as the verification would have been misleading.
`correctedAge` is called only inside `resolve()`. The grader calls `classify()`
and `askedQuestions()` directly and never calls `resolve()`, and its enumeration
loop passes only `(domain, age, answers)` with no `weeksEarly` argument at all.
**The Navigator floors grader never exercises corrected age.** A green selftest
after a corrected-age change proves nothing about that change.

**Step 4, the real test.** A differential enumeration was written instead,
comparing the two rounding conventions across every domain, every integer age 0
to 40, every `weeksEarly` 0 to 16, and every answer path. It is committed beside
this spec as `specs/drafts/verify-rounding.mjs` so the result is reproducible
rather than reported. Run `node specs/drafts/verify-rounding.mjs`; it is
read-only, needs no network, and exits non-zero if the conventions ever diverge
or if a non-integer threshold appears:

| Measure | Result |
|---|---|
| Cases compared | 179,204 |
| `(age, weeksEarly)` pairs where the two roundings differ numerically | 2,208 |
| Asked-question-set differences | **0** |
| Classification differences | **0** |

The cause is structural, not luck: all 77 age thresholds in the two artifacts are
integers, and `Math.floor(x) >= N` exactly when `x >= N` for integer `N`.

**Step 5.** The engine change was **reverted**. This branch carries specs only
and contains no edit to `keel/`. Verified with `git diff` and a final green
selftest.

**The coverage gap is now the finding.** Corrected age is a safety-relevant
computation for preterm babies and it sits entirely outside the grader that
certifies this product. Two consequences:

1. Any future change to `correctedAge`, the `4.345` constant, the 3-week
   threshold, or the 24-month cutoff would ship with a green CI and no coverage.
   Today's no-op result does not generalize: **introduce one non-integer
   threshold and the safety-neutrality argument collapses silently.**
2. **PR0 acceptance criterion, added:** extend the Navigator enumeration to vary
   `weeksEarly` over 0 to 16 and route through `resolve()` rather than
   `classify()`, and add a planted-violation fixture that softens a floor only on
   the preterm path. Today that fixture would pass the grader, which is the
   definition of a gap. This is cheap: the enumeration already exists and the
   case count rises by roughly the 17x weeksEarly factor, well within CI budget.

### 7.5 CI wiring

Cert harness runs on every content PR. A cert report is committed beside the
artifacts. The runtime refuses to load an artifact whose hash lacks a matching
passing report, the same pattern `nsc/lib/artifacts.ts` already implements.

---

## 8. Data model (prose plus annotated field lists, no DDL)

Per `00-CONVENTIONS.md` §3, nothing here is a migration. A real migration for
this product already exists at `nsc/supabase/migrations/0007_navigator.sql`; it
is **read-only reference** for this spec and is described in prose below, not
restated.

### 8.1 Session records

One row per completed walk. Privacy by architecture, meaning the row is
incapable of holding an identifier rather than merely discouraged from it.

- **id.** Generated identifier.
- **anonymous id.** Opaque value from a first-party, http-only, same-site
  cookie. Not an advertising id, not a device fingerprint, not shared.
- **user id.** Null for anonymous parents. Populated only when the parent is
  already signed in, and nulled rather than cascaded if the account is deleted.
- **domain.** One of the eight slugs.
- **age in months.** Integer, range-checked 0 to 120.
- **corrected.** Boolean, whether the corrected-age rule applied.
- **path.** The enumerated walk as (node id, answer label) pairs, both drawn from
  the artifact's own enumerations and length-capped defensively. Because no
  question accepts free text, this field cannot hold a child's name, a provider's
  name, or an anecdote.
- **terminal id** and **tier.** Which sheet was reached.
- **created at.** Timestamp.

Row-level security is on with no user-facing policies; writes go through a
server action holding the service role. Reads are aggregate only, through the
admin surface. **Retention is 12 months, after which rows are aggregated to
counts and purged.** The purge is a scheduled job and a §14 launch-bar item, not
a later nicety: a retention promise without a cron is a false statement.

### 8.2 Part C directory

Public reference data, publicly readable, never user-derived.

- **state.** Two-letter code, the key.
- **state name**, **agency name**, **phone**, **url**, **notes.**
- **last verified.** Date, per row. Drives the stale badge at 6 months (§4.3).

Rows enter only after human verification against the ECTA Center directory.
There is no write path from the application.

### 8.3 What is deliberately absent

No child rows. No names. No dates of birth (age in months only, entered per
session, never stored against a profile). No free text. No IP stored against a
session. **No third-party ad pixels on any `/worried/*` page, ever.** That last
one is a build-time assertion, not a policy document: the route group's analytics
allowlist is empty, and a test fails if a script tag with an external origin
appears in the rendered `/worried/*` HTML.

The static implementation goes further and stores nothing at all, holding answers
in page memory and discarding them on navigation. If convergence lands on the
Next.js surface, **that reduction in privacy is a real regression and must be
disclosed to counsel**, since the D3 packet describes the local-only design. R3
in §13.

---

## 9. Screens

Mobile first. The parent is holding a phone in a dark room.

Brand: Tidepool tokens only, per `00-CONVENTIONS.md` §4. Deep teal `#15393C` ink,
brand teal `#1E5F62` action, teal-soft `#2E7A77`, aqua mist `#F0F5F3` ground,
surface white, sea glass `#CFE3DE`, line `#D4E0DC`, ink-soft `#3D5A5A`.
Bricolage Grotesque display, Source Serif 4 body. The superseded palette and type
pairing named in the dispatch brief are not used here; see `README.md` §3.1 for
that discrepancy and its provenance.

**The coral rule, specific to this product.** Coral `#DE7356` is the system's
single warm accent, and on a result screen it sits one visual step from reading
as an alarm. Binding constraints:

- Coral **never** fills a result card, result background, or class chip at full
  strength. The shipped page's `color-mix` at 18 percent transparent is the
  ceiling for any concern-tier surface.
- Coral **never** appears in the seek-care block. That block is ink-soft on aqua
  mist, deliberately quieter than the developmental content around it, so it
  reads as a standing note rather than a warning.
- Coral's one legitimate use here is the serif-italic phrase inside the headline,
  the brand's signature move, which carries no severity meaning.
- Tiers are distinguished by **typographic weight, card border, and label**, not
  by a red-to-green ramp. There is no traffic-light palette in this product. A
  parent must read the words to learn the result.

Screens:

1. **`/worried` index.** Eight domain cards; unpublished domains render as "on
   the way," not as broken links.
2. **`/worried/[domain]` landing.** Public, indexed, targeted at the exact
   phrasings parents search. Says what the tool is and is not before asking
   anything.
3. **Age entry.** Months picker, then the born-early follow-up. Two taps.
4. **Question card.** One question, large type, expandable help, enumerated
   options as full-width targets, an always-visible "I'm not sure," and a back
   control that does not lose the walk.
5. **Action sheet.** §3, in order, all blocks, no gate.
6. **Print view.** Ungated, sheet only, serif, black on white.
7. **Email capture.** Inline on the sheet, below the fold, one field plus
   consent. Never a modal, never an exit-intent popup on this route group.

Motion is restrained: one quiet transition between questions, honoring
`prefers-reduced-motion` with an instant fallback. No confetti, no progress
celebration, no animated result reveal. Nothing here may feel like a game show.

**OG treatment.** Generic and identical for every result in a domain: domain
name, product name, Tidepool arch motif. **Never any child-specific data in an OG
image or a URL.** Result state lives in memory and in the session row, never in a
shareable query string, so no URL can leak a walk.

---

## 10. Ecosystem slot

**Layer 1, free.** Portfolio plan §2.1 lists the Navigator first among the free
traffic-and-trust assets. It is free permanently, and the free-ness is load
bearing: it is the mission statement and the reason a skeptical parent trusts
anything else on the site.

Cross-links:

- **To the Language Milestone Coach (the handoff that matters most).** A parent
  who reaches `discuss` or `act_now` in Talking, Understanding, or Social is
  handed to the LMC as "a way to track this over time and bring a real record to
  the appointment," never as an upsell in the anxiety moment. The handoff is
  safe to make because the two tools share floors: `no_pointing_to_show_15m`
  exists in both artifacts under the same id, with the artifact's rationale
  stating the reason plainly, so the routing handoff can never produce
  contradictory severities. Any change to a shared floor changes both tools or
  neither.
- **To the Activity Library.** Three free activities per action sheet, matched
  to the domain, in the "while you wait" block. Free tier, no gate.
- **To the Claims Library.** Evidence backing for the typical-range block.
- **To the Communication Snapshot**, already launched, which shares this
  product's architecture and disclaimer posture. Counsel is told in the D3 packet
  that any finding here likely applies there.
- **To membership**, only through the day-4 email, never on the sheet.

Email sequence, from plan §4.2, worry segment, five emails over ten days: what
evaluations look like, then Part C rights, then supporting development while you
wait, then how tracking helps (LMC introduction), then the membership offer with
a trial. Segmentation is set at capture by asset and by domain.

---

## 11. Telemetry

Aggregate only, never per-child, never surfaced to a parent.

| Signal | Target | What a miss means |
|---|---|---|
| Completion rate (starts to action sheet) | **>= 60%** | Questions are too many or too clinical |
| Email capture (share of completions) | **>= 25%** | Below 15% the prep checklist incentive gets rethought before more domains ship |
| Drop-off by question id | no single question above 15% abandonment | That question's wording is failing |
| Class distribution by domain and age band | sanity check against the floors | A `typical_range` share that looks implausibly high is a false-reassurance smell and triggers a floors re-read |
| "I'm not sure" rate per question | below 25% | Above that, the observable is not observable enough to ask about |
| Stale directory rows | zero above 6 months | The quarterly task slipped |
| Print and email split | monitored, no target | Informs whether the PDF is the right incentive |

The success metric is **completion rate**. The rework trigger is **capture below
15%**.

---

## 12. Build sequencing

No auto-merge. Every PR carries acceptance criteria. **No PR below launches
anything; D3 gates the launch switch separately.**

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR0** `nav/floors-unification` | Bring the Next.js implementation under `keel/graders/floors.mjs`; add the slug alias map; change corrected-age rounding to floored in both engines | Floors grader green on both; all ten planted-violation fixtures still fail; no behavior change at any non-boundary age |
| **PR1** `nav/tier-split` | Four-tier vocabulary; mechanical mapping of keel `recheck` notes into `monitor`; grader updates | Every existing path maps to exactly one new tier; floors order preserved; §7.4 statement re-verified in CI |
| **PR2** `nav/action-sheet` | Complete sheet per §3, including the per-domain script fix, the Part C and Part B blocks, the evaluation block, and the seek-care block on **both** surfaces | Every terminal renders every block; block-completeness check green; seek-care block present on all eight static domains |
| **PR3** `nav/part-c-directory` | State lookup, stale badge, ECTA fallback; **rows entered by hand, no generation** | 50 rows, each with a `last_verified` date and a named human verifier in the PR description; stale badge renders at the 6-month boundary in a test |
| **PR4** `nav/capture` | Email PDF plus appointment prep checklist; domain segment tagging; consent copy | Capture fires without gating the sheet; segment lands correctly; no capture on the print path |
| **PR5** `nav/privacy-assertions` | Empty third-party allowlist for `/worried/*`; the rendered-HTML external-script test; the 12-month retention purge job | Test fails when a pixel is introduced; purge job runs against seeded old rows |
| **PR6..PR12** `nav/domain-{slug}` | One PR per remaining domain, content-gated, authored against the keel questionnaire as the source of observables | Grader green including citations; floors exercised; a domain expert has read the tree |
| **PR13** `nav/landers` | Eight `/worried/[domain]` landing pages targeting worry queries | Lighthouse and a11y pass; canonical absolute; no pixel |
| **PR14** `nav/telemetry` | §11 signals and the admin aggregate view | Events flowing; no per-child field anywhere in the payload |

PR0 through PR2 are the critical path and can precede D3. PR3 through PR5 are
independent. The domain PRs are content-throughput-bound, not
engineering-bound.

---

## 13. Risks and open decisions (Matthew to rule)

1. **R1 Naming.** "Milestone Navigator" (static tool) versus "Should I be
   worried?" (route group). Both are shipped strings. The second is the search
   query parents actually type; the first is the one in the attorney packet.
   Changing the name after counsel has reviewed the packet costs a re-read.
2. **R2 Convergence posture.** Keep the Next.js version dark until eight domains
   exist (recommended), or run both surfaces in parallel and accept that two live
   tools may give two different answers during the overlap.
3. **R3 Privacy regression disclosure.** The static tool stores nothing; the
   Next.js tool stores a session row. The D3 packet describes the former. If
   convergence lands on the latter, counsel must be told before launch, because
   the packet's data-practices section would otherwise be stale.
4. **R4 PDF without email.** Offering an ungated PDF download alongside the
   ungated print view would be more generous and would cost capture. Print is
   currently the ungated portable path; whether that is generous enough is a
   judgment call.
5. **R5 The floors artifact is still
   `drafted_pending_matthew_verification`.** The grader guarantees the tools
   match the artifacts. Only Matthew can certify that the artifacts match the
   literature. Nothing in this product is scientifically certified until that
   pass completes.
6. **R6 Behavior and Regulation.** The sparsest floors, the most judgment, and
   the domain most likely to produce either false reassurance or over-referral.
   Consider shipping it last, or not in v1.
7. **R7 Geographic scope.** All Part C and Part B copy assumes the United
   States. Counsel question 7 in the D3 packet asks whether a US-only statement
   is needed. A parent outside the US currently receives a correct developmental
   result attached to an irrelevant referral pathway.
8. **R8 The seven unwritten domains.** Converting the keel questionnaires into
   branching trees is authoring work with a domain-expert read per tree. It is
   the long pole and it is not compressible by tooling.

---

## 14. Definition of done

Launch bar. Every item, no partial credit.

- **D3 attorney review cleared**, findings incorporated, and the packet's
  data-practices section re-verified against whatever surface is actually
  launching (R3).
- **G1 citation verification complete.** Zero `verified: false` entries in any
  shipping artifact; the `publish-gate` check green.
- **Floors grader green**, all ten planted-violation fixtures still failing, on
  the exact artifacts being shipped.
- **Every action sheet complete**: what you told us, what is typical, corrected
  age where it applies, the literal script including the trigger sentences, the
  Part C or Part B explainer with the free-regardless-of-income and
  no-referral-required facts, what an evaluation looks like, three free
  activities, the static seek-care block, the standing invitation, the
  disclaimer.
- **Reading level grade 7 or below** across every string in every artifact.
- **Never-diagnostic lint clean**, zero tolerance.
- **50 Part C rows**, each human-verified against ECTA, each with a
  `last_verified` date, stale badge proven in a test.
- **Privacy assertions in CI**: no external script origin on any `/worried/*`
  page, no free-text field in any tree type, no name placeholder in any string,
  retention purge job running.
- **Capture live** and segment-tagged by domain, with the result ungated ahead
  of it.
- **Generic OG** on every result, no walk state in any URL.
- **A real parent** completes a walk on a phone, in one hand, and can read the
  script sentences out loud without editing them.
