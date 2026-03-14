const express = require('express');
const router = express.Router();
const { db } = require('../db/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require auth + admin
router.use(authenticateToken);
router.use(requireAdmin);

// ========================
// DASHBOARD STATS
// ========================

router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 0').get().c;
  const today = new Date().toISOString().split('T')[0];
  const dailyActive = db.prepare('SELECT COUNT(*) as c FROM users WHERE DATE(last_login) = ?').get(today).c;
  const totalRewards = db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE type = 'earn'").get().t;
  const totalWithdrawals = db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM withdrawals WHERE status = 'approved'").get().t;
  const pendingWithdrawals = db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending'").get().c;
  const totalSpins = db.prepare('SELECT COUNT(*) as c FROM spin_history').get().c;
  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE is_active = 1').get().c;

  res.json({
    totalUsers,
    dailyActive,
    totalRewards,
    totalWithdrawals,
    pendingWithdrawals,
    totalSpins,
    totalTasks
  });
});

// ========================
// USER MANAGEMENT
// ========================

router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let users;
  let total;

  if (search) {
    const searchParam = `%${search}%`;
    users = db.prepare('SELECT user_id, username, email, wallet_points, level, daily_streak, is_banned, join_date, last_login FROM users WHERE is_admin = 0 AND (username LIKE ? OR email LIKE ?) ORDER BY user_id DESC LIMIT ? OFFSET ?').all(searchParam, searchParam, limit, offset);
    total = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 0 AND (username LIKE ? OR email LIKE ?)').get(searchParam, searchParam).c;
  } else {
    users = db.prepare('SELECT user_id, username, email, wallet_points, level, daily_streak, is_banned, join_date, last_login FROM users WHERE is_admin = 0 ORDER BY user_id DESC LIMIT ? OFFSET ?').all(limit, offset);
    total = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 0').get().c;
  }

  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

router.post('/users/:id/ban', (req, res) => {
  const userId = parseInt(req.params.id);
  db.prepare('UPDATE users SET is_banned = 1 WHERE user_id = ? AND is_admin = 0').run(userId);
  res.json({ message: 'User banned.' });
});

router.post('/users/:id/unban', (req, res) => {
  const userId = parseInt(req.params.id);
  db.prepare('UPDATE users SET is_banned = 0 WHERE user_id = ?').run(userId);
  res.json({ message: 'User unbanned.' });
});

router.post('/users/:id/adjust-points', (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount, reason } = req.body;
  const points = parseInt(amount);

  if (!points || !reason) {
    return res.status(400).json({ error: 'Amount and reason required.' });
  }

  db.prepare('UPDATE users SET wallet_points = MAX(0, wallet_points + ?) WHERE user_id = ?').run(points, userId);
  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    userId, points > 0 ? 'earn' : 'spend', 'admin', points, `Admin: ${reason}`
  );

  res.json({ message: `Points adjusted by ${points}.` });
});

// ========================
// TASK MANAGEMENT
// ========================

router.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY task_id DESC').all();
  res.json(tasks);
});

router.post('/tasks', (req, res) => {
  const { task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds } = req.body;

  if (!task_title || !reward_points) {
    return res.status(400).json({ error: 'Title and reward points are required.' });
  }

  db.prepare(`
    INSERT INTO tasks (task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(task_title, task_description || '', parseInt(reward_points), task_link || '', task_type || 'visit', verification_type || 'timer', parseInt(timer_seconds) || 30);

  res.json({ message: 'Task created.' });
});

router.put('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const { task_title, task_description, reward_points, task_link, task_type, verification_type, timer_seconds, is_active } = req.body;

  db.prepare(`
    UPDATE tasks SET task_title = ?, task_description = ?, reward_points = ?, task_link = ?, task_type = ?, verification_type = ?, timer_seconds = ?, is_active = ?
    WHERE task_id = ?
  `).run(task_title, task_description, parseInt(reward_points), task_link, task_type, verification_type, parseInt(timer_seconds) || 30, is_active ? 1 : 0, taskId);

  res.json({ message: 'Task updated.' });
});

router.delete('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  db.prepare('DELETE FROM tasks WHERE task_id = ?').run(taskId);
  res.json({ message: 'Task deleted.' });
});

// ========================
// WITHDRAWAL MANAGEMENT
// ========================

router.get('/withdrawals', (req, res) => {
  const status = req.query.status || 'pending';
  const withdrawals = db.prepare(`
    SELECT w.*, u.username, u.email
    FROM withdrawals w
    JOIN users u ON w.user_id = u.user_id
    WHERE w.status = ?
    ORDER BY w.created_at DESC
  `).all(status);

  res.json(withdrawals);
});

router.post('/withdrawals/:id/approve', (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare("UPDATE withdrawals SET status = 'approved', processed_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ message: 'Withdrawal approved.' });
});

router.post('/withdrawals/:id/reject', (req, res) => {
  const id = parseInt(req.params.id);
  const { note } = req.body;

  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id);
  if (!withdrawal) return res.status(404).json({ error: 'Not found.' });

  // Refund points
  db.prepare('UPDATE users SET wallet_points = wallet_points + ? WHERE user_id = ?').run(Math.abs(withdrawal.amount), withdrawal.user_id);
  db.prepare("UPDATE withdrawals SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, admin_note = ? WHERE id = ?").run(note || 'Rejected by admin', id);
  db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
    withdrawal.user_id, 'earn', 'admin', Math.abs(withdrawal.amount), 'Withdrawal refund - request rejected'
  );

  res.json({ message: 'Withdrawal rejected and points refunded.' });
});

module.exports = router;
