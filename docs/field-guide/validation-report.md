# Field guide validation report

Pages tested: `/index.html` and `/lens/leaving-the-playground.html`, served from the worktree at http://127.0.0.1:8470 on 2026-10-14. Browser: Chrome for Testing (chromium-1228) driven by Node `playwright-core` scripts, because axe and multi-step keyboard flows were easier to script that way than through `playwright-cli`. Scripts live in the session scratchpad (`validate/`). Screenshots are in `.taste-skill/validation/` inside the worktree. The `/_vercel/insights/script.js` 404 is ignored throughout.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Axe (wcag2a, 2aa, 21a, 21aa, 22aa) | Pass, 0 violations in all 9 runs |
| 2 | Console and network errors | Pass |
| 3 | Keyboard | Pass, with one minor note on the skip link target |
| 4 | Reduced motion | Pass |
| 5 | No JavaScript | **Fail**, five explorer panels are hidden |
| 6 | Links | Pass, none broken |
| 7 | Responsive | Pass for overflow and clipping; advisory on touch target height |
| 8 | Dark theme | Pass |
| 9 | Repo gates | Pass (stamp check passes now, so the lead has stamped) |
| 10 | Performance | Pass, with advisory on oversized images |

## 1. Axe

Zero violations on every run: home at 1440, 768 and 390 in light and with `data-theme="dark"`; lens at 1440, 768 and 390 in light. Each page was scrolled to the bottom first so reveal animations had run. That includes the color-contrast rule, so no contrast failures were reported in either theme. No selectors to list.

## 2. Console and network

Both pages at 1440 and 390, scrolled to the bottom. The only console error and the only failed or 4xx request in all four runs was the Vercel insights script. No page errors, no warnings, no other failed requests.

## 3. Keyboard

- Skip link: the first Tab lands on "Skip to content" (`href="#main"`). It becomes visible at (32, 8), 169 by 53 px, with a 2px solid outline. Enter sets `location.hash` to `#main` and `#main` exists. Note: `<main id="main">` has no `tabindex="-1"`, so after activation focus stays on `body` rather than moving into main. Screen reader and next-Tab behavior usually still works in Chrome, but it is not guaranteed in every browser. The focused skip link also touches the "Growing Minds Science" wordmark (`kb-1-skiplink.png`).
- Masthead notes: all four buttons are reachable by Tab. Enter on each moves `aria-pressed="true"` to that button only, and Space returns it to note 1.
- Lens tabs (checked on the homepage lens and the Lens page, identical results): ArrowRight and ArrowLeft move focus, ArrowLeft from the first tab wraps to Reflect, Home goes to Observe, End to Reflect. Focus moves without selecting, and Enter or Space selects (`aria-selected` updates and the matching panel shows).
- Explorer: the range input goes from 27 to 28 on ArrowRight and `aria-valuetext` updates to "2 years, 4 months". Stage tabs respond to ArrowDown, ArrowUp, Home and End, and selection follows focus.
- Focus sweep: 139 consecutive Tab stops on the homepage, every one with a visible outline or box-shadow; none lacked one. Screenshots: `kb-1-skiplink.png`, `kb-3-home-lens-tab-focus.png`, `kb-4-explorer-range-focus.png`, `kb-5-explorer-tab-focus.png`, `kb-2-masthead-note-focus.png`.

## 4. Reduced motion

With `reducedMotion: reduce`, the `anim` class is not added to `<html>`. The homepage has 28 `[data-reveal]` elements and none has computed opacity 0; the Lens page has none. No `.shutter` element is clipped. Every top-level section has non-zero height and text (the lens panels other than Observe are tabbed away by design, not blank). Full-page screenshots: `reduced-home-full.png`, `reduced-lens-full.png`.

## 5. No JavaScript

Fail on one of three requirements.

- Lens: all four step panels (observe, understand, respond, reflect) are visible, on both the homepage and the Lens page. Pass.
- Masthead notes: all four `.masthead__note-text` sentences are visible. Pass.
- Explorer: **all five `[data-stage-panel]` panels are hidden** (0 by 0 px). Cause: in `index.html` the `<div class="explorer__cursor">` that wraps the range input is never closed before `<div class="explorer__body">`, so the tabs and all five panels are nested inside `.explorer__cursor`. `assets/css/explorer.css` line 47 sets `.explorer__cursor { display: none }` until `explorer.js` adds `.explorer-js`. The file's overall `<div>` count is balanced, so another close tag sits later and masks the bug when JS runs. The no-JS fallback intended by the CSS comment ("the cursor and tabs appear only once explorer.js adds .explorer-js") therefore does not work, and it also hides the links in those panels from crawlers and no-JS users. Fix: close the cursor div before `.explorer__body`, and remove the extra close tag later.

Screenshots: `nojs-home-fold.png`, `nojs-home-full.png`, `nojs-lens-fold.png`, `nojs-lens-full.png`.

## 6. Links

Homepage: 80 anchors, 37 unique hrefs. Lens page: 38 anchors, 26 unique. Each same-origin href was resolved against the filesystem and the `vercel.json` rewrites. All resolve: clean URLs such as `/tools/right-now` map to their `.html` files, directory paths (`/classes/`, `/tools/`, `/articles/`, `/about/`, `/claims/`, `/arcade/`, `/faq/`, `/contact/`) have an `index.html`, and `#main`, `#explore`, `#lens` and `/#explore` all match an id on the page. `/nsc`, `/nsc/class-login` and `/nsc/classes/infant/preview` are proxied to nsc-lake.vercel.app and were not fetched. The one external link is the Instagram profile. Broken: none.

## 7. Responsive

Screenshots at 1440, 1024, 768 and 390, fold and full page, for both pages (`resp-<page>-<width>-fold.png` and `-full.png`; also `resp-home-390-explorer.png` and `resp-home-390-lens.png`).

- Horizontal overflow: none at any width on either page (`scrollWidth` equals `innerWidth`). One SVG `rect` extends to x=416 at 390 but is clipped inside its SVG and causes no scroll.
- Clipped text: only visually hidden headings and the intentionally collapsed explorer tab labels (the long age and name are swapped for short ages at narrow widths). No visible text is cut off.
- Touch target height at 390 (links and buttons under 44 px): the homepage has 16 and the Lens page has 5. Homepage: "Explore by age" (26), "Start here." (22, inline), four `.lens__link` items (40), "It's hard right now" and "Class 2, Toddler years" (42), five inline links in the right-now list (22: "Meltdown or tantrum", "Testing a limit", "Won't sleep", "I'm losing my patience", "Something happened between us"), and three inline links "Milestone tracker", "Number Path", "Arcade" (22). Lens page: the same four `.lens__link` items (40) and one inline link "Explore what is growing at oth..." (20). Axe's 24 px target-size rule did not flag any because of the inline and spacing exemptions, so this is advisory.

## 8. Dark theme

With `data-theme="dark"` both pages switch to background rgb(20, 31, 28) with text rgb(237, 235, 227). Fold screenshots `dark-home-fold.png` and `dark-lens-fold.png`, full pages `dark-home-full.png` and `dark-lens-full.png`. Nothing looks low contrast by eye, and axe color-contrast reported nothing for the homepage in dark at three widths. The Lens page in dark was checked visually only, not by axe.

## 9. Repo gates

- `node scripts/check-canonicals.mjs`: pass, all 72 pages declare an absolute canonical.
- `node scripts/stamp-assets.mjs --check`: pass ("every CSS/JS reference is stamped (35 assets, 108 files)"). The lead appears to have stamped already.
- `lint.mjs` on the nine named paths: 0 FAIL, 0 WARN. The lint prompt says to run `inspect.mjs` on the rendered page; that was not part of the request and was not run.

## 10. Performance

Sizes are uncompressed bodies from the local static server, so treat them as upper bounds.

| Page | Requests (incl. 404) | CSS | JS | Images | HTML | DOMContentLoaded | Load |
|------|------|------|------|------|------|------|------|
| Home | 18 | 85,881 B | 21,975 B | 838,997 B | 65,452 B | 290 ms | 456 ms |
| Lens | 11 | 76,538 B | 14,075 B | 99,942 B | 34,282 B | 398 ms | 557 ms |

Largest homepage images: `hero-parent-baby.jpg` 337,762 B, `toddler-blocks.jpg` 177,824 B, `notebook-coffee.jpg` 171,091 B.

Images rendered at less than 40% of intrinsic width at 1440:

- `hero-parent-baby.jpg`: 259 px shown, 1000 intrinsic (26%).
- `child-learning.jpg`: 230 px shown, 1200 intrinsic (19%); on both pages.
- `notebook-coffee.jpg`: 336 px shown, 1200 intrinsic (28%).
- `matthew-photo-600.jpg`: 94 px shown, 600 intrinsic (16%).
- `original-logo-mark-no-words-128.png`: 36 px shown, 128 intrinsic (28%); acceptable for 2x and 3x screens.

`toddler-blocks.jpg` is fine at 73%. These photos could ship at roughly 2x their displayed width.

Asset byte sizes: `field-guide.css` 29,395; `lens.css` 19,754; `explorer.css` 9,343; `tokens-field-guide.css` 7,095; `field-guide.js` 4,407; `lens.js` 9,090; `explorer.js` 3,493.

## Problems found

1. No-JS explorer panels are hidden because of an unclosed `.explorer__cursor` div in `index.html` (check 5).
2. Photos are served far larger than displayed (check 10), notably `hero-parent-baby.jpg` at 338 KB shown at 259 px.
3. Touch targets under 44 px at 390 wide: 16 on the homepage, 5 on the Lens page (check 7).
4. Skip link target `#main` is not focusable, and the focused skip link touches the wordmark (check 3).

## Fixes applied after this report (lead, same day)

1. The unclosed `.explorer__cursor` wrapper was repaired in the fragment and re-spliced; with JavaScript off, all five stage panels now render (measured heights 591, 562, 562, 591, 562 px at 1440). A tag-nesting parse of both pages reports no mismatches.
2. `<main id="main">` carries `tabindex="-1"` on both pages, and the focused skip link now sits below the header instead of over the wordmark.
3. Inline links that measured under 44 px (the right-now list, the hero text links, the explorer and tools links, the Lens connection links) take a 44 px hit area through block padding with a matching negative margin, so the layout is unchanged.
4. The three oversized placeholder photographs and the portrait now ship resized derivatives with `srcset` and `sizes` (640, 640, 720 and 400 px wide), so a 1440 px screen loads about a quarter of the previous image bytes.
5. Assets were re-stamped; `stamp-assets --check`, `check-canonicals` and the taste lint pass, and the browser inspector reports 0 fails on the homepage.
