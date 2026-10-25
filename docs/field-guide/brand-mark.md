# The mark: arcs and a sprout

Matthew supplied a concept on 2026-10-15: three arcs rising into a leaf, with the lowercase "growing minds" and a tracked SCIENCE. He chose to keep the sprout. The files in `assets/img/brand/` redraw that concept as clean vectors. The review sheet, with the concept beside the redraw, is `brand-mark-review.png` in this folder.

## What the redraw changed, and why

- **The arcs no longer share one center.** Each arc's center steps down and to the right, and their ends are staggered, so the gaps widen toward the leaf. Three concentric quarter-arcs with round ends read as a Wi-Fi signal; stepped arcs read as a stem unfurling.
- **A second drawing for small sizes.** At 32px and below, three arcs merge. `mark-small.svg` has two arcs, heavier strokes and a larger leaf. The favicon and the home-screen icon use it.
- **Brand colors only.** Arcs in forest ink `#193C39` with the leaf in sage-deep `#8DAE9A` on paper. On forest ink, arcs in sage `#A9C3B2` with the leaf in `#CFDFD6`.
- **Outlined type.** The name is Newsreader 500 and the descriptor Inter, converted to outlines so the files look the same everywhere.

## The From Little Onward wordmark (2026-10-25)

After the rename, the lockups were redrawn to match the site header: "from little" in Newsreader 500, then ONWARD in Inter 500, uppercase, tracked 0.32em. Name and ONWARD are forest ink `#193C39` on paper and white on forest ink; the mark keeps its colors. The horizontal lockup sets ONWARD on the name's baseline, as the header does. The stacked lockup puts ONWARD on its own line under the name, centered. The mark itself did not change.

## Files

| File | Use |
| --- | --- |
| `mark.svg`, `mark-dark.svg` | The mark alone, light and on forest ink |
| `mark-small.svg`, `mark-small-dark.svg` | The mark at 48px and below |
| `lockup-horizontal.svg`, `-dark` | Mark beside "from little ONWARD": email, documents, partner decks (the header draws its own inline copy with the small mark) |
| `lockup-stacked.svg`, `-dark` | Mark above "from little", ONWARD beneath: covers, title slides |
| `favicon.svg` | Browser tab; switches to the light-on-dark colors when the browser is in dark mode |
| `favicon-16/32/48.png` | Fallbacks for browsers without SVG favicons |
| `apple-touch-icon-180.png` | iOS home screen, on a paper tile |
| `icon-192.png`, `icon-512.png`, `app-icon.svg` | Android, PWA manifest, large uses |
| `social-avatar-1080.png` | Social profile pictures: the mark at 62% on forest ink, so a circular crop keeps it whole. Set on Instagram 2026-10-18 |

## Rules

- Do not recolour the mark outside the pairs above, stretch it, rotate it, or add effects.
- Keep clear space around the mark of at least the leaf's width.
- Below 48px use the small drawing. Below 16px use the wordmark alone.
- The brand line "Every grown-up starts little." may sit under the lockup on covers and campaigns, never inside the header. "See what's growing." is retired.

## Regenerating

`scripts/brand-mark/build.py` draws every SVG into `out/` (or `MARK_OUT`); copy the files you changed into `assets/img/brand/`. `scripts/brand-mark/render.mjs` rasterises the PNGs with the Chrome that Playwright drives. The build needs `fonttools` and `uharfbuzz` (`MARK_PYLIB` can point at a folder they are installed in), plus variable `Newsreader.ttf` and `Inter.ttf` in a `fonts/` folder beside the script or in `MARK_FONTS`. The site's own `assets/fonts/newsreader-v26-latin.woff2` and `inter-v20-latin.woff2` work once decompressed to TTF with fontTools (`brotli` installed); the 2026-10-25 lockups were built that way.

## Not done yet

The mark is wired in (PR 122, then PR 129 for the /nsc app): the header and footer lockups, `favicon.svg`, the 32px icon and the touch icon on every page. The site-wide social preview is `assets/img/og/site-brand.png` (PR 187, `scripts/build-site-og-card.mjs`). Still to do: the web manifest.
