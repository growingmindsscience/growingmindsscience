/* Growing Minds Science — breakout-game.js
   "Myth Buster" — the hidden brick-breaker easter egg on the FAQ page.

   Trigger: a pixel-brick glyph tucked into the FAQ hero. Opening tears the
   page away (GMSArcade) then shows the game. The wall is built from parenting
   myths — the wide, stubborn bricks carry the myth labels and take two hits —
   and you bounce a spark of curiosity off a paddle of patience to bust them.
   Some bricks drop help: CALM slows the ball, WIDE stretches the paddle,
   SPARK splits the ball.

   Built on window.GMSArcade (arcade-core.js) for the page-tear, the local
   leaderboard, and the initials entry. Self-contained otherwise: own overlay
   DOM, own rAF loop, full teardown on close. CSP-safe (no eval, no external
   assets; audio is Web Audio oscillator synth). Honors prefers-reduced-motion.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "myth-buster";
  var MUTE_KEY = "gms-breakout-muted";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- Palette ----------
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var WARM = "#D5BE98";
  var CREAM = "#F4EFE3";
  var ROW_COLORS = [BRAIN, LEAF_SIDE, LEAF_TOP, WARM];

  // ---------- Logical resolution / layout ----------
  var W = 240, H = 210;
  var PADDLE_Y = 196, PADDLE_H = 5, PADDLE_W = 40;
  var BALL = 4;
  var COLS = 8, BRICK_W = 28, BRICK_H = 10, FIELD_X = 8, FIELD_Y = 24;

  var MYTHS = ["spoiling", "sugar high", "terrible 2s", "just a phase", "genius apps", "too young", "bad habits", "cry it out"];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- Level layouts ----------
  // Each returns bricks: { c, r, span, hp, myth } (span in columns).
  // A "myth" brick is double-wide, labeled, and takes 2 hits.
  function layoutFor(level) {
    var idx = (level - 1) % 4;
    var bricks = [];
    var mythBag = MYTHS.slice().sort(function () { return Math.random() - 0.5; });
    function myth(c, r) { bricks.push({ c: c, r: r, span: 2, hp: 2, myth: mythBag.pop() || "myth" }); }
    function plain(c, r) { bricks.push({ c: c, r: r, span: 1, hp: 1 }); }
    var c, r;
    if (idx === 0) {
      // Full wall, two myths seeded mid-field.
      for (r = 0; r < 4; r++) for (c = 0; c < COLS; c++) plain(c, r);
      bricks = bricks.filter(function (b) { return !(b.r === 2 && (b.c === 1 || b.c === 2 || b.c === 5 || b.c === 6)); });
      myth(1, 2); myth(5, 2);
    } else if (idx === 1) {
      // Checkerboard with a myth beam across the top.
      myth(0, 0); myth(3, 0); myth(6, 0);
      for (r = 1; r < 5; r++) for (c = 0; c < COLS; c++) { if ((c + r) % 2 === 0) plain(c, r); }
    } else if (idx === 2) {
      // Pyramid; myths form the base corners.
      for (r = 0; r < 4; r++) for (c = r; c < COLS - r; c++) plain(c, 3 - r);
      bricks = bricks.filter(function (b) { return !(b.r === 3 && (b.c <= 1 || b.c >= 6)); });
      myth(0, 3); myth(6, 3);
      myth(3, 4);
    } else {
      // Fortress: hollow center guarded by myth lintels.
      for (r = 0; r < 5; r++) for (c = 0; c < COLS; c++) {
        if (r >= 1 && r <= 3 && c >= 2 && c <= 5) continue;
        plain(c, r);
      }
      bricks = bricks.filter(function (b) { return !(b.r === 2 && (b.c <= 1 || b.c >= 6)); });
      myth(0, 2); myth(6, 2);
      myth(3, 2);
    }
    return bricks;
  }

  // ======================================================================
  //  Game controller
  // ======================================================================
  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var reduce = A.prefersReducedMotion();
    var muted;
    try { muted = window.localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { muted = false; }
    if (reduce) muted = true;

    var state = "idle"; // idle | running | banner | gameover
    var held = { left: false, right: false };
    var paddleX, balls, bricks, drops, particles, floaters;
    var level, lives, score, calmTimer, wideTimer, bannerText, bannerTimer;
    var PARTICLE_CAP = 32, FLOATER_CAP = 10;

    function paddleW() { return wideTimer > 0 ? PADDLE_W * 1.5 : PADDLE_W; }

    function resetWorld() {
      level = 1; lives = 3; score = 0;
      calmTimer = 0; wideTimer = 0;
      particles = particles || []; floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      drops = [];
      paddleX = W / 2 - PADDLE_W / 2;
      buildLevel();
      spawnBall();
    }

    function buildLevel() {
      bricks = layoutFor(level);
      drops = [];
    }

    function spawnBall() {
      balls = [{ x: 0, y: 0, vx: 0, vy: 0, stuck: true, speed: ballSpeed() }];
    }
    function ballSpeed() { return Math.min(2.1 + (level - 1) * 0.25, 3.2); }

    function brickBox(b) {
      return {
        x: FIELD_X + b.c * (BRICK_W + 1),
        y: FIELD_Y + b.r * (BRICK_H + 2),
        w: BRICK_W * b.span + (b.span - 1),
        h: BRICK_H
      };
    }

    // ---------- Audio ----------
    var audioCtx = null, masterGain = null;
    function ensureAudio() {
      if (muted) return;
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.09;
        masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
    function beep(f0, f1, dur, type, vol) {
      if (muted || !audioCtx) return;
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.6, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + dur + 0.02);
    }
    var sfx = {
      paddle: function () { beep(220, 330, 0.05, "square", 0.4); },
      wall: function () { beep(160, 160, 0.04, "square", 0.3); },
      brick: function () { beep(520, 700, 0.06, "triangle", 0.45); },
      crack: function () { beep(320, 240, 0.07, "square", 0.4); },
      bust: function () { beep(520, 1040, 0.18, "triangle", 0.5); },
      drop: function () { beep(660, 880, 0.1, "triangle", 0.4); },
      lose: function () { beep(220, 70, 0.3, "sawtooth", 0.55); },
      level: function () { beep(523, 784, 0.2, "triangle", 0.5); setTimeout(function () { beep(659, 988, 0.2, "triangle", 0.4); }, 100); }
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
        var a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.3;
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 10 + Math.random() * 10, color);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 30; f.maxLife = 30; f.text = text; f.color = color;
    }

    // ---------- Lifecycle ----------
    function start() { resetWorld(); state = "running"; hidePrompt(); ensureAudio(); }
    function startBanner(text) { bannerText = text; bannerTimer = 100; state = "banner"; }

    function launch() {
      var launched = false;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (!b.stuck) continue;
        b.stuck = false;
        var a = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        b.vx = Math.cos(a) * b.speed;
        b.vy = Math.sin(a) * b.speed;
        launched = true;
      }
      if (launched) { ensureAudio(); sfx.paddle(); }
    }

    function loseBall() {
      if (balls.length) return; // other balls still live
      lives--;
      ensureAudio(); sfx.lose();
      calmTimer = 0; wideTimer = 0;
      if (lives <= 0) {
        state = "gameover";
        showEnd(Math.floor(score));
        return;
      }
      spawnBall();
    }

    // ---------- Update ----------
    function tick(dt) {
      if (state === "banner") {
        bannerTimer -= dt;
        if (bannerTimer <= 0) { state = "running"; }
        return;
      }

      // Paddle (keyboard; pointer sets paddleX directly via handler)
      var pv = 3.2;
      if (held.left) paddleX -= pv * dt;
      if (held.right) paddleX += pv * dt;
      paddleX = clamp(paddleX, 2, W - 2 - paddleW());

      if (calmTimer > 0) calmTimer -= dt;
      if (wideTimer > 0) wideTimer -= dt;

      var speedScale = calmTimer > 0 ? 0.65 : 1;

      // Balls
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i];
        if (b.stuck) {
          b.x = paddleX + paddleW() / 2;
          b.y = PADDLE_Y - BALL / 2 - 1;
          continue;
        }
        b.x += b.vx * dt * speedScale;
        b.y += b.vy * dt * speedScale;

        // walls
        if (b.x < BALL / 2) { b.x = BALL / 2; b.vx = Math.abs(b.vx); ensureAudio(); sfx.wall(); }
        if (b.x > W - BALL / 2) { b.x = W - BALL / 2; b.vx = -Math.abs(b.vx); ensureAudio(); sfx.wall(); }
        if (b.y < BALL / 2 + 14) { b.y = BALL / 2 + 14; b.vy = Math.abs(b.vy); ensureAudio(); sfx.wall(); }

        // paddle
        if (b.vy > 0 && b.y + BALL / 2 >= PADDLE_Y && b.y + BALL / 2 <= PADDLE_Y + PADDLE_H + 3 &&
            b.x >= paddleX - 2 && b.x <= paddleX + paddleW() + 2) {
          var rel = clamp((b.x - (paddleX + paddleW() / 2)) / (paddleW() / 2), -1, 1);
          var ang = -Math.PI / 2 + rel * (Math.PI * 0.36);
          b.speed = Math.min(b.speed + 0.045, 3.6);
          b.vx = Math.cos(ang) * b.speed;
          b.vy = Math.sin(ang) * b.speed;
          b.y = PADDLE_Y - BALL / 2;
          ensureAudio(); sfx.paddle();
        }

        // bricks
        if (hitBricks(b)) { /* bounce handled inside */ }

        // floor
        if (b.y > H + 8) {
          balls.splice(i, 1);
          loseBall();
          if (state !== "running") return;
        }
      }

      // drops
      for (var d = drops.length - 1; d >= 0; d--) {
        var dr = drops[d];
        dr.y += 0.9 * dt;
        if (dr.y > H + 6) { drops.splice(d, 1); continue; }
        if (dr.y + 3 >= PADDLE_Y && dr.y <= PADDLE_Y + PADDLE_H + 2 &&
            dr.x >= paddleX - 4 && dr.x <= paddleX + paddleW() + 4) {
          applyDrop(dr.type);
          drops.splice(d, 1);
        }
      }

      // particles / floaters
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        if (pt.life <= 0) continue;
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 0.06 * dt; pt.life -= dt;
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        fl.y -= 0.3 * dt; fl.life -= dt;
      }

      // level clear
      if (!bricks.length && state === "running") {
        score += 100 + level * 50;
        level++;
        ensureAudio(); sfx.level();
        buildLevel();
        spawnBall();
        startBanner("Wall " + level + " — keep asking");
      }
    }

    function hitBricks(b) {
      for (var i = bricks.length - 1; i >= 0; i--) {
        var br = bricks[i];
        var box = brickBox(br);
        if (b.x + BALL / 2 < box.x || b.x - BALL / 2 > box.x + box.w ||
            b.y + BALL / 2 < box.y || b.y - BALL / 2 > box.y + box.h) continue;

        // pick bounce axis from the shallower overlap
        var overlapX = Math.min(b.x + BALL / 2 - box.x, box.x + box.w - (b.x - BALL / 2));
        var overlapY = Math.min(b.y + BALL / 2 - box.y, box.y + box.h - (b.y - BALL / 2));
        if (overlapX < overlapY) b.vx = b.x < box.x + box.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
        else b.vy = b.y < box.y + box.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);

        br.hp--;
        if (br.hp <= 0) {
          var pts = br.myth ? 50 : 10 + (3 - Math.min(br.r, 3)) * 5;
          score += pts;
          spawnBurst(box.x + box.w / 2, box.y + box.h / 2, br.myth ? BRAIN : ROW_COLORS[br.r % ROW_COLORS.length], br.myth ? 12 : 6);
          spawnFloater(box.x + box.w / 2, box.y, br.myth ? "busted!" : "+" + pts, br.myth ? BRAIN : LEAF_SIDE);
          ensureAudio();
          if (br.myth) sfx.bust(); else sfx.brick();
          if (Math.random() < (br.myth ? 0.55 : 0.14)) {
            var types = ["calm", "wide", "spark"];
            drops.push({ x: box.x + box.w / 2, y: box.y + box.h / 2, type: types[Math.floor(Math.random() * types.length)] });
          }
          bricks.splice(i, 1);
        } else {
          ensureAudio(); sfx.crack();
          spawnBurst(b.x, b.y, WARM, 4);
        }
        return true;
      }
      return false;
    }

    function applyDrop(type) {
      ensureAudio(); sfx.drop();
      if (type === "calm") {
        calmTimer = 420;
        spawnFloater(paddleX + paddleW() / 2, PADDLE_Y - 8, "calm", LEAF_SIDE);
      } else if (type === "wide") {
        wideTimer = 540;
        spawnFloater(paddleX + paddleW() / 2, PADDLE_Y - 8, "patience", LEAF_TOP);
      } else {
        // spark: split every live ball (cap 4 total)
        var extra = [];
        for (var i = 0; i < balls.length && balls.length + extra.length < 4; i++) {
          var b = balls[i];
          if (b.stuck) continue;
          var a = Math.atan2(b.vy, b.vx) + 0.5;
          extra.push({ x: b.x, y: b.y, vx: Math.cos(a) * b.speed, vy: Math.sin(a) * b.speed, stuck: false, speed: b.speed });
        }
        balls = balls.concat(extra);
        spawnFloater(paddleX + paddleW() / 2, PADDLE_Y - 8, "curiosity!", BRAIN);
      }
    }

    // ---------- Render ----------
    function render() {
      ctx.save();
      ctx.fillStyle = CREAM;
      ctx.fillRect(-4, -4, W + 8, H + 8);

      // ceiling line
      ctx.fillStyle = "rgba(14,42,45,0.25)";
      ctx.fillRect(0, 13, W, 1);

      // bricks
      ctx.font = "6px monospace";
      for (var i = 0; i < bricks.length; i++) {
        var br = bricks[i];
        var box = brickBox(br);
        if (br.myth) {
          blockyRect(ctx, box.x, box.y, box.w, box.h, br.hp > 1 ? WARM : "#E8DCC2");
          ctx.fillStyle = INK;
          ctx.textAlign = "center";
          ctx.fillText(br.myth, box.x + box.w / 2, box.y + 7);
          ctx.textAlign = "left";
          if (br.hp === 1) { // cracked
            ctx.fillStyle = INK;
            ctx.fillRect(box.x + 4, box.y + 2, 1, 6);
            ctx.fillRect(box.x + box.w - 6, box.y + 3, 1, 5);
          }
        } else {
          blockyRect(ctx, box.x, box.y, box.w, box.h, ROW_COLORS[br.r % ROW_COLORS.length]);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, 1);
        }
      }

      // drops
      ctx.font = "6px monospace"; ctx.textAlign = "center";
      for (var d = 0; d < drops.length; d++) {
        var dr = drops[d];
        var color = dr.type === "calm" ? LEAF_SIDE : dr.type === "wide" ? LEAF_TOP : BRAIN;
        blockyRect(ctx, dr.x - 3, dr.y - 3, 6, 6, color);
        ctx.fillStyle = INK;
        ctx.fillText(dr.type === "calm" ? "C" : dr.type === "wide" ? "W" : "S", dr.x, dr.y + 2);
      }
      ctx.textAlign = "left";

      // paddle
      var pw = paddleW();
      blockyRect(ctx, paddleX, PADDLE_Y, pw, PADDLE_H, wideTimer > 0 ? LEAF_TOP : "#517965");
      ctx.fillStyle = BRAIN;
      ctx.fillRect(Math.round(paddleX + pw / 2 - 2), PADDLE_Y + 1, 4, PADDLE_H - 2);

      // balls
      for (var b = 0; b < balls.length; b++) {
        blockyRect(ctx, balls[b].x - BALL / 2, balls[b].y - BALL / 2, BALL, BALL, calmTimer > 0 ? LEAF_SIDE : "#FFFFFF");
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

      // lives (paddle pips, top-left) + effect labels
      for (var lv = 0; lv < lives; lv++) {
        ctx.fillStyle = "#517965";
        ctx.fillRect(6 + lv * 10, 6, 7, 3);
      }
      ctx.font = "7px monospace";
      if (calmTimer > 0) { ctx.fillStyle = LEAF_SIDE; ctx.fillText("CALM", W - 66, 10); }
      if (wideTimer > 0) { ctx.fillStyle = LEAF_TOP; ctx.fillText("WIDE", W - 34, 10); }

      // banner
      if (state === "banner" && bannerTimer > 0) {
        ctx.globalAlpha = clamp(bannerTimer / 100, 0, 1);
        ctx.fillStyle = "rgba(244,239,227,0.88)"; ctx.fillRect(0, H / 2 - 15, W, 30);
        ctx.fillStyle = INK; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(bannerText, W / 2, H / 2 + 2);
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }

      ctx.restore();
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(5, "0");
      if (els.level) els.level.textContent = String(level || 1);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Myth Buster";
      els.promptText.textContent = "Bust the parenting myths brick by brick. The labeled ones take two hits.";
      els.promptActions.textContent = "";
      A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Start";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
      els.prompt.hidden = false;
    }
    function showEnd(finalScore) {
      updateHud();
      els.promptTitle.textContent = "The wall held — this time";
      els.promptText.textContent = "Score " + String(finalScore).padStart(5, "0") + " · wall " + level;
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
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      if (state === "running" || state === "banner") tick(dt);
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      held: held,
      launchOrStart: function () {
        ensureAudio();
        if (state === "idle") { start(); return; }
        if (state === "gameover") {
          if (document.activeElement && document.activeElement.tagName === "INPUT") return;
          start(); return;
        }
        launch();
      },
      movePaddleTo: function (lx) {
        if (state !== "running" && state !== "banner") return;
        paddleX = clamp(lx - paddleW() / 2, 2, W - 2 - paddleW());
      },
      toggleMute: function () {
        muted = !muted;
        try { window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
        if (!muted) ensureAudio();
        return muted;
      },
      isMuted: function () { return muted; },
      activate: function () {
        resetWorld(); state = "idle"; lastTime = 0;
        updateHud(); showIdle();
        rafId = window.requestAnimationFrame(loop);
      },
      deactivate: function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
        if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
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
    overlay.setAttribute("aria-label", "Myth Buster — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Myth Buster <span>— you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>WALL <strong data-egg-level>1</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--breakout">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Mouse / drag moves the paddle · click or Space launches · M to mute</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-left aria-label="Move left">◀</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-launch aria-label="Launch">LAUNCH</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-right aria-label="Move right">▶</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-arcade-canvas");
    var game = createGame(canvas, {
      score: overlay.querySelector("[data-egg-score]"),
      best: overlay.querySelector("[data-egg-best]"),
      level: overlay.querySelector("[data-egg-level]"),
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

    // The canvas is object-fit:contain — map pointer x through the letterbox.
    function logicalX(clientX) {
      var rect = canvas.getBoundingClientRect();
      var scale = Math.min(rect.width / W, rect.height / H);
      var offX = (rect.width - W * scale) / 2;
      return (clientX - rect.left - offX) / scale;
    }
    var suppressMouse = 0;
    canvas.addEventListener("mousemove", function (e) { game.movePaddleTo(logicalX(e.clientX)); });
    canvas.addEventListener("mousedown", function (e) {
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      game.launchOrStart();
    });
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      if (e.touches.length) game.movePaddleTo(logicalX(e.touches[0].clientX));
      game.launchOrStart();
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (e.touches.length) game.movePaddleTo(logicalX(e.touches[0].clientX));
    }, { passive: false });

    // Touch buttons.
    function holdBtn(sel, key) {
      var el = overlay.querySelector(sel);
      var down = function (e) { e.preventDefault(); game.held[key] = true; };
      var up = function (e) { e.preventDefault(); game.held[key] = false; };
      el.addEventListener("touchstart", down, { passive: false });
      el.addEventListener("touchend", up, { passive: false });
      el.addEventListener("touchcancel", up, { passive: false });
      el.addEventListener("mousedown", down);
      el.addEventListener("mouseup", up);
      el.addEventListener("mouseleave", up);
    }
    holdBtn("[data-egg-left]", "left");
    holdBtn("[data-egg-right]", "right");
    var launchBtn = overlay.querySelector("[data-egg-launch]");
    var ldown = function (e) { e.preventDefault(); game.launchOrStart(); };
    launchBtn.addEventListener("touchstart", ldown, { passive: false });
    launchBtn.addEventListener("mousedown", ldown);

    function onKeydown(e) {
      // While typing initials, leave all keys (incl. Escape/Enter) to the form
      // so a stray Escape never reloads the page and drops the high score.
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.held.left = true; }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.held.right = true; }
      else if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); if (!e.repeat) game.launchOrStart(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }
    function onKeyup(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.held.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.held.right = false;
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
    overlay._canvas = canvas;
    return overlay;
  }

  function closeOverlay(overlay) {
    overlay.game.deactivate();
    window.location.reload();
  }
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-arcade-lock");
    document.addEventListener("keydown", overlay._onKeydown);
    document.addEventListener("keyup", overlay._onKeyup);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Pixel-brick trigger, tucked into the FAQ hero.
  function buildTrigger() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gms-arcade-brick-trigger";
    btn.setAttribute("aria-label", "Hidden game");
    btn.title = "?";
    btn.innerHTML =
      '<svg viewBox="0 0 12 8" aria-hidden="true" shape-rendering="crispEdges">' +
      '<g fill="currentColor">' +
      '<rect x="0" y="0" width="5" height="2"/><rect x="6" y="0" width="6" height="2"/>' +
      '<rect x="0" y="3" width="2" height="2"/><rect x="3" y="3" width="6" height="2"/><rect x="10" y="3" width="2" height="2"/>' +
      '<rect x="0" y="6" width="5" height="2"/><rect x="6" y="6" width="4" height="2"/>' +
      '</g></svg>';
    return btn;
  }

  ready(function () {
    var hero = document.querySelector(".page-hero .container") || document.querySelector("main .container");
    if (!hero) return;
    var cs = window.getComputedStyle(hero);
    if (cs.position === "static") hero.style.position = "relative";

    var trigger = buildTrigger();
    hero.appendChild(trigger);

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
