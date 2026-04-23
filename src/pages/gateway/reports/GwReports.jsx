import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import { downloadGwOpsReport, getGwOpsReport } from '../../../api/gateway/reports';

const REPORT_OPTIONS = [
  { key: 'arrears', label: 'Arrears', description: 'Arrears by loan, client, product, branch, or officer.', filters: ['groupBy'] },
  { key: 'botClassification', label: 'BOT Classification', description: 'BOT provisioning and classification report.', filters: ['groupBy'] },
  { key: 'dailyCollections', label: 'Daily Collections', description: 'Collections posted, failed, and unmatched for one day.', filters: ['date'] },
  { key: 'due', label: 'Due Today / Week', description: 'Installments due today or this week.', filters: ['window'] },
  { key: 'par', label: 'PAR', description: 'Portfolio at risk buckets.', filters: [] },
  { key: 'portfolioOutstanding', label: 'Portfolio Outstanding', description: 'Outstanding portfolio by dimension.', filters: ['groupBy'] },
  { key: 'disbursements', label: 'Disbursements', description: 'Disbursement volume and status by period.', filters: ['from', 'to'] },
  { key: 'writeOffs', label: 'Write-offs', description: 'Written-off loans and recoveries.', filters: ['from', 'to'] },
  { key: 'restructured', label: 'Restructured', description: 'Rescheduled or restructured loans.', filters: [] },
  { key: 'collectionEfficiency', label: 'Collection Efficiency', description: 'Due versus collected amounts.', filters: ['from', 'to', 'groupBy'] },
  { key: 'writeOffRecoveries', label: 'Write-off Recoveries', description: 'Recoveries on written-off loans.', filters: ['from', 'to'] },
  { key: 'aging', label: 'Aging', description: 'Aging buckets by loan, product, branch, or officer.', filters: ['groupBy'] },
  { key: 'firstPaymentDefault', label: 'First Payment Default', description: 'Loans defaulting on the first installment.', filters: [] },
  { key: 'vintage', label: 'Vintage', description: 'Cohort delinquency by disbursement month.', filters: [] },
  { key: 'loanOfficerPerformance', label: 'Officer Performance', description: 'Portfolio and collections by loan officer.', filters: [] },
  { key: 'statement', label: 'Client / Loan Statement', description: 'Transaction statement by loan or customer.', filters: ['platformLoanId', 'customerId'] },
  { key: 'cashflowProjection', label: 'Cashflow Projection', description: 'Projected cash inflows from repayment schedules.', filters: ['days'] },
  { key: 'exceptions', label: 'Exceptions', description: 'Reversed repayments, failed postings, unmatched collections, failed disbursements.', filters: [] },
  { key: 'regulatorySummary', label: 'Regulatory Summary', description: 'Active borrowers, PAR, NPL, provisions, write-offs, and recoveries.', filters: [] },
];

const GROUP_BY_OPTIONS = [
  { value: 'loan', label: 'Loan' },
  { value: 'client', label: 'Client' },
  { value: 'product', label: 'Product' },
  { value: 'branch', label: 'Branch' },
  { value: 'officer', label: 'Officer' },
];

const AGING_GROUP_BY_OPTIONS = [
  { value: 'loan', label: 'Loan' },
  { value: 'product', label: 'Product' },
  { value: 'branch', label: 'Branch' },
  { value: 'officer', label: 'Officer' },
];

const WINDOW_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
];

const DATE_RANGE_REPORTS = new Set(['disbursements', 'writeOffs', 'collectionEfficiency', 'writeOffRecoveries']);

const toNumOrNull = (value) => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatMoney = (value) => {
  const number = toNumOrNull(value);
  if (number == null) return '-';
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number);
  } catch {
    return String(number);
  }
};

const formatPercent = (value) => {
  const number = toNumOrNull(value);
  if (number == null) return '-';
  return `${number.toFixed(2)}%`;
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const raw = String(value).trim();
    const date = raw.length > 10 ? new Date(raw) : new Date(`${raw}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
  } catch {
    return String(value);
  }
};

const prettifyLabel = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const badgeTone = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('LOSS') || normalized.includes('FAILED') || normalized.includes('UNMATCHED')) return 'red';
  if (normalized.includes('DOUBTFUL') || normalized.includes('SUBSTANDARD') || normalized.includes('EXCEPTION')) return 'yellow';
  if (normalized.includes('CURRENT') || normalized.includes('POSTED') || normalized.includes('DISBURSED')) return 'green';
  return 'blue';
};

const defaultFilters = () => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  return {
    groupBy: 'loan',
    date: today,
    from: monthStart,
    to: today,
    window: 'today',
    platformLoanId: '',
    customerId: '',
    days: 90,
  };
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

const buildColumns = (reportKey, rows) => {
  const firstRow = Array.isArray(rows) && rows.length ? rows[0] : null;
  const keys = firstRow ? Object.keys(firstRow) : [];

  return keys.map((key) => ({
    key,
    header: prettifyLabel(key),
    sortable: false,
    render: (row) => {
      const value = row?.[key];
      if (key === 'platformLoanId' && value) {
        return <Link className="text-cyan-700 hover:underline dark:text-cyan-300" to={`/gateway/loans/${encodeURIComponent(value)}`}>{value}</Link>;
      }
      if (['status', 'botClassification', 'exceptionType'].includes(key)) {
        return <Badge tone={badgeTone(value)}>{String(value || '-').replace(/_/g, ' ')}</Badge>;
      }
      if (key.toLowerCase().includes('date') || key.endsWith('At')) {
        return formatDate(value);
      }
      if (key.toLowerCase().includes('ratio') || key.toLowerCase().includes('rate')) {
        const num = toNumOrNull(value);
        if (num == null) return '-';
        return key.toLowerCase().includes('rate') && num <= 1 ? formatPercent(num * 100) : formatPercent(num);
      }
      if (
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('portfolio') ||
        key.toLowerCase().includes('outstanding') ||
        key.toLowerCase().includes('overdue') ||
        key.toLowerCase().includes('provision') ||
        key.toLowerCase().includes('inflow')
      ) {
        return formatMoney(value);
      }
      if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : formatMoney(value);
      }
      if (typeof value === 'object' && value !== null) {
        return <code className="text-xs">{JSON.stringify(value)}</code>;
      }
      return value == null || value === '' ? '-' : String(value);
    },
  }));
};

const SummaryGrid = ({ summary }) => {
  const entries = Object.entries(summary || {});
  if (!entries.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-800/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{prettifyLabel(key)}</div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {typeof value === 'number'
              ? key.toLowerCase().includes('ratio')
                ? formatPercent(value)
                : formatMoney(value)
              : typeof value === 'object' && value !== null
                ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(value).map(([nestedKey, nestedValue]) => (
                      <Badge key={nestedKey} tone="blue">{`${prettifyLabel(nestedKey)}: ${nestedValue}`}</Badge>
                    ))}
                  </div>
                )
                : String(value)}
          </div>
        </div>
      ))}
    </div>
  );
};

const GwReports = () => {
  const [selectedReport, setSelectedReport] = useState(REPORT_OPTIONS[0].key);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [exporting, setExporting] = useState('');

  const reportConfig = useMemo(
    () => REPORT_OPTIONS.find((item) => item.key === selectedReport) || REPORT_OPTIONS[0],
    [selectedReport]
  );

  const requestParams = useMemo(() => {
    const params = {};
    if (reportConfig.filters.includes('groupBy')) {
      params.groupBy = selectedReport === 'aging' ? (filters.groupBy === 'client' ? 'branch' : filters.groupBy) : filters.groupBy;
    }
    if (reportConfig.filters.includes('date') && filters.date) params.date = filters.date;
    if (reportConfig.filters.includes('from') && filters.from) params.from = filters.from;
    if (reportConfig.filters.includes('to') && filters.to) params.to = filters.to;
    if (reportConfig.filters.includes('window')) params.window = filters.window;
    if (reportConfig.filters.includes('platformLoanId') && filters.platformLoanId) params.platformLoanId = filters.platformLoanId.trim();
    if (reportConfig.filters.includes('customerId') && filters.customerId) params.customerId = filters.customerId.trim();
    if (reportConfig.filters.includes('days') && filters.days) params.days = Number(filters.days);
    return params;
  }, [filters, reportConfig.filters, selectedReport]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getGwOpsReport(selectedReport, requestParams);
        if (!cancelled) {
          setResult(data);
          setPage(0);
        }
      } catch (e) {
        if (!cancelled) {
          setResult(null);
          setError(e?.response?.data?.message || e?.message || 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, requestParams]);

  const rows = Array.isArray(result?.items) ? result.items.map((item, index) => ({ id: item?.platformLoanId || item?.loanAccount || item?.paymentEventId || item?.orderId || `${selectedReport}-${index}`, ...item })) : [];
  const columns = useMemo(() => {
    const built = buildColumns(selectedReport, rows);
    if (built.length) return built;
    return [{ key: 'placeholder', header: 'Report', sortable: false, render: () => '-' }];
  }, [selectedReport, rows]);
  const pagedRows = useMemo(() => rows.slice(page * limit, page * limit + limit), [rows, page, limit]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const exportReport = async (format) => {
    setExporting(format);
    try {
      const response = await downloadGwOpsReport(selectedReport, requestParams, format);
      const contentType = response?.headers?.['content-type'] || (format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf');
      const blob = new Blob([response.data], { type: contentType });
      const disposition = String(response?.headers?.['content-disposition'] || '');
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const fallback = `${selectedReport}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      triggerDownload(blob, match?.[1] || fallback);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to export report');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gateway Reports</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Operational, portfolio, collections, and regulatory reports for the gateway backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFilters(defaultFilters())}>Reset Filters</Button>
          <Button variant="secondary" onClick={() => exportReport('pdf')} disabled={!!exporting}>
            {exporting === 'pdf' ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
            <span className="ml-2">PDF</span>
          </Button>
          <Button variant="secondary" onClick={() => exportReport('xlsx')} disabled={!!exporting}>
            {exporting === 'xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            <span className="ml-2">Excel</span>
          </Button>
          {selectedReport === 'statement' && filters.platformLoanId ? (
            <Link to={`/gateway/loans/${encodeURIComponent(filters.platformLoanId)}`}>
              <Button>Open Loan</Button>
            </Link>
          ) : null}
        </div>
      </section>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Report</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {REPORT_OPTIONS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{reportConfig.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reportConfig.filters.includes('groupBy') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Group By</label>
                <select
                  value={filters.groupBy}
                  onChange={(e) => setFilter('groupBy', e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                >
                  {(selectedReport === 'aging' ? AGING_GROUP_BY_OPTIONS : GROUP_BY_OPTIONS).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {reportConfig.filters.includes('date') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilter('date', e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            ) : null}

            {DATE_RANGE_REPORTS.has(selectedReport) ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">From</label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilter('from', e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">To</label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilter('to', e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
              </>
            ) : null}

            {reportConfig.filters.includes('window') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Window</label>
                <select
                  value={filters.window}
                  onChange={(e) => setFilter('window', e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                >
                  {WINDOW_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {reportConfig.filters.includes('platformLoanId') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform Loan ID</label>
                <input
                  value={filters.platformLoanId}
                  onChange={(e) => setFilter('platformLoanId', e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            ) : null}

            {reportConfig.filters.includes('customerId') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer ID</label>
                <input
                  value={filters.customerId}
                  onChange={(e) => setFilter('customerId', e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            ) : null}

            {reportConfig.filters.includes('days') ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Projection Days</label>
                <input
                  type="number"
                  min="1"
                  value={filters.days}
                  onChange={(e) => setFilter('days', e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="text-sm text-red-600 dark:text-red-300">{error}</div>
        </Card>
      ) : null}

      {result?.summary ? (
        <Card>
          <SummaryGrid summary={result.summary} />
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {loading ? 'Loading report...' : `${rows.length} row(s) loaded`}
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
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={pagedRows}
          loading={loading}
          total={rows.length}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy=""
          sortDir="asc"
          onSort={() => {}}
          emptyMessage="No rows returned for this report"
        />
      </Card>
    </div>
  );
};

export default GwReports;
