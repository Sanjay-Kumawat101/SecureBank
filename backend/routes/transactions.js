const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getSecurityConfig } = require('../security/securityConfig');
const { isValidDate, sanitizeText } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

async function getUserAccountIds(userId) {
  const { rows } = await pool.query('SELECT id FROM accounts WHERE user_id = $1', [userId]);
  return rows.map((r) => r.id);
}

function serializeForUser(row, accountIds) {
  // Derive the direction of the transaction relative to the requesting
  // user's own account(s), regardless of the stored `type` label.
  const isReceiver = accountIds.includes(row.receiver_account_id);
  const isSender = accountIds.includes(row.sender_account_id);
  let direction = 'debit';
  if (isReceiver && !isSender) direction = 'credit';
  else if (isSender && !isReceiver) direction = 'debit';
  else if (isReceiver && isSender) direction = 'self';

  return {
    id: row.id,
    amount: row.amount,
    description: getSecurityConfig().xssProtection ? sanitizeText(row.description, 255) : row.description,
    direction,
    status: row.status,
    createdAt: row.created_at,
    senderAccountId: row.sender_account_id,
    receiverAccountId: row.receiver_account_id,
  };
}

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const accountIds = await getUserAccountIds(req.userId);
    if (accountIds.length === 0) {
      return res.json({ transactions: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    }

    const {
      search,
      type, // 'credit' | 'debit'
      startDate,
      endDate,
      page: pageRaw,
      limit: limitRaw,
    } = req.query;

    if (getSecurityConfig().inputValidation) {
      if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
        return res.status(400).json({ error: 'Search text is too long' });
      }
      if (startDate !== undefined && !isValidDate(startDate)) {
        return res.status(400).json({ error: 'Invalid start date' });
      }
      if (endDate !== undefined && !isValidDate(endDate)) {
        return res.status(400).json({ error: 'Invalid end date' });
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
    }

    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const offset = (page - 1) * limit;

    const conditions = ['(sender_account_id = ANY($1::int[]) OR receiver_account_id = ANY($1::int[]))'];
    const params = [accountIds];

    if (search && typeof search === 'string' && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
      conditions.push(`description ILIKE $${params.length}`);
    }

    if (type === 'credit') {
      params.push(accountIds);
      conditions.push(`receiver_account_id = ANY($${params.length}::int[])`);
    } else if (type === 'debit') {
      params.push(accountIds);
      conditions.push(`sender_account_id = ANY($${params.length}::int[])`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`created_at >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);
    const listResult = await pool.query(
      `SELECT * FROM transactions WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      transactions: listResult.rows.map((row) => serializeForUser(row, accountIds)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', async (req, res, next) => {
  const txId = Number(req.params.id);
  if (!Number.isInteger(txId) || txId <= 0) {
    return res.status(400).json({ error: 'Invalid transaction id' });
  }

  try {
    const accountIds = await getUserAccountIds(req.userId);
    if (accountIds.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const authorization = getSecurityConfig().authorization;
    const result = authorization
      ? await pool.query(
          `SELECT * FROM transactions
           WHERE id = $1 AND (sender_account_id = ANY($2::int[]) OR receiver_account_id = ANY($2::int[]))`,
          [txId, accountIds]
        )
      : await pool.query('SELECT * FROM transactions WHERE id = $1', [txId]);
    const { rows } = result;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: serializeForUser(rows[0], accountIds) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
