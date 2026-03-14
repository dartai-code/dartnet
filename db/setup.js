const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'dartnet.db');
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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dartnet.com';
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
    const sampleTasks = [
      ['Visit our partner site', 'Visit the sponsor website and stay for 30 seconds', 100, 'https://example.com', 'visit', 'timer', 30],
      ['Watch promo video', 'Watch the full promotional video to earn points', 150, 'https://example.com/video', 'watch', 'timer', 60],
      ['Follow on social media', 'Follow DartNet on social media', 200, 'https://example.com/social', 'visit', 'timer', 15],
    ];
    const insert = db.prepare('INSERT INTO tasks (task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const t of sampleTasks) {
      insert.run(...t);
    }
    console.log('Sample tasks created');
  }

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };
