# Arcade word data

`words-20k.txt` is the 20,000 most common English words from
https://github.com/first20hours/google-10000-english (derived from the Google
Web Trillion Word Corpus; the repository is MIT licensed). It is a frequency
ranking only: `build-words.mjs` intersects it with the system dictionary
(`/usr/share/dict/words`, Webster's 1934 list, public domain) so every word the
puzzles accept is a real word, and every answer is a common one.

    node scripts/arcade/build-words.mjs        # writes assets/data/arcade/five.json and nest.json
    node scripts/arcade/fill-mini.mjs          # prints candidate 5x5 fills to author clues against

The outputs are committed; the build runs by hand when the lists change.

## Mobile sweep

`mobile-sweep.mjs` opens the hub and every game at ten phone and tablet
viewports (320x568, iPhone SE, iPhone 15, Pixel 7, iPad; both orientations;
2x to 3x pixel density) in headless Chrome with phone metrics, starts each
game, rotates it mid-run and closes it. It needs the global `@playwright/cli`
install and Chrome, and a local server for the checkout
(`node scripts/fg-gate.mjs --serve 4321`).

    node scripts/arcade/mobile-sweep.mjs                       # everything, screenshots to a temp dir
    node scripts/arcade/mobile-sweep.mjs --games blocks,echo --profiles sel,320l
    node scripts/arcade/mobile-sweep.mjs --throttle --no-shots  # frame rate under 4x CPU throttling
    node scripts/arcade/mobile-sweep.mjs --compare <earlier out dir>

It prints, per game and viewport, the field scale (CSS px per logical unit,
from `data-scale` on the canvas), buttons under 44 px, elements outside the
viewport, whether the board scrolls, whether the rotate hint showed, whether a
mid-run rotation paused the game, and console errors. The numbers in
`docs/arcade/plan.md` section 11 came from it.
