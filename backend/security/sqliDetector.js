/**
 * Lightweight heuristic SQL-injection pattern matcher used purely to drive
 * the Security Dashboard's event log / demo (Phase 2). It is NOT a
 * substitute for parameterized queries and NOT a real WAF -- it just flags
 * obviously SQL-shaped input so the app can log "a SQL injection attempt
 * was detected" regardless of whether the underlying query construction
 * was actually vulnerable at the time (Secure Mode should still detect and
 * BLOCK; Vulnerable Lab Mode detects and the attack actually goes through).
 */

const PATTERNS = [
  /'\s*or\s*'?1'?\s*=\s*'?1/i, // ' OR '1'='1
  /'\s*or\s*1\s*=\s*1/i, // ' OR 1=1
  /--/, // SQL line comment
  /;\s*(drop|delete|update|insert|alter|truncate)\b/i, // stacked/destructive statement
  /\bunion\b\s+\bselect\b/i, // UNION-based injection
  /\bselect\b.+\bfrom\b/i, // embedded SELECT
  /\bxp_cmdshell\b/i,
  /\/\*[\s\S]*?\*\//, // block comment
  /'\s*;/, // quote followed by statement terminator
];

function looksLikeSqlInjection(input) {
  if (typeof input !== 'string' || input.length === 0) return false;
  return PATTERNS.some((pattern) => pattern.test(input));
}

module.exports = { looksLikeSqlInjection };