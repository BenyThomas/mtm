import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  Edit3,
  MoreVertical,
  Plus,
  Star,
  Trash2,
  FileSpreadsheet,
  Filter,
  GitBranch,
  ListChecks,
  Mail,
  Monitor,
  Moon,
  Plug,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Upload,
  UploadCloud,
  Users,
} from 'lucide-react';
import api from '../../../api/axios';
import gatewayApi from '../../../api/gatewayAxios';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { useToast } from '../../../context/ToastContext';

const unwrap = (response) => response?.data?.data || response?.data || null;

const money = (value) => new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const statusTone = (value) => {
  const text = String(value || '').toUpperCase();
  if (text.includes('POSTED') || text.includes('APPROVED') || text.includes('COMPLETE') || text.includes('ACTIVE')) return 'green';
  if (text.includes('REVIEW') || text.includes('RETRY') || text.includes('HELD') || text.includes('PROCESS')) return 'yellow';
  if (text.includes('FAILED') || text.includes('REJECT') || text.includes('DUPLICATE')) return 'red';
  if (text.includes('SUSPENSE') || text.includes('UNMATCHED')) return 'orange';
  return 'blue';
};

const iconToneClass = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const ReconciliationHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-50">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

const BankAccountSelect = ({ value, onChange, className = '' }) => {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    gatewayApi.get('/gateway/reconciliation/bank-accounts')
      .then((response) => {
        const loadedAccounts = unwrap(response) || [];
        setAccounts(loadedAccounts);
        if (!value && loadedAccounts.length > 0) {
          onChange(loadedAccounts.find((account) => account.defaultCollectionAccount)?.id || loadedAccounts[0].id);
        }
      })
      .catch(() => setAccounts([]));
  }, []);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <option value="">Select bank account</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {[account.bankName, account.accountName, account.accountNumber].filter(Boolean).join(' - ')}
        </option>
      ))}
    </select>
  );
};

const MetricCard = ({ label, value, icon: Icon, tone = 'blue', caption }) => (
  <Card className="flex items-center gap-4">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconToneClass[tone] || iconToneClass.blue}`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">{value}</div>
      {caption ? <div className="mt-1 text-xs text-slate-500">{caption}</div> : null}
    </div>
  </Card>
);

const sumBy = (rows, field) => rows.reduce((total, row) => total + Number(row?.[field] || 0), 0);

const countWhere = (rows, predicate) => rows.filter(predicate).length;

const ratio = (value, total) => total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';

const statusText = (value) => String(value || '').toUpperCase();

const compactDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
};

const InsightPanel = ({ title, children, actions }) => (
  <Card className="p-0">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">{title}</h3>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    <div className="p-4">{children}</div>
  </Card>
);

const MiniMetric = ({ label, value, caption, tone = 'blue' }) => (
  <div className={`rounded-lg border p-3 ${tone === 'red' ? 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20' : tone === 'green' ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20' : tone === 'orange' ? 'border-orange-100 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20' : 'border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20'}`}>
    <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{value}</div>
    {caption ? <div className="mt-1 text-xs text-slate-500">{caption}</div> : null}
  </div>
);

const WorkflowSteps = ({ steps }) => (
  <div className="grid gap-2 md:grid-cols-4">
    {steps.map((step, index) => (
      <div key={step.label} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[var(--tenant-primary)] dark:bg-blue-950/30">{index + 1}</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{step.label}</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">{step.detail}</div>
      </div>
    ))}
  </div>
);

const QueueSummary = ({ rows, mode }) => {
  const total = rows.length;
  const approved = countWhere(rows, (row) => statusText(row.postingStatus).includes('APPROVED'));
  const posted = countWhere(rows, (row) => statusText(row.postingStatus).includes('POSTED'));
  const failed = countWhere(rows, (row) => statusText(row.postingStatus).includes('FAILED') || statusText(row.postingStatus).includes('RETRY'));
  const review = countWhere(rows, (row) => statusText(row.matchStatus).includes('REVIEW'));
  const unmatched = countWhere(rows, (row) => statusText(row.matchStatus).includes('UNMATCHED'));
  const suspense = countWhere(rows, (row) => statusText(row.matchStatus).includes('SUSPENSE'));
  const amount = sumBy(rows, 'creditAmount');
  const labels = {
    transactions: ['Loaded Rows', 'Approved', 'Exceptions', 'Credit Value'],
    review: ['Review Items', 'Ready', 'Needs Match', 'Review Value'],
    unmatched: ['Unmatched', 'Candidate Matches', 'To Suspense', 'Unmatched Value'],
    suspense: ['Suspense Items', 'Allocated', 'Open Items', 'Suspense Value'],
    posted: ['Posted Items', 'Receipt Ready', 'Success Rate', 'Posted Value'],
    failed: ['Failed Items', 'Retry Due', 'Blocked', 'Failed Value'],
  }[mode] || ['Rows', 'Approved', 'Exceptions', 'Value'];
  const exceptionCount = review + unmatched + suspense + failed;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={labels[0]} value={total} icon={ListChecks} tone={mode === 'failed' ? 'red' : 'blue'} caption={`${ratio(total, Number(total || 0))} of current result`} />
      <MetricCard label={labels[1]} value={mode === 'posted' ? posted : approved} icon={CheckCircle2} tone="green" caption={mode === 'posted' ? 'Fineract receipt posted' : 'Approved for posting'} />
      <MetricCard label={labels[2]} value={mode === 'failed' ? failed : exceptionCount} icon={AlertTriangle} tone={mode === 'posted' ? 'green' : 'orange'} caption={`${review} review, ${unmatched} unmatched`} />
      <MetricCard label={labels[3]} value={`TZS ${money(amount)}`} icon={FileSpreadsheet} tone="blue" caption="Current filtered rows" />
    </div>
  );
};

const TransactionModePanel = ({ mode, rows, onBulkAction }) => {
  const copy = {
    transactions: { title: 'Workbench Flow', steps: [['Import', 'Statement rows are validated and normalized.'], ['Match', 'Rules and manual review attach clients and loans.'], ['Approve', 'High confidence items are approved for posting.'], ['Post', 'Repayments are sent to Fineract with audit trail.']] },
    review: { title: 'Review Decision Queue', steps: [['Inspect', 'Open the detail drawer and compare candidates.'], ['Search Loan', 'Manual match supports client or loan lookup.'], ['Approve', 'Approve accurate matches for posting.'], ['Escalate', 'Hold, split, or route to suspense when needed.']] },
    unmatched: { title: 'Unmatched Resolution', steps: [['Identify', 'Use typed customer number, sender, and narration.'], ['Search', 'Find customer or loan from Fineract client ID.'], ['Save Mapping', 'Create a reusable rule after confirming target.'], ['Allocate', 'Match or move to suspense.']] },
    suspense: { title: 'Suspense Allocation', steps: [['Classify', 'Confirm why receipt cannot be posted.'], ['Allocate', 'Search and select client or loan.'], ['Resolve', 'Mark refund or non-client deposit when appropriate.'], ['Audit', 'Keep reason and actor history.']] },
    posted: { title: 'Posted Payment Controls', steps: [['Verify', 'Confirm external ID and receipt reference.'], ['Export', 'Download receipt or posting evidence.'], ['Audit', 'Review posting attempt history.'], ['Report', 'Feed daily reconciliation summary.']] },
    failed: { title: 'Failed Posting Recovery', steps: [['Diagnose', 'Review Fineract error and payload.'], ['Correct', 'Fix mapping, payment type, or duplicate issue.'], ['Retry', 'Retry single or due failures.'], ['Resolve', 'Exclude or mark resolved with reason.']] },
  }[mode];
  return (
    <InsightPanel title={copy.title} actions={mode === 'review' ? <Button type="button" size="sm" variant="secondary" onClick={onBulkAction}>Bulk Approve Visible</Button> : null}>
      <WorkflowSteps steps={copy.steps.map(([label, detail]) => ({ label, detail }))} />
    </InsightPanel>
  );
};
const TableShell = ({ children, title, actions }) => (
  <Card className="p-0">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">{title}</h3>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </Card>
);

const EmptyRow = ({ colSpan = 8, message = 'No records found.' }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">{message}</td>
  </tr>
);

const ReconTable = ({ rows, columns, emptyMessage, onRowClick, selectedRowId }) => (
  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
    <thead className="bg-slate-50 dark:bg-slate-800/60">
      <tr>
        {columns.map((column) => (
          <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.length ? rows.map((row, index) => (
        <tr
          key={row.id || row.batchNumber || index}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={`${onRowClick ? 'cursor-pointer' : ''} ${selectedRowId === row.id ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
        >
          {columns.map((column) => (
            <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
              {column.render ? column.render(row) : row[column.key]}
            </td>
          ))}
        </tr>
      )) : <EmptyRow colSpan={columns.length} message={emptyMessage} />}
    </tbody>
  </table>
);

const useReconList = (path, params = {}) => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 0, size: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await gatewayApi.get(path, { params });
      const data = unwrap(response);
      const items = Array.isArray(data) ? data : data?.items || data?.rows || [];
      setRows(items);
      setMeta({
        total: Array.isArray(data) ? items.length : Number(data?.total ?? items.length),
        page: Number(data?.page ?? params.page ?? 0),
        size: Number(data?.size ?? params.size ?? (items.length || 20)),
        totalPages: Number(data?.totalPages ?? 1),
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data');
      setRows([]);
      setMeta({ total: 0, page: Number(params.page || 0), size: Number(params.size || 20), totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [path, JSON.stringify(params)]);

  return { rows, meta, loading, error, reload: load };
};
const batchColumns = [
  { key: 'batchNumber', header: 'Batch No', render: (row) => <Link className="font-semibold text-[var(--tenant-primary)]" to={`/gateway/reconciliation/batches/${row.id}`}>{row.batchNumber}</Link> },
  { key: 'statementDate', header: 'Statement Date' },
  { key: 'totalRows', header: 'Rows' },
  { key: 'totalCreditAmount', header: 'Credit Amount', render: (row) => `TZS ${money(row.totalCreditAmount)}` },
  { key: 'postedCount', header: 'Posted' },
  { key: 'reviewCount', header: 'Review' },
  { key: 'failedCount', header: 'Failed' },
  { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status || '-'}</Badge> },
];

const transactionColumns = (actions, mode = 'transactions') => {
  const columns = [
    { key: 'postingDate', header: 'Posting Date' },
    { key: 'bankReference', header: 'Bank Ref' },
    { key: 'creditAmount', header: 'Amount', render: (row) => `TZS ${money(row.creditAmount)}` },
    { key: 'senderName', header: 'Sender' },
    { key: 'customerTypedIdentifier', header: 'Identifier' },
    { key: 'matchedClientName', header: 'Matched Client', render: (row) => row.matchedClientName || row.matchedClientId || '-' },
    { key: 'matchScore', header: 'Score', render: (row) => row.matchScore != null ? `${row.matchScore}%` : '-' },
    { key: 'matchStatus', header: 'Match', render: (row) => <Badge tone={statusTone(row.matchStatus)}>{row.matchStatus || '-'}</Badge> },
    { key: 'postingStatus', header: 'Posting', render: (row) => <Badge tone={statusTone(row.postingStatus)}>{row.postingStatus || '-'}</Badge> },
  ];
  if (mode === 'failed') {
    columns.splice(5, 0,
      { key: 'latestFailureReason', header: 'Reason', render: (row) => <span className="block max-w-xs truncate" title={row.latestAttemptUserMessage || row.latestFailureReason || row.latestAttemptTechnicalMessage || ''}>{row.latestAttemptUserMessage || row.latestFailureReason || 'Posting failed'}</span> },
      { key: 'latestAttemptFailedLeg', header: 'Failed Leg', render: (row) => row.latestAttemptFailedLeg || '-' },
      { key: 'latestAttemptRetryable', header: 'Retry', render: (row) => <Badge tone={row.latestAttemptRetryable ? 'yellow' : 'gray'}>{row.latestAttemptRetryable ? 'Retryable' : 'Blocked'}</Badge> }
    );
  }
  columns.push({ key: 'actions', header: 'Actions', render: actions });
  return columns;
};
const transactionModeDefaults = {
  transactions: {},
  review: { matchStatus: 'REVIEW_REQUIRED' },
  unmatched: { matchStatus: 'UNMATCHED' },
  suspense: { matchStatus: 'SUSPENSE' },
  posted: { postingStatus: 'POSTED,ALREADY_POSTED' },
  failed: { postingStatus: 'FAILED,RETRY_REQUIRED' },
};

const inferFineractClientId = (row = {}) => {
  const identifierType = String(row.identifierType || '').toUpperCase();
  if (row.matchedClientId) return row.matchedClientId;
  if (row.matchedCustomerId) return row.matchedCustomerId;
  if (identifierType.includes('CLIENT') || identifierType.includes('CUSTOMER')) return row.customerTypedIdentifier || '';
  return row.customerTypedIdentifier || '';
};

const drawerField = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--tenant-primary)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const DetailItem = ({ label, value }) => (
  <div>
    <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value || '-'}</div>
  </div>
);

const TransactionFilterBar = ({ filters, onChange, onReset }) => {
  const set = (field) => (event) => onChange({ ...filters, [field]: event.target.value, page: 0 });
  return (
    <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 xl:col-span-2">
        Search
        <div className="relative mt-1">
          <input className={`${drawerField} pr-9`} value={filters.search || ''} onChange={set('search')} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        </div>
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Match
        <select className={drawerField} value={filters.matchStatus || ''} onChange={set('matchStatus')}>
          <option value="">All</option>
          <option value="MATCHED">Matched</option>
          <option value="REVIEW_REQUIRED">Review</option>
          <option value="UNMATCHED">Unmatched</option>
          <option value="SUSPENSE">Suspense</option>
          <option value="DUPLICATE">Duplicate</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Posting
        <select className={drawerField} value={filters.postingStatus || ''} onChange={set('postingStatus')}>
          <option value="">All</option>
          <option value="NOT_POSTED">Not Posted</option>
          <option value="APPROVED_FOR_POSTING">Approved</option>
          <option value="POSTED,ALREADY_POSTED">Posted</option>
          <option value="ALREADY_POSTED">Already Posted</option>
          <option value="FAILED,RETRY_REQUIRED">Failed</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Identifier
        <select className={drawerField} value={filters.identifierType || ''} onChange={set('identifierType')}>
          <option value="">All</option>
          <option value="CLIENT_ID">Client ID</option>
          <option value="CUSTOMER_NUMBER">Customer No</option>
          <option value="ACCOUNT_NUMBER">Account No</option>
          <option value="PHONE_NUMBER">Phone</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        From
        <input type="date" className={drawerField} value={filters.from || ''} onChange={set('from')} />
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        To
        <input type="date" className={drawerField} value={filters.to || ''} onChange={set('to')} />
      </label>
      <div className="flex items-end">
        <Button type="button" variant="secondary" className="w-full" onClick={onReset}><RotateCcw size={16} />Reset</Button>
      </div>
    </Card>
  );
};

const PaginationBar = ({ meta, page, size, onPage, onSize }) => {
  const total = Number(meta.total || 0);
  const totalPages = Math.max(1, Number(meta.totalPages || Math.ceil(total / size) || 1));
  const start = total === 0 ? 0 : page * size + 1;
  const end = Math.min(total, (page + 1) * size);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
      <div>Showing {start} to {end} of {total}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={size} onChange={(event) => onSize(Number(event.target.value))}>
          {[10, 20, 50, 100].map((item) => <option key={item} value={item}>{item} / page</option>)}
        </select>
        <Button type="button" variant="secondary" disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="px-2 font-semibold text-slate-900 dark:text-slate-100">{page + 1} / {totalPages}</span>
        <Button type="button" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
};

const TransactionDetailDrawer = ({ row, mode, onClose, onMatch, onAction, postingActionId }) => {
  if (!row) return null;
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <div className="text-base font-bold text-slate-950 dark:text-slate-50">Transaction Details</div>
          <div className="text-xs text-slate-500">{row.bankReference || row.id}</div>
        </div>
        <button type="button" className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>x</button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Posting Date" value={row.postingDate} />
          <DetailItem label="Amount" value={`TZS ${money(row.creditAmount)}`} />
          <DetailItem label="Sender" value={row.senderName} />
          <DetailItem label="Identifier" value={row.customerTypedIdentifier} />
          <DetailItem label="Identifier Type" value={row.identifierType} />
          <DetailItem label="Client ID" value={row.matchedClientId || inferFineractClientId(row)} />
          <DetailItem label="Loan" value={row.matchedLoanAccountNo || row.matchedLoanId} />
          <DetailItem label="Score" value={row.matchScore != null ? `${row.matchScore}%` : '-'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="mb-1 text-xs font-semibold uppercase text-slate-500">Match</div><Badge tone={statusTone(row.matchStatus)}>{row.matchStatus || '-'}</Badge></div>
          <div><div className="mb-1 text-xs font-semibold uppercase text-slate-500">Posting</div><Badge tone={statusTone(row.postingStatus)}>{row.postingStatus || '-'}</Badge></div>
        </div>
        <DetailItem label="Fineract Transaction" value={row.fineractTransactionId} />
        <DetailItem label="Fineract External ID" value={row.fineractExternalId} />
        {row.postingStatus === 'ALREADY_POSTED' ? <DetailItem label="Source" value={row.postingResolutionSource || 'Detected in Fineract'} /> : null}
        {row.postingStatus === 'ALREADY_POSTED' ? <DetailItem label="Matched Reference" value={row.postingMatchedReference} /> : null}
        {row.postingStatus === 'ALREADY_POSTED' ? <DetailItem label="Matched Amount / Date" value={`${row.postingMatchedAmount ? `TZS ${money(row.postingMatchedAmount)}` : '-'} / ${row.postingMatchedDate || '-'}`} /> : null}
        <DetailItem label="Narration" value={row.narration} />
        <DetailItem label="Match Reason" value={row.matchReason} />
        {Array.isArray(row.matchCandidates) && row.matchCandidates.length ? <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Candidates</div>
          <div className="space-y-2">
            {row.matchCandidates.slice(0, 5).map((candidate, index) => (
              <div key={`${candidate.clientId || candidate.loanId || index}`} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{candidate.clientName || candidate.clientId || '-'}</div>
                <div className="mt-1 text-xs text-slate-500">{candidate.loanAccountNo || candidate.loanId || '-'} - {candidate.score || 0}%</div>
              </div>
            ))}
          </div>
        </div> : null}
      </div>
      <div className="grid gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
        {mode !== 'posted' && mode !== 'failed' ? <Button type="button" onClick={() => onMatch(row)}><Check size={16} />Manual Match</Button> : null}
        {row.matchStatus === 'REVIEW_REQUIRED' ? <Button type="button" variant="secondary" onClick={() => onAction(row, 'approve')}>Approve</Button> : null}
        {(row.postingStatus === 'APPROVED_FOR_POSTING' || row.matchStatus === 'APPROVED_FOR_POSTING') ? <Button type="button" variant="secondary" disabled={Boolean(postingActionId)} onClick={() => onAction(row, 'post')}>
          {postingActionId === row.id ? <Loader2 size={16} className="animate-spin" /> : null}
          {postingActionId === row.id ? 'Posting...' : 'Post'}
        </Button> : null}
        {mode === 'failed' ? <Button type="button" variant="danger" onClick={() => onAction(row, 'retry')}>Retry</Button> : null}
      </div>
    </div>
  );
};

const ManualMatchDrawer = ({ row, mode, onClose, onSaved }) => {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveMapping, setSaveMapping] = useState(false);
  const [loanQuery, setLoanQuery] = useState('');
  const [loanResults, setLoanResults] = useState([]);
  const [loanSearching, setLoanSearching] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState({ clientId: '', clientName: '', loanId: '', loanAccountNo: '', customerId: '', score: 100, reason: 'Manual match' });

  useEffect(() => {
    if (!row) return;
    const inferredClientId = inferFineractClientId(row);
    setForm({
      clientId: inferredClientId,
      clientName: row.matchedClientName || row.parsedName || row.senderName || '',
      loanId: row.matchedLoanId || '',
      loanAccountNo: row.matchedLoanAccountNo || '',
      customerId: row.matchedCustomerId || inferredClientId,
      score: 100,
      reason: 'Manual match',
    });
    setLoanQuery(inferredClientId || row.senderName || row.customerTypedIdentifier || '');
    setLoanResults([]);
    setSelectedLoan(null);
    setSaveMapping(false);
  }, [row?.id]);

  if (!row) return null;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const searchLoans = async () => {
    const query = loanQuery.trim();
    if (query.length < 2) {
      addToast('Enter at least two characters to search loans.', 'error');
      return;
    }
    setLoanSearching(true);
    try {
      const response = await gatewayApi.get('/gateway/reconciliation/transactions/loan-search', { params: { query } });
      const data = unwrap(response);
      setLoanResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) addToast('No loans found.', 'error');
    } catch (error) {
      addToast(error?.response?.data?.message || 'Loan search failed', 'error');
      setLoanResults([]);
    } finally {
      setLoanSearching(false);
    }
  };

  const selectLoan = (loan) => {
    setSelectedLoan(loan);
    setForm({
      ...form,
      clientId: loan.clientId || loan.customerNumber || form.clientId,
      customerId: loan.customerId || loan.clientId || form.customerId,
      clientName: loan.customerName || form.clientName,
      loanId: loan.loanId || loan.fineractLoanId || loan.platformLoanId || '',
      loanAccountNo: loan.loanAccountNo || loan.fineractLoanId || loan.platformLoanId || '',
    });
  };

  const submit = async () => {
    if (!form.clientId.trim()) {
      addToast('Customer / Fineract client ID is required.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      clientId: form.clientId.trim(),
      customerId: (form.customerId || form.clientId).trim(),
      clientName: form.clientName.trim(),
      loanId: form.loanId.trim(),
      loanAccountNo: (form.loanAccountNo || form.loanId).trim(),
      score: Number(form.score || 100),
      reason: form.reason.trim() || 'Manual match',
    };
    try {
      if (saveMapping) {
        await gatewayApi.post(`/gateway/reconciliation/unmatched/${row.id}/save-mapping`, {
          mappingType: row.identifierType || 'CUSTOMER_NUMBER',
          identifier: row.customerTypedIdentifier || form.clientId,
          targetClientId: payload.clientId,
          targetCustomerId: payload.customerId,
          targetClientName: payload.clientName,
          targetLoanId: payload.loanId,
          targetLoanAccountNo: payload.loanAccountNo,
          confidence: payload.score,
          status: 'ACTIVE',
        });
      } else if (mode === 'suspense') {
        await gatewayApi.post(`/gateway/reconciliation/suspense/${row.id}/allocate`, payload);
      } else {
        await gatewayApi.post(`/gateway/reconciliation/transactions/${row.id}/manual-match`, payload);
      }
      addToast('Manual match saved.', 'success');
      await onSaved();
      onClose();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Manual match failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <div className="text-base font-bold text-slate-950 dark:text-slate-50">Manual Match</div>
          <div className="text-xs text-slate-500">{row.bankReference || row.customerTypedIdentifier || row.id}</div>
        </div>
        <button type="button" className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>x</button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
          <div className="font-semibold text-slate-900 dark:text-slate-100">TZS {money(row.creditAmount)}</div>
          <div className="mt-1 text-xs text-slate-500">{row.senderName || '-'} - {row.customerTypedIdentifier || '-'}</div>
        </div>
        <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-500">Search loan</div>
          <div className="mt-2 flex gap-2">
            <input
              className={drawerField}
              value={loanQuery}
              onChange={(event) => setLoanQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') searchLoans(); }}
            />
            <Button type="button" variant="secondary" disabled={loanSearching} onClick={searchLoans}><Search size={16} />Search</Button>
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {loanResults.map((loan) => (
              <button
                type="button"
                key={`${loan.platformLoanId || loan.loanId}`}
                onClick={() => selectLoan(loan)}
                className={`w-full rounded-lg border p-3 text-left text-sm ${selectedLoan?.platformLoanId === loan.platformLoanId ? 'border-[var(--tenant-primary)] bg-blue-50 dark:bg-blue-950/30' : 'border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{loan.customerName || loan.customerNumber || '-'}</span>
                  <Badge tone={statusTone(loan.status)}>{loan.status || '-'}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">{loan.loanAccountNo || loan.loanId || '-'} | Customer {loan.customerNumber || loan.clientId || '-'}</div>
              </button>
            ))}
          </div>
        </div>
        {selectedLoan ? <div className="grid grid-cols-2 gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <DetailItem label="Loan Account" value={selectedLoan.loanAccountNo || selectedLoan.loanId} />
          <DetailItem label="Outstanding" value={`TZS ${money(selectedLoan.outstandingAmount ?? selectedLoan.outstanding)}`} />
          <DetailItem label="Amount Due" value={`TZS ${money(selectedLoan.amountDue)}`} />
          <DetailItem label="Overdue" value={`TZS ${money(selectedLoan.overdueAmount ?? selectedLoan.overdue)}`} />
          <DetailItem label="Next Due" value={selectedLoan.nextDueDate} />
          <DetailItem label="Days In Arrears" value={selectedLoan.daysInArrears ?? '-'} />
        </div> : null}
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Customer / Fineract Client ID<input className={drawerField} value={form.clientId} onChange={update('clientId')} /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Client Name<input className={drawerField} value={form.clientName} onChange={update('clientName')} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Loan ID<input className={drawerField} value={form.loanId} onChange={update('loanId')} /></label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Loan Account<input className={drawerField} value={form.loanAccountNo} onChange={update('loanAccountNo')} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Customer ID<input className={drawerField} value={form.customerId} onChange={update('customerId')} /></label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Score<input type="number" min="0" max="100" className={drawerField} value={form.score} onChange={update('score')} /></label>
        </div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Reason<input className={drawerField} value={form.reason} onChange={update('reason')} /></label>
        <label className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          Save mapping rule
          <input type="checkbox" checked={saveMapping} onChange={(event) => setSaveMapping(event.target.checked)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={submit}><Save size={16} />Save Match</Button>
      </div>
    </div>
  );
};
export const ReconciliationDashboard = () => {
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [bankAccountId, setBankAccountId] = useState('');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().slice(0, 10));
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await gatewayApi.get('/gateway/reconciliation/dashboard', { params: { date: dashboardDate, bankAccountId: bankAccountId || undefined } });
      setDashboard(unwrap(response) || {});
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [dashboardDate, bankAccountId]);

  const total = Number(dashboard.totalTransactions || 0);
  const posted = Number(dashboard.posted || 0);
  const review = Number(dashboard.pendingReview || 0);
  const unmatched = Number(dashboard.unmatched || 0);
  const failed = Number(dashboard.failed || 0);
  const duplicates = Number(dashboard.duplicates || 0);
  const suspense = Number(dashboard.suspense || 0);

  return (
    <div className="space-y-5">
      <ReconciliationHeader
        title="Recon Dashboard"
        subtitle="Bank repayment reconciliation overview"
        actions={<>
          <Link to="/gateway/reconciliation/import"><Button><UploadCloud size={17} />Import Statement</Button></Link>
          <Link to="/gateway/reconciliation/reports"><Button variant="secondary"><Download size={17} />Reports</Button></Link>
        </>}
      />
      <Card className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_auto] md:items-end">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Collection Account<BankAccountSelect value={bankAccountId} onChange={setBankAccountId} className="mt-1 w-full" /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Business Date<input type="date" className={drawerField} value={dashboardDate} onChange={(event) => setDashboardDate(event.target.value)} /></label>
        <MiniMetric label="Completion" value={ratio(posted, total)} caption={`${posted} of ${total} posted`} tone="green" />
        <Button type="button" variant="secondary" disabled={loading} onClick={load}><RefreshCcw size={17} />Refresh</Button>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bank Credits" value={`TZS ${money(dashboard.totalCreditAmount)}`} icon={FileSpreadsheet} tone="blue" caption={`${total} credit rows`} />
        <MetricCard label="Auto Matched" value={dashboard.autoMatched || 0} icon={CheckCircle2} tone="green" caption={`${ratio(Number(dashboard.autoMatched || 0), total)} matched`} />
        <MetricCard label="Pending Review" value={review} icon={ClipboardCheck} tone="yellow" caption="Needs approval or correction" />
        <MetricCard label="Failed" value={failed} icon={AlertTriangle} tone="red" caption="Requires posting recovery" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <InsightPanel title="Exception Overview">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Unmatched" value={unmatched} caption="Manual match required" tone="orange" />
            <MiniMetric label="Suspense" value={suspense} caption="Awaiting allocation" tone="orange" />
            <MiniMetric label="Duplicates" value={duplicates} caption="Duplicate detection" tone="red" />
            <MiniMetric label="Posted" value={posted} caption="Completed postings" tone="green" />
          </div>
        </InsightPanel>
        <InsightPanel title="Operational Flow">
          <WorkflowSteps steps={[
            { label: 'Import', detail: 'Load CRDB statement and validate rows.' },
            { label: 'Match', detail: 'Apply mapping rules and manual loan search.' },
            { label: 'Approve', detail: 'Review exceptions and approve posting.' },
            { label: 'Post', detail: 'Send repayment payload to Fineract.' },
          ]} />
        </InsightPanel>
      </div>
      <TableShell title={loading ? 'Latest Statement Batches Loading...' : 'Latest Statement Batches'} actions={<Link className="text-sm font-semibold text-[var(--tenant-primary)]" to="/gateway/reconciliation/batches">View all</Link>}>
        <ReconTable rows={dashboard.latestBatches || []} columns={batchColumns} />
      </TableShell>
    </div>
  );
};
export const ReconImportStatement = () => {
  const [file, setFile] = useState(null);
  const [bankAccountId, setBankAccountId] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importOptions, setImportOptions] = useState({ importCreditOnly: true, checkDuplicates: true, runAutoMatching: false, autoPostHighConfidence: false });
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const formData = () => {
    const selectedFile = fileInputRef.current?.files?.[0] || file;
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('bankAccountId', bankAccountId);
    data.append('statementDate', statementDate);
    data.append('periodFrom', periodFrom);
    data.append('periodTo', periodTo);
    data.append('importCreditOnly', importOptions.importCreditOnly);
    data.append('checkDuplicates', importOptions.checkDuplicates);
    data.append('runAutoMatching', importOptions.runAutoMatching);
    data.append('autoPostHighConfidence', importOptions.autoPostHighConfidence);
    return data;
  };

  const submit = async (mode) => {
    const selectedFile = fileInputRef.current?.files?.[0] || file;
    if (!(selectedFile instanceof File) || selectedFile.size <= 0) {
      addToast('Select a valid statement file before continuing.', 'error');
      return;
    }
    if (!bankAccountId || !statementDate) {
      addToast('File, bank account, and statement date are required.', 'error');
      return;
    }
    setBusy(true);
    try {
      const response = await gatewayApi.post(`/gateway/reconciliation/batches/${mode}`, formData());
      const data = unwrap(response);
      if (mode === 'preview') {
        setPreview(data);
        addToast('Statement preview generated.', 'success');
      } else {
        addToast('Statement imported.', 'success');
        navigate(`/gateway/reconciliation/batches/${data.batchId}`);
      }
    } catch (error) {
      addToast(error?.response?.data?.message || `Failed to ${mode} statement`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Import Statement" subtitle="Upload a CSV, Excel, or text-based PDF bank statement." />
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <label className="block text-sm font-semibold">Bank Account ID</label>
          <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} className="w-full" />
          <label className="block text-sm font-semibold">Statement Date</label>
          <input type="date" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold">Period From
              <input type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <label className="block text-sm font-semibold">Period To
              <input type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
          </div>
          <label className="block text-sm font-semibold">Statement File</label>
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <input ref={fileInputRef} name="file" type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); }} className="w-full text-sm" />
            <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 md:grid-cols-2">
              <span>Accepted: CSV, XLS, XLSX, text PDF</span>
              <span>Credits only import is enabled by default</span>
            </div>
          </div>
          {file ? <p className="text-xs text-slate-500 dark:text-slate-400">Selected: {file.name} ({money(file.size)} bytes)</p> : null}
          <div className="grid gap-2 rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
            {[
              ['importCreditOnly', 'Import credit transactions only'],
              ['checkDuplicates', 'Check duplicates during import'],
              ['runAutoMatching', 'Run auto matching after import'],
              ['autoPostHighConfidence', 'Auto-post high confidence matches'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
                <input type="checkbox" checked={Boolean(importOptions[key])} onChange={(event) => setImportOptions({ ...importOptions, [key]: event.target.checked })} />
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={busy || !file || !bankAccountId || !statementDate} onClick={() => submit('preview')}><Search size={17} />Preview</Button>
            <Button type="button" disabled={busy || !file || !bankAccountId || !statementDate} onClick={() => submit('import')}><UploadCloud size={17} />Import</Button>
          </div>
        </Card>
        <TableShell title="Preview Rows">
          <ReconTable rows={preview?.previewRows || []} columns={[
            { key: 'postingDate', header: 'Posting Date' },
            { key: 'bankReference', header: 'Reference' },
            { key: 'narration', header: 'Details' },
            { key: 'debitAmount', header: 'Debit', render: (row) => money(row.debitAmount) },
            { key: 'creditAmount', header: 'Credit', render: (row) => money(row.creditAmount) },
          ]} emptyMessage="Generate a preview to see parsed rows." />
        </TableShell>
      </div>
      {preview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard label="Rows Found" value={preview.totalRowsFound || 0} icon={ListChecks} />
            <MetricCard label="Credits" value={preview.creditTransactions || 0} icon={CheckCircle2} tone="green" />
            <MetricCard label="Duplicates" value={preview.possibleDuplicates || 0} icon={AlertTriangle} tone="red" />
            <MetricCard label="Credit Amount" value={`TZS ${money(preview.totalCreditAmount)}`} icon={FileSpreadsheet} tone="blue" />
          </div>
          <InsightPanel title="Import Validation">
            <div className="grid gap-3 md:grid-cols-3">
              <MiniMetric label="Duplicate Risk" value={preview.possibleDuplicates || 0} caption="Rows that may already exist" tone={Number(preview.possibleDuplicates || 0) > 0 ? 'red' : 'green'} />
              <MiniMetric label="Credit Share" value={ratio(Number(preview.creditTransactions || 0), Number(preview.totalRowsFound || 0))} caption="Credit rows selected for import" tone="blue" />
              <MiniMetric label="Ready State" value={Number(preview.creditTransactions || 0) > 0 ? 'Ready' : 'Review'} caption="Import after validating preview rows" tone={Number(preview.creditTransactions || 0) > 0 ? 'green' : 'orange'} />
            </div>
          </InsightPanel>
        </div>
      ) : null}
    </div>
  );
};

export const ReconBatches = () => {
  const [filters, setFilters] = useState({ bankAccountId: '', status: '', from: '', to: '' });
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const { rows, loading, reload } = useReconList('/gateway/reconciliation/batches', params);
  const totalRows = sumBy(rows, 'totalRows');
  const posted = sumBy(rows, 'postedCount');
  const review = sumBy(rows, 'reviewCount');
  const failed = sumBy(rows, 'failedCount');
  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Statement Batches" subtitle="Manage imported bank statement batches." actions={<><Link to="/gateway/reconciliation/import"><Button><UploadCloud size={17} />Import Statement</Button></Link><Button variant="secondary" onClick={reload}><RefreshCcw size={17} />Refresh</Button></>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Batches" value={rows.length} icon={FileSpreadsheet} tone="blue" caption="Filtered result" />
        <MetricCard label="Rows Imported" value={totalRows} icon={ListChecks} tone="blue" caption="Total statement rows" />
        <MetricCard label="Posted" value={posted} icon={CheckCircle2} tone="green" caption={`${ratio(posted, totalRows)} of rows`} />
        <MetricCard label="Exceptions" value={review + failed} icon={AlertTriangle} tone="orange" caption={`${review} review, ${failed} failed`} />
      </div>
      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 xl:col-span-2">Bank Account<BankAccountSelect value={filters.bankAccountId} onChange={(value) => setFilters({ ...filters, bankAccountId: value })} className="mt-1 w-full" /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Status<select className={drawerField} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option><option value="IMPORTED">Imported</option><option value="PROCESSED">Processed</option><option value="CANCELLED">Cancelled</option></select></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">From<input type="date" className={drawerField} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">To<input type="date" className={drawerField} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
      </Card>
      <TableShell title={loading ? 'Loading Batches...' : 'Statement Batches'}>
        <ReconTable rows={rows} columns={batchColumns} />
      </TableShell>
    </div>
  );
};
export const ReconBatchDetails = () => {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const { addToast } = useToast();

  const load = async () => {
    const [batchResponse, txResponse] = await Promise.all([
      gatewayApi.get(`/gateway/reconciliation/batches/${batchId}`),
      gatewayApi.get('/gateway/reconciliation/transactions', { params: { batchId } }),
    ]);
    setBatch(unwrap(batchResponse));
    setTransactions(unwrap(txResponse) || []);
  };

  useEffect(() => {
    void load().catch(() => addToast('Failed to load batch details', 'error'));
  }, [batchId]);

  const action = async (path, message, body) => {
    try {
      await gatewayApi.post(path, body || {});
      addToast(message, 'success');
      await load();
    } catch (error) {
      addToast(error?.response?.data?.message || message, 'error');
    }
  };

  const exportBatch = async () => {
    try {
      const response = await gatewayApi.get(`/gateway/reconciliation/batches/${batchId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${batch?.batchNumber || batchId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to export batch', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader
        title="Batch Details"
        subtitle={batch?.batchNumber}
        actions={<>
          <Button variant="secondary" onClick={() => action(`/gateway/reconciliation/batches/${batchId}/auto-match`, 'Auto match complete')}><RefreshCcw size={17} />Auto Match</Button>
          <Button variant="secondary" onClick={exportBatch}><Download size={17} />Export</Button>
          <Button variant="danger" onClick={() => action(`/gateway/reconciliation/batches/${batchId}/cancel`, 'Batch cancelled', { reason: 'Cancelled from reconciliation UI' })}><AlertTriangle size={17} />Cancel</Button>
          <Button onClick={() => action(`/gateway/reconciliation/batches/${batchId}/auto-post`, 'Auto post complete')}><CheckCircle2 size={17} />Post Approved</Button>
        </>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total Rows" value={batch?.totalRows || 0} icon={ListChecks} />
        <MetricCard label="Posted" value={batch?.postedCount || 0} icon={CheckCircle2} tone="green" caption={`${ratio(Number(batch?.postedCount || 0), Number(batch?.totalRows || 0))} complete`} />
        <MetricCard label="Review" value={batch?.reviewCount || 0} icon={ClipboardCheck} tone="yellow" caption="Needs approval" />
        <MetricCard label="Failed" value={batch?.failedCount || 0} icon={AlertTriangle} tone="red" caption="Posting recovery" />
      </div>
      <InsightPanel title="Batch Processing Path">
        <WorkflowSteps steps={[
          { label: 'Imported', detail: `${batch?.totalRows || 0} rows captured from statement.` },
          { label: 'Matched', detail: `${batch?.matchedCount || batch?.postedCount || 0} rows have client or loan context.` },
          { label: 'Reviewed', detail: `${batch?.reviewCount || 0} items remain in manual review.` },
          { label: 'Posted', detail: `${batch?.postedCount || 0} repayments posted to Fineract.` },
        ]} />
      </InsightPanel>
      <TableShell title="Batch Transactions">
        <ReconTable rows={transactions} columns={transactionColumns((row) => <Link className="text-[var(--tenant-primary)]" to={`/gateway/reconciliation/transactions?transactionId=${row.id}`}>View</Link>)} />
      </TableShell>
    </div>
  );
};

export const ReconTransactions = ({ mode = 'transactions' }) => {
  const config = useMemo(() => {
    const map = {
      transactions: { title: 'Transaction Workbench' },
      review: { title: 'Review Queue' },
      unmatched: { title: 'Unmatched Payments' },
      suspense: { title: 'Suspense' },
      posted: { title: 'Posted Payments' },
      failed: { title: 'Failed Postings' },
    };
    return map[mode] || map.transactions;
  }, [mode]);
  const modeDefaults = transactionModeDefaults[mode] || {};
  const [filters, setFilters] = useState({ search: '', matchStatus: '', postingStatus: '', identifierType: '', from: '', to: '', page: 0, size: 20 });
  const [selectedRow, setSelectedRow] = useState(null);
  const [matchRow, setMatchRow] = useState(null);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [markingAlreadyPosted, setMarkingAlreadyPosted] = useState(false);
  const [postingActionId, setPostingActionId] = useState(null);
  const queryParams = useMemo(() => {
    const merged = { ...filters };
    if (!filters.matchStatus && modeDefaults.matchStatus) merged.matchStatus = modeDefaults.matchStatus;
    if (!filters.postingStatus && modeDefaults.postingStatus) merged.postingStatus = modeDefaults.postingStatus;
    return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== '' && value != null));
  }, [filters, modeDefaults.matchStatus, modeDefaults.postingStatus]);
  const { rows, meta, loading, reload } = useReconList('/gateway/reconciliation/transactions', queryParams);
  const { addToast } = useToast();

  useEffect(() => {
    setSelectedRow(null);
    setMatchRow(null);
    setFilters((current) => ({ ...current, matchStatus: '', postingStatus: '', page: 0 }));
  }, [mode]);

  const resetFilters = () => setFilters({ search: '', matchStatus: '', postingStatus: '', identifierType: '', from: '', to: '', page: 0, size: filters.size });
  const setPage = (page) => setFilters({ ...filters, page });
  const setSize = (size) => setFilters({ ...filters, size, page: 0 });

  const runAction = async (row, action) => {
    if (action === 'post' && postingActionId) return;
    if (action === 'post') setPostingActionId(row.id);
    try {
      let body = {};
      if (action === 'mark-already-posted') {
        body = { loanId: row.matchedLoanId };
      }
      const path = mode === 'failed' && action === 'retry'
        ? `/gateway/reconciliation/failed/${row.id}/retry`
        : `/gateway/reconciliation/transactions/${row.id}/${action}`;
      await gatewayApi.post(path, body);
      addToast('Action completed.', 'success');
      await reload();
      setSelectedRow(null);
    } catch (error) {
      addToast(error?.response?.data?.message || 'Action failed', 'error');
    } finally {
      if (action === 'post') setPostingActionId(null);
    }
  };

  const bulkApproveVisible = async () => {
    const transactionIds = rows.filter((row) => row.matchStatus === 'REVIEW_REQUIRED').map((row) => row.id).filter(Boolean);
    if (!transactionIds.length) {
      addToast('No visible review items to approve.', 'error');
      return;
    }
    try {
      await gatewayApi.post('/gateway/reconciliation/review/bulk-approve', { transactionIds });
      addToast('Visible review items approved.', 'success');
      await reload();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Bulk approve failed', 'error');
    }
  };

  const removeDuplicates = async () => {
    setRemovingDuplicates(true);
    try {
      const response = await gatewayApi.post('/gateway/reconciliation/transactions/remove-duplicates', {});
      const result = unwrap(response) || {};
      addToast(`${Number(result.removed || 0)} duplicate transaction(s) removed from posting.`, 'success');
      await reload();
      setSelectedRow(null);
    } catch (error) {
      addToast(error?.response?.data?.message || 'Remove duplicates failed', 'error');
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const markAlreadyPostedByReference = async () => {
    setMarkingAlreadyPosted(true);
    try {
      const response = await gatewayApi.post('/gateway/reconciliation/transactions/mark-already-posted', {});
      const result = unwrap(response) || {};
      addToast(`${Number(result.marked || 0)} transaction(s) marked as already posted.`, 'success');
      await reload();
      setSelectedRow(null);
    } catch (error) {
      addToast(error?.response?.data?.message || 'Mark already posted failed', 'error');
    } finally {
      setMarkingAlreadyPosted(false);
    }
  };

  const openMatch = (row) => {
    setSelectedRow(row);
    setMatchRow(row);
  };

  const actions = (row) => (
    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="font-semibold text-[var(--tenant-primary)]" onClick={() => setSelectedRow(row)}>View</button>
      {mode !== 'posted' && mode !== 'failed' ? <button type="button" className="font-semibold text-[var(--tenant-primary)]" onClick={() => openMatch(row)}>Match</button> : null}
      {row.matchStatus === 'REVIEW_REQUIRED' ? <button type="button" className="font-semibold text-[var(--tenant-primary)]" onClick={() => runAction(row, 'approve')}>Approve</button> : null}
      {(row.postingStatus === 'APPROVED_FOR_POSTING' || row.matchStatus === 'APPROVED_FOR_POSTING') ? <button type="button" disabled={Boolean(postingActionId)} className="inline-flex items-center gap-1 font-semibold text-green-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => runAction(row, 'post')}>
        {postingActionId === row.id ? <Loader2 size={14} className="animate-spin" /> : null}
        {postingActionId === row.id ? 'Posting...' : 'Post'}
      </button> : null}
      {mode === 'failed' ? <button type="button" className="font-semibold text-red-700" onClick={() => runAction(row, 'retry')}>Retry</button> : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <ReconciliationHeader
        title={config.title}
        subtitle="Search, review, match, and post reconciliation transactions."
        actions={<>
          <Button variant="secondary" disabled={markingAlreadyPosted} onClick={markAlreadyPostedByReference}>
            {markingAlreadyPosted ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
            {markingAlreadyPosted ? 'Checking Fineract...' : 'Mark Already Posted'}
          </Button>
          <Button variant="danger" disabled={removingDuplicates || markingAlreadyPosted} onClick={removeDuplicates}><Trash2 size={17} />Remove Duplicates</Button>
          <Button variant="secondary" disabled={markingAlreadyPosted} onClick={reload}><RefreshCcw size={17} />Refresh</Button>
        </>}
      />
      <QueueSummary rows={rows} mode={mode} />
      <TransactionModePanel mode={mode} rows={rows} onBulkAction={bulkApproveVisible} />
      <TransactionFilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />
      <TableShell title={loading ? 'Loading Transactions...' : config.title}>
        <ReconTable
          rows={rows}
          columns={transactionColumns(actions, mode)}
          onRowClick={setSelectedRow}
          selectedRowId={selectedRow?.id}
        />
        <PaginationBar meta={meta} page={filters.page} size={filters.size} onPage={setPage} onSize={setSize} />
      </TableShell>
      <TransactionDetailDrawer row={selectedRow} mode={mode} onClose={() => setSelectedRow(null)} onMatch={openMatch} onAction={runAction} postingActionId={postingActionId} />
      <ManualMatchDrawer row={matchRow} mode={mode} onClose={() => setMatchRow(null)} onSaved={reload} />
    </div>
  );
};

const mappingDefaults = { mappingType: 'CUSTOMER_NUMBER', identifier: '', bankReferencePattern: '', narrationPattern: '', targetClientId: '', targetCustomerId: '', targetClientName: '', targetLoanId: '', targetLoanAccountNo: '', confidence: 95, status: 'ACTIVE', notes: '' };

const MappingEditorDrawer = ({ mapping, onClose, onSaved }) => {
  const { addToast } = useToast();
  const [form, setForm] = useState({ ...mappingDefaults, ...(mapping || {}) });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...mappingDefaults, ...(mapping || {}) });
  }, [mapping?.id]);

  if (!mapping) return null;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const save = async () => {
    const hasSource = form.identifier || form.bankReferencePattern || form.narrationPattern;
    if (!hasSource) {
      addToast('At least one mapping source is required.', 'error');
      return;
    }
    if (!form.targetClientId) {
      addToast('Target client is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, confidence: Number(form.confidence || 95) };
      const response = form.id
        ? await gatewayApi.put(`/gateway/reconciliation/mappings/${form.id}`, payload)
        : await gatewayApi.post('/gateway/reconciliation/mappings', payload);
      addToast('Mapping saved.', 'success');
      await onSaved(unwrap(response));
      onClose();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to save mapping', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <div className="text-base font-bold text-slate-950 dark:text-slate-50">{form.id ? 'Edit Mapping' : 'New Mapping'}</div>
          <div className="text-xs text-slate-500">Reusable transaction-to-client matching rule</div>
        </div>
        <button type="button" className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>x</button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Mapping Type<select className={drawerField} value={form.mappingType || 'CUSTOMER_NUMBER'} onChange={update('mappingType')}>{['CUSTOMER_NUMBER','CLIENT_ID','ACCOUNT_NUMBER','PHONE_NUMBER','NARRATION_MATCH','BANK_REFERENCE'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Status<select className={drawerField} value={form.status || 'ACTIVE'} onChange={update('status')}>{['ACTIVE','PENDING_REVIEW','INACTIVE','REMOVED'].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <InsightPanel title="Source Criteria">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Identifier<input className={drawerField} value={form.identifier || ''} onChange={update('identifier')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Bank Reference Pattern<input className={drawerField} value={form.bankReferencePattern || ''} onChange={update('bankReferencePattern')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Narration Pattern<input className={drawerField} value={form.narrationPattern || ''} onChange={update('narrationPattern')} /></label>
          </div>
        </InsightPanel>
        <InsightPanel title="Target Client And Loan">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Target Client ID<input className={drawerField} value={form.targetClientId || ''} onChange={update('targetClientId')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Target Customer ID<input className={drawerField} value={form.targetCustomerId || ''} onChange={update('targetCustomerId')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">Client Name<input className={drawerField} value={form.targetClientName || ''} onChange={update('targetClientName')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Loan ID<input className={drawerField} value={form.targetLoanId || ''} onChange={update('targetLoanId')} /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Loan Account<input className={drawerField} value={form.targetLoanAccountNo || ''} onChange={update('targetLoanAccountNo')} /></label>
          </div>
        </InsightPanel>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Confidence<input type="number" min="0" max="100" className={drawerField} value={form.confidence || 95} onChange={update('confidence')} /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Notes<input className={drawerField} value={form.notes || ''} onChange={update('notes')} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={save}><Save size={16} />Save Mapping</Button>
      </div>
    </div>
  );
};
export const ReconMappings = () => {
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });
  const [editorMapping, setEditorMapping] = useState(null);
  const { rows, loading, reload } = useReconList('/gateway/reconciliation/mappings', Object.fromEntries(Object.entries({ status: filters.status, type: filters.type }).filter(([, value]) => value)));
  const { addToast } = useToast();

  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = [row.mappingType, row.identifier, row.bankReferencePattern, row.narrationPattern, row.targetClientId, row.targetClientName, row.targetLoanAccountNo].filter(Boolean).join(' ').toLowerCase();
    return !filters.search || haystack.includes(filters.search.toLowerCase());
  }), [rows, filters.search]);
  const activeCount = countWhere(rows, (row) => statusText(row.status) === 'ACTIVE');
  const pendingCount = countWhere(rows, (row) => statusText(row.status).includes('PENDING'));
  const avgConfidence = rows.length ? Math.round(rows.reduce((total, row) => total + Number(row.confidence || 0), 0) / rows.length) : 0;

  const deactivate = async (row) => {
    try {
      await gatewayApi.post(`/gateway/reconciliation/mappings/${row.id}/deactivate`, { reason: 'Deactivated from reconciliation UI' });
      addToast('Mapping deactivated.', 'success');
      await reload();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to deactivate mapping', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Manual Mappings" subtitle="Maintain reusable transaction-to-client matching rules." actions={<><Button onClick={() => setEditorMapping({ ...mappingDefaults })}><Plus size={17} />New Mapping</Button><Button variant="secondary" onClick={reload}><RefreshCcw size={17} />Refresh</Button></>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mappings" value={rows.length} icon={SlidersHorizontal} tone="blue" caption="All configured rules" />
        <MetricCard label="Active" value={activeCount} icon={CheckCircle2} tone="green" caption={`${ratio(activeCount, rows.length)} active`} />
        <MetricCard label="Pending Review" value={pendingCount} icon={ClipboardCheck} tone="yellow" caption="Needs approval" />
        <MetricCard label="Avg Confidence" value={`${avgConfidence}%`} icon={ShieldCheck} tone="blue" caption="Configured mapping score" />
      </div>
      <Card className="grid gap-3 md:grid-cols-4">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">Search<div className="relative"><input className={`${drawerField} pr-9`} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Identifier, client, loan, narration..." /><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /></div></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Type<select className={drawerField} value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">All</option><option value="CUSTOMER_NUMBER">Customer Number</option><option value="CLIENT_ID">Client ID</option><option value="ACCOUNT_NUMBER">Account Number</option><option value="PHONE_NUMBER">Phone</option><option value="NARRATION_MATCH">Narration</option></select></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Status<select className={drawerField} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option><option value="ACTIVE">Active</option><option value="PENDING_REVIEW">Pending Review</option><option value="INACTIVE">Inactive</option></select></label>
      </Card>
      <TableShell title={loading ? 'Loading Mappings...' : 'Configured Mappings'}>
        <ReconTable rows={filteredRows} columns={[
          { key: 'mappingType', header: 'Type' },
          { key: 'identifier', header: 'Source', render: (row) => row.identifier || row.bankReferencePattern || row.narrationPattern || '-' },
          { key: 'targetClientName', header: 'Client', render: (row) => row.targetClientName || row.targetClientId || '-' },
          { key: 'targetLoanAccountNo', header: 'Loan', render: (row) => row.targetLoanAccountNo || row.targetLoanId || '-' },
          { key: 'confidence', header: 'Confidence', render: (row) => `${row.confidence || 0}%` },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><button type="button" className="font-semibold text-[var(--tenant-primary)]" onClick={() => setEditorMapping(row)}>Edit</button>{row.status === 'ACTIVE' ? <button type="button" className="font-semibold text-red-700" onClick={() => deactivate(row)}>Deactivate</button> : null}</div> },
        ]} />
      </TableShell>
      <InsightPanel title="Mapping Validation Rules">
        <WorkflowSteps steps={[
          { label: 'Source Required', detail: 'Identifier, bank reference, or narration pattern must be present.' },
          { label: 'Target Client', detail: 'Target Fineract client ID is required for active mappings.' },
          { label: 'No Duplicate Active Rule', detail: 'Backend prevents duplicate active mapping type and source.' },
          { label: 'Confidence Bounds', detail: 'Score must stay inside configured mapping rule limits.' },
        ]} />
      </InsightPanel>
      <MappingEditorDrawer mapping={editorMapping} onClose={() => setEditorMapping(null)} onSaved={reload} />
    </div>
  );
};
export const ReconReports = () => {
  const [reports, setReports] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [filters, setFilters] = useState({ reportType: 'Daily Reconciliation Summary', from: '', to: '', format: 'CSV', frequency: 'DAILY' });
  const { addToast } = useToast();

  const load = async () => {
    try {
      const [reportResponse, scheduledResponse] = await Promise.all([
        gatewayApi.get('/gateway/reconciliation/reports'),
        gatewayApi.get('/gateway/reconciliation/reports/scheduled'),
      ]);
      const data = unwrap(reportResponse);
      setReports(Array.isArray(data?.reports) ? data.reports : []);
      setScheduled(unwrap(scheduledResponse) || []);
    } catch (error) {
      setReports([]);
      setScheduled([]);
    }
  };

  useEffect(() => { void load(); }, []);

  const generate = async () => {
    try {
      await gatewayApi.post('/gateway/reconciliation/reports/generate', filters);
      addToast('Report generated.', 'success');
      await load();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to generate report', 'error');
    }
  };

  const schedule = async () => {
    try {
      await gatewayApi.post('/gateway/reconciliation/reports/schedule', filters);
      addToast('Report scheduled.', 'success');
      await load();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to schedule report', 'error');
    }
  };

  const fallbackReports = ['Daily Reconciliation Summary', 'Unmatched Transactions Detail', 'Failed Postings Analysis', 'Suspense Account Summary'];
  const reportList = reports.length ? reports : fallbackReports;
  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Reports" subtitle="Generate reconciliation summaries and exception reports." actions={<Button variant="secondary" onClick={load}><RefreshCcw size={17} />Refresh</Button>} />
      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 xl:col-span-2">Report<select className={drawerField} value={filters.reportType} onChange={(event) => setFilters({ ...filters, reportType: event.target.value })}>{reportList.map((report) => <option key={report}>{report}</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">From<input type="date" className={drawerField} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">To<input type="date" className={drawerField} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Format<select className={drawerField} value={filters.format} onChange={(event) => setFilters({ ...filters, format: event.target.value })}>{['CSV','XLSX','PDF'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Frequency<select className={drawerField} value={filters.frequency} onChange={(event) => setFilters({ ...filters, frequency: event.target.value })}>{['DAILY','WEEKLY','MONTHLY'].map((item) => <option key={item}>{item}</option>)}</select></label>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportList.map((report) => (
          <Card key={report} className="flex min-h-[150px] flex-col justify-between">
            <div>
              <FileSpreadsheet className="mb-3 text-[var(--tenant-primary)]" size={22} />
              <div className="font-semibold text-slate-950 dark:text-slate-50">{report}</div>
              <div className="mt-2 text-xs text-slate-500">Filtered by account/date and export format.</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setFilters({ ...filters, reportType: report })}>Select</Button>
              <Button type="button" size="sm" onClick={generate}>Generate</Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <InsightPanel title="Report Workflow" actions={<><Button type="button" size="sm" onClick={generate}><FileSpreadsheet size={16} />Generate</Button><Button type="button" size="sm" variant="secondary" onClick={schedule}><Bell size={16} />Schedule</Button></>}>
          <WorkflowSteps steps={[
            { label: 'Choose', detail: 'Select summary or exception report.' },
            { label: 'Filter', detail: 'Set date range, account, and format.' },
            { label: 'Generate', detail: 'Create an auditable reconciliation output.' },
            { label: 'Schedule', detail: 'Automate recurring reports for operations.' },
          ]} />
        </InsightPanel>
        <InsightPanel title="Scheduled Reports">
          <div className="space-y-2">
            {scheduled.length ? scheduled.slice(0, 6).map((item) => <div key={item.id || item.reportType} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800"><div className="font-semibold text-slate-900 dark:text-slate-100">{item.reportType || item.name || 'Scheduled Report'}</div><div className="mt-1 text-xs text-slate-500">{item.frequency || '-'} - {item.createdBy || 'system'}</div></div>) : <div className="text-sm text-slate-500">No scheduled reports yet.</div>}
          </div>
        </InsightPanel>
      </div>
    </div>
  );
};
export const ReconSettings = () => {
  const defaults = {
    systemName: 'Gateway Bank Reconciliation', fiscalYearStartMonth: 'January', defaultDateRange: 'This Month', timeZone: '(UTC+03:00) East Africa Time', defaultCurrency: 'TZS', numberFormat: '1,234,567.89', defaultItemsPerPage: 20, theme: 'Light',
    autoMatchEnabled: true, autoPostThreshold: 95, reviewThreshold: 70, allowPartialMatches: true, duplicateCheckEnabled: true, duplicateWindowDays: 7, matchDuplicateOnAmountAndDate: true, allowDuplicateOverride: false,
    manualMappingMatchEnabled: true, manualMappingMinScore: 80, manualMappingMaxScore: 100, manualMappingDefaultScore: 95, exactGatewayCustomerMatchEnabled: true, exactGatewayCustomerMatchScore: 100, exactFineractClientMatchEnabled: true, exactFineractClientMatchScore: 100, exactAccountExternalIdMatchEnabled: true, exactAccountExternalIdMatchScore: 100, exactPhoneMatchEnabled: true, exactPhoneMatchScore: 95, clientNameMatchEnabled: true, exactClientNameMatchScore: 95, similarClientNameMinScore: 70, similarClientNameMaxScore: 89,
    amountTolerance: '10.00', percentageTolerance: '0.10', dateToleranceDays: 2, descriptionVariance: 'Medium', requireApprovalForManualMatch: true, checkPlainReferenceExternalId: true, manualMatchApprovalLimit: '100000.00', multiLevelApprovalEnabled: true, autoPostAfterApprovalEnabled: false,
    dailySummaryEmailEnabled: false, exceptionAlertsEnabled: true, batchCompletionAlertsEnabled: true, failedPostingAlertsEnabled: true, retentionYears: 7, auditRetentionYears: 10, archiveInactiveBatchesAfterDays: 90, autoPurgeEnabled: true,
    acceptedFileFormats: 'XLS, XLSX, CSV', requireStatementHeaderRow: true, checkDuplicatesOnImport: true, autoMatchAfterImport: true, defaultPaymentTypeId: 1, mappedPaymentType: 'Loan Repayment', suspenseAccountName: 'Suspense Account', suspenseAccountCode: '10100', duplicateClearingAccountName: 'Duplicate Clearing', duplicateClearingAccountCode: '110300', failedPostingAccountName: 'Failed Posting', failedPostingAccountCode: '110400', allowOverpaymentToSavings: false, autoCreateSavingsForOverpayment: true, autoActivateSavingsForOverpayment: true, overpaymentSavingsProductId: '', overpaymentDepositPaymentTypeId: '', overpaymentSavingsExternalIdPrefix: 'RECON-OVP',
  };
  const accountDefaults = { accountName: '', accountNumber: '', bankName: '', accountType: 'Collection', currency: 'TZS', branchName: '', glAccountName: '', glAccountId: '', defaultCollectionAccount: false, autoImportEnabled: true, statementFormat: 'MT940', reconciliationFrequency: 'Daily', active: true };
  const [activeSection, setActiveSection] = useState('General Settings');
  const [settings, setSettings] = useState(null);
  const [savingsProducts, setSavingsProducts] = useState([]);
  const [savingsProductsLoading, setSavingsProductsLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountForm, setAccountForm] = useState(null);
  const [filters, setFilters] = useState({ search: '', bank: '', accountType: '', branch: '', currency: '', status: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const loadSettings = async () => {
    setSavingsProductsLoading(true);
    const [settingsResponse, accountsResponse, savingsProductsResult] = await Promise.all([
      gatewayApi.get('/gateway/reconciliation/settings'),
      gatewayApi.get('/gateway/reconciliation/bank-accounts'),
      api.get('/savingsproducts').catch((error) => ({ error })),
    ]);
    const loadedAccounts = unwrap(accountsResponse) || [];
    const productsPayload = savingsProductsResult?.error ? [] : savingsProductsResult?.data;
    const loadedSavingsProducts = Array.isArray(productsPayload) ? productsPayload : productsPayload?.pageItems || [];
    setSettings({ ...defaults, ...(unwrap(settingsResponse) || {}) });
    setSavingsProducts(loadedSavingsProducts);
    setSavingsProductsLoading(false);
    setAccounts(loadedAccounts);
    setSelectedAccountId((current) => current || loadedAccounts.find((account) => account.defaultCollectionAccount)?.id || loadedAccounts[0]?.id || '');
  };

  useEffect(() => { void loadSettings().catch((error) => addToast(error?.response?.data?.message || 'Failed to load settings', 'error')); }, []);

  const update = (key, value) => setSettings((current) => ({ ...(current || defaults), [key]: value }));
  const updateAccount = (key, value) => setAccountForm((current) => ({ ...(current || accountDefaults), [key]: value }));
  const text = (key) => (event) => update(key, event.target.value);
  const numeric = (key) => (event) => update(key, event.target.value === '' && key.startsWith('overpayment') ? '' : Number(event.target.value));
  const accountText = (key) => (event) => updateAccount(key, event.target.value);

  const saveSettings = async (message = 'Settings saved.') => {
    if (!settings) return;
    if (settings.allowOverpaymentToSavings && Number(settings.overpaymentSavingsProductId || 0) <= 0) {
      addToast('Overpayment savings product is required when overpayment-to-savings is enabled.', 'error');
      return;
    }
    const payload = {
      ...settings,
      overpaymentSavingsProductId: settings.overpaymentSavingsProductId === '' ? null : Number(settings.overpaymentSavingsProductId || 0),
      overpaymentDepositPaymentTypeId: settings.overpaymentDepositPaymentTypeId === '' ? null : Number(settings.overpaymentDepositPaymentTypeId || 0),
    };
    setSaving(true);
    try { const response = await gatewayApi.put('/gateway/reconciliation/settings', payload); setSettings({ ...defaults, ...(unwrap(response) || {}) }); addToast(message, 'success'); }
    catch (error) { addToast(error?.response?.data?.errors?.[0]?.details || error?.response?.data?.message || 'Failed to save settings', 'error'); }
    finally { setSaving(false); }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try { const response = await gatewayApi.post('/gateway/reconciliation/settings/reset'); setSettings({ ...defaults, ...(unwrap(response) || {}) }); addToast('Settings reset to defaults.', 'success'); }
    catch (error) { addToast(error?.response?.data?.message || 'Failed to reset settings', 'error'); }
    finally { setSaving(false); }
  };

  const saveAccount = async () => {
    if (!accountForm?.accountName || !accountForm?.accountNumber || !accountForm?.bankName) { addToast('Account name, account number, and bank name are required.', 'error'); return; }
    setSaving(true);
    try {
      const request = accountForm.id ? gatewayApi.put(`/gateway/reconciliation/bank-accounts/${accountForm.id}`, accountForm) : gatewayApi.post('/gateway/reconciliation/bank-accounts', accountForm);
      const response = await request;
      const saved = unwrap(response);
      await loadSettings();
      setSelectedAccountId(saved?.id || selectedAccountId);
      setAccountForm(null);
      addToast('Bank account saved.', 'success');
    } catch (error) { addToast(error?.response?.data?.message || 'Failed to save bank account', 'error'); }
    finally { setSaving(false); }
  };

  const accountAction = async (path, message) => {
    setSaving(true);
    try { const response = await gatewayApi.post(path); const saved = unwrap(response); await loadSettings(); if (saved?.id) setSelectedAccountId(saved.id); addToast(message, 'success'); }
    catch (error) { addToast(error?.response?.data?.message || message, 'error'); }
    finally { setSaving(false); }
  };

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const haystack = [account.accountName, account.accountNumber, account.bankName, account.branchName].filter(Boolean).join(' ').toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
    if (filters.bank && account.bankName !== filters.bank) return false;
    if (filters.accountType && account.accountType !== filters.accountType) return false;
    if (filters.branch && account.branchName !== filters.branch) return false;
    if (filters.currency && account.currency !== filters.currency) return false;
    if (filters.status === 'active' && !account.active) return false;
    if (filters.status === 'inactive' && account.active) return false;
    return true;
  }), [accounts, filters]);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || filteredAccounts[0] || accounts[0];
  const savingsProductName = (productId) => { const product = savingsProducts.find((item) => String(item.id) === String(productId)); return product ? (product.name || product.shortName || ('Product ' + product.id)) : (productId ? ('Product ' + productId) : 'Product Missing'); };
  const unique = (field) => [...new Set(accounts.map((account) => account[field]).filter(Boolean))];
  const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
  const inputClass = 'mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[var(--tenant-primary)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  const exportAccounts = () => { const rows = [['Account Name','Account Number','Bank','Account Type','Currency','Branch','GL Account','Default','Status','Last Synced'], ...filteredAccounts.map((account) => [account.accountName, account.accountNumber, account.bankName, account.accountType, account.currency, account.branchName, account.glAccountName, account.defaultCollectionAccount ? 'Yes' : 'No', account.active ? 'Active' : 'Inactive', account.lastSyncedAt || ''])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = 'reconciliation-bank-accounts.csv'; link.click(); URL.revokeObjectURL(url); };

  const Toggle = ({ checked, onChange }) => <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-4' : 'left-0.5'}`} /></button>;
  const Field = ({ label, children }) => <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300"><span>{label}</span>{children}</label>;
  const SettingRow = ({ label, field, type = 'toggle', value }) => { const current = settings?.[field] ?? defaults[field]; return <div className="flex min-h-[34px] items-center justify-between gap-4 text-sm"><div className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-200"><Check size={13} className="text-green-600" /><span className="truncate">{label}</span></div>{type === 'toggle' ? <Toggle checked={Boolean(current)} onChange={(next) => update(field, next)} /> : null}{type === 'number' ? <input type="number" value={current} onChange={numeric(field)} className="h-8 w-24 rounded-md border border-slate-200 px-2 text-right text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /> : null}{type === 'savingsProduct' ? <select value={current || ''} onChange={(event) => update(field, event.target.value)} disabled={savingsProductsLoading} className="h-8 w-52 rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"><option value="">{savingsProductsLoading ? 'Loading products...' : 'Select product'}</option>{savingsProducts.map((product) => <option key={product.id} value={product.id}>{product.name || product.shortName || `Product ${product.id}`}</option>)}</select> : null}{type === 'text' ? <input value={current} onChange={text(field)} className="h-8 w-36 rounded-md border border-slate-200 px-2 text-right text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /> : null}{type === 'static' ? <span className="shrink-0 text-xs font-bold text-slate-800 dark:text-slate-100">{value}</span> : null}</div>; };
  const SettingsCard = ({ icon: Icon, tone, title, subtitle, children, action, onAction }) => <Card className="flex min-h-[190px] flex-col p-0"><div className="flex items-start gap-3 px-4 pt-4"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${tone}`}><Icon size={20} /></div><div className="min-w-0"><h3 className="text-base font-bold text-slate-950 dark:text-slate-50">{title}</h3><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p></div></div><div className="mt-4 flex-1 space-y-2 px-4 pb-4">{children}</div><button type="button" onClick={onAction} className="flex h-11 items-center justify-between border-t border-slate-100 px-4 text-sm font-semibold text-[var(--tenant-primary)] dark:border-slate-800"><span>{action}</span><ChevronRight size={16} /></button></Card>;
  const settingsNav = [{ label: 'General Settings', description: 'System preferences and defaults', icon: Settings }, { label: 'Overpayment Savings', description: 'Savings product for excess repayments', icon: Database }, { label: 'Bank Accounts', description: 'Manage bank & GL accounts', icon: Building2 }, { label: 'Branches', description: 'Manage branches and locations', icon: GitBranch }, { label: 'Users & Roles', description: 'Manage users, roles and permissions', icon: Users }, { label: 'Mapping Rules', description: 'Auto match rules and priorities', icon: SlidersHorizontal }, { label: 'Workflows', description: 'Review and approval workflows', icon: GitBranch }, { label: 'Notifications', description: 'Email and system notifications', icon: Bell }, { label: 'File & Import Settings', description: 'File formats and import preferences', icon: Upload }, { label: 'Retentions & Archival', description: 'Data retention and archival policies', icon: Archive }, { label: 'Audit Settings', description: 'Audit log and tracking preferences', icon: FileSpreadsheet }, { label: 'Integrations', description: 'Third-party integrations and APIs', icon: Plug }, { label: 'System Preferences', description: 'Regional, language and appearance', icon: SlidersHorizontal }];

  if (!settings) return <Card><div className="text-sm text-slate-500">Loading settings...</div></Card>;

  const renderOverpaymentSavings = () => <div className="space-y-4"><div><h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">Overpayment Savings</h3><p className="text-sm text-slate-500">Configure how repayment amounts above outstanding loan balance move into a savings account.</p></div><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><SettingsCard icon={Database} tone="border-blue-200 bg-blue-50 text-blue-700" title="Savings Posting Controls" subtitle="Enable and configure the Fineract savings product used for excess repayments." action="Save Overpayment Settings" onAction={() => saveSettings('Overpayment savings settings saved.')}><SettingRow label="Allow Overpayment to Savings" field="allowOverpaymentToSavings" /><SettingRow label="Auto-create Savings Account" field="autoCreateSavingsForOverpayment" /><SettingRow label="Auto-activate Savings Account" field="autoActivateSavingsForOverpayment" /><SettingRow label="Savings Product" field="overpaymentSavingsProductId" type="savingsProduct" /><SettingRow label="Savings Deposit Payment Type ID" field="overpaymentDepositPaymentTypeId" type="number" /><SettingRow label="Savings External ID Prefix" field="overpaymentSavingsExternalIdPrefix" type="text" /></SettingsCard><InsightPanel title="Current Behavior"><WorkflowSteps steps={[{ label: settings.allowOverpaymentToSavings ? 'Enabled' : 'Disabled', detail: settings.allowOverpaymentToSavings ? 'Excess repayment amount will be split to savings.' : 'Repayments above outstanding balance are blocked.' }, { label: settings.autoCreateSavingsForOverpayment ? 'Auto Create' : 'Manual Account Required', detail: settings.autoCreateSavingsForOverpayment ? 'A missing savings account can be created automatically.' : 'Client must already have an active savings account.' }, { label: settings.autoActivateSavingsForOverpayment ? 'Auto Activate' : 'Manual Activation', detail: settings.autoActivateSavingsForOverpayment ? 'New savings accounts are approved and activated automatically.' : 'Created savings accounts require manual activation.' }, { label: settings.overpaymentSavingsProductId ? savingsProductName(settings.overpaymentSavingsProductId) : 'Product Missing', detail: settings.overpaymentSavingsProductId ? 'Savings product is configured.' : 'Set savings product ID before enabling posting.' }]} /></InsightPanel></div></div>;
  const renderGeneralSettings = () => <div className="space-y-4"><Card className="p-0"><div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div><h3 className="text-base font-bold text-slate-950 dark:text-slate-50">General Settings</h3><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="System Name"><input className={inputClass} value={settings.systemName || ''} onChange={text('systemName')} /></Field><Field label="Fiscal Year Start Month"><select className={inputClass} value={settings.fiscalYearStartMonth} onChange={text('fiscalYearStartMonth')}>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Default Date Range"><select className={inputClass} value={settings.defaultDateRange} onChange={text('defaultDateRange')}>{['Today','This Week','This Month','Last Month','This Quarter','This Year'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Time Zone"><select className={inputClass} value={settings.timeZone} onChange={text('timeZone')}>{['(UTC+03:00) East Africa Time','(UTC+00:00) UTC','(UTC+02:00) Central Africa Time','(UTC+03:00) Nairobi'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Default Currency"><select className={inputClass} value={settings.defaultCurrency} onChange={text('defaultCurrency')}><option value="TZS">TZS - Tanzanian Shilling</option><option value="USD">USD - US Dollar</option><option value="KES">KES - Kenyan Shilling</option><option value="UGX">UGX - Ugandan Shilling</option></select></Field><Field label="Number Format"><select className={inputClass} value={settings.numberFormat} onChange={text('numberFormat')}>{['1,234,567.89','1.234.567,89','1 234 567.89','1234567.89'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Items Per Page"><select className={inputClass} value={settings.defaultItemsPerPage} onChange={(event) => update('defaultItemsPerPage', Number(event.target.value))}>{[10,20,50,100].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><div><div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Theme</div><div className="mt-2 grid h-10 grid-cols-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">{[{ label: 'Light', icon: Sun }, { label: 'Dark', icon: Moon }, { label: 'System', icon: Monitor }].map((option) => { const Icon = option.icon; const active = settings.theme === option.label; return <button type="button" key={option.label} onClick={() => update('theme', option.label)} className={`flex items-center justify-center gap-2 text-sm font-semibold ${active ? 'bg-blue-50 text-[var(--tenant-primary)] ring-1 ring-inset ring-[var(--tenant-primary)] dark:bg-blue-950/30' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}><Icon size={15} />{option.label}</button>; })}</div></div></div></div><div className="border-l border-slate-100 pl-5 dark:border-slate-800"><div className="rounded-lg bg-blue-50 p-4 text-sm text-slate-700 dark:bg-blue-950/30 dark:text-slate-200"><div className="mb-3 flex items-center gap-2 font-bold text-slate-950 dark:text-slate-50"><ShieldCheck size={17} className="text-[var(--tenant-primary)]" />About General Settings</div>Manage system wide preferences and default values used across the reconciliation platform.</div><div className="mt-7 space-y-3"><Button type="button" className="w-full" disabled={saving} onClick={() => saveSettings()}><Save size={17} />Save Changes</Button><Button type="button" variant="secondary" className="w-full" disabled={saving} onClick={resetDefaults}><RotateCcw size={17} />Reset to Defaults</Button></div></div></div></Card><div className="grid gap-4 xl:grid-cols-3"><SettingsCard icon={CheckCircle2} tone="border-green-200 bg-green-50 text-green-700" title="Auto Matching" subtitle="Configure auto matching behavior." action="Configure Rules" onAction={() => setActiveSection('Mapping Rules')}><SettingRow label="Enable Auto Match" field="autoMatchEnabled" /><SettingRow label="Auto Match After Import" field="autoMatchAfterImport" /><SettingRow label="Auto Post Enabled" field="autoPostEnabled" /><SettingRow label="Auto Post Threshold" field="autoPostThreshold" type="number" /><SettingRow label="Review Threshold" field="reviewThreshold" type="number" /><SettingRow label="Allow Partial Matches" field="allowPartialMatches" /></SettingsCard><SettingsCard icon={ClipboardCheck} tone="border-purple-200 bg-purple-50 text-purple-700" title="Duplicate Management" subtitle="Configure duplicate detection." action="Configure Settings" onAction={() => saveSettings('Duplicate settings saved.')}><SettingRow label="Duplicate Check" field="duplicateCheckEnabled" /><SettingRow label="Check Duplicates on Import" field="checkDuplicatesOnImport" /><SettingRow label="Duplicate Window (Days)" field="duplicateWindowDays" type="number" /><SettingRow label="Match on Amount & Date" field="matchDuplicateOnAmountAndDate" /><SettingRow label="Allow Duplicate Override" field="allowDuplicateOverride" /></SettingsCard><SettingsCard icon={AlertTriangle} tone="border-orange-200 bg-orange-50 text-orange-700" title="Tolerance Settings" subtitle="Configure matching tolerances." action="Configure Tolerances" onAction={() => saveSettings('Tolerance settings saved.')}><SettingRow label="Amount Tolerance" field="amountTolerance" type="text" /><SettingRow label="Percentage Tolerance" field="percentageTolerance" type="text" /><SettingRow label="Date Tolerance (Days)" field="dateToleranceDays" type="number" /><SettingRow label="Description Variance" field="descriptionVariance" type="text" /></SettingsCard><SettingsCard icon={ShieldCheck} tone="border-teal-200 bg-teal-50 text-teal-700" title="Approval Settings" subtitle="Configure approvals and limits." action="Configure Workflows" onAction={() => saveSettings('Approval settings saved.')}><SettingRow label="Require Approval for Manual Match" field="requireApprovalForManualMatch" /><SettingRow label="Approval Limit (TZS)" field="manualMatchApprovalLimit" type="text" /><SettingRow label="Multi Level Approval" field="multiLevelApprovalEnabled" /><SettingRow label="Auto Post After Approval" field="autoPostAfterApprovalEnabled" /></SettingsCard><SettingsCard icon={Mail} tone="border-amber-200 bg-amber-50 text-amber-700" title="Email Notifications" subtitle="Manage email notifications." action="Manage Templates" onAction={() => saveSettings('Notification settings saved.')}><SettingRow label="Daily Reconciliation Summary" field="dailySummaryEmailEnabled" /><SettingRow label="Exception Alerts" field="exceptionAlertsEnabled" /><SettingRow label="Batch Completion Alerts" field="batchCompletionAlertsEnabled" /><SettingRow label="Failed Posting Alerts" field="failedPostingAlertsEnabled" /></SettingsCard><SettingsCard icon={Database} tone="border-blue-200 bg-blue-50 text-blue-700" title="Overpayment Savings" subtitle="Move excess repayment to savings." action="Configure Savings" onAction={() => setActiveSection('Overpayment Savings')}><SettingRow label="Allow Overpayment to Savings" field="allowOverpaymentToSavings" /><SettingRow label="Auto-create Savings" field="autoCreateSavingsForOverpayment" /><SettingRow label="Auto-activate Savings" field="autoActivateSavingsForOverpayment" /><SettingRow label="Savings Product" field="overpaymentSavingsProductId" type="savingsProduct" /></SettingsCard><SettingsCard icon={Database} tone="border-blue-200 bg-blue-50 text-blue-700" title="Data Retention" subtitle="Configure data retention policies." action="Configure Retention" onAction={() => saveSettings('Retention settings saved.')}><SettingRow label="Retain Reconciliation Data" field="retentionYears" type="number" /><SettingRow label="Retain Audit Logs" field="auditRetentionYears" type="number" /><SettingRow label="Archive Inactive Batches" field="archiveInactiveBatchesAfterDays" type="number" /><SettingRow label="Auto Purge Options" field="autoPurgeEnabled" /></SettingsCard></div></div>;
  const renderMappingRules = () => {
    const rules = [
      { name: 'Gateway Customer Number', enabled: 'exactGatewayCustomerMatchEnabled', score: 'exactGatewayCustomerMatchScore', detail: 'Exact Gateway customer number', defaultScore: 100 },
      { name: 'Fineract Client ID', enabled: 'exactFineractClientMatchEnabled', score: 'exactFineractClientMatchScore', detail: 'Exact Fineract client identifier', defaultScore: 100 },
      { name: 'Account / External ID', enabled: 'exactAccountExternalIdMatchEnabled', score: 'exactAccountExternalIdMatchScore', detail: 'Exact Fineract account or external ID', defaultScore: 100 },
      { name: 'Phone Number', enabled: 'exactPhoneMatchEnabled', score: 'exactPhoneMatchScore', detail: 'Exact normalized MSISDN match', defaultScore: 95 },
      { name: 'Client Name', enabled: 'clientNameMatchEnabled', score: 'exactClientNameMatchScore', detail: 'Exact and similar client name matching', defaultScore: 95 },
      { name: 'Manual Mapping', enabled: 'manualMappingMatchEnabled', score: 'manualMappingDefaultScore', detail: 'Saved mapping rules from review/unmatched work', defaultScore: 95 },
    ];
    const activeCount = rules.filter((rule) => settings?.[rule.enabled]).length;
    return <div className="space-y-4"><div><h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">Mapping Rules</h3><p className="text-sm text-slate-500">Configure auto-match rule priority, confidence scores, and manual mapping bounds.</p></div><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4"><MetricCard label="Configured Rules" value={rules.length} icon={SlidersHorizontal} tone="blue" caption="Match rule families" /><MetricCard label="Active Rules" value={activeCount} icon={CheckCircle2} tone="green" caption={`${Math.round((activeCount / rules.length) * 100)}% enabled`} /><MetricCard label="Auto Post Threshold" value={`${settings.autoPostThreshold}%`} icon={ClipboardCheck} tone="blue" caption="Approve for posting" /><MetricCard label="Review Threshold" value={`${settings.reviewThreshold}%`} icon={AlertTriangle} tone="orange" caption="Below this is unmatched" /></div><Card className="p-0"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="text-base font-bold text-slate-950 dark:text-slate-50">Matching Rule Scores</div></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800/60"><tr><th className="px-4 py-3 text-left">Rule</th><th className="px-4 py-3 text-left">Match Criteria</th><th className="px-4 py-3 text-left">Enabled</th><th className="px-4 py-3 text-left">Score</th><th className="px-4 py-3 text-left">Default</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rules.map((rule) => <tr key={rule.name}><td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{rule.name}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rule.detail}</td><td className="px-4 py-3"><Toggle checked={Boolean(settings?.[rule.enabled])} onChange={(next) => update(rule.enabled, next)} /></td><td className="px-4 py-3"><input type="number" min="0" max="100" value={settings?.[rule.score] ?? rule.defaultScore} onChange={numeric(rule.score)} className="h-9 w-24 rounded-md border border-slate-200 px-2 text-right text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></td><td className="px-4 py-3 text-slate-500">{rule.defaultScore}%</td></tr>)}</tbody></table></div></Card><div className="grid gap-4 xl:grid-cols-2"><SettingsCard icon={SlidersHorizontal} tone="border-blue-200 bg-blue-50 text-blue-700" title="Name Matching Bounds" subtitle="Control exact and fuzzy name confidence." action="Save Name Rules" onAction={() => saveSettings('Name matching rules saved.')}><SettingRow label="Enable Client Name Matching" field="clientNameMatchEnabled" /><SettingRow label="Exact Client Name Score" field="exactClientNameMatchScore" type="number" /><SettingRow label="Similar Name Minimum" field="similarClientNameMinScore" type="number" /><SettingRow label="Similar Name Maximum" field="similarClientNameMaxScore" type="number" /></SettingsCard><SettingsCard icon={ClipboardCheck} tone="border-green-200 bg-green-50 text-green-700" title="Manual Mapping Controls" subtitle="Validate saved mapping rules and confidence." action="Save Mapping Rules" onAction={() => saveSettings('Manual mapping rules saved.')}><SettingRow label="Enable Manual Mapping" field="manualMappingMatchEnabled" /><SettingRow label="Default Confidence" field="manualMappingDefaultScore" type="number" /><SettingRow label="Minimum Confidence" field="manualMappingMinScore" type="number" /><SettingRow label="Maximum Confidence" field="manualMappingMaxScore" type="number" /></SettingsCard></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={resetDefaults}><RotateCcw size={17} />Reset Defaults</Button><Button type="button" disabled={saving} onClick={() => saveSettings('Mapping rules saved.')}><Save size={17} />Save Changes</Button></div></div>;
  };
  const renderAccountForm = () => <div className="space-y-3"><div className="text-base font-bold text-slate-950 dark:text-slate-50">{accountForm.id ? 'Edit Bank Account' : 'Add Bank Account'}</div><Field label="Account Name"><input className={inputClass} value={accountForm.accountName || ''} onChange={accountText('accountName')} /></Field><Field label="Account Number"><input className={inputClass} value={accountForm.accountNumber || ''} onChange={accountText('accountNumber')} /></Field><Field label="Bank Name"><input className={inputClass} value={accountForm.bankName || ''} onChange={accountText('bankName')} /></Field><Field label="Account Type"><select className={inputClass} value={accountForm.accountType || 'Collection'} onChange={accountText('accountType')}>{['Collection','Settlement','Mobile Wallet','Escrow'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Branch"><input className={inputClass} value={accountForm.branchName || ''} onChange={accountText('branchName')} /></Field><Field label="Currency"><select className={inputClass} value={accountForm.currency || 'TZS'} onChange={accountText('currency')}>{['TZS','USD','KES','UGX'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Statement Format"><select className={inputClass} value={accountForm.statementFormat || 'MT940'} onChange={accountText('statementFormat')}>{['MT940','CSV','XLS','XLSX','PDF'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="GL Account Mapping"><input className={inputClass} value={accountForm.glAccountName || ''} onChange={accountText('glAccountName')} /></Field><div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800"><span>Default Collection Account</span><Toggle checked={Boolean(accountForm.defaultCollectionAccount)} onChange={(next) => updateAccount('defaultCollectionAccount', next)} /></div><div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800"><span>Auto Import Enabled</span><Toggle checked={Boolean(accountForm.autoImportEnabled)} onChange={(next) => updateAccount('autoImportEnabled', next)} /></div><div className="grid grid-cols-2 gap-2 pt-2"><Button type="button" disabled={saving} onClick={saveAccount}><Save size={16} />Save</Button><Button type="button" variant="secondary" onClick={() => setAccountForm(null)}>Cancel</Button></div></div>;

  const renderBankAccounts = () => { const activeCount = accounts.filter((account) => account.active).length; const inactiveCount = accounts.length - activeCount; const defaultAccount = accounts.find((account) => account.defaultCollectionAccount); return <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-4"><div><h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">Bank Accounts</h3><p className="text-sm text-slate-500">Manage collection accounts, settlement accounts, and GL mappings.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Bank Accounts" value={accounts.length} icon={Building2} tone="blue" caption="All configured accounts" /><MetricCard label="Active Accounts" value={activeCount} icon={CheckCircle2} tone="green" caption="Currently active" /><MetricCard label="Default Collection Account" value={defaultAccount?.accountName || '-'} icon={Star} tone="blue" caption={defaultAccount?.accountNumber || 'Not configured'} /><MetricCard label="Inactive Accounts" value={inactiveCount} icon={AlertTriangle} tone="orange" caption="Not currently active" /></div><div className="flex flex-wrap gap-3"><Button type="button" onClick={() => setAccountForm({ ...accountDefaults })}><Plus size={17} />Add Bank Account</Button><Button type="button" variant="secondary" onClick={exportAccounts}><Download size={17} />Export</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => accountAction('/gateway/reconciliation/bank-accounts/sync', 'Accounts synced.')}><RefreshCcw size={17} />Sync Accounts</Button></div><Card className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Field label="Search"><div className="relative"><input className={`${inputClass} pr-9`} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search account name or number..." /><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /></div></Field><Field label="Bank"><select className={inputClass} value={filters.bank} onChange={(event) => setFilters({ ...filters, bank: event.target.value })}><option value="">All Banks</option>{unique('bankName').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Account Type"><select className={inputClass} value={filters.accountType} onChange={(event) => setFilters({ ...filters, accountType: event.target.value })}><option value="">All Types</option>{unique('accountType').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Branch"><select className={inputClass} value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })}><option value="">All Branches</option>{unique('branchName').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Currency"><select className={inputClass} value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value })}><option value="">All Currencies</option>{unique('currency').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status"><select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field></Card><Card className="p-0"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800/60"><tr>{['Account Name','Account Number','Bank','Account Type','Currency','Branch','GL Account','Default','Status','Last Synced','Actions'].map((head) => <th key={head} className="whitespace-nowrap px-3 py-3 text-left">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredAccounts.map((account) => <tr key={account.id} onClick={() => setSelectedAccountId(account.id)} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedAccount?.id === account.id ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}><td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{account.accountName}</td><td className="px-3 py-3">{account.accountNumber}</td><td className="px-3 py-3">{account.bankName}</td><td className="px-3 py-3"><Badge tone="blue">{account.accountType || 'Collection'}</Badge></td><td className="px-3 py-3">{account.currency}</td><td className="px-3 py-3">{account.branchName || '-'}</td><td className="px-3 py-3">{account.glAccountName || '-'}</td><td className="px-3 py-3"><Badge tone={account.defaultCollectionAccount ? 'blue' : 'gray'}>{account.defaultCollectionAccount ? 'Yes' : 'No'}</Badge></td><td className="px-3 py-3"><Badge tone={account.active ? 'green' : 'red'}>{account.active ? 'Active' : 'Inactive'}</Badge></td><td className="px-3 py-3">{formatDate(account.lastSyncedAt)}</td><td className="px-3 py-3"><div className="flex gap-1"><button type="button" title="Edit" onClick={(event) => { event.stopPropagation(); setAccountForm({ ...accountDefaults, ...account }); }} className="rounded p-1 text-[var(--tenant-primary)] hover:bg-blue-50"><Edit3 size={15} /></button><button type="button" title="Sync" onClick={(event) => { event.stopPropagation(); accountAction(`/gateway/reconciliation/bank-accounts/${account.id}/sync`, 'Account synced.'); }} className="rounded p-1 text-slate-600 hover:bg-slate-100"><RefreshCcw size={15} /></button><MoreVertical size={15} className="mt-1 text-slate-400" /></div></td></tr>)}{filteredAccounts.length === 0 ? <EmptyRow colSpan={11} message="No bank accounts found." /> : null}</tbody></table></div><div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800">Showing 1 to {filteredAccounts.length} of {accounts.length} accounts</div></Card><div className="grid gap-4 xl:grid-cols-2"><SettingsCard icon={FileSpreadsheet} tone="border-green-200 bg-green-50 text-green-700" title="Statement Import Rules" subtitle="Configure how statements are imported and validated." action="Configure Import Rules" onAction={() => saveSettings('Import rules saved.')}><SettingRow label="Accepted File Formats" field="acceptedFileFormats" type="text" /><SettingRow label="Require Header Row" field="requireStatementHeaderRow" /><SettingRow label="Check for Duplicates on Import" field="checkDuplicatesOnImport" /><SettingRow label="Check Plain Ref External ID" field="checkPlainReferenceExternalId" /><SettingRow label="Auto-match Transactions After Import" field="autoMatchAfterImport" /></SettingsCard><SettingsCard icon={ClipboardCheck} tone="border-purple-200 bg-purple-50 text-purple-700" title="GL & Posting Mapping" subtitle="Define GL mappings for postings and reconciliation." action="Configure GL Mapping" onAction={() => saveSettings('GL mapping saved.')}><SettingRow label="Mapped Payment Type" field="mappedPaymentType" type="text" /><SettingRow label="Default Payment Type ID" field="defaultPaymentTypeId" type="number" /><SettingRow label="Suspense Account" type="static" value={`${settings.suspenseAccountName} (${settings.suspenseAccountCode})`} /><SettingRow label="Duplicate Clearing Account" type="static" value={`${settings.duplicateClearingAccountName} (${settings.duplicateClearingAccountCode})`} /><SettingRow label="Failed Posting Account" type="static" value={`${settings.failedPostingAccountName} (${settings.failedPostingAccountCode})`} /><SettingRow label="Allow Overpayment to Savings" field="allowOverpaymentToSavings" /><SettingRow label="Auto-create Savings" field="autoCreateSavingsForOverpayment" /><SettingRow label="Auto-activate Savings" field="autoActivateSavingsForOverpayment" /><SettingRow label="Overpayment Savings Product" field="overpaymentSavingsProductId" type="savingsProduct" /><SettingRow label="Savings Deposit Payment Type ID" field="overpaymentDepositPaymentTypeId" type="number" /><SettingRow label="Overpayment External ID Prefix" field="overpaymentSavingsExternalIdPrefix" type="text" /></SettingsCard></div></div><Card className="p-0"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="text-base font-bold text-slate-950 dark:text-slate-50">Bank Account Details</div><ChevronRight size={18} className="rotate-180 text-slate-500" /></div><div className="p-5">{accountForm ? renderAccountForm() : selectedAccount ? <div className="space-y-4 text-sm"><div><div className="text-xs font-semibold text-slate-500">Account Name</div><div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{selectedAccount.accountName}</div></div><div><div className="text-xs font-semibold text-slate-500">Account Number</div><div className="mt-1 font-bold">{selectedAccount.accountNumber}</div></div><div><div className="text-xs font-semibold text-slate-500">Bank Name</div><div className="mt-1 font-bold">{selectedAccount.bankName}</div></div><div><div className="text-xs font-semibold text-slate-500">Account Type</div><Badge tone="blue">{selectedAccount.accountType || 'Collection'}</Badge></div><div className="grid grid-cols-2 gap-3"><div><div className="text-xs font-semibold text-slate-500">Branch</div><div className="mt-1 font-bold">{selectedAccount.branchName || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">Currency</div><div className="mt-1 font-bold">{selectedAccount.currency || '-'}</div></div></div><div className="border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex items-center justify-between py-2"><span>Default Collection Account</span><Toggle checked={Boolean(selectedAccount.defaultCollectionAccount)} onChange={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/default`, 'Default account updated.')} /></div><div className="flex items-center justify-between py-2"><span>Auto Import Enabled</span><Toggle checked={Boolean(selectedAccount.autoImportEnabled)} onChange={(next) => { setAccountForm({ ...accountDefaults, ...selectedAccount, autoImportEnabled: next }); }} /></div></div><div><div className="text-xs font-semibold text-slate-500">Statement Format</div><div className="mt-1 font-bold">{selectedAccount.statementFormat || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">GL Account Mapping</div><div className="mt-1 font-bold">{selectedAccount.glAccountName || '-'} {selectedAccount.glAccountId ? `(${selectedAccount.glAccountId})` : ''}</div></div><div><div className="text-xs font-semibold text-slate-500">Reconciliation Frequency</div><div className="mt-1 font-bold">{selectedAccount.reconciliationFrequency || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">Last Sync Time</div><div className="mt-1 font-bold">{formatDate(selectedAccount.lastSyncedAt)}</div></div><div className="space-y-3 pt-3"><Button type="button" className="w-full" onClick={() => setAccountForm({ ...accountDefaults, ...selectedAccount })}><Edit3 size={16} />Edit Account</Button><Button type="button" variant="secondary" className="w-full" onClick={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/default`, 'Default account updated.')}><Star size={16} />Set as Default</Button><Button type="button" variant="danger" className="w-full" onClick={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/deactivate`, 'Account deactivated.')}><Trash2 size={16} />Deactivate</Button></div></div> : <div className="text-sm text-slate-500">Select an account to view details.</div>}</div></Card></div>; };

  const renderSettingsSection = () => {
    if (activeSection === 'Overpayment Savings') return renderOverpaymentSavings();
    if (activeSection === 'Bank Accounts') return renderBankAccounts();
    if (activeSection === 'Mapping Rules') return renderMappingRules();
    if (activeSection === 'General Settings') return renderGeneralSettings();
    const sectionMap = {
      'Branches': { icon: GitBranch, title: 'Branches', subtitle: 'Manage branch defaults used in reconciliation.', rows: [['Default Branch', 'Main Branch'], ['Branch Controls', 'Use bank account branch metadata'], ['Location Matching', 'Enabled']] },
      'Users & Roles': { icon: Users, title: 'Users & Roles', subtitle: 'Control reconciliation permissions and operational roles.', rows: [['Maker Role', 'Accountant'], ['Checker Role', 'Branch Manager'], ['Admin Role', 'Finance Admin']] },
      'Workflows': { icon: GitBranch, title: 'Workflows', subtitle: 'Review, approval, suspense, and retry workflow settings.', rows: [['Manual Match Approval', settings.requireApprovalForManualMatch ? 'Required' : 'Not required'], ['Approval Limit', `TZS ${settings.manualMatchApprovalLimit}`], ['Multi Level Approval', settings.multiLevelApprovalEnabled ? 'Enabled' : 'Disabled'], ['Auto Post After Approval', settings.autoPostAfterApprovalEnabled ? 'Enabled' : 'Disabled']] },
      'Notifications': { icon: Bell, title: 'Notifications', subtitle: 'Email and system alert preferences.', rows: [['Daily Summary', settings.dailySummaryEmailEnabled ? 'Enabled' : 'Disabled'], ['Exception Alerts', settings.exceptionAlertsEnabled ? 'Enabled' : 'Disabled'], ['Batch Completion', settings.batchCompletionAlertsEnabled ? 'Enabled' : 'Disabled'], ['Failed Postings', settings.failedPostingAlertsEnabled ? 'Enabled' : 'Disabled']] },
      'File & Import Settings': { icon: Upload, title: 'File & Import Settings', subtitle: 'Statement parsing, validation, duplicate, and auto-match controls.', rows: [['Accepted Formats', settings.acceptedFileFormats], ['Header Row', settings.requireStatementHeaderRow ? 'Required' : 'Optional'], ['Duplicates on Import', settings.checkDuplicatesOnImport ? 'Enabled' : 'Disabled'], ['Auto Match After Import', settings.autoMatchAfterImport ? 'Enabled' : 'Disabled']] },
      'Retentions & Archival': { icon: Archive, title: 'Retentions & Archival', subtitle: 'Data retention and archival policy.', rows: [['Reconciliation Data', `${settings.retentionYears} years`], ['Audit Logs', `${settings.auditRetentionYears} years`], ['Archive Inactive Batches', `${settings.archiveInactiveBatchesAfterDays} days`], ['Auto Purge', settings.autoPurgeEnabled ? 'Enabled' : 'Disabled']] },
      'Audit Settings': { icon: FileSpreadsheet, title: 'Audit Settings', subtitle: 'Audit log coverage for imports, matching, posting, and settings changes.', rows: [['Import Events', 'Tracked'], ['Manual Match Events', 'Tracked'], ['Posting Attempts', 'Tracked'], ['Settings Changes', 'Tracked']] },
      'Integrations': { icon: Plug, title: 'Integrations', subtitle: 'External systems used by reconciliation.', rows: [['Core Banking', 'Fineract'], ['Bank Statement Source', 'CRDB Statement Upload'], ['Payment Type', `${settings.mappedPaymentType} (${settings.defaultPaymentTypeId})`], ['External ID Check', settings.checkPlainReferenceExternalId ? 'Plain ref enabled' : 'Strict only']] },
      'System Preferences': { icon: SlidersHorizontal, title: 'System Preferences', subtitle: 'Regional, display, and user experience defaults.', rows: [['Currency', settings.defaultCurrency], ['Number Format', settings.numberFormat], ['Time Zone', settings.timeZone], ['Theme', settings.theme]] },
    };
    const section = sectionMap[activeSection] || sectionMap.Workflows;
    const Icon = section.icon;
    return <div className="space-y-4"><div><h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">{section.title}</h3><p className="text-sm text-slate-500">{section.subtitle}</p></div><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><InsightPanel title={`${section.title} Controls`} actions={<Button type="button" size="sm" onClick={() => saveSettings(`${section.title} saved.`)}><Save size={16} />Save</Button>}><div className="grid gap-3 md:grid-cols-2">{section.rows.map(([label, value]) => <MiniMetric key={label} label={label} value={value || '-'} tone="blue" />)}</div></InsightPanel><InsightPanel title="Implementation Status"><WorkflowSteps steps={[{ label: 'Configured', detail: 'Values are read from reconciliation settings.' }, { label: 'Editable', detail: 'Primary values can be changed from the relevant cards.' }, { label: 'Audited', detail: 'Settings saves are sent to the backend.' }, { label: 'Enforced', detail: 'Backend services consume persisted settings.' }]} /></InsightPanel></div></div>;
  };
  return <div className="space-y-5"><ReconciliationHeader title="Settings" subtitle={`Reconciliation > Settings > ${activeSection}`} /><div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]"><Card className="p-0"><div className="border-b border-slate-100 px-5 py-4 text-base font-bold text-slate-950 dark:border-slate-800 dark:text-slate-50">Settings</div><div className="space-y-1 p-2">{settingsNav.map((item) => { const Icon = item.icon; const active = activeSection === item.label; return <button type="button" key={item.label} onClick={() => setActiveSection(item.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${active ? 'bg-blue-50 text-[var(--tenant-primary)] dark:bg-blue-950/30' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}><Icon size={21} className="shrink-0" /><span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.description}</span></span></button>; })}</div></Card>{renderSettingsSection()}</div></div>;
};
export const ReconAuditTrail = () => {
  const { rows, loading, reload } = useReconList('/gateway/reconciliation/audit');
  return (
    <div className="space-y-5">
      <ReconciliationHeader
        title="Audit Trail"
        subtitle="Review reconciliation posting and workflow activity."
        actions={<Button variant="secondary" onClick={reload}><RefreshCcw size={17} />Refresh</Button>}
      />
      <TableShell title={loading ? 'Loading Audit Trail...' : 'Audit Trail'}>
        <ReconTable rows={rows} columns={[
          { key: 'occurredAt', header: 'Occurred At' },
          { key: 'entityType', header: 'Entity Type' },
          { key: 'entityId', header: 'Entity ID' },
          { key: 'batchId', header: 'Batch' },
          { key: 'action', header: 'Action', render: (row) => <Badge tone={statusTone(row.action)}>{row.action || '-'}</Badge> },
          { key: 'actorId', header: 'Actor' },
          { key: 'details', header: 'Details', render: (row) => row.details?.errorMessage || row.details?.externalId || '-' },
        ]} />
      </TableShell>
    </div>
  );
};



