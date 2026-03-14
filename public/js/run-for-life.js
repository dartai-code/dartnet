// =============================================
// RUN FOR LIFE - Troll Platformer Mini Game
// Vanilla JS (converted from React/TS)
// =============================================

var RFL = (function () {
  'use strict';

  // ===================== CONSTANTS =====================
  var W = 800, H = 500;
  var GRAVITY = 0.6, JUMP_FORCE = -12, PLAYER_SPEED = 4;
  var PW = 30, PH = 40, TILE = 32, TOTAL_LEVELS = 10;

  // ===================== STATE =====================
  var canvas, ctx;
  var animId = 0;
  var keys = {};
  var gameState = 'menu'; // menu | playing | dead | levelFailed | levelComplete | gameComplete
  var hearts = 5;
  // TODO: Ad state — uncomment when AdSense is ready
  // var adUsedThisLevel = false;
  // var adCountdown = 0;
  // var adInterval = null;
  var currentLevel = 1;
  var deathCount = 0;
  var deathMessage = '';
  var totalDeaths = parseInt(localStorage.getItem('trollRageDeaths') || '0');
  var unlockedLevel = parseInt(localStorage.getItem('trollUnlockedLevel') || '1');
  var time = 0;
  var lastDeathPos = { x: 60, y: 0 };

  var player = makePlayer();
  var level = null;
  var particles = [];
  var cam = { x: 0, y: 0 };
  var shake = { i: 0, t: 0 };
  var troll = null; // { msg, timer, opacity }
  var trollPopupTimer = null;

  // Touch state
  var touchStartX = 0;

  function makePlayer() {
    return {
      x: 60, y: 0, vx: 0, vy: 0,
      onGround: false, facingRight: true, dead: false, won: false,
      reversed: false, gravFlipped: false, jumpCount: 0, deathCount: 0,
      frameIndex: 0, frameTimer: 0, squash: 1, stretch: 1,
      trailTimer: 0, landTimer: 0, runParticleTimer: 0
    };
  }

  // ===================== TROLL MESSAGES =====================
  var DEATH_MESSAGES = [
    "LOL did you really fall for that? 🤣",
    "That was the OBVIOUS trap! Come on!",
    "My grandma plays better than this 👵",
    "That platform was CLEARLY fake",
    "Skill issue detected 📉",
    "Maybe try a different game? 🤔",
    "You did that on purpose... right?",
    "HAHAHAHA that was hilarious 😂",
    "Pro tip: Don't die. You're welcome.",
    "The spike was literally RIGHT THERE",
    "Are your eyes closed?? 👀",
    "Even the spikes feel bad for you",
    "404: Skill not found",
    "Rage quitting yet? 😈",
    "That's not how platforms work, genius",
    "You just got TROLLED! 🎣",
    "Try jumping OVER the danger next time",
    "Your death count is my high score 💀",
    "Did you think that was safe? Really??",
    "The game isn't broken. You are. 🫠",
    "Plot twist: YOU are the obstacle",
    "Task failed successfully ✅",
    "Have you considered... not dying?",
    "That trap has a 100% kill rate. On you.",
    "I'd say nice try, but it wasn't 😬"
  ];
  var TROLL_SIGNS = [
    "Jump here! Trust me! →",
    "Safe path ahead! (not really)",
    "This way to victory! ↓",
    "Free coins below! ↓↓↓",
    "The floor is totally real →",
    "No traps ahead, I promise 😇",
    "← Go back! Just kidding →",
    "You're doing great! (you're not)",
    "Almost there! (you're nowhere close)",
    "The exit is down there! ↓"
  ];
  var LEVEL_NAMES = [
    "The Tutorial (lol)", "Trust Issues", "Nothing Is Real",
    "Gravity Is Optional", "The Labyrinth of Lies", "Cannon Fodder",
    "Ice Ice Baby", "The Crusher Zone", "Everything Is A Trap", "The Final Troll"
  ];

  // ===================== DRAWING HELPERS =====================
  function drawRoundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  function drawPlayer(p, t) {
    ctx.save();
    var cx = p.x + PW / 2, cy = p.y + PH / 2;
    if (p.gravFlipped) { ctx.translate(cx, cy); ctx.scale(1, -1); ctx.translate(-cx, -cy); }
    ctx.translate(cx, p.y + PH); ctx.scale(p.squash, p.stretch); ctx.translate(-cx, -(p.y + PH));
    var flip = p.facingRight ? 1 : -1;
    ctx.translate(cx, 0); ctx.scale(flip, 1); ctx.translate(-cx, 0);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, p.y + PH + 2, PW * 0.4, 3, 0, 0, Math.PI * 2); ctx.fill();

    if (p.dead) {
      var bodyGrad = ctx.createLinearGradient(p.x + 4, p.y + 12, p.x + PW - 4, p.y + PH - 4);
      bodyGrad.addColorStop(0, '#cc2222'); bodyGrad.addColorStop(1, '#881111');
      ctx.fillStyle = bodyGrad; drawRoundRect(p.x + 3, p.y + 12, PW - 6, PH - 16, 4); ctx.fill();
      ctx.fillStyle = '#eebb88'; ctx.beginPath(); ctx.arc(cx, p.y + 9, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cc9966'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 7, p.y + 5); ctx.lineTo(cx - 3, p.y + 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 3, p.y + 5); ctx.lineTo(cx - 7, p.y + 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3, p.y + 5); ctx.lineTo(cx + 7, p.y + 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 7, p.y + 5); ctx.lineTo(cx + 3, p.y + 9); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, p.y + 16, 3, Math.PI, 0); ctx.stroke();
    } else {
      // Hair
      ctx.fillStyle = '#4a3728';
      ctx.beginPath(); ctx.arc(cx, p.y + 6, 11, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 5, p.y + 1, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 3, p.y - 1, 5, 3, 0.2, 0, Math.PI * 2); ctx.fill();
      // Head
      var skinGrad = ctx.createRadialGradient(cx - 2, p.y + 7, 1, cx, p.y + 9, 11);
      skinGrad.addColorStop(0, '#ffe0c0'); skinGrad.addColorStop(1, '#e8b888');
      ctx.fillStyle = skinGrad; ctx.beginPath(); ctx.arc(cx, p.y + 9, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,130,80,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx - 4, p.y + 8, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 4, p.y + 8, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
      var pupilOff = p.vx !== 0 ? 1 : 0;
      ctx.fillStyle = '#2a1a0a';
      ctx.beginPath(); ctx.arc(cx - 4 + pupilOff, p.y + 8.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4 + pupilOff, p.y + 8.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(cx - 4.5 + pupilOff, p.y + 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3.5 + pupilOff, p.y + 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
      // Eyebrows
      ctx.strokeStyle = '#4a3728'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 7, p.y + 4); ctx.quadraticCurveTo(cx - 4, p.y + 3, cx - 1, p.y + 4.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 1, p.y + 4.5); ctx.quadraticCurveTo(cx + 4, p.y + 3, cx + 7, p.y + 4); ctx.stroke();
      // Mouth
      ctx.strokeStyle = '#8a4a2a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, p.y + 13, 2.5, 0.1, Math.PI - 0.1); ctx.stroke();
      // Shirt
      var shirtGrad = ctx.createLinearGradient(p.x + 4, p.y + 18, p.x + PW - 4, p.y + PH - 10);
      shirtGrad.addColorStop(0, '#3a8fd4'); shirtGrad.addColorStop(0.5, '#2a7fc4'); shirtGrad.addColorStop(1, '#1a5f94');
      ctx.fillStyle = shirtGrad; drawRoundRect(p.x + 4, p.y + 18, PW - 8, PH - 24, 3); ctx.fill();
      // Collar
      ctx.fillStyle = '#2878b8';
      ctx.beginPath();
      ctx.moveTo(cx - 6, p.y + 18); ctx.lineTo(cx, p.y + 22); ctx.lineTo(cx + 6, p.y + 18);
      ctx.lineTo(cx + 8, p.y + 18); ctx.lineTo(cx, p.y + 24); ctx.lineTo(cx - 8, p.y + 18);
      ctx.closePath(); ctx.fill();
      // Arms
      var armSwing = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(p.frameIndex * Math.PI / 2) * 6 : 0;
      ctx.fillStyle = '#e8b888';
      ctx.save(); ctx.translate(p.x + 4, p.y + 20); ctx.rotate(-0.2 + armSwing * 0.05);
      drawRoundRect(-3, 0, 5, 14, 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(p.x + PW - 4, p.y + 20); ctx.rotate(0.2 - armSwing * 0.05);
      drawRoundRect(-2, 0, 5, 14, 2); ctx.fill(); ctx.restore();
      // Legs
      var legSwing = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(p.frameIndex * Math.PI / 2) * 5 : 0;
      ctx.fillStyle = '#3a3a5c';
      drawRoundRect(p.x + 6, p.y + PH - 12, 7, 12 + legSwing, 2); ctx.fill();
      drawRoundRect(p.x + PW - 13, p.y + PH - 12, 7, 12 - legSwing, 2); ctx.fill();
      // Shoes
      ctx.fillStyle = '#5a2a1a';
      drawRoundRect(p.x + 5, p.y + PH - 1 + legSwing, 9, 4, 2); ctx.fill();
      drawRoundRect(p.x + PW - 14, p.y + PH - 1 - legSwing, 9, 4, 2); ctx.fill();
      // Scarf when jumping
      if (!p.onGround && p.vy < -2) {
        ctx.strokeStyle = 'rgba(200,50,50,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath();
        var scarfWave = Math.sin(t / 80) * 3;
        ctx.moveTo(cx - 2, p.y + 20);
        ctx.quadraticCurveTo(cx - 10, p.y + 28 + scarfWave, cx - 14, p.y + 34 + scarfWave);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Platform renderers
  function drawPlatformSolid(pl, t) {
    var grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
    grad.addColorStop(0, '#6b7b5a'); grad.addColorStop(0.2, '#556648');
    grad.addColorStop(0.8, '#3d4a32'); grad.addColorStop(1, '#2a3520');
    ctx.fillStyle = grad; drawRoundRect(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
    var topGrad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + 6);
    topGrad.addColorStop(0, '#7ac44a'); topGrad.addColorStop(1, '#5a9a3a');
    ctx.fillStyle = topGrad; drawRoundRect(pl.x, pl.y, pl.w, 6, 3); ctx.fill();
    ctx.strokeStyle = '#8ad45a'; ctx.lineWidth = 1.2;
    for (var gx = pl.x + 4; gx < pl.x + pl.w - 4; gx += 8) {
      var wo = Math.sin(t / 600 + gx * 0.05) * 2;
      ctx.beginPath(); ctx.moveTo(gx, pl.y); ctx.quadraticCurveTo(gx + wo, pl.y - 5, gx + wo + 1, pl.y - 7); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.8;
    for (var gx2 = pl.x + TILE; gx2 < pl.x + pl.w; gx2 += TILE) {
      ctx.beginPath(); ctx.moveTo(gx2 + Math.sin(gx2) * 2, pl.y + 6); ctx.lineTo(gx2 - Math.sin(gx2) * 2, pl.y + pl.h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(pl.x + 2, pl.y + pl.h - 2, pl.w - 4, 2);
  }

  function drawPlatformFake(pl, t) {
    var grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
    grad.addColorStop(0, '#697a59'); grad.addColorStop(0.2, '#546547');
    grad.addColorStop(0.8, '#3c4931'); grad.addColorStop(1, '#29341f');
    ctx.fillStyle = grad; drawRoundRect(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
    var topGrad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + 6);
    topGrad.addColorStop(0, '#78c348'); topGrad.addColorStop(1, '#589939');
    ctx.fillStyle = topGrad; drawRoundRect(pl.x, pl.y, pl.w, 6, 3); ctx.fill();
    ctx.strokeStyle = '#7ac44a'; ctx.lineWidth = 1;
    for (var gx = pl.x + 6; gx < pl.x + pl.w - 4; gx += 10) {
      var w2 = Math.sin(t / 500 + gx * 0.04) * 2.5;
      ctx.beginPath(); ctx.moveTo(gx, pl.y); ctx.quadraticCurveTo(gx + w2, pl.y - 4, gx + w2 + 1, pl.y - 6); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.6;
    for (var gx2 = pl.x + TILE; gx2 < pl.x + pl.w; gx2 += TILE) {
      ctx.beginPath(); ctx.moveTo(gx2, pl.y + 6); ctx.lineTo(gx2, pl.y + pl.h); ctx.stroke();
    }
  }

  function drawPlatformFalling(pl) {
    var grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
    grad.addColorStop(0, '#8b6e4e'); grad.addColorStop(0.5, '#6b4e2e'); grad.addColorStop(1, '#4b3018');
    ctx.fillStyle = grad; drawRoundRect(pl.x, pl.y, pl.w, pl.h, 2); ctx.fill();
    ctx.strokeStyle = pl.falling ? '#ff6644' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = pl.falling ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(pl.x + 8, pl.y + 4); ctx.lineTo(pl.x + pl.w * 0.4, pl.y + pl.h * 0.7); ctx.lineTo(pl.x + pl.w - 8, pl.y + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pl.x + pl.w * 0.6, pl.y + 2); ctx.lineTo(pl.x + pl.w * 0.3, pl.y + pl.h - 4); ctx.stroke();
    if (pl.falling && pl.fallTimer > 0) {
      ctx.fillStyle = 'rgba(255,80,40,' + (0.15 + Math.sin(Date.now() / 50) * 0.1) + ')';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.fillStyle = 'rgba(139,110,78,0.5)';
      for (var i = 0; i < 3; i++) ctx.fillRect(pl.x + Math.random() * pl.w, pl.y + pl.h + Math.random() * 8, 2, 2);
    }
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(pl.x + 6, pl.y + pl.h / 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pl.x + pl.w - 6, pl.y + pl.h / 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(pl.x + 6, pl.y + pl.h / 2 - 0.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pl.x + pl.w - 6, pl.y + pl.h / 2 - 0.5, 1, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlatformVanish(pl, t) {
    var alpha = pl.vanishTimer ? Math.max(0.2, 1 - (pl.vanishTimer || 0) / 40) : 1;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#8866cc'; ctx.shadowBlur = 8 + Math.sin(t / 200) * 4;
    var grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
    grad.addColorStop(0, '#9977dd'); grad.addColorStop(1, '#5533aa');
    ctx.fillStyle = grad; drawRoundRect(pl.x, pl.y, pl.w, pl.h, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ddccff';
    for (var i = 0; i < 4; i++) {
      var sx = pl.x + ((t / 40 + i * pl.w / 4) % pl.w);
      var sy = pl.y + Math.sin(t / 200 + i * 2) * 3 + pl.h / 2;
      var ss = 1.5 + Math.sin(t / 100 + i) * 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,180,255,' + (alpha * 0.6) + ')';
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  function drawPlatformIce(pl, t) {
    var grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
    grad.addColorStop(0, 'rgba(180,220,255,0.9)'); grad.addColorStop(0.5, 'rgba(120,180,240,0.85)'); grad.addColorStop(1, 'rgba(80,140,220,0.8)');
    ctx.fillStyle = grad; drawRoundRect(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; drawRoundRect(pl.x + 2, pl.y + 1, pl.w - 4, pl.h / 3, 2); ctx.fill();
    var shineX = (t / 80) % (pl.w + 20) - 10;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(pl.x + shineX, pl.y + 4); ctx.lineTo(pl.x + shineX + 4, pl.y + pl.h / 2);
    ctx.lineTo(pl.x + shineX, pl.y + pl.h - 4); ctx.lineTo(pl.x + shineX - 4, pl.y + pl.h / 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,230,255,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(pl.x + pl.w * 0.3, pl.y + 4); ctx.lineTo(pl.x + pl.w * 0.35, pl.y + pl.h * 0.6);
    ctx.moveTo(pl.x + pl.w * 0.7, pl.y + 3); ctx.lineTo(pl.x + pl.w * 0.65, pl.y + pl.h * 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,200,255,0.4)'; ctx.lineWidth = 1;
    drawRoundRect(pl.x, pl.y, pl.w, pl.h, 3); ctx.stroke();
  }

  // ===================== TRAP RENDERERS =====================
  function drawSpikes(trap) {
    var numSpikes = Math.max(1, Math.floor(trap.w / 14));
    var sw = trap.w / numSpikes;
    for (var i = 0; i < numSpikes; i++) {
      var sx = trap.x + i * sw;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.moveTo(sx + 2, trap.y + trap.h); ctx.lineTo(sx + sw / 2 + 2, trap.y + 2); ctx.lineTo(sx + sw + 2, trap.y + trap.h); ctx.fill();
      var grad = ctx.createLinearGradient(sx, trap.y + trap.h, sx + sw / 2, trap.y);
      grad.addColorStop(0, '#666'); grad.addColorStop(0.4, '#aaa'); grad.addColorStop(0.6, '#ddd'); grad.addColorStop(0.8, '#bbb'); grad.addColorStop(1, '#eee');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(sx + 1, trap.y + trap.h); ctx.lineTo(sx + sw / 2, trap.y); ctx.lineTo(sx + sw - 1, trap.y + trap.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(sx + 2, trap.y + trap.h - 2); ctx.lineTo(sx + sw / 2, trap.y + 1); ctx.stroke();
      ctx.fillStyle = '#cc2222'; ctx.beginPath(); ctx.arc(sx + sw / 2, trap.y + 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#555'; drawRoundRect(trap.x - 2, trap.y + trap.h - 3, trap.w + 4, 5, 2); ctx.fill();
  }

  function drawLava(trap, t) {
    var phase = t / 400;
    var grad = ctx.createLinearGradient(trap.x, trap.y, trap.x, trap.y + trap.h);
    grad.addColorStop(0, '#ff6600'); grad.addColorStop(0.3, '#ff4400'); grad.addColorStop(0.6, '#cc2200'); grad.addColorStop(1, '#881100');
    ctx.fillStyle = grad; ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    ctx.fillStyle = '#ff8822'; ctx.beginPath(); ctx.moveTo(trap.x, trap.y + 4);
    for (var lx = 0; lx <= trap.w; lx += 4) ctx.lineTo(trap.x + lx, trap.y + Math.sin(phase + lx * 0.08) * 3 + 3);
    ctx.lineTo(trap.x + trap.w, trap.y + trap.h); ctx.lineTo(trap.x, trap.y + trap.h); ctx.closePath(); ctx.fill();
    for (var i = 0; i < 6; i++) {
      var bx = trap.x + ((i * 41 + phase * 15) % trap.w);
      var by = trap.y + 4 + Math.sin(phase * 2 + i * 1.5) * (trap.h / 3);
      var br = 3 + Math.sin(phase * 3 + i) * 2;
      var bG = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bG.addColorStop(0, 'rgba(255,255,100,0.8)'); bG.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = bG; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    var hG = ctx.createLinearGradient(trap.x, trap.y - 20, trap.x, trap.y + 5);
    hG.addColorStop(0, 'rgba(255,100,0,0)'); hG.addColorStop(1, 'rgba(255,100,0,0.25)');
    ctx.fillStyle = hG; ctx.fillRect(trap.x, trap.y - 20, trap.w, 25);
    for (var i2 = 0; i2 < 4; i2++) {
      var ex = trap.x + ((i2 * 53 + t / 5) % trap.w);
      var ey = trap.y - ((t / 3 + i2 * 30) % 40);
      var ea = Math.max(0, 1 - ((t / 3 + i2 * 30) % 40) / 40);
      ctx.fillStyle = 'rgba(255,200,50,' + (ea * 0.7) + ')';
      ctx.beginPath(); ctx.arc(ex, ey, 1.5 * ea, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCannon(trap) {
    var tx = trap.x, ty = trap.y, tw = trap.w, th = trap.h, d = trap.dir || 1;
    ctx.fillStyle = '#444'; drawRoundRect(tx - 2, ty + th - 8, tw + 4, 10, 3); ctx.fill();
    var bodyGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
    bodyGrad.addColorStop(0, '#6a6a6a'); bodyGrad.addColorStop(0.3, '#888'); bodyGrad.addColorStop(0.7, '#555'); bodyGrad.addColorStop(1, '#444');
    ctx.fillStyle = bodyGrad; drawRoundRect(tx, ty + 2, tw, th - 6, 5); ctx.fill();
    var barrelX = d === 1 ? tx + tw - 2 : tx - 14;
    var barrelGrad = ctx.createLinearGradient(barrelX, ty + 6, barrelX, ty + th - 6);
    barrelGrad.addColorStop(0, '#777'); barrelGrad.addColorStop(0.5, '#999'); barrelGrad.addColorStop(1, '#555');
    ctx.fillStyle = barrelGrad; drawRoundRect(barrelX, ty + 6, 16, th - 12, 3); ctx.fill();
    var openX = d === 1 ? barrelX + 14 : barrelX + 2;
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(openX, ty + th / 2, 5, 0, Math.PI * 2); ctx.fill();
    if ((trap.timer || 0) % 90 < 6) {
      var flashX = d === 1 ? barrelX + 18 : barrelX - 4;
      var fG = ctx.createRadialGradient(flashX, ty + th / 2, 0, flashX, ty + th / 2, 14);
      fG.addColorStop(0, 'rgba(255,255,200,0.9)'); fG.addColorStop(0.3, 'rgba(255,200,50,0.6)'); fG.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = fG; ctx.beginPath(); ctx.arc(flashX, ty + th / 2, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(tx + 5, ty + 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + tw - 5, ty + 6, 2, 0, Math.PI * 2); ctx.fill();
    if (trap.projectiles) {
      for (var p = 0; p < trap.projectiles.length; p++) {
        var proj = trap.projectiles[p];
        if (proj.trail && proj.trail.length > 1) {
          ctx.strokeStyle = 'rgba(255,100,0,0.3)'; ctx.lineWidth = 3;
          ctx.beginPath();
          for (var ti = 0; ti < proj.trail.length; ti++) {
            if (ti === 0) ctx.moveTo(proj.trail[ti].x, proj.trail[ti].y);
            else ctx.lineTo(proj.trail[ti].x, proj.trail[ti].y);
          }
          ctx.stroke();
        }
        var cG = ctx.createRadialGradient(proj.x - 1, proj.y - 1, 0, proj.x, proj.y, 7);
        cG.addColorStop(0, '#666'); cG.addColorStop(0.6, '#333'); cG.addColorStop(1, '#111');
        ctx.fillStyle = cG; ctx.beginPath(); ctx.arc(proj.x, proj.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,100,0,0.3)'; ctx.beginPath(); ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(proj.x - 2, proj.y - 2, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawCrusher(trap) {
    var cy = trap.crushY || 0;
    ctx.strokeStyle = '#666'; ctx.lineWidth = 4; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(trap.x + trap.w / 2, 0); ctx.lineTo(trap.x + trap.w / 2, cy); ctx.stroke();
    ctx.setLineDash([]);
    var grad = ctx.createLinearGradient(trap.x, cy, trap.x, cy + trap.h);
    grad.addColorStop(0, '#777'); grad.addColorStop(0.5, '#999'); grad.addColorStop(1, '#555');
    ctx.fillStyle = grad; drawRoundRect(trap.x, cy, trap.w, trap.h, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(trap.x + 3, cy + 3, trap.w - 6, trap.h / 3);
    ctx.fillStyle = '#aaa';
    var toothW = 8;
    for (var i = 0; i < trap.w / toothW; i++) {
      ctx.beginPath(); ctx.moveTo(trap.x + i * toothW, cy + trap.h); ctx.lineTo(trap.x + i * toothW + toothW / 2, cy + trap.h + 10); ctx.lineTo(trap.x + (i + 1) * toothW, cy + trap.h); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8;
    for (var i2 = 0; i2 < trap.w / toothW; i2++) {
      ctx.beginPath(); ctx.moveTo(trap.x + i2 * toothW + 1, cy + trap.h); ctx.lineTo(trap.x + i2 * toothW + toothW / 2, cy + trap.h + 9); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,200,0,0.15)';
    for (var sy = cy + 4; sy < cy + trap.h - 4; sy += 8) ctx.fillRect(trap.x + 4, sy, trap.w - 8, 3);
    ctx.fillStyle = '#bbb';
    ctx.beginPath(); ctx.arc(trap.x + 8, cy + trap.h / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(trap.x + trap.w - 8, cy + trap.h / 2, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawFakeExit(trap, t) {
    var glow = Math.sin(t / 200) * 0.2 + 0.8;
    ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 10 * glow;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(trap.x - 4, trap.y - 4, trap.w + 8, trap.h + 8);
    var dG = ctx.createLinearGradient(trap.x, trap.y, trap.x + trap.w, trap.y);
    dG.addColorStop(0, '#55cc55'); dG.addColorStop(0.5, '#66ee66'); dG.addColorStop(1, '#55cc55');
    ctx.fillStyle = dG; ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 1.5;
    ctx.strokeRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h / 2 - 6);
    ctx.strokeRect(trap.x + 4, trap.y + trap.h / 2 + 2, trap.w - 8, trap.h / 2 - 6);
    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(trap.x + trap.w - 8, trap.y + trap.h / 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddaa00'; ctx.beginPath(); ctx.arc(trap.x + trap.w - 8, trap.y + trap.h / 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('EXIT', trap.x + trap.w / 2, trap.y + trap.h / 2 + 4);
    ctx.fillStyle = 'rgba(255,255,0,' + glow + ')'; ctx.font = '16px Arial';
    ctx.fillText('▼', trap.x + trap.w / 2, trap.y - 8);
  }

  function drawRealExit(ex, t) {
    var glow = Math.sin(t / 250) * 0.15 + 0.85;
    var pG = ctx.createRadialGradient(ex.x + 20, ex.y + 25, 5, ex.x + 20, ex.y + 25, 35);
    pG.addColorStop(0, 'rgba(40,180,40,' + (glow * 0.4) + ')'); pG.addColorStop(1, 'rgba(40,180,40,0)');
    ctx.fillStyle = pG; ctx.fillRect(ex.x - 15, ex.y - 10, 70, 70);
    var fG = ctx.createLinearGradient(ex.x - 4, ex.y, ex.x + 44, ex.y);
    fG.addColorStop(0, '#5a3a1a'); fG.addColorStop(0.5, '#6b4a2a'); fG.addColorStop(1, '#5a3a1a');
    ctx.fillStyle = fG; ctx.fillRect(ex.x - 4, ex.y - 6, 48, 58);
    var dG = ctx.createLinearGradient(ex.x, ex.y, ex.x + 40, ex.y);
    dG.addColorStop(0, '#228833'); dG.addColorStop(0.5, '#33aa44'); dG.addColorStop(1, '#228833');
    ctx.fillStyle = dG; ctx.fillRect(ex.x, ex.y, 40, 50);
    ctx.strokeStyle = '#1a6628'; ctx.lineWidth = 1;
    ctx.strokeRect(ex.x + 4, ex.y + 4, 14, 18); ctx.strokeRect(ex.x + 22, ex.y + 4, 14, 18);
    ctx.strokeRect(ex.x + 4, ex.y + 26, 14, 18); ctx.strokeRect(ex.x + 22, ex.y + 26, 14, 18);
    ctx.fillStyle = '#ddaa22'; ctx.beginPath(); ctx.arc(ex.x + 34, ex.y + 26, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc2222'; drawRoundRect(ex.x + 4, ex.y - 14, 32, 10, 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex.x + 20, ex.y - 6);
  }

  function drawTrollSign(trap) {
    ctx.fillStyle = '#6b4226'; ctx.fillRect(trap.x + trap.w / 2 - 3, trap.y + trap.h, 6, 24);
    var bG = ctx.createLinearGradient(trap.x - 15, trap.y, trap.x + trap.w + 15, trap.y + trap.h);
    bG.addColorStop(0, '#d4b87a'); bG.addColorStop(0.5, '#e8d4a0'); bG.addColorStop(1, '#d4b87a');
    ctx.fillStyle = bG; drawRoundRect(trap.x - 15, trap.y - 2, trap.w + 30, trap.h + 4, 3); ctx.fill();
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2; drawRoundRect(trap.x - 15, trap.y - 2, trap.w + 30, trap.h + 4, 3); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(trap.x - 8, trap.y + trap.h / 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(trap.x + trap.w + 8, trap.y + trap.h / 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc4400'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⚠', trap.x + trap.w / 2, trap.y + trap.h / 2 + 4);
  }

  function drawTeleport(trap, t) {
    var phase = t / 150;
    for (var r = 0; r < 3; r++) {
      var ringR = (trap.w / 2 + 5) + r * 6;
      ctx.strokeStyle = 'rgba(170,68,255,' + (0.3 - r * 0.08) + ')'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(trap.x + trap.w / 2, trap.y + trap.h / 2, ringR + Math.sin(phase + r) * 3, (trap.h / 2 + 5) + Math.cos(phase + r) * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    var pG = ctx.createRadialGradient(trap.x + trap.w / 2, trap.y + trap.h / 2, 2, trap.x + trap.w / 2, trap.y + trap.h / 2, trap.w / 2 + 3);
    pG.addColorStop(0, 'rgba(220,160,255,0.9)'); pG.addColorStop(0.5, 'rgba(130,50,200,0.7)'); pG.addColorStop(1, 'rgba(80,20,150,0.3)');
    ctx.fillStyle = pG; ctx.beginPath(); ctx.ellipse(trap.x + trap.w / 2, trap.y + trap.h / 2, trap.w / 2, trap.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    for (var i = 0; i < 5; i++) {
      var angle = phase * 2 + (i * Math.PI * 2 / 5);
      var dist = trap.w / 4 + Math.sin(phase + i) * 3;
      var sx = trap.x + trap.w / 2 + Math.cos(angle) * dist;
      var sy = trap.y + trap.h / 2 + Math.sin(angle) * dist * 0.7;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(phase + i) * 0.3) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText('?', trap.x + trap.w / 2, trap.y + trap.h / 2 + 6);
  }

  function drawSpring(trap) {
    var compressed = trap.springed;
    var baseY = trap.y + (compressed ? -8 : 0);
    var totalH = trap.h + (compressed ? 8 : 0);
    ctx.fillStyle = '#666'; drawRoundRect(trap.x - 2, trap.y + trap.h - 3, trap.w + 4, 5, 2); ctx.fill();
    ctx.strokeStyle = compressed ? '#ffaa00' : '#ccaa44'; ctx.lineWidth = 2.5;
    var coils = 4, coilH = (totalH - 4) / coils;
    for (var c = 0; c < coils; c++) {
      var cy2 = baseY + 2 + c * coilH;
      ctx.beginPath(); ctx.moveTo(trap.x + 2, cy2);
      ctx.quadraticCurveTo(trap.x + trap.w / 2, cy2 + coilH * 0.5, trap.x + trap.w - 2, cy2); ctx.stroke();
    }
    var tG = ctx.createLinearGradient(trap.x, baseY, trap.x, baseY + 6);
    tG.addColorStop(0, compressed ? '#ff4444' : '#cc3333'); tG.addColorStop(1, compressed ? '#cc2222' : '#991111');
    ctx.fillStyle = tG; drawRoundRect(trap.x - 1, baseY, trap.w + 2, 6, 2); ctx.fill();
    if (!compressed) {
      ctx.fillStyle = 'rgba(255,255,100,0.5)'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('▲', trap.x + trap.w / 2, baseY - 4);
    }
  }

  function drawReverseZone(trap, t) {
    var phase = t / 300;
    ctx.fillStyle = 'rgba(255,80,80,0.08)'; ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    ctx.strokeStyle = 'rgba(255,100,100,0.3)'; ctx.lineWidth = 1.5;
    for (var ay = trap.y + 15; ay < trap.y + trap.h - 10; ay += 25) {
      var off = Math.sin(phase + ay * 0.02) * 5;
      ctx.beginPath();
      ctx.moveTo(trap.x + trap.w / 2 + off + 8, ay);
      ctx.lineTo(trap.x + trap.w / 2 + off, ay + 6);
      ctx.lineTo(trap.x + trap.w / 2 + off - 8, ay); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,80,80,0.25)'; ctx.setLineDash([4, 6]);
    ctx.strokeRect(trap.x, trap.y, trap.w, trap.h); ctx.setLineDash([]);
  }

  function drawGravityFlip(trap, t) {
    var phase = t / 200;
    ctx.fillStyle = 'rgba(180,80,255,0.06)'; ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    for (var i = 0; i < 6; i++) {
      var py = trap.y + trap.h - ((t / 3 + i * (trap.h / 6)) % trap.h);
      var px = trap.x + trap.w / 2 + Math.sin(phase + i * 2) * 10;
      var pa = 0.5 - (trap.y + trap.h - py) / trap.h * 0.5;
      ctx.fillStyle = 'rgba(200,150,255,' + pa + ')';
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(180,80,255,0.2)'; ctx.setLineDash([3, 5]);
    ctx.strokeRect(trap.x, trap.y, trap.w, trap.h); ctx.setLineDash([]);
  }

  // ===================== BACKGROUND =====================
  function drawBackground(bg1, bg2, camX, t) {
    var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, bg1); skyGrad.addColorStop(1, bg2);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 80; i++) {
      var sx = ((i * 73.7 + 42 * 13.3) % (W + 100)) - (camX * 0.02) % W;
      var sy = ((i * 37.3 + 42 * 7.7) % (H * 0.6));
      var tw = Math.sin(t / 500 + i * 2.3) * 0.5 + 0.5;
      var sz = 0.5 + (i % 3) * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,' + (tw * 0.7) + ')';
      ctx.beginPath(); ctx.arc(((sx % W) + W) % W, sy, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,30,60,0.4)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (var mx = 0; mx <= W; mx += 2) {
      var mh = Math.sin((mx + camX * 0.03) * 0.008) * 80 + Math.sin((mx + camX * 0.03) * 0.015) * 40 + H * 0.55;
      ctx.lineTo(mx, mh);
    } ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,40,0.5)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (var mx2 = 0; mx2 <= W; mx2 += 2) {
      var mh2 = Math.sin((mx2 + camX * 0.06) * 0.012) * 50 + Math.sin((mx2 + camX * 0.06) * 0.025) * 30 + H * 0.7;
      ctx.lineTo(mx2, mh2);
    } ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,70,0.15)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (var mx3 = 0; mx3 <= W; mx3 += 3) {
      var mh3 = Math.sin((mx3 + camX * 0.1 + t / 800) * 0.02) * 20 + H * 0.85;
      ctx.lineTo(mx3, mh3);
    } ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (var i2 = 0; i2 < 12; i2++) {
      var dx = ((i2 * 97 + t / 40) % (W + 40)) - 20;
      var dy = ((i2 * 63 + t / 60) % (H * 0.7)) + 30;
      var da = 0.15 + Math.sin(t / 300 + i2) * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,' + da + ')';
      ctx.beginPath(); ctx.arc(dx, dy, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ===================== LEVEL GENERATOR =====================
  function generateLevel(n) {
    var platforms = [], traps = [];
    var bgThemes = [
      ['#0a0a1e','#1a1a3e'],['#0c1528','#1a2a48'],['#0a0820','#181640'],
      ['#140a28','#2a1a58'],['#1a1040','#30206a'],['#0c1a2a','#1a3048'],
      ['#080c18','#101828'],['#1a0a0a','#381818'],['#0a1a0a','#183818'],
      ['#1a1a0a','#383818']
    ];
    platforms.push({ x: 0, y: H - TILE, w: W * 3, h: TILE, type: 'solid' });
    var spawnX = 60, spawnY = H - TILE - PH - 2;
    var exitX = W * 2.5, exitY = H - TILE - 50;

    if (n === 1) {
      platforms.push({ x: 200, y: H - 120, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 340, y: H - 180, w: 70, h: TILE, type: 'fake' });
      platforms.push({ x: 330, y: H - 280, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 500, y: H - 200, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 650, y: H - 140, w: 70, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 780, y: H - 220, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 940, y: H - 160, w: 70, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1080, y: H - 240, w: 90, h: TILE, type: 'solid' });
      platforms.push({ x: 1250, y: H - 180, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 150, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 440, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 700, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 850, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1050, y: H - TILE - 16, w: 40, h: 16, type: 'spike', active: true });
      traps.push({ x: 1180, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 0, y: H - 180, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 780, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 460, y: H - 180, w: 60, h: 30, type: 'troll_sign', active: true, message: TROLL_SIGNS[0] });
      traps.push({ x: 900, y: H - 200, w: 50, h: 20, type: 'troll_sign', active: true, message: "Almost there! Just kidding 😈" });
      exitX = 1300; exitY = H - 180 - 50;
    } else if (n === 2) {
      platforms.push({ x: 180, y: H - 130, w: 70, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 310, y: H - 200, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 440, y: H - 150, w: 65, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 560, y: H - 230, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 700, y: H - 170, w: 65, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 830, y: H - 250, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 960, y: H - 180, w: 65, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1100, y: H - 260, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 1280, y: H - 200, w: 70, h: TILE, type: 'fake' });
      platforms.push({ x: 1260, y: H - 320, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 1430, y: H - 240, w: 90, h: TILE, type: 'solid' });
      traps.push({ x: 1310, y: H - 200 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 700, y: H - 170 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 250, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 380, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 620, y: H - TILE - 16, w: 60, h: 16, type: 'spike', active: true });
      traps.push({ x: 780, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1050, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1200, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 0, y: H - 220, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 280, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 350, y: H - 260, w: 50, h: 20, type: 'troll_sign', active: true, message: "The exit is right there! → (it's not)" });
      exitX = 1480; exitY = H - 240 - 50;
    } else if (n === 3) {
      platforms.push({ x: 160, y: H - 120, w: 70, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 300, y: H - 190, w: 60, h: TILE, type: 'fake' });
      platforms.push({ x: 290, y: H - 290, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 430, y: H - 200, w: 65, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 560, y: H - 260, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 690, y: H - 180, w: 60, h: TILE, type: 'fake' });
      platforms.push({ x: 680, y: H - 310, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 820, y: H - 240, w: 65, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 960, y: H - 300, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 1100, y: H - 200, w: 60, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1230, y: H - 260, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 230, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 380, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 600, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 760, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 900, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1060, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 560, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 960, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 0, y: H - 260, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 260, y: H - 220, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[4] });
      traps.push({ x: 780, y: H - 350, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[1] });
      exitX = 1280; exitY = H - 260 - 50;
    } else if (n === 4) {
      platforms.push({ x: 150, y: H - 130, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 310, y: H - 210, w: 70, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 460, y: H - 160, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 600, y: H - 250, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 760, y: H - 300, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 920, y: H - 200, w: 70, h: TILE, type: 'ice' });
      platforms.push({ x: 1080, y: H - 270, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 1230, y: H - 350, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 420, y: 50, w: 120, h: TILE, type: 'solid' });
      platforms.push({ x: 650, y: 40, w: 100, h: TILE, type: 'solid' });
      platforms.push({ x: 880, y: 60, w: 100, h: TILE, type: 'solid' });
      traps.push({ x: 400, y: H - 300, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 650, y: 80, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 880, y: H - 250, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 300, y: H - TILE - 16, w: 60, h: 16, type: 'spike', active: true });
      traps.push({ x: 560, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 850, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1050, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 500, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 750, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 0, y: H - 200, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.5, y: H - 300, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 460, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1080, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 680, y: H - TILE, w: 150, h: TILE, type: 'lava', active: true });
      exitX = 1280; exitY = H - 350 - 50;
    } else if (n === 5) {
      platforms.push({ x: 140, y: H - 100, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 270, y: H - 180, w: 60, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 400, y: H - 130, w: 60, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 520, y: H - 230, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 660, y: H - 160, w: 60, h: TILE, type: 'ice' });
      platforms.push({ x: 790, y: H - 250, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 930, y: H - 180, w: 60, h: TILE, type: 'fake' });
      platforms.push({ x: 920, y: H - 320, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 1060, y: H - 250, w: 60, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1200, y: H - 310, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 1370, y: H - 240, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 660, y: H - 210, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 960, y: H - 320 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1230, y: H - 310 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 700, y: H - 200, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 1100, y: H - 280, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 530, y: H - 230 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 800, y: H - 250 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 200, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 350, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 580, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 850, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1000, y: H - TILE - 16, w: 60, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1180, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 0, y: H - 250, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.5, y: 60, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 520, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1200, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 450, y: H - 200, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[3] });
      traps.push({ x: 1100, y: H - 350, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[5] });
      exitX = 1420; exitY = H - 240 - 50;
    } else if (n === 6) {
      platforms.push({ x: 150, y: H - 130, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 300, y: H - 210, w: 60, h: TILE, type: 'ice' });
      platforms.push({ x: 450, y: H - 270, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 620, y: H - 190, w: 60, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 770, y: H - 260, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 930, y: H - 190, w: 60, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1080, y: H - 280, w: 70, h: TILE, type: 'solid' });
      platforms.push({ x: 1240, y: H - 200, w: 60, h: TILE, type: 'ice' });
      platforms.push({ x: 1380, y: H - 280, w: 90, h: TILE, type: 'solid' });
      traps.push({ x: 0, y: H - 200, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 350, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 250, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.2, y: 50, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 400, y: 30, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 350, y: H - 250, w: 80, h: 150, type: 'reverse_zone', active: true });
      traps.push({ x: 850, y: H - 230, w: 80, h: 150, type: 'reverse_zone', active: true });
      traps.push({ x: 220, y: H - TILE - 16, w: 70, h: 16, type: 'spike', active: true });
      traps.push({ x: 520, y: H - TILE - 16, w: 80, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 700, y: H - TILE - 16, w: 60, h: 16, type: 'spike', active: true });
      traps.push({ x: 1000, y: H - TILE - 16, w: 70, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1160, y: H - TILE - 16, w: 60, h: 16, type: 'spike', active: true });
      traps.push({ x: 450, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 770, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1080, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1270, y: H - 200 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 450, y: H - 310, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[6] });
      traps.push({ x: 550, y: H - TILE, w: 120, h: TILE, type: 'lava', active: true });
      exitX = 1430; exitY = H - 280 - 50;
    } else if (n === 7) {
      platforms.push({ x: 150, y: H - 120, w: 65, h: TILE, type: 'ice' });
      platforms.push({ x: 280, y: H - 190, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 400, y: H - 250, w: 70, h: TILE, type: 'ice' });
      platforms.push({ x: 540, y: H - 170, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 670, y: H - 240, w: 60, h: TILE, type: 'ice' });
      platforms.push({ x: 800, y: H - 310, w: 65, h: TILE, type: 'solid' });
      platforms.push({ x: 940, y: H - 200, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 1070, y: H - 270, w: 60, h: TILE, type: 'ice' });
      platforms.push({ x: 1200, y: H - 190, w: 55, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1340, y: H - 260, w: 70, h: TILE, type: 'ice' });
      platforms.push({ x: 1480, y: H - 200, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 160, y: H - 120 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 410, y: H - 250 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 680, y: H - 240 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1080, y: H - 270 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 230, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 350, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 480, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 610, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 750, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 880, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1020, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1150, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1300, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 0, y: H - 250, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.8, y: H - 200, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 400, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 800, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 850, y: H - TILE, w: 80, h: TILE, type: 'lava', active: true });
      traps.push({ x: 400, y: H - 290, w: 50, h: 20, type: 'troll_sign', active: true, message: "Careful, it's slippery! SLIDE TO YOUR DEATH 🧊" });
      traps.push({ x: 1000, y: H - 310, w: 50, h: 20, type: 'troll_sign', active: true, message: "You're still alive? Impressive... 😤" });
      exitX = 1520; exitY = H - 200 - 50;
    } else if (n === 8) {
      platforms.push({ x: 100, y: H - 100, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 230, y: H - 180, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 360, y: H - 250, w: 55, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 490, y: H - 160, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 620, y: H - 240, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 760, y: H - 310, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 900, y: H - 200, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1040, y: H - 280, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 1180, y: H - 190, w: 50, h: TILE, type: 'fake' });
      platforms.push({ x: 1170, y: H - 340, w: 55, h: TILE, type: 'solid' });
      platforms.push({ x: 1320, y: H - 270, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1460, y: H - 340, w: 60, h: TILE, type: 'solid' });
      platforms.push({ x: 1620, y: H - 400, w: 60, h: TILE, type: 'solid' });
      traps.push({ x: 230, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 490, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 760, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1040, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1320, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1460, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 0, y: H - 180, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 300, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 400, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 250, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 370, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.3, y: 35, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 170, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 310, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 450, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 600, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 730, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 880, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1100, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1280, y: H - TILE - 16, w: 50, h: 16, type: 'spike', active: true });
      traps.push({ x: 1400, y: H - TILE - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 625, y: H - 240 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1045, y: H - 280 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1210, y: H - 340 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1490, y: H - 340 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 700, y: H - 350, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 1100, y: H - 320, w: 80, h: 180, type: 'reverse_zone', active: true });
      traps.push({ x: 110, y: H - 100 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1050, y: H - 280 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 150, y: H - TILE, w: 200, h: TILE, type: 'lava', active: true });
      traps.push({ x: 500, y: H - TILE, w: 200, h: TILE, type: 'lava', active: true });
      traps.push({ x: 850, y: H - TILE, w: 200, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1200, y: H - TILE, w: 200, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1350, y: H - 300, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 650, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 500, y: H - 290, w: 50, h: 20, type: 'troll_sign', active: true, message: "Look up! Or don't. 😈" });
      traps.push({ x: 1200, y: H - 380, w: 50, h: 20, type: 'troll_sign', active: true, message: "Almost gave up yet? 🤣" });
      exitX = 1660; exitY = H - 400 - 50;
    } else if (n === 9) {
      platforms.push({ x: 140, y: H - 110, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 270, y: H - 190, w: 50, h: TILE, type: 'fake' });
      platforms.push({ x: 260, y: H - 310, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 390, y: H - 220, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 520, y: H - 160, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 650, y: H - 260, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 780, y: H - 330, w: 55, h: TILE, type: 'solid' });
      platforms.push({ x: 910, y: H - 200, w: 50, h: TILE, type: 'fake' });
      platforms.push({ x: 900, y: H - 380, w: 55, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1040, y: H - 290, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 1170, y: H - 200, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1300, y: H - 280, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1440, y: H - 350, w: 55, h: TILE, type: 'ice' });
      platforms.push({ x: 1580, y: H - 270, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1720, y: H - 380, w: 60, h: TILE, type: 'solid' });
      platforms.push({ x: 580, y: 45, w: 100, h: TILE, type: 'solid' });
      platforms.push({ x: 1000, y: 50, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 80, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 350, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 620, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 890, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1160, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1430, y: H - TILE, w: 220, h: TILE, type: 'lava', active: true });
      traps.push({ x: 300, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 570, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 840, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1110, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1380, y: H - TILE - 16, w: 40, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 265, y: H - 310 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1045, y: H - 290 - 16, w: 45, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1445, y: H - 350 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 270, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 520, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 780, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1170, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1580, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 0, y: H - 200, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 340, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: 70, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 280, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2, y: H - 400, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.5, y: 40, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 550, y: H - 220, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 1000, y: H - 320, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 850, y: H - 280, w: 80, h: 180, type: 'reverse_zone', active: true });
      traps.push({ x: 1350, y: H - 320, w: 80, h: 180, type: 'reverse_zone', active: true });
      traps.push({ x: 810, y: H - 330 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1330, y: H - 280 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1610, y: H - 270 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 530, y: H - 160 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1050, y: H - 290 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1450, y: H - 350 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 700, y: H - 280, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 1250, y: H - 250, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 540, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 960, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 200, y: H - 250, w: 50, h: 20, type: 'troll_sign', active: true, message: TROLL_SIGNS[8] });
      traps.push({ x: 1000, y: H - 420, w: 50, h: 20, type: 'troll_sign', active: true, message: "Level 10 will destroy you 💀" });
      traps.push({ x: 1500, y: H - 400, w: 50, h: 20, type: 'troll_sign', active: true, message: "$100 reward awaits... so does death 😈" });
      exitX = 1760; exitY = H - 380 - 50;
    } else if (n === 10) {
      platforms.push({ x: 120, y: H - 100, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 240, y: H - 180, w: 45, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 360, y: H - 250, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 470, y: H - 160, w: 45, h: TILE, type: 'fake' });
      platforms.push({ x: 460, y: H - 320, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 580, y: H - 240, w: 45, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 700, y: H - 310, w: 50, h: TILE, type: 'solid' });
      platforms.push({ x: 820, y: H - 180, w: 45, h: TILE, type: 'fake' });
      platforms.push({ x: 810, y: H - 370, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 940, y: H - 280, w: 45, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1060, y: H - 350, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 1180, y: H - 220, w: 45, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1300, y: H - 300, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1420, y: H - 370, w: 45, h: TILE, type: 'ice' });
      platforms.push({ x: 1550, y: H - 250, w: 45, h: TILE, type: 'fake' });
      platforms.push({ x: 1540, y: H - 410, w: 50, h: TILE, type: 'falling', fallTimer: 0 });
      platforms.push({ x: 1670, y: H - 330, w: 50, h: TILE, type: 'vanish', vanished: false, vanishTimer: 0 });
      platforms.push({ x: 1800, y: H - 400, w: 55, h: TILE, type: 'solid' });
      platforms.push({ x: 1950, y: H - 300, w: 50, h: TILE, type: 'ice' });
      platforms.push({ x: 2100, y: H - 370, w: 60, h: TILE, type: 'solid' });
      platforms.push({ x: 700, y: 40, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 1060, y: 50, w: 80, h: TILE, type: 'solid' });
      platforms.push({ x: 1420, y: 40, w: 80, h: TILE, type: 'solid' });
      traps.push({ x: 50, y: H - TILE, w: 350, h: TILE, type: 'lava', active: true });
      traps.push({ x: 400, y: H - TILE, w: 350, h: TILE, type: 'lava', active: true });
      traps.push({ x: 750, y: H - TILE, w: 350, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1100, y: H - TILE, w: 350, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1450, y: H - TILE, w: 350, h: TILE, type: 'lava', active: true });
      traps.push({ x: 1800, y: H - TILE, w: 400, h: TILE, type: 'lava', active: true });
      traps.push({ x: 240, y: H - 180 - 16, w: 45, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 580, y: H - 240 - 16, w: 45, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 940, y: H - 280 - 16, w: 45, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1300, y: H - 300 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1670, y: H - 330 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 1950, y: H - 300 - 16, w: 50, h: 16, type: 'invisible_spike', active: true });
      traps.push({ x: 0, y: H - 150, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 280, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: H - 400, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: 0, y: 60, w: 30, h: 30, type: 'cannon', active: true, dir: 1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2.5, y: H - 200, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 2.5, y: H - 350, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.5, y: 30, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: W * 1.8, y: H - 430, w: 30, h: 30, type: 'cannon', active: true, dir: -1, timer: 0, projectiles: [] });
      traps.push({ x: 240, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 460, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 700, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 940, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1180, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1540, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 1800, y: 0, w: 60, h: 50, type: 'crusher', active: true, crushY: 0, crushDir: 1, timer: 0 });
      traps.push({ x: 680, y: H - 350, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 1040, y: H - 380, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 1400, y: H - 400, w: 60, h: 200, type: 'gravity_flip', active: true });
      traps.push({ x: 500, y: H - 350, w: 80, h: 200, type: 'reverse_zone', active: true });
      traps.push({ x: 1200, y: H - 350, w: 80, h: 200, type: 'reverse_zone', active: true });
      traps.push({ x: 1850, y: H - 350, w: 80, h: 200, type: 'reverse_zone', active: true });
      traps.push({ x: 730, y: H - 310 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1090, y: H - 350 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1450, y: H - 370 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1580, y: H - 410 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1830, y: H - 400 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 1980, y: H - 300 - 50, w: 40, h: 50, type: 'fake_exit', active: true });
      traps.push({ x: 850, y: H - 300, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 1550, y: H - 350, w: 30, h: 40, type: 'teleport', active: true });
      traps.push({ x: 130, y: H - 100 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 470, y: H - 320 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1070, y: H - 350 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 1960, y: H - 300 - 20, w: 24, h: 20, type: 'spring_trap', active: true, springed: false });
      traps.push({ x: 650, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 1000, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 1360, y: 0, w: 80, h: 16, type: 'spike', active: true });
      traps.push({ x: 600, y: H - 280, w: 50, h: 20, type: 'troll_sign', active: true, message: "$100 reward is OURS 💰😈" });
      traps.push({ x: 1100, y: H - 400, w: 50, h: 20, type: 'troll_sign', active: true, message: "Only 10 spots for $100... is yours taken? 💀" });
      traps.push({ x: 1600, y: H - 450, w: 50, h: 20, type: 'troll_sign', active: true, message: "$100 reward stays with us 🤣" });
      traps.push({ x: 2050, y: H - 410, w: 50, h: 20, type: 'troll_sign', active: true, message: "So close to $100... JK 😈" });
      exitX = 2150; exitY = H - 370 - 50;
    }

    var pair = bgThemes[n - 1] || bgThemes[0];
    return {
      platforms: platforms, traps: traps,
      spawn: { x: spawnX, y: spawnY }, exit: { x: exitX, y: exitY },
      bgColor1: pair[0], bgColor2: pair[1],
      name: LEVEL_NAMES[n - 1] || ('Level ' + n),
      trollMessage: n === 1 ? "Welcome! Nothing can go wrong here... 😇" : undefined
    };
  }

  // ===================== PARTICLES =====================
  function spawnP(x, y, count, color, type) {
    type = type || 'circle';
    for (var i = 0; i < count; i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 30 + Math.random() * 30,
        maxLife: 30 + Math.random() * 30,
        color: color, size: 2 + Math.random() * 4, type: type,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  // ===================== PLAYER KILL =====================
  function killPlayer(reason) {
    var p = player;
    if (p.dead) return;
    lastDeathPos = { x: p.x, y: p.y };
    p.dead = true; p.vy = -8;
    spawnP(p.x + PW / 2, p.y + PH / 2, 25, '#ff4444', 'spark');
    spawnP(p.x + PW / 2, p.y + PH / 2, 10, '#ff8800', 'ember');
    shake = { i: 10, t: 25 };
    deathMessage = reason || DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    deathCount++;
    totalDeaths++;
    localStorage.setItem('trollRageDeaths', String(totalDeaths));
    player.deathCount++;
    setTimeout(function () { setGameState('dead'); }, 800);
  }

  // ===================== LEVEL INIT =====================
  function initLevel(lvl) {
    level = generateLevel(lvl);
    player = makePlayer();
    player.x = level.spawn.x; player.y = level.spawn.y;
    player.deathCount = (lvl === currentLevel) ? player.deathCount : 0;
    particles = []; cam = { x: 0, y: 0 }; shake = { i: 0, t: 0 }; troll = null;
    level.platforms.forEach(function (pl) {
      if (pl.type === 'falling') { pl.falling = false; pl.fallTimer = 0; pl.shakeX = 0; }
      if (pl.type === 'vanish') { pl.vanished = false; pl.vanishTimer = 0; }
    });
    level.traps.forEach(function (t) {
      if (t.type === 'crusher') { t.crushY = 0; t.crushDir = 1; t.timer = 0; }
      if (t.type === 'cannon') { t.timer = 0; t.projectiles = []; }
      if (t.type === 'spring_trap') { t.springed = false; }
      t.revealed = false;
    });
    currentLevel = lvl;
    if (level.trollMessage) showTrollPopup(level.trollMessage);
  }

  // ===================== UI HELPERS =====================
  function showOverlay(id) {
    document.querySelectorAll('.rfl-overlay').forEach(function (el) { el.classList.add('hidden'); });
    document.getElementById(id).classList.remove('hidden');
  }

  function hideAllOverlays() {
    document.querySelectorAll('.rfl-overlay').forEach(function (el) { el.classList.add('hidden'); });
  }

  function showTrollPopup(msg) {
    var el = document.getElementById('rflTrollPopup');
    var txt = document.getElementById('rflTrollPopupText');
    txt.textContent = msg; el.classList.remove('hidden');
    if (trollPopupTimer) clearTimeout(trollPopupTimer);
    trollPopupTimer = setTimeout(function () { el.classList.add('hidden'); }, 3000);
  }

  function renderLevelGrid() {
    var grid = document.getElementById('rflLevelGrid');
    var html = '';
    for (var l = 1; l <= TOTAL_LEVELS; l++) {
      var locked = l > unlockedLevel;
      html += '<button class="rfl-level-btn" ' + (locked ? 'disabled' : '') +
        ' onclick="RFL.selectLevel(' + l + ')">' + (locked ? '🔒' : l) + '</button>';
    }
    grid.innerHTML = html;
  }

  function setGameState(state) {
    gameState = state;
    if (animId) { cancelAnimationFrame(animId); animId = 0; }

    var canvasEl = document.getElementById('rflCanvas');
    canvasEl.classList.toggle('menu-mode', state !== 'playing');

    if (state === 'menu') {
      document.getElementById('rflTotalDeaths').textContent = totalDeaths;
      renderLevelGrid();
      loadChampionInfo();
      showOverlay('rflMenu');
    } else if (state === 'playing') {
      hideAllOverlays();
      startLoop();
    } else if (state === 'dead') {
      hearts--;
      var emojis = ['🤣', '😂', '💀', '🫵', '😈', '🤡', '👻', '😹'];
      document.getElementById('rflDeadEmoji').textContent = emojis[deathCount % emojis.length];
      document.getElementById('rflDeathMsg').textContent = deathMessage;
      document.getElementById('rflDeathCount').textContent = 'Deaths: ' + deathCount;
      // Show hearts
      var hStr = '';
      for (var hi = 0; hi < 5; hi++) hStr += hi < hearts ? '❤️' : '🖤';
      document.getElementById('rflHeartsDead').textContent = hStr;
      if (hearts <= 0) {
        // Level failed — show failed screen
        setTimeout(function () { setGameState('levelFailed'); }, 600);
      } else {
        showOverlay('rflDead');
      }
    } else if (state === 'levelComplete') {
      document.getElementById('rflLevelCompleteTitle').textContent = 'Level ' + currentLevel + ' Complete!';
      document.getElementById('rflLevelCompleteDeaths').textContent = 'Deaths: ' + deathCount;
      var quip = deathCount === 0 ? "Wait, ZERO deaths?! Are you cheating? 🤨"
        : deathCount < 5 ? "Not bad... the next level will fix that 😈"
        : deathCount < 15 ? "That was painful to watch 😬"
        : "My sides hurt from laughing 🤣";
      document.getElementById('rflLevelCompleteQuip').textContent = quip;
      var fc = document.getElementById('rflFinalChallenge');
      fc.classList.toggle('hidden', currentLevel !== 9);
      var nextBtn = document.getElementById('rflNextBtn');
      nextBtn.textContent = currentLevel === 9 ? '🔥 Accept $100 Reward Challenge 🔥' : 'Next Level (more pain awaits)';
      showOverlay('rflLevelComplete');
    } else if (state === 'gameComplete') {
      document.getElementById('rflFinalDeaths').textContent = totalDeaths;
      var fq = totalDeaths > 100 ? "Over 100 deaths... was it worth it?"
        : totalDeaths > 50 ? "50+ deaths. Impressive stubbornness."
        : totalDeaths > 20 ? "Under 50 deaths? Respect. 🫡"
        : "Under 20 deaths?! You're actually good. 😤";
      document.getElementById('rflFinalQuip').textContent = fq;
      // Submit score to server
      submitGameScore();
      showOverlay('rflGameComplete');
    }
  }

  function submitGameScore() {
    // Submit score to the server API
    try {
      var points = Math.max(15, 90 - totalDeaths * 1);
      if (typeof api === 'function') {
        api('/api/games/score', {
          method: 'POST',
          body: JSON.stringify({
            gameId: 'run-for-life',
            score: TOTAL_LEVELS - deathCount,
            levelsCompleted: currentLevel,
            pointsEarned: points
          })
        }).then(function (data) {
          if (typeof showToast === 'function') showToast('+' + points + ' points earned!', 'success');
          // Check if player won the $100 champion reward
          if (data && data.rflChampion) {
            var cBanner = document.getElementById('rflChampionBanner');
            if (cBanner) {
              document.getElementById('rflChampSlot').textContent = '#' + data.rflChampion.slot;
              document.getElementById('rflChampBonus').textContent = '+' + data.rflChampion.bonus.toLocaleString();
              cBanner.classList.remove('hidden');
            }
            if (typeof showToast === 'function') showToast('🏆 CHAMPION #' + data.rflChampion.slot + ' — $100 REWARD!', 'success');
          }
        }).catch(function () { /* ignore */ });
      }
    } catch (e) { /* ignore errors */ }
  }

  function loadChampionInfo() {
    try {
      if (typeof api === 'function') {
        fetch('/api/rfl-champions').then(function(r) { return r.json(); }).then(function(data) {
          var el = document.getElementById('rflSpotsInfo');
          if (el && data) {
            if (data.spotsRemaining > 0) {
              el.textContent = data.spotsRemaining + '/3 spots remaining!';
              el.style.color = data.spotsRemaining <= 1 ? '#f87171' : '#4ade80';
            } else {
              el.textContent = 'All 3 spots claimed!';
              el.style.color = '#f87171';
            }
          }
        }).catch(function() {});
      }
    } catch(e) {}
  }

  // ===================== GAME LOOP =====================
  function startLoop() {
    function loop() {
      if (gameState !== 'playing') return;
      if (!canvas || !ctx) return;
      var p = player;
      var platforms = level.platforms;
      var traps = level.traps;
      time++;

      if (!p.dead) {
        // Movement
        var moveDir = 0;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) moveDir = 1;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveDir = -1;
        if (p.reversed) moveDir = -moveDir;
        var isOnIce = platforms.some(function (pl) {
          return pl.type === 'ice' && !pl.vanished &&
            p.x + PW > pl.x && p.x < pl.x + pl.w &&
            Math.abs((p.y + PH) - pl.y) < 4;
        });
        if (isOnIce) { p.vx += moveDir * 0.3; p.vx *= 0.98; }
        else { p.vx = moveDir * PLAYER_SPEED; }
        p.x += p.vx;
        var grav = p.gravFlipped ? -GRAVITY : GRAVITY;
        p.vy += grav;
        if (p.vy > 15) p.vy = 15;
        if (p.vy < -15) p.vy = -15;
        p.y += p.vy;
        p.squash += (1 - p.squash) * 0.15;
        p.stretch += (1 - p.stretch) * 0.15;
        if (p.onGround && Math.abs(p.vx) > 1) {
          p.runParticleTimer++;
          if (p.runParticleTimer % 4 === 0) spawnP(p.x + PW / 2, p.y + PH, 1, 'rgba(150,130,100,0.4)', 'smoke');
        }
        if (p.landTimer > 0) p.landTimer--;

        // Platform collisions
        var wasOnGround = p.onGround;
        p.onGround = false;
        for (var pi = 0; pi < platforms.length; pi++) {
          var pl = platforms[pi];
          if (pl.type === 'fake') continue;
          if (pl.vanished) continue;
          if (p.x + PW > pl.x && p.x < pl.x + pl.w) {
            if (!p.gravFlipped) {
              if (p.vy >= 0 && p.y + PH >= pl.y && p.y + PH <= pl.y + p.vy + 8) {
                p.y = pl.y - PH; p.vy = 0; p.onGround = true; p.jumpCount = 0;
                if (!wasOnGround) { p.squash = 1.3; p.stretch = 0.7; p.landTimer = 8; spawnP(p.x + PW / 2, p.y + PH, 4, 'rgba(180,160,120,0.4)', 'smoke'); }
                if (pl.type === 'falling' && !pl.falling) { pl.falling = true; pl.fallTimer = 30; pl.shakeX = 0; }
                if (pl.type === 'vanish' && !pl.vanished) {
                  pl.vanishTimer = (pl.vanishTimer || 0) + 1;
                  if (pl.vanishTimer > 40) { pl.vanished = true; spawnP(pl.x + pl.w / 2, pl.y, 12, '#aaaaff', 'spark'); }
                }
              }
              if (p.vy < 0 && p.y <= pl.y + pl.h && p.y >= pl.y + pl.h + p.vy - 4) { p.y = pl.y + pl.h; p.vy = 0; }
            } else {
              if (p.vy <= 0 && p.y <= pl.y + pl.h && p.y >= pl.y + pl.h + p.vy - 8) {
                p.y = pl.y + pl.h; p.vy = 0; p.onGround = true; p.jumpCount = 0;
              }
            }
            if (p.y + PH > pl.y + 4 && p.y < pl.y + pl.h - 4) {
              if (p.vx > 0 && p.x + PW > pl.x && p.x < pl.x) p.x = pl.x - PW;
              if (p.vx < 0 && p.x < pl.x + pl.w && p.x + PW > pl.x + pl.w) p.x = pl.x + pl.w;
            }
          }
        }

        // Falling platforms update
        for (var fi = 0; fi < platforms.length; fi++) {
          var fpl = platforms[fi];
          if (fpl.type === 'falling' && fpl.falling) {
            if (fpl.fallTimer > 0) { fpl.fallTimer--; fpl.shakeX = (Math.random() - 0.5) * 4; }
            else { fpl.y += 4; if (fpl.y > H + 100) { fpl.falling = false; fpl.y = -1000; } }
          }
        }

        if (p.y > H + 50 || p.y < -100) { killPlayer("Gravity is not your friend today 🕳️"); return; }
        if (p.x < 0) p.x = 0;

        // Trap collisions
        p.reversed = false;
        for (var ti2 = 0; ti2 < traps.length; ti2++) {
          var trap = traps[ti2];
          if (!trap.active) continue;
          var hit = p.x + PW > trap.x && p.x < trap.x + trap.w && p.y + PH > trap.y && p.y < trap.y + trap.h;
          if (trap.type === 'spike') { if (hit) { killPlayer(); return; } }
          else if (trap.type === 'invisible_spike') {
            if (hit) { trap.revealed = true; killPlayer("INVISIBLE SPIKES! Did I forget to mention those? 😈"); return; }
            if (Math.abs(p.x - trap.x) < 60) trap.revealed = true;
          }
          else if (trap.type === 'fake_exit') { if (hit) { spawnP(trap.x + trap.w / 2, trap.y + trap.h / 2, 20, '#ffff00', 'spark'); killPlayer("FAKE EXIT! You really thought it'd be that easy? 🤣"); return; } }
          else if (trap.type === 'reverse_zone') {
            if (hit) { p.reversed = true; if (!troll || troll.timer <= 0) troll = { msg: "CONTROLS REVERSED! 🔄", timer: 60, opacity: 1 }; }
          }
          else if (trap.type === 'gravity_flip') {
            if (hit && !p.gravFlipped) {
              p.gravFlipped = true; p.vy = -5;
              spawnP(p.x + PW / 2, p.y + PH / 2, 15, '#ff88ff', 'spark');
              shake = { i: 4, t: 12 };
              troll = { msg: "GRAVITY FLIPPED! 🙃", timer: 90, opacity: 1 };
            } else if (p.gravFlipped && !hit && Math.abs(p.x - trap.x) > 200) {
              p.gravFlipped = false; spawnP(p.x + PW / 2, p.y + PH / 2, 10, '#ff88ff', 'spark');
            }
          }
          else if (trap.type === 'teleport') {
            if (hit) {
              p.x = level.spawn.x + 100; p.y = level.spawn.y; p.vx = 0; p.vy = 0;
              spawnP(trap.x + trap.w / 2, trap.y + trap.h / 2, 20, '#aa44ff', 'spark');
              spawnP(p.x + PW / 2, p.y + PH / 2, 20, '#aa44ff', 'spark');
              shake = { i: 6, t: 18 };
              troll = { msg: "TELEPORTED! Back to start! 🎪", timer: 120, opacity: 1 };
            }
          }
          else if (trap.type === 'crusher') {
            trap.timer = (trap.timer || 0) + 1;
            if (trap.crushDir === 1) { trap.crushY = (trap.crushY || 0) + 2.5; if (trap.crushY > H - 80) { trap.crushDir = -1; shake = { i: 5, t: 10 }; spawnP(trap.x + trap.w / 2, trap.crushY + trap.h, 8, 'rgba(150,150,150,0.5)', 'smoke'); } }
            else { trap.crushY = (trap.crushY || 0) - 1.5; if (trap.crushY < 0) trap.crushDir = 1; }
            if (p.x + PW > trap.x && p.x < trap.x + trap.w && p.y + PH > trap.crushY && p.y < trap.crushY + trap.h) {
              killPlayer("CRUSHED! That's gotta hurt 🫠"); return;
            }
          }
          else if (trap.type === 'cannon') {
            trap.timer = (trap.timer || 0) + 1;
            if (trap.timer % 90 === 0) {
              trap.projectiles = trap.projectiles || [];
              trap.projectiles.push({
                x: trap.x + (trap.dir === 1 ? trap.w : 0),
                y: trap.y + trap.h / 2 - 4,
                vx: trap.dir * 5, vy: 0, trail: []
              });
            }
            if (trap.projectiles) {
              for (var pp = trap.projectiles.length - 1; pp >= 0; pp--) {
                var proj = trap.projectiles[pp];
                proj.trail.push({ x: proj.x, y: proj.y });
                if (proj.trail.length > 8) proj.trail.shift();
                proj.x += proj.vx; proj.y += proj.vy;
                if (p.x + PW > proj.x - 7 && p.x < proj.x + 7 && p.y + PH > proj.y - 7 && p.y < proj.y + 7) {
                  killPlayer("Cannonball says hi! 💣"); return;
                }
                if (proj.x < -50 || proj.x > W * 3 || proj.y < -50 || proj.y > H + 50) trap.projectiles.splice(pp, 1);
              }
            }
          }
          else if (trap.type === 'spring_trap') {
            if (hit && !trap.springed) {
              trap.springed = true; p.vy = p.gravFlipped ? 18 : -18; p.onGround = false;
              p.squash = 0.6; p.stretch = 1.5;
              spawnP(trap.x + trap.w / 2, trap.y, 10, '#ffcc00', 'spark');
              troll = { msg: "BOING!! 🦘", timer: 60, opacity: 1 };
              setTimeout(function () { trap.springed = false; }, 2000);
            }
          }
          else if (trap.type === 'lava') { if (hit) { killPlayer("That's LAVA! What did you expect?! 🌋"); return; } }
          else if (trap.type === 'troll_sign') {
            if (Math.abs(p.x - trap.x) < 80 && Math.abs(p.y - trap.y) < 80) {
              if (!troll || troll.timer <= 0) troll = { msg: trap.message || "...", timer: 120, opacity: 1 };
            }
          }
        }

        // Check real exit
        var ex = level.exit;
        if (p.x + PW > ex.x && p.x < ex.x + 40 && p.y + PH > ex.y && p.y < ex.y + 50) {
          p.won = true;
          spawnP(ex.x + 20, ex.y + 25, 40, '#44ff44', 'spark');
          spawnP(ex.x + 20, ex.y + 25, 15, '#ffff00', 'ember');
          shake = { i: 3, t: 15 };
          if (currentLevel >= unlockedLevel) {
            unlockedLevel = currentLevel + 1;
            localStorage.setItem('trollUnlockedLevel', String(unlockedLevel));
          }
          if (currentLevel >= TOTAL_LEVELS) setTimeout(function () { setGameState('gameComplete'); }, 500);
          else setTimeout(function () { setGameState('levelComplete'); }, 500);
          return;
        }

        // Animation
        p.frameTimer++;
        if (p.frameTimer > 6) { p.frameTimer = 0; p.frameIndex = (p.frameIndex + 1) % 4; }
        if (p.vx > 0.1) p.facingRight = true;
        if (p.vx < -0.1) p.facingRight = false;
      }

      // Troll popup
      if (troll) {
        troll.timer--;
        if (troll.timer < 20) troll.opacity = troll.timer / 20;
        if (troll.timer <= 0) troll = null;
      }

      // Particles
      for (var ip = particles.length - 1; ip >= 0; ip--) {
        var pt = particles[ip];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vy += pt.type === 'smoke' ? -0.02 : pt.type === 'ember' ? -0.05 : 0.15;
        pt.vx *= 0.98;
        pt.rotation = (pt.rotation || 0) + (pt.rotSpeed || 0);
        pt.life--;
        if (pt.life <= 0) particles.splice(ip, 1);
      }

      if (shake.t > 0) shake.t--;

      // Camera
      var tcx = p.x - W / 3;
      var tcy = Math.max(0, p.y - H / 2);
      cam.x += (tcx - cam.x) * 0.1;
      cam.y += (tcy - cam.y) * 0.05;
      if (cam.x < 0) cam.x = 0;

      // ========== RENDER ==========
      ctx.save();
      var sx = 0, sy = 0;
      if (shake.t > 0) { sx = (Math.random() - 0.5) * shake.i; sy = (Math.random() - 0.5) * shake.i; }
      ctx.translate(sx, sy);
      drawBackground(level.bgColor1, level.bgColor2, cam.x, time);
      ctx.save(); ctx.translate(-cam.x, 0);

      // Platforms
      for (var dpi = 0; dpi < platforms.length; dpi++) {
        var dpl = platforms[dpi];
        if (dpl.vanished) continue;
        ctx.save();
        if (dpl.shakeX) ctx.translate(dpl.shakeX, 0);
        if (dpl.type === 'solid') drawPlatformSolid(dpl, time);
        else if (dpl.type === 'fake') drawPlatformFake(dpl, time);
        else if (dpl.type === 'falling') drawPlatformFalling(dpl);
        else if (dpl.type === 'vanish') drawPlatformVanish(dpl, time);
        else if (dpl.type === 'ice') drawPlatformIce(dpl, time);
        ctx.restore();
      }

      // Traps
      for (var dti = 0; dti < traps.length; dti++) {
        var dtrap = traps[dti];
        if (!dtrap.active) continue;
        if (dtrap.type === 'spike') drawSpikes(dtrap);
        else if (dtrap.type === 'invisible_spike') { if (dtrap.revealed) { ctx.globalAlpha = 0.7; drawSpikes(dtrap); ctx.globalAlpha = 1; } }
        else if (dtrap.type === 'fake_exit') drawFakeExit(dtrap, time);
        else if (dtrap.type === 'reverse_zone') drawReverseZone(dtrap, time);
        else if (dtrap.type === 'gravity_flip') drawGravityFlip(dtrap, time);
        else if (dtrap.type === 'teleport') drawTeleport(dtrap, time);
        else if (dtrap.type === 'crusher') drawCrusher(dtrap);
        else if (dtrap.type === 'cannon') drawCannon(dtrap);
        else if (dtrap.type === 'spring_trap') drawSpring(dtrap);
        else if (dtrap.type === 'lava') drawLava(dtrap, time);
        else if (dtrap.type === 'troll_sign') drawTrollSign(dtrap);
      }

      // Exit
      drawRealExit(level.exit, time);

      // Player
      if (!p.dead || p.vy !== 0) drawPlayer(p, time);

      // Particles render
      for (var rpi = 0; rpi < particles.length; rpi++) {
        var rpt = particles[rpi];
        var alpha = rpt.life / rpt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.save(); ctx.translate(rpt.x, rpt.y);
        if (rpt.rotation) ctx.rotate(rpt.rotation);
        if (rpt.type === 'circle') {
          ctx.fillStyle = rpt.color; ctx.beginPath(); ctx.arc(0, 0, rpt.size, 0, Math.PI * 2); ctx.fill();
        } else if (rpt.type === 'square') {
          ctx.fillStyle = rpt.color; ctx.fillRect(-rpt.size / 2, -rpt.size / 2, rpt.size, rpt.size);
        } else if (rpt.type === 'spark') {
          var sG = ctx.createRadialGradient(0, 0, 0, 0, 0, rpt.size);
          sG.addColorStop(0, rpt.color); sG.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sG; ctx.beginPath(); ctx.arc(0, 0, rpt.size * 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, rpt.size * 0.3, 0, Math.PI * 2); ctx.fill();
        } else if (rpt.type === 'smoke') {
          var smG = ctx.createRadialGradient(0, 0, 0, 0, 0, rpt.size * 2);
          smG.addColorStop(0, rpt.color); smG.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = smG; ctx.beginPath(); ctx.arc(0, 0, rpt.size * 2, 0, Math.PI * 2); ctx.fill();
        } else if (rpt.type === 'ember') {
          ctx.fillStyle = rpt.color; ctx.beginPath(); ctx.arc(0, 0, rpt.size * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,200,' + alpha + ')'; ctx.beginPath(); ctx.arc(0, 0, rpt.size * 0.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }

      ctx.restore(); // camera

      // HUD
      var hudGrad = ctx.createLinearGradient(0, 0, 0, 40);
      hudGrad.addColorStop(0, 'rgba(0,0,0,0.7)'); hudGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hudGrad; ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Inter, Arial, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('Level ' + currentLevel + ': ' + level.name, 12, 25);
      if (currentLevel === 10) {
        var pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(234,179,8,0.25)';
        drawRoundRect(W / 2 - 110, 36, 220, 22, 6); ctx.fill();
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fde047'; ctx.font = 'bold 12px Inter, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🏆 CLEAR = $100 REWARD (First 3 Players!) 🏆', W / 2, 51);
      }
      ctx.textAlign = 'right'; ctx.font = 'bold 14px Inter, Arial, sans-serif'; ctx.fillStyle = '#ff6666';
      ctx.fillText('💀 ' + player.deathCount, W - 12, 25);

      // Troll in-game popup
      if (troll && troll.timer > 0) {
        ctx.globalAlpha = troll.opacity;
        var tw2 = ctx.measureText(troll.msg).width + 40;
        drawRoundRect(W / 2 - tw2 / 2, H / 2 - 54, tw2, 38, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 15px Inter, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(troll.msg, W / 2, H / 2 - 30);
        ctx.globalAlpha = 1;
      }

      // Controls hint
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '10px Inter, Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('← → / AD Move  |  SPACE / ↑ Jump  |  Double Jump Available', W / 2, H - 8);

      ctx.restore();
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }

  // ===================== KEYBOARD =====================
  function onKeyDown(e) {
    keys[e.key] = true;
    if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && gameState === 'playing') {
      e.preventDefault();
      var p = player;
      if (!p.dead && (p.onGround || p.jumpCount < 2)) {
        p.vy = p.gravFlipped ? -JUMP_FORCE : JUMP_FORCE;
        p.onGround = false; p.jumpCount++;
        p.squash = 0.7; p.stretch = 1.3;
        spawnP(p.x + PW / 2, p.y + PH, 6, 'rgba(255,255,255,0.5)', 'smoke');
      }
    }
  }
  function onKeyUp(e) { delete keys[e.key]; }

  // ===================== TOUCH =====================
  function onTouchStart(e) {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    if (gameState === 'playing') {
      var p = player;
      if (!p.dead && (p.onGround || p.jumpCount < 2)) {
        p.vy = p.gravFlipped ? -JUMP_FORCE : JUMP_FORCE;
        p.onGround = false; p.jumpCount++;
        p.squash = 0.7; p.stretch = 1.3;
        spawnP(p.x + PW / 2, p.y + PH, 6, 'rgba(255,255,255,0.5)', 'smoke');
      }
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    var dx = e.touches[0].clientX - touchStartX;
    if (dx > 20) { keys['ArrowRight'] = true; delete keys['ArrowLeft']; }
    else if (dx < -20) { keys['ArrowLeft'] = true; delete keys['ArrowRight']; }
  }
  function onTouchEnd(e) {
    e.preventDefault();
    delete keys['ArrowRight']; delete keys['ArrowLeft'];
  }

  // ===================== PUBLIC API =====================
  return {
    init: function () {
      canvas = document.getElementById('rflCanvas');
      ctx = canvas.getContext('2d');
      canvas.width = W; canvas.height = H;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });
      totalDeaths = parseInt(localStorage.getItem('trollRageDeaths') || '0');
      unlockedLevel = parseInt(localStorage.getItem('trollUnlockedLevel') || '1');
      setGameState('menu');
    },
    startGame: function () {
      initLevel(1); deathCount = 0; player.deathCount = 0;
      setGameState('playing');
    },
    retryLevel: function () {
      hearts = 5; deathCount = 0; player.deathCount = 0;
      initLevel(currentLevel);
      setGameState('playing');
    },
    goNext: function () {
      if (currentLevel + 1 <= TOTAL_LEVELS) {
        hearts = 5; deathCount = 0; player.deathCount = 0;
        initLevel(currentLevel + 1);
        setGameState('playing');
      }
    },
    selectLevel: function (l) {
      if (l > unlockedLevel) return;
      initLevel(l); player.deathCount = 0;
      deathCount = 0; hearts = 5;
      setGameState('playing');
    },
    showMenu: function () {
      setGameState('menu');
    },
    // TODO: Ad functions — add when AdSense is ready
    // watchAdForLife: function () { ... },
    // skipAd: function () { ... }
  };
})();
