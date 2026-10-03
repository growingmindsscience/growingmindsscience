/* Shared Pong game for Tools and Arcade. */
(function () {
    var orb = document.getElementById('pong-orb') || document.querySelector('[data-arcade-game="pong"]');
    var game = document.getElementById('pong-game');
    if (!orb || !game) return;

    var canvas = document.getElementById('pong-canvas');
    var ctx = canvas.getContext('2d');
    var scoreYouEl = document.getElementById('pong-score-you');
    var scoreCpuEl = document.getElementById('pong-score-cpu');
    var msg = document.getElementById('pong-msg');
    var msgTitle = document.getElementById('pong-msg-title');
    var msgText = document.getElementById('pong-msg-text');
    var msgBtn = document.getElementById('pong-msg-btn');
    var exitBtn = document.getElementById('pong-exit');
    var hint = document.querySelector('.pong-foot .pong-hint');
    var muteBtn = document.getElementById('pong-mute');

    // ---- Calm synth soundtrack (Web Audio, no files) ----
    var audioCtx = null, masterGain = null, musicTimer = null;
    // Storage can throw (blocked site data / private modes); never let that
    // stop the rest of the game from wiring up.
    var musicOn = true;
    try { musicOn = (window.localStorage.getItem('gms_pong_mute') !== '1'); } catch (e) {}
    var nextNoteTime = 0, stepIndex = 0;
    var STEP_DUR = 0.42; // seconds per arpeggio note — slow and calm
    var PENTA = [0, 3, 5, 7, 10, 12]; // A minor pentatonic (+octave)
    var ARP = [0, 2, 1, 3, 2, 4, 3, 1]; // gentle wander through the scale

    function aFreq(semi) { return 220 * Math.pow(2, semi / 12); } // base A3
    function ensureAudio() {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
        masterGain = audioCtx.createGain();
        var lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1500;
        masterGain.connect(lp); lp.connect(audioCtx.destination);
        masterGain.gain.value = musicOn ? 0.14 : 0.0001;
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }
    function tone(freq, t, dur, type, vol) {
      var o = audioCtx.createOscillator();
      o.type = type; o.frequency.value = freq;
      var g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function playStep(i, t) {
      var note = PENTA[ARP[i % ARP.length]] + 12; // arp an octave up, soft
      tone(aFreq(note), t, 0.6, 'triangle', 0.10);
      if (i % 8 === 4) tone(aFreq(note + 7), t, 0.5, 'sine', 0.05); // soft harmony
      if (i % 4 === 0) { // slow bass drone, alternating A2 / E2 (a calm fifth)
        var root = (Math.floor(i / 4) % 2 === 0) ? -12 : -17;
        tone(aFreq(root), t, 1.4, 'sine', 0.16);
      }
    }
    function musicScheduler() {
      while (nextNoteTime < audioCtx.currentTime + 0.12) {
        playStep(stepIndex, nextNoteTime);
        nextNoteTime += STEP_DUR;
        stepIndex = (stepIndex + 1) % 64;
      }
      musicTimer = setTimeout(musicScheduler, 25);
    }
    function startMusic() {
      ensureAudio();
      if (!audioCtx || musicTimer) return;
      nextNoteTime = audioCtx.currentTime + 0.1;
      musicScheduler();
    }
    function applyMute() {
      if (muteBtn) {
        muteBtn.textContent = musicOn ? '♪ Music: on' : '♪ Music: off';
        muteBtn.setAttribute('aria-pressed', musicOn ? 'false' : 'true');
      }
      if (masterGain) {
        var now = audioCtx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
        masterGain.gain.exponentialRampToValueAtTime(musicOn ? 0.14 : 0.0001, now + 0.25);
      }
    }
    if (muteBtn) muteBtn.addEventListener('click', function () {
      musicOn = !musicOn;
      try { window.localStorage.setItem('gms_pong_mute', musicOn ? '0' : '1'); } catch (e) {}
      ensureAudio();
      applyMute();
      if (musicOn) startMusic();
    });
    applyMute();

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Tear the page off, then open the game ----
    orb.addEventListener('click', function () {
      orb.style.display = 'none';
      var main = document.getElementById('main');
      var pieces = [];
      var header = document.querySelector('.site-header');
      if (header) pieces.push(header);
      if (main) [].forEach.call(main.children, function (c) { pieces.push(c); });
      var footer = document.querySelector('.site-footer');
      if (footer) pieces.push(footer);

      if (reduce) {
        pieces.forEach(function (p) { p.style.visibility = 'hidden'; });
        openGame();
        return;
      }

      var maxDelay = 0;
      pieces.forEach(function (p, i) {
        var delay = i * 70;
        maxDelay = Math.max(maxDelay, delay);
        var dx = (Math.random() * 220 - 110);
        var rot = (Math.random() * 60 - 30);
        p.classList.add('pong-piece');
        p.style.transition = 'transform .95s cubic-bezier(.55,.06,.68,.19) ' + delay + 'ms, opacity .95s ease-in ' + delay + 'ms';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            p.style.transform = 'translate(' + dx.toFixed(0) + 'px, 125vh) rotate(' + rot.toFixed(0) + 'deg)';
            p.style.opacity = '0';
          });
        });
      });
      setTimeout(openGame, maxDelay + 1050);
    });

    // ---- Game state ----
    var W = 0, H = 0, dpr = 1;
    var PW = 13, PH = 86;
    var leftX, rightX, leftY, rightY;
    var ball, speedBase = 5.4, speedMax = 11.5;
    var scoreYou = 0, scoreCpu = 0, WIN = 7;
    var running = false, rafId = null, serveAt = 0;
    var keyUp = false, keyDown = false, pointerActive = false;

    function fit() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = rect.width; H = rect.height;
      // Scale the pieces to the court so phones (and short landscape
      // viewports) keep the classic proportions instead of a giant paddle.
      PH = Math.round(Math.max(52, Math.min(96, H * 0.22)));
      PW = Math.round(Math.max(9, Math.min(13, W * 0.02)));
      speedBase = Math.max(4.0, Math.min(6.0, W / 140));
      speedMax = speedBase * 2.15;
      var inset = Math.round(Math.max(14, Math.min(26, W * 0.03)));
      leftX = inset; rightX = W - inset - PW;
      if (leftY == null) leftY = H / 2 - PH / 2;
      if (rightY == null) rightY = H / 2 - PH / 2;
      clampPaddles();
    }
    function clampPaddles() {
      leftY = Math.max(0, Math.min(H - PH, leftY));
      rightY = Math.max(0, Math.min(H - PH, rightY));
    }
    function resetBall(dir) {
      var r = Math.round(Math.max(6, Math.min(9, W / 90)));
      ball = { x: W / 2, y: H / 2, r: r, vx: 0, vy: 0, speed: speedBase };
      var ang = (Math.random() * 0.5 - 0.25) * Math.PI; // -45deg..45deg
      ball.vx = dir * ball.speed * Math.cos(ang);
      ball.vy = ball.speed * Math.sin(ang);
      serveAt = performance.now() + 700; // brief pause before it flies
    }
    function bounce(paddleCenterY, dir) {
      var rel = Math.max(-1, Math.min(1, (ball.y - paddleCenterY) / (PH / 2)));
      var ang = rel * (Math.PI * 0.28);
      ball.speed = Math.min(ball.speed * 1.06, speedMax);
      ball.vx = dir * ball.speed * Math.cos(ang);
      ball.vy = ball.speed * Math.sin(ang);
    }

    function update(now, dt) {
      // dt is normalized to 60fps frames so 120Hz+ displays play at the
      // same speed instead of double-time.
      // player paddle (keyboard); pointer sets rightY directly via handler
      if (!pointerActive) {
        var pv = 7.5 * dt;
        if (keyUp) rightY -= pv;
        if (keyDown) rightY += pv;
      }
      clampPaddles();

      // CPU paddle — capped speed and recenters when the ball moves away,
      // which leaves the player real openings (classic beatable Pong AI).
      var cpuCenter = leftY + PH / 2;
      var cpuTarget = (ball && ball.vx < 0) ? ball.y : H / 2;
      var cpuDiff = cpuTarget - cpuCenter;
      var cpuMax = 4.0 * dt;
      leftY += Math.max(-cpuMax, Math.min(cpuMax, cpuDiff * 0.08 * dt));
      clampPaddles();

      if (!ball) return;
      if (now < serveAt) return; // serve pause

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
      if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy *= -1; }

      // left (CPU) paddle
      if (ball.vx < 0 && ball.x - ball.r <= leftX + PW && ball.x - ball.r >= leftX - 6 &&
          ball.y >= leftY - 4 && ball.y <= leftY + PH + 4) {
        ball.x = leftX + PW + ball.r;
        bounce(leftY + PH / 2, 1);
      }
      // right (player) paddle
      if (ball.vx > 0 && ball.x + ball.r >= rightX && ball.x + ball.r <= rightX + PW + 6 &&
          ball.y >= rightY - 4 && ball.y <= rightY + PH + 4) {
        ball.x = rightX - ball.r;
        bounce(rightY + PH / 2, -1);
      }

      // scoring
      if (ball.x < -30) { scoreYou++; afterPoint(-1); }
      else if (ball.x > W + 30) { scoreCpu++; afterPoint(1); }
    }

    function afterPoint(dir) {
      scoreYouEl.textContent = scoreYou;
      scoreCpuEl.textContent = scoreCpu;
      if (scoreYou >= WIN || scoreCpu >= WIN) {
        running = false;
        ball = null;
        showMsg(scoreYou > scoreCpu ? 'You win 🏓' : 'CPU wins',
                scoreYou > scoreCpu ? 'Nicely done. Rematch?' : 'So close. Try again?',
                'Play again');
        return;
      }
      resetBall(dir);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // center dashed line
      ctx.strokeStyle = 'rgba(159,179,166,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 14]);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);
      // paddles
      ctx.fillStyle = '#cdd8d0'; // CPU
      rr(leftX, leftY, PW, PH, 5);
      ctx.fillStyle = '#6f8f7b'; // player (brand)
      rr(rightX, rightY, PW, PH, 5);
      // ball
      if (ball) {
        ctx.fillStyle = '#eef3ef';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath(); ctx.fill();
    }

    var lastFrame = 0;
    function loop(now) {
      if (!running) return;
      if (!lastFrame) lastFrame = now;
      var dt = Math.min(2.5, (now - lastFrame) / (1000 / 60));
      lastFrame = now;
      update(now, dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function showMsg(title, text, btn) {
      msgTitle.textContent = title;
      msgText.textContent = text;
      msgBtn.textContent = btn;
      msg.hidden = false;
    }
    function startMatch() {
      msg.hidden = true;
      if (hint) hint.style.visibility = 'hidden';
      if (musicOn) startMusic();
      scoreYou = 0; scoreCpu = 0;
      scoreYouEl.textContent = '0'; scoreCpuEl.textContent = '0';
      fit();
      leftY = H / 2 - PH / 2; rightY = H / 2 - PH / 2;
      resetBall(Math.random() < 0.5 ? -1 : 1);
      running = true;
      lastFrame = 0;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    function openGame() {
      game.hidden = false;
      document.body.style.overflow = 'hidden';
      fit();
      draw();
      showMsg('Ready?', 'You take the right paddle. Mouse, touch, or ↑ ↓ / W S. First to 7.', 'Start');
    }

    // ---- Controls ----
    msgBtn.addEventListener('click', startMatch);
    exitBtn.addEventListener('click', function () { location.reload(); });

    function onPointer(e) {
      var rect = canvas.getBoundingClientRect();
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      pointerActive = true;
      rightY = y - PH / 2;
      clampPaddles();
    }
    canvas.addEventListener('mousemove', onPointer);
    canvas.addEventListener('touchstart', function (e) { onPointer(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { onPointer(e); e.preventDefault(); }, { passive: false });

    window.addEventListener('keydown', function (e) {
      if (game.hidden) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keyUp = true; pointerActive = false; e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { keyDown = true; pointerActive = false; e.preventDefault(); }
      if (e.key === 'Escape') location.reload();
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyUp = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyDown = false;
    });
    window.addEventListener('resize', function () { if (!game.hidden) { fit(); draw(); } });
  })();
