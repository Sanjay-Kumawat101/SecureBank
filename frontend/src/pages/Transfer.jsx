import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/format';

export default function Transfer() {
  const [account, setAccount] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [form, setForm] = useState({
    recipientAccountNumber: '',
    amount: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      setLoadingAccount(true);

      try {
        const [accountResponse, csrfResponse] = await Promise.all([
          api.get('/account'),
          api.get('/security/csrf-token'),
        ]);

        setAccount(accountResponse.data.accounts?.[0] || null);
        setCsrfToken(csrfResponse.data.csrfToken || '');
      } catch (err) {
        showToast(
          err?.response?.data?.error ||
            'Could not load transfer security information',
          'error'
        );
      } finally {
        setLoadingAccount(false);
      }
    })();
  }, [showToast]);

  function update(field) {
    return (e) =>
      setForm((f) => ({
        ...f,
        [field]: e.target.value,
      }));
  }

  function validate() {
    const next = {};

    if (!form.recipientAccountNumber.trim()) {
      next.recipientAccountNumber =
        'Recipient account number is required';
    }

    const amountNum = Number(form.amount);

    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = 'Enter a valid amount greater than zero';
    } else if (
      account &&
      amountNum > Number(account.balance)
    ) {
      next.amount =
        'Amount exceeds your available balance';
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  function handleReview(e) {
    e.preventDefault();

    if (validate()) {
      setReviewOpen(true);
    }
  }

  async function handleConfirm() {
    setSubmitting(true);

    try {
      await api.post(
        '/transfer',
        {
          recipientAccountNumber:
            form.recipientAccountNumber.trim(),
          amount: Number(form.amount),
          description: form.description || 'Transfer',
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      showToast(
        'Transfer completed successfully',
        'success'
      );

      setForm({
        recipientAccountNumber: '',
        amount: '',
        description: '',
      });

      setReviewOpen(false);

      const { data } = await api.get('/account');
      setAccount(data.accounts?.[0] || null);
    } catch (err) {
      showToast(
        err?.response?.data?.error ||
          'Transfer failed',
        'error'
      );

      setReviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAccount) {
    return (
      <div className="py-24">
        <LoadingSpinner
          size="lg"
          label="Loading your account..."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Transfer Money
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          Send money to any SecureBank account instantly.
        </p>
      </div>

      <Card>
        <form
          onSubmit={handleReview}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              From
            </label>

            <div className="rounded-lg border border-gray-200 dark:border-navy-700 bg-gray-50 dark:bg-navy-800 px-3 py-2 text-sm flex items-center justify-between">
              <span className="font-mono">
                {account?.accountNumber}
              </span>

              <span className="text-gray-400">
                {formatINR(account?.balance ?? 0)} available
              </span>
            </div>
          </div>

          <Input
            label="Recipient account number"
            name="recipientAccountNumber"
            required
            value={form.recipientAccountNumber}
            onChange={update('recipientAccountNumber')}
            placeholder="12-digit account number"
            error={errors.recipientAccountNumber}
          />

          <Input
            label="Amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            prefix="₹"
            value={form.amount}
            onChange={update('amount')}
            placeholder="0.00"
            error={errors.amount}
          />

          <Input
            label="Description"
            name="description"
            value={form.description}
            onChange={update('description')}
            placeholder="What's this for?"
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
          >
            Review Transfer
          </Button>
        </form>
      </Card>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Confirm Transfer"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReviewOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              onClick={handleConfirm}
              loading={submitting}
            >
              Confirm &amp; Send
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">
              From
            </span>

            <span className="font-mono">
              {account?.accountNumber}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">
              To
            </span>

            <span className="font-mono">
              {form.recipientAccountNumber}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">
              Amount
            </span>

            <span className="font-bold text-lg">
              {formatINR(form.amount || 0)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">
              Description
            </span>

            <span>
              {form.description || 'Transfer'}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}