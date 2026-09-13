const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { isValidPassword, isNonEmptyString } = require('../utils/validate');

const router = express.Router();
const SALT_ROUNDS = 12;

router.use(requireAuth);

// GET /api/user/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, address, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/profile
router.put('/profile', async (req, res, next) => {
  const { name, phone, address } = req.body || {};

  if (name !== undefined && !isNonEmptyString(name, 120)) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    return res.status(400).json({ error: 'Invalid phone value' });
  }
  if (phone !== undefined && phone !== null && phone.length > 30) {
    return res.status(400).json({ error: 'Phone number too long' });
  }
  if (address !== undefined && address !== null && typeof address !== 'string') {
    return res.status(400).json({ error: 'Invalid address value' });
  }
  if (address !== undefined && address !== null && address.length > 500) {
    return res.status(400).json({ error: 'Address too long' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address)
       WHERE id = $4
       RETURNING id, name, email, phone, address, created_at`,
      [name ?? null, phone ?? null, address ?? null, req.userId]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/user/change-password
router.post('/change-password', async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/user/logout-all-sessions
router.post('/logout-all-sessions', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version',
      [req.userId]
    );
    const newVersion = rows[0].session_version;

    // Keep the current request's own session alive by bumping it forward
    // too, since the user just asked to log out *other* sessions, not
    // necessarily this one.
    req.session.sessionVersion = newVersion;
    req.session.save((err) => {
      if (err) return next(err);
      res.json({ message: 'All other sessions have been logged out' });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
