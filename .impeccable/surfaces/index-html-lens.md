---
version: 1
slug: "index-html-lens"
primary_target: "index.html#lens"
related_targets: ["assets/css/home-lens.css", "assets/js/home-lens.js"]
---

# Homepage Developmental Lens

Mode: Persuade. Teach one familiar moment in a way that feels natural, memorable,
and functional on a phone. Matthew selected the Overdrive guided scene and
clarified that the ambition must remain while information and required clicks
stay low. Preserve the existing photograph, Haze midpoint #F8F9FB, forest ink,
Newsreader/Inter, dark mode, and the standalone full Lens with its research.

## Direction contract

THESIS: An ordinary scroll changes how a parent sees the same scene. The
interface guides attention instead of asking the parent to operate a lesson.

OWN-WORLD: A real photograph, a precise moving focus frame, quiet stage notation,
and four short passages in the field-guide voice. One optional full-guide link.

STORY: Observe the change of plan, understand that regulation is developing,
consider a practical response, and reflect without judging. Brief excerpts from
the existing homepage/full Lens carry the lesson; detailed sources remain in
the full guide. Right Now narration and recordings are outside this change.

FIRST VIEWPORT: Title and context, then the photograph beside four consecutive
reading beats. The photograph remains in view while native scrolling advances
its focus frame and caption. On phones the compact photo stays below the site
header while each passage passes underneath, leaving room to read.

FORM: The previously selected guided scene, adapted to the user's direction:
scroll is the input. No hotspot hunting, tab selection, accordions, next buttons,
scroll hijacking, autoplay, or hidden lesson text. A single 420ms FLIP transition
moves the frame; reduced motion moves it instantly. IntersectionObserver runs
as reading beats cross the reading line; a scroll-end update handles large
native jumps. Older browsers use a debounced scroll-end fallback. No continuous
animation loop or per-scroll layout reads run in production.

FINISH: One batched desktop/mobile inspection, fix the surfaced defects together,
then one confirmation. Verify native scroll selection in both directions,
keyboard scrolling, no-JavaScript/blocked-script reading, dark mode, reduced
motion, contrast, responsive layouts, and unchanged surrounding homepage content.

## Verification — 2026-11-02

Completed the batched inspection and confirmation. The short-landscape crop
and caption reset after large scroll jumps were corrected. Chrome automation
passed at 320×740, 390×844, 430×932, 768×1024, 1440×1000, and 667×375.
All four lessons remain visible, native scrolling selects each stage in both
directions, keyboard scrolling preserves focus, and the one full-guide link
has a visible focus state. Dark mode, reduced motion, no JavaScript, blocked
enhancement, and missing IntersectionObserver preserve a usable lesson. No
horizontal overflow, JavaScript errors, invalid frame geometry, or AA text
contrast failures were found. The standalone Lens behavior remains unchanged.

A 750ms Chrome scrolling sample held 60fps both normally and with 4× CPU
throttling (17ms worst frame). This is simulated performance, not a physical
phone test. Screenshots and the inspection report are in
`output/home-lens-scroll/`; integration checks are in
`scripts/smoke-home-lens.mjs`.

Markup outside the Lens matches the pre-change homepage after excluding the
new asset references and content hashes. Asset stamps and diff whitespace
checks pass. Impeccable found zero anti-patterns; its advisory concerns the
preexisting footer wordmark's white text, outside this module. Release preparation uses the current production branch, preserves the current
From Little Onward branding, and leaves Right Now's scripts and recorded
narration untouched.

## Release integration — 2026-11-02

Applied the approved module to current main after Right Now PR #197. Its image
variants are packaged explicitly because newer main uses other scene assets.
The rest of the homepage is byte-identical to current main, excluding the two
new asset references and their hashes. Shared home.css/home.js and the standalone
Lens page remain unchanged. The full six-viewport integration suite, light/dark
contrast checks, reduced-motion and no-script fallbacks, generated-page checks,
canonical checks, cache stamps, and diff whitespace checks pass. Desktop and
phone captures confirm the approved scene with current production branding.
