# The mark: arcs and a sprout

Matthew supplied a concept on 2026-10-15: three arcs rising into a leaf, with the lowercase "growing minds" and a tracked SCIENCE. He chose to keep the sprout. The files in `assets/img/brand/` redraw that concept as clean vectors. The review sheet, with the concept beside the redraw, is `brand-mark-review.png` in this folder.

## What the redraw changed, and why

- **The arcs no longer share one centre.** Each arc's centre steps down and to the right, and their ends are staggered, so the gaps widen toward the leaf. Three concentric quarter-arcs with round ends read as a Wi-Fi signal; stepped arcs read as a stem unfurling.
- **A second drawing for small sizes.** At 32px and below, three arcs merge. `mark-small.svg` has two arcs, heavier strokes and a larger leaf. The favicon and the home-screen icon use it.
- **Brand colours only.** Arcs in forest ink `#193C39` with the leaf in sage-deep `#8DAE9A` on paper. On forest ink, arcs in sage `#A9C3B2` with the leaf in `#CFDFD6`.
- **SCIENCE in verdigris `#245F58` on paper** (7.4:1), and sage on forest ink. Pale sage on paper, as in the concept, is too light for small text.
- **Outlined type.** The name is Newsreader 500 and SCIENCE is Inter 600, tracked 0.30em, converted to outlines so the files look the same everywhere.

## Files

| File | Use |
| --- | --- |
| `mark.svg`, `mark-dark.svg` | The mark alone, light and on forest ink |
| `mark-small.svg`, `mark-small-dark.svg` | The mark at 48px and below |
| `lockup-horizontal.svg`, `-dark` | Mark beside the name: header, email, documents |
| `lockup-stacked.svg`, `-dark` | Mark above the name: covers, social avatars, title slides |
| `favicon.svg` | Browser tab; switches to the light-on-dark colours when the browser is in dark mode |
| `favicon-16/32/48.png` | Fallbacks for browsers without SVG favicons |
| `apple-touch-icon-180.png` | iOS home screen, on a paper tile |
| `icon-192.png`, `icon-512.png`, `app-icon.svg` | Android, PWA manifest, large uses |
| `social-avatar-1080.png` | Social profile pictures: the mark at 62% on forest ink, so a circular crop keeps it whole. Set on Instagram 2026-10-18 |

## Rules

- Do not recolour the mark outside the pairs above, stretch it, rotate it, or add effects.
- Keep clear space around the mark of at least the leaf's width.
- Below 48px use the small drawing. Below 16px use the wordmark alone.
- The tagline "See what's growing." may sit under the lockup on covers and campaigns, never inside the header.

## Regenerating

`scripts/brand-mark/build.py` draws every SVG; `scripts/brand-mark/render.mjs` rasterises the PNGs with the Chrome that Playwright drives. The build needs `fonttools` and `uharfbuzz`, plus Newsreader and Inter from Google Fonts (`ofl/newsreader/Newsreader[opsz,wght].ttf`, `ofl/inter/Inter[opsz,wght].ttf`) in a `fonts/` folder beside the script.

## Not done yet

The mark is wired in (PR 122, then PR 129 for the /nsc app): the header and footer lockups, `favicon.svg`, the 32px icon and the touch icon on every page. Still to do: the web manifest and the social preview images (for example the Growing Minds AI page's `og:image`, which still points at the old logo PNG).
