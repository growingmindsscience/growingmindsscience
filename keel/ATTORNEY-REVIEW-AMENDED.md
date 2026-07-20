# Milestone Navigator: attorney review packet (AMENDED DRAFT)

> **DRAFT FOR ATTORNEY REVIEW. NOT APPROVED. SUPERSEDES NOTHING.**
>
> `ATTORNEY-REVIEW.md` remains the operative packet until counsel signs off on
> this one. This document exists because a factual review of the codebase on
> 2026-07-19 found that the original packet's **Data practices** section
> describes only one of two implementations that now exist, and states as
> unqualified fact something that is true of the one being launched and false
> of the other.
>
> Nothing here is legal analysis, and nothing here answers the questions posed
> to counsel. This is a corrected statement of **facts** so that the legal
> judgment is made against an accurate description of the system. Every factual
> claim below was verified against the shipping code on 2026-07-19; §7 records
> the file and line for each and marks the three items that could **not** be
> verified from the repository.

**Prepared:** 2026-07-19
**Status of the launch blocker:** unchanged. `DECISIONS.md` D3 stands. Build
proceeds, launch does not.
**Relationship to the original packet:** additive correction. The original's
description of the tool's behavior, copy, severity vocabulary, substantiation
posture, and questions 1 through 4, 6 and 7 are unaffected. **Section 5
(Minors' data) and the Data practices section are materially affected.**

---

## 1. Why this amendment exists

The original packet says, without qualification:

> No account, no sign-in, no server-side processing. Answers are held in
> page memory and discarded on navigation; nothing about the child is
> transmitted to us or any third party.

and asks counsel, in question 5, to:

> Confirm COPPA and state minor-privacy statutes are satisfied by the
> local-only design.

**Those statements are accurate for the tool that is being launched.** They are
not an accurate description of the codebase, because a second implementation of
the same product now exists that does write to a server-side database.

That second implementation is **not** what the D3 launch command releases, is
**not** currently reachable by the public, and is **not** what counsel was asked
about. But counsel is being asked to approve a design characterized as
"local-only," and the codebase contains a Navigator that is not local-only.
Correcting the record before sign-off is cheaper than correcting it after, and
it avoids counsel's opinion resting on a premise that a later, ordinary-looking
engineering step would silently invalidate.

**The practical risk being addressed:** if counsel approves "the local-only
design" and the second implementation later ships, the approval would be read
as covering a system it never described. The fix is to tell counsel both exist
now.

---

## 2. There are two implementations

| | **A. Milestone Navigator** (static) | **B. "Should I be worried?"** (Next.js) |
|---|---|---|
| Location | `tools/milestone-navigator.html` | `nsc/app/worried/` |
| Public URL | `growingmindsscience.com/tools/milestone-navigator` | `growingmindsscience.com/nsc/worried/...` (proxied to `nsc-lake.vercel.app`) |
| Domains covered | **All eight** | **One** (Talking) |
| Status | Built, functional, `noindex`, unlinked, held by D3 | Draft artifact, **not rendering publicly** (§3.2) |
| **Server-side storage** | **None** | **Yes: `navigator_sessions`** |
| Released by the D3 launch command | **Yes** | **No** (§3.3) |
| Described in the original packet | Yes | **No** |

**This is the correction in one line: the original packet describes A. B also
exists.**

### 2.1 Implementation A: the original packet's description holds

Re-verified on 2026-07-19, field by field:

- **No network transmission of answers.** The page makes exactly one network
  request, `fetch("/keel/artifacts/navigator/trees.v1.json")`, which downloads
  the question set. Nothing is uploaded. There is no other `fetch`, no
  `XMLHttpRequest`, and no `sendBeacon` anywhere in the file.
- **Answers live in page memory** and are gone on navigation.
- **The printable sheet** is generated client-side.
- **The site-wide child profile** is stored under the localStorage key
  `gms-child-v1` and holds, per child, `{ id, name, birthdate, band, createdAt }`.
  It uses a wrapper that falls back to an in-memory object when localStorage is
  unavailable, so a blocked-storage browser keeps it in memory only. **No code
  path transmits it.**
- **Analytics:** the page loads `/_vercel/insights/script.js` (Vercel
  Analytics). It is the only third-party script on the page. No answer data is
  passed to it.

**One imprecision in the original**, minor and non-substantive: it describes
"2-6 plain-language yes/no/not-yet questions." The shipping artifact contains
**3 to 6** questions per domain (play 3; understanding 4; talking, social,
hearing, behavior 5; movement and fine motor 6). No domain asks fewer than
three.

### 2.2 Implementation B writes to a server

`nsc/app/worried/[domain]/walker.tsx` calls a server action,
`logNavigatorSession`, at the moment a walk reaches a terminal. The action
inserts one row into the Postgres table `navigator_sessions` using a
**service-role** client.

This is deliberate and documented in the code as "privacy by architecture." It
is not an accident or an oversight. It is simply **not local-only**, and the
original packet has no sentence covering it.

---

## 3. Exactly what implementation B stores

Verified field by field against `nsc/supabase/migrations/0007_navigator.sql`
and `nsc/app/worried/actions.ts`.

### 3.1 The `navigator_sessions` row

| Column | Type | What it actually contains | Disclosure notes |
|---|---|---|---|
| `id` | uuid | Random row id | |
| `anon_id` | text | A random UUID minted by `crypto.randomUUID()` and stored in a **first-party cookie** named `gms_nav_anon` | Not derived from any user or device attribute. See §3.4 |
| `user_id` | uuid, nullable | **The authenticated account id, when the visitor is signed in.** Null for anonymous visitors | **This is the single most disclosure-relevant field.** See §3.5 |
| `domain` | text | Which worry area, e.g. `talking` | Reveals the subject of the parent's concern |
| `age_months` | int, 0-120 | The child's age in months, rounded and clamped | Not a birthdate. Month granularity |
| `corrected` | boolean | Whether corrected age was applied | **True implies the child was born more than 3 weeks premature.** See §3.6 |
| `path` | jsonb | The enumerated walk: `[{node, answer}]`, capped at 16 steps, each string truncated to 64 characters | Node ids and answer **labels** only. See §3.3 |
| `terminal_id` | text | Which result was reached | |
| `tier` | text | The result class, e.g. `typical_range`, `discuss`, `priority_discuss` | Reveals the outcome |
| `created_at` | timestamptz | Insert time | |

**Taken together, one row records: a child's age in months, whether the child
was born premature, which developmental domain a parent was worried about, the
parent's specific answers to that domain's questions, and what the tool told
them.** For a signed-in visitor, that record carries an account identifier.

**No name, no birthdate, no free text.** There is no free-text input anywhere in
the tree by design, so no free text can reach the table.

### 3.2 What is transmitted but not stored

Worth stating precisely, because transmission and storage differ.

The client builds each step as `{ node, question, answer }`, where `question` is
the **full question text**. That object is passed to the server action, so the
question text does cross the network. The server action's insert maps only
`node` and `answer`; **`question` is dropped and never written.**

The question text is static product copy, identical for every visitor, and
carries nothing about the child. Noted for completeness rather than concern.

### 3.3 Current public reachability

`nsc/lib/navigator.server.ts` returns a tree only when its artifact status is
`published`, unless `NODE_ENV === "development"` or the environment variable
`NAVIGATOR_PREVIEW === "1"` is set.

The only tree that exists, `nsc/content/navigator/talking.v1.json`, has
`status: "draft"`.

**Therefore, in production, the walker does not render, and no
`navigator_sessions` row can be written.** The table exists and the code path is
deployed, but the gate is shut.

**Two caveats, stated because counsel should not rely on an unverifiable
claim.** First, this holds only while `NAVIGATOR_PREVIEW` is unset on the
deployment; that is a Vercel environment setting and **could not be verified
from the repository** (§7). Second, the gate opens the day any tree's status is
flipped to `published`, which is a one-word artifact change.

### 3.4 The `gms_nav_anon` cookie

| Property | Value |
|---|---|
| Name | `gms_nav_anon` |
| Value | Random UUID v4, minted server-side on first Navigator completion |
| `httpOnly` | `true` (not readable by page JavaScript) |
| `sameSite` | `lax` |
| `path` | `/` |
| `maxAge` | `31,536,000` seconds (**365 days**) |
| First or third party | **First party.** No third-party cookie is set |

The cookie is set only when a walk reaches a terminal, not on page load. It
links repeat Navigator sessions from the same browser to each other for one
year. It is not used for advertising, is not shared, and no third-party ad pixel
exists on any `/worried` route.

### 3.5 The signed-in case, which is not anonymous

The code and the migration both describe these sessions as "anonymous." That is
accurate for a signed-out visitor. **For a signed-in visitor it is not:**
`logNavigatorSession` calls `supabase.auth.getUser()` and writes the returned
account id into `user_id`.

The result is a row associating a **named account** with a developmental concern
about that account holder's child, the child's age, prematurity status, the
specific answers given, and the outcome.

Growing Minds Science accounts are held by parents, not children. But the
**subject** of the record is a child, typically under five. Whether that
distinction carries the weight the original packet's question 5 assumed is a
legal question, and it is now a different legal question than the one that was
asked, because the premise "nothing is transmitted or stored server-side" does
not hold for implementation B.

### 3.6 The `corrected` flag

`corrected` is `true` when the tool applied corrected age, which happens only
when the parent reported the child was born **more than 3 weeks early** and the
child is under 24 months.

Stored as a boolean, it is a durable record that a specific child was born
preterm. Combined with `user_id`, prematurity becomes attributable to an
identified account holder's child. Flagged explicitly because it is the field
most likely to be read as health information and it is the least visible: it
looks like an implementation detail rather than a data point about a child.

### 3.7 Access control

- `navigator_sessions` has **row level security enabled with no policies
  defined.** Under Postgres RLS, that denies all access to ordinary and
  anonymous roles. Reads and writes are possible only via the **service role**
  key, which is server-only and never sent to a browser.
- **No user-facing read path exists.** A signed-in parent cannot view, export,
  or delete their own Navigator session rows through any interface, because none
  is built.
- `part_c_directory`, the state early-intervention reference table, is public
  read by policy. It contains only public agency contact information: state,
  agency name, phone, url, notes, and a `last_verified` date. **No user data.**

### 3.8 Retention, as designed and as implemented

The migration comment states the intent:

> Retention: 12 months, then aggregate and purge (cron to follow).

**That cron does not exist.** The only scheduled job in `nsc/vercel.json` is
`/nsc/api/cron/engagement`, and the only route under `nsc/app/api/cron/` is
`engagement`. No purge job, no aggregation job, and no deletion path of any kind
references `navigator_sessions`.

**Accurate statement of the retention position today: rows would be retained
indefinitely.** The 12-month policy is a documented intention with no mechanism
behind it. Since no rows are currently being written (§3.3), nothing is
accumulating, but the gap would become live the moment a tree is published.

---

## 4. Corrected data-practice statements

**Proposed replacement for the original packet's Data practices section.** The
original text is preserved in §6 for comparison.

> **Data practices**
>
> Two implementations of this tool exist. What follows describes both.
>
> **The tool being launched (`/tools/milestone-navigator`) processes nothing
> server-side.** There is no account and no sign-in. Answers are held in page
> memory and discarded on navigation. The page makes one network request, to
> download its own question set; it uploads nothing. No answer, and nothing
> about the child, is transmitted to us or to any third party.
>
> The optional site-wide child profile (name and birthdate, used to prefill age)
> is stored in the browser under `gms-child-v1`, falls back to memory when
> browser storage is unavailable, and is never transmitted.
>
> The printable "notes for our visit" sheet is generated in the browser and goes
> only to the user's printer.
>
> The site serves Vercel Analytics for aggregate page views. No answer data
> reaches it. There is no advertising pixel on this tool or on any `/worried`
> route.
>
> **A second implementation exists in the codebase and does record sessions
> server-side.** It is a Next.js rebuild covering one of the eight domains,
> currently gated off in production and not released by the launch step for the
> tool above. When it is enabled, completing a walk writes one row containing: a
> random first-party identifier held in a 365-day cookie; the signed-in account
> id **if the visitor is signed in**, otherwise null; the domain; the child's
> age in months; a flag indicating whether corrected age was applied, which
> implies the child was born more than three weeks premature; the enumerated
> answer path as node ids and answer labels; the result reached; and a
> timestamp. It records no name, no birthdate, and no free text, because the
> tool accepts no free text. The table is service-role only and denies all
> other access. **A 12-month retention policy is documented but not yet
> implemented, and no user-facing view, export, or deletion path exists.**

---

## 5. Revised and additional questions for counsel

Questions 1 through 4, 6 and 7 of the original packet are unaffected and stand
as written.

### 5.1 Question 5, replaced

The original asked counsel to confirm that COPPA and state minor-privacy
statutes "are satisfied by the local-only design." **That question can no longer
be asked in that form**, because it presumes a fact that holds for one
implementation and not the other.

**Proposed replacement:**

> **5. Minors' data, across two designs.** The tool being launched processes
> nothing server-side; parents enter observations that never leave the device.
> A second implementation, built but gated off, records per-session rows
> containing a child's age in months, a prematurity flag, the parent's
> enumerated answers, the outcome, a 365-day first-party identifier, and, for
> signed-in visitors, the account id.
>
> (a) For the local-only tool: are COPPA and state minor-privacy statutes
> satisfied by that design, and do the on-page privacy representations
> ("everything stays on this device") create warranty exposure?
>
> (b) For the server-recording implementation: what obligations attach before it
> may be enabled? We are specifically unsure about the prematurity flag and the
> account linkage, which together make a health-adjacent attribute of a named
> account holder's child durably attributable.
>
> (c) Does approving (a) now create any exposure if (b) later ships, and would
> you want the approval scoped explicitly to the local-only design?

### 5.2 New questions arising from the second implementation

> **8. Retention with no mechanism.** The design documents 12-month retention
> and aggregation; no such job exists, so rows would persist indefinitely once
> writing begins. Does a stated-but-unimplemented retention policy create
> exposure distinct from having no stated policy at all, and should the
> mechanism be a precondition of enabling the feature?

> **9. Absent subject-access path.** There is no interface by which a parent can
> view, export, or delete their Navigator session rows. Does this need to exist
> before the feature is enabled, and does the answer differ by state?

> **10. Consent posture for the cookie.** `gms_nav_anon` is first-party,
> httpOnly, strictly functional, set only on completion, and used for no
> advertising. Does it require disclosure or consent in any jurisdiction we
> serve, and does a 365-day lifetime change that answer?

> **11. Scope of your sign-off.** We would like the opinion to state plainly
> which implementation it covers, so that enabling the other is understood to
> require a fresh look rather than inheriting this one.

---

## 6. Changelog against the original packet

| # | Section | Change | Why |
|---|---|---|---|
| 1 | **Data practices** | Rewritten to describe both implementations (§4) | The original describes only the static tool and reads as a description of the whole product |
| 2 | **Data practices** | "No server-side processing" now scoped to the launching tool | True of A, false of B |
| 3 | **Question 5** | Replaced with a three-part question (§5.1) | The original presumes a local-only design |
| 4 | **New §2** | The two implementations, side by side | Counsel had no way to know B existed |
| 5 | **New §3** | Field-by-field description of `navigator_sessions` | Needed for any minors-data analysis |
| 6 | **New §3.5** | The signed-in case is not anonymous | Code and migration both call it "anonymous"; that is incomplete |
| 7 | **New §3.6** | The `corrected` flag implies prematurity | Least visible, most sensitive field |
| 8 | **New §3.8** | Retention is documented but unimplemented | The original made no retention claim |
| 9 | **New Q8-Q11** | Retention, subject access, cookie consent, scope of sign-off | All arise only from B |
| 10 | **§2.1** | "2-6 questions" corrected to "3-6" | Minor factual accuracy |
| 11 | **Unchanged** | Tool behavior, copy, severity vocabulary, substantiation, launch mechanics, Q1-4, Q6-7 | Re-verified as accurate |

**What has not changed:** the disclaimer language, the copy inventory, the
substantiation posture, the CI floors check, the launch command, and the D3
launch block itself. The original packet's characterization of what the tool
says to parents was re-checked and remains accurate.

---

## 7. Verification record

Every factual claim above traces to a file read on 2026-07-19. Claims marked
**UNVERIFIED** could not be checked from the repository and should be confirmed
before counsel relies on them.

| Claim | Source |
|---|---|
| Table shape, RLS enabled with no policies, retention comment | `nsc/supabase/migrations/0007_navigator.sql` |
| Insert path, field mapping, caps, service-role client | `nsc/app/worried/actions.ts` |
| Cookie name, httpOnly, sameSite, 365-day maxAge, UUID minting | `nsc/app/worried/actions.ts` |
| `user_id` populated from `supabase.auth.getUser()` | `nsc/app/worried/actions.ts` |
| Logging fires only at a terminal, two call sites | `nsc/app/worried/[domain]/walker.tsx` |
| `question` transmitted, not stored | `walker.tsx` builds it; `actions.ts` maps only `node`/`answer` |
| Draft gate and `NAVIGATOR_PREVIEW` | `nsc/lib/navigator.server.ts` |
| Talking tree `status: "draft"` | `nsc/content/navigator/talking.v1.json` |
| No purge cron | `nsc/vercel.json` crons; `nsc/app/api/cron/` contains only `engagement` |
| Static tool makes one fetch, uploads nothing | `tools/milestone-navigator.html` |
| Vercel insights is the only third-party script | `tools/milestone-navigator.html` |
| Child profile key, fields, memory fallback, never transmitted | `assets/js/gms-tools.js` |
| Question counts 3 to 6 per domain | `keel/artifacts/navigator/trees.v1.json` |
| Launch script touches only the static site | `keel/scripts/launch-navigator.mjs` (zero references to `nsc`) |
| `part_c_directory` public-read, no user data | `nsc/supabase/migrations/0007_navigator.sql` |
| Communication Snapshot fetches artifacts only | `tools/communication-snapshot.html` |

**UNVERIFIED, three items:**

1. **Whether `NAVIGATOR_PREVIEW=1` is set on the production deployment.** It is a
   Vercel environment variable and is not in the repository. If set, the draft
   tree renders and rows are being written **today**. **This should be checked
   before counsel reads this packet**, because it changes §3.3 from "the gate is
   shut" to "the gate is open."
2. **Whether migration 0007 has been applied** to the Supabase project.
   `nsc/README.md` flags it as pending; `docs/phase-3-identity-convergence.md`
   states 0005 through 0007 are applied. The two documents contradict each
   other. If unapplied, the table does not exist and inserts fail silently, since
   the action swallows all errors.
3. **What Vercel Analytics and the platform log independently**, including IP
   addresses and request metadata at the edge. No application code stores an IP,
   but platform-level logging was not audited and is outside what the repository
   can show.

**A note on item 2's failure mode.** `logNavigatorSession` wraps its entire body
in `try { } catch { }` with an empty handler, commented "Analytics must never
break the action sheet." That is correct for user experience. It also means a
failing insert is invisible: no error, no log, no user-visible symptom.
Counsel does not need to act on this; it is recorded so that "no rows exist" is
never inferred from "nothing appeared to go wrong."
