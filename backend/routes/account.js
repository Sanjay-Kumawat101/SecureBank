const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { maskAccountNumber } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

function serializeAccount(account, { revealFull = false } = {}) {
  return {
    id: account.id,
    accountNumber: revealFull ? account.account_number : maskAccountNumber(account.account_number),
    accountType: account.account_type,
    balance: account.balance,
    status: account.status,
    createdAt: account.created_at,
  };
}

// GET /api/account - the logged-in user's account summary
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY id ASC',
      [req.userId]
    );
    res.json({ accounts: rows.map((a) => serializeAccount(a)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/account/:id - only if it belongs to the logged-in user
router.get('/:id', async (req, res, next) => {
  const accountId = Number(req.params.id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.status(400).json({ error: 'Invalid account id' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, req.userId]
    );
    if (rows.length === 0) {
      // Same response whether the account doesn't exist or belongs to
      // someone else -- avoids leaking which account ids are in use.
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ account: serializeAccount(rows[0], { revealFull: true }) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
