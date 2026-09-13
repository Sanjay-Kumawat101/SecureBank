const pool = require('../db/pool');

/**
 * Requires an authenticated session. Also re-checks the user's
 * `session_version` against the value stamped into the session at login
 * time, so that "logout all sessions" (which bumps session_version) makes
 * every older session invalid on its very next request, even though the
 * session store still technically holds them.
 */
async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { rows } = await pool.query(
      'SELECT id, session_version FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = rows[0];

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (user.session_version !== req.session.sessionVersion) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }

    req.userId = user.id;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
