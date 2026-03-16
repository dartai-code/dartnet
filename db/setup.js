const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'dartnet.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      wallet_points INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
      daily_streak INTEGER DEFAULT 0,
      last_daily_claim DATE,
      last_spin_date DATE,
      extra_spins INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_title TEXT NOT NULL,
      task_description TEXT,
      reward_points INTEGER NOT NULL,
      task_link TEXT,
      task_type TEXT,
      verification_type TEXT DEFAULT 'timer',
      timer_seconds INTEGER DEFAULT 30,
      game_id TEXT,
      score_field TEXT,
      score_threshold INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(task_id),
      UNIQUE(user_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      bonus_given INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(user_id),
      FOREIGN KEY (referred_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      account_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      admin_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      levels_completed INTEGER DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS spin_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      spin_type TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS rfl_champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      slot INTEGER NOT NULL,
      total_deaths INTEGER DEFAULT 0,
      bonus_points INTEGER DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS snake_champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      total_kills INTEGER DEFAULT 0,
      final_score INTEGER DEFAULT 0,
      bonus_points INTEGER DEFAULT 5000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS campaign_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      reward_points INTEGER NOT NULL,
      reward_dollars REAL NOT NULL,
      claim_month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      UNIQUE(user_id, game_id, claim_month)
    );

    CREATE TABLE IF NOT EXISTS campaign_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      game_id TEXT NOT NULL,
      game_title TEXT NOT NULL,
      reward_dollars REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default admin if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'dartaioffcial2@gmail.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = db.prepare('SELECT user_id FROM users WHERE email = ?').get(adminEmail);

  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPass, 12);
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO users (username, email, password_hash, referral_code, is_admin, wallet_points)
      VALUES (?, ?, ?, ?, 1, 0)
    `).run('admin', adminEmail, hash, uuidv4().slice(0, 8).toUpperCase());
    console.log('Default admin account created');
  }

  // Insert sample tasks if none exist
  const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  if (taskCount === 0) {
    // Timer-based tasks: [title, desc, points, link, type, verification, timer]
    const timerTasks = [
      ['Join Telegram Community', 'Join our official DartNet Telegram community for updates, support & announcements', 200, 'https://t.me/+6QSJUkIKJwVlYmY1', 'visit', 'timer', 15],
      ['Follow us on Instagram', 'Follow DartNet on Instagram for updates, giveaways & exclusive content', 200, 'https://www.instagram.com/dartnet_official', 'visit', 'timer', 15],
    ];
    const insertTimer = db.prepare('INSERT INTO tasks (task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const t of timerTasks) {
      insertTimer.run(...t);
    }

    // Game-score tasks: [title, desc, points, link, type, verification, game_id, score_field, threshold]
    const gameTasks = [
      ['Run For Life — Clear Level 2', 'Survive and complete Level 2 in Run For Life', 30, '/run-for-life.html', 'play', 'game_score', 'run-for-life', 'levelsCompleted', 2],
      ['Stack Tower — Score 5', 'Stack 5 blocks perfectly in Stack Tower', 40, '/stack-tower.html', 'play', 'game_score', 'stack-tower', 'score', 5],
      ['Flappy Jump — Score 5', 'Reach a score of 5 in Flappy Jump', 40, '/flappy-jump.html', 'play', 'game_score', 'flappy-jump', 'score', 5],
      ['Word Scramble — Solve 2 Words', 'Unscramble and solve 2 words in Word Scramble', 50, '/word-scramble.html', 'play', 'game_score', 'word-scramble', 'levelsCompleted', 2],
      ['Color Switch — Score 8', 'Tap through 8 color gates in Color Switch', 60, '/color-switch.html', 'play', 'game_score', 'color-switch', 'score', 8],
      ['Shatter — Clear Level 5', 'Break through all blocks and complete Level 5 in Shatter', 70, '/shatter.html', 'play', 'game_score', 'shatter', 'levelsCompleted', 5],
      ['Snake Evolve — Get 50 Kills', 'Eat your way to 50 kills in Snake Evolve', 80, '/snake-evolve.html', 'play', 'game_score', 'snake-evolve', 'levelsCompleted', 50],
      ['2048 — Score 2000', 'Merge tiles and reach a score of 2000 in 2048', 90, '/2048.html', 'play', 'game_score', '2048', 'score', 2000],
      ['Run For Life — Clear Level 5', 'Push your limits and survive to Level 5 in Run For Life', 100, '/run-for-life.html', 'play', 'game_score', 'run-for-life', 'levelsCompleted', 5],
      ['Shatter — Clear Level 10', 'Master Shatter by completing the tough Level 10', 120, '/shatter.html', 'play', 'game_score', 'shatter', 'levelsCompleted', 10],
    ];
    const insertGame = db.prepare('INSERT INTO tasks (task_title, task_description, reward_points, task_link, task_type, verification_type, game_id, score_field, score_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of gameTasks) {
      insertGame.run(...t);
    }
    console.log('Sample tasks created');
  }

  // Migration: remove old placeholder tasks and ensure Instagram task exists
  const oldTasks = ['Visit our partner site', 'Watch promo video', 'Follow on social media'];
  const deleteOld = db.prepare('UPDATE tasks SET is_active = 0 WHERE task_title = ?');
  for (const title of oldTasks) {
    deleteOld.run(title);
  }
  const instaExists = db.prepare("SELECT task_id FROM tasks WHERE task_title = 'Follow us on Instagram' AND is_active = 1").get();
  if (!instaExists) {
    db.prepare('INSERT INTO tasks (task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'Follow us on Instagram', 'Follow DartNet on Instagram for updates, giveaways & exclusive content', 200, 'https://www.instagram.com/dartnet_official', 'visit', 'timer', 15
    );
  }

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };
