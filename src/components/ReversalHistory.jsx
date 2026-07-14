import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Skeleton from './Skeleton';
import Badge from './Badge';
import Button from './Button';
import { listReversals } from '../api/gateway/reversals';

const toneForStatus = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'EXECUTED') return 'green';
  if (s === 'FAILED' || s === 'REJECTED') return 'red';
  if (s === 'APPROVED' || s === 'EXECUTING') return 'yellow';
  return 'gray';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const resolveItems = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.pageItems)) return data.pageItems;
  return [];
};

export default function ReversalHistory({
  scope,
  platformEntityId,
  fineractEntityId,
  transactionId,
  externalId,
  refreshKey,
  title = 'Reversal History',
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const params = useMemo(() => ({
    scope,
    platformEntityId,
    fineractEntityId,
    transactionId,
    externalId,
    limit: 25,
  }), [scope, platformEntityId, fineractEntityId, transactionId, externalId]);

  const load = async () => {
    if (!scope) return;
    setLoading(true);
    setError('');
    try {
      const data = await listReversals(params);
      setItems(resolveItems(data));
    } catch (err) {
      setItems([]);
      setError(err?.response?.data?.message || err?.message || 'Failed to load reversal history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, refreshKey]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      {loading ? (
        <div className="mt-3"><Skeleton height="8rem" /></div>
      ) : error ? (
        <div className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : !items.length ? (
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No reversal requests found.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/40">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Requested</th>
                <th className="px-3 py-2 text-left font-semibold">Command</th>
                <th className="px-3 py-2 text-left font-semibold">Transaction</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Requested By</th>
                <th className="px-3 py-2 text-left font-semibold">Approved By</th>
                <th className="px-3 py-2 text-left font-semibold">Executed</th>
                <th className="px-3 py-2 text-left font-semibold">Error</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id || `${item.scope}-${item.transactionId}-${item.createdAt}`} className="border-t border-slate-200/60 dark:border-slate-700/60">
                  <td className="px-3 py-2">{formatDate(item.createdAt || item.requestedAt)}</td>
                  <td className="px-3 py-2">{item.command || '-'}</td>
                  <td className="px-3 py-2">{item.transactionId || item.externalId || '-'}</td>
                  <td className="px-3 py-2"><Badge tone={toneForStatus(item.status)}>{item.status || '-'}</Badge></td>
                  <td className="px-3 py-2">{item.requestedBy || '-'}</td>
                  <td className="px-3 py-2">{item.approvedBy || '-'}</td>
                  <td className="px-3 py-2">{formatDate(item.executedAt)}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={item.error || ''}>{item.error || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
