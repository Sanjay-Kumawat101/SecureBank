const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { isValidAmount, isNonEmptyString } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

// POST /api/transfer
router.post('/', async (req, res, next) => {
  const { recipientAccountNumber, amount, description } = req.body || {};

  if (typeof recipientAccountNumber !== 'string' || recipientAccountNumber.trim().length === 0) {
    return res.status(400).json({ error: 'Recipient account number is required' });
  }
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimal places' });
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 255) {
      return res.status(400).json({ error: 'Description is too long' });
    }
  }

  const transferAmount = Number(amount).toFixed(2);
  const recipientNumber = recipientAccountNumber.trim();
  const safeDescription = isNonEmptyString(description, 255) ? description.trim() : 'Transfer';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the sender's account row for update to prevent race conditions
    // on concurrent transfers from the same account.
    const senderResult = await client.query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY id ASC LIMIT 1 FOR UPDATE',
      [req.userId]
    );
    const senderAccount = senderResult.rows[0];
    if (!senderAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sender account not found' });
    }
    if (senderAccount.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Your account is not active' });
    }

    if (senderAccount.account_number === recipientNumber) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot transfer to your own account' });
    }

    const receiverResult = await client.query(
      'SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE',
      [recipientNumber]
    );
    const receiverAccount = receiverResult.rows[0];
    if (!receiverAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipient account does not exist' });
    }
    if (receiverAccount.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Recipient account is not active' });
    }

    if (Number(senderAccount.balance) < Number(transferAmount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [
      transferAmount,
      senderAccount.id,
    ]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [
      transferAmount,
      receiverAccount.id,
    ]);

    const txResult = await client.query(
      `INSERT INTO transactions (sender_account_id, receiver_account_id, amount, description, type, status)
       VALUES ($1, $2, $3, $4, 'debit', 'completed')
       RETURNING *`,
      [senderAccount.id, receiverAccount.id, transferAmount, safeDescription]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      transaction: txResult.rows[0],
      message: 'Transfer completed successfully',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
