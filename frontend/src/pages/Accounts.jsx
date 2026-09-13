import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';

function AccountNumber({ accountId, masked }) {
  const [revealed, setRevealed] = useState(false);
  const [fullNumber, setFullNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const reveal = async () => {
    if (fullNumber) {
      setRevealed((r) => !r);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/account/${accountId}`);
      setFullNumber(data.account.accountNumber);
      setRevealed(true);
    } catch (err) {
      toast.showToast('Could not load full account number', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!fullNumber) return;
    try {
      await navigator.clipboard.writeText(fullNumber);
      toast.showToast('Account number copied', 'success');
    } catch (err) {
      toast.showToast('Copy failed — select and copy manually', 'error');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-lg tracking-widest text-gray-700 dark:text-gray-100">
        {revealed && fullNumber ? fullNumber : masked}
      </p>
      <button
        type="button"
        onClick={reveal}
        disabled={loading}
        className="text-xs font-semibold text-navy-600 dark:text-navy-300 hover:underline disabled:opacity-50"
      >
        {loading ? '...' : revealed ? 'Hide' : 'Show full number'}
      </button>
      {revealed && fullNumber && (
        <button
          type="button"
          onClick={copy}
          className="text-xs font-semibold text-navy-600 dark:text-navy-300 hover:underline"
        >
          Copy
        </button>
      )}
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/account');
        setAccounts(data.accounts || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" label="Loading your accounts..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Accounts</h1>
        <p className="text-gray-400 text-sm mt-1">
          All accounts linked to your SecureBank profile. Tap "Show full number" to reveal and
          copy your account number so others can transfer money to you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((acc) => (
          <Card key={acc.id} className="relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-navy-50 dark:bg-navy-800/40" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-navy-700 dark:text-navy-200 uppercase tracking-wide">
                  {acc.accountType} Account
                </span>
                <Badge variant={acc.status === 'active' ? 'success' : 'danger'} dot>
                  {acc.status === 'active' ? 'Active' : acc.status}
                </Badge>
              </div>
              <AccountNumber accountId={acc.id} masked={acc.accountNumber} />
              <p className="text-3xl font-extrabold text-gray-800 dark:text-white mt-4">
                {formatINR(acc.balance)}
              </p>
              <p className="text-xs text-gray-400 mt-2">Opened {formatDate(acc.createdAt)}</p>
            </div>
          </Card>
        ))}
        {accounts.length === 0 && <p className="text-gray-400">No accounts found.</p>}
      </div>
    </div>
  );
}
