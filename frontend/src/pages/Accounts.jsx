import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/format';

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
        <p className="text-gray-400 text-sm mt-1">All accounts linked to your SecureBank profile.</p>
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
              <p className="font-mono text-lg tracking-widest text-gray-700 dark:text-gray-100">
                {acc.accountNumber}
              </p>
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
