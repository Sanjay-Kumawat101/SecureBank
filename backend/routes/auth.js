const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  sanitizeText,
  generateAccountNumber,
} = require('../utils/validate');
const { getSecurityConfig } = require('../security/securityConfig');
const { looksLikeSqlInjection } = require('../security/sqliDetector');
const { logSecurityEvent } = require('../security/securityLogger');

const router = express.Router();
const SALT_ROUNDS = 12;
const STARTING_BALANCE = '10000.00';

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};
  const config = getSecurityConfig();

  if (config.inputValidation && !isNonEmptyString(name, 120)) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (config.inputValidation && !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (config.inputValidation && !isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const safeName = config.xssProtection && typeof name === 'string' ? sanitizeText(name, 120).trim() : name;
  const registrationName = typeof safeName === 'string' ? safeName.trim() : safeName;

  if (config.xssProtection && !isNonEmptyString(registrationName, 120)) {
    return res.status(400).json({
      error: 'Name contains invalid content or cannot be empty',
    });
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
      [registrationName, normalizedEmail, passwordHash]
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
//
// Phase 2 (SQL Injection) lab: this route runs in one of two modes,
// controlled by security/securityConfig.js -> `sqlInjection`:
//
//   true  (SECURE MODE)      -> strict email-format validation, then a
//                                parameterized query. User input is always
//                                handled as data, never as SQL syntax.
//   false (VULNERABLE LAB MODE) -> format validation is skipped and the
//                                WHERE clause is built by concatenating the
//                                raw email string into the SQL text --
//                                exactly the unsafe pattern this phase is
//                                meant to demonstrate.
//
// The mode is a local, authenticated lab toggle only (see
// routes/security.js / the Security Center UI) -- there is no
// unauthenticated way to flip it.
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  const config = getSecurityConfig();

  if (typeof email !== 'string' || typeof password !== 'string' || email.length === 0 || password.length === 0) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  // Always cap length regardless of mode -- this isn't a security control
  // being demonstrated, just a sane request-size guard.
  if (email.length > 500 || password.length > 500) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (config.sqlInjection && !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  // Detection runs regardless of mode -- a real IDS/WAF would flag this
  // input whether or not the app underneath happens to be vulnerable right
  // now. Whether the attack actually *succeeds* still depends entirely on
  // which branch below runs.
  const suspicious = looksLikeSqlInjection(email) || looksLikeSqlInjection(password);

  try {
    let rows;

    if (config.sqlInjection) {
      // ---------------- SECURE MODE ----------------
      // The SQL command and the user-supplied value are sent to Postgres
      // separately ($1 is a bind parameter, never spliced into the query
      // text), so there is no way for `email` to change what this query
      // does -- it can only ever match (or fail to match) a literal email.
      const normalizedEmail = email.trim().toLowerCase();
      ({ rows } = await pool.query(
        `SELECT id, name, email, password_hash, session_version
         FROM users
         WHERE email = $1`,
        [normalizedEmail]
      ));

      if (suspicious) {
        await logSecurityEvent({
          type: 'SQL_INJECTION',
          severity: 'HIGH',
          endpoint: '/api/auth/login',
          status: 'BLOCKED',
          mode: 'SECURE',
          detail: 'Parameterized query ($1 placeholder) — input treated as literal data, query shape unchanged',
          ip: req.ip,
        });
      }
    } else {
      // ------------- VULNERABLE LAB MODE -------------
      // Deliberately unsafe: the raw request body is spliced directly into
      // the SQL text. This is gated behind the `sqlInjection` lab toggle on
      // purpose -- do not remove the guard around this branch.
      //
      // Note for testers: because this goes through node-postgres's simple
      // query protocol (no bind parameters), Postgres will also execute
      // multiple `;`-separated statements in one call ("stacked queries").
      // For the demo, stick to non-destructive boolean-based payloads like
      // ' OR '1'='1' -- ; do not run DROP/DELETE payloads against a
      // database you care about.
      const query = `
        SELECT id, name, email, password_hash, session_version
        FROM users
        WHERE email = '${email}'
      `;

      try {
        ({ rows } = await pool.query(query));
      } catch (dbErr) {
        // A malformed payload can break the SQL syntax outright -- that is
        // itself evidence of injection, so log it and fail the login
        // normally instead of leaking the raw DB error to the client.
        if (suspicious) {
          await logSecurityEvent({
            type: 'SQL_INJECTION',
            severity: 'HIGH',
            endpoint: '/api/auth/login',
            status: 'DETECTED',
            mode: 'VULNERABLE',
            detail: `Malformed query — database rejected it: ${dbErr.message}`,
            ip: req.ip,
          });
        }
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (suspicious) {
        await logSecurityEvent({
          type: 'SQL_INJECTION',
          severity: 'HIGH',
          endpoint: '/api/auth/login',
          status: 'DETECTED',
          mode: 'VULNERABLE',
          detail: `Unsanitized input concatenated into SQL — query returned ${rows.length} row(s) instead of the expected 0 or 1`,
          ip: req.ip,
        });
      }
    }

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