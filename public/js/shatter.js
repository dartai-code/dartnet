// =============================================
// SHATTER - Brick Breaker Mini Game
// Vanilla JS game engine for DartNet
// =============================================

var SHT = (function () {
  'use strict';

  // ===================== CONSTANTS =====================
  var W = 480, H = 700;
  var BALL_R = 6;
  var BALL_SPEED = 7;
  var BLOCK_W, BLOCK_H = 20;
  var COLS = 8;
  var LAUNCH_Y;
  var BOTTOM_Y;

  // ===================== STATE =====================
  var canvas, ctx;
  var gameState = 'menu'; // menu | aiming | launching | paused
  var currentLevel = 0;
  var score = 0;
  var combo = 0;
  var maxCombo = 0;
  var balls = [];
  var blocks = [];
  var powerups = [];
  var particles = [];
  var floatingTexts = [];
  var launchX;
  var aimAngle = -Math.PI / 2;
  var numBalls = 1;
  var ballsReturned = 0;
  var newLaunchX = null;
  var fastForward = false;
  var screenShake = 0;
  var mouseX = 0, mouseY = 0;
  // TODO: Ad callback — add when AdSense is ready
  // var adCallback = null;

  // Progress (localStorage)
  var progress = { unlocked: 1, stars: {}, highScores: {} };

  // ===================== LEVELS =====================
  // 30 levels, each has par (score threshold for stars), balls count, gen() returns {blocks, powerups}
  var LEVELS = [
    // Level 1: Simple intro
    { par: 500, balls: 1, gen: function () {
      var b = []; for (var r = 0; r < 3; r++) for (var c = 2; c < 6; c++) b.push(mkB(c, r + 1, 1));
      return { blocks: b, powerups: [] };
    }},
    // Level 2: More blocks
    { par: 800, balls: 1, gen: function () {
      var b = []; for (var r = 0; r < 4; r++) for (var c = 1; c < 7; c++) b.push(mkB(c, r + 1, r < 2 ? 1 : 2));
      return { blocks: b, powerups: [mkP(4, 2)] };
    }},
    // Level 3: Checkerboard
    { par: 1000, balls: 1, gen: function () {
      var b = [];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) { if ((r + c) % 2 === 0) b.push(mkB(c, r + 1, 2)); }
      return { blocks: b, powerups: [mkP(3, 3)] };
    }},
    // Level 4: Diamond shape
    { par: 1200, balls: 2, gen: function () {
      var b = [], cx = 3.5, hp = [1, 2, 2, 3, 2, 2, 1];
      for (var r = 0; r < 7; r++) { var w = r < 4 ? r + 1 : 7 - r; var s = Math.floor(cx - w / 2 + 0.5);
        for (var c = 0; c < w; c++) b.push(mkB(s + c, r + 1, hp[r])); }
      return { blocks: b, powerups: [mkP(3, 4)] };
    }},
    // Level 5: BOSS - thick wall
    { par: 2000, balls: 2, gen: function () {
      var b = []; for (var r = 0; r < 6; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, r < 2 ? 4 : 2));
      b.push(mkB(3, 0, 8, '#ff0000')); b.push(mkB(4, 0, 8, '#ff0000'));
      return { blocks: b, powerups: [mkP(2, 3), mkP(5, 3)] };
    }},
    // Level 6: Inverted V
    { par: 1000, balls: 2, gen: function () {
      var b = [];
      for (var r = 0; r < 6; r++) { b.push(mkB(r, r + 1, 2)); b.push(mkB(7 - r, r + 1, 2)); }
      return { blocks: b, powerups: [mkP(4, 5)] };
    }},
    // Level 7: Columns
    { par: 1200, balls: 2, gen: function () {
      var b = []; for (var c = 0; c < 8; c += 2) for (var r = 0; r < 7; r++) b.push(mkB(c, r + 1, 2));
      return { blocks: b, powerups: [mkP(1, 3), mkP(5, 3)] };
    }},
    // Level 8: Zigzag
    { par: 1500, balls: 3, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) { var off = r % 2 === 0 ? 0 : 4;
        for (var c = 0; c < 4; c++) b.push(mkB(c + off, r + 1, 2)); }
      return { blocks: b, powerups: [mkP(2, 4)] };
    }},
    // Level 9: Frame
    { par: 1500, balls: 3, gen: function () {
      var b = [];
      for (var c = 0; c < 8; c++) { b.push(mkB(c, 1, 3)); b.push(mkB(c, 7, 3)); }
      for (var r = 2; r < 7; r++) { b.push(mkB(0, r, 3)); b.push(mkB(7, r, 3)); }
      return { blocks: b, powerups: [mkP(4, 4)] };
    }},
    // Level 10: BOSS - fortress
    { par: 3000, balls: 3, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        if (r < 2 || r > 5 || c < 2 || c > 5) b.push(mkB(c, r + 1, 3));
        else b.push(mkB(c, r + 1, 6));
      }
      return { blocks: b, powerups: [mkP(1, 5), mkP(6, 5)] };
    }},
    // Level 11: Spiral hint
    { par: 1500, balls: 3, gen: function () {
      var b = [], pts = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[7,1],[7,2],[7,3],[7,4],[6,4],[5,4],[4,4],[3,4],[2,4],[1,4],[1,3],[1,2],[2,2],[3,2],[4,2],[5,2]];
      for (var i = 0; i < pts.length; i++) b.push(mkB(pts[i][0], pts[i][1] + 1, 2));
      return { blocks: b, powerups: [mkP(3, 3)] };
    }},
    // Level 12: BOSS - HP wall
    { par: 3500, balls: 4, gen: function () {
      var b = [];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 5 + r));
      return { blocks: b, powerups: [mkP(2, 3), mkP(5, 3)] };
    }},
    // Level 13: X marks
    { par: 1500, balls: 3, gen: function () {
      var b = [];
      for (var i = 0; i < 8; i++) { b.push(mkB(i, i + 1, 3)); b.push(mkB(7 - i, i + 1, 3)); }
      return { blocks: b, powerups: [mkP(3, 4)] };
    }},
    // Level 14: Rows of increasing HP
    { par: 2000, balls: 3, gen: function () {
      var b = []; for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, r + 1));
      return { blocks: b, powerups: [mkP(1, 5), mkP(6, 5)] };
    }},
    // Level 15: Scattered high HP
    { par: 2500, balls: 4, gen: function () {
      var b = [];
      for (var r = 0; r < 6; r++) for (var c = 0; c < 8; c++) {
        if ((r * 8 + c) % 3 === 0) b.push(mkB(c, r + 1, 5));
        else b.push(mkB(c, r + 1, 1));
      }
      return { blocks: b, powerups: [mkP(4, 3)] };
    }},
    // Level 16: Two thick bands
    { par: 2000, balls: 4, gen: function () {
      var b = [];
      for (var c = 0; c < 8; c++) { for (var r = 1; r <= 2; r++) b.push(mkB(c, r, 6)); for (var r = 5; r <= 6; r++) b.push(mkB(c, r, 6)); }
      return { blocks: b, powerups: [mkP(3, 3), mkP(5, 4)] };
    }},
    // Level 17: Dartboard rings
    { par: 2500, balls: 4, gen: function () {
      var b = [], cx = 3.5, cy = 4.5;
      for (var r = 0; r < 9; r++) for (var c = 0; c < 8; c++) {
        var d = Math.sqrt((c - cx) * (c - cx) + (r - cy) * (r - cy));
        if (d < 5) { var hp = d < 1.5 ? 8 : d < 3 ? 4 : 2; b.push(mkB(c, r + 1, hp)); }
      }
      return { blocks: b, powerups: [mkP(3, 5)] };
    }},
    // Level 18: Arrow pointing down
    { par: 2000, balls: 4, gen: function () {
      var b = [];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 3));
      for (var r = 5; r < 8; r++) { var w = 8 - r; var s = Math.floor(4 - w / 2);
        for (var c = 0; c < w; c++) b.push(mkB(s + c, r + 1, 4)); }
      return { blocks: b, powerups: [mkP(2, 3), mkP(5, 3)] };
    }},
    // Level 19: Chess pattern HP
    { par: 3000, balls: 5, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, (r + c) % 2 === 0 ? 6 : 2));
      return { blocks: b, powerups: [mkP(1, 4), mkP(6, 4)] };
    }},
    // Level 20: BOSS - full grid heavy
    { par: 5000, balls: 5, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 3 + Math.floor(r / 2) * 2));
      b[0].hp = 15; b[0].maxHp = 15; b[0].color = '#ff0000';
      b[7].hp = 15; b[7].maxHp = 15; b[7].color = '#ff0000';
      return { blocks: b, powerups: [mkP(2, 5), mkP(5, 5)] };
    }},
    // Level 21: Maze-like
    { par: 2500, balls: 5, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) { if (r % 2 === 0 || (r % 2 === 1 && c === (r < 4 ? 6 : 1))) b.push(mkB(c, r + 1, 4)); }
      return { blocks: b, powerups: [mkP(4, 3)] };
    }},
    // Level 22: Scattered bombs (high HP)
    { par: 3000, balls: 5, gen: function () {
      var b = [];
      for (var r = 0; r < 7; r++) for (var c = 0; c < 8; c++) {
        if (Math.abs(Math.sin(r * 3 + c * 7)) > 0.5) b.push(mkB(c, r + 1, 5));
      }
      return { blocks: b, powerups: [mkP(3, 2), mkP(5, 5)] };
    }},
    // Level 23: Hourglass
    { par: 3000, balls: 5, gen: function () {
      var b = [];
      for (var r = 0; r < 9; r++) { var w = r < 5 ? 8 - r * 2 : (r - 4) * 2; if (w < 2) w = 2;
        var s = Math.floor(4 - w / 2);
        for (var c = 0; c < w; c++) b.push(mkB(s + c, r + 1, 4)); }
      return { blocks: b, powerups: [mkP(3, 5)] };
    }},
    // Level 24: Dense field
    { par: 4000, balls: 6, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 4 + (r % 3)));
      return { blocks: b, powerups: [mkP(1, 3), mkP(6, 3)] };
    }},
    // Level 25: BOSS - dense high HP
    { par: 6000, balls: 6, gen: function () {
      var b = [];
      for (var r = 0; r < 9; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 5 + r));
      return { blocks: b, powerups: [mkP(2, 5), mkP(5, 5), mkP(4, 7)] };
    }},
    // Level 26: Stripes
    { par: 4000, balls: 6, gen: function () {
      var b = [];
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, c % 2 === 0 ? 8 : 2));
      return { blocks: b, powerups: [mkP(1, 4), mkP(6, 4)] };
    }},
    // Level 27: Ring of fire
    { par: 5000, balls: 7, gen: function () {
      var b = [], cx = 3.5, cy = 4;
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        var d = Math.sqrt((c - cx) * (c - cx) + (r - cy) * (r - cy));
        if (d >= 2 && d <= 4) b.push(mkB(c, r + 1, 7));
      }
      return { blocks: b, powerups: [mkP(3, 4), mkP(4, 5)] };
    }},
    // Level 28: Random chaos
    { par: 5000, balls: 7, gen: function () {
      var b = [], seed = 42;
      function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      for (var r = 0; r < 9; r++) for (var c = 0; c < 8; c++) { if (rng() > 0.3) b.push(mkB(c, r + 1, Math.ceil(rng() * 10))); }
      return { blocks: b, powerups: [mkP(2, 3), mkP(5, 6)] };
    }},
    // Level 29: Final prep
    { par: 6000, balls: 8, gen: function () {
      var b = [];
      for (var r = 0; r < 10; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 6 + Math.floor(r / 2)));
      return { blocks: b, powerups: [mkP(1, 5), mkP(3, 7), mkP(6, 5)] };
    }},
    // Level 30: FINAL BOSS
    { par: 8000, balls: 8, gen: function () {
      var b = [];
      for (var r = 0; r < 10; r++) for (var c = 0; c < 8; c++) b.push(mkB(c, r + 1, 8 + r));
      b.push(mkB(3, 0, 25, '#ff0000')); b.push(mkB(4, 0, 25, '#ff0000'));
      return { blocks: b, powerups: [mkP(1, 5), mkP(3, 7), mkP(6, 5), mkP(4, 9)] };
    }}
  ];

  // ===================== HELPERS =====================
  function mkB(col, row, hp, color) {
    return { col: col, row: row, x: 0, y: 0, w: 0, h: BLOCK_H, hp: hp, maxHp: hp, color: color || null, dead: false };
  }
  function mkP(col, row) {
    return { col: col, row: row, x: 0, y: 0, w: 0, h: BLOCK_H, collected: false };
  }

  function hpColor(hp, maxHp) {
    if (hp <= 0) return '#333';
    var ratio = hp / maxHp;
    if (ratio > 0.7) return '#6bcb77';
    if (ratio > 0.4) return '#ffd93d';
    return '#ff6b6b';
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  // ===================== BLOCK / POWERUP POSITIONING =====================
  function layoutBlocks() {
    BLOCK_W = W / COLS;
    LAUNCH_Y = H - 50;
    BOTTOM_Y = H - 30;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      b.x = b.col * BLOCK_W;
      b.y = b.row * BLOCK_H + 40;
      b.w = BLOCK_W;
    }
    for (var i = 0; i < powerups.length; i++) {
      var p = powerups[i];
      p.x = p.col * BLOCK_W;
      p.y = p.row * BLOCK_H + 40;
      p.w = BLOCK_W;
    }
  }

  // ===================== PERSISTENCE =====================
  function loadProgress() {
    try {
      var d = JSON.parse(localStorage.getItem('shatter_progress'));
      if (d && d.unlocked) progress = d;
    } catch (e) {}
  }

  function saveProgress() {
    localStorage.setItem('shatter_progress', JSON.stringify(progress));
  }

  // ===================== PARTICLES & EFFECTS =====================
  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 4;
      particles.push({
        x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 30, maxLife: 60, r: 2 + Math.random() * 3,
        color: color || '#fff'
      });
    }
  }

  function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x: x, y: y, text: text, color: color || '#fff', life: 40, maxLife: 40 });
  }

  function doScreenShake(amount) { screenShake = Math.max(screenShake, amount); }

  // ===================== BALL PHYSICS =====================
  function launchBalls(angle) {
    gameState = 'launching';
    var lvl = LEVELS[currentLevel];
    numBalls = lvl.balls + countExtraBalls();
    ballsReturned = 0;
    newLaunchX = null;
    combo = 0;
    maxCombo = 0;
    var delay = 0;
    for (var i = 0; i < numBalls; i++) {
      (function (d) {
        setTimeout(function () {
          balls.push({
            x: launchX, y: LAUNCH_Y,
            vx: Math.cos(angle) * BALL_SPEED,
            vy: Math.sin(angle) * BALL_SPEED,
            active: true
          });
        }, d);
      })(delay);
      delay += 80;
    }
  }

  function countExtraBalls() {
    var c = 0;
    for (var i = 0; i < powerups.length; i++) if (powerups[i].collected) c++;
    return c;
  }

  function updateBalls() {
    var speed = fastForward ? 2 : 1;
    for (var s = 0; s < speed; s++) {
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i];
        if (!b.active) continue;
        b.x += b.vx;
        b.y += b.vy;
        // Wall bounce
        if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
        // Bottom - ball out
        if (b.y + BALL_R >= LAUNCH_Y) {
          b.active = false;
          ballsReturned++;
          if (newLaunchX === null) newLaunchX = clamp(b.x, BALL_R, W - BALL_R);
        }
        // Block collision
        for (var j = 0; j < blocks.length; j++) {
          var bl = blocks[j];
          if (bl.dead || bl.hp <= 0) continue;
          if (rectBallCollide(bl, b)) {
            bl.hp--;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            score += 10 * Math.min(combo, 10);
            if (combo > 2) spawnFloatingText(b.x, b.y, 'x' + combo, comboColor(combo));
            if (bl.hp <= 0) {
              bl.dead = true;
              score += 50;
              spawnParticles(bl.x + bl.w / 2, bl.y + bl.h / 2, bl.color || '#4d96ff', 12);
              doScreenShake(4);
              spawnFloatingText(bl.x + bl.w / 2, bl.y + bl.h / 2, '+50', '#ffd93d');
            } else {
              spawnParticles(b.x, b.y, hpColor(bl.hp, bl.maxHp), 4);
            }
          }
        }
        // Powerup collision
        for (var j = 0; j < powerups.length; j++) {
          var p = powerups[j];
          if (p.collected) continue;
          if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
            p.collected = true;
            spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#4d96ff', 10);
            spawnFloatingText(p.x + p.w / 2, p.y + p.h / 2, '+BALL', '#4d96ff');
          }
        }
      }
    }
    // All balls returned
    if (gameState === 'launching' && ballsReturned >= numBalls) {
      balls = [];
      if (newLaunchX !== null) launchX = newLaunchX;
      endTurn();
    }
  }

  function rectBallCollide(rect, ball) {
    var cx = clamp(ball.x, rect.x, rect.x + rect.w);
    var cy = clamp(ball.y, rect.y, rect.y + rect.h);
    var dx = ball.x - cx, dy = ball.y - cy;
    if (dx * dx + dy * dy < BALL_R * BALL_R) {
      // Reflect
      var overlapX = (rect.x + rect.w / 2 - ball.x);
      var overlapY = (rect.y + rect.h / 2 - ball.y);
      if (Math.abs(overlapX / rect.w) > Math.abs(overlapY / rect.h)) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? 1 : -1;
      } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? 1 : -1;
      }
      return true;
    }
    return false;
  }

  function comboColor(c) {
    if (c >= 10) return '#ff6b6b';
    if (c >= 5) return '#ffd93d';
    return '#6bcb77';
  }

  // ===================== TURN LOGIC =====================
  function endTurn() {
    // Check win
    var allDead = true;
    for (var i = 0; i < blocks.length; i++) { if (!blocks[i].dead) { allDead = false; break; } }
    if (allDead) { showWin(); return; }
    // Move blocks down
    for (var i = 0; i < blocks.length; i++) {
      if (!blocks[i].dead) { blocks[i].row++; blocks[i].y += BLOCK_H; }
    }
    for (var i = 0; i < powerups.length; i++) {
      if (!powerups[i].collected) { powerups[i].row++; powerups[i].y += BLOCK_H; }
    }
    // Check if blocks reached bottom
    for (var i = 0; i < blocks.length; i++) {
      if (!blocks[i].dead && blocks[i].y + blocks[i].h >= BOTTOM_Y) {
        showLose();
        return;
      }
    }
    gameState = 'aiming';
    combo = 0;
  }

  // ===================== WIN / LOSE =====================
  function showWin() {
    gameState = 'menu';
    var par = LEVELS[currentLevel].par;
    var stars = score >= par * 1.5 ? 3 : score >= par ? 2 : 1;
    var lvlNum = currentLevel + 1;
    // Save progress
    var prev = progress.stars[lvlNum] || 0;
    if (stars > prev) progress.stars[lvlNum] = stars;
    var prevHigh = progress.highScores[lvlNum] || 0;
    if (score > prevHigh) progress.highScores[lvlNum] = score;
    if (lvlNum >= progress.unlocked && lvlNum < 30) progress.unlocked = lvlNum + 1;
    saveProgress();
    // Submit score to DartNet
    submitGameScore(lvlNum, stars);
    // UI
    document.getElementById('sWinTitle').textContent = 'LEVEL ' + lvlNum + ' COMPLETE!';
    var starsHTML = '';
    for (var i = 0; i < 3; i++) starsHTML += '<span class="sht-star ' + (i < stars ? 'earned' : '') + '">★</span>';
    document.getElementById('sWinStars').innerHTML = starsHTML;
    document.getElementById('sWinScore').textContent = 'Score: ' + score + (maxCombo > 2 ? '  |  Max Combo: x' + maxCombo : '');
    document.getElementById('sNextBtn').style.display = currentLevel < 29 ? '' : 'none';
    showScreen('sWinScreen');
  }

  function showLose() {
    gameState = 'menu';
    document.getElementById('sLoseScore').textContent = 'Score: ' + score;
    showScreen('sLoseScreen');
  }

  function submitGameScore(levelNum, stars) {
    try {
      var points = Math.min(60, score >= 5000 ? 60 : score >= 3000 ? 45 : score >= 1000 ? 30 : 15);
      if (typeof api === 'function') {
        api('/api/games/score', {
          method: 'POST',
          body: JSON.stringify({
            gameId: 'shatter',
            score: score,
            levelsCompleted: levelNum,
            pointsEarned: points
          })
        }).then(function (data) {
          if (typeof showToast === 'function') showToast('+' + points + ' points earned!', 'success');
          if (data && data.campaignClaim) {
            setTimeout(function () { showToast('\uD83C\uDFC6 Campaign cleared! $' + data.campaignClaim.dollars + ' reward!', 'success'); }, 1500);
          }
          if (data && data.completedTasks && data.completedTasks.length) {
            data.completedTasks.forEach(function (t, i) {
              setTimeout(function () { if (typeof showToast === 'function') showToast('✅ Task complete: ' + t.title + ' — Claim +' + t.reward + ' pts in Tasks!', 'success'); }, 2000 + i * 1500);
            });
          }
        }).catch(function () { /* ignore */ });
      }
    } catch (e) { /* ignore */ }
  }

  // ===================== SCREENS =====================
  function showScreen(id) {
    var screens = document.querySelectorAll('.sht-screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    var hud = document.getElementById('shatterHud');
    var topBtns = document.getElementById('sTopBtns');
    if (id === null) {
      hud.style.display = 'flex';
      topBtns.style.display = 'flex';
    } else {
      hud.style.display = 'none';
      topBtns.style.display = 'none';
    }
  }

  function showMenu() {
    showScreen('sMenuScreen');
    gameState = 'menu';
  }

  function showLevels() {
    var grid = document.getElementById('sLevelGrid');
    var html = '';
    for (var i = 0; i < 30; i++) {
      var n = i + 1;
      var locked = n > progress.unlocked;
      var st = progress.stars[n] || 0;
      var starStr = '';
      for (var s = 0; s < 3; s++) starStr += '<span style="color:' + (s < st ? '#ffd93d' : '#333') + '">★</span>';
      html += '<button class="sht-level-btn ' + (locked ? 'locked' : '') + '" ' +
        (locked ? 'disabled' : 'onclick="SHT.startLevel(' + i + ')"') + '>' +
        n + '<span class="stars-small">' + starStr + '</span></button>';
    }
    grid.innerHTML = html;
    showScreen('sLevelScreen');
  }

  // ===================== START / RETRY / NEXT =====================
  function startLevel(idx) {
    currentLevel = idx;
    var lvl = LEVELS[idx];
    var gen = lvl.gen();
    blocks = gen.blocks;
    powerups = gen.powerups;
    layoutBlocks();
    balls = [];
    particles = [];
    floatingTexts = [];
    score = 0; combo = 0; maxCombo = 0;
    launchX = W / 2;
    fastForward = false;
    gameState = 'aiming';
    showScreen(null);
    updateHud();
  }

  function retryLevel() { startLevel(currentLevel); }
  function nextLevel() {
    if (currentLevel < 29) startLevel(currentLevel + 1);
    else showLevels();
  }

  function togglePause() {
    if (gameState === 'aiming' || gameState === 'launching') {
      gameState = 'paused';
      showScreen('sPauseScreen');
    } else if (gameState === 'paused') {
      gameState = balls.length > 0 ? 'launching' : 'aiming';
      showScreen(null);
    }
  }

  // TODO: Ad integration — add when AdSense ID is ready

  // ===================== HUD =====================
  function updateHud() {
    var lvl = LEVELS[currentLevel];
    document.getElementById('sHudLevel').textContent = 'LEVEL ' + (currentLevel + 1);
    var nb = lvl.balls + countExtraBalls();
    document.getElementById('sHudBalls').textContent = '● ×' + nb;
    document.getElementById('sHudScore').textContent = 'Score: ' + score;
    var comboEl = document.getElementById('sHudCombo');
    if (combo > 2) {
      comboEl.textContent = 'COMBO x' + combo;
      comboEl.style.color = comboColor(combo);
    } else {
      comboEl.textContent = '';
    }
    // FF button state
    var ffBtn = document.getElementById('sFFBtn');
    if (ffBtn) ffBtn.classList.toggle('ff-active', fastForward);
  }

  // ===================== DRAW =====================
  function draw() {
    ctx.save();
    // Screen shake
    if (screenShake > 0) {
      var sx = (Math.random() - 0.5) * screenShake;
      var sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      screenShake *= 0.85;
      if (screenShake < 0.5) screenShake = 0;
    }
    // BG
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * BLOCK_W, 0); ctx.lineTo(i * BLOCK_W, H); ctx.stroke();
    }
    // Bottom line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(0, BOTTOM_Y); ctx.lineTo(W, BOTTOM_Y); ctx.stroke();

    // Blocks
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.dead) continue;
      var col = b.color || hpColor(b.hp, b.maxHp);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      // HP text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, b.x + b.w / 2, b.y + b.h / 2);
    }

    // Powerups
    for (var i = 0; i < powerups.length; i++) {
      var p = powerups[i];
      if (p.collected) continue;
      ctx.fillStyle = '#4d96ff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', p.x + p.w / 2, p.y + p.h / 2);
    }

    // Balls
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b.active) continue;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, BALL_R * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aim trajectory
    if (gameState === 'aiming') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(launchX, LAUNCH_Y, BALL_R + 2, 0, Math.PI * 2);
      ctx.fill();
      // Dotted line
      var dx = Math.cos(aimAngle), dy = Math.sin(aimAngle);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (var d = 20; d < 200; d += 15) {
        var px = launchX + dx * d, py = LAUNCH_Y + dy * d;
        if (py < 0 || px < 0 || px > W) break;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Launch point indicator when balls are out
    if (gameState === 'launching' && newLaunchX !== null) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(newLaunchX, LAUNCH_Y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96; p.vy += 0.05;
      p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating texts
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.y -= 1.2;
      ft.life--;
      if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
      ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
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
  }

  // ===================== GAME LOOP =====================
  var animId = 0;

  function gameLoop() {
    animId = requestAnimationFrame(gameLoop);
    if (gameState === 'launching') {
      updateBalls();
      updateHud();
    }
    if (gameState === 'aiming' || gameState === 'launching') {
      draw();
    }
  }

  // ===================== INPUT =====================
  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    if (gameState === 'aiming') {
      var dx = mouseX - launchX;
      var dy = mouseY - LAUNCH_Y;
      if (dy < -10) {
        aimAngle = Math.atan2(dy, dx);
        aimAngle = clamp(aimAngle, -Math.PI + 0.15, -0.15);
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    var t = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    mouseX = (t.clientX - rect.left) * (W / rect.width);
    mouseY = (t.clientY - rect.top) * (H / rect.height);
    if (gameState === 'aiming') {
      var dx = mouseX - launchX;
      var dy = mouseY - LAUNCH_Y;
      if (dy < -10) {
        aimAngle = Math.atan2(dy, dx);
        aimAngle = clamp(aimAngle, -Math.PI + 0.15, -0.15);
      }
    }
  }

  function onClick(e) {
    if (gameState === 'aiming') {
      launchBalls(aimAngle);
    }
  }

  function onTouchEnd(e) {
    if (gameState === 'aiming') {
      e.preventDefault();
      launchBalls(aimAngle);
    }
  }

  // ===================== RESIZE =====================
  function resize() {
    var container = document.getElementById('shatterContainer');
    var maxW = Math.min(window.innerWidth - 24, 480);
    var maxH = window.innerHeight - 80;
    var scale = Math.min(maxW / W, maxH / H);
    var cw = Math.floor(W * scale);
    var ch = Math.floor(H * scale);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    container.style.width = cw + 'px';
    container.style.height = ch + 'px';
  }

  // ===================== INIT =====================
  function init() {
    canvas = document.getElementById('shatterCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    loadProgress();
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    // HUD buttons
    document.getElementById('sFFBtn').addEventListener('click', function () {
      fastForward = !fastForward;
      updateHud();
    });
    document.getElementById('sPauseBtn').addEventListener('click', function () {
      togglePause();
    });
    showMenu();
    // Initial draw
    draw();
    gameLoop();
  }

  // ===================== PUBLIC API =====================
  return {
    init: init,
    showMenu: showMenu,
    showLevels: showLevels,
    startLevel: startLevel,
    retryLevel: retryLevel,
    nextLevel: nextLevel,
    togglePause: togglePause,
    // TODO: Ad functions — add when AdSense is ready
  };

})();
