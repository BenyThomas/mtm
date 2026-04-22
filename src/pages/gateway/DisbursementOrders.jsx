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
import { getGwLoan } from '../../api/gateway/loans';

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

const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const toDateInputValue = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const getDefaultDateRange = () => {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return {
    dateFrom: toDateInputValue(monthAgo),
    dateTo: toDateInputValue(today),
  };
};

const Metric = ({ label, value, tone = 'blue' }) => (
  <div className="rounded-xl border border-slate-200/70 bg-white/75 p-3 dark:border-slate-700/70 dark:bg-slate-900/45">
    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
      <Badge tone={tone}>{value}</Badge>
    </div>
  </div>
);

const DetailItem = ({ label, value, mono = false }) => (
  <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`mt-1 text-sm ${mono ? 'font-mono break-all text-xs' : 'font-medium text-slate-900 dark:text-slate-50'}`}>
      {value || '-'}
    </div>
  </div>
);

const TimelineItem = ({ title, at, tone = 'blue', detail }) => (
  <div className="flex gap-3">
    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current text-slate-400" />
    <div className="min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</div>
        <Badge tone={tone}>{at ? fmtDateTime(at) : 'Pending'}</Badge>
      </div>
      {detail ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</div> : null}
    </div>
  </div>
);

const DisbursementOrders = () => {
  const { addToast } = useToast();
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('DISBURSED');
  const [provider, setProvider] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultDateRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultDateRange.dateTo);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loanByPlatformId, setLoanByPlatformId] = useState({});

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
          provider: provider || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
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
  }, [debouncedSearch, status, provider, dateFrom, dateTo, page, limit, sortBy, sortDir, refreshTick, addToast]);

  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(new Set((rows || []).map((row) => String(row?.platformLoanId || '').trim()).filter(Boolean)));
    if (!ids.length) {
      setLoanByPlatformId({});
      return () => {};
    }
    (async () => {
      const entries = await Promise.all(ids.map(async (id) => {
        try {
          const loan = await getGwLoan(id);
          return [id, loan];
        } catch (_) {
          return [id, null];
        }
      }));
      if (cancelled) return;
      setLoanByPlatformId(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

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
      amount: source.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0),
    };
    return counts;
  }, [rows]);

  const exportCsv = () => {
    const header = [
      'Disbursed At',
      'Requested Date',
      'Customer Name',
      'Customer Phone',
      'Platform Loan ID',
      'Fineract Loan ID',
      'Fineract Txn ID',
      'Amount',
      'Currency',
      'Provider',
      'Type',
      'Destination',
      'Reference',
      'Status',
    ];
    const lines = rows.map((row) => {
      const loan = loanByPlatformId[String(row?.platformLoanId || '')] || {};
      const destination = row?.payout?.msisdn || row?.payout?.accountNumber || '';
      return [
        row?.disbursedAt || '',
        row?.requestedDisbursementDate || '',
        loan?.customerFullName || '',
        loan?.customerPhone || '',
        row?.platformLoanId || '',
        row?.fineractLoanId || '',
        row?.fineractTransactionId || '',
        row?.amount ?? '',
        row?.currency || '',
        row?.aggregatorProvider || '',
        row?.payout?.type || '',
        destination,
        row?.aggregatorReferenceId || '',
        row?.status || '',
      ].map(csvEscape).join(',');
    });
    const blob = new Blob([[header.map(csvEscape).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disbursement_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      {
        key: 'disbursedAt',
        header: 'Disbursed At',
        sortable: true,
        render: (r) => fmtDateTime(r?.disbursedAt || r?.updatedAt || r?.createdAt),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: false,
        render: (r) => {
          const loan = loanByPlatformId[String(r?.platformLoanId || '')] || {};
          return (
            <div className="min-w-[180px]">
              <div className="font-medium text-slate-900 dark:text-slate-50">{loan?.customerFullName || '-'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{loan?.customerPhone || '-'}</div>
            </div>
          );
        },
      },
      { key: 'fineractLoanId', header: 'Fineract Loan', sortable: false, render: (r) => r?.fineractLoanId || '-' },
      { key: 'platformLoanId', header: 'Platform Loan', sortable: true, render: (r) => r?.platformLoanId || '-' },
      { key: 'amount', header: 'Amount', sortable: true, render: (r) => `${money(r?.amount)} ${r?.currency || ''}`.trim() || '-' },
      { key: 'requestedDisbursementDate', header: 'Requested Date', sortable: false, render: (r) => r?.requestedDisbursementDate || '-' },
      { key: 'aggregatorProvider', header: 'Provider', sortable: true, render: (r) => r?.aggregatorProvider || '-' },
      { key: 'payoutType', header: 'Type', sortable: false, render: (r) => r?.payout?.type || '-' },
      {
        key: 'destination',
        header: 'Destination',
        sortable: false,
        render: (r) => r?.payout?.msisdn || r?.payout?.accountNumber || '-',
      },
      { key: 'aggregatorReferenceId', header: 'Reference', sortable: false, render: (r) => r?.aggregatorReferenceId || '-' },
      { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge tone={toneForStatus(r?.status)}>{r?.status || '-'}</Badge> },
      { key: 'fineractTransactionId', header: 'Fineract Txn', sortable: false, render: (r) => r?.fineractTransactionId || '-' },
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
    [retryBusyByOrderId, loanByPlatformId]
  );

  const journey = selected?.journey || {};
  const selectedLoan = selected?.platformLoanId ? loanByPlatformId[String(selected.platformLoanId)] : null;
  const payoutDestination = selected?.payout?.msisdn || selected?.payout?.accountNumber || '';
  const activityTimeline = useMemo(() => {
    if (!selected) return [];
    const items = [
      {
        key: 'requested',
        title: 'Order created',
        at: selected.createdAt,
        tone: 'blue',
        detail: 'Disbursement request was created in Gateway.',
      },
      {
        key: 'aggregator',
        title: 'Sent to payout provider',
        at: journey.disburseRequestedAt || journey.disburseRespondedAt,
        tone: String(selected.status || '').toUpperCase().includes('FAILED') ? 'red' : 'yellow',
        detail: selected.aggregatorProvider ? `Provider: ${selected.aggregatorProvider}` : 'Awaiting provider dispatch.',
      },
      {
        key: 'callback',
        title: 'Provider status received',
        at: journey.callbackAt || selected.aggregatorCallbackAt,
        tone: toneForStatus(selected.aggregatorCallbackStatus || selected.status),
        detail: selected.aggregatorCallbackStatus || 'No provider callback/status received yet.',
      },
      {
        key: 'fineract',
        title: 'Posted to Fineract',
        at: journey.fineractRespondedAt || selected.disbursedAt,
        tone: String(selected.status || '').toUpperCase().includes('DISBURSED') ? 'green' : 'blue',
        detail: selected.fineractTransactionId ? `Transaction ID: ${selected.fineractTransactionId}` : 'Awaiting Fineract posting.',
      },
    ];
    const auditItems = Array.isArray(selected.auditTrail)
      ? selected.auditTrail
          .filter((event) => event?.at || event?.message || event?.status)
          .map((event, index) => ({
            key: `audit-${index}`,
            title: event?.step || event?.status || 'Update',
            at: event?.at,
            tone: toneForStatus(event?.status),
            detail: event?.message || '',
          }))
      : [];
    return [...items, ...auditItems];
  }, [journey, selected]);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-cyan-50 via-emerald-50 to-teal-100 p-5 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-700/20" />
        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-700/20" />
        <h1 className="text-2xl font-bold">Disbursement Report</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Fineract-aligned operational report for loan disbursements, payout channel, and posting outcome.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Loaded Orders" value={String(metrics.total)} tone="blue" />
        <Metric label="Disbursed" value={String(metrics.disbursed)} tone="green" />
        <Metric label="In Progress" value={String(metrics.inProgress)} tone="yellow" />
        <Metric label="Failed" value={String(metrics.failed)} tone="red" />
        <Metric label="Loaded Amount" value={money(metrics.amount)} tone="blue" />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer, loan id, provider, reference..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="AGGREGATOR_REQUEST_SENT">Aggregator Sent</option>
              <option value="AGGREGATOR_SUCCESS">Aggregator Success</option>
              <option value="AGGREGATOR_FAILED">Aggregator Failed</option>
              <option value="FINERACT_FAILED">Fineract Failed</option>
              <option value="UNDONE">Undone</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</label>
            <input
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setPage(0);
              }}
              placeholder="AZAMPAY, SELCOM..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatus('DISBURSED');
                setProvider('');
                setDateFrom(defaultDateRange.dateFrom);
                setDateTo(defaultDateRange.dateTo);
                setPage(0);
              }}
            >
              Clear
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              Export CSV
            </Button>
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
        title="Disbursement Details"
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
              <DetailItem label="Customer Name" value={selectedLoan?.customerFullName} />
              <DetailItem label="Customer Phone" value={selectedLoan?.customerPhone} />
              <DetailItem label="Amount" value={`${money(selected.amount)} ${selected.currency || ''}`.trim()} />
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Status</div>
                <div className="mt-1">
                  <Badge tone={toneForStatus(selectedStatus?.status || selected.status)}>
                    {selectedStatus?.status || selected.status || '-'}
                  </Badge>
                </div>
              </div>
            </div>

            {selected.lastError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                {selected.lastError}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <Card title="Order Summary">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailItem label="Requested Date" value={selected.requestedDisbursementDate} />
                  <DetailItem label="Disbursed At" value={fmtDateTime(selected.disbursedAt)} />
                  <DetailItem label="Provider" value={selected.aggregatorProvider} />
                  <DetailItem label="Payout Type" value={selected.payout?.type} />
                  <DetailItem label="Destination" value={payoutDestination} mono />
                  <DetailItem label="Provider Status" value={selected.aggregatorCallbackStatus} />
                </div>
              </Card>

              <Card title="References">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailItem label="Order ID" value={selected.orderId} mono />
                  <DetailItem label="Platform Loan ID" value={selected.platformLoanId} mono />
                  <DetailItem label="Fineract Loan ID" value={selected.fineractLoanId} mono />
                  <DetailItem label="Fineract Transaction ID" value={selected.fineractTransactionId} mono />
                  <DetailItem label="Provider Reference" value={selected.aggregatorReferenceId} mono />
                  <DetailItem label="Last Updated" value={fmtDateTime(selected.updatedAt)} />
                </div>
              </Card>
            </div>

            <Card title="Processing Timeline">
              <div className="space-y-3">
                {activityTimeline.map((item) => (
                  <TimelineItem
                    key={item.key}
                    title={item.title}
                    at={item.at}
                    tone={item.tone}
                    detail={item.detail}
                  />
                ))}
              </div>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card title="Destination Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailItem label="Account Name" value={selected.payout?.accountName} />
                  <DetailItem label="Bank Name" value={selected.payout?.bankName} />
                  <DetailItem label="Bank Code" value={selected.payout?.bankCode} />
                  <DetailItem label="Mobile Provider" value={selected.payout?.provider} />
                  <DetailItem label="MSISDN" value={selected.payout?.msisdn} mono />
                  <DetailItem label="Account Number" value={selected.payout?.accountNumber} mono />
                </div>
              </Card>

              <Card title="System Timestamps">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailItem label="Created At" value={fmtDateTime(selected.createdAt)} />
                  <DetailItem label="Updated At" value={fmtDateTime(selected.updatedAt)} />
                  <DetailItem label="Provider Callback At" value={fmtDateTime(selected.aggregatorCallbackAt)} />
                  <DetailItem label="Lookup Time" value={fmtDateTime(journey.lookupAt)} />
                  <DetailItem label="Provider Request Time" value={fmtDateTime(journey.disburseRequestedAt || journey.disburseRespondedAt)} />
                  <DetailItem label="Fineract Posting Time" value={fmtDateTime(journey.fineractRespondedAt || journey.fineractRequestedAt)} />
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DisbursementOrders;
