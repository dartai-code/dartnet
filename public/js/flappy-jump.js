/* ==============================
   FLAPPY JUMP – DartNet Mini Game
   Tap/click to flap through pipe gaps.
   ============================== */
var FJ = (function () {
  'use strict';

  var canvas, ctx, W, H, dpr;
  var STATE = 'menu';
  var score, bestScore, submitted;
  var bird, pipes, particles;
  var gravity, flapForce, pipeSpeed;
  var pipeTimer, pipeInterval;
  var animFrame;
  var groundY;

  // Pipe config
  var PIPE_W = 52;
  var GAP = 150;

  // Bird colours
  var BIRD_COLORS = ['#ffd93d', '#ff6b6b', '#6bcb77', '#4d96ff'];
  var birdColor;

  function init() {
    canvas = document.getElementById('fjCanvas');
    ctx = canvas.getContext('2d');
    bestScore = parseInt(localStorage.getItem('fj_best') || '0', 10);
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onTap);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); onTap(); }
    });
    renderIdle();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.min(window.innerWidth - 16, 420);
    H = Math.min(window.innerHeight - 16, 720);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 60;
  }

  function renderIdle() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawGround();
    // Draw a sample bird
    drawBird(W / 2, H / 2, '#ffd93d', 0);
  }

  function start() {
    score = 0; submitted = false;
    gravity = 0.42;
    flapForce = -7.2;
    pipeSpeed = 2.8;
    pipeInterval = 90;
    pipeTimer = 0;
    pipes = [];
    particles = [];
    birdColor = BIRD_COLORS[Math.floor(Math.random() * BIRD_COLORS.length)];

    bird = {
      x: W * 0.28, y: H * 0.45,
      vy: 0, r: 15, rot: 0, flapAnim: 0
    };

    STATE = 'playing';
    document.getElementById('fjHud').style.display = '';
    updateScoreUI();
    hideOverlay('fjMenu');
    hideOverlay('fjGameOver');
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  function loop() {
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    if (STATE !== 'playing') return;

    // Bird physics
    bird.vy += gravity;
    bird.y += bird.vy;
    bird.rot = Math.min(bird.vy * 0.06, 0.5);
    bird.flapAnim *= 0.9;

    // Pipe spawning
    pipeTimer++;
    if (pipeTimer >= pipeInterval) {
      pipeTimer = 0;
      spawnPipe();
      // Speed up slightly
      if (pipeSpeed < 5) pipeSpeed += 0.03;
      if (pipeInterval > 65) pipeInterval -= 0.3;
    }

    // Move pipes
    for (var i = pipes.length - 1; i >= 0; i--) {
      var p = pipes[i];
      p.x -= pipeSpeed;

      // Score when bird passes pipe center
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true;
        score++;
        updateScoreUI();
        spawnScoreParticles();
      }

      // Remove off-screen
      if (p.x + PIPE_W < -10) pipes.splice(i, 1);
    }

    // Collision check
    if (checkCollision()) {
      gameOver();
      return;
    }

    // Ceiling
    if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }

    // Particles
    for (var j = particles.length - 1; j >= 0; j--) {
      var pt = particles[j];
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.06;
      pt.life -= 0.03;
      if (pt.life <= 0) particles.splice(j, 1);
    }
  }

  function spawnPipe() {
    var minY = 80;
    var maxY = groundY - GAP - 80;
    var gapTop = minY + Math.random() * (maxY - minY);
    pipes.push({
      x: W + 10, gapTop: gapTop, gapBot: gapTop + GAP, scored: false
    });
  }

  function checkCollision() {
    // Ground / ceiling
    if (bird.y + bird.r >= groundY) return true;

    // Pipes
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
        if (bird.y - bird.r < p.gapTop || bird.y + bird.r > p.gapBot) {
          return true;
        }
      }
    }
    return false;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    // Pipes
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      drawPipe(p.x, 0, PIPE_W, p.gapTop);           // top pipe
      drawPipe(p.x, p.gapBot, PIPE_W, groundY - p.gapBot); // bottom pipe
    }

    drawGround();

    // Particles
    for (var j = 0; j < particles.length; j++) {
      var pt = particles[j];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bird
    if (STATE === 'playing' || STATE === 'over') {
      drawBird(bird.x, bird.y, birdColor, bird.rot);
    }
  }

  function drawBackground() {
    // Gradient sky
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0f0c29');
    grd.addColorStop(0.5, '#1a1a3e');
    grd.addColorStop(1, '#24243e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Subtle stars
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (var i = 0; i < 40; i++) {
      ctx.fillRect((i * 113.7) % W, (i * 71.3) % (groundY - 20), 1.5, 1.5);
    }
  }

  function drawGround() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
  }

  function drawPipe(x, y, w, h) {
    if (h <= 0) return;
    var grd = ctx.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, '#2d4a3e');
    grd.addColorStop(0.3, '#3d6b56');
    grd.addColorStop(0.7, '#3d6b56');
    grd.addColorStop(1, '#2d4a3e');
    ctx.fillStyle = grd;

    // Main body
    roundRect(x, y, w, h, 6);

    // Cap
    var capH = 16, capW = w + 12, capX = x - 6;
    var capY = (y === 0) ? y + h - capH : y;
    ctx.fillStyle = '#4a8a6a';
    roundRect(capX, capY, capW, capH, 5);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 4, y, 6, h);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBird(bx, by, color, rot) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);

    // Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird ? bird.r : 15, (bird ? bird.r : 15) * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(7.5, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(20, 2);
    ctx.lineTo(12, 5);
    ctx.closePath();
    ctx.fill();

    // Wing
    var wingY = bird ? bird.flapAnim * 8 : 0;
    ctx.fillStyle = shadeColor(color, -20);
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wingY, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function shadeColor(hex, pct) {
    var num = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + pct));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + pct));
    var b = Math.min(255, Math.max(0, (num & 0xff) + pct));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function spawnScoreParticles() {
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: bird.x, y: bird.y,
        vx: Math.cos(a) * (1 + Math.random() * 2),
        vy: Math.sin(a) * (1 + Math.random() * 2) - 1,
        r: 2 + Math.random() * 2,
        color: '#ffd93d', life: 1
      });
    }
  }

  function onTap() {
    if (STATE !== 'playing') return;
    bird.vy = flapForce;
    bird.flapAnim = 1;
  }

  function gameOver() {
    STATE = 'over';
    cancelAnimationFrame(animFrame);

    // Death particles
    for (var i = 0; i < 15; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: bird.x, y: bird.y,
        vx: Math.cos(a) * (2 + Math.random() * 3),
        vy: Math.sin(a) * (2 + Math.random() * 3),
        r: 2 + Math.random() * 3,
        color: birdColor, life: 1
      });
    }

    // Render one final frame with particles
    render();

    var isNew = score > bestScore;
    if (isNew) { bestScore = score; localStorage.setItem('fj_best', bestScore); }

    setTimeout(function () {
      document.getElementById('fjHud').style.display = 'none';
      document.getElementById('fjFinalScore').textContent = score;
      document.getElementById('fjBestScore').textContent = 'BEST: ' + bestScore + (isNew ? ' ★ NEW!' : '');
      showOverlay('fjGameOver');
      submitScore();
    }, 500);
  }

  function submitScore() {
    if (submitted || score === 0) return;
    submitted = true;
    var pts = 0;
    if (score >= 30) pts = 60;
    else if (score >= 20) pts = 36;
    else if (score >= 10) pts = 18;
    else if (score >= 5) pts = 8;
    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'flappy-jump', score: score, levelsCompleted: 0, pointsEarned: pts })
    }).then(function (data) {
      showToast('+ ' + pts + ' points earned!');
      if (data && data.campaignClaim) {
        setTimeout(function () { showToast('\uD83C\uDFC6 Campaign cleared! $' + data.campaignClaim.dollars + ' reward!'); }, 1500);
      }
      if (data && data.completedTasks && data.completedTasks.length) {
        data.completedTasks.forEach(function (t, i) {
          setTimeout(function () { showToast('✅ Task complete: ' + t.title + ' — Claim +' + t.reward + ' pts in Tasks!'); }, 2000 + i * 1500);
        });
      }
    }).catch(function () {});
  }

  function showOverlay(id) { document.getElementById(id).classList.add('active'); }
  function hideOverlay(id) { document.getElementById(id).classList.remove('active'); }
  function updateScoreUI() {
    var el = document.getElementById('fjScore');
    el.textContent = score;
    el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 150);
  }

  return { init: init, start: start };
})();
