/* ==============================
   COLOR SWITCH – DartNet Mini Game
   Tap to jump through matching color gates.
   ============================== */
var CS = (function () {
  'use strict';

  var canvas, ctx, W, H, dpr;
  var STATE = 'menu';
  var score, bestScore, submitted;

  // Physics
  var ball, gravity, jumpForce;
  var camera; // scrolls upward

  // Obstacles
  var obstacles; // ring obstacles
  var stars;     // collectible stars (score)
  var switchers; // color-switch pickups
  var particles;

  // Colors
  var COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
  var COLOR_NAMES = ['red', 'yellow', 'green', 'blue'];
  var ballColorIdx;

  var animFrame;
  var OBSTACLE_GAP = 260;

  function init() {
    canvas = document.getElementById('csCanvas');
    ctx = canvas.getContext('2d');
    bestScore = parseInt(localStorage.getItem('cs_best') || '0', 10);
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
  }

  function renderIdle() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    // Draw a sample ring
    drawRing(W / 2, H / 2, 60, 12, 0, [0, 1, 2, 3]);
  }

  // ── Start ──
  function start() {
    score = 0;
    submitted = false;
    gravity = 0.35;
    jumpForce = -7.5;
    ballColorIdx = 0;
    camera = 0;
    obstacles = [];
    stars = [];
    switchers = [];
    particles = [];

    ball = { x: W / 2, y: H * 0.65, vy: 0, r: 12 };

    // Generate initial obstacles
    for (var i = 0; i < 6; i++) {
      generateObstacle(H * 0.65 - OBSTACLE_GAP * (i + 1));
    }

    STATE = 'playing';
    document.getElementById('csHud').style.display = '';
    updateScoreUI();
    hideOverlay('csMenu');
    hideOverlay('csGameOver');
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  function generateObstacle(worldY) {
    var type = Math.random();
    var obs;
    if (type < 0.5) {
      // Rotating ring
      obs = {
        type: 'ring', x: W / 2, y: worldY,
        radius: 55 + Math.random() * 15,
        thickness: 12, angle: Math.random() * Math.PI * 2,
        speed: (0.015 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        segments: shuffleArray([0, 1, 2, 3])
      };
    } else if (type < 0.8) {
      // Horizontal bars
      obs = {
        type: 'bars', y: worldY,
        segments: shuffleArray([0, 1, 2, 3]),
        offset: Math.random() * W,
        speed: (1 + Math.random()) * (Math.random() > 0.5 ? 1 : -1)
      };
    } else {
      // Double ring
      obs = {
        type: 'ring', x: W / 2, y: worldY,
        radius: 65, thickness: 11, angle: 0,
        speed: 0.02 * (Math.random() > 0.5 ? 1 : -1),
        segments: shuffleArray([0, 1, 2, 3])
      };
    }
    obstacles.push(obs);

    // Star at center
    stars.push({ x: W / 2, y: worldY, collected: false, r: 10 });

    // Color switcher between obstacles
    if (Math.random() > 0.3) {
      switchers.push({ x: W / 2, y: worldY + OBSTACLE_GAP * 0.5, r: 14, used: false });
    }
  }

  function shuffleArray(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ── Loop ──
  function loop() {
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    if (STATE !== 'playing') return;

    // Ball physics
    ball.vy += gravity;
    ball.y += ball.vy;

    // Camera follows ball
    var targetCam = -(ball.y - H * 0.65);
    camera += (targetCam - camera) * 0.1;

    // Generate more obstacles
    var topmost = obstacles.length > 0 ? obstacles[obstacles.length - 1].y : ball.y;
    if (ball.y - topmost < OBSTACLE_GAP * 4) {
      generateObstacle(topmost - OBSTACLE_GAP);
    }

    // Rotate obstacles
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.type === 'ring') o.angle += o.speed;
      if (o.type === 'bars') o.offset += o.speed;
    }

    // Collect stars
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      if (!st.collected && dist(ball.x, ball.y, st.x, st.y) < ball.r + st.r) {
        st.collected = true;
        score++;
        updateScoreUI();
        spawnParticles(st.x, st.y, '#ffd93d');
      }
    }

    // Color switchers
    for (var c = 0; c < switchers.length; c++) {
      var sw = switchers[c];
      if (!sw.used && dist(ball.x, ball.y, sw.x, sw.y) < ball.r + sw.r) {
        sw.used = true;
        ballColorIdx = (ballColorIdx + 1 + Math.floor(Math.random() * 3)) % 4;
        spawnParticles(sw.x, sw.y, COLORS[ballColorIdx]);
      }
    }

    // Collision with obstacles
    for (var o2 = 0; o2 < obstacles.length; o2++) {
      if (checkCollision(obstacles[o2])) {
        gameOver();
        return;
      }
    }

    // Fall off bottom
    if (ball.y > -camera + H + 100) {
      gameOver();
      return;
    }

    // Particles
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08;
      pt.life -= 0.03;
      if (pt.life <= 0) particles.splice(p, 1);
    }

    // Cleanup distant obstacles
    for (var r = obstacles.length - 1; r >= 0; r--) {
      if (obstacles[r].y > ball.y + H) { obstacles.splice(r, 1); }
    }
    for (var r2 = stars.length - 1; r2 >= 0; r2--) {
      if (stars[r2].y > ball.y + H) stars.splice(r2, 1);
    }
    for (var r3 = switchers.length - 1; r3 >= 0; r3--) {
      if (switchers[r3].y > ball.y + H) switchers.splice(r3, 1);
    }
  }

  function checkCollision(obs) {
    if (obs.type === 'ring') {
      return checkRingCollision(obs);
    }
    if (obs.type === 'bars') {
      return checkBarsCollision(obs);
    }
    return false;
  }

  function checkRingCollision(ring) {
    var d = dist(ball.x, ball.y, ring.x, ring.y);
    var innerR = ring.radius - ring.thickness / 2;
    var outerR = ring.radius + ring.thickness / 2;

    // Not in ring zone
    if (d < innerR - ball.r || d > outerR + ball.r) return false;

    // In ring zone → check which segment
    var angle = Math.atan2(ball.y - ring.y, ball.x - ring.x) - ring.angle;
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var segIdx = Math.floor(angle / (Math.PI / 2));
    var colorIdx = ring.segments[segIdx % 4];

    return colorIdx !== ballColorIdx;
  }

  function checkBarsCollision(bar) {
    var barH = 14;
    if (ball.y + ball.r < bar.y - barH / 2 || ball.y - ball.r > bar.y + barH / 2) return false;

    // 4 segments across width
    var segW = W / 4;
    var bx = ((ball.x - bar.offset) % W + W) % W;
    var segIdx = Math.floor(bx / segW);
    var colorIdx = bar.segments[segIdx % 4];
    return colorIdx !== ballColorIdx;
  }

  function dist(x1, y1, x2, y2) {
    var dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Render ──
  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    ctx.save();
    ctx.translate(0, camera);

    // Draw obstacles
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.type === 'ring') drawRing(o.x, o.y, o.radius, o.thickness, o.angle, o.segments);
      if (o.type === 'bars') drawBars(o);
    }

    // Draw stars
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      if (!st.collected) drawStar(st.x, st.y, st.r);
    }

    // Draw switchers
    for (var c = 0; c < switchers.length; c++) {
      var sw = switchers[c];
      if (!sw.used) drawSwitcher(sw.x, sw.y, sw.r);
    }

    // Particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw ball
    if (STATE === 'playing') {
      ctx.fillStyle = COLORS[ballColorIdx];
      ctx.shadowColor = COLORS[ballColorIdx];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawBg() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
  }

  function drawRing(cx, cy, r, th, angle, segs) {
    for (var i = 0; i < 4; i++) {
      var startAngle = angle + (Math.PI / 2) * i + 0.05;
      var endAngle = angle + (Math.PI / 2) * (i + 1) - 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.lineWidth = th;
      ctx.strokeStyle = COLORS[segs[i]];
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function drawBars(bar) {
    var segW = W / 4;
    var barH = 14;
    for (var i = 0; i < 8; i++) {
      var x = bar.offset + segW * i;
      x = ((x % (W * 2)) + W * 2) % (W * 2) - W;
      ctx.fillStyle = COLORS[bar.segments[i % 4]];
      roundRect(x, bar.y - barH / 2, segW - 4, barH, 4);
    }
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

  function drawStar(x, y, r) {
    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 12;
    var spikes = 5, outerR = r, innerR = r * 0.45;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rad = (i % 2 === 0) ? outerR : innerR;
      var angle = (Math.PI * i) / spikes - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
      else ctx.lineTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawSwitcher(x, y, r) {
    // Small circle with all 4 colors
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = COLORS[i];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, (Math.PI / 2) * i, (Math.PI / 2) * (i + 1));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#0a0a1a';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function spawnParticles(cx, cy, color) {
    for (var i = 0; i < 12; i++) {
      var a = (Math.PI * 2 * i) / 12;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * (2 + Math.random() * 2),
        vy: Math.sin(a) * (2 + Math.random() * 2),
        r: 2 + Math.random() * 2, color: color, life: 1
      });
    }
  }

  // ── Input ──
  function onTap() {
    if (STATE !== 'playing') return;
    ball.vy = jumpForce;
  }

  // ── Game Over ──
  function gameOver() {
    STATE = 'over';
    cancelAnimationFrame(animFrame);

    var isNew = score > bestScore;
    if (isNew) { bestScore = score; localStorage.setItem('cs_best', bestScore); }

    setTimeout(function () {
      document.getElementById('csHud').style.display = 'none';
      document.getElementById('csFinalScore').textContent = score;
      document.getElementById('csHighScore').textContent = 'BEST: ' + bestScore + (isNew ? ' ★ NEW!' : '');
      showOverlay('csGameOver');
      submitScore();
    }, 400);
  }

  function submitScore() {
    if (submitted || score === 0) return;
    submitted = true;
    var pts = 0;
    if (score >= 20) pts = 60;
    else if (score >= 12) pts = 30;
    else if (score >= 6) pts = 15;
    else if (score >= 3) pts = 6;
    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'color-switch', score: score, levelsCompleted: 0, pointsEarned: pts })
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
    var el = document.getElementById('csScore');
    el.textContent = score;
    el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 150);
    document.getElementById('csBest').textContent = bestScore > 0 ? 'BEST: ' + bestScore : '';
  }

  return { init: init, start: start };
})();
