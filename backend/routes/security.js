const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getSecurityConfig,
  setSecurityControl,
  DEFAULTS,
} = require('../security/securityConfig');
const {
  logSecurityEvent,
  getRecentEvents,
} = require('../security/securityLogger');
const { getOrCreateCsrfToken } = require('../security/csrf');

const router = express.Router();

// Every route below requires a logged-in session. This is a local
// development/lab control panel for the Security Center, not a public
// admin surface -- do not expose an unauthenticated version of this in a
// real deployment.
router.use(requireAuth);

// GET /api/security/config
router.get('/config', (req, res) => {
  res.json({ config: getSecurityConfig() });
});

// GET /api/security/csrf-token
//
// Returns the CSRF token belonging to the currently authenticated session.
// The token is intentionally returned through an authenticated API call;
// it is not stored in a separate cookie.
router.get('/csrf-token', (req, res, next) => {
  try {
    const token = getOrCreateCsrfToken(req);

    res.json({
      csrfToken: token,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/security/config
// body: { key, value }
router.put('/config', async (req, res, next) => {
  const { key, value } = req.body || {};

  if (typeof key !== 'string' || !(key in DEFAULTS)) {
    return res.status(400).json({ error: 'Unknown security control' });
  }

  if (typeof value !== 'boolean') {
    return res.status(400).json({ error: 'value must be true or false' });
  }

  try {
    const config = await setSecurityControl(key, value);

    await logSecurityEvent({
      type: 'CONFIG_CHANGE',
      severity: value ? 'LOW' : 'MEDIUM',
      endpoint: '/api/security/config',
      status: value ? 'SECURED' : 'VULNERABLE_MODE_ENABLED',
      mode: value ? 'SECURE' : 'VULNERABLE',
      detail: `${key} turned ${value ? 'ON (secure)' : 'OFF (vulnerable lab mode)'} by user #${req.userId}`,
      ip: req.ip,
      userId: req.userId,
    });

    res.json({ config });
  } catch (err) {
    next(err);
  }
});

// GET /api/security/events?limit=50&type=SQL_INJECTION
router.get('/events', async (req, res, next) => {
  try {
    const events = await getRecentEvents({
      limit: req.query.limit,
      type: req.query.type || null,
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;