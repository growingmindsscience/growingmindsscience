---
version: 2
slug: "index-html-lens"
primary_target: "index.html#lens"
related_targets: ["assets/css/home-lens.css", "assets/js/home-lens.js", "scripts/playground-art.py", "scripts/smoke-home-lens.mjs"]
---

# Homepage playground story

Mode: Persuade. Show the approach through one ordinary moment instead of
explaining it. Replaces the photograph and focus frame (version 1, 2026-11-02)
on Matthew's brief of 2026-11-09. The scroll-led idea is kept: scroll is the
only input, nothing is operated, every beat is in the HTML.

## Direction contract

THESIS: A parent stays warm and holds the limit. The child does not have to be
happy about it for the moment to have gone well.

STORY: Four beats of one playground moment. Time to leave, acknowledge the
feeling, hold the boundary, move together. One short line each. The class
handoff and the full-guide link follow, unchanged.

ART: Matthew's watercolor strip (beats 2 to 4) plus one generated opening beat
in the same hand. Figures on bare paper, no scenery, no cards, no text in the
images. Sources and the build live in `docs/playground-story/source/` and
`scripts/playground-art.py`. The files paint their paper slightly lighter than
Haze and the page draws them with `mix-blend-mode: darken` over a true Haze
sheet, so there is no rectangle. In dark mode the art keeps a Haze sheet.

FORM: A stage pinned under the header for about 2.75 screens of scrolling.
Wide view, closer, still, then opening toward the way home; the scale change
comes from the drawings themselves plus a 3 to 4 percent camera move. One
drawing leaves before the next arrives, so two figures never overlap. Beats 2
and 3 keep the parent in the same spot. If scrolling stops between beats the
picture finishes to the nearer one. Timing and camera numbers are at the top
of `home-lens.js`; copy and image references are in `index.html`.

FALLBACK: No script, reduced motion, a window under 540px tall, or print gives
a plain illustrated sequence with all four beats visible.

## Verification, 2026-11-09

`node scripts/smoke-home-lens.mjs` passes 163 checks in Chrome at 320x640,
390x844, 430x932, 768x1024, 1440x900 and 1920x1080: each beat alone and whole,
caption clear of the picture, forward and reverse, a real mouse wheel slow and
fast, stopping mid-change, reload midway, resize across the breakpoint, dark
mode, reduced motion, no JavaScript, blocked script, exact page ground under
the art. Screenshots are in `output/playground-story/`. Not checked on a
physical phone or in Safari.
