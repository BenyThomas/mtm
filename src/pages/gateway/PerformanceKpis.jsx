import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, RefreshCcw, Target } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import { downloadPerformanceKpis, getPerformanceKpis } from '../../api/gateway/performance';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const ROLE_OPTIONS = [
  { value: 'FIELD_OFFICER', label: 'Field Officer' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'RECOVERY', label: 'Recovery' },
  { value: 'CREDIT', label: 'Credit / KYC' },
  { value: 'OPERATIONS', label: 'Operations' },
];

const GROUP_OPTIONS = [
  { value: '', label: 'Role Default' },
  { value: 'officer', label: 'Officer' },
  { value: 'branch', label: 'Branch' },
  { value: 'product', label: 'Product' },
  { value: 'client', label: 'Client' },
  { value: 'loan', label: 'Loan' },
];

const STATUS_TONE = {
  GOOD: 'green',
  WATCH: 'yellow',
  BAD: 'red',
  NEUTRAL: 'blue',
};

const today = () => new Date().toISOString().slice(0, 10);

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat().format(number);
};

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00%';
  return `${number.toFixed(2)}%`;
};

const formatCardValue = (card) => {
  if (card?.unit === 'PERCENT') return formatPercent(card.value);
  if (card?.unit === 'MONEY') return formatMoney(card.value);
  return formatNumber(card?.value);
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const isMoneyKey = (key) => /amount|portfolio|collected|due|overdue|recovery|recoveries|disbursed/i.test(key);
const isPercentKey = (key) => /ratio|efficiency|rate/i.test(key);

const buildColumns = (rows, groupBy) => {
  const first = rows?.[0] || {};
  const preferred = [
    groupBy || 'officer',
    'officer',
    'branch',
    'product',
    'loanAccount',
    'loans',
    'borrowers',
    'dueAmount',
    'collectedAmount',
    'efficiencyRatio',
    'outstandingAmount',
    'overdueAmount',
    'arrearsLoans',
    'par30Ratio',
  ];
  const keys = Array.from(new Set([...preferred, ...Object.keys(first)]))
    .filter((key) => key && key !== 'id' && Object.prototype.hasOwnProperty.call(first, key));

  return keys.map((key) => ({
    key,
    header: titleCase(key),
    sortable: false,
    render: (row) => {
      const value = row?.[key];
      if (value == null || value === '') return '-';
      if (isPercentKey(key)) return formatPercent(value);
      if (isMoneyKey(key)) return formatMoney(value);
      if (typeof value === 'number') return Number.isInteger(value) ? formatNumber(value) : formatMoney(value);
      if (typeof value === 'object') return <code className="text-xs">{JSON.stringify(value)}</code>;
      return String(value);
    },
  }));
};

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const PerformanceKpis = () => {
  const [filters, setFilters] = useState({
    period: 'monthly',
    date: today(),
    role: 'FIELD_OFFICER',
    groupBy: '',
  });
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);

  const requestParams = useMemo(() => {
    const params = {
      period: filters.period,
      date: filters.date,
      role: filters.role,
    };
    if (filters.groupBy) params.groupBy = filters.groupBy;
    return params;
  }, [filters]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPerformanceKpis(requestParams);
      setPayload(data);
      setPage(0);
    } catch (e) {
      setPayload(null);
      setError(e?.response?.data?.message || e?.message || 'Failed to load performance KPIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [requestParams]);

  const rows = Array.isArray(payload?.items)
    ? payload.items.map((item, index) => ({ rowId: item?.id || `${index}`, ...item }))
    : [];
  const groupKey = payload?.summary?.groupBy || filters.groupBy || 'officer';
  const columns = useMemo(() => buildColumns(rows, groupKey), [rows, groupKey]);
  const pagedRows = useMemo(() => rows.slice(page * limit, page * limit + limit), [rows, page, limit]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const exportReport = async (format) => {
    setExporting(format);
    setError('');
    try {
      const response = await downloadPerformanceKpis(requestParams, format);
      const contentType = response?.headers?.['content-type'] || (format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf');
      const blob = new Blob([response.data], { type: contentType });
      const disposition = String(response?.headers?.['content-disposition'] || '');
      const match = disposition.match(/filename="?([^"]+)"?/i);
      triggerDownload(blob, match?.[1] || `performance-kpi.${format === 'xlsx' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to export performance report');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance KPIs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Daily, weekly, and monthly scorecards for field, management, accounting, recovery, and operations teams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => exportReport('pdf')} disabled={!!exporting}>
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            <span className="ml-2">PDF</span>
          </Button>
          <Button variant="secondary" onClick={() => exportReport('xlsx')} disabled={!!exporting}>
            {exporting === 'xlsx' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            <span className="ml-2">Excel</span>
          </Button>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Period</label>
            <select
              value={filters.period}
              onChange={(e) => setFilter('period', e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilter('date', e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilter('role', e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Group By</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilter('groupBy', e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="text-sm text-red-600 dark:text-red-300">{error}</div>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(payload?.cards || []).map((card) => (
          <Card key={card.metricKey}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatCardValue(card)}</div>
                {card.target != null ? (
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Target {card.unit === 'PERCENT' ? formatPercent(card.target) : formatNumber(card.target)}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Target size={18} className="text-slate-400" />
                <Badge tone={STATUS_TONE[card.status] || 'blue'}>{titleCase(card.status)}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {loading ? 'Loading performance data...' : `${rows.length} scorecard row(s)`}
            {payload?.summary?.fromDate ? ` | ${payload.summary.fromDate} to ${payload.summary.toDate}` : ''}
          </div>
          <div className="flex items-center gap-2">
            <Download size={16} className="text-slate-400" />
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-xl border px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
        </div>
        <DataTable
          columns={columns.length ? columns : [{ key: 'empty', header: 'Performance', render: () => '-' }]}
          data={pagedRows}
          loading={loading}
          total={rows.length}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy=""
          sortDir="asc"
          onSort={() => {}}
          emptyMessage="No performance rows returned for this selection"
        />
      </Card>
    </div>
  );
};

export default PerformanceKpis;
