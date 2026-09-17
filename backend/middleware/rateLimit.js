const { getSecurityConfig } = require('../security/securityConfig');
const { logSecurityEvent } = require('../security/securityLogger');

const attempts = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function getClientIp(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function loginRateLimit(req, res, next) {
  const config = getSecurityConfig();

  // Vulnerable Lab Mode: allow requests without rate limiting.
  if (!config.rateLimiting) {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();

  let record = attempts.get(ip);

  if (!record || now - record.windowStart >= WINDOW_MS) {
    record = {
      windowStart: now,
      count: 0,
    };

    attempts.set(ip, record);
  }

  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    logSecurityEvent({
      type: 'RATE_LIMIT',
      severity: 'MEDIUM',
      endpoint: req.originalUrl,
      status: 'BLOCKED',
      mode: 'SECURE',
      detail: `Login request blocked after ${MAX_ATTEMPTS} requests within 60 seconds.`,
      ip,
    });

    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
  }

  return next();
}

module.exports = {
  loginRateLimit,
};