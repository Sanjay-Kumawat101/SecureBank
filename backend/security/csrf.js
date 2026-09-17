const crypto = require('crypto');
const { getSecurityConfig } = require('./securityConfig');

/**
 * CSRF protection for the SecureBank lab.
 *
 * Secure Mode:
 *   - Every authenticated session receives a random CSRF token.
 *   - State-changing requests must send the token in X-CSRF-Token.
 *   - Missing or invalid tokens are rejected.
 *
 * Vulnerable Lab Mode:
 *   - CSRF validation is deliberately skipped.
 *   - The same authenticated request can therefore be submitted
 *     without a CSRF token for demonstration purposes.
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';

function generateCsrfToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Returns the current session's CSRF token.
 *
 * A token is created lazily so existing sessions do not need to
 * be destroyed or recreated when CSRF protection is introduced.
 */
function getOrCreateCsrfToken(req) {
  if (!req.session) {
    throw new Error('Session is required for CSRF protection');
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  return req.session.csrfToken;
}

/**
 * Middleware for state-changing requests.
 *
 * GET/HEAD/OPTIONS requests are intentionally not checked here.
 * The transfer endpoint is POST, so it is protected.
 */
function requireCsrf(req, res, next) {
  const config = getSecurityConfig();

  // Vulnerable Lab Mode: deliberately skip CSRF validation.
  if (!config.csrfProtection) {
    return next();
  }

  const expectedToken = getOrCreateCsrfToken(req);
  const suppliedToken = req.get(CSRF_HEADER);

  if (!suppliedToken || suppliedToken !== expectedToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  return next();
}

module.exports = {
  CSRF_HEADER,
  generateCsrfToken,
  getOrCreateCsrfToken,
  requireCsrf,
};