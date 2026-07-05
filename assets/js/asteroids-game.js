/* Growing Minds Science - asteroids-game.js
   "Synapse Drift" - a hidden Asteroids-style easter egg on the About page.

   Trigger: a tiny orbit glyph tucked into the About portrait. Opening tears
   the page away (GMSArcade) and reveals a fullscreen pixel-canvas game.
*/
(function () {
  "use strict";

  var A = window.GMSArcade;
  if (!A) return;

  var GAME_KEY = "synapse-drift";
  var MUTE_KEY = "gms-asteroids-muted";

  var W = 320, H = 220;
  var INK = "#0E2A2D";
  var BRAIN = "#FD951F";
  var LEAF_TOP = "#9FCB43";
  var LEAF_SIDE = "#40C099";
  var WARM = "#D5BE98";
  var SAGE = "#517965";
  var CREAM = "#F4EFE3";
  var STAR = "#F8F6F1";
  var LABELS = ["myth", "noise", "panic", "rush", "should", "advice", "worry"];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
  function shortestDelta(from, to, span) {
    var d = to - from;
    if (d > span / 2) d -= span;
    else if (d < -span / 2) d += span;
    return d;
  }
  function wrap(o, pad) {
    pad = pad || 0;
    if (o.x < -pad) o.x = W + pad;
    else if (o.x > W + pad) o.x = -pad;
    if (o.y < -pad) o.y = H + pad;
    else if (o.y > H + pad) o.y = -pad;
  }
  function blockyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function createGame(canvas, els) {
    var ctx = canvas.getContext("2d");
    var backingScale = 1;
    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    var reduce = A.prefersReducedMotion();
    // Shared juice: crisp trauma shake + hit-stop, and a "Flow" chain multiplier.
    // Audio-mute is deliberately independent of reduced-motion (a11y: motion-
    // sensitive players still get sound).
    var camera = A.makeCamera({ reduce: reduce, maxPx: 4 });
    var combo = A.makeCombo({ window: 120, max: 5 });

    var BLOOM_MAX = 430; // frames a full Bloom Drive window lasts

    var state = "idle"; // idle | running | waveclear | gameover
    var held = { left: false, right: false, thrust: false, fire: false, blink: false };
    var ship, rocks, shots, pickups, particles, floaters, stars, mouseTarget;
    var wave, lives, score, seedMeter, shield, bloomTimer, fireCooldown, blinkCooldown, nextWaveTimer;
    var flashTimer;
    var PARTICLE_CAP = 56, FLOATER_CAP = 16;

    function makeStars() {
      stars = [];
      for (var i = 0; i < 44; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, z: rand(0.25, 1), tw: Math.random() * 80 });
      }
    }

    function resetWorld() {
      makeStars();
      wave = 1; lives = 3; score = 0; seedMeter = 0; shield = true;
      bloomTimer = 0; fireCooldown = 0; blinkCooldown = 0; nextWaveTimer = 0;
      combo.reset(true);
      particles = particles || []; floaters = floaters || [];
      particles.length = 0; floaters.length = 0;
      mouseTarget = null;
      resetShip();
      buildWave();
      updateHud();
    }

    function resetShip() {
      ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 120, blink: 0 };
      shots = [];
      pickups = [];
      fireCooldown = 0;
      blinkCooldown = 0;
    }

    function buildWave() {
      rocks = [];
      var count = Math.min(4 + wave, 10);
      for (var i = 0; i < count; i++) spawnRock(3, true);
      if (wave % 4 === 0) spawnRock(4, true);
      nextWaveTimer = 0;
      spawnFloater(W / 2 - 25, H / 2 - 20, "wave " + wave, LEAF_SIDE);
      sfx.wave();
    }

    function spawnRock(size, edge) {
      var r = size === 4 ? 32 : size === 3 ? 22 : size === 2 ? 15 : 9;
      var x, y;
      if (edge) {
        var side = Math.floor(Math.random() * 4);
        x = side === 0 ? -r : side === 1 ? W + r : rand(0, W);
        y = side === 2 ? -r : side === 3 ? H + r : rand(0, H);
      } else {
        x = rand(0, W); y = rand(0, H);
      }
      var ang = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.9, 0.9);
      var sp = rand(0.35, 0.95) + wave * 0.045 + (4 - size) * 0.08;
      var verts = [];
      var n = size === 1 ? 7 : 9;
      for (var i = 0; i < n; i++) verts.push(rand(0.68, 1.18));
      rocks.push({
        x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        r: r, size: size, a: rand(0, Math.PI * 2), spin: rand(-0.025, 0.025),
        verts: verts, label: LABELS[Math.floor(Math.random() * LABELS.length)]
      });
    }

    // ---------- Audio (shared GMSArcade synth: compressor + noise + arp) ----------
    var audio = A.makeSynth({ muteKey: MUTE_KEY });
    function ensureAudio() { audio.ensure(); }
    var sfx = {
      fire: function () { audio.beep(760, 520, 0.06, "square", 0.38); },
      thrust: function () { audio.beep(90, 70, 0.04, "sawtooth", 0.18); },
      // Pitch rises with the Flow multiplier; layered noise gives the rock a crunch.
      rock: function (mult) {
        mult = mult || 1;
        audio.beep(150 + (mult - 1) * 70, 80, 0.12, "sawtooth", 0.42);
        audio.noise(0.16, 1100, 0.3);
      },
      seed: function () { audio.beep(620, 980, 0.12, "triangle", 0.42); },
      bloom: function () { audio.arp([440, 660, 880, 1320], 0.06, 0.2, "triangle", 0.5); },
      // Soft detuned pad that swells for the length of the Bloom window.
      bloomPad: function () {
        var d = BLOOM_MAX / 60;
        audio.beep(174, 174, d, "sine", 0.13);
        audio.beep(176.5, 176.5, d, "triangle", 0.1);
      },
      shield: function () { audio.beep(260, 540, 0.16, "sine", 0.44); },
      hit: function () { audio.beep(190, 55, 0.22, "sawtooth", 0.58); audio.noise(0.34, 850, 0.45); },
      blink: function () { audio.beep(900, 320, 0.16, "triangle", 0.35); },
      wave: function () { audio.arp([392, 588, 784], 0.07, 0.2, "triangle", 0.44); }
    };

    // ---------- Feedback ----------
    function spawnParticle(x, y, vx, vy, life, color, size) {
      if (reduce) return;
      var p;
      for (var i = 0; i < particles.length; i++) { if (particles[i].life <= 0) { p = particles[i]; break; } }
      if (!p) { if (particles.length >= PARTICLE_CAP) return; p = {}; particles.push(p); }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life; p.color = color; p.size = size || 2;
    }
    function burst(x, y, color, n) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = rand(0.4, 1.8);
        spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(12, 24), color, Math.random() < 0.3 ? 3 : 2);
      }
    }
    function spawnFloater(x, y, text, color) {
      if (reduce) return;
      var f;
      for (var i = 0; i < floaters.length; i++) { if (floaters[i].life <= 0) { f = floaters[i]; break; } }
      if (!f) { if (floaters.length >= FLOATER_CAP) return; f = {}; floaters.push(f); }
      f.x = x; f.y = y; f.life = 38; f.maxLife = 38; f.text = text; f.color = color;
    }

    // ---------- Gameplay ----------
    function start() {
      ensureAudio();
      resetWorld();
      state = "running";
      hidePrompt();
    }

    function fire() {
      ensureAudio();
      if (state === "idle" || state === "gameover") { start(); return; }
      if (state !== "running" || fireCooldown > 0) return;
      var spread = bloomTimer > 0 ? [-0.17, 0, 0.17] : [0];
      spread.forEach(function (off) {
        var a = ship.a + off;
        shots.push({
          x: ship.x + Math.cos(a) * 10,
          y: ship.y + Math.sin(a) * 10,
          vx: ship.vx * 0.45 + Math.cos(a) * 4.2,
          vy: ship.vy * 0.45 + Math.sin(a) * 4.2,
          life: 52
        });
      });
      fireCooldown = bloomTimer > 0 ? 8 : 13;
      sfx.fire();
    }

    function blink() {
      if (state !== "running" || blinkCooldown > 0) return;
      ensureAudio();
      burst(ship.x, ship.y, LEAF_SIDE, 10);
      var tries = 0, ok = false;
      while (!ok && tries < 30) {
        ship.x = rand(32, W - 32);
        ship.y = rand(32, H - 32);
        ok = true;
        for (var i = 0; i < rocks.length; i++) {
          if (dist2(ship, rocks[i]) < Math.pow(rocks[i].r + 40, 2)) { ok = false; break; }
        }
        tries++;
      }
      ship.vx *= 0.4; ship.vy *= 0.4; ship.inv = 80; ship.blink = 18;
      blinkCooldown = 420;
      sfx.blink();
    }

    function hitRock(index, shotIndex) {
      var rock = rocks[index];
      var shot = shotIndex >= 0 ? shots[shotIndex] : null;
      if (shot) shots.splice(shotIndex, 1);
      var mult = combo.hit();
      var base = rock.size === 4 ? 45 : rock.size === 3 ? 70 : rock.size === 2 ? 110 : 180;
      score += base * mult;
      burst(rock.x, rock.y, rock.size <= 1 ? LEAF_TOP : WARM, rock.size <= 1 ? 6 : 10);
      if (mult > 1) spawnFloater(rock.x - 6, rock.y - 8, "x" + mult, mult >= 4 ? BRAIN : LEAF_TOP);
      sfx.rock(mult);
      // Trauma scales with rock size; a tiny hit-stop adds crunch (bigger for big rocks).
      camera.shake(rock.size >= 4 ? 0.32 : rock.size === 3 ? 0.22 : rock.size === 2 ? 0.13 : 0.08);
      camera.freeze(reduce ? 0 : (rock.size >= 3 ? 3 : 1));
      if (rock.size > 1) {
        var kids = rock.size === 4 ? 3 : 2;
        for (var k = 0; k < kids; k++) {
          var a = Math.random() * Math.PI * 2;
          var sp = rand(0.55, 1.35) + wave * 0.035;
          rocks.push({
            x: rock.x + Math.cos(a) * 4,
            y: rock.y + Math.sin(a) * 4,
            vx: Math.cos(a) * sp + rock.vx * 0.35,
            vy: Math.sin(a) * sp + rock.vy * 0.35,
            r: rock.size - 1 === 2 ? 15 : 9,
            size: rock.size - 1,
            a: rand(0, Math.PI * 2),
            spin: rand(-0.04, 0.04),
            verts: rock.verts.slice().reverse(),
            label: LABELS[Math.floor(Math.random() * LABELS.length)]
          });
        }
      }
      if (Math.random() < 0.13 + (rock.size === 1 ? 0.08 : 0)) {
        pickups.push({ x: rock.x, y: rock.y, vx: rand(-0.45, 0.45), vy: rand(-0.45, 0.45), type: Math.random() < 0.78 ? "seed" : "shield", life: 560 });
      }
      rocks.splice(index, 1);
      updateHud();
    }

    function shipHit(rockIndex) {
      var rock = rocks[rockIndex];
      if (ship.inv > 0 || bloomTimer > 0) {
        hitRock(rockIndex, -1);
        return;
      }
      if (shield) {
        shield = false;
        ship.inv = 120;
        seedMeter = Math.max(0, seedMeter - 1);
        burst(ship.x, ship.y, LEAF_SIDE, 18);
        spawnFloater(ship.x - 16, ship.y - 14, "shield", LEAF_SIDE);
        hitRock(rockIndex, -1);
        camera.shake(0.3); camera.freeze(reduce ? 0 : 2);
        sfx.shield();
        updateHud();
        return;
      }
      lives--;
      flashTimer = 16;
      combo.reset();
      camera.shake(0.85);
      camera.freeze(reduce ? 0 : 8);
      burst(ship.x, ship.y, BRAIN, 18);
      sfx.hit();
      if (lives <= 0) {
        state = "gameover";
        showEnd(Math.floor(score));
      } else {
        resetShip();
      }
      updateHud();
    }

    function collectPickup(i) {
      var p = pickups[i];
      if (p.type === "shield") {
        shield = true;
        spawnFloater(p.x - 16, p.y - 10, "shield", LEAF_SIDE);
        sfx.shield();
      } else {
        seedMeter++;
        score += 25;
        spawnFloater(p.x - 8, p.y - 10, "+seed", LEAF_TOP);
        sfx.seed();
        if (seedMeter >= 5) {
          seedMeter = 0;
          bloomTimer = BLOOM_MAX;
          shield = true;
          burst(ship.x, ship.y, LEAF_TOP, 26);
          spawnFloater(ship.x - 22, ship.y - 18, "bloom", LEAF_TOP);
          camera.shake(0.5);
          camera.freeze(reduce ? 0 : 4);
          sfx.bloom();
          sfx.bloomPad();
        }
      }
      pickups.splice(i, 1);
      updateHud();
    }

    function tick(dt) {
      if (held.fire) fire();
      if (held.blink) { blink(); held.blink = false; }

      if (state === "waveclear") {
        nextWaveTimer -= dt;
        if (nextWaveTimer <= 0) { wave++; buildWave(); state = "running"; }
      }
      if (state !== "running") return;

      if (mouseTarget) {
        var mx = mouseTarget.x - ship.x;
        var my = mouseTarget.y - ship.y;
        var desired = Math.atan2(my, mx);
        var turn = Math.atan2(Math.sin(desired - ship.a), Math.cos(desired - ship.a));
        ship.a += clamp(turn, -0.11 * dt, 0.11 * dt);
      }
      if (!mouseTarget && held.left) ship.a -= 0.075 * dt;
      if (!mouseTarget && held.right) ship.a += 0.075 * dt;
      if (held.thrust) {
        ship.vx += Math.cos(ship.a) * 0.085 * dt;
        ship.vy += Math.sin(ship.a) * 0.085 * dt;
        if (!reduce && Math.random() < 0.65) {
          spawnParticle(ship.x - Math.cos(ship.a) * 9, ship.y - Math.sin(ship.a) * 9, -Math.cos(ship.a) * rand(0.7, 1.5), -Math.sin(ship.a) * rand(0.7, 1.5), 10, BRAIN, 2);
        }
        if (Math.random() < 0.04) sfx.thrust();
      }
      ship.vx *= Math.pow(0.992, dt);
      ship.vy *= Math.pow(0.992, dt);
      var sp = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (sp > 3.1) { ship.vx = ship.vx / sp * 3.1; ship.vy = ship.vy / sp * 3.1; }
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship, 10);

      if (fireCooldown > 0) fireCooldown -= dt;
      if (blinkCooldown > 0) blinkCooldown -= dt;
      if (ship.inv > 0) ship.inv -= dt;
      if (ship.blink > 0) ship.blink -= dt;
      if (bloomTimer > 0) bloomTimer -= dt;
      if (flashTimer > 0) flashTimer -= dt;
      combo.tick(dt);

      for (var s = shots.length - 1; s >= 0; s--) {
        var shot = shots[s];
        shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
        wrap(shot, 2);
        if (shot.life <= 0) { shots.splice(s, 1); continue; }
        for (var r = rocks.length - 1; r >= 0; r--) {
          if (dist2(shot, rocks[r]) < rocks[r].r * rocks[r].r) {
            hitRock(r, s);
            break;
          }
        }
      }

      for (var i = rocks.length - 1; i >= 0; i--) {
        var rock = rocks[i];
        rock.x += rock.vx * dt; rock.y += rock.vy * dt; rock.a += rock.spin * dt;
        wrap(rock, rock.r + 4);
        if (dist2(ship, rock) < Math.pow(rock.r + 7, 2)) shipHit(i);
      }

      for (var p = pickups.length - 1; p >= 0; p--) {
        var pick = pickups[p];
        var dxp = shortestDelta(pick.x, ship.x, W);
        var dyp = shortestDelta(pick.y, ship.y, H);
        var d2p = dxp * dxp + dyp * dyp;
        var magnetRange = bloomTimer > 0 ? 170 : mouseTarget ? 118 : 86;
        if (d2p < magnetRange * magnetRange) {
          var d = Math.max(8, Math.sqrt(d2p));
          var pull = bloomTimer > 0 ? 0.12 : mouseTarget ? 0.07 : 0.055;
          pick.vx += (dxp / d) * pull * dt;
          pick.vy += (dyp / d) * pull * dt;
          var psp = Math.sqrt(pick.vx * pick.vx + pick.vy * pick.vy);
          var pmax = bloomTimer > 0 ? 3.1 : mouseTarget ? 2.25 : 1.9;
          if (psp > pmax) {
            pick.vx = pick.vx / psp * pmax;
            pick.vy = pick.vy / psp * pmax;
          }
        }
        pick.x += pick.vx * dt; pick.y += pick.vy * dt; pick.life -= dt;
        wrap(pick, 5);
        if (pick.life <= 0) { pickups.splice(p, 1); continue; }
        if (dist2(ship, pick) < 18 * 18) collectPickup(p);
      }

      for (var pp = 0; pp < particles.length; pp++) {
        if (particles[pp].life > 0) {
          particles[pp].x += particles[pp].vx * dt;
          particles[pp].y += particles[pp].vy * dt;
          particles[pp].life -= dt;
        }
      }
      for (var ff = 0; ff < floaters.length; ff++) {
        if (floaters[ff].life > 0) { floaters[ff].y -= 0.22 * dt; floaters[ff].life -= dt; }
      }

      if (!rocks.length && state === "running") {
        score += 200 + wave * 40 + lives * 25;
        state = "waveclear";
        nextWaveTimer = 90;
        spawnFloater(W / 2 - 30, H / 2 - 12, "clear +" + (200 + wave * 40), LEAF_TOP);
        updateHud();
      }
    }

    // ---------- Drawing ----------
    function drawShip() {
      ctx.save();
      ctx.translate(Math.round(ship.x), Math.round(ship.y));
      ctx.rotate(ship.a);
      if (ship.inv > 0 && Math.floor(ship.inv / 8) % 2 === 0) ctx.globalAlpha = 0.55;
      if (ship.blink > 0) ctx.globalAlpha = 0.3;
      if (bloomTimer > 0 || shield) {
        ctx.strokeStyle = bloomTimer > 0 ? LEAF_TOP : LEAF_SIDE;
        ctx.globalAlpha = bloomTimer > 0 ? 0.72 : 0.46;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, bloomTimer > 0 ? 15 : 12, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (held.thrust && state === "running") {
        blockyRect(ctx, -13, -2, 5, 4, BRAIN);
        ctx.fillStyle = WARM;
        ctx.fillRect(-17, -1, 4, 2);
      }
      blockyRect(ctx, -5, -6, 12, 12, BRAIN);
      ctx.fillStyle = INK; ctx.fillRect(0, -5, 1, 10);
      blockyRect(ctx, 4, -3, 8, 6, LEAF_SIDE);
      blockyRect(ctx, 7, -1, 4, 2, LEAF_TOP);
      blockyRect(ctx, -7, -8, 5, 4, LEAF_TOP);
      blockyRect(ctx, -7, 4, 5, 4, LEAF_SIDE);
      ctx.restore();
    }

    function drawRock(r) {
      ctx.save();
      ctx.translate(Math.round(r.x), Math.round(r.y));
      ctx.rotate(r.a);
      ctx.beginPath();
      for (var i = 0; i < r.verts.length; i++) {
        var a = i / r.verts.length * Math.PI * 2;
        var rr = r.r * r.verts[i];
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = r.size >= 3 ? WARM : "#C9D8C9";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fill();
      ctx.fillStyle = "rgba(14,42,45,0.2)";
      ctx.fillRect(-r.r * 0.25, -r.r * 0.15, Math.max(2, r.r * 0.22), Math.max(2, r.r * 0.18));
      if (r.size >= 2) {
        ctx.rotate(-r.a);
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.78;
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(r.label, 0, 2);
      }
      ctx.restore();
    }

    function render() {
      ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var sh = camera.offset();
      ctx.translate(sh.x, sh.y);
      ctx.fillStyle = bloomTimer > 0 ? "#EAF2EA" : CREAM;
      ctx.fillRect(-6, -6, W + 12, H + 12);

      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = reduce ? 0.8 : 0.45 + Math.sin((performance.now() / 360) + st.tw) * 0.25;
        ctx.globalAlpha = a * st.z;
        ctx.fillStyle = st.z > 0.7 ? LEAF_SIDE : SAGE;
        ctx.fillRect(Math.round(st.x), Math.round(st.y), st.z > 0.7 ? 2 : 1, st.z > 0.7 ? 2 : 1);
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(81,121,101,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 74, 0, Math.PI * 2);
      ctx.arc(W / 2, H / 2, 112, 0, Math.PI * 2);
      ctx.stroke();

      for (var r = 0; r < rocks.length; r++) drawRock(rocks[r]);
      for (var p = 0; p < pickups.length; p++) drawPickup(pickups[p]);
      var bloomOn = bloomTimer > 0;
      for (var s = 0; s < shots.length; s++) {
        var shx = Math.round(shots[s].x), shy = Math.round(shots[s].y);
        if (!reduce) A.pixelGlow(ctx, shx, shy, bloomOn ? 5 : 3, bloomOn ? LEAF_TOP : LEAF_SIDE, bloomOn ? 0.2 : 0.14);
        ctx.fillStyle = bloomOn ? LEAF_TOP : LEAF_SIDE;
        ctx.fillRect(shx - 1, shy - 1, 3, 3);
      }
      for (var pp = 0; pp < particles.length; pp++) {
        var part = particles[pp];
        if (part.life <= 0) continue;
        ctx.globalAlpha = clamp(part.life / part.maxLife, 0, 1);
        ctx.fillStyle = part.color;
        ctx.fillRect(Math.round(part.x), Math.round(part.y), part.size, part.size);
      }
      ctx.globalAlpha = 1;
      // Ship aura — a soft halo that visibly intensifies while Bloom Drive charges.
      if (!reduce && state === "running") {
        A.pixelGlow(ctx, Math.round(ship.x), Math.round(ship.y),
          bloomOn ? 15 : 8, bloomOn ? LEAF_TOP : BRAIN, bloomOn ? 0.22 : 0.1);
      }
      drawShip();
      drawMeters();
      // Flow combo readout (top-left) with a thin draining "window" bar.
      var cm = combo.mult();
      if (cm > 1) {
        var cc = cm >= 4 ? BRAIN : LEAF_SIDE;
        ctx.globalAlpha = 1;
        ctx.fillStyle = cc;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("FLOW x" + cm, 8, 14);
        ctx.fillStyle = "rgba(64,192,153,0.5)";
        ctx.fillRect(8, 17, Math.round(40 * combo.frac()), 2);
      }
      for (var f = 0; f < floaters.length; f++) {
        var fl = floaters[f];
        if (fl.life <= 0) continue;
        ctx.globalAlpha = clamp(fl.life / fl.maxLife, 0, 1);
        ctx.fillStyle = fl.color;
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(fl.text, Math.round(fl.x), Math.round(fl.y));
      }
      ctx.globalAlpha = 1;
      if (flashTimer > 0) {
        ctx.globalAlpha = flashTimer / 18;
        ctx.fillStyle = BRAIN;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    function drawPickup(p) {
      var x = Math.round(p.x), y = Math.round(p.y);
      var dxp = shortestDelta(p.x, ship.x, W);
      var dyp = shortestDelta(p.y, ship.y, H);
      var d2p = dxp * dxp + dyp * dyp;
      if (d2p < 118 * 118) {
        ctx.save();
        ctx.globalAlpha = clamp(1 - Math.sqrt(d2p) / 118, 0.16, 0.58);
        ctx.strokeStyle = p.type === "shield" ? LEAF_SIDE : LEAF_TOP;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(Math.round(p.x + dxp * 0.55), Math.round(p.y + dyp * 0.55));
        ctx.stroke();
        ctx.restore();
      }
      if (p.type === "shield") {
        ctx.strokeStyle = LEAF_SIDE;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = LEAF_SIDE; ctx.fillRect(x - 1, y - 4, 2, 8);
      } else {
        if (!reduce) A.pixelGlow(ctx, x, y, bloomTimer > 0 ? 6 : 4, LEAF_TOP, bloomTimer > 0 ? 0.2 : 0.14);
        blockyRect(ctx, x - 3, y - 3, 6, 6, LEAF_TOP);
        ctx.fillStyle = LEAF_SIDE; ctx.fillRect(x + 2, y - 5, 4, 3);
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.62;
        ctx.font = "7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("seed", x, y + 13);
        ctx.globalAlpha = 1;
      }
    }

    function drawMeters() {
      var bloomOn = bloomTimer > 0;
      // Warn in the last ~60 frames: the bar + label flash so the window's end is legible.
      var warn = bloomOn && bloomTimer <= 60;
      var flashOn = warn && Math.floor(bloomTimer / 6) % 2 === 0;
      ctx.fillStyle = "rgba(14,42,45,0.22)";
      ctx.fillRect(8, H - 11, 54, 4);
      // Bloom now DRAINS with its real timer instead of sitting full.
      var frac = bloomOn ? clamp(bloomTimer / BLOOM_MAX, 0, 1) : seedMeter / 5;
      ctx.fillStyle = flashOn ? BRAIN : (bloomOn ? LEAF_TOP : LEAF_SIDE);
      ctx.fillRect(8, H - 11, Math.round(54 * frac), 4);
      ctx.fillStyle = flashOn ? BRAIN : INK;
      ctx.globalAlpha = warn ? 0.9 : 0.6;
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(bloomOn ? (warn ? "BLOOM!" : "BLOOM") : "SEEDS", 8, H - 14);
      if (blinkCooldown <= 0) ctx.fillText("BLINK READY", W - 62, H - 14);
      ctx.globalAlpha = 1;
    }

    // ---------- HUD / prompt ----------
    function updateHud() {
      if (els.score) els.score.textContent = String(Math.floor(score)).padStart(6, "0");
      if (els.best) els.best.textContent = String(A.leaderboard.best(GAME_KEY)).padStart(6, "0");
      if (els.wave) els.wave.textContent = String(wave || 1);
      if (els.lives) els.lives.textContent = String(lives || 3);
    }
    function hidePrompt() { if (els.prompt) els.prompt.hidden = true; }
    function showIdle() {
      els.promptTitle.textContent = "Synapse Drift";
      els.promptText.textContent = "Drift, aim, and clear the noise rocks. Fly through seeds to charge Bloom Drive.";
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
      els.promptTitle.textContent = "Drift complete";
      els.promptText.textContent = "Score " + String(finalScore).padStart(6, "0") +
        (combo.best() > 1 ? " · best flow chain " + combo.best() : "");
      els.promptActions.textContent = "";
      if (A.leaderboard.qualifies(GAME_KEY, finalScore)) {
        A.mountInitialsEntry(els.promptActions, {
          gameKey: GAME_KEY, score: finalScore,
          onDone: function (rank) {
            updateHud();
            els.promptActions.textContent = "";
            A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores", highlightRank: rank });
            addPlayAgain();
            try { canvas.focus(); } catch (e) {}
          }
        });
        addSkip();
      } else {
        A.renderLeaderboard(els.promptActions, GAME_KEY, { title: "Local top scores" });
        addPlayAgain();
      }
      els.prompt.hidden = false;
    }
    function addPlayAgain() {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--primary"; btn.textContent = "Play again";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }
    function addSkip() {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--ghost"; btn.textContent = "Skip and play";
      btn.addEventListener("click", function () { start(); try { canvas.focus(); } catch (e) {} });
      els.promptActions.appendChild(btn);
    }

    // ---------- Loop ----------
    var rafId = null, lastTime = 0;
    function loop(now) {
      if (!lastTime) lastTime = now;
      var dt = Math.min(2.4, (now - lastTime) / (1000 / 60));
      lastTime = now;
      camera.tick(dt);
      if (!camera.frozen()) tick(dt);
      render();
      updateHud();
      rafId = window.requestAnimationFrame(loop);
    }

    return {
      held: held,
      fire: fire,
      blink: blink,
      followMouse: function (x, y) { if (state === "running") mouseTarget = { x: x, y: y }; },
      clearMouse: function () { mouseTarget = null; },
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
      toggleMute: function () { return audio.toggleMute(); },
      isMuted: function () { return audio.isMuted(); },
      activate: function () { resetWorld(); state = "idle"; lastTime = 0; updateHud(); showIdle(); rafId = window.requestAnimationFrame(loop); },
      deactivate: function () { if (rafId) window.cancelAnimationFrame(rafId); rafId = null; audio.close(); }
    };
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "gms-arcade-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Synapse Drift - a hidden mini game");
    overlay.innerHTML =
      '<div class="gms-arcade-backdrop" data-egg-close></div>' +
      '<div class="gms-arcade-panel">' +
        '<div class="gms-arcade-panel__head">' +
          '<p class="gms-arcade-title">Synapse Drift <span>- you found it!</span></p>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button type="button" class="gms-arcade-close" data-egg-mute aria-label="Toggle sound">♪</button>' +
            '<button type="button" class="gms-arcade-close" data-egg-close aria-label="Close game">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="gms-arcade-scores">' +
          '<span>SCORE <strong data-egg-score>000000</strong></span>' +
          '<span>WAVE <strong data-egg-wave>1</strong></span>' +
          '<span>LIVES <strong data-egg-lives>3</strong></span>' +
          '<span>BEST <strong data-egg-best>000000</strong></span>' +
        '</div>' +
        '<div class="gms-arcade-stage gms-arcade-stage--asteroids">' +
          '<canvas class="gms-arcade-canvas" tabindex="0"></canvas>' +
          '<div class="gms-arcade-prompt" data-egg-prompt hidden>' +
            '<p class="gms-arcade-prompt__title" data-egg-prompt-title></p>' +
            '<p class="gms-arcade-prompt__text" data-egg-prompt-text></p>' +
            '<div class="gms-arcade-prompt__actions" data-egg-prompt-actions></div>' +
          '</div>' +
        '</div>' +
        '<p class="gms-arcade-help">Mouse aims · click/Space fires · Up/W thrusts · fly through seeds · Shift blink</p>' +
        '<div class="gms-arcade-touchrow">' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-left aria-label="Rotate left">LEFT</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-thrust aria-label="Thrust">GO</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-fire aria-label="Fire">FIRE</button>' +
          '<button type="button" class="gms-arcade-touchbtn" data-egg-right aria-label="Rotate right">RIGHT</button>' +
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
      best: overlay.querySelector("[data-egg-best]"),
      wave: overlay.querySelector("[data-egg-wave]"),
      lives: overlay.querySelector("[data-egg-lives]"),
      prompt: overlay.querySelector("[data-egg-prompt]"),
      promptTitle: overlay.querySelector("[data-egg-prompt-title]"),
      promptText: overlay.querySelector("[data-egg-prompt-text]"),
      promptActions: overlay.querySelector("[data-egg-prompt-actions]")
    });

    overlay.querySelectorAll("[data-egg-close]").forEach(function (el) {
      el.addEventListener("click", function () { closeOverlay(overlay); });
    });

    var muteBtn = overlay.querySelector("[data-egg-mute]");
    function syncMute() {
      muteBtn.textContent = game.isMuted() ? "x" : "♪";
      muteBtn.setAttribute("aria-pressed", game.isMuted() ? "true" : "false");
    }
    muteBtn.addEventListener("click", function () { game.toggleMute(); syncMute(); });
    syncMute();

    function aimAt(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var lx = (clientX - rect.left) / rect.width * W;
      var ly = (clientY - rect.top) / rect.height * H;
      game.followMouse(lx, ly);
    }
    var suppressMouse = 0;
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      if (e.touches && e.touches.length) aimAt(e.touches[0].clientX, e.touches[0].clientY);
      game.held.fire = true;
      game.fire();
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      suppressMouse = Date.now() + 500;
      if (e.touches && e.touches.length) aimAt(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener("touchend", function () { game.held.fire = false; }, { passive: false });
    canvas.addEventListener("touchcancel", function () { game.held.fire = false; }, { passive: false });
    canvas.addEventListener("mousedown", function (e) {
      if (Date.now() < suppressMouse) return;
      e.preventDefault();
      aimAt(e.clientX, e.clientY);
      game.held.fire = true;
      game.fire();
    });
    window.addEventListener("mouseup", function () { game.held.fire = false; });
    canvas.addEventListener("mousemove", function (e) {
      aimAt(e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseleave", function () { game.clearMouse(); });

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
    holdBtn("[data-egg-thrust]", "thrust");
    var fireBtn = overlay.querySelector("[data-egg-fire]");
    var fdown = function (e) { e.preventDefault(); game.held.fire = true; game.fire(); };
    var fup = function (e) { e.preventDefault(); game.held.fire = false; };
    fireBtn.addEventListener("touchstart", fdown, { passive: false });
    fireBtn.addEventListener("touchend", fup, { passive: false });
    fireBtn.addEventListener("touchcancel", fup, { passive: false });
    fireBtn.addEventListener("mousedown", fdown);
    fireBtn.addEventListener("mouseup", fup);
    fireBtn.addEventListener("mouseleave", fup);

    function onKeydown(e) {
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { closeOverlay(overlay); return; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); game.held.left = true; }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); game.held.right = true; }
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); game.held.thrust = true; }
      else if (e.code === "Space" || e.key === " ") { e.preventDefault(); game.held.fire = true; if (!e.repeat) game.fire(); }
      else if (e.key === "Shift" || e.key === "h" || e.key === "H") { e.preventDefault(); game.blink(); }
      else if (e.key === "m" || e.key === "M") { game.toggleMute(); syncMute(); }
    }
    function onKeyup(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.held.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.held.right = false;
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") game.held.thrust = false;
      else if (e.code === "Space" || e.key === " ") game.held.fire = false;
    }

    overlay.game = game;
    overlay._onKeydown = onKeydown;
    overlay._onKeyup = onKeyup;
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
    document.addEventListener("keyup", overlay._onKeyup);
    window.addEventListener("resize", overlay._fitCanvas);
    overlay.game.activate();
    window.requestAnimationFrame(function () { overlay._canvas.focus(); });
  }

  function buildTrigger() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gms-arcade-asteroid-trigger";
    btn.setAttribute("aria-label", "Hidden game");
    btn.title = ".";
    btn.innerHTML =
      '<svg viewBox="0 0 34 34" aria-hidden="true" shape-rendering="crispEdges">' +
      '<circle cx="17" cy="17" r="11" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".45"/>' +
      '<g fill="currentColor">' +
      '<rect x="15" y="4" width="4" height="4"/>' +
      '<rect x="23" y="21" width="3" height="3"/>' +
      '<rect x="8" y="20" width="2" height="2"/>' +
      '<rect x="15" y="15" width="4" height="4"/>' +
      '<rect x="18" y="13" width="2" height="2"/>' +
      '<rect x="12" y="17" width="2" height="2"/>' +
      '</g></svg>';
    return btn;
  }

  ready(function () {
    var anchor = document.querySelector(".about-preview__media--portrait") ||
      document.querySelector(".about-preview__media") ||
      document.querySelector(".page-hero .container");
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
