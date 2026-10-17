# Arcade reboot: plan

Branch `arcade/reboot`, cut from `origin/main` on 2026-10-17. Worktree `.claude/worktrees/arcade-reboot`.

The arcade is ten canvas games on `/arcade/` built on `assets/js/arcade-core.js`. They shipped under the old mark: every game hard-codes `#FD951F` orange and `#9FCB43` lime, draws flat 8-bit rectangles at 200 to 320 logical pixels, and nine of the ten copy the same 250 lines of overlay boilerplate. Pong is a one-off with its own markup, its own audio engine and no leaderboard. Nothing tests the arcade.

This plan covers the five asks: better graphics, graphics on brand, better play with power-ups and story, the skills that help, and a set of daily brain games.

## 1. Principles

1. **The arcade is part of the field guide.** Same paper, same ink, same two typefaces, same calm chrome. The play field is where the energy lives; the frame around it stays quiet.
2. **Brand proportions hold inside the canvas.** About 70 percent paper and soft white, 20 percent forest and sage, 10 percent accents. Ochre marks play and pickups. Clay marks hazard and emphasis. Research blue marks rare or "thinking" power-ups. No orange. No lime.
3. **Theme-aware.** Games read the live CSS tokens at open time, so the night page gets night games. No hex literals in game files except where a token has no equivalent (skin tones in Serve and Return).
4. **Draw at device resolution.** Logical coordinates stay small for physics; rendering happens at devicePixelRatio with smoothing on. Rounded shapes, 1.5px ink outlines, offset ink shadows at low alpha, a faint dot grid on the paper. No blur filters, no gradients larger than a highlight.
5. **One shell, ten games.** The overlay, HUD, prompt card, help line, touch row, mute and close move into core. A game file is gameplay plus art.
6. **Every game gets a story spine and at least two new power-ups.** Chapters named for developmental moments, a short card between chapters, a run summary at the end with best chain and chapter reached.
7. **Accessibility stays ahead of where it was.** Reduced motion, hidden-tab pause, focus management, live announcements, no colour as the only cue, touch controls on every game, 44px targets.
8. **Science copy stays honest.** Myth cards, chapter names and puzzle clues are plain and verifiable. No invented findings. Playful, not clinical.

## 2. Phases

| Phase | What | Done when |
| --- | --- | --- |
| A | Core v2: theme palette, canvas kit, drawing kit, shell builder, story and power-up managers, progress store, daily seed and RNG, share text | `arcade-core.js` exposes the new API; Snake runs on it as the reference |
| B | Rebuild the ten games on core v2 (one commit each) | Each game: brand palette, new art, new power-ups, story spine, run summary, touch controls, verified in light, dark and phone widths |
| C | Brain games: Five Letters, Groupings, Letter Nest, Little Crossword, Six Sudoku | Daily puzzle by date, practice mode, streaks, share text, puzzle data validated by a test |
| D | Hub page: card art drawn as inline SVG per game, sections for Arcade and Daily puzzles, streak chips, last-played | Passes the taste inspector with the known allowances |
| E | Gates and polish: `tests/arcade/*.test.mjs` (keyless), stamp, sitemap, memory note, PR | CI green; PR opened |

Order inside B: Snake (reference), Pong (biggest jump), Brain Sprint, Invaders, Myth Buster, Synapse Drift, Special Delivery, Tidy Up, Serve and Return, Crumb Chase.

## 3. Phase A: core v2

New exports on `window.GMSArcade`, all additive. Old exports stay so an unconverted game keeps working mid-branch.

- `theme()` reads `--paper`, `--surface`, `--ink`, `--ink-soft`, `--ink-muted`, `--forest`, `--sage`, `--sage-deep`, `--sage-mist`, `--note-amber`, `--note-warm`, `--research`, `--danger`, `--success`, `--border` from `documentElement` and returns a palette with helpers (`alpha(hex, a)`, `mix(a, b, t)`, `isDark`). `onThemeChange(fn)` watches `data-theme`.
- `makeCanvas(stage, { w, h, smooth })` returns `{ el, ctx, w, h, fit(), begin(camera), end() }`. `begin` clears, applies the DPR transform and camera offset; `end` restores. Replaces the per-game `resize`, `fitCanvas` and `backingScale` code.
- `draw` kit: `paper(ctx, w, h, pal)` (ground plus dot grid), `shape(ctx, path, { fill, stroke, shadow })`, `roundRect`, `circle`, `pill`, `leaf`, `seed`, `star`, `label(ctx, text, x, y, opts)` in Newsreader or Inter, `dashes`, `ring`. Shadows are an ink offset at 10 percent alpha.
- `makeShell({ key, title, tagline, hud, help, touch, onClose })` builds the overlay once. Returns `{ overlay, stage, hud.set(name, value), prompt.show({ title, text, actions, board }), prompt.hide(), toast(text), setHelp(text), touchButtons }`. Handles mute and close buttons, sets `_onKeydown` hooks, and wires `defineGame`.
- `makeStory(chapters, { onEnter })` with `advance(progressValue)`, `current()`, `banner()` state for the renderer.
- `makePowerups(defs)` timed-effect manager: `grant(id)`, `active(id)`, `frac(id)`, `tick(dt)`, `list()` for HUD pips. Each def names a token colour and a one-word label.
- `progress` store: `record(key, { score, chapter, badges })`, `get(key)`, `badge(key, id)`. Separate from the leaderboard.
- `dailySeed(offsetDays)` and `rng(seed)` (mulberry32) for the brain games. `dayKey()` as `YYYY-MM-DD` local.
- `streak` store for daily games: `mark(key, dayKey)`, `get(key)` returning current and best.
- `share(text)` copies to the clipboard with a fallback and announces.
- `makeInput(stage, { keys, swipe, tap, pointer })` to unify keyboard, swipe, tap and pointer tracking with a `held` map and a per-frame `consume()`.

`arcade.css` is rewritten for the shell: Newsreader title, fine rules, paper backdrop, HUD in Inter tabular numerals, prompt card as a surface panel, power-up pips, chapter card, run summary. Remove `image-rendering: pixelated` from the shared canvas rule.

## 4. Phase B: the ten games

Each entry: new look, story spine, new power-ups, fixes.

### Synapse Snake (`snake`)
- Look: rounded segments that taper to the tail, a brighter head with two small eyes, a soft glow behind the head in sage, sparks as ochre seeds with a leaf. Faint grid on paper. Distractions are small clay-rimmed blocks with an X.
- Story: five fields, Crib, First Steps, First Words, Why Stage, Big Ideas. A chapter card names the field and what changes.
- Power-ups: Myelin (research blue, 5 seconds: pass through your own path, trail glows), Prune (sage, drop three segments), Bridge (ochre pair: two portal cells), Focus (slows the clock for 4 seconds).
- Fixes: moving distractions from chapter 4, spawn guard when the board is full, remove the duplicate restart path.

### Pong (`pong`)
- Rebuilt on the shell with a leaderboard. Score is rally length plus margin.
- Look: paddles as rounded paper slips with an ink edge, ball with a short trail, centre line as a dashed quiet rule, court corners marked like a field-guide plate.
- Play: spin from paddle movement, serve direction alternates, three CPU personalities over a match (steady, eager, tired). Rally combo multiplies the point value. Local two-player on one keyboard (W/S and arrows), toggled from the start card.
- Power-ups: Wide (sage), Slow (research blue), Split (ochre; second ball for ten seconds).
- Fixes: hidden-tab pause, wake lock, haptics, reduced motion, the keyboard lockout after pointer use.

### Brain Sprint (`dino`)
- Look: three-layer parallax per chapter (crib rail, nursery, garden, schoolyard, night sky), a sky that shifts tone with the chapter, a sprout mascot with squash and stretch, dust puffs on landing. Obstacles become books, blocks, a wagon, a kite, a comet.
- Story: Crib, Toddler, Preschool, Schoolyard, Cosmos with chapter cards.
- Power-ups: Magnet (pulls seeds for 6 seconds), Double Jump (one air jump per run segment), Shield (one hit), Bloom (existing 2x window, now with a trail). Letters of a chapter word appear as collectables; spell it for a bonus.

### GMS Invaders (`invaders`)
- Look: enemies as rounded question glyphs on paper tags, three tiers by size, bookshelf shields that chip, the boss as a folded newspaper that unfolds, ship as a small lens with a handle.
- Story: six waves by developmental question, with a one-line card each.
- Power-ups: Spread (three bolts), Rapid (fire rate), Bubble (one-hit shield), Pause for Thought (time-slow, research blue). Capsules drop from tier-one enemies.
- Play: enemy dive runs from wave 3, UFO becomes a paper plane, wave bonus for untouched shelves.
- Fixes: duplicate `var sh`, dead expressions, enemy bolt glow.

### Myth Buster (`breakout`)
- Look: bricks as index cards with readable labels at the higher resolution, cracks on first hit, a card that busts flips to show a one-line truth for a moment. Paddle as a ruler. Ball with a trail.
- Story: eight walls, each a family of myths, then a boss card that moves.
- Power-ups: Calm (slow), Patience (wide), Curiosity (split), Sticky (catch and aim), Pointed Question (a short laser), Magnet (ball bends toward the paddle). Power-ups persist through a lost ball for the current wall.
- Fixes: sub-stepped ball collision, multiple brick hits per frame, remove the empty branch.

### Synapse Drift (`asteroids`)
- Look: rocks as word-labelled paper boulders with cracks, the ship as a paper plane with a lens, stars as a quiet dot field, seeds with leaves, Bloom as a sage halo.
- Play: Blink gets a touch button and a cooldown ring. Wave events: meteor shower, calm pocket (extra seeds). Orbit drone power-up (research blue) that fires with you for 12 seconds. Bomb (clay) clears small rocks nearby.
- Fixes: dead `held.blink`, consistent mute label, stop fire from starting a run from game over.

### Special Delivery (`hopper`)
- Look: a courier (envelope with hands and legs, ochre stamp), hop arc animation, picture books float on a story stream with ripples, wooden toys with wheels in the lanes, a hedge median, a mailbox row with flags that rise on delivery.
- Story: five rounds, each a neighbourhood (Hallway, Playroom, Garden, Library, Night Walk) with a card.
- Power-ups: Umbrella (one safe splash), Skates (double hop), Lantern (slows toys for 5 seconds), Bonus Parcel (timed extra points).
- Fixes: queue two hops, the safe row carries a bench that gives a second's shelter.

### Tidy Up (`blocks`)
- Look: wooden blocks with grain and a rounded edge, a toy bin frame, a shelf for Next and Hold, a soft clear animation that folds a row away.
- Play: T-spin and back-to-back bonuses, perfect clear bonus, a Bedtime mode (two minutes, score attack) beside Marathon. Mystery Block power-up (ochre) appears every 20 lines: lands and clears its row.
- Fixes: clamp level to 20, larger panel type.

### Serve and Return (`echo`)
- Look: vector baby with eyes that follow the lit pad, four pads as soft shapes (note, heart, star, sun) in forest, sage, ochre, research blue, each with its icon, a crib rail frame.
- Play: Classic, Echo Plus (pads shuffle every five rounds), Duet (you serve first, baby echoes, then adds). Repair stays. Hearts stay.
- Fixes: stale copy.

### Crumb Chase (`maze`)
- Look: rounded maze walls with a rug texture per level, bunnies with ears and eyes, the sweeper as a small child with a dustpan, crumbs as small ochre dots, snacks as drawn fruit.
- Play: three authored mazes rotate, Vacuum power-up (pulls crumbs in a radius for 4 seconds), Nap (bunnies sleep for 3 seconds), a bonus tidy round every third level.
- Fixes: pen exit sound.

## 5. Phase C: brain games

All five live in `assets/js/daily-*.js`, DOM-based (no canvas), on the same shell. Each has a daily puzzle picked by `dailySeed()` and a practice mode. Streaks and share text through core. Puzzle data in `assets/data/arcade/*.json`, validated by `tests/arcade/puzzles.test.mjs`.

| Game | Model | Data | Notes |
| --- | --- | --- | --- |
| Five Letters | Wordle | answer list (~500 everyday and development words), guess list from a 5-letter dictionary | Six guesses, keyboard with states, colour plus shape cues |
| Groupings | Connections | ~40 authored puzzles, 16 words in 4 groups, difficulty tiers | Four mistakes, shuffle, reveal with group names |
| Letter Nest | Spelling Bee | ~60 authored seven-letter sets with a centre letter, word list from the dictionary filtered to the set | Pangram bonus, rank names |
| Little Crossword | NYT Mini | ~14 authored 5x5 grids with clues, validated for symmetry and fill | Tap-to-type on phones, check and reveal |
| Six Sudoku | Sudoku 6x6 | generated from the daily seed, verified unique | Pencil marks, error check |

Word lists come from `/usr/share/dict/words` filtered to lowercase alphabetic words of the right length, then pruned by a stop list. Clues and group names are written by hand and kept plain.

## 6. Phase D: the hub

`arcade/index.html` is rebuilt on the Field Guide hub primitives: a title, a Daily puzzles band first (today's five with streak chips), then the Arcade grid. Card art is inline SVG drawn per game in the brand palette, not glyph strings. Each card shows the best local score. Pong loses its hand-written markup.

## 7. Phase E: gates

- `tests/arcade/core.test.mjs`: every key in `GAME_JS` has a file and a hub card, every game file parses (`node --check`), no game file contains the retired hex values.
- `tests/arcade/puzzles.test.mjs`: Groupings puzzles have 16 unique words in 4 groups of 4; crosswords are square, symmetric, and every across and down entry has a clue; Letter Nest sets have seven unique letters and at least one pangram; Five Letters answers are in the guess list.
- `gates.yml` already runs `node --test "tests/api/*.test.mjs"`; add `tests/arcade/*.test.mjs` to the same step.
- `node scripts/stamp-assets.mjs` after every CSS or JS change, then commit every restamped page.
- Browser pass per game: light, dark, 375px, landscape phone. Console clean.

## 8. Skills that help

Installed and used here:
- `frontend-design` and `design-taste-frontend` for the hub page composition and card art.
- `impeccable` for a critique pass on the hub and the overlay chrome.
- `playwright-cli` or `agent-browser` to open each game, run frames, and screenshot light and dark for the record.
- `self-review` and `verify-dont-assert` before each commit.
- `code-review` on the branch before the PR.

Worth adding:
- A repo skill, `arcade-game`, written with `skill-creator`: the core v2 API, the brand palette rules for canvases, the shell contract, the per-game checklist. Future games and fixes then start from the same page.
- `canvas-design` (anthropic-skills) if card art ever moves from inline SVG to generated posters; the no-stock rule means Matthew generates them from a brief.
- `dataviz` is not needed; the games draw their own HUDs.

## 9. Out of scope

- Server-side leaderboards and accounts.
- Sound packs beyond the synth.
- Multiplayer over the network.
- Any change to class, tool, or article pages.

## 10. Status, 2026-10-17

- Phase A done: core v2 and `arcade.css` (commit "Arcade core v2 and Synapse Snake").
- Phase B done: all ten games rebuilt. Nine were built by parallel subagents from `game-brief.md` and reviewed by screenshot and in the shared preview; Snake is the hand-built reference. Each registers a localhost debug handle.
- Phase C done: Five Letters, Groupings, Letter Nest, Six Sudoku; Little Crossword ships with its first authored grids.
- Phase D done: the hub, with chips for best scores and streaks.
- Phase E: `tests/arcade/*.test.mjs` in `gates.yml`; stamping run after every change.

Known follow-ups:
- `pages.css` still carries the old `.arcade-*` card rules (dead now that the hub uses `ar-*`). Remove in a follow-up that restamps every page.
- Nobody has played a full run of each game by hand yet; difficulty curves past the middle chapters are untested by a person.
- Landscape phones at 375 px tall shrink the portrait fields (Invaders, Tidy Up, Crumb Chase, Serve and Return) until small labels are hard to read.
- Tidy Up shares one leaderboard between Marathon and Bedtime.
- The repo skill `arcade-game` (section 8) is not written yet; `game-brief.md` is its draft.
