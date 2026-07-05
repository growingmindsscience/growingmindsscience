/* Growing Minds Science — snake-game.js
   "Synapse Snake" — the hidden Snake easter egg on the home page.

   Trigger: a tiny pixel-spark glyph tucked into the hero photo arch. Opening
   tears the page away (GMSArcade) then shows the game. You steer a growing
   neural pathway around the play field, linking up sparks of curiosity: every
   spark makes the pathway longer, and every few sparks marks a developmental
   milestone that gently speeds things up and adds a "distraction" block or
   two. Crossing your own pathway (a tangle) or a distraction ends the run.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, and the initials entry. Self-contained otherwise: own overlay
   DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no external
   assets; audio is Web Audio oscillator synth). Honors prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "synapse-snake";
  var MUTE_KEY = "gms-snake-muted";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- Palette (sampled from the GMS mark) ----------
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var WARM = "#D5BE98";
  var CREAM = "#F4EFE3";

  // ---------- Grid ----------
  var CELL = 10, COLS = 26, ROWS = 18;
  var W = COLS * CELL, H = ROWS * CELL;

  // ---------- Milestones (spark-count gates) ----------
  // Every gate: banner + slightly faster pathway; later gates add distractions.
  var CHAPTERS = [
    { name: "Crib",        lo: 0,  interval: 9, blocks: 0 },
    { name: "First Steps", lo: 6,  interval: 8, blocks: 0 },
    { name: "First Words", lo: 14, interval: 7, blocks: 3 },
    { name: "Why Stage",   lo: 24, interval: 6, blocks: 6 },
    { name: "Big Ideas",   lo: 36, interval: 5, blocks: 10 }
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ======================================================================
  //  Game controller
  // ======================================================================
  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    var backingScale = 1; // hi-res backing store so text stays crisp when scaled up
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var reduce = A.prefersReducedMotion();
    // Shared juice: crisp shake + hit-stop, chain multiplier. Audio-mute is
    // deliberately independent of reduced-motion (a11y: motion-sensitive
    // players still get sound).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 3 });
    var combo = A.makeCombo({ window: 110, max: 5 });

    var state = "idle"; // idle | running | dying | gameover
    var snake, dirQ, dir, growth, moveTimer, moveInterval;
    var spark, book, bookTimer, blocks, sparksEaten, score;
    var chapterIdx, milestoneText, milestoneTimer;
    var particles, floaters, pulse, pulses;
    var deathTimer, deathFlash, deadDissolved, dyingScore;
    var PARTICLE_CAP = 48, FLOATER_CAP = 10;

    function cellKey(c) { return c.x + "," + c.y; }

    function resetWorld() {
      var sx = 6, sy = Math.floor(ROWS / 2);
      snake = [{ x: sx, y: sy }, { x: sx - 1, y: sy }, { x: sx - 2, y: sy }];
      dir = { x: 1, y: 0 };
      dirQ = [];
      growth = 0;
      moveInterval = CHAPTERS[0].interval;
      moveTimer = moveInterval;
      blocks = [];
      book = null; bookTimer = 0;
      sparksEaten = 0; score = 0;
      combo.reset(true);
      chapterIdx = 0; milestoneText = ""; milestoneTimer = 0;
      particles = particles || []; floaters = floaters || []; pulses = pulses || [];
      particles.length = 0; floaters.length = 0; pulses.length = 0;
      pulse = 0;
      deathTimer = 0; deathFlash = 0; deadDissolved = 0; dyingScore = 0;
      spark = null;
      placeSpark();
    }

    function occupied(x, y) {
      for (var i = 0; i < snake.length; i++) { if (snake[i].x === x && snake[i].y === y) return true; }
      for (var b = 0; b < blocks.length; b++) { if (blocks[b].x === x && blocks[b].y === y) return true; }
      if (spark && spark.x === x && spark.y === y) return true;
      if (book && book.x === x && book.y === y) return true;
      return false;
    }

    function randomFreeCell(minHeadDist) {
      var head = snake[0];
      for (var tries = 0; tries < 200; tries++) {
        var x = Math.floor(Math.random() * COLS);
        var y = Math.floor(Math.random() * ROWS);
        if (occupied(x, y)) continue;
        if (minHeadDist) {
          var dx = Math.abs(x - head.x), dy = Math.abs(y - head.y);
          if (Math.min(dx, COLS - dx) + Math.min(dy, ROWS - dy) < minHeadDist) continue;
        }
        return { x: x, y: y };
      }
      return null;
    }

    function placeSpark() {
      var c = randomFreeCell(2);
      if (c) spark = { x: c.x, y: c.y, glint: Math.random() * Math.PI * 2 };
    }

    function maybePlaceBook() {
      if (book || sparksEaten === 0 || sparksEaten % 6 !== 0) return;
      var c = randomFreeCell(4);
      if (c) { book = { x: c.x, y: c.y }; bookTimer = 300; }
    }

    function syncChapter() {
      var ci = 0;
      for (var c = CHAPTERS.length - 1; c >= 0; c--) { if (sparksEaten >= CHAPTERS[c].lo) { ci = c; break; } }
      if (ci === chapterIdx) return;
      chapterIdx = ci;
      moveInterval = CHAPTERS[ci].interval;
      triggerMilestone(CHAPTERS[ci].name + "!");
      while (blocks.length < CHAPTERS[ci].blocks) {
        var cell = randomFreeCell(5);
        if (!cell) break;
        // never drop a distraction straight ahead of the pathway
        var head = snake[0];
        if (cell.y === head.y && dir.y === 0) continue;
        if (cell.x === head.x && dir.x === 0) continue;
        blocks.push(cell);
      }
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      spark: function (mult) { audio.beep(560 + mult * 45, 860 + mult * 45, 0.06, "triangle", 0.45); },
      book: function () { audio.arp([523, 784, 1046], 0.05, 0.14, "triangle", 0.42); },
      milestone: function () { audio.arp([523, 659, 784, 1046], 0.07, 0.18, "triangle", 0.45); },
      hit: function () { audio.beep(200, 70, 0.24, "sawtooth", 0.5); audio.noise(0.3, 900, 0.4); }
    };

    // ---------- Particles / floaters (pooled) ----------
    function spawnParticle(x, y, vx, vy, life, color) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color;
    }
    function spawnBurst(x, y, color, n) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.2;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 10 + Math.random() * 8, color);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 26; f.maxLife = 26; f.text = text; f.color = color;
    }

    // A "synapse firing": a bright signal that travels head -> tail along the
    // pathway. render() brightens the segment at floor(age). Chains at combo.
    function firePulse() {
      if (reduce) return;
      pulses.push({ age: 0 });
      if (pulses.length > 6) pulses.shift();
    }

    function triggerMilestone(text) {
      milestoneText = text;
      milestoneTimer = 90;
      camera.shake(0.35);
      ensureAudio(); sfx.milestone();
    }

    // ---------- Controls ----------
    function queueDir(x, y) {
      if (state === "idle") { start(); }
      if (state === "gameover" || state === "dying") return;
      var last = dirQ.length ? dirQ[dirQ.length - 1] : dir;
      if (last.x === x && last.y === y) return;       // same way
      if (last.x === -x && last.y === -y) return;      // no 180s
      if (dirQ.length < 2) dirQ.push({ x: x, y: y });
    }

    function start() { resetWorld(); state = "running"; hidePrompt(); }
    function restart() { resetWorld(); state = "running"; hidePrompt(); }

    function gameOver() {
      ensureAudio(); sfx.hit();
      camera.shake(0.9); camera.freeze(reduce ? 0 : 6);
      combo.reset();
      dyingScore = Math.floor(score);
      spawnBurst(snake[0].x * CELL + CELL / 2, snake[0].y * CELL + CELL / 2, BRAIN, 12);
      // Reduced-motion players skip the dissolve and go straight to the card.
      if (reduce) { finalizeGameOver(); return; }
      state = "dying";
      deathTimer = 34; deathFlash = 6; deadDissolved = 0;
    }
    function finalizeGameOver() {
      state = "gameover";
      showGameOver(dyingScore);
    }
    // Dissolve the pathway into pixel confetti, head -> tail, over ~34 frames.
    function tickDeath(dt) {
      if (deathFlash > 0) deathFlash -= dt;
      deathTimer -= dt;
      var total = snake.length;
      var revealed = Math.floor((1 - Math.max(0, deathTimer) / 34) * total);
      while (deadDissolved < revealed && deadDissolved < total) {
        var seg = snake[deadDissolved];
        spawnBurst(seg.x * CELL + CELL / 2, seg.y * CELL + CELL / 2, deadDissolved % 2 ? LEAF_SIDE : LEAF_TOP, 4);
        deadDissolved++;
      }
      updateParticles(dt);
      if (deathTimer <= 0) finalizeGameOver();
    }

    // ---------- Update ----------
    function step() {
      if (dirQ.length) dir = dirQ.shift();
      var head = snake[0];
      var nx = (head.x + dir.x + COLS) % COLS;
      var ny = (head.y + dir.y + ROWS) % ROWS;

      // tangle check: body (the tail cell is fine unless we're growing)
      var lastIdx = snake.length - 1;
      for (var i = 0; i < snake.length; i++) {
        if (i === lastIdx && growth <= 0) continue;
        if (snake[i].x === nx && snake[i].y === ny) { gameOver(); return; }
      }
      for (var b = 0; b < blocks.length; b++) {
        if (blocks[b].x === nx && blocks[b].y === ny) { gameOver(); return; }
      }

      snake.unshift({ x: nx, y: ny });
      if (growth > 0) growth--;
      else snake.pop();

      // spark
      if (spark && spark.x === nx && spark.y === ny) {
        var mult = combo.hit();
        var pts = 10 * mult;
        score += pts;
        sparksEaten++;
        growth += 1;
        spawnBurst(nx * CELL + CELL / 2, ny * CELL + CELL / 2, LEAF_TOP, 6);
        spawnFloater(nx * CELL + CELL / 2, ny * CELL - 2, "+" + pts + (mult > 1 ? " x" + mult : ""), LEAF_SIDE);
        firePulse();
        camera.freeze(reduce ? 0 : 2);           // micro hit-stop = crunch
        if (mult >= 3) camera.shake(0.12);
        ensureAudio(); sfx.spark(mult);
        spark = null;
        placeSpark();
        maybePlaceBook();
        syncChapter();
      }

      // book bonus
      if (book && book.x === nx && book.y === ny) {
        score += 50;
        growth += 2;
        spawnBurst(nx * CELL + CELL / 2, ny * CELL + CELL / 2, BRAIN, 10);
        spawnFloater(nx * CELL + CELL / 2, ny * CELL - 2, "+50", BRAIN);
        firePulse();
        camera.shake(0.3); camera.freeze(reduce ? 0 : 3);
        ensureAudio(); sfx.book();
        book = null;
      }
    }

    function updateParticles(dt) {
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.35 * dt; fl.life -= dt;
      }
      for (var pz = pulses.length - 1; pz >= 0; pz--) {
        pulses[pz].age += 0.6 * dt;
        if (pulses[pz].age > (snake ? snake.length : 0) + 3) pulses.splice(pz, 1);
      }
    }

    function tick(dt) {
      if (state === "dying") { tickDeath(dt); return; }
      pulse += dt;
      combo.tick(dt);
      if (milestoneTimer > 0) milestoneTimer -= dt;
      if (book) { bookTimer -= dt; if (bookTimer <= 0) book = null; }
      if (spark) spark.glint += dt * 0.25;

      moveTimer -= dt;
      while (moveTimer <= 0 && state === "running") {
        step();
        moveTimer += moveInterval;
      }

      updateParticles(dt);
    }

    // ---------- Render ----------
    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);
      ctx.fillStyle = CREAM;
      ctx.fillRect(-4, -4, W + 8, H + 8);

      // faint dot grid
      ctx.fillStyle = "rgba(14,42,45,0.07)";
      for (var gy = 0; gy < ROWS; gy++) {
        for (var gx = (gy % 2); gx < COLS; gx += 2) {
          ctx.fillRect(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 1, 1);
        }
      }

      // wrap hint: dashed frame
      ctx.strokeStyle = "rgba(81,121,101,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      ctx.setLineDash([]);

      // distraction blocks
      for (var b = 0; b < blocks.length; b++) {
        blockyRect(ctx, blocks[b].x * CELL + 1, blocks[b].y * CELL + 1, CELL - 2, CELL - 2, WARM);
        ctx.fillStyle = INK;
        ctx.fillRect(blocks[b].x * CELL + 4, blocks[b].y * CELL + 4, 2, 2);
      }

      // book bonus (blinks when about to fade)
      if (book && !(bookTimer < 80 && Math.floor(bookTimer / 6) % 2 === 0)) {
        var bcx = book.x * CELL + CELL / 2, bcy = book.y * CELL + CELL / 2;
        if (!reduce) A.pixelGlow(ctx, bcx, bcy, 5, BRAIN, 0.16);
        blockyRect(ctx, book.x * CELL, book.y * CELL + 2, CELL, CELL - 4, BRAIN);
        ctx.fillStyle = INK;
        ctx.fillRect(book.x * CELL + 2, book.y * CELL + 2, 2, CELL - 4);
      }

      // spark (soft leaf halo so it reads as a beacon)
      if (spark) {
        var sx = spark.x * CELL + CELL / 2, sy = spark.y * CELL + CELL / 2;
        var r = reduce ? 2 : 2 + Math.sin(pulse * 0.18) * 0.8;
        if (!reduce) A.pixelGlow(ctx, sx, sy, 4, LEAF_TOP, 0.14);
        blockyRect(ctx, sx - r, sy - r, r * 2, r * 2, LEAF_TOP);
        var gx2 = sx + Math.round(Math.cos(spark.glint) * 3);
        var gy2 = sy + Math.round(Math.sin(spark.glint) * 3);
        ctx.fillStyle = LEAF_SIDE; ctx.fillRect(gx2, gy2, 1, 1);
      }

      // pathway body (tail → head so the head draws on top). During the death
      // dissolve, already-scattered segments [0, deadDissolved) are hidden.
      for (var i = snake.length - 1; i >= 1; i--) {
        if (state === "dying" && i < deadDissolved) continue;
        var seg = snake[i];
        var fill = i % 2 === 0 ? LEAF_SIDE : LEAF_TOP;
        // a travelling "synapse" signal brightens the segment it's passing
        for (var pz = 0; pz < pulses.length; pz++) {
          if (Math.floor(pulses[pz].age) === i) { fill = CREAM; break; }
        }
        var inset = i === snake.length - 1 ? 2 : 1;
        blockyRect(ctx, seg.x * CELL + inset, seg.y * CELL + inset, CELL - inset * 2, CELL - inset * 2, fill);
      }
      // head: little brain-sprout
      if (!(state === "dying" && deadDissolved > 0)) {
        var hd = snake[0];
        var hcx = hd.x * CELL + CELL / 2, hcy = hd.y * CELL + CELL / 2;
        // warm aura that intensifies with the combo
        if (!reduce && combo.mult() >= 3) A.pixelGlow(ctx, hcx, hcy, 5, BRAIN, 0.08 + combo.mult() * 0.03);
        blockyRect(ctx, hd.x * CELL, hd.y * CELL, CELL, CELL, BRAIN);
        ctx.fillStyle = INK;
        ctx.fillRect(hd.x * CELL + CELL / 2 - 1, hd.y * CELL + 2, 1, CELL - 4);
        // leaf points the way it's heading
        var lx = hd.x * CELL + CELL / 2 - 2 + dir.x * 4;
        var ly = hd.y * CELL + CELL / 2 - 2 + dir.y * 4;
        blockyRect(ctx, lx, ly, 4, 4, LEAF_TOP);
      }

      // particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }
      ctx.globalAlpha = 1;

      // floaters
      ctx.font = "7px monospace"; ctx.textAlign = "center";
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      // combo pips (top-left) + a thin draining "window" bar
      var cm = combo.mult();
      if (cm > 1) {
        var cc = cm >= 4 ? BRAIN : LEAF_SIDE;
        for (var cp = 0; cp < cm; cp++) blockyRect(ctx, 6 + cp * 5, 6, 3, 3, cc);
        ctx.fillStyle = "rgba(64,192,153,0.55)";
        ctx.fillRect(6, 11, Math.round((cm * 5 - 2) * combo.frac()), 1);
      }

      // milestone banner
      if (milestoneTimer > 0) {
        ctx.globalAlpha = clamp(milestoneTimer / 90, 0, 1);
        ctx.fillStyle = INK; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillText(milestoneText, W / 2, 20);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      // death flash (full-frame cream pop as the pathway shatters)
      if (deathFlash > 0) {
        ctx.globalAlpha = clamp(deathFlash / 6, 0, 1) * 0.8;
        ctx.fillStyle = CREAM;
        ctx.fillRect(-4, -4, W + 8, H + 8);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // ---------- HUD bridge ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.len) els.len.textContent = String(snake ? snake.length : 3);
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
    }

    // ---------- Prompt screens ----------
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      if (!els.prompt) return;
      els.promptTitle.textContent = "Synapse Snake";
      els.promptText.textContent = "Link the sparks and grow the pathway — just don't tangle it.";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Start";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showGameOver(finalScore) {
      updateHud();
      els.promptTitle.textContent = "The pathway tangled";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") +
        " · reached " + CHAPTERS[chapterIdx].name + " · " + sparksEaten + " sparks linked";
      els.promptActions.textContent = "";
      if (A.leaderboard.qualifies(GAME_KEY, finalScore)) {
        A.mountInitialsEntry(els.promptActions, {
          gameKey: GAME_KEY, score: finalScore,
          onDone: function (rank) {
            updateHud();
            els.promptActions.textContent = "";
            A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores", highlightRank: rank });
            addPlayAgain("Play again");
            try { canvas.focus(); } catch (e) {}
          }
        });
        addPlayAgain("Skip & play again", "btn--ghost");
      } else {
        A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
        addPlayAgain("Play again");
      }
      els.prompt.hidden = false;
    }
    function addPlayAgain(label, variant) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (variant || "btn--primary");
      btn.textContent = label;
      btn.addEventListener("click", function () { restart(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      camera.tick(dt);
      if ((state === "running" || state === "dying") && !camera.frozen()) tick(dt);
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      queueDir: queueDir,
      resize: function (cssW, cssH) {
        var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        var nextW = Math.max(W, Math.round(cssW * dpr));
        var nextH = Math.max(H, Math.round(cssH * dpr));
        if (canvas.width !== nextW || canvas.height !== nextH) {
          canvas.width = nextW;
          canvas.height = nextH;
          ctx.imageSmoothingEnabled = false;
        }
        canvas.style.width = Math.round(cssW) + "px";
        canvas.style.height = Math.round(cssH) + "px";
        backingScale = nextW / W;
      },
      tapStart: function () {
        ensureAudio();
        if (state === "idle") { start(); return; }
        if (state === "gameover") {
          if (document.activeElement && document.activeElement.tagName === "INPUT") return;
          restart();
        }
      },
      toggleMute: function () { return audio.toggleMute(); },
      isMuted: function () { return audio.isMuted(); },
      activate: function () {
        resetWorld(); state = "idle"; lastTime = 0;
        updateHud(); showIdle();
        rafId = window.requestAnimationFrame(loop);
      },
      deactivate: function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
        audio.close();
      }
    };
  }

  // ======================================================================
  //  Overlay scaffolding
  // ======================================================================
  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Synapse Snake — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Synapse Snake <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>LENGTH <strong data-egg-len>3</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--snake">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Arrows / WASD steer · swipe on touch · edges wrap around · M to mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="-1,0" aria-label="Left">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="0,-1" aria-label="Up">▲</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="0,1" aria-label="Down">▼</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-dir="1,0" aria-label="Right">▶</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-arcade-canvas");
    function fitCanvas() {
      var stage = overlay.querySelector(".gms-arcade-stage");
      if (!stage) return;
      var rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Fractional scale is fine: the backing store is already rendered at
      // devicePixelRatio resolution, so this stays crisp while filling the
      // available space (no wasted margin from flooring to whole numbers).
      var scale = Math.max(0.5, Math.min(rect.width / W, rect.height / H));
      game.resize(W * scale, H * scale);
    }
    var game = createGame(canvas, {
      score: overlay.querySelector("[data-egg-score]"),
      len: overlay.querySelector("[data-egg-len]"),
      best: overlay.querySelector("[data-egg-best]"),
      prompt: overlay.querySelector("[data-egg-prompt]"),
      promptTitle: overlay.querySelector("[data-egg-prompt-title]"),
      promptText: overlay.querySelector("[data-egg-prompt-text]"),
      promptActions: overlay.querySelector("[data-egg-prompt-actions]")
    });

    overlay.querySelectorAll("[data-egg-close]").forEach(function (el) {
      el.addEventListener("click", function () { closeOverlay(overlay); });
    });

    var muteBtn = overlay.querySelector("[data-egg-mute]");
    function syncMute() { muteBtn.textContent = game.isMuted() ? "♪̶" : "♪"; muteBtn.setAttribute("aria-pressed", game.isMuted() ? "true" : "false"); }
    muteBtn.addEventListener("click", function () { game.toggleMute(); syncMute(); });
    syncMute();

    // D-pad buttons (tap = queue a turn).
    overlay.querySelectorAll("[data-egg-dir]").forEach(function (el) {
      var parts = el.getAttribute("data-egg-dir").split(",");
      var dx = parseInt(parts[0], 10), dy = parseInt(parts[1], 10);
      var press = function (e) { e.preventDefault(); game.queueDir(dx, dy); };
      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("mousedown", press);
    });

    // Canvas: tap starts/restarts; swiping steers (resets origin each turn so
    // you can snake around without lifting your finger).
    var swipe = null, suppressMouse = 0;
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      var t = e.touches[0];
      swipe = { x: t.clientX, y: t.clientY, moved: false };
      game.tapStart();
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (!swipe || !e.touches.length) return;
      var t = e.touches[0];
      var dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) game.queueDir(dx > 0 ? 1 : -1, 0);
      else game.queueDir(0, dy > 0 ? 1 : -1);
      swipe = { x: t.clientX, y: t.clientY, moved: true };
    }, { passive: false });
    canvas.addEventListener("touchend", function () { swipe = null; }, { passive: false });
    canvas.addEventListener("mousedown", function (e) {
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.tapStart();
    });

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.queueDir(-1, 0); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.queueDir(1, 0); }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); game.queueDir(0, -1); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); game.queueDir(0, 1); }
      else if (e.code === "Space" || e.key === " ") { e.preventDefault(); game.tapStart(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._canvas = canvas;
    overlay._fitCanvas = fitCanvas;
    return overlay;
  }

  function closeOverlay(overlay) {
    overlay.game.deactivate();
    window.location.reload();
  }
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-arcade-lock");
    overlay._fitCanvas();
    document.addEventListener("keydown", overlay._onKeydown);
    window.addEventListener("resize", overlay._fitCanvas);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Pixel-spark trigger, tucked into the hero photo arch on the home page.
  function buildTrigger() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gms-arcade-snake-trigger";
    btn.setAttribute("aria-label", "Hidden game");
    btn.title = "~";
    btn.innerHTML =
      '<svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges">' +
      '<g fill="currentColor">' +
      '<rect x="1" y="8" width="3" height="2"/>' +
      '<rect x="3" y="6" width="2" height="2"/>' +
      '<rect x="4" y="4" width="3" height="2"/>' +
      '<rect x="6" y="2" width="2" height="2"/>' +
      '<rect x="8" y="1" width="3" height="2"/>' +
      '<rect x="9" y="4" width="1" height="1"/>' +
      '</g></svg>';
    return btn;
  }

  ready(function () {
    var anchor = document.querySelector(".hero__media") ||
      document.querySelector(".hero .container") ||
      document.querySelector("main .container");
    if (!anchor) return;
    var cs = window.getComputedStyle(anchor);
    if (cs.position === "static") anchor.style.position = "relative";

    var trigger = buildTrigger();
    anchor.appendChild(trigger);

    var overlay = null, opening = false;
    function open() {
      if (opening) return;
      opening = true;
      if (!overlay) overlay = buildOverlay();
      A.tearPageAway(function () { openOverlay(overlay); });
    }
    trigger.addEventListener("click", function (e) { e.preventDefault(); open(); });
    trigger.addEventListener("touchstart", function (e) { e.preventDefault(); open(); }, { passive: false });
  });
})();
