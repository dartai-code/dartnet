const express = require('express');
const router = express.Router();
const { db } = require('../db/setup');
const { authenticateToken } = require('../middleware/auth');

// Monthly game campaigns: $3-$5 for clearing max level / target
const GAME_CAMPAIGNS = {
  'shatter':       { title: 'Shatter',       goal: 'Clear Level 30',    checkScore: false, threshold: 30,    reward: 500,  dollars: 5 },
  'stack-tower':   { title: 'Stack Tower',   goal: 'Stack 30+ blocks',  checkScore: true,  threshold: 30,    reward: 300,  dollars: 3 },
  'color-switch':  { title: 'Color Switch',  goal: 'Collect 20+ stars', checkScore: true,  threshold: 20,    reward: 300,  dollars: 3 },
  'merge-mania':   { title: 'Merge Mania',   goal: 'Score 20,000+',     checkScore: true,  threshold: 20000, reward: 500,  dollars: 5 },
  '2048':          { title: 'Merge Mania',   goal: 'Score 20,000+',     checkScore: true,  threshold: 20000, reward: 500,  dollars: 5 },
  'flappy-jump':   { title: 'Flappy Jump',   goal: 'Pass 30+ pipes',    checkScore: true,  threshold: 30,    reward: 300,  dollars: 3 },
  'word-scramble': { title: 'Word Scramble', goal: 'Solve all 10 words',checkScore: false, threshold: 10,    reward: 400,  dollars: 4 }
};

// ========================
// USER PROFILE / DASHBOARD
// ========================

router.get('/me', authenticateToken, (req, res) => {
  const u = req.user;
  res.json({
    user_id: u.user_id,
    username: u.username,
    email: u.email,
    referral_code: u.referral_code,
    wallet_points: u.wallet_points,
    total_earned: u.total_earned,
    level: u.level,
    daily_streak: u.daily_streak,
    last_daily_claim: u.last_daily_claim,
    last_spin_date: u.last_spin_date,
    extra_spins: u.extra_spins,
    join_date: u.join_date,
    is_admin: u.is_admin
  });
});

// ========================
// LEVEL CALCULATION
// ========================

function calculateLevel(totalEarned) {
  if (totalEarned >= 7000) return 4;
  if (totalEarned >= 3000) return 3;
  if (totalEarned >= 1000) return 2;
  return 1;
}

function updateUserLevel(userId) {
  const user = db.prepare('SELECT total_earned FROM users WHERE user_id = ?').get(userId);
  if (user) {
    const newLevel = calculateLevel(user.total_earned);
    db.prepare('UPDATE users SET level = ? WHERE user_id = ?').run(newLevel, userId);
  }
}

// ========================
// DAILY LOGIN STREAK
// ========================

router.post('/daily-claim', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const today = new Date().toISOString().split('T')[0];

  if (req.user.last_daily_claim === today) {
    return res.status(400).json({ error: 'Already claimed today!' });
  }

  const streakRewards = [20, 30, 50, 80, 120, 150, 300];

  // Check if streak continues
  let newStreak = 1;
  if (req.user.last_daily_claim) {
    const lastClaim = new Date(req.user.last_daily_claim);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastClaim) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = (req.user.daily_streak % 7) + 1;
    }
    // If > 1 day gap, streak resets to 1
  }

  const reward = streakRewards[newStreak - 1] || 20;

  db.prepare(`
    UPDATE users
    SET daily_streak = ?, last_daily_claim = ?, wallet_points = wallet_points + ?, total_earned = total_earned + ?
    WHERE user_id = ?
  `).run(newStreak, today, reward, reward, userId);

  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    userId, 'earn', 'daily', reward, `Day ${newStreak} streak reward`
  );

  updateUserLevel(userId);

  // Give referrer 10% bonus
  if (req.user.referred_by) {
    const referrer = db.prepare('SELECT user_id FROM users WHERE referral_code = ?').get(req.user.referred_by);
    if (referrer) {
      const referralBonus = Math.floor(reward * 0.1);
      if (referralBonus > 0) {
        db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(referralBonus, referralBonus, referrer.user_id);
        db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
          referrer.user_id, 'earn', 'referral', referralBonus, `10% referral earning from ${req.user.username}`
        );
      }
    }
  }

  res.json({ message: `Day ${newStreak} reward claimed!`, reward, streak: newStreak });
});

// ========================
// SPIN WHEEL
// ========================

router.post('/spin', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const today = new Date().toISOString().split('T')[0];
  const spinType = req.body.type || 'free'; // 'free' or 'ad'

  if (spinType === 'free') {
    if (req.user.last_spin_date === today) {
      return res.status(400).json({ error: 'Free spin already used today. Watch an ad for extra spin!' });
    }
    db.prepare('UPDATE users SET last_spin_date = ? WHERE user_id = ?').run(today, userId);
  } else if (spinType === 'ad') {
    if (req.user.extra_spins <= 0) {
      // Grant an extra spin (simulating ad watch)
      db.prepare('UPDATE users SET extra_spins = extra_spins + 1 WHERE user_id = ?').run(userId);
    }
    db.prepare('UPDATE users SET extra_spins = MAX(0, extra_spins - 1) WHERE user_id = ?').run(userId);
  }

  // Weighted random reward
  const rewards = [
    { value: 20, weight: 35 },
    { value: 50, weight: 25 },
    { value: 100, weight: 20 },
    { value: 200, weight: 10 },
    { value: 500, weight: 7 },
    { value: 1000, weight: 3 }
  ];

  const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
  let random = Math.random() * totalWeight;
  let reward = rewards[0].value;

  for (const r of rewards) {
    random -= r.weight;
    if (random <= 0) {
      reward = r.value;
      break;
    }
  }

  db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(reward, reward, userId);
  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    userId, 'earn', 'spin', reward, `Spin wheel reward: ${reward} points`
  );
  db.prepare('INSERT INTO spin_history (user_id, reward, spin_type) VALUES (?, ?, ?)').run(userId, reward, spinType);

  updateUserLevel(userId);

  res.json({ reward, message: `You won ${reward} points!` });
});

// ========================
// TASKS
// ========================

router.get('/tasks', authenticateToken, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE is_active = 1').all();
  const userTasks = db.prepare('SELECT task_id, status FROM user_tasks WHERE user_id = ?').all(req.user.user_id);
  const completedMap = {};
  userTasks.forEach(ut => { completedMap[ut.task_id] = ut.status; });

  const result = tasks.map(t => ({
    ...t,
    user_status: completedMap[t.task_id] || 'available'
  }));

  res.json(result);
});

router.post('/tasks/:taskId/complete', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const taskId = parseInt(req.params.taskId);

  const task = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND is_active = 1').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const existing = db.prepare('SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?').get(userId, taskId);
  if (existing) {
    return res.status(400).json({ error: 'Task already completed.' });
  }

  db.prepare('INSERT INTO user_tasks (user_id, task_id, status, completed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(userId, taskId, 'completed');
  db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(task.reward_points, task.reward_points, userId);
  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    userId, 'earn', 'task', task.reward_points, `Completed task: ${task.task_title}`
  );

  updateUserLevel(userId);

  res.json({ message: 'Task completed!', reward: task.reward_points });
});

// ========================
// WALLET / TRANSACTIONS
// ========================

router.get('/wallet', authenticateToken, (req, res) => {
  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.user_id);

  res.json({
    balance: req.user.wallet_points,
    total_earned: req.user.total_earned,
    transactions
  });
});

// ========================
// GAMES (STRUCTURE ONLY)
// ========================

router.post('/games/score', authenticateToken, (req, res) => {
  const { gameId, score, levelsCompleted, pointsEarned } = req.body;
  const userId = req.user.user_id;

  if (!gameId || pointsEarned === undefined) {
    return res.status(400).json({ error: 'gameId and pointsEarned are required.' });
  }

  const safePoints = Math.min(Math.max(0, parseInt(pointsEarned) || 0), 500);

  db.prepare('INSERT INTO game_scores (user_id, game_id, score, levels_completed, points_earned) VALUES (?, ?, ?, ?, ?)').run(
    userId, gameId, score || 0, levelsCompleted || 0, safePoints
  );

  if (safePoints > 0) {
    db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(safePoints, safePoints, userId);
    db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
      userId, 'earn', 'game', safePoints, `Game reward: ${gameId}`
    );
    updateUserLevel(userId);
  }

  // Special: Run For Life — first 3 players to clear level 10 get $100 bonus (10,000 pts)
  let rflChampion = null;
  if (gameId === 'run-for-life' && (parseInt(levelsCompleted) || 0) >= 10) {
    const existing = db.prepare('SELECT id FROM rfl_champions WHERE user_id = ?').get(userId);
    if (!existing) {
      const champCount = db.prepare('SELECT COUNT(*) as count FROM rfl_champions').get().count;
      if (champCount < 3) {
        const slot = champCount + 1;
        const bonus = 10000;
        db.prepare('INSERT INTO rfl_champions (user_id, slot, total_deaths, bonus_points) VALUES (?, ?, ?, ?)').run(userId, slot, parseInt(score) || 0, bonus);
        db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(bonus, bonus, userId);
        db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
          userId, 'earn', 'rfl_champion', bonus, `Run For Life Champion #${slot} — $100 reward!`
        );
        updateUserLevel(userId);
        rflChampion = { slot, bonus };
      }
    }
  }

  // Special: Snake Evolve — first player to reach 1000 kills gets $50 bonus (5,000 pts)
  let snakeChampion = null;
  if (gameId === 'snake-evolve' && (parseInt(levelsCompleted) || 0) >= 1000) {
    const existing = db.prepare('SELECT id FROM snake_champions WHERE user_id = ?').get(userId);
    if (!existing) {
      const champCount = db.prepare('SELECT COUNT(*) as count FROM snake_champions').get().count;
      if (champCount < 1) {
        const bonus = 5000;
        db.prepare('INSERT INTO snake_champions (user_id, total_kills, final_score, bonus_points) VALUES (?, ?, ?, ?)').run(userId, parseInt(levelsCompleted) || 0, parseInt(score) || 0, bonus);
        db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(bonus, bonus, userId);
        db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
          userId, 'earn', 'snake_champion', bonus, `Snake Evolve Champion — $50 reward!`
        );
        updateUserLevel(userId);
        snakeChampion = { bonus };
      }
    }
  }

  // Monthly game campaigns — $3-$5 for clearing max level targets
  let campaignClaim = null;
  const campaign = GAME_CAMPAIGNS[gameId];
  if (campaign) {
    const value = campaign.checkScore ? (parseInt(score) || 0) : (parseInt(levelsCompleted) || 0);
    if (value >= campaign.threshold) {
      const now = new Date();
      const claimMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const existing = db.prepare('SELECT id FROM campaign_claims WHERE user_id = ? AND game_id = ? AND claim_month = ?').get(userId, gameId, claimMonth);
      if (!existing) {
        db.prepare('INSERT INTO campaign_claims (user_id, game_id, reward_points, reward_dollars, claim_month) VALUES (?, ?, ?, ?, ?)').run(userId, gameId, campaign.reward, campaign.dollars, claimMonth);
        db.prepare('UPDATE users SET wallet_points = wallet_points + ?, total_earned = total_earned + ? WHERE user_id = ?').run(campaign.reward, campaign.reward, userId);
        db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
          userId, 'earn', 'campaign', campaign.reward, `${campaign.title} campaign — $${campaign.dollars} reward!`
        );
        const user = db.prepare('SELECT username FROM users WHERE user_id = ?').get(userId);
        db.prepare('INSERT INTO campaign_announcements (user_id, username, game_id, game_title, reward_dollars) VALUES (?, ?, ?, ?, ?)').run(
          userId, user.username, gameId, campaign.title, campaign.dollars
        );
        updateUserLevel(userId);
        campaignClaim = { game: campaign.title, dollars: campaign.dollars, points: campaign.reward };
      }
    }
  }

  res.json({ message: 'Score saved!', pointsEarned: safePoints, rflChampion, snakeChampion, campaignClaim });
});

// ========================
// RFL CHAMPIONS
// ========================

router.get('/rfl-champions', (req, res) => {
  const champions = db.prepare(`
    SELECT c.slot, u.username, c.total_deaths, c.created_at
    FROM rfl_champions c
    JOIN users u ON c.user_id = u.user_id
    ORDER BY c.slot
  `).all();
  res.json({ champions, totalSlots: 3, spotsRemaining: 3 - champions.length });
});

// ========================
// SNAKE CHAMPION
// ========================

router.get('/snake-champion', (req, res) => {
  const champion = db.prepare(`
    SELECT u.username, c.total_kills, c.final_score, c.created_at
    FROM snake_champions c
    JOIN users u ON c.user_id = u.user_id
    LIMIT 1
  `).get();
  res.json({ champion: champion || null, claimed: !!champion });
});

// ========================
// CAMPAIGN STATUS & ANNOUNCEMENTS
// ========================

router.get('/campaign-status', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const now = new Date();
  const claimMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const claims = db.prepare('SELECT game_id FROM campaign_claims WHERE user_id = ? AND claim_month = ?').all(userId, claimMonth);
  const claimedGames = claims.map(c => c.game_id);

  const campaigns = {};
  for (const [gameId, c] of Object.entries(GAME_CAMPAIGNS)) {
    campaigns[gameId] = {
      title: c.title,
      goal: c.goal,
      dollars: c.dollars,
      claimed: claimedGames.includes(gameId)
    };
  }
  res.json({ campaigns, claimMonth });
});

router.get('/campaign-announcements', (req, res) => {
  const announcements = db.prepare(`
    SELECT username, game_title, reward_dollars, created_at
    FROM campaign_announcements
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  res.json({ announcements });
});

// ========================
// LEADERBOARD
// ========================

router.get('/leaderboard', authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  // Top 100 by total_earned
  const top100 = db.prepare(`
    SELECT user_id, username, total_earned, level, join_date
    FROM users
    WHERE is_banned = 0
    ORDER BY total_earned DESC
    LIMIT 100
  `).all();

  // Get current user's rank
  const rankRow = db.prepare(`
    SELECT COUNT(*) + 1 as rank FROM users
    WHERE total_earned > (SELECT total_earned FROM users WHERE user_id = ?) AND is_banned = 0
  `).get(userId);

  const me = db.prepare('SELECT user_id, username, total_earned, level FROM users WHERE user_id = ?').get(userId);

  res.json({
    top100,
    myRank: rankRow ? rankRow.rank : null,
    me
  });
});

// ========================
// SHARING LEADERBOARD (Monthly)
// ========================

router.get('/sharing-leaderboard', authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  // Current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Top 10 referrers this month
  const top10 = db.prepare(`
    SELECT r.referrer_id as user_id, u.username, COUNT(*) as referral_count
    FROM referrals r
    JOIN users u ON r.referrer_id = u.user_id
    WHERE r.created_at >= ? AND r.created_at < ? AND u.is_banned = 0
    GROUP BY r.referrer_id
    ORDER BY referral_count DESC
    LIMIT 10
  `).all(monthStart, monthEnd);

  // My monthly referral count
  const myRow = db.prepare(`
    SELECT COUNT(*) as referral_count FROM referrals
    WHERE referrer_id = ? AND created_at >= ? AND created_at < ?
  `).get(userId, monthStart, monthEnd);

  // My rank among all referrers this month
  const myRankRow = db.prepare(`
    SELECT COUNT(*) + 1 as rank FROM (
      SELECT referrer_id, COUNT(*) as cnt FROM referrals
      WHERE created_at >= ? AND created_at < ?
      GROUP BY referrer_id
      HAVING cnt > ?
    )
  `).get(monthStart, monthEnd, myRow ? myRow.referral_count : 0);

  // Days remaining in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  // Rewards: top 3 get bonus points
  const rewards = [20000, 15000, 10000];

  res.json({
    top10,
    myReferrals: myRow ? myRow.referral_count : 0,
    myRank: myRankRow ? myRankRow.rank : 1,
    monthLabel,
    daysRemaining,
    rewards,
    minReferrals: 10
  });
});

// ========================
// REFERRALS
// ========================

router.get('/referrals', authenticateToken, (req, res) => {
  const referrals = db.prepare(`
    SELECT r.*, u.username, u.join_date
    FROM referrals r
    JOIN users u ON r.referred_id = u.user_id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.user_id);

  const totalEarned = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND source = 'referral'"
  ).get(req.user.user_id);

  res.json({
    referral_code: req.user.referral_code,
    total_referrals: referrals.length,
    total_referral_earnings: totalEarned.total,
    referrals
  });
});

// ========================
// WITHDRAWALS
// ========================

router.post('/withdraw', authenticateToken, (req, res) => {
  const { amount, method, accountDetails } = req.body;
  const userId = req.user.user_id;

  if (!amount || !method || !accountDetails) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const withdrawAmount = parseInt(amount);
  if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
    return res.status(400).json({ error: 'Minimum withdrawal is 1,000 points.' });
  }

  const user = db.prepare('SELECT wallet_points FROM users WHERE user_id = ?').get(userId);
  if (user.wallet_points < withdrawAmount) {
    return res.status(400).json({ error: 'Insufficient balance.' });
  }

  const validMethods = ['paytm', 'upi', 'giftcard'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: 'Invalid withdrawal method.' });
  }

  const pending = db.prepare("SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'").get(userId);
  if (pending) {
    return res.status(400).json({ error: 'You already have a pending withdrawal request.' });
  }

  db.prepare('UPDATE users SET wallet_points = wallet_points - ? WHERE user_id = ?').run(withdrawAmount, userId);
  db.prepare('INSERT INTO withdrawals (user_id, amount, method, account_details) VALUES (?, ?, ?, ?)').run(
    userId, withdrawAmount, method, accountDetails
  );
  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    userId, 'spend', 'withdraw', -withdrawAmount, `Withdrawal via ${method}`
  );

  res.json({ message: 'Withdrawal request submitted!' });
});

router.get('/withdrawals', authenticateToken, (req, res) => {
  const withdrawals = db.prepare(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.user_id);
  res.json(withdrawals);
});

module.exports = router;
