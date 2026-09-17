const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email) && email.length <= 254;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function isNonEmptyString(value, maxLen = 255) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

function isValidAccountNumber(accountNumber) {
  return typeof accountNumber === 'string' && /^\d{12}$/.test(accountNumber);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// These fields are rendered as text, never HTML. Strip markup before storing
// them so API consumers that render responses unsafely are protected too.
function sanitizeText(value, maxLen = 255) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, maxLen);
}

function isValidAmount(amount) {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 && Math.round(n * 100) / 100 === n;
}

function generateAccountNumber() {
  // 12-digit numeric account number.
  let num = '';
  for (let i = 0; i < 12; i += 1) {
    num += Math.floor(Math.random() * 10).toString();
  }
  return num;
}

function maskAccountNumber(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return `•••• •••• ${last4}`;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  isValidAccountNumber,
  isValidDate,
  isValidAmount,
  sanitizeText,
  generateAccountNumber,
  maskAccountNumber,
};
