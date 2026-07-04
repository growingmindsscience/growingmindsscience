---
target: index.html (full site audit + critique)
total_score: 33
p0_count: 0
p1_count: 1
timestamp: 2026-07-04T21-13-15Z
slug: index-html-full-site-audit-critique
---
# Full Audit + Critique — Growing Minds Science ("Tidepool")

Target: index.html + sitewide (inner pages, 4 stylesheets, light/dark, mobile).

## Anti-Patterns Verdict — Not AI slop.
Distinctive Tidepool system: cool teal/mist ground, one-coral rule, coral serif-italic .hl signature, arch motif, custom SVG decor, Bricolage + Source Serif 4. Dark mode is a genuine second art-direction pass.

Detector: 91 findings, loud ones are FALSE POSITIVES vs the documented system:
- single-font (23x): Source Serif 4 applied via var(--font-body) indirection; both fonts verified loading/rendering. Ignore.
- numbered-section-markers (6x): 01-05 are documented ordered-curriculum. Intentional.
- flat-type-hierarchy (9x): all on tool pages' inline <style> (20px-max scale), not marketing pages.
Useful signals: 34 undocumented colors (mostly arcade easter-eggs), 17 radius drifts.

## Audit Health Score (technical): 18/20 — Excellent
1. Accessibility 4/4 — skip links, landmarks, single h1, labeled forms, :focus-visible, reduced-motion, AA both themes. One razor-thin token.
2. Performance 3/4 — inner pages ship styles.css (2642) then refresh.css (1523) overriding it; cascade waste.
3. Responsive 4/4 — no overflow at 375px, fluid clamp, 48px pills.
4. Theming 3/4 — full persisted [data-theme], but two divergent token vocabularies + dead font tokens.
5. Anti-Patterns 4/4 — distinctive, intentional, on-brand.

## Design Health Score (Nielsen): 33/40 — Good (near excellent)
1 Status 3 | 2 Match 4 | 3 Control 3 | 4 Consistency 3 | 5 Error-Prev 3 | 6 Recognition 4 | 7 Flexibility 3 | 8 Aesthetic 4 | 9 Recovery 3 | 10 Help 3

## What's Working
1. Disciplined signature system — coral only where One-Coral Rule allows; no small-coral misuse found.
2. Mature accessibility — pre-paint theme, reduced-motion without hiding content, AA both themes (dark clears with margin: button 7.6:1, body 11:1).
3. Dark mode is a real design (mint-teal CTA on pine, coral-on-dark highlight, tonal-band depth).

## Priority Issues
[P1] Two token systems + dead font declarations. styles.css:32-33 declares Instrument Serif/Work Sans (never imported); only works because refresh.css:23-24 overrides. home.css uses a third vocabulary (--mist/--pine) bridged by inline <style> in index.html:28. styles.css:5 comment still says Instrument Serif+Work Sans. Latent-bug risk. Fix: one token vocabulary, delete dead tokens. Command: /impeccable extract or document.
[P2] Stylesheet cascade waste. Inner pages load styles.css(2642) -> refresh.css(1523 override) -> arcade.css(398) + game JS. Fix: flatten refresh into styles, lazy-load arcade. Command: /impeccable optimize.
[P2] --ink-muted at contrast floor. #5C7472 = 4.54:1 on mist (passes by 0.04), 3.7-4.4:1 on sea-glass (own DESIGN.md warns against). No live violation found. Fix: darken one step; audit sea-glass usage. Command: /impeccable audit -> polish.
[P3] Undocumented arcade colors (34) + radius drift (12px), isolated to hidden games. Command: /impeccable document.
[P3] Copy/effect nits: 404.html 9 em-dashes; milestones.html:31 pine glow on dark.

## Persona Red Flags
- Jordan (first-timer): nearly nothing breaks; obvious first action, jargon-free.
- Casey (mobile): full-width thumb-reachable CTAs, no overflow, sized images. Hero tall (~1.7 screens to first CTA).
- Sam (a11y): strongest; keyboard/focus/reduced-motion/AA hold. Watch --ink-muted floor.

## Questions
- Tool pages carry own inline 20px type scale (flatter). Intentional utility register or inherit display hierarchy?
- Three token vocabularies (home/styles/refresh). Cost to consolidate to one?
