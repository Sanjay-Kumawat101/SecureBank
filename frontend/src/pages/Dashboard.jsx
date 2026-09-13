import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDate, getGreeting } from '../utils/format';
import { Link } from 'react-router-dom';

function StatCard({ label, value, tone }) {
  const toneClasses = {
    emerald: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    navy: 'text-navy-700 bg-navy-50',
  };
  return (
    <Card>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${toneClasses[tone].split(' ')[0]}`}>{formatINR(value)}</p>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [accountRes, txRes] = await Promise.all([
          api.get('/account'),
          api.get('/transactions', { params: { limit: 100 } }),
        ]);
        setAccount(accountRes.data.accounts?.[0] || null);
        setTransactions(txRes.data.transactions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.direction === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions
      .filter((t) => t.direction === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const savings = income - expense;
    return { income, expense, savings };
  }, [transactions]);

  const chartData = useMemo(() => {
    // Bucket the last 6 months by income vs expense.
    const buckets = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short' });
      buckets.set(key, { month: key, income: 0, expense: 0 });
    }
    transactions.forEach((t) => {
      const d = new Date(t.createdAt);
      const key = d.toLocaleString('en-IN', { month: 'short' });
      if (buckets.has(key)) {
        const bucket = buckets.get(key);
        if (t.direction === 'credit') bucket.income += Number(t.amount);
        else bucket.expense += Number(t.amount);
      }
    });
    return Array.from(buckets.values());
  }, [transactions]);

  const recent = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" label="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here&apos;s what&apos;s happening with your money today.</p>
      </div>

      <Card className="bg-gradient-to-br from-navy-800 to-navy-950 text-white border-none">
        <p className="text-navy-200 text-sm">Total Balance</p>
        <p className="text-3xl md:text-4xl font-extrabold mt-1">{formatINR(account?.balance ?? 0)}</p>
        <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-navy-100">
          <span>{account?.accountType} Account</span>
          <span className="opacity-50">&bull;</span>
          <span className="font-mono">{account?.accountNumber}</span>
          <Badge variant="success" dot>
            Active
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Income" value={stats.income} tone="emerald" />
        <StatCard label="Expense" value={stats.expense} tone="red" />
        <StatCard label="Net Savings" value={stats.savings} tone="navy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Income vs Expense" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Recent Transactions"
          actions={
            <Link to="/transactions" className="text-xs font-semibold text-navy-600 hover:underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-gray-50 dark:divide-navy-800">
            {recent.length === 0 && <p className="text-sm text-gray-400 py-4">No transactions yet.</p>}
            {recent.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-100 truncate">{t.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${
                    t.direction === 'credit' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {t.direction === 'credit' ? '+' : '-'}
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
