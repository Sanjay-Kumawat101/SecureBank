const pool = require('../db/pool');

/**
 * Every control here defaults to TRUE ("secure"). Flipping a control to
 * `false` puts that specific area of the app into "Vulnerable Lab Mode" so
 * the exact same code path can be demonstrated before and after a fix,
 * without maintaining two separate copies of the app.
 *
 * This is a LOCAL, AUTHENTICATED, development/lab control only. Every route
 * that reads or writes it lives behind `requireAuth` (see
 * routes/security.js) -- never wire this up to an unauthenticated endpoint
 * like `GET /disable-security` in a real deployment. Deliberately disabling
 * security controls on a live system would itself be a security problem.
 *
 * Phase 3 wires `inputValidation`, `xssProtection`, and `authorization` into
 * the profile, transfer, account, and transaction routes.
 */
const DEFAULTS = {
  sqlInjection: true, // true = parameterized queries on /api/auth/login (secure)
  xssProtection: true, // sanitize user-controlled text on write and read
  authorization: true, // enforce ownership checks on object lookups (IDOR)
  csrfProtection: true, // reserved for a later phase
  secureCookies: true, // reserved for a later phase
  rateLimiting: true, // reserved for a later phase
  securityHeaders: true, // reserved for a later phase
  inputValidation: true, // enforce route input constraints
};

let cache = { ...DEFAULTS };
let loaded = false;

/**
 * Loads persisted control values from `security_settings` into memory,
 * seeding any missing rows with their default. Call once at server startup,
 * before the app starts accepting requests.
 */
async function loadSecurityConfig() {
  const { rows } = await pool.query('SELECT key, value FROM security_settings');
  const fromDb = {};
  rows.forEach((row) => {
    fromDb[row.key] = row.value;
  });

  cache = { ...DEFAULTS, ...fromDb };

  const missingKeys = Object.keys(DEFAULTS).filter((key) => !(key in fromDb));
  await Promise.all(
    missingKeys.map((key) =>
      pool.query(
        `INSERT INTO security_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, DEFAULTS[key]]
      )
    )
  );

  loaded = true;
  return { ...cache };
}

/** Synchronous read of the in-memory cache -- safe to call from any request handler. */
function getSecurityConfig() {
  return { ...cache };
}

/** Persists one control's new value to the DB and updates the in-memory cache. */
async function setSecurityControl(key, value) {
  if (!(key in DEFAULTS)) {
    const err = new Error(`Unknown security control: ${key}`);
    err.status = 400;
    throw err;
  }
  if (typeof value !== 'boolean') {
    const err = new Error('value must be a boolean');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO security_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );

  cache = { ...cache, [key]: value };
  return { ...cache };
}

function isLoaded() {
  return loaded;
}

module.exports = {
  DEFAULTS,
  loadSecurityConfig,
  getSecurityConfig,
  setSecurityControl,
  isLoaded,
};