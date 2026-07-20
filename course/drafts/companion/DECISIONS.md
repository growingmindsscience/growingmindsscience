# Decisions log

Resolved 2026-07-19. Every open scope flag from the companion drafting pass now
has a researched decision behind it. This file records what was decided, the
evidence, and the places where the evidence did not settle the question and a
judgment call was made instead.

Branch: `course/first-year-2026-07-19`. Still DRAFT. Nothing published.

---

## Decision 1: Email cadence

**Decided: 12 teaching emails plus a closing request, across 84 days.**
Day 0, 2, 5, 9, 14, 21, 28, 35, 42, 56, 70, 84, and 84 for the request. Gentle
front-load, weekly plateau, fortnightly taper. Never more than three emails in
any week. Emails 5 onward all fall on multiples of 7, so they snap to a fixed
weekday.

**Send day and time: Tuesday, about 10am recipient-local, for emails 5 onward.**
Emails 1 to 4 stay relative to signup.

**Previous state:** Day 0 through Day 32, roughly every three days. Denser and
shorter than the evidence supports, and invented.

### Evidence

- **Weekly is the tested dose that works.** A randomized trial of personalized
  weekly email reminders in a self-paced online program raised the probability of
  being on schedule by 14 percentage points (64% vs 53%), n = 39
  ([JMIR Formative Research 2023](https://formative.jmir.org/2023/1/e43977)).
  The mechanism was orientation ("here is where you are"), not pressure, which
  suits this brand.
- **Weekly works for new-parent education specifically.** Text4baby sends weekly
  messages timed to the baby's birth date and retained 73% of an economically
  disadvantaged sample
  ([BMC Public Health](https://bmcpublichealth.biomedcentral.com/articles/10.1186/1471-2458-12-1031)).
- **There is a real over-sending cliff.** Zhang, Kumar & Cosguner (2017),
  *Journal of Marketing Research* 54(6), modelled email volume and found a
  nonlinear effect: sends raise purchase levels up to a threshold and reduce them
  past it. Retail rather than education, but the only peer-reviewed formal
  support for the cliff's existence.
- **Benchmarks.** Mailchimp Education and Training: 35.64% open, 0.18%
  unsubscribe. Kit's creator-economy report: 44% open, 0.5% unsubscribe across
  28.4 billion sends. The roughly 2.8x higher unsubscribe rate among creators,
  who send more aggressively, is itself an argument for restraint.
- **Expect attrition.** Kit's guidance puts completion of a 10 to 15 email
  sequence at 20 to 35%. Roughly two thirds will not reach the end, which is why
  the highest-value content sits early.

### Where this is a judgment call, not a finding

**The evidence does not show that exhausted parents need low frequency. It
suggests the opposite.** The Essential Coaching for Every Mother RCT sent 53
messages, twice daily for two weeks then daily for four, and improved parenting
self-efficacy while reducing postpartum anxiety
([Digital Health 2022](https://journals.sagepub.com/doi/full/10.1177/20552076221107886)).
A related feasibility study found over 90% read messages daily and 80% were happy
with the frequency.

So the calm cadence here is **a brand-integrity argument, not an empirical one**.
The defensible reasoning: weekly is sufficient to produce the behavioral effect
we want, there is a real cliff somewhere above it, a calm cadence costs little in
measurable effect, and it is the only cadence consistent with a stated principle
of calm over urgency. A sequence that decelerates is the shape of a course that
trusts you to take your time. One that accelerates is the shape of a launch
funnel.

**Treat as unreliable:** the widely quoted "Salesforce 19 billion sends"
unsubscribe statistic could not be traced to any Salesforce publication. Do not
cite it. And the Tuesday 10am recommendation rests on vendor open-rate analyses
that Apple Mail Privacy Protection has substantially corrupted, with no
education-vertical or parent-specific data behind it. **Treat send time as the
first thing to A/B test, not as a finding.** Parents of infants have fragmented
device time including night feeds, and the general population's mid-morning peak
may not describe them. If the ESP supports per-subscriber send-time
optimization, use it and skip the guess.

---

## Decision 2: Pricing, and where the ask lives

**Decided: $49, matching the toddler class. Not $59.**

- The First Year (0 to 12 months): **$49**, lifetime access, unlimited Growing
  Minds AI included, milestone tracker included.
- **Early-bird for existing waitlist members: $39.** Not a marketing device: the
  live page at `classes/birth-to-12-months.html` already promises waitlist
  members "early-bird pricing locked in before public launch," and that promise
  needs a real number behind it.
- **Two-course bundle (First Year + Toddler Years): $79.**

### Why $49, against the researched recommendation of $59

The pricing research recommended $59, positioning against self-paced hospital
newborn eClasses ($30 to $100, clustering $45 to $75) and below the
outcome-promising tier (Taking Cara Babies $79 to $179, Big Little Feelings $99,
Precious Little Sleep $395). That reasoning is sound and the market data is
solid. **Two facts from this repo, which the research did not have, override it.**

1. **The toddler class is 5 modules and 29 lessons. This course is 6 modules and
   26 lessons.** Verified by counting `### Lesson` headings in the drafts and
   reading `classes/toddlerhood.html`. By the metric the site already publishes,
   this course is *smaller*. Charging more for fewer lessons is not defensible
   and invites exactly the comparison it would lose.
2. **The $49 toddler class already includes Growing Minds AI for life,
   unlimited** (`pricing.html`: "Growing Minds AI, included for life. One
   payment, no subscription."). A $59 product with fewer lessons and the same
   inclusion is worse value on both axes, and a parent comparing the two class
   pages would see it immediately.

A third reason is strategy rather than arithmetic. The 0 to 12 month course is
the **wider-funnel entry product**: parents meet this brand when they have a
newborn, not a toddler. A lower entry price on the wider-funnel product is sound,
and the pricing research itself named this as the condition under which $49 flat
is the better call.

A flat, memorable price list also suits a brand whose promise is the absence of a
funnel. $9, $34, $49, $49, bundle $79 is a list a parent can hold in their head.

### Where the ask lives, and why not where you would expect

**The email sequence is post-purchase.** Email 1 opens "Welcome. You are in" and
tells the reader to open Module 1. Every subsequent email addresses someone who
already owns the course.

**So a purchase ask cannot live in this sequence.** A sales pitch aimed at
someone who has already paid is precisely the behavior this brand refuses.

The single ask that belongs here is therefore **not commercial**: it is the
feedback and testimonial request, new email 13 (see Decision 4). The toddler
class is mentioned once, in the closing email, as information for a parent whose
baby is aging out of this course's range. That is useful, not a pitch.

**The purchase ask lives on the landing page and in the waitlist launch note**,
where a prospect actually is. If a prospect-facing nurture sequence is wanted
later, that is a separate asset and should be drafted as one rather than bolted
onto this.

### Thin evidence, flagged honestly

- No evidence exists on willingness-to-pay for myth-correcting parent education.
  The claim that an honesty position constrains rather than commands a premium is
  reasoning from the observed mechanics of the premium tier (live access,
  scarcity, promised outcomes, none of which this course has), not from data.
- New-parent price sensitivity research is contradictory and mostly
  marketing-blog quality. Not relied on.
- **The strongest missing input is internal.** Conversion on the $49 toddler
  class matters more than any comparable. If it converts well with no price
  objections, $49 here is safe and possibly conservative. If it converts poorly,
  price is not the problem.

---

## Decision 3: Enrollment route and CTAs

**Decided: follow the existing class precedent. Host on Thinkific, link out. Do
not build one-time Stripe checkout for launch.**

### What the repo actually does

The instruction assumed the site's Stripe checkout pattern. It does not work that
way, and this is worth stating plainly:

- **Courses are sold on Thinkific.** `classes/toddlerhood.html` and
  `pricing.html` both link out to
  `matthew-s-site-de0b.thinkific.com/products/courses/ToddlerYears`. Checkout
  happens off-site.
- **The site's own Stripe checkout is subscription-only.**
  `api/create-checkout-session.js` is hardcoded to `mode: "subscription"` with a
  single AI Pro price ID. It cannot process a one-time course payment unmodified.
- `api/stripe-webhook.js` defaults unlabelled purchases to `"toddlerhood-class"`,
  a latent bug the moment a second course exists.

Building one-time Stripe checkout would mean a `mode: "payment"` branch, a new
price ID, entitlement storage, and a course-delivery mechanism the site does not
have. Thinkific already provides all of it. For launch, the precedent wins.

### CTA routing

- **Pre-launch:** both landing page CTAs point to
  `/classes/birth-to-12-months.html#waitlist`, the existing waitlist form, which
  posts to `/api/waitlist` and subscribes to Kit.
- **At launch:** CTAs point to this course's Thinkific product URL, exactly as
  the toddler class does, with `target="_blank" rel="noopener"`.

### Relationship to the existing page

`companion/landing-page.html` is a **draft replacement for
`classes/birth-to-12-months.html`**, not a new URL. That page is live now with a
"Coming soon" badge and a waitlist. At launch it should be replaced in place,
preserving the URL, with the badge and waitlist swapped for enrollment.

### Needs wiring before launch

1. Create the Thinkific course and get its product URL.
2. Replace `classes/birth-to-12-months.html` with the new page, keeping the URL.
3. Update `pricing.html`: add the course as a fourth product card, plus the bundle.
4. **Fix the webhook default.** `api/stripe-webhook.js` falls back to
   `"toddlerhood-class"` for unlabelled purchases. With two courses that
   mislabels data. Set an explicit product on every session.
5. Send the waitlist launch note with the $39 early-bird, honoring the promise
   already on the live page.

### Discrepancies between the live page and these drafts, for a human to resolve

The live `classes/birth-to-12-months.html` makes public promises the drafted
course does not match:

- **The live module list differs.** It advertises The Newborn Brain / Reading
  Your Baby's Cues / Attachment in the First Year / **Sleep: What the Science
  Actually Says** / Language Before Words / Motor and Sensory Development. The
  drafts put sleep inside Module 5 and add a sixth module, Everyday Life, that is
  not advertised. Either the page or the course structure needs to move. The
  promised standalone sleep module is the sharpest mismatch.
- **"~1 hour each."** These modules run 6,000 to 9,000 words, roughly 30 to 45
  minutes of reading each. Close, but check against the final format rather than
  assuming.

---

## Decision 4: Social proof and its collection

**Decided: launch with no testimonials. Build honest collection into the
sequence.**

There are no students yet, so there is nothing real to quote. The alternatives
were inventing quotes, which is fabrication and was never on the table, or
launching without. Launching without is straightforwardly correct, and the
landing page is written so no slot depends on social proof to make sense.

**Collection mechanism: new email 13, sent Day 84**, when a reader has had the
course long enough to have an opinion worth hearing. It asks for one specific
thing rather than a general rave, makes participation genuinely optional, and
asks separately for permission to quote. Nothing is published without explicit
consent.

The empty placeholder comment stays in `landing-page.html` until there is
something real to fill it with.

---

## Decisions 5 and 6: The two withheld quiz questions stay withheld

**Final. No question on tummy time dose, and none on breastfeeding and cognitive
outcomes.**

- **Tummy time dose.** The hourly target is consensus guidance, not a
  trial-derived threshold. Any question with a clean correct answer would imply
  precision the evidence lacks, and the course's whole position is that it does
  not do that.
- **Breastfeeding and cognition.** The honest answer is that it is unsettled.
  Every workable distractor set read as a verdict on a feeding decision many
  parents cannot freely make. The cost to a tired reader outweighed the teaching
  value, and the modules already cover the topic properly in prose, where the
  nuance survives.

Both topics remain taught in the module text. They are simply not quizzed. That
was the fair call when made, and re-examination did not change it.
