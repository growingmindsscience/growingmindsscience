/* Growing Minds Science — dino-game.js
   A hidden easter egg, scoped to the Classes page only.

   Click the dead-center of the theme-toggle circle (top right of the
   header) and a tiny offline-style runner opens: an 8-bit version of the
   GMS mark hopping over stacks of books and ducking under flying toys.
   The rest of the toggle circle still behaves like a normal theme switch.

   Self-contained: builds its own overlay DOM, runs its own rAF loop, and
   tears everything down (listeners + loop) when closed. No globals.
*/
(function () {
  "use strict";

  var HIGH_SCORE_KEY = "gms-dino-highscore";

  function safeGetHighScore() {
    try { return parseInt(window.localStorage.getItem(HIGH_SCORE_KEY), 10) || 0; }
    catch (e) { return 0; }
  }
  function safeSetHighScore(value) {
    try { window.localStorage.setItem(HIGH_SCORE_KEY, String(value)); } catch (e) {}
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- Pixel palette (sampled from the GMS mark) ----------
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var SCREEN_BG = "#F4EFE3";
  var BOOK_COLORS = ["#FD951F", "#40C099", "#9FCB43", "#D5BE98"];
  var TOY_BODY = "#FFFFFF";
  var TOY_STRIPE = "#40C099";

  // ---------- Internal (logical) game resolution ----------
  var W = 320;
  var H = 120;
  var GROUND_Y = 100;

  var STAND_W = 22, STAND_H = 28;
  var DUCK_W = 28, DUCK_H = 16;

  var GRAVITY = 0.45;
  var JUMP_VELOCITY = -6.0;

  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawMascot(ctx, x, y, ducking, legState) {
    x = Math.round(x); y = Math.round(y);
    if (ducking) {
      blockyRect(ctx, x + 4, y + 4, 20, 10, BRAIN);
      ctx.fillStyle = INK;
      ctx.fillRect(x + 13, y + 5, 2, 8);
      blockyRect(ctx, x + 18, y, 6, 5, LEAF_TOP);
      blockyRect(ctx, x + 10, y + 1, 5, 4, LEAF_SIDE);
      var dLegH = legState === 1 ? 4 : 3;
      blockyRect(ctx, x + 6, y + 16 - dLegH, 4, dLegH, INK);
      blockyRect(ctx, x + 17, y + 16 - (legState === 1 ? 3 : 4), 4, legState === 1 ? 3 : 4, INK);
      return;
    }

    // legs (drawn first, behind the body)
    if (legState === "tuck") {
      blockyRect(ctx, x + 6, y + 23, 3, 4, INK);
      blockyRect(ctx, x + 13, y + 23, 3, 4, INK);
    } else {
      var leftUp = legState === 1;
      blockyRect(ctx, x + 6, leftUp ? y + 22 : y + 24, 3, 4, INK);
      blockyRect(ctx, x + 13, leftUp ? y + 24 : y + 22, 3, 4, INK);
    }

    // stem
    blockyRect(ctx, x + 9, y + 6, 4, 5, INK);

    // brain (two hemispheres)
    blockyRect(ctx, x + 3, y + 10, 16, 14, BRAIN);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 10, y + 11, 2, 12);

    // sprout leaves
    blockyRect(ctx, x + 9, y, 4, 7, LEAF_TOP);
    blockyRect(ctx, x + 2, y + 3, 6, 5, LEAF_SIDE);
    blockyRect(ctx, x + 14, y + 3, 6, 5, LEAF_SIDE);
  }

  function drawBook(ctx, ob) {
    var x = Math.round(ob.x);
    var bottom = GROUND_Y;
    var stack = ob.variant === 2 ? [13, 13] : [16];
    var y = bottom;
    for (var i = 0; i < stack.length; i++) {
      var bh = stack[i];
      y -= bh;
      var color = BOOK_COLORS[(ob.colorSeed + i) % BOOK_COLORS.length];
      blockyRect(ctx, x, y, 16, bh, color);
      ctx.fillStyle = INK;
      ctx.fillRect(x + 3, y, 2, bh);
    }
  }

  function drawToy(ctx, ob) {
    var x = Math.round(ob.x);
    var y = Math.round(ob.y);
    blockyRect(ctx, x + 4, y + 2, 14, 6, TOY_BODY);
    blockyRect(ctx, x, y + 3, 4, 4, TOY_BODY);
    blockyRect(ctx, x + 14, y, 4, 9, LEAF_SIDE);
    ctx.fillStyle = TOY_STRIPE;
    ctx.fillRect(x + 4, y + 4, 14, 2);
  }

  // ---------- Game controller ----------
  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var state = "idle"; // idle | running | gameover
    var player, obstacles, speed, score, groundOffset, nextSpawn, legPhase, legTimer, rafId, lastTime, downHeld;

    function resetWorld() {
      player = { x: 26, top: GROUND_Y - STAND_H, vy: 0, grounded: true, ducking: false };
      obstacles = [];
      speed = 2.6;
      score = 0;
      groundOffset = 0;
      nextSpawn = 90;
      legPhase = 0;
      legTimer = 0;
      downHeld = false;
    }
    resetWorld();

    function currentW() { return player.ducking ? DUCK_W : STAND_W; }
    function currentH() { return player.ducking ? DUCK_H : STAND_H; }

    function setDucking(on) {
      if (state !== "running" || !player.grounded) { downHeld = on; return; }
      downHeld = on;
      if (on === player.ducking) return;
      player.ducking = on;
      player.top = GROUND_Y - currentH();
    }

    function jump() {
      if (state === "idle") { start(); return; }
      if (state === "gameover") { resetWorld(); state = "running"; updatePrompt(); return; }
      if (player.grounded && !player.ducking) {
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
      }
    }

    function start() {
      resetWorld();
      state = "running";
      updatePrompt();
    }

    function gameOver() {
      state = "gameover";
      var best = safeGetHighScore();
      var finalScore = Math.floor(score);
      if (finalScore > best) { best = finalScore; safeSetHighScore(best); }
      updatePrompt();
      updateScore();
    }

    function updatePrompt() {
      if (!els.prompt) return;
      if (state === "idle") {
        els.prompt.textContent = "Tap or press Space to start";
        els.prompt.hidden = false;
      } else if (state === "gameover") {
        els.prompt.textContent = "Game over — tap or press Space to try again";
        els.prompt.hidden = false;
      } else {
        els.prompt.hidden = true;
      }
    }

    function updateScore() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(5, "0");
      if (els.best) els.best.textContent = String(safeGetHighScore()).padStart(5, "0");
    }

    function spawnObstacle() {
      var isToy = Math.random() < 0.42;
      if (isToy) {
        obstacles.push({
          type: "toy", x: W + 10, baseY: GROUND_Y - 30, y: GROUND_Y - 30,
          w: 18, h: 10, seed: Math.random() * 1000
        });
      } else {
        var twoBooks = Math.random() < 0.35;
        obstacles.push({
          type: "book", x: W + 10, variant: twoBooks ? 2 : 1,
          w: 16, h: twoBooks ? 26 : 16, colorSeed: Math.floor(Math.random() * BOOK_COLORS.length)
        });
      }
      var gap = 130 - Math.min(45, speed * 9) + Math.random() * 70;
      nextSpawn = Math.max(85, gap);
    }

    function obstacleHitbox(ob) {
      if (ob.type === "book") {
        return { x: ob.x + 2, y: GROUND_Y - ob.h + 2, w: ob.w - 4, h: ob.h - 2 };
      }
      return { x: ob.x + 2, y: ob.y + 2, w: ob.w - 4, h: ob.h - 4 };
    }

    function playerHitbox() {
      return { x: player.x, y: player.top + 2, w: currentW() - 4, h: currentH() - 3 };
    }

    function overlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function tick(dt) {
      groundOffset = (groundOffset + speed * dt) % 14;

      if (!player.grounded) {
        player.vy += GRAVITY * dt;
        player.top += player.vy * dt;
        if (player.top + currentH() >= GROUND_Y) {
          player.top = GROUND_Y - currentH();
          player.vy = 0;
          player.grounded = true;
          if (downHeld) setDucking(true);
        }
      } else if (downHeld !== player.ducking) {
        setDucking(downHeld);
      }

      legTimer += dt;
      if (legTimer > 6) { legTimer = 0; legPhase = legPhase ? 0 : 1; }

      speed = Math.min(6.4, 2.6 + score * 0.012);
      score += speed * dt * 0.1;

      nextSpawn -= speed * dt;
      if (nextSpawn <= 0) spawnObstacle();

      var hitbox = playerHitbox();
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var ob = obstacles[i];
        ob.x -= speed * dt;
        if (ob.type === "toy") ob.y = ob.baseY + Math.sin((ob.seed + ob.x) * 0.05) * 3;
        if (ob.x + ob.w < -10) { obstacles.splice(i, 1); continue; }
        if (overlap(hitbox, obstacleHitbox(ob))) { gameOver(); }
      }

      updateScore();
    }

    function render() {
      ctx.fillStyle = SCREEN_BG;
      ctx.fillRect(0, 0, W, H);

      // ground
      ctx.fillStyle = INK;
      ctx.fillRect(0, GROUND_Y, W, 2);
      for (var gx = -14 + (W - groundOffset) % 14; gx < W; gx += 14) {
        ctx.fillRect(gx, GROUND_Y + 4, 7, 2);
      }

      for (var i = 0; i < obstacles.length; i++) {
        var ob = obstacles[i];
        if (ob.type === "book") drawBook(ctx, ob);
        else drawToy(ctx, ob);
      }

      var ls = player.grounded ? legPhase : "tuck";
      drawMascot(ctx, player.x, player.top, player.ducking, ls);
    }

    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.5, (now - lastTime) / (1000 / 60));
      lastTime = now;
      if (state === "running") tick(dt);
      render();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      jump: jump,
      duck: setDucking,
      activate: function () {
        resetWorld();
        state = "idle";
        lastTime = 0;
        updatePrompt();
        updateScore();
        rafId = window.requestAnimationFrame(loop);
      },
      deactivate: function () {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  // ---------- Overlay scaffolding ----------
  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-egg-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Brain Sprint — a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-egg-backdrop" data-egg-close></div>' +
      '<div class="gms-egg-panel">' +
        '<div class="gms-egg-panel__head">' +
          '<p class="gms-egg-title">Brain Sprint <span>— you found it!</span></p>' +
          '<button type="button" class="gms-egg-close" data-egg-close aria-label="Close game">&times;</button>' +
        '</div>' +
        '<div class="gms-egg-scores">' +
          '<span>SCORE <strong data-egg-score>00000</strong></span>' +
          '<span>BEST <strong data-egg-best>00000</strong></span>' +
        '</div>' +
        '<div class="gms-egg-stage">' +
          '<canvas class="gms-egg-canvas" tabindex="0"></canvas>' +
          '<p class="gms-egg-prompt" data-egg-prompt hidden></p>' +
        '</div>' +
        '<p class="gms-egg-help">Space / tap to jump &middot; hold &darr; to duck under flying toys</p>' +
        '<button type="button" class="gms-egg-duck" data-egg-duck aria-label="Hold to duck">DUCK</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var canvas = overlay.querySelector(".gms-egg-canvas");
    var game = createGame(canvas, {
      score: overlay.querySelector("[data-egg-score]"),
      best: overlay.querySelector("[data-egg-best]"),
      prompt: overlay.querySelector("[data-egg-prompt]")
    });

    overlay.querySelectorAll("[data-egg-close]").forEach(function (el) {
      el.addEventListener("click", function () { closeOverlay(overlay); });
    });

    function jumpFromPointer(e) {
      e.preventDefault();
      game.jump();
    }
    canvas.addEventListener("mousedown", jumpFromPointer);
    canvas.addEventListener("touchstart", jumpFromPointer, { passive: false });

    var duckBtn = overlay.querySelector("[data-egg-duck]");
    var duckStart = function (e) { e.preventDefault(); game.duck(true); };
    var duckEnd = function (e) { e.preventDefault(); game.duck(false); };
    duckBtn.addEventListener("mousedown", duckStart);
    duckBtn.addEventListener("mouseup", duckEnd);
    duckBtn.addEventListener("mouseleave", duckEnd);
    duckBtn.addEventListener("touchstart", duckStart, { passive: false });
    duckBtn.addEventListener("touchend", duckEnd);

    function onKeydown(e) {
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        game.jump();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        game.duck(true);
      }
    }
    function onKeyup(e) {
      if (e.key === "ArrowDown") { e.preventDefault(); game.duck(false); }
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
    overlay._canvas = canvas;
    return overlay;
  }

  // The page contents are torn away when the game opens, so the simplest,
  // most robust way to put the page back is a reload.
  function closeOverlay(overlay) {
    overlay.game.deactivate();
    window.location.reload();
  }

  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.classList.add("gms-egg-lock");
    document.addEventListener("keydown", overlay._onKeydown);
    document.addEventListener("keyup", overlay._onKeyup);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  // Tumble the page (header, main content, footer) off the bottom of the
  // screen with a staggered fall, then run `done`. Honors reduced motion.
  function tearPageAway(done) {
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

    var pieces = [];
    var header = document.querySelector(".site-header");
    if (header) pieces.push(header);
    var main = document.getElementById("main");
    if (main) [].forEach.call(main.children, function (c) { pieces.push(c); });
    var footer = document.querySelector(".site-footer");
    if (footer) pieces.push(footer);

    document.body.classList.add("gms-egg-lock");

    if (reduce || !pieces.length) {
      pieces.forEach(function (p) { p.style.visibility = "hidden"; });
      done();
      return;
    }

    var maxDelay = 0;
    pieces.forEach(function (p, i) {
      var delay = i * 70;
      maxDelay = Math.max(maxDelay, delay);
      var dx = (Math.random() * 220 - 110);
      var rot = (Math.random() * 60 - 30);
      p.classList.add("gms-egg-falling");
      p.style.transition =
        "transform .95s cubic-bezier(.55,.06,.68,.19) " + delay + "ms, " +
        "opacity .95s ease-in " + delay + "ms";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          p.style.transform =
            "translate(" + dx.toFixed(0) + "px, 125vh) rotate(" + rot.toFixed(0) + "deg)";
          p.style.opacity = "0";
        });
      });
    });
    window.setTimeout(done, maxDelay + 1000);
  }

  ready(function () {
    var toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;

    var hotspot = document.createElement("span");
    hotspot.className = "gms-egg-hotspot";
    hotspot.setAttribute("aria-hidden", "true");
    toggle.appendChild(hotspot);

    var overlay = null;
    var opening = false;

    function open() {
      if (opening) return;
      opening = true;
      if (!overlay) overlay = buildOverlay();
      tearPageAway(function () { openOverlay(overlay); });
    }

    ["click", "mousedown", "touchstart"].forEach(function (evt) {
      hotspot.addEventListener(evt, function (e) {
        e.stopPropagation();
        if (evt === "click") { e.preventDefault(); open(); }
      }, evt === "touchstart" ? { passive: false } : false);
    });
  });
})();
