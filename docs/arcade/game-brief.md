# Building an arcade game on core v2

Read this before touching any `assets/js/*-game.js`. The reference implementation is `assets/js/snake-game.js`; copy its structure. The contract lives in `assets/js/arcade-core.js` (the "Core v2" section at the end of the file) and `assets/css/arcade.css`. The per-game design is in `docs/arcade/plan.md`, section 4.

## What a game file is

One IIFE, ES5 style (`var`, `function`), no modules, no eval, no external assets, no inline handlers. It does three things:

1. `A.defineGame("<key>", build)` inside `A.ready(...)`, where `build()` makes a shell with `A.makeShell({...})`, calls `createGame(shell)`, and returns `shell.mount(game)`.
2. `createGame(shell)` owns the world, the tick, the render, and the prompts. It returns `{ activate, deactivate, onKeydown, onKeyup, held }`.
3. Art is drawn into `shell.canvas` with `A.draw.*` and plain canvas calls, in the live palette from `A.theme()`.

Do not edit `arcade-core.js`, `arcade.css`, `arcade/index.html` or any other game. Do not run `stamp-assets`. Do not commit. One file in, one file out.

## The shell

```js
var shell = A.makeShell({
  key: GAME_KEY,                       // leaderboard and progress key, e.g. "myth-buster"
  title: "Myth Buster",                // Newsreader title in the head
  tagline: "Bust the myths, card by card.",
  label: "Myth Buster game",           // dialog aria-label
  canvas: { w: W, h: H, label: "Myth Buster play field", smooth: true },  // or false for a DOM game
  hud: [{ id: "score", label: "Score", value: 0 }, { id: "best", label: "Best", value: A.leaderboard.best(GAME_KEY) }, ...],
  help: "Mouse or arrows move · Space launches · M mutes · Esc closes",
  touch: [{ id: "left", label: "◀", aria: "Move left" }, { id: "fire", label: "Fire", aria: "Fire", wide: true }, { id: "pause", label: "Pause", tap: true }]
});
```

- `shell.canvas` is a `makeCanvas` result: `{ el, ctx, w, h, fit(), begin(camera), end(), toLogical(cx, cy), setSize(w, h), aspect() }`. Call `cv.begin(camera)` at the top of render and `cv.end()` at the bottom. Draw in logical units; never read `el.width`.
- `shell.hud.set(id, value)`, `shell.hud.flash(id)`, `shell.hud.show(id, bool)`.
- `shell.prompt.show({ kicker, title, text, actions: [{ label, primary, onClick }], board: fn(mount), compact })`, `shell.prompt.hide()`, `shell.prompt.shown()`.
- `shell.toast(text, ms)` for short notices (power-up picked up). Chapter beats draw inside the canvas, not as toasts.
- `shell.renderPips(powers.list(), pal)` once per tick while running.
- `shell.bindSynth(synth)` right after `A.makeSynth({ muteKey })`: the shell owns the mute button and the M key.
- `shell.held[id]` is true while a hold-style touch button is down; `shell.onTap(fn)` receives tap-style button ids. `shell.showTouch(bool)` hides the row (for a game with its own on-canvas controls).
- Escape closes, M mutes, and keys typed into inputs or buttons are filtered before `onKeydown` is called.

## Input

`A.makeInput(cv.el, { canvas: cv, keys: { ArrowLeft: "left", a: "left", " ": "action", ... }, onAction(action, repeat, e), onSwipe(dir), onTap(pt), onDown(pt), onDrag(pt, delta), onMove(pt), onUp(pt) })` returns `{ held, pointer: {x, y, down, active}, pressed(a), consume(), release(), onKeydown(e), onKeyup(e), press(a, on), destroy() }`. Wire the shell's hold buttons by reading `shell.held` or by calling `input.press(id, on)` from a small bridge. Pointer coordinates are logical canvas units.

## Loop, story, power-ups, juice

- `A.makeLoop(tick, render)`: `tick(dt)` with dt in 60 Hz frames, clamped to 3. Start in `activate`, stop in `deactivate`.
- `A.makeStory(CHAPTERS, { onEnter(ch, idx), bannerFrames })`: `advance(value)`, `tick(dt)`, `banner()` (`{ name, text, frac }` or null), `index()`, `current()`, `progress(value)`. Draw the banner in Newsreader at the top of the field while `banner()` is non-null. Keep the bottom rule as a progress bar like Snake does.
- `A.makePowerups(DEFS, { onGrant, onExpire })`: `grant(id)`, `active(id)`, `frac(id)`, `use(id)` for counted charges, `tick(dt)`, `list()`, `clear()`. A def is `{ label, color: paletteKey, duration (frames) }` or `{ label, color, uses: n }`.
- `A.makeCamera({ reduce, maxPx })`, `A.makeCombo({ window, max })`, `A.makeParticles({ cap, reduce })` with `spawn/burst/tick/render`, `A.makeFloaters({ cap, reduce })` with `spawn(x, y, text, color, { size, font })`.
- `A.makeSynth({ muteKey })`: `ensure()` on the first user gesture, `beep(f0, f1, dur, type, vol)`, `noise(dur, f, vol)`, `arp(freqs, spacing, dur, type, vol)`, `close()` in deactivate.
- `A.haptics.tick/pop/thump/crash/win()`, `A.makeWakeLock()` (acquire on start, release on pause and game over), `A.onHidden(fn)` to pause when the tab hides, `A.prefersReducedMotion()`.
- End of run: `A.progress.record(GAME_KEY, { score, chapter, badges })`, then a prompt whose `board` calls `A.runSummary(mount, { gameKey, score, lines: [[label, value], ...], onSaved })`. That renders the summary, the initials form when the score places, and the leaderboard.
- `A.debug(key, api)` registers a localhost-only handle at `window.__gmsArcade[key]`. Always register `state()` plus whatever drives the game quickly (`win()`, `lose()`, `grant(id)`, `skipTo(chapter)`), so the game can be verified without playing for minutes. It is a no-op on the live site.

## The palette

`var pal = A.theme();` and `A.onThemeChange(function (p) { pal = p; })`. Keys: `paper, paper2, surface, surface2, ink, inkSoft, inkMuted, forest, forestDeep, onForest, sage, sageDeep, sageMist, sageMist2, ochre, clay, clayText, research, danger, success, border, borderSoft, fieldInk, onInk, onInkMuted`, plus `isDark`, `shadow`, `rule`, `grid`, `fontDisplay`, `fontBody`, and `alpha(hex, a)`, `mix(a, b, t)`, `shade(hex, t)`.

Rules:
- No hex literals in a game file. The only exception is a colour with no token (skin in Serve and Return, a sky tint in Brain Sprint); derive it with `pal.mix` where possible and say so in a comment.
- Proportions inside the play field: about 70 percent paper and surface, 20 percent forest and sage, 10 percent accents. Ochre marks pickups and play. Clay marks hazard. Research blue marks rare or "thinking" power-ups. Never orange, never lime, never a warm colour as a large fill.
- Outlines are `pal.ink` at 1.2 to 1.6 logical px. Shadows are `pal.shadow` offset 2 to 3 px down, never blurred. No gradients beyond a small highlight. No `shadowBlur`.
- Ground is `A.draw.paper(ctx, W, H, pal, { step })` or a flat token fill with the same dot grid. Dark theme must look intentional: test it by setting `data-theme="dark"` on `<html>`.
- Text inside the canvas: `A.draw.label(ctx, text, x, y, { font: "display" | "body", size, weight, color, align, baseline })`. Display for chapter names and big moments, body for numbers and small labels. Minimum 10 px logical for anything a player must read.

## Resolution

Pick a logical size where the smallest thing a player must read is at least 10 px and the whole field fits a phone. Landscape games: about 560 by 360 (Snake), 480 by 300 (Breakout), 640 by 360 (Brain Sprint). Portrait or square games (Invaders, Tidy Up, Crumb Chase, Special Delivery, Serve and Return): choose a tall or square field. If the game is a grid that could turn on end, do what Snake does in `activate()`: read `cv.aspect()` and call `cv.setSize(W, H)` after choosing.

## Per-game checklist

- [ ] Title, tagline, prompt copy, chapter names and texts are plain, warm and honest. No clinical claims, no invented findings. Chapter names come from developmental moments.
- [ ] Start prompt (with leaderboard when the player has played before), pause prompt (hidden tab pauses too), game-over prompt with `runSummary`.
- [ ] Story spine with at least four chapters and a drawn banner; progress rule at the bottom.
- [ ] At least two new power-ups, each with a pip, a toast or floater on pickup, and an announcement.
- [ ] Keyboard, touch and pointer control; every touch target is 44 px or larger; the touch row is wired.
- [ ] Reduced motion: no shake, no particles, no flashing; the game stays playable.
- [ ] `A.announce` on start, chapter, game over.
- [ ] Theme: light and dark both look right. Portrait phone (375 px wide) and landscape phone (max-height 480) both fit.
- [ ] `node --check assets/js/<game>-game.js` passes. No console errors.
- [ ] `A.debug(key, ...)` registered.
- [ ] The retired colours `#FD951F`, `#9FCB43`, `#40C099`, `#D5BE98`, `#0E2A2D` do not appear anywhere in the file.

## Verifying without the shared browser pane

The static server for this worktree runs at `http://localhost:4211/` and serves files live. The arcade page is `/arcade/`. The Play buttons have `data-arcade-game="<key>"`. Opening a game tears the page away and mounts the overlay; the prompt's Start button is `.gms-arcade-prompt .btn--primary`. The debug handle is `window.__gmsArcade.<key>`.

Use a headless browser of your own (the `agent-browser` or `playwright-cli` skill, or a one-off Playwright script if either is installed) rather than the shared Browser pane. Take screenshots into the session scratchpad and look at them. Check light and dark (`document.documentElement.setAttribute("data-theme", "dark")`), a 375 by 812 viewport and an 800 by 600 one.
