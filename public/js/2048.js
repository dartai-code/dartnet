/* ==============================
   2048 – DartNet Mini Game
   Swipe/arrow-key tile merger.
   ============================== */
var T48 = (function () {
  'use strict';

  var SIZE = 4;
  var grid, score, bestScore, won, over, submitted;
  var boardEl;

  // Tile colors
  var TILE_COLORS = {
    2:    { bg: '#3d3552', fg: '#eee' },
    4:    { bg: '#4a3f6b', fg: '#eee' },
    8:    { bg: '#ff6b6b', fg: '#fff' },
    16:   { bg: '#ff8e53', fg: '#fff' },
    32:   { bg: '#ff6348', fg: '#fff' },
    64:   { bg: '#e84393', fg: '#fff' },
    128:  { bg: '#ffd93d', fg: '#1a1a2e' },
    256:  { bg: '#fdcb6e', fg: '#1a1a2e' },
    512:  { bg: '#6bcb77', fg: '#fff' },
    1024: { bg: '#00cec9', fg: '#fff' },
    2048: { bg: '#4d96ff', fg: '#fff' },
    4096: { bg: '#a29bfe', fg: '#fff' },
    8192: { bg: '#6c5ce7', fg: '#fff' }
  };

  function init() {
    boardEl = document.getElementById('tBoard');
    bestScore = parseInt(localStorage.getItem('t48_best') || '0', 10);
    document.getElementById('tBest').textContent = bestScore;

    // Keyboard
    document.addEventListener('keydown', onKey);
    // Touch swipe
    var startX, startY;
    boardEl.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; startX = t.clientX; startY = t.clientY;
    }, { passive: true });
    boardEl.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - startX, dy = t.clientY - startY;
      var absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    newGame();
  }

  function newGame() {
    grid = [];
    for (var i = 0; i < SIZE; i++) {
      grid[i] = [];
      for (var j = 0; j < SIZE; j++) grid[i][j] = 0;
    }
    score = 0;
    won = false;
    over = false;
    submitted = false;
    addRandom();
    addRandom();
    hideOverlay('tWin');
    hideOverlay('tLose');
    updateUI();
  }

  function continueGame() {
    won = true; // already acknowledged
    hideOverlay('tWin');
  }

  function addRandom() {
    var empty = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) empty.push({ r: r, c: c });
    if (empty.length === 0) return;
    var cell = empty[Math.floor(Math.random() * empty.length)];
    grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    // Mark for pop anim
    addRandom._new = cell.r * SIZE + cell.c;
  }

  // ── Movement ──
  function move(dir) {
    if (over) return;
    var moved = false;
    var mergedCells = [];

    if (dir === 'left' || dir === 'right') {
      for (var r = 0; r < SIZE; r++) {
        var row = grid[r].slice();
        var result = slideRow(row, dir === 'right');
        if (!arrEq(row, result.row)) moved = true;
        grid[r] = result.row;
        for (var m = 0; m < result.merged.length; m++) mergedCells.push(r * SIZE + result.merged[m]);
      }
    } else {
      for (var c = 0; c < SIZE; c++) {
        var col = [];
        for (var rr = 0; rr < SIZE; rr++) col.push(grid[rr][c]);
        var res = slideRow(col, dir === 'down');
        var newCol = res.row;
        if (!arrEq(col, newCol)) moved = true;
        for (var rr2 = 0; rr2 < SIZE; rr2++) grid[rr2][c] = newCol[rr2];
        for (var m2 = 0; m2 < res.merged.length; m2++) mergedCells.push(res.merged[m2] * SIZE + c);
      }
    }

    if (moved) {
      addRandom();
      updateUI(mergedCells);
      checkState();
    }
  }

  function slideRow(arr, reverse) {
    if (reverse) arr = arr.slice().reverse();
    // Remove zeros
    var filtered = arr.filter(function (v) { return v !== 0; });
    var merged = [];
    var result = [];
    for (var i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var val = filtered[i] * 2;
        result.push(val);
        score += val;
        merged.push(result.length - 1);
        i++; // skip next
      } else {
        result.push(filtered[i]);
      }
    }
    while (result.length < SIZE) result.push(0);
    if (reverse) {
      result.reverse();
      merged = merged.map(function (idx) { return SIZE - 1 - idx; });
    }
    return { row: result, merged: merged };
  }

  function arrEq(a, b) {
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function checkState() {
    // Check win
    if (!won) {
      for (var r = 0; r < SIZE; r++)
        for (var c = 0; c < SIZE; c++)
          if (grid[r][c] === 2048) { showOverlay('tWin'); return; }
    }
    // Check lose
    if (!canMove()) {
      over = true;
      setTimeout(function () {
        document.getElementById('tFinalScore').textContent = 'Score: ' + score;
        showOverlay('tLose');
        submitScore();
      }, 300);
    }
  }

  function canMove() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }

  // ── UI ──
  function updateUI(mergedCells) {
    mergedCells = mergedCells || [];
    boardEl.innerHTML = '';
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var val = grid[r][c];
        var cell = document.createElement('div');
        cell.className = 't-cell';
        var idx = r * SIZE + c;

        if (val > 0) {
          var colors = TILE_COLORS[val] || { bg: '#1a1a2e', fg: '#fff' };
          cell.style.background = colors.bg;
          cell.style.color = colors.fg;
          cell.style.fontSize = val >= 1024 ? '18px' : val >= 128 ? '22px' : '26px';
          cell.textContent = val;
          cell.style.boxShadow = '0 0 15px ' + colors.bg + '60';

          if (idx === addRandom._new) cell.classList.add('pop');
          if (mergedCells.indexOf(idx) !== -1) cell.classList.add('merge');
        }
        boardEl.appendChild(cell);
      }
    }
    addRandom._new = -1;

    // Score
    var el = document.getElementById('tScore');
    el.textContent = score;
    el.classList.add('pop');
    setTimeout(function () { el.classList.remove('pop'); }, 150);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('t48_best', bestScore);
    }
    document.getElementById('tBest').textContent = bestScore;
  }

  // ── Input ──
  function onKey(e) {
    var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  }

  function submitScore() {
    if (submitted || score === 0) return;
    submitted = true;
    var pts = 0;
    if (score >= 20000) pts = 60;
    else if (score >= 10000) pts = 36;
    else if (score >= 5000) pts = 21;
    else if (score >= 2000) pts = 10;
    else if (score >= 500) pts = 5;
    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: '2048', score: score, levelsCompleted: 0, pointsEarned: pts })
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

  return { init: init, newGame: newGame, continueGame: continueGame };
})();
