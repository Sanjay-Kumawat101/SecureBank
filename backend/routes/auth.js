const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  generateAccountNumber,
} = require('../utils/validate');

const router = express.Router();
const SALT_ROUNDS = 12;
const STARTING_BALANCE = '10000.00';

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};

  if (!isNonEmptyString(name, 120)) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = await pool.connect();
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, phone, address, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );
    const user = userResult.rows[0];

    // Generate a unique account number (retry on the rare collision).
    let accountNumber;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateAccountNumber();
      const clash = await client.query('SELECT id FROM accounts WHERE account_number = $1', [candidate]);
      if (clash.rows.length === 0) {
        accountNumber = candidate;
        break;
      }
    }
    if (!accountNumber) {
      throw new Error('Could not generate a unique account number');
    }

    const accountResult = await client.query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, status)
       VALUES ($1, $2, 'Savings', $3, 'active')
       RETURNING id, account_number, account_type, balance, status, created_at`,
      [user.id, accountNumber, STARTING_BALANCE]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      user,
      account: accountResult.rows[0],
      message: 'Registration successful. You can now log in.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, session_version FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = rows[0];

    // Always compare against something to reduce timing signal even when
    // no such user exists.
    const hashToCompare = user ? user.password_hash : '$2b$12$invalidsaltinvalidsaltinvalidsalOTOTOTOTOT';
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.sessionVersion = user.session_version;
      return req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.json({
          user: { id: user.id, name: user.name, email: user.email },
        });
      });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  if (!req.session) {
    return res.json({ message: 'Logged out' });
  }
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('securebank.sid');
    return res.json({ message: 'Logged out' });
  });
});

module.exports = router;
