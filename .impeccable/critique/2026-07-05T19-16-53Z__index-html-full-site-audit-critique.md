---
target: index.html (full site audit + critique)
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-07-05T19-16-53Z
slug: index-html-full-site-audit-critique
---
# Critique — Homepage (index.html), post-enhancement

Re-critique after the token/contrast/motion work shipped. Prior: 33/40.

## Anti-Patterns Verdict — not AI slop; cleaner than before
Distinctive Tidepool system + now a signature beat (.hl settle) and signature interaction (Growth Arc). Detector: 2 findings on index.html, both confirmed false positives (single-font via var() indirection; documented 01-05 curriculum sequence).

## Design Health Score: 35/40 — Good (upper end), +2 vs prior
1 Visibility 4 (up: motion acknowledges state) | 2 Match 4 | 3 Control 3 | 4 Consistency 4 (up: token/font debt removed, easing unified) | 5 Error-Prev 3 | 6 Recognition 4 | 7 Flexibility 3 | 8 Aesthetic 4 | 9 Recovery 3 | 10 Help 3
The +2 lifts are exactly the two dimensions the work touched (Consistency, Visibility). Prior lone P1 resolved.

## What's Working
1. Two-tier signature: .hl settle (once-per-load flourish) + Arc (repeatable, keyboard-accessible, coral-dot interaction).
2. Calm survived the motion — everything eases/blooms/crossfades; nothing bounces.
3. Coral restraint held — motion didn't leak coral into hover states everywhere.

## Priority Issues (minor)
[P2] Long single-column scroll — ~7 tall sections, hero ~2 screens, first CTA below fold on mobile. On-brand pacing but risks time-poor parent bailing. Consider sticky mini-CTA / anchor on mobile. -> /impeccable layout
[P3] Two token vocabularies still coexist: home.css (--mist/--pine) vs inner system (--bg/--ink), bridged by inline <style> in index.html. Full naming unification still open. -> /impeccable extract
[P3] [data-drift] decor keeps will-change:transform permanently (inner-page card will-change now scoped to :hover). -> /impeccable optimize
[P3 verify] AI chat demo auto-types a scripted conversation; did not re-confirm reduced-motion + screen-reader live-region behavior this pass. -> /impeccable audit (.ai section)

## Persona Red Flags
- Casey (mobile): length is the one real friction (CTA below fold, ~7 sections). Rest clean.
- Jordan (first-timer): little breaks; obvious first action, Arc invites exploration.
- Sam (a11y): strong; AI demo auto-animation is the one unverified spot.

## Questions
- Does the homepage need all seven sections, or could AI demo / ways move to their own surfaces to shorten the path to "See the class"?
- The Arc is the best interaction — discoverable enough, or does it need a subtle "try me" affordance?
