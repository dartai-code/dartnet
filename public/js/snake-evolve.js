/* ==============================================
   SNAKE EVOLVE – DartNet Flagship Game
   Eat · Evolve · Kill · Dominate
   Smooth canvas arena with AI snakes, evolution,
   kill feed, and local leaderboard.
   ============================================== */
var SE = (function () {
  'use strict';

  // ═══════════════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════════════
  var ARENA = 1500;
  var SEG_GAP = 5;          // trail sample gap in px
  var DRAW_GAP = 3;         // draw every N-th trail point
  var BASE_SPEED = 2.6;
  var BOOST_MULT = 1.8;
  var TURN_RATE = 0.09;
  var AI_TURN = 0.065;
  var MAX_FOOD = 50;
  var AI_COUNT = 4;
  var WALL_THICK = 12;

  var EVO = [
    { name:'WORM',   icon:'🐛', food:0,  r:5,  glow:0,  mult:1,  speed:1 },
    { name:'SNAKE',  icon:'🐍', food:8,  r:7,  glow:6,  mult:1.5,speed:1.05 },
    { name:'VIPER',  icon:'🐍', food:20, r:9,  glow:12, mult:2,  speed:1.1 },
    { name:'COBRA',  icon:'🐲', food:35, r:11, glow:16, mult:3,  speed:1.15 },
    { name:'DRAGON', icon:'🐉', food:55, r:13, glow:22, mult:5,  speed:1.2 }
  ];

  var EVO_COLORS = [
    ['#86efac','#4ade80'],
    ['#4ade80','#16a34a'],
    ['#c084fc','#7c3aed'],
    ['#fb923c','#dc2626'],
    ['#fde047','#f59e0b']
  ];

  var AI_NAMES = ['Blue Viper','Red Mamba','Orange Cobra','Purple Python'];
  var AI_COLORS = [
    ['#93c5fd','#3b82f6'],
    ['#fca5a5','#ef4444'],
    ['#fdba74','#f97316'],
    ['#d8b4fe','#a855f7']
  ];

  var FOOD_DEF = {
    normal:  {color:'#4ade80',r:5, score:10, growth:1 },
    golden:  {color:'#fbbf24',r:7, score:50, growth:3 },
    crystal: {color:'#67e8f9',r:6, score:30, growth:2, evo:true},
    poison:  {color:'#c084fc',r:5, score:-30,growth:-3,poison:true}
  };
  var FOOD_WEIGHTS = [
    {type:'normal',w:78},{type:'golden',w:12},{type:'crystal',w:5},{type:'poison',w:5}
  ];

  // ═══════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════
  var canvas, ctx, W, H, dpr;
  var STATE = 'menu';
  var player, ais, foods, particles, killMsgs;
  var camera = {x:0,y:0};
  var score, kills;
  var bestScore;
  var submitted;
  var animFrame;

  // Input
  var steerX, steerY, isSteering;
  var boostActive = false;
  var keysDown = {};

  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════
  function init() {
    canvas = document.getElementById('seCanvas');
    ctx = canvas.getContext('2d');
    bestScore = parseInt(localStorage.getItem('se_best') || '0', 10);
    resize();
    window.addEventListener('resize', resize);
    setupInput();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ═══════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════
  function setupInput() {
    // Pointer (touch + mouse)
    canvas.addEventListener('pointerdown', function (e) {
      isSteering = true;
      steerX = e.clientX; steerY = e.clientY;
    });
    canvas.addEventListener('pointermove', function (e) {
      steerX = e.clientX; steerY = e.clientY;
      if (e.pointerType === 'mouse') isSteering = true;
    });
    canvas.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'mouse') isSteering = false;
    });
    canvas.addEventListener('pointercancel', function () { isSteering = false; });

    // Boost button
    var bb = document.getElementById('seBoost');
    bb.addEventListener('pointerdown', function (e) { e.stopPropagation(); boostActive = true; bb.classList.add('active'); });
    bb.addEventListener('pointerup', function () { boostActive = false; bb.classList.remove('active'); });
    bb.addEventListener('pointerleave', function () { boostActive = false; bb.classList.remove('active'); });
    bb.addEventListener('pointercancel', function () { boostActive = false; bb.classList.remove('active'); });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      keysDown[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); boostActive = true; document.getElementById('seBoost').classList.add('active'); }
    });
    document.addEventListener('keyup', function (e) {
      keysDown[e.code] = false;
      if (e.code === 'Space') { boostActive = false; document.getElementById('seBoost').classList.remove('active'); }
    });
  }

  // ═══════════════════════════════════════
  //  START GAME
  // ═══════════════════════════════════════
  function start() {
    score = 0; kills = 0; submitted = false;
    particles = [];
    killMsgs = [];
    foods = [];

    // Player
    player = makeSnake(ARENA/2, ARENA/2, 0, EVO_COLORS[0], 15);
    player.isPlayer = true;

    // AI
    ais = [];
    for (var i = 0; i < AI_COUNT; i++) {
      ais.push(spawnAI(i));
    }

    // Food
    for (var f = 0; f < MAX_FOOD; f++) foods.push(makeFood());

    STATE = 'playing';
    document.getElementById('seHud').style.display = '';
    hideOv('seMenu'); hideOv('seDeath'); hideOv('seLb');
    updateHUD();
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  function makeSnake(x, y, angle, colors, len) {
    var trail = [];
    for (var i = 0; i < len * SEG_GAP; i++) {
      trail.push({x: x - Math.cos(angle) * i, y: y - Math.sin(angle) * i});
    }
    return {
      trail: trail,
      angle: angle,
      length: len,
      foodEaten: 0,
      evo: 0,
      speed: BASE_SPEED,
      colors: colors,
      alive: true,
      kills: 0,
      boosting: false,
      isPlayer: false,
      aiIdx: -1,
      target: null,
      personality: 'passive',
      respawnTimer: 0
    };
  }

  function spawnAI(idx) {
    var edge = 200;
    var x = edge + Math.random() * (ARENA - edge * 2);
    var y = edge + Math.random() * (ARENA - edge * 2);
    var a = Math.random() * Math.PI * 2;
    var s = makeSnake(x, y, a, AI_COLORS[idx], 12 + Math.floor(Math.random() * 8));
    s.aiIdx = idx;
    s.personality = ['passive','aggressive','hunter','passive'][idx];
    return s;
  }

  function makeFood(px, py, type) {
    if (!type) {
      var r = Math.random() * 100, acc = 0;
      for (var i = 0; i < FOOD_WEIGHTS.length; i++) {
        acc += FOOD_WEIGHTS[i].w;
        if (r < acc) { type = FOOD_WEIGHTS[i].type; break; }
      }
    }
    var fd = FOOD_DEF[type];
    return {
      x: px !== undefined ? px : 40 + Math.random() * (ARENA - 80),
      y: py !== undefined ? py : 40 + Math.random() * (ARENA - 80),
      type: type,
      r: fd.r,
      color: fd.color,
      score: fd.score,
      growth: fd.growth,
      evo: fd.evo || false,
      poison: fd.poison || false,
      bob: Math.random() * Math.PI * 2
    };
  }

  // ═══════════════════════════════════════
  //  MAIN LOOP
  // ═══════════════════════════════════════
  function loop() {
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════
  function update() {
    if (STATE !== 'playing') return;

    // ── Player steering ──
    var desiredAngle = player.angle;
    if (isSteering && steerX !== undefined) {
      desiredAngle = Math.atan2(steerY - H / 2, steerX - W / 2);
    }
    if (keysDown['ArrowLeft'] || keysDown['KeyA']) desiredAngle = player.angle - 0.12;
    if (keysDown['ArrowRight'] || keysDown['KeyD']) desiredAngle = player.angle + 0.12;

    player.angle = lerpAngle(player.angle, desiredAngle, TURN_RATE);

    // ── Boost ──
    player.boosting = boostActive && player.length > 15;
    var pSpeed = BASE_SPEED * EVO[player.evo].speed;
    if (player.boosting) {
      pSpeed *= BOOST_MULT;
      player.length = Math.max(15, player.length - 0.08);
      // Boost particles
      var tail = player.trail[player.trail.length - 1];
      if (tail && Math.random() > 0.4) {
        addParticle(tail.x, tail.y, rng(-1,1), rng(-1,1), player.colors[0], 3, 0.6);
      }
    }

    moveSnake(player, pSpeed);

    // ── AI update ──
    for (var a = 0; a < ais.length; a++) {
      var ai = ais[a];
      if (!ai.alive) {
        ai.respawnTimer--;
        if (ai.respawnTimer <= 0) {
          ais[a] = spawnAI(ai.aiIdx);
        }
        continue;
      }
      updateAI(ai);
      var aiSpd = (BASE_SPEED - 0.3) * EVO[ai.evo].speed;
      moveSnake(ai, aiSpd);
    }

    // ── Food collection ──
    checkFoodCollisions(player);
    for (var a2 = 0; a2 < ais.length; a2++) {
      if (ais[a2].alive) checkFoodCollisions(ais[a2]);
    }

    // ── Snake vs snake ──
    // Player head vs AI bodies
    for (var a3 = 0; a3 < ais.length; a3++) {
      if (!ais[a3].alive) continue;
      if (headHitsBody(player, ais[a3])) {
        killSnake(ais[a3], player, AI_NAMES[ais[a3].aiIdx]);
      }
      if (headHitsBody(ais[a3], player)) {
        playerDeath(AI_NAMES[ais[a3].aiIdx] + ' Hit You');
        return;
      }
      // Head-on: bigger wins
      if (headHitsHead(player, ais[a3])) {
        if (player.length > ais[a3].length) {
          killSnake(ais[a3], player, AI_NAMES[ais[a3].aiIdx]);
        } else {
          playerDeath('Head-on with ' + AI_NAMES[ais[a3].aiIdx]);
          return;
        }
      }
    }

    // AI vs AI
    for (var i = 0; i < ais.length; i++) {
      if (!ais[i].alive) continue;
      for (var j = 0; j < ais.length; j++) {
        if (i === j || !ais[j].alive) continue;
        if (headHitsBody(ais[i], ais[j])) {
          addKillMsg(AI_NAMES[ais[i].aiIdx] + ' killed ' + AI_NAMES[ais[j].aiIdx], AI_COLORS[ais[i].aiIdx][0]);
          dropFood(ais[j]);
          deathBurst(ais[j]);
          ais[j].alive = false;
          ais[j].respawnTimer = 180;
          ais[i].kills++;
          ais[i].foodEaten += 3;
          evolveCheck(ais[i]);
        }
      }
    }

    // ── Player self-collision ──
    if (selfCollision(player)) {
      playerDeath('Ate Yourself'); return;
    }

    // ── Player wall collision ──
    var hd = player.trail[0];
    if (hd.x < WALL_THICK || hd.x > ARENA - WALL_THICK ||
        hd.y < WALL_THICK || hd.y > ARENA - WALL_THICK) {
      playerDeath('Hit the Wall'); return;
    }

    // ── AI wall / self collision ──
    for (var a4 = 0; a4 < ais.length; a4++) {
      if (!ais[a4].alive) continue;
      var ahd = ais[a4].trail[0];
      if (ahd.x < WALL_THICK || ahd.x > ARENA - WALL_THICK ||
          ahd.y < WALL_THICK || ahd.y > ARENA - WALL_THICK ||
          selfCollision(ais[a4])) {
        addKillMsg(AI_NAMES[ais[a4].aiIdx] + ' crashed!', '#888');
        dropFood(ais[a4]);
        deathBurst(ais[a4]);
        ais[a4].alive = false;
        ais[a4].respawnTimer = 180;
      }
    }

    // ── Camera ──
    camera.x += (hd.x - W / 2 - camera.x) * 0.12;
    camera.y += (hd.y - H / 2 - camera.y) * 0.12;

    // ── Maintain food count ──
    while (foods.length < MAX_FOOD) foods.push(makeFood());

    // ── Particles ──
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.03;
      pt.life -= 0.025;
      if (pt.life <= 0) particles.splice(p, 1);
    }

    // ── Kill feed cleanup ──
    var now = Date.now();
    for (var k = killMsgs.length - 1; k >= 0; k--) {
      if (now - killMsgs[k].t > 4000) killMsgs.splice(k, 1);
    }
    renderKillFeed();
  }

  // ═══════════════════════════════════════
  //  SNAKE MOVEMENT
  // ═══════════════════════════════════════
  function moveSnake(s, spd) {
    var hx = s.trail[0].x + Math.cos(s.angle) * spd;
    var hy = s.trail[0].y + Math.sin(s.angle) * spd;
    s.trail.unshift({x: hx, y: hy});
    var maxLen = Math.ceil(s.length * SEG_GAP) + SEG_GAP;
    while (s.trail.length > maxLen) s.trail.pop();
  }

  // ═══════════════════════════════════════
  //  AI BEHAVIOR
  // ═══════════════════════════════════════
  function updateAI(ai) {
    var head = ai.trail[0];
    var desired = ai.angle;

    // Wall avoidance (high priority)
    var margin = 100;
    if (head.x < margin) desired = 0;
    else if (head.x > ARENA - margin) desired = Math.PI;
    if (head.y < margin) desired = Math.PI / 2;
    else if (head.y > ARENA - margin) desired = -Math.PI / 2;

    // Find nearest food
    var nearDist = Infinity, nearFood = null;
    for (var f = 0; f < foods.length; f++) {
      var d = dist(head.x, head.y, foods[f].x, foods[f].y);
      if (d < nearDist && !foods[f].poison) { nearDist = d; nearFood = foods[f]; }
    }
    if (nearFood && nearDist < 300) {
      desired = Math.atan2(nearFood.y - head.y, nearFood.x - head.x);
    }

    // Aggressive: try to cut off smaller snakes
    if (ai.personality === 'aggressive' || ai.personality === 'hunter') {
      var target = null, tDist = 400;
      // Check player
      if (player.alive && ai.length > player.length + 5) {
        var pd = dist(head.x, head.y, player.trail[0].x, player.trail[0].y);
        if (pd < tDist) { target = player.trail[0]; tDist = pd; }
      }
      // Check other AIs
      for (var j = 0; j < ais.length; j++) {
        if (ais[j] === ai || !ais[j].alive) continue;
        if (ai.length > ais[j].length + 5) {
          var ad = dist(head.x, head.y, ais[j].trail[0].x, ais[j].trail[0].y);
          if (ad < tDist) { target = ais[j].trail[0]; tDist = ad; }
        }
      }
      if (target) {
        desired = Math.atan2(target.y - head.y, target.x - head.x);
      }
    }

    // Flee from bigger snakes nearby
    if (player.alive && player.length > ai.length + 5) {
      var pd2 = dist(head.x, head.y, player.trail[0].x, player.trail[0].y);
      if (pd2 < 150) {
        desired = Math.atan2(head.y - player.trail[0].y, head.x - player.trail[0].x);
      }
    }

    // Add random wander
    desired += (Math.random() - 0.5) * 0.15;

    ai.angle = lerpAngle(ai.angle, desired, AI_TURN);
  }

  // ═══════════════════════════════════════
  //  FOOD COLLECTION
  // ═══════════════════════════════════════
  function checkFoodCollisions(snake) {
    var hd = snake.trail[0];
    var hr = getEvoStage(snake).r + 4;
    for (var f = foods.length - 1; f >= 0; f--) {
      var food = foods[f];
      if (dist(hd.x, hd.y, food.x, food.y) < hr + food.r) {
        // Eat
        snake.foodEaten += food.growth;
        if (snake.foodEaten < 0) snake.foodEaten = 0;
        snake.length = Math.max(8, snake.length + food.growth);

        if (snake.isPlayer) {
          score += Math.round(food.score * EVO[snake.evo].mult);
          if (food.evo) {
            snake.foodEaten = Math.max(snake.foodEaten, EVO[Math.min(snake.evo + 1, 4)].food);
          }
          evolveCheck(snake);
          updateHUD();
        } else {
          evolveCheck(snake);
        }

        // Particles
        for (var p = 0; p < 6; p++) {
          addParticle(food.x, food.y, rng(-2,2), rng(-2,2), food.color, 3, 0.5);
        }
        foods.splice(f, 1);
      }
    }
  }

  // ═══════════════════════════════════════
  //  COLLISION DETECTION
  // ═══════════════════════════════════════
  function headHitsBody(attacker, victim) {
    if (!attacker.alive || !victim.alive) return false;
    var hd = attacker.trail[0];
    var hr = getEvoStage(attacker).r;
    // Check victim body (skip head area)
    var skip = Math.max(20, SEG_GAP * 4);
    for (var i = skip; i < victim.trail.length; i += DRAW_GAP) {
      var seg = victim.trail[i];
      var sr = getEvoStage(victim).r;
      if (dist(hd.x, hd.y, seg.x, seg.y) < hr + sr - 2) return true;
    }
    return false;
  }

  function headHitsHead(a, b) {
    if (!a.alive || !b.alive) return false;
    var d = dist(a.trail[0].x, a.trail[0].y, b.trail[0].x, b.trail[0].y);
    return d < getEvoStage(a).r + getEvoStage(b).r;
  }

  function selfCollision(snake) {
    var hd = snake.trail[0];
    var hr = getEvoStage(snake).r;
    var skip = Math.max(40, SEG_GAP * 8);
    for (var i = skip; i < snake.trail.length; i += DRAW_GAP) {
      if (dist(hd.x, hd.y, snake.trail[i].x, snake.trail[i].y) < hr * 1.4) return true;
    }
    return false;
  }

  // ═══════════════════════════════════════
  //  KILL / DEATH
  // ═══════════════════════════════════════
  function killSnake(victim, killer, victimName) {
    if (killer.isPlayer) {
      kills++;
      score += Math.round(50 * EVO[killer.evo].mult);
      killer.foodEaten += 5;
      killer.length += 5;
      evolveCheck(killer);
      addKillMsg('You killed ' + victimName + '!', '#4ade80');
      updateHUD();
    }
    dropFood(victim);
    deathBurst(victim);
    victim.alive = false;
    victim.respawnTimer = 200;
  }

  function playerDeath(cause) {
    STATE = 'dead';
    cancelAnimationFrame(animFrame);
    deathBurst(player);
    dropFood(player);
    player.alive = false;

    // Save to leaderboard
    saveLBEntry(score, kills);
    loadChampionStatus();

    var isNew = score > bestScore;
    if (isNew) { bestScore = score; localStorage.setItem('se_best', bestScore); }

    setTimeout(function () {
      document.getElementById('seHud').style.display = 'none';
      document.getElementById('seDeathCause').textContent = cause;
      document.getElementById('seDS').textContent = score;
      document.getElementById('seDK').textContent = kills;
      document.getElementById('seDE').textContent = EVO[player.evo].icon + ' ' + EVO[player.evo].name;
      document.getElementById('seDL').textContent = Math.round(player.length);
      showOv('seDeath');
      submitScore();
    }, 500);
  }

  function dropFood(snake) {
    var count = Math.min(Math.floor(snake.length / 3), 25);
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(i * (snake.trail.length / count));
      if (idx >= snake.trail.length) idx = snake.trail.length - 1;
      var seg = snake.trail[idx];
      foods.push(makeFood(seg.x + rng(-10,10), seg.y + rng(-10,10), 'normal'));
    }
  }

  function deathBurst(snake) {
    var hd = snake.trail[0];
    for (var i = 0; i < 25; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = 2 + Math.random() * 4;
      addParticle(hd.x, hd.y, Math.cos(a)*spd, Math.sin(a)*spd, snake.colors[0], 3 + Math.random()*4, 1.2);
    }
  }

  // ═══════════════════════════════════════
  //  EVOLUTION
  // ═══════════════════════════════════════
  function evolveCheck(snake) {
    var newEvo = 0;
    for (var i = EVO.length - 1; i >= 0; i--) {
      if (snake.foodEaten >= EVO[i].food) { newEvo = i; break; }
    }
    if (newEvo > snake.evo) {
      snake.evo = newEvo;
      if (snake.isPlayer) {
        snake.colors = EVO_COLORS[newEvo];
        showEvoFlash(EVO[newEvo]);
        // Burst
        var hd = snake.trail[0];
        for (var p = 0; p < 30; p++) {
          var a = Math.random() * Math.PI * 2;
          addParticle(hd.x, hd.y, Math.cos(a)*5, Math.sin(a)*5, EVO_COLORS[newEvo][0], 4, 1);
        }
        updateHUD();
      } else {
        // AI evolve: update colors based on evo stage blend
        // Keep their base color but brighten
      }
    }
  }

  function getEvoStage(snake) { return EVO[snake.evo]; }

  function showEvoFlash(evo) {
    var el = document.getElementById('seEvoFlash');
    document.getElementById('seEvoIcon').textContent = evo.icon;
    document.getElementById('seEvoName').textContent = evo.name + '!';
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1500);
  }

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  function render() {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawArena();
    drawFoods();

    // Draw AI first (behind player)
    for (var a = 0; a < ais.length; a++) {
      if (ais[a].alive) drawSnake(ais[a]);
    }
    // Draw player on top
    if (player.alive) drawSnake(player);

    // Particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (pt.life / pt.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawArena() {
    // Background
    ctx.fillStyle = '#080c12';
    ctx.fillRect(camera.x, camera.y, W, H);

    // Grid dots (only visible area)
    var grid = 40;
    var sx = Math.floor(camera.x / grid) * grid;
    var sy = Math.floor(camera.y / grid) * grid;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (var x = sx; x < camera.x + W + grid; x += grid) {
      for (var y = sy; y < camera.y + H + grid; y += grid) {
        if (x >= 0 && x <= ARENA && y >= 0 && y <= ARENA) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }

    // Arena border (glowing wall)
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.lineWidth = WALL_THICK;
    ctx.strokeRect(WALL_THICK / 2, WALL_THICK / 2, ARENA - WALL_THICK, ARENA - WALL_THICK);
    ctx.shadowBlur = 0;

    // Dim outside arena
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    // Top
    ctx.fillRect(camera.x, camera.y, W, -camera.y);
    // Bottom
    ctx.fillRect(camera.x, ARENA, W, camera.y + H - ARENA);
    // Left
    ctx.fillRect(camera.x, 0, -camera.x, ARENA);
    // Right
    ctx.fillRect(ARENA, 0, camera.x + W - ARENA, ARENA);
  }

  function drawFoods() {
    for (var f = 0; f < foods.length; f++) {
      var fd = foods[f];
      // Only draw if visible
      if (fd.x < camera.x - 20 || fd.x > camera.x + W + 20 ||
          fd.y < camera.y - 20 || fd.y > camera.y + H + 20) continue;

      fd.bob += 0.04;
      var by = Math.sin(fd.bob) * 2;
      ctx.fillStyle = fd.color;
      ctx.shadowColor = fd.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(fd.x, fd.y + by, fd.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(fd.x - fd.r * 0.25, fd.y + by - fd.r * 0.25, fd.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSnake(snake) {
    var evo = getEvoStage(snake);
    var baseR = evo.r;
    var trail = snake.trail;
    var total = trail.length;
    var segCount = Math.floor(total / DRAW_GAP);

    // Body segments (tail to head for proper layering)
    for (var i = segCount - 1; i >= 1; i--) {
      var idx = i * DRAW_GAP;
      if (idx >= total) continue;
      var seg = trail[idx];
      // Skip if off screen
      if (seg.x < camera.x - 30 || seg.x > camera.x + W + 30 ||
          seg.y < camera.y - 30 || seg.y > camera.y + H + 30) continue;

      var t = 1 - (i / segCount); // 0 at tail, 1 at head
      var r = baseR * (0.5 + t * 0.5);
      var alpha = 0.5 + t * 0.5;

      // Alternating color pattern
      var col = (i % 2 === 0) ? snake.colors[0] : snake.colors[1];

      ctx.globalAlpha = alpha;
      if (evo.glow > 0) {
        ctx.shadowColor = snake.colors[0];
        ctx.shadowBlur = evo.glow * t;
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(seg.x - r * 0.2, seg.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Head
    var head = trail[0];
    if (head.x < camera.x - 30 || head.x > camera.x + W + 30 ||
        head.y < camera.y - 30 || head.y > camera.y + H + 30) return;

    var hr = baseR * 1.2;

    // Glow
    if (evo.glow > 0) {
      ctx.shadowColor = snake.colors[0];
      ctx.shadowBlur = evo.glow;
    }
    ctx.fillStyle = snake.colors[0];
    ctx.beginPath();
    ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    var eyeOff = hr * 0.4;
    var eyeR = hr * 0.3;
    var ex1 = head.x + Math.cos(snake.angle - 0.5) * eyeOff;
    var ey1 = head.y + Math.sin(snake.angle - 0.5) * eyeOff;
    var ex2 = head.x + Math.cos(snake.angle + 0.5) * eyeOff;
    var ey2 = head.y + Math.sin(snake.angle + 0.5) * eyeOff;

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2); ctx.fill();

    // Pupils
    var px1 = ex1 + Math.cos(snake.angle) * eyeR * 0.35;
    var py1 = ey1 + Math.sin(snake.angle) * eyeR * 0.35;
    var px2 = ex2 + Math.cos(snake.angle) * eyeR * 0.35;
    var py2 = ey2 + Math.sin(snake.angle) * eyeR * 0.35;

    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(px1, py1, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px2, py2, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();

    // Cobra hood (evo >= 3)
    if (snake.evo >= 3) {
      ctx.fillStyle = snake.colors[1];
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(head.x - Math.cos(snake.angle) * hr * 0.3,
              head.y - Math.sin(snake.angle) * hr * 0.3,
              hr * 1.5, snake.angle + Math.PI - 0.8, snake.angle + Math.PI + 0.8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Dragon horns (evo >= 4)
    if (snake.evo >= 4) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      var hx1 = head.x + Math.cos(snake.angle - 0.7) * hr * 1.4;
      var hy1 = head.y + Math.sin(snake.angle - 0.7) * hr * 1.4;
      var hx2 = head.x + Math.cos(snake.angle + 0.7) * hr * 1.4;
      var hy2 = head.y + Math.sin(snake.angle + 0.7) * hr * 1.4;
      ctx.beginPath(); ctx.moveTo(ex1, ey1); ctx.lineTo(hx1, hy1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex2, ey2); ctx.lineTo(hx2, hy2); ctx.stroke();
    }

    // Name tag for AI
    if (!snake.isPlayer && snake.alive) {
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(AI_NAMES[snake.aiIdx], head.x, head.y - hr - 8);
    }
  }

  // ═══════════════════════════════════════
  //  HUD
  // ═══════════════════════════════════════
  function updateHUD() {
    var evo = EVO[player.evo];
    var evoEl = document.getElementById('seEvo');
    evoEl.textContent = evo.icon + ' ' + evo.name;
    evoEl.style.background = 'rgba(' + hexToRgb(EVO_COLORS[player.evo][0]) + ',0.2)';
    evoEl.style.color = EVO_COLORS[player.evo][0];
    evoEl.style.border = '1px solid ' + EVO_COLORS[player.evo][0] + '40';

    var sd = document.getElementById('seScoreD');
    sd.textContent = score;
    sd.classList.add('pop');
    setTimeout(function () { sd.classList.remove('pop'); }, 120);

    document.getElementById('seKillsD').textContent = '☠ ' + kills + ' Kill' + (kills !== 1 ? 's' : '');
    document.getElementById('seLenD').textContent = 'Length: ' + Math.round(player.length);
  }

  // ═══════════════════════════════════════
  //  KILL FEED
  // ═══════════════════════════════════════
  function addKillMsg(text, color) {
    killMsgs.push({text: text, color: color, t: Date.now()});
    if (killMsgs.length > 6) killMsgs.shift();
  }

  function renderKillFeed() {
    var container = document.getElementById('seKillFeed');
    var now = Date.now();
    var html = '';
    for (var i = 0; i < killMsgs.length; i++) {
      var msg = killMsgs[i];
      var age = now - msg.t;
      var fade = age > 3000 ? ' fade' : '';
      html += '<div class="se-kf-msg' + fade + '" style="border-left:3px solid ' + msg.color + '">' + escHtml(msg.text) + '</div>';
    }
    container.innerHTML = html;
  }

  // ═══════════════════════════════════════
  //  LEADERBOARD
  // ═══════════════════════════════════════
  function loadLB() {
    try { return JSON.parse(localStorage.getItem('se_lb') || '[]'); }
    catch(e) { return []; }
  }
  function saveLBEntry(sc, kl) {
    var lb = loadLB();
    lb.push({
      score: sc,
      kills: kl,
      evo: EVO[player.evo].name,
      length: Math.round(player.length),
      date: Date.now()
    });
    // Keep top 20 by score
    lb.sort(function (a, b) { return b.score - a.score; });
    if (lb.length > 20) lb.length = 20;
    localStorage.setItem('se_lb', JSON.stringify(lb));
  }

  var currentLbTab = 'points';

  function showLb() {
    hideOv('seDeath');
    showOv('seLb');
    showLbTab('points');
  }
  function closeLb() {
    hideOv('seLb');
    if (STATE === 'dead') showOv('seDeath');
  }

  function showLbTab(tab) {
    currentLbTab = tab;
    var tabs = document.querySelectorAll('.se-lb-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }

    var lb = loadLB();
    if (tab === 'kd') {
      lb.sort(function (a, b) { return b.kills - a.kills; });
    }

    var cont = document.getElementById('seLbContent');
    if (lb.length === 0) {
      cont.innerHTML = '<div class="se-lb-empty">No runs yet. Play to set records!</div>';
      return;
    }

    var html = '<table class="se-lb-table"><tr><th>#</th>';
    if (tab === 'points') html += '<th>Score</th><th>Kills</th><th>Evo</th>';
    else html += '<th>Kills</th><th>Score</th><th>Evo</th>';
    html += '</tr>';

    var max = Math.min(lb.length, 10);
    for (var i = 0; i < max; i++) {
      var e = lb[i];
      html += '<tr><td>' + (i + 1) + '</td>';
      if (tab === 'points') {
        html += '<td>' + e.score + '</td><td>' + e.kills + '</td><td>' + escHtml(e.evo) + '</td>';
      } else {
        html += '<td>' + e.kills + '</td><td>' + e.score + '</td><td>' + escHtml(e.evo) + '</td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    cont.innerHTML = html;
  }

  // ═══════════════════════════════════════
  //  CHAMPION STATUS
  // ═══════════════════════════════════════
  function loadChampionStatus() {
    api('/api/snake-champion').then(function (data) {
      var el = document.getElementById('seChampStatus');
      var banner = document.getElementById('seChampionBanner');
      if (!el || !banner) return;
      if (data && data.claimed) {
        el.textContent = 'Claimed by ' + data.champion.username + '!';
        el.style.color = '#f87171';
      } else {
        el.textContent = 'Unclaimed — be the first!';
        el.style.color = '#4ade80';
      }
    }).catch(function () {});
  }
  loadChampionStatus();

  // ═══════════════════════════════════════
  //  SCORE SUBMISSION
  // ═══════════════════════════════════════
  function submitScore() {
    if (submitted || score === 0) return;
    submitted = true;
    var pts = 0;
    if (score >= 3000) pts = 90;
    else if (score >= 1500) pts = 54;
    else if (score >= 800) pts = 30;
    else if (score >= 300) pts = 15;
    else if (score >= 100) pts = 6;
    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'snake-evolve', score: score, levelsCompleted: kills, pointsEarned: pts })
    }).then(function (data) {
      showToast('+ ' + pts + ' points earned!');
      if (data && data.snakeChampion) {
        setTimeout(function () { showToast('🏆 SNAKE CHAMPION! You won $50!'); }, 1500);
      }
      if (data && data.completedTasks && data.completedTasks.length) {
        data.completedTasks.forEach(function (t, i) {
          setTimeout(function () { showToast('✅ Task complete: ' + t.title + ' — Claim +' + t.reward + ' pts in Tasks!'); }, 2000 + i * 1500);
        });
      }
    }).catch(function () {});
  }

  // ═══════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════
  function dist(x1, y1, x2, y2) {
    var dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function lerpAngle(cur, target, rate) {
    var diff = target - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < rate) return target;
    return cur + (diff > 0 ? rate : -rate);
  }

  function rng(min, max) { return min + Math.random() * (max - min); }

  function addParticle(x, y, vx, vy, color, r, life) {
    if (particles.length > 200) return;
    particles.push({x:x, y:y, vx:vx, vy:vy, color:color, r:r, life:life, maxLife:life});
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showOv(id) { document.getElementById(id).classList.add('active'); }
  function hideOv(id) { document.getElementById(id).classList.remove('active'); }

  // ═══════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════
  return {
    init: init,
    start: start,
    showLb: showLb,
    closeLb: closeLb,
    showLbTab: showLbTab
  };
})();
