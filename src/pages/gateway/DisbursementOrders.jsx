import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Skeleton from '../../components/Skeleton';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import {
  getDisbursementOrder,
  getDisbursementOrderStatus,
  listDisbursementOrders,
  refreshDisbursementOrderStatus,
  retryDisbursementOrder,
} from '../../api/gateway/disbursementOrders';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const toneForStatus = (s) => {
  const v = String(s || '').toUpperCase();
  if (v.includes('DISBURSED') || v.includes('SUCCESS')) return 'green';
  if (v.includes('REQUEST') || v.includes('PENDING')) return 'yellow';
  if (v.includes('FAILED') || v.includes('ERROR')) return 'red';
  return 'blue';
};

const timeAgo = (iso) => {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return String(iso);
  const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
};

const JsonBlock = ({ value }) => (
  <pre className="max-h-60 overflow-auto rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs dark:border-slate-700/70 dark:bg-slate-900/50">
    {value ? JSON.stringify(value, null, 2) : '{}'}
  </pre>
);

const Stage = ({ title, at, data }) => (
  <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{at ? timeAgo(at) : '-'}</div>
    </div>
    <div className="mt-2">
      <JsonBlock value={data} />
    </div>
  </div>
);

const Metric = ({ label, value, tone = 'blue' }) => (
  <div className="rounded-xl border border-slate-200/70 bg-white/75 p-3 dark:border-slate-700/70 dark:bg-slate-900/45">
    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
      <Badge tone={tone}>{value}</Badge>
    </div>
  </div>
);

const DisbursementOrders = () => {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [selected, setSelected] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [retryBusyByOrderId, setRetryBusyByOrderId] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listDisbursementOrders({
          q: debouncedSearch || undefined,
          status: status || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((x) => ({ ...x, id: x?.orderId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        addToast(e?.response?.data?.message || e?.message || 'Failed to load disbursement orders', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, page, limit, sortBy, sortDir, refreshTick, addToast]);

  const onSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const openDetails = async (row) => {
    const orderId = row?.orderId;
    if (!orderId) return;
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const [order, statusResp] = await Promise.all([
        getDisbursementOrder(orderId),
        getDisbursementOrderStatus(orderId),
      ]);
      setSelected(order);
      setSelectedStatus(statusResp);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Failed to load order details', 'error');
      setDetailsOpen(false);
      setSelected(null);
      setSelectedStatus(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!selected?.orderId) return;
    setStatusBusy(true);
    try {
      const refreshed = await refreshDisbursementOrderStatus(selected.orderId);
      const order = await getDisbursementOrder(selected.orderId);
      setSelected(order);
      setSelectedStatus(refreshed);
      addToast('Status refreshed', 'success');
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Status refresh failed', 'error');
    } finally {
      setStatusBusy(false);
    }
  };

  const retryOrder = async (orderId) => {
    if (!orderId) return;
    setRetryBusyByOrderId((prev) => ({ ...prev, [orderId]: true }));
    try {
      await retryDisbursementOrder(orderId);
      const [order, statusResp] = await Promise.all([
        getDisbursementOrder(orderId),
        getDisbursementOrderStatus(orderId),
      ]);
      if (selected?.orderId === orderId) {
        setSelected(order);
        setSelectedStatus(statusResp);
      }
      setRefreshTick((t) => t + 1);
      addToast('Retry submitted', 'success');
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Retry failed', 'error');
    } finally {
      setRetryBusyByOrderId((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const metrics = useMemo(() => {
    const source = rows || [];
    const counts = {
      total: source.length,
      disbursed: source.filter((x) => String(x?.status || '').toUpperCase().includes('DISBURSED')).length,
      inProgress: source.filter((x) => String(x?.status || '').toUpperCase().includes('REQUEST') || String(x?.status || '').toUpperCase().includes('SUCCESS')).length,
      failed: source.filter((x) => String(x?.status || '').toUpperCase().includes('FAILED')).length,
    };
    return counts;
  }, [rows]);

  const columns = useMemo(
    () => [
      { key: 'orderId', header: 'Order', sortable: true, render: (r) => <span className="font-mono text-xs">{r?.orderId || '-'}</span> },
      { key: 'platformLoanId', header: 'Loan', sortable: true, render: (r) => r?.platformLoanId || '-' },
      { key: 'amount', header: 'Amount', sortable: true, render: (r) => `${money(r?.amount)} ${r?.currency || ''}`.trim() || '-' },
      { key: 'aggregatorProvider', header: 'Provider', sortable: true, render: (r) => r?.aggregatorProvider || '-' },
      { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge tone={toneForStatus(r?.status)}>{r?.status || '-'}</Badge> },
      { key: 'updatedAt', header: 'Updated', sortable: true, render: (r) => timeAgo(r?.updatedAt || r?.createdAt) },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={(e) => {
                e.stopPropagation();
                openDetails(r);
              }}
              title="View journey"
            >
              <Eye size={16} />
            </Button>
            {String(r?.status || '').toUpperCase() !== 'DISBURSED' ? (
              <Button
                size="sm"
                variant="secondary"
                className="px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  retryOrder(r?.orderId);
                }}
                disabled={!!retryBusyByOrderId[r?.orderId]}
                title="Retry disbursement"
              >
                Retry
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [retryBusyByOrderId]
  );

  const journey = selected?.journey || {};

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-cyan-50 via-emerald-50 to-teal-100 p-5 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-700/20" />
        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-700/20" />
        <h1 className="text-2xl font-bold">Disbursement Orders</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Monitor payout progress from lookup to aggregator, callback, and Fineract posting.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Loaded Orders" value={String(metrics.total)} tone="blue" />
        <Metric label="Disbursed" value={String(metrics.disbursed)} tone="green" />
        <Metric label="In Progress" value={String(metrics.inProgress)} tone="yellow" />
        <Metric label="Failed" value={String(metrics.failed)} tone="red" />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order id, loan id, status, provider..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <input
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              placeholder="optional"
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex items-end justify-end gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={openDetails}
          emptyMessage="No disbursement orders found"
        />
      </Card>

      <Modal
        open={detailsOpen}
        onClose={() => (statusBusy ? null : setDetailsOpen(false))}
        title="Disbursement Journey"
        size="5xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailsOpen(false)} disabled={statusBusy}>
              Close
            </Button>
            <Button onClick={refreshStatus} disabled={statusBusy || !selected?.orderId}>
              {statusBusy ? 'Refreshing...' : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={14} />
                  Refresh Status
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => retryOrder(selected?.orderId)}
              disabled={!selected?.orderId || !!retryBusyByOrderId[selected?.orderId]}
            >
              {!!retryBusyByOrderId[selected?.orderId] ? 'Retrying...' : 'Retry'}
            </Button>
          </>
        }
      >
        {detailsLoading ? (
          <div className="space-y-3">
            <Skeleton height="2.5rem" />
            <Skeleton height="10rem" />
            <Skeleton height="10rem" />
          </div>
        ) : !selected ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">No order selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Order</div>
                <div className="mt-1 font-mono text-xs break-all">{selected.orderId}</div>
              </div>
              <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>
                <div className="mt-1"><Badge tone={toneForStatus(selectedStatus?.status || selected.status)}>{selectedStatus?.status || selected.status || '-'}</Badge></div>
              </div>
              <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</div>
                <div className="mt-1 text-sm font-semibold">{money(selected.amount)} {selected.currency || ''}</div>
              </div>
              <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider Ref</div>
                <div className="mt-1 text-xs font-mono break-all">{selected.aggregatorReferenceId || '-'}</div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Stage title="1. Name Lookup" at={journey.lookupAt} data={{ request: journey.lookupRequest, response: journey.lookupResponse }} />
              <Stage
                title="2. Disbursement Request"
                at={journey.disburseRespondedAt || journey.disburseRequestedAt}
                data={{ request: journey.disburseRequest, response: journey.disburseResponse }}
              />
              <Stage title="3. Callback / Status" at={journey.callbackAt} data={journey.callbackPayload} />
              <Stage
                title="4. Fineract Posting"
                at={journey.fineractRespondedAt || journey.fineractRequestedAt}
                data={{ request: journey.fineractRequest, response: journey.fineractResponse }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DisbursementOrders;
