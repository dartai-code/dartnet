/* ==============================
   STACK TOWER – DartNet Mini Game
   Tap to stack sliding blocks.
   ============================== */
var ST = (function () {
  'use strict';

  // ── Canvas / sizing ──
  var canvas, ctx, W, H, dpr;
  var container;

  // ── Game state ──
  var STATE = 'menu'; // menu | playing | over
  var score, bestScore, perfectCount, combo;
  var stack;       // array of block objects
  var debris;      // falling cut-off pieces
  var particles;   // spark particles
  var camera;      // y-offset  
  var movingBlock; // the currently sliding block
  var speed, direction;
  var animFrame;
  var gameOverSubmitted;

  // ── Colours ──
  var PALETTES = [
    ['#ff6b6b', '#ee5a24'], ['#ffd93d', '#f0932b'], ['#6bcb77', '#009432'],
    ['#4d96ff', '#0652DD'], ['#9b59b6', '#8e44ad'], ['#e84393', '#d63031'],
    ['#00cec9', '#00b894'], ['#fd79a8', '#e84393'], ['#a29bfe', '#6c5ce7'],
    ['#fdcb6e', '#e17055']
  ];
  function getColor(i) { return PALETTES[i % PALETTES.length]; }

  // ── Block dimensions ──
  var BASE_W, BLOCK_H, START_X;

  // ── Init ──
  function init() {
    canvas = document.getElementById('stCanvas');
    ctx = canvas.getContext('2d');
    container = document.getElementById('stContainer');
    bestScore = parseInt(localStorage.getItem('stack_best') || '0', 10);

    resize();
    window.addEventListener('resize', resize);

    // Touch / click / key
    canvas.addEventListener('pointerdown', onTap);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); onTap(); }
    });

    renderIdle();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var maxW = Math.min(window.innerWidth - 16, 420);
    var maxH = Math.min(window.innerHeight - 16, 720);
    W = maxW;
    H = maxH;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    BASE_W = W * 0.55;
    BLOCK_H = 28;
    START_X = (W - BASE_W) / 2;
  }

  // ── Idle background ──
  function renderIdle() {
    ctx.clearRect(0, 0, W, H);
    drawBg(0);
    // Draw a sample tower
    var bw = BASE_W * 0.7;
    var bh = BLOCK_H;
    var baseY = H * 0.65;
    for (var i = 0; i < 6; i++) {
      var c = getColor(i);
      var x = (W - bw) / 2;
      var y = baseY - i * bh;
      drawBlock(x, y, bw, bh, c);
    }
  }

  // ── Start game ──
  function start() {
    score = 0;
    combo = 0;
    perfectCount = 0;
    speed = 2.5;
    direction = 1;
    stack = [];
    debris = [];
    particles = [];
    camera = 0;
    gameOverSubmitted = false;

    // Base block (stationary)
    stack.push({
      x: START_X, y: H - 80, w: BASE_W, h: BLOCK_H,
      color: getColor(0)
    });

    spawnBlock();

    setState('playing');
    showHud(true);
    updateScoreUI();
    hideOverlay('stMenu');
    hideOverlay('stGameOver');
    document.getElementById('stHint').style.display = '';

    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  function spawnBlock() {
    var prev = stack[stack.length - 1];
    var fromRight = Math.random() > 0.5;
    movingBlock = {
      x: fromRight ? W + 10 : -prev.w - 10,
      y: prev.y - BLOCK_H,
      w: prev.w,
      h: BLOCK_H,
      color: getColor(stack.length)
    };
    direction = fromRight ? -1 : 1;
  }

  // ── Main loop ──
  function loop() {
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    if (STATE !== 'playing') return;

    // Move block
    movingBlock.x += speed * direction;
    // Bounce at edges
    if (movingBlock.x + movingBlock.w > W + 30) direction = -1;
    if (movingBlock.x < -30) direction = 1;

    // Update debris
    for (var i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.vy += 0.5;
      d.y += d.vy;
      d.x += d.vx;
      d.rot += d.vr;
      d.alpha -= 0.02;
      if (d.alpha <= 0 || d.y > H + 100) debris.splice(i, 1);
    }

    // Update particles
    for (var j = particles.length - 1; j >= 0; j--) {
      var p = particles[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.03;
      if (p.life <= 0) particles.splice(j, 1);
    }

    // Smooth camera
    var targetCam = Math.max(0, (stack.length - 6) * BLOCK_H);
    camera += (targetCam - camera) * 0.1;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBg(camera);

    ctx.save();
    ctx.translate(0, camera);

    // Draw stack
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      drawBlock(b.x, b.y, b.w, b.h, b.color);
    }

    // Draw moving block
    if (movingBlock && STATE === 'playing') {
      drawBlock(movingBlock.x, movingBlock.y, movingBlock.w, movingBlock.h, movingBlock.color);
    }

    // Debris
    for (var d = 0; d < debris.length; d++) {
      var db = debris[d];
      ctx.save();
      ctx.globalAlpha = Math.max(0, db.alpha);
      ctx.translate(db.x + db.w / 2, db.y + db.h / 2);
      ctx.rotate(db.rot);
      drawBlock(-db.w / 2, -db.h / 2, db.w, db.h, db.color);
      ctx.restore();
    }

    // Particles
    for (var k = 0; k < particles.length; k++) {
      var pt = particles[k];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Drawing helpers ──
  function drawBg(cam) {
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    var progress = Math.min(cam / 600, 1);
    // Sky shifts from deep purple to dawn as tower grows
    var r1 = Math.floor(10 + progress * 30);
    var g1 = Math.floor(10 + progress * 10);
    var b1 = Math.floor(30 + progress * 40);
    var r2 = Math.floor(20 + progress * 60);
    var g2 = Math.floor(15 + progress * 30);
    var b2 = Math.floor(50 + progress * 50);
    grd.addColorStop(0, 'rgb(' + r1 + ',' + g1 + ',' + b1 + ')');
    grd.addColorStop(1, 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Subtle stars
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (var i = 0; i < 30; i++) {
      var sx = (i * 137.5) % W;
      var sy = ((i * 97.3 + cam * 0.05) % H);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }

  function drawBlock(x, y, w, h, color) {
    var grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, color[0]);
    grd.addColorStop(1, color[1]);
    ctx.fillStyle = grd;

    // Rounded rect
    var r = 4;
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

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 2, y + 2, w - 4, h * 0.35);
  }

  // ── Tap / place block ──
  function onTap() {
    if (STATE === 'menu') return;
    if (STATE === 'over') return;
    if (STATE !== 'playing') return;

    document.getElementById('stHint').style.display = 'none';

    var prev = stack[stack.length - 1];
    var mb = movingBlock;

    // Calculate overlap
    var overlapStart = Math.max(prev.x, mb.x);
    var overlapEnd = Math.min(prev.x + prev.w, mb.x + mb.w);
    var overlapW = overlapEnd - overlapStart;

    if (overlapW <= 0) {
      // Missed completely
      dropEntireBlock(mb);
      endGame();
      return;
    }

    // Perfect threshold
    var PERFECT_THRESH = 6;
    var isPerfect = Math.abs(mb.x - prev.x) < PERFECT_THRESH;

    if (isPerfect) {
      // Snap perfectly
      overlapW = prev.w;
      overlapStart = prev.x;
      combo++;
      perfectCount++;
      showCombo();
      spawnPerfectParticles(prev.x + prev.w / 2, mb.y);
    } else {
      combo = 0;
      // Create debris for cut part
      if (mb.x < prev.x) {
        // Cut left side
        createDebris(mb.x, mb.y, prev.x - mb.x, BLOCK_H, mb.color, -1);
      } else if (mb.x + mb.w > prev.x + prev.w) {
        // Cut right side
        var cutX = prev.x + prev.w;
        createDebris(cutX, mb.y, (mb.x + mb.w) - cutX, BLOCK_H, mb.color, 1);
      }
    }

    // Place block
    stack.push({
      x: overlapStart, y: mb.y, w: overlapW, h: BLOCK_H,
      color: mb.color
    });

    score++;
    updateScoreUI();

    // Speed up gradually
    speed = Math.min(2.5 + score * 0.12, 9);

    // If block too thin → game over
    if (overlapW < 8 && !isPerfect) {
      endGame();
      return;
    }

    spawnBlock();
  }

  function createDebris(x, y, w, h, color, dir) {
    if (w < 2) return;
    debris.push({
      x: x, y: y, w: w, h: h, color: color,
      vx: dir * (1 + Math.random() * 2), vy: -2 - Math.random() * 2,
      rot: 0, vr: dir * (0.02 + Math.random() * 0.05),
      alpha: 1
    });
  }

  function dropEntireBlock(b) {
    debris.push({
      x: b.x, y: b.y, w: b.w, h: b.h, color: b.color,
      vx: direction * 1.5, vy: 0, rot: 0,
      vr: direction * 0.03, alpha: 1
    });
  }

  function spawnPerfectParticles(cx, cy) {
    for (var i = 0; i < 18; i++) {
      var angle = (Math.PI * 2 * i) / 18;
      var spd = 2 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        r: 2 + Math.random() * 3,
        color: ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77', '#fff'][Math.floor(Math.random() * 5)],
        life: 1
      });
    }
  }

  function showCombo() {
    var el = document.getElementById('stCombo');
    var msgs = ['PERFECT!', 'AMAZING!', 'INCREDIBLE!', 'GODLIKE!', 'UNSTOPPABLE!'];
    el.textContent = combo >= 5 ? msgs[4] : msgs[Math.min(combo - 1, 3)];
    el.className = 'st-combo show';
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(function () { el.className = 'st-combo'; }, 900);
  }

  // ── End game ──
  function endGame() {
    STATE = 'over';
    movingBlock = null;

    var isNew = false;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('stack_best', bestScore);
      isNew = true;
    }

    // Show overlay after short delay
    setTimeout(function () {
      showHud(false);
      document.getElementById('stFinalScore').textContent = score;
      document.getElementById('stHighScore').textContent = 'BEST: ' + bestScore + (isNew ? ' ★ NEW!' : '');
      document.getElementById('stPerfects').textContent = 'PERFECTS: ' + perfectCount;
      showOverlay('stGameOver');
      submitScore();
    }, 600);
  }

  function submitScore() {
    if (gameOverSubmitted || score === 0) return;
    gameOverSubmitted = true;
    var pts = 0;
    if (score >= 30) pts = 60;
    else if (score >= 20) pts = 36;
    else if (score >= 10) pts = 18;
    else if (score >= 5) pts = 8;

    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'stack-tower', score: score, levelsCompleted: 0, pointsEarned: pts })
    }).then(function (data) {
      showToast('+ ' + pts + ' points earned!');
      if (data && data.campaignClaim) {
        setTimeout(function () { showToast('\uD83C\uDFC6 Campaign cleared! $' + data.campaignClaim.dollars + ' reward!'); }, 1500);
      }
    }).catch(function () {});
  }

  // ── UI helpers ──
  function setState(s) { STATE = s; }
  function showHud(v) { document.getElementById('stHud').style.display = v ? '' : 'none'; }
  function showOverlay(id) { document.getElementById(id).classList.add('active'); }
  function hideOverlay(id) { document.getElementById(id).classList.remove('active'); }
  function updateScoreUI() {
    var el = document.getElementById('stScore');
    el.textContent = score;
    el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 150);
    var b = document.getElementById('stBest');
    b.textContent = bestScore > 0 ? 'BEST: ' + bestScore : '';
  }

  return { init: init, start: start };
})();
