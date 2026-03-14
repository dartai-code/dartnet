/* ==============================
   WORD SCRAMBLE – DartNet Mini Game
   Unscramble letters within time limit.
   ============================== */
var WS = (function () {
  'use strict';

  // Word bank (5-7 letter common words)
  var WORDS = [
    'PLANET', 'ROCKET', 'BRIDGE', 'CASTLE', 'DRAGON', 'FOREST', 'GARDEN', 'ISLAND',
    'JUNGLE', 'KNIGHT', 'LEMON', 'MAGIC', 'NIGHT', 'OCEAN', 'POWER', 'QUEEN',
    'RIVER', 'STORM', 'TIGER', 'ULTRA', 'VOICE', 'WATER', 'BLAZE', 'CROWN',
    'DREAM', 'FLAME', 'GHOST', 'HAVEN', 'IVORY', 'JEWEL', 'KARMA', 'LUNAR',
    'MAPLE', 'NOBLE', 'ORBIT', 'PEARL', 'QUEST', 'ROYAL', 'SHINE', 'TRAIL',
    'UNITY', 'VIVID', 'WORLD', 'XENON', 'YACHT', 'ZEBRA', 'AMBER', 'BRAIN',
    'CLOUD', 'DELTA', 'EAGLE', 'FROST', 'GRAPE', 'HEART', 'INLET', 'JOKER',
    'LIGHT', 'METAL', 'NERVE', 'OASIS', 'PRISM', 'RADAR', 'SOLAR', 'TORCH',
    'ANGEL', 'BEACH', 'CHARM', 'DANCE', 'ELITE', 'FIBER', 'GLORY', 'HONEY',
    'IMAGE', 'JOLLY', 'LEMON', 'NORTH', 'PEACE', 'RAPID', 'SNAKE', 'TOWER',
    'MUSIC', 'PIXEL', 'SPARK', 'TRICK', 'VINYL', 'WITCH', 'YOUTH', 'ALPHA',
    'COMET', 'DRIFT', 'EPOCH', 'FLAIR', 'GRAIN', 'HASTE', 'RAVEN', 'SPICE'
  ];

  var HINTS = {
    PLANET: 'Orbits a star', ROCKET: 'Launches to space', BRIDGE: 'Connects two sides',
    CASTLE: 'Medieval fortress', DRAGON: 'Mythical fire breather', FOREST: 'Full of trees',
    GARDEN: 'Where flowers grow', ISLAND: 'Land surrounded by water', JUNGLE: 'Dense tropical area',
    KNIGHT: 'Armored warrior', MAGIC: 'Supernatural power', NIGHT: 'After sunset',
    OCEAN: 'Vast body of water', POWER: 'Strength or energy', STORM: 'Violent weather',
    TIGER: 'Striped big cat', WATER: 'Essential for life', BLAZE: 'Intense fire',
    CROWN: 'Worn by royalty', DREAM: 'Happens while sleeping', FLAME: 'Fire tongue',
    GHOST: 'Spooky apparition', JEWEL: 'Precious gem', LUNAR: 'Related to moon',
    PEARL: 'Found in oysters', QUEST: 'An adventure', ROYAL: 'Of a king or queen',
    SHINE: 'Emit light', TRAIL: 'A path', WORLD: 'Our globe',
    CLOUD: 'In the sky', EAGLE: 'Bird of prey', FROST: 'Icy coating',
    GRAPE: 'Makes wine', HEART: 'Pumps blood', LIGHT: 'Opposite of dark',
    METAL: 'Iron or steel', OASIS: 'Desert refuge', PRISM: 'Splits light',
    SOLAR: 'Of the sun', TORCH: 'Portable light', ANGEL: 'Heavenly being',
    BEACH: 'Sandy shore', CHARM: 'Attractive quality', DANCE: 'Move to music',
    GLORY: 'Great honor', HONEY: 'Bees make it', MUSIC: 'Art of sound',
    SPARK: 'Tiny fire bit', TOWER: 'Tall structure', COMET: 'Icy space traveler',
    PEACE: 'No conflict', SNAKE: 'Legless reptile', NORTH: 'Top of compass',
    BRAIN: 'Think with it', YOUTH: 'Being young', ALPHA: 'First letter',
    SPICE: 'Flavors food', RAVEN: 'Black bird', PIXEL: 'Screen dot'
  };

  var TOTAL_ROUNDS = 10;
  var TIME_PER_ROUND = 20; // seconds

  var score, round, solved, bestScore, submitted;
  var currentWord, scrambled, answerLetters, selectedIndices;
  var timer, timerInterval;
  var hintUsed;

  function init() {
    bestScore = parseInt(localStorage.getItem('ws_best') || '0', 10);
  }

  function start() {
    score = 0;
    round = 0;
    solved = 0;
    submitted = false;
    hintUsed = false;
    hideOverlay('wsMenu');
    hideOverlay('wsGameOver');
    document.getElementById('wsGame').style.display = '';
    nextRound();
  }

  function nextRound() {
    round++;
    if (round > TOTAL_ROUNDS) { endGame(); return; }

    // Pick random word (no repeats in session would be ideal)
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    scrambled = shuffleWord(currentWord);
    // Make sure it's different from original
    var tries = 0;
    while (scrambled === currentWord && tries < 20) {
      scrambled = shuffleWord(currentWord);
      tries++;
    }

    answerLetters = [];
    selectedIndices = [];
    hintUsed = false;
    timer = TIME_PER_ROUND;

    updateRoundUI();
    startTimer();
  }

  function shuffleWord(word) {
    var arr = word.split('');
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr.join('');
  }

  function updateRoundUI() {
    document.getElementById('wsScore').textContent = score;
    document.getElementById('wsRound').textContent = round + '/' + TOTAL_ROUNDS;
    document.getElementById('wsHint').textContent = '';

    renderScramble();
    renderAnswer();
  }

  function renderScramble() {
    var container = document.getElementById('wsScramble');
    container.innerHTML = '';
    for (var i = 0; i < scrambled.length; i++) {
      var el = document.createElement('div');
      el.className = 'ws-letter pop';
      el.textContent = scrambled[i];
      el.dataset.idx = i;
      if (selectedIndices.indexOf(i) !== -1) {
        el.classList.add('selected');
      }
      (function (idx) {
        el.addEventListener('click', function () { selectLetter(idx); });
      })(i);
      container.appendChild(el);
    }
  }

  function renderAnswer() {
    var container = document.getElementById('wsAnswer');
    container.innerHTML = '';
    for (var i = 0; i < currentWord.length; i++) {
      var el = document.createElement('div');
      el.className = 'ws-slot';
      if (i < answerLetters.length) {
        el.textContent = answerLetters[i];
        el.classList.add('filled');
        (function (idx) {
          el.addEventListener('click', function () { removeLetter(idx); });
        })(i);
      }
      container.appendChild(el);
    }
  }

  function selectLetter(idx) {
    if (selectedIndices.indexOf(idx) !== -1) return;
    selectedIndices.push(idx);
    answerLetters.push(scrambled[idx]);
    renderScramble();
    renderAnswer();

    // Check if complete
    if (answerLetters.length === currentWord.length) {
      checkAnswer();
    }
  }

  function removeLetter(ansIdx) {
    var scrIdx = selectedIndices[ansIdx];
    selectedIndices.splice(ansIdx, 1);
    answerLetters.splice(ansIdx, 1);
    renderScramble();
    renderAnswer();
  }

  function checkAnswer() {
    var guess = answerLetters.join('');
    var slots = document.querySelectorAll('.ws-slot');

    if (guess === currentWord) {
      // Correct!
      for (var i = 0; i < slots.length; i++) slots[i].classList.add('correct');
      var bonus = Math.ceil(timer * 10);
      score += 100 + bonus;
      solved++;
      showFlash('CORRECT! +' + (100 + bonus), true);
      clearInterval(timerInterval);
      setTimeout(nextRound, 1000);
    } else {
      // Wrong
      for (var j = 0; j < slots.length; j++) slots[j].classList.add('wrong');
      showFlash('WRONG!', false);
      setTimeout(function () {
        clearAnswer();
      }, 600);
    }
  }

  function clearAnswer() {
    answerLetters = [];
    selectedIndices = [];
    renderScramble();
    renderAnswer();
  }

  function shuffleLetters() {
    scrambled = shuffleWord(scrambled.split ? scrambled : currentWord);
    // Re-map selected indices is complex, just clear answer
    clearAnswer();
    renderScramble();
  }

  function useHint() {
    if (hintUsed) return;
    hintUsed = true;
    var hint = HINTS[currentWord] || 'Think carefully...';
    document.getElementById('wsHint').textContent = '💡 ' + hint;
    score = Math.max(0, score - 30);
    document.getElementById('wsScore').textContent = score;
  }

  // Timer
  function startTimer() {
    clearInterval(timerInterval);
    updateTimerUI();
    timerInterval = setInterval(function () {
      timer -= 0.1;
      if (timer <= 0) {
        timer = 0;
        clearInterval(timerInterval);
        showFlash('TIME UP!', false);
        // Show answer briefly
        var slots = document.querySelectorAll('.ws-slot');
        for (var i = 0; i < currentWord.length; i++) {
          if (slots[i]) {
            slots[i].textContent = currentWord[i];
            slots[i].classList.add('filled');
            slots[i].style.borderColor = '#ff6b6b';
            slots[i].style.color = '#ff6b6b';
          }
        }
        setTimeout(nextRound, 1500);
      }
      updateTimerUI();
    }, 100);
  }

  function updateTimerUI() {
    var pct = (timer / TIME_PER_ROUND) * 100;
    document.getElementById('wsTimer').style.width = pct + '%';
  }

  function showFlash(msg, isCorrect) {
    var el = document.getElementById('wsFlash');
    el.textContent = msg;
    el.className = 'ws-flash ' + (isCorrect ? 'correct-flash' : 'wrong-flash') + ' show';
    setTimeout(function () { el.className = 'ws-flash'; }, 800);
  }

  function endGame() {
    clearInterval(timerInterval);
    var isNew = score > bestScore;
    if (isNew) { bestScore = score; localStorage.setItem('ws_best', bestScore); }

    document.getElementById('wsFinalScore').textContent = score;
    document.getElementById('wsSolved').textContent = 'WORDS SOLVED: ' + solved + '/' + TOTAL_ROUNDS;
    document.getElementById('wsBestStat').textContent = 'BEST: ' + bestScore + (isNew ? ' ★ NEW!' : '');
    showOverlay('wsGameOver');
    submitScore();
  }

  function submitScore() {
    if (submitted || score === 0) return;
    submitted = true;
    var pts = 0;
    if (score >= 1500) pts = 60;
    else if (score >= 1000) pts = 36;
    else if (score >= 500) pts = 18;
    else if (score >= 200) pts = 8;
    if (pts === 0) return;
    api('/api/games/score', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'word-scramble', score: score, levelsCompleted: solved, pointsEarned: pts })
    }).then(function (data) {
      showToast('+ ' + pts + ' points earned!');
      if (data && data.campaignClaim) {
        setTimeout(function () { showToast('\uD83C\uDFC6 Campaign cleared! $' + data.campaignClaim.dollars + ' reward!'); }, 1500);
      }
    }).catch(function () {});
  }

  function showOverlay(id) { document.getElementById(id).classList.add('active'); }
  function hideOverlay(id) { document.getElementById(id).classList.remove('active'); }

  return {
    init: init, start: start,
    clearAnswer: clearAnswer, shuffleLetters: shuffleLetters, useHint: useHint
  };
})();
