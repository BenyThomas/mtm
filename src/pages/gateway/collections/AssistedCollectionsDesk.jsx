import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  IdCard,
  Loader2,
  MapPin,
  MoreVertical,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Modal from '../../../components/Modal';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import {
  getCollectionCustomerPosition,
  getCollectionsPaymentConfig,
  getCollectionsQueue,
} from '../../../api/gateway/collections';
import { repayGwLoanMobile } from '../../../api/gateway/loans';

const PAGE_SIZE = 10;

const money = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'TSh 0';
  return `TSh ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)}`;
};

const compactMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount);
};

const displayDate = (value) => {
  if (!value) return '-';
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const initials = (name) => String(name || 'Customer')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const normalizeProvider = (value) => String(value || '').trim().toUpperCase();

const extractError = (error, fallback) => (
  error?.response?.data?.errors?.[0]?.details
  || error?.response?.data?.errors?.[0]?.defaultUserMessage
  || error?.response?.data?.message
  || error?.message
  || fallback
);

const FILTERS = [
  { value: 'DUE_TODAY', label: 'Due Today', countKey: 'dueTodayCount' },
  { value: 'PAR_1_7', label: 'PAR 1–7', countKey: 'par1To7Count' },
  { value: 'PAR_8_30', label: 'PAR 8–30', countKey: 'par8To30Count' },
  { value: 'PAR_30_PLUS', label: 'PAR 30+', countKey: 'par30PlusCount' },
];

const SummaryCard = ({ icon: Icon, label, value, meta, tone = 'primary' }) => {
  const toneClass = {
    primary: 'bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)]',
    accent: 'bg-[color:var(--tenant-accent)]/10 text-[var(--tenant-accent)]',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  }[tone];
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white">{value}</div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</div>
        </div>
      </div>
    </Card>
  );
};

const Metric = ({ icon: Icon, label, value, danger = false }) => (
  <div className="flex min-h-[74px] items-start gap-3 border-b border-slate-200/70 p-3 last:border-b-0 dark:border-slate-700/70 sm:border-r sm:last:border-r-0">
    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)]'}`}>
      <Icon size={16} />
    </div>
    <div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-bold ${danger ? 'text-rose-600 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  </div>
);

const AssistedCollectionsDesk = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [bucket, setBucket] = useState('DUE_TODAY');
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState({ items: [], summary: {}, total: 0 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [positionLoading, setPositionLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [branch, setBranch] = useState('');
  const [collector, setCollector] = useState('');

  const [paymentConfig, setPaymentConfig] = useState({});
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [repaymentBusy, setRepaymentBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('');
  const [msisdn, setMsisdn] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    getCollectionsPaymentConfig()
      .then((config) => setPaymentConfig(config || {}))
      .catch(() => setPaymentConfig({}));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCollectionsQueue({
      q: debouncedSearch || undefined,
      bucket,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) return;
        const next = data || { items: [], summary: {}, total: 0 };
        setPayload(next);
        const rows = Array.isArray(next.items) ? next.items : [];
        setSelected((current) => {
          const matching = current && rows.find((row) => row.platformLoanId === current.platformLoanId);
          return matching || rows[0] || null;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setPayload({ items: [], summary: {}, total: 0 });
        setSelected(null);
        addToast(extractError(error, 'Failed to load collections queue'), 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, bucket, page, refreshToken, addToast]);

  const rows = useMemo(() => {
    const source = Array.isArray(payload.items) ? payload.items : [];
    return source.filter((row) => {
      if (branch && row.officeName !== branch) return false;
      if (collector && row.loanOfficerName !== collector) return false;
      return true;
    });
  }, [payload.items, branch, collector]);

  const branchOptions = useMemo(
    () => Array.from(new Set((payload.items || []).map((row) => row.officeName).filter(Boolean))),
    [payload.items],
  );
  const collectorOptions = useMemo(
    () => Array.from(new Set((payload.items || []).map((row) => row.loanOfficerName).filter(Boolean))),
    [payload.items],
  );

  const providers = useMemo(() => {
    const enabled = Array.isArray(paymentConfig?.paymentAggregatorEnabledProviders)
      ? paymentConfig.paymentAggregatorEnabledProviders.map(normalizeProvider).filter(Boolean)
      : [];
    const fallback = normalizeProvider(paymentConfig?.paymentAggregatorDefaultProvider);
    return Array.from(new Set([...enabled, ...(fallback ? [fallback] : [])]));
  }, [paymentConfig]);

  const defaultProvider = useMemo(
    () => normalizeProvider(paymentConfig?.paymentAggregatorDefaultProvider) || providers[0] || 'SELCOM',
    [paymentConfig, providers],
  );

  const selectRow = async (row) => {
    setSelected(row);
    if (!row?.customerNumber) return;
    setPositionLoading(true);
    try {
      const detail = await getCollectionCustomerPosition(row.customerNumber);
      const matching = (detail?.loans || []).find((loan) => loan.platformLoanId === row.platformLoanId);
      if (matching) setSelected(matching);
    } catch (_) {
      // The queue row already contains a complete position; retain it on detail failure.
    } finally {
      setPositionLoading(false);
    }
  };

  const openRepayment = (row = selected, presetAmount) => {
    if (!row) return;
    setSelected(row);
    const suggested = Number(presetAmount ?? row.suggestedAmount ?? row.dueTodayAmount ?? row.overdueAmount ?? 0);
    setAmount(suggested > 0 ? String(suggested) : '');
    setProvider(defaultProvider);
    setMsisdn(row.walletMsisdn || row.phone || '');
    setReference('');
    setNote('');
    setRepaymentOpen(true);
  };

  const submitRepayment = async () => {
    const numericAmount = Number(amount);
    if (!selected?.platformLoanId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      addToast('Enter a valid repayment amount', 'error');
      return;
    }
    const resolvedProvider = normalizeProvider(provider) || defaultProvider;
    if (resolvedProvider !== 'EPIKPAY' && !String(msisdn || '').trim()) {
      addToast('Customer wallet MSISDN is required', 'error');
      return;
    }
    if (!String(reference || '').trim()) {
      addToast('Transaction reference is required', 'error');
      return;
    }

    setRepaymentBusy(true);
    try {
      const result = await repayGwLoanMobile(selected.platformLoanId, {
        amount: numericAmount,
        currency: 'TZS',
        provider: resolvedProvider,
        channel: resolvedProvider === 'EPIKPAY' ? 'CASH' : undefined,
        externalPaymentId: String(reference || '').trim() || undefined,
        msisdn: resolvedProvider === 'EPIKPAY' ? undefined : String(msisdn || '').trim(),
        payerName: selected.customerName,
        payerEmail: selected.email || undefined,
      });
      const event = result?.paymentEvent || result?.result?.paymentEvent || {};
      const order = result?.selcomOrder || result?.result?.selcomOrder || {};
      setReceipt({
        receiptNo: event.paymentEventId || order.orderId || reference,
        amount: numericAmount,
        provider: resolvedProvider,
        status: event.status || order.paymentStatus || (resolvedProvider === 'EPIKPAY' ? 'POSTED_TO_FINERACT' : 'PENDING_COLLECTION'),
        customerName: selected.customerName,
        customerNumber: selected.customerNumber,
        loanId: selected.loanId,
        processedBy: user?.staffDisplayName || user?.username || 'Operator',
        createdAt: new Date().toISOString(),
        note,
      });
      setRepaymentOpen(false);
      setSelected((current) => current && current.platformLoanId === selected.platformLoanId
        ? {
          ...current,
          totalOutstanding: Math.max(0, Number(current.totalOutstanding || 0) - numericAmount),
          overdueAmount: Math.max(0, Number(current.overdueAmount || 0) - numericAmount),
          dueTodayAmount: Math.max(0, Number(current.dueTodayAmount || 0) - numericAmount),
        }
        : current);
      addToast(resolvedProvider === 'EPIKPAY' ? 'Payment queued and receipt generated' : 'Mobile collection request submitted', 'success');
    } catch (error) {
      addToast(extractError(error, 'Repayment failed'), 'error');
    } finally {
      setRepaymentBusy(false);
    }
  };

  const summary = payload.summary || {};
  const totalPages = Math.max(1, Math.ceil(Number(payload.total || 0) / PAGE_SIZE));
  const selectedDue = Number(selected?.overdueAmount || 0) > 0
    ? Number(selected.overdueAmount)
    : Number(selected?.dueTodayAmount || selected?.nextInstallmentAmount || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Assisted Collections Desk</h1>
          <div className="mt-1 text-sm">
            <span className="font-semibold text-[var(--tenant-primary)]">Gateway</span>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-500 dark:text-slate-400">Collections</span>
          </div>
        </div>
        <div className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white/80 px-3 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <CalendarDays size={17} className="text-[var(--tenant-primary)]" />
          {displayDate(new Date().toISOString())}
        </div>
      </div>

      <Card className="p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              placeholder="Search by Customer Number, Name, Phone or Loan ID"
              className="h-11 w-full rounded-xl border pl-10 pr-3 text-sm"
            />
          </div>
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => { setBucket(filter.value); setPage(0); }}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                bucket === filter.value
                  ? 'border-[var(--tenant-primary)] bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {filter.label}
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {summary[filter.countKey] || 0}
              </span>
            </button>
          ))}
          <select value={branch} onChange={(event) => setBranch(event.target.value)} className="h-11 rounded-xl border px-3 text-xs font-semibold">
            <option value="">All branches</option>
            {branchOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={collector} onChange={(event) => setCollector(event.target.value)} className="h-11 rounded-xl border px-3 text-xs font-semibold">
            <option value="">All collectors</option>
            {collectorOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setBucket('DUE_TODAY');
              setBranch('');
              setCollector('');
              setPage(0);
              setRefreshToken((value) => value + 1);
            }}
            className="inline-flex h-11 items-center gap-1 px-2 text-xs font-bold text-[var(--tenant-primary)]"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CalendarDays} label="Due Today" value={money(summary.dueTodayAmount)} meta={`${summary.dueTodayCustomers || 0} customers`} />
        <SummaryCard icon={WalletCards} label="Collected Today" value={money(summary.collectedTodayAmount)} meta={`${summary.receiptsToday || 0} receipts`} tone="accent" />
        <SummaryCard icon={UsersRound} label="Customers in Arrears" value={compactMoney(summary.customersInArrears)} meta="Across all visible buckets" tone="orange" />
        <SummaryCard icon={ReceiptText} label="Pending Receipts" value={compactMoney(summary.pendingReceipts)} meta="Unposted or pending payments" tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4 dark:border-slate-700/70">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Collection Queue</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Customer Number is the Fineract client ID.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-3 py-3">Customer No.</th>
                  <th className="px-3 py-3">Loan ID</th>
                  <th className="px-3 py-3">Due</th>
                  <th className="px-3 py-3">Outstanding</th>
                  <th className="px-3 py-3">PAR Bucket</th>
                  <th className="px-3 py-3">Last Payment</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Loader2 className="mx-auto animate-spin text-[var(--tenant-primary)]" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-500">No customers match this collection queue.</td></tr>
                ) : rows.map((row) => {
                  const active = selected?.platformLoanId === row.platformLoanId;
                  const due = Number(row.overdueAmount || 0) > 0 ? row.overdueAmount : row.dueTodayAmount || row.nextInstallmentAmount;
                  return (
                    <tr
                      key={row.platformLoanId}
                      onClick={() => selectRow(row)}
                      className={`cursor-pointer border-t border-slate-200/70 transition dark:border-slate-700/70 ${
                        active ? 'bg-[color:var(--tenant-primary)]/5 ring-1 ring-inset ring-[var(--tenant-primary)]' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-xs font-bold text-white">
                            {initials(row.customerName)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{row.customerName}</div>
                            <div className="text-[11px] text-slate-500">{row.phone || '-'}</div>
                            <div className="mt-2 flex gap-1.5">
                              {[1000, 5000].map((quick) => (
                                <button
                                  key={quick}
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); openRepayment(row, quick); }}
                                  className="rounded-md border border-[color:var(--tenant-primary)]/35 px-2 py-1 text-[10px] font-bold text-[var(--tenant-primary)]"
                                >
                                  {compactMoney(quick)}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); openRepayment(row, due); }}
                                className="rounded-md border border-[color:var(--tenant-primary)]/35 px-2 py-1 text-[10px] font-bold text-[var(--tenant-primary)]"
                              >
                                Full Due
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold">{row.customerNumber || '-'}</td>
                      <td className="px-3 py-3 text-xs">{row.loanId || row.fineractLoanId}</td>
                      <td className="px-3 py-3 text-xs font-bold">{money(due)}</td>
                      <td className="px-3 py-3 text-xs">{money(row.totalOutstanding)}</td>
                      <td className="px-3 py-3"><Badge tone={row.parBucket === 'CURRENT' ? 'green' : row.parBucket === 'PAR_30_PLUS' ? 'red' : 'yellow'}>{String(row.parBucket || 'CURRENT').replaceAll('_', ' ')}</Badge></td>
                      <td className="px-3 py-3 text-xs">{displayDate(row.lastPaymentDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={(event) => { event.stopPropagation(); openRepayment(row, due); }}>
                            <Zap size={14} /> Collect
                          </Button>
                          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-700/70">
            <span>Showing {payload.total ? page * PAGE_SIZE + 1 : 0} to {Math.min((page + 1) * PAGE_SIZE, payload.total || 0)} of {payload.total || 0} loans</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="min-w-16 text-center font-semibold">{page + 1} / {totalPages}</span>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-0 shadow-sm">
          {positionLoading ? <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-[var(--tenant-primary)]" /> : null}
          <div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-700/70">
            <h2 className="font-bold text-slate-950 dark:text-white">Customer Payment Position</h2>
          </div>
          {!selected ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center text-slate-500">
              <UserRound size={40} className="mb-3 text-slate-300" />
              Select a customer from the collection queue.
            </div>
          ) : (
            <>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-sm font-bold text-white">{initials(selected.customerName)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-slate-950 dark:text-white">{selected.customerName}</div>
                    <div className="text-xs text-slate-500">Customer No: {selected.customerNumber || '-'}</div>
                  </div>
                  <div className="space-y-1 text-right text-[11px] text-slate-500">
                    <div className="flex items-center justify-end gap-1"><Phone size={12} /> {selected.phone || '-'}</div>
                    <div className="flex items-center justify-end gap-1"><MapPin size={12} /> {selected.officeName || 'Branch unavailable'}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  <span>Loan ID: <strong className="text-slate-700 dark:text-slate-200">{selected.loanId}</strong></span>
                  <span>•</span>
                  <span>Product: <strong className="text-slate-700 dark:text-slate-200">{selected.productName}</strong></span>
                  <span>•</span>
                  <span>Disbursed: <strong className="text-slate-700 dark:text-slate-200">{displayDate(selected.disbursedOnDate)}</strong></span>
                </div>
              </div>

              <div className="mx-4 overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div className="grid sm:grid-cols-2">
                  <Metric icon={FileCheck2} label="Principal Outstanding" value={money(selected.principalOutstanding)} />
                  <Metric icon={CircleDollarSign} label="Interest Outstanding" value={money(selected.interestOutstanding)} />
                  <Metric icon={ShieldCheck} label="Penalties & Fees" value={money(Number(selected.penaltiesOutstanding || 0) + Number(selected.feesOutstanding || 0))} />
                  <Metric icon={CalendarDays} label={Number(selected.overdueAmount || 0) > 0 ? 'Overdue Amount' : 'Due Today'} value={money(selectedDue)} danger={Number(selected.overdueAmount || 0) > 0} />
                  <Metric icon={CalendarDays} label="Next Installment Due" value={displayDate(selected.nextDueDate)} />
                  <Metric icon={Clock3} label="Days in Arrears" value={`${selected.daysInArrears || 0} days`} danger={Number(selected.daysInArrears || 0) > 0} />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/70 px-3 py-3 text-xs dark:border-slate-700/70">
                  <span className="flex items-center gap-2 text-slate-500"><WalletCards size={15} className="text-[var(--tenant-accent)]" /> Wallet / Collection Status</span>
                  <Badge tone="green">{selected.walletStatus || 'ACTIVE'}</Badge>
                </div>
              </div>

              <div className="p-4">
                <div className="border-t border-slate-200/70 pt-4 dark:border-slate-700/70">
                  <h3 className="text-sm font-bold">Quick Repayment</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[1000, 5000, 10000].map((quick) => (
                      <button key={quick} onClick={() => openRepayment(selected, quick)} className="rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-[var(--tenant-primary)] hover:bg-[color:var(--tenant-primary)]/5 dark:border-slate-700">
                        {money(quick)}
                      </button>
                    ))}
                    <button onClick={() => openRepayment(selected, selectedDue)} className="rounded-xl border border-[color:var(--tenant-accent)]/30 bg-[color:var(--tenant-accent)]/10 px-2 py-3 text-xs font-bold text-[var(--tenant-accent)]">
                      Full Due
                    </button>
                  </div>
                  <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Custom Amount</label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex h-11 flex-1 items-center rounded-xl border px-3">
                      <span className="text-xs font-bold text-slate-500">TSh</span>
                      <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="h-9 min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-bold shadow-none focus:ring-0" placeholder="0.00" />
                    </div>
                    <Button className="h-11" onClick={() => openRepayment(selected, amount || selectedDue)}><ReceiptText size={16} /> Post Repayment</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={repaymentOpen}
        onClose={() => (repaymentBusy ? null : setRepaymentOpen(false))}
        title="Post Payment"
        size="sm"
        panelClassName="sm:max-w-[420px]"
        bodyClassName="sm:px-4 sm:py-4"
        footerClassName="sm:px-4 sm:py-3"
        footer={(
          <div className="grid w-full grid-cols-[auto_1fr] gap-2">
            <Button variant="secondary" onClick={() => setRepaymentOpen(false)} disabled={repaymentBusy}>Cancel</Button>
            <Button onClick={submitRepayment} disabled={repaymentBusy}>
              {repaymentBusy ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><ReceiptText size={16} /> Post Payment</>}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-[color:var(--tenant-primary)]/12 to-[color:var(--tenant-accent)]/8 p-3 ring-1 ring-inset ring-[color:var(--tenant-primary)]/15">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-xs font-bold text-white shadow-sm">
                {initials(selected?.customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{selected?.customerName}</div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Customer No. {selected?.customerNumber} · Loan {selected?.loanId}
                </div>
              </div>
              <Badge tone={Number(selected?.daysInArrears || 0) > 0 ? 'red' : 'green'}>
                {Number(selected?.daysInArrears || 0) > 0 ? `${selected?.daysInArrears}d late` : 'Current'}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700/70 dark:bg-slate-800/40">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Amount to collect</div>
                <div className="mt-1 text-xs text-slate-500">Outstanding {money(selected?.totalOutstanding)}</div>
              </div>
              <div className="flex min-w-[170px] items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="text-xs font-bold text-slate-500">TSh</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-right text-lg font-bold shadow-none focus:ring-0"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1000, 5000, selectedDue].filter((value, index, values) => Number(value) > 0 && values.indexOf(value) === index).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-lg border border-[color:var(--tenant-primary)]/25 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[var(--tenant-primary)] hover:bg-[color:var(--tenant-primary)]/5 dark:bg-slate-900"
                >
                  {value === selectedDue ? 'Full due' : money(value)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Payment method</label>
            <select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm">
              {(providers.length ? providers : ['SELCOM', 'EPIKPAY']).map((item) => (
                <option key={item} value={item}>{item === 'EPIKPAY' ? 'Cash / Direct Payment' : `${item} Mobile Push`}</option>
              ))}
            </select>
          </div>
          {normalizeProvider(provider) !== 'EPIKPAY' ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Customer wallet</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={msisdn} onChange={(event) => setMsisdn(event.target.value)} className="h-10 w-full rounded-xl border pl-9 pr-3 text-sm" />
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Transaction reference *</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Enter transaction reference"
              required
              className="mt-1 h-10 w-full rounded-xl border px-3 font-mono text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Note <span className="font-normal normal-case">(optional)</span></label>
              <span className="text-[10px] text-slate-400">{note.length}/200</span>
            </div>
            <textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 200))} rows={2} placeholder="Add a short collection note" className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm" />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={14} /> Secure posting with duplicate prevention
          </div>
        </div>
      </Modal>

      {receipt ? (
        <div className="fixed bottom-5 right-5 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl dark:border-emerald-900/60 dark:bg-slate-900">
          <button onClick={() => setReceipt(null)} className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-500" size={22} />
            <div>
              <div className="font-bold text-slate-950 dark:text-white">Receipt Generated</div>
              <div className="mt-3 text-xs text-slate-500">Receipt No.</div>
              <div className="mt-1 break-all font-mono text-lg font-bold text-emerald-600">{receipt.receiptNo}</div>
              <div className="mt-2 text-sm font-bold">{money(receipt.amount)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={13} /> {new Date(receipt.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700">
            <div className="flex items-center gap-2"><IdCard size={14} /> {receipt.customerName} · {receipt.customerNumber}</div>
            <div className="mt-2 flex items-center gap-2"><UserRound size={14} /> Posted by {receipt.processedBy}</div>
            <div className="mt-2"><Badge tone={String(receipt.status).includes('PENDING') ? 'yellow' : 'green'}>{receipt.status}</Badge></div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AssistedCollectionsDesk;
