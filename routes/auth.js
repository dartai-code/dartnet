const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/setup');

// Register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Check existing user
    const existing = db.prepare('SELECT user_id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ error: 'Email or username already taken.' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const myReferralCode = uuidv4().slice(0, 8).toUpperCase();

    let referredBy = null;
    let referrerId = null;

    // Handle referral
    if (referralCode) {
      const referrer = db.prepare('SELECT user_id, referral_code FROM users WHERE referral_code = ?').get(referralCode);
      if (referrer) {
        referredBy = referralCode;
        referrerId = referrer.user_id;
      }
    }

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, referral_code, referred_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, email.toLowerCase(), passwordHash, myReferralCode, referredBy);

    const newUserId = result.lastInsertRowid;

    // Give referral bonus
    if (referrerId) {
      db.prepare('UPDATE users SET wallet_points = wallet_points + 300, total_earned = total_earned + 300 WHERE user_id = ?').run(referrerId);
      db.prepare('INSERT INTO transactions (user_id, type, source, amount, description) VALUES (?, ?, ?, ?, ?)').run(
        referrerId, 'earn', 'referral', 300, `Referral bonus for inviting ${username}`
      );
      db.prepare('INSERT INTO referrals (referrer_id, referred_id, bonus_given) VALUES (?, ?, 1)').run(referrerId, newUserId);
    }

    const token = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Registration successful!',
      token,
      user: { user_id: newUserId, username, email, referral_code: myReferralCode }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account is banned.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.user_id);

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        referral_code: user.referral_code,
        wallet_points: user.wallet_points,
        level: user.level,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
