import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/format';
import SecurityText from '../components/SecurityText';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const limit = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/transactions', {
          params: {
            search: search || undefined,
            type: type || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            page,
            limit,
          },
        });
        if (!cancelled) {
          setTransactions(data.transactions || []);
          setTotalPages(data.totalPages || 1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, type, startDate, endDate, page]);

  useEffect(() => {
    setPage(1);
  }, [search, type, startDate, endDate]);

  const columns = [
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <SecurityText
          value={row.description}
          className="font-medium text-gray-700 dark:text-gray-100"
        />
      ),
    },
    { key: 'createdAt', header: 'Date', render: (row) => formatDate(row.createdAt) },
    {
      key: 'direction',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.direction === 'credit' ? 'success' : 'danger'}>
          {row.direction === 'credit' ? 'Credit' : 'Debit'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className={row.direction === 'credit' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.direction === 'credit' ? '+' : '-'}
          {formatINR(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">Search and filter your transaction history.</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <Input
            placeholder="Search description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-navy-700 bg-white dark:bg-navy-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
          >
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner label="Loading transactions..." />
          </div>
        ) : (
          <>
            <Table columns={columns} data={transactions} onRowClick={(row) => setSelected(row)} />

            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-400">
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Transaction Details"
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Transaction ID</span>
              <span className="font-mono">#{selected.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Description</span>
              <SecurityText value={selected.description} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className={`font-bold text-lg ${selected.direction === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                {selected.direction === 'credit' ? '+' : '-'}
                {formatINR(selected.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <Badge variant={selected.direction === 'credit' ? 'success' : 'danger'}>
                {selected.direction === 'credit' ? 'Credit' : 'Debit'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <Badge variant="success" dot>
                {selected.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span>{formatDate(selected.createdAt)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
