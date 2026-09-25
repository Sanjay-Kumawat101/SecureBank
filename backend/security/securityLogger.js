const pool = require('../db/pool');

/**
 * Records a security event (e.g. a detected SQL injection attempt) both to
 * the server console and to the `security_logs` table, so the Security
 * Dashboard's Attack Logs can show a live, persistent feed of what the lab
 * has caught.
 *
 * Never throws -- a logging failure must not break the request that
 * triggered it (e.g. a login attempt should still succeed/fail correctly
 * even if the DB write for the log entry itself fails).
 */
async function logSecurityEvent({
  type,
  severity = 'MEDIUM',
  endpoint = null,
  status,
  mode = null,
  detail = null,
  ip = null,
  userId = null,
}) {
  const event = {
    type,
    severity,
    endpoint,
    status,
    mode,
    detail,
    ip_address: ip,
    user_id: userId,
    timestamp: new Date().toISOString(),
  };

  // eslint-disable-next-line no-console
  console.warn('[SECURITY EVENT]', JSON.stringify(event));

  try {
    const { rows } = await pool.query(
      `INSERT INTO security_logs (type, severity, endpoint, status, mode, detail, ip_address, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [type, severity, endpoint, status, mode, detail, ip, userId]
    );
    return rows[0];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist security event:', err.message);
    return event;
  }
}

async function getRecentEvents({ limit = 50, type = null } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  const baseQuery = `
    SELECT
      security_logs.*,
      users.name AS user_name
    FROM security_logs
    LEFT JOIN users
      ON security_logs.user_id = users.id
  `;

  if (type) {
    const { rows } = await pool.query(
      `${baseQuery}
       WHERE security_logs.type = $1
       ORDER BY security_logs.created_at DESC
       LIMIT $2`,
      [type, cappedLimit]
    );
    return rows;
  }

  const { rows } = await pool.query(
    `${baseQuery}
     ORDER BY security_logs.created_at DESC
     LIMIT $1`,
    [cappedLimit]
  );

  return rows;
}

module.exports = { logSecurityEvent, getRecentEvents };