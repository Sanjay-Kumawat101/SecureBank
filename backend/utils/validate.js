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
  isValidAmount,
  generateAccountNumber,
  maskAccountNumber,
};
