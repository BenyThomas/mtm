import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Bell,
  Building2,
  Check,
  CheckCircle2,
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

const ReconTable = ({ rows, columns, emptyMessage }) => (
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
        <tr key={row.id || row.batchNumber || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await gatewayApi.get(path, { params });
      const data = unwrap(response);
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [path, JSON.stringify(params)]);

  return { rows, loading, error, reload: load };
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

const transactionColumns = (actions) => [
  { key: 'postingDate', header: 'Posting Date' },
  { key: 'bankReference', header: 'Bank Ref' },
  { key: 'creditAmount', header: 'Amount', render: (row) => `TZS ${money(row.creditAmount)}` },
  { key: 'senderName', header: 'Sender' },
  { key: 'customerTypedIdentifier', header: 'Identifier' },
  { key: 'matchedClientName', header: 'Matched Client', render: (row) => row.matchedClientName || row.matchedClientId || '-' },
  { key: 'matchScore', header: 'Score', render: (row) => row.matchScore != null ? `${row.matchScore}%` : '-' },
  { key: 'matchStatus', header: 'Match', render: (row) => <Badge tone={statusTone(row.matchStatus)}>{row.matchStatus || '-'}</Badge> },
  { key: 'postingStatus', header: 'Posting', render: (row) => <Badge tone={statusTone(row.postingStatus)}>{row.postingStatus || '-'}</Badge> },
  { key: 'actions', header: 'Actions', render: actions },
];

export const ReconciliationDashboard = () => {
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await gatewayApi.get('/gateway/reconciliation/dashboard');
      setDashboard(unwrap(response) || {});
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bank Credits" value={`TZS ${money(dashboard.totalCreditAmount)}`} icon={FileSpreadsheet} tone="blue" />
        <MetricCard label="Auto Matched" value={dashboard.autoMatched || 0} icon={CheckCircle2} tone="green" />
        <MetricCard label="Pending Review" value={dashboard.pendingReview || 0} icon={ClipboardCheck} tone="yellow" />
        <MetricCard label="Failed" value={dashboard.failed || 0} icon={AlertTriangle} tone="red" />
      </div>
      <TableShell title={loading ? 'Latest Statement Batches Loading...' : 'Latest Statement Batches'}>
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
    data.append('importCreditOnly', true);
    data.append('checkDuplicates', true);
    data.append('runAutoMatching', false);
    data.append('autoPostHighConfidence', false);
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
          <input ref={fileInputRef} name="file" type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); }} className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-5 text-sm dark:border-slate-700" />
          {file ? <p className="text-xs text-slate-500 dark:text-slate-400">Selected: {file.name} ({money(file.size)} bytes)</p> : null}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Rows Found" value={preview.totalRowsFound || 0} icon={ListChecks} />
          <MetricCard label="Credits" value={preview.creditTransactions || 0} icon={CheckCircle2} tone="green" />
          <MetricCard label="Duplicates" value={preview.possibleDuplicates || 0} icon={AlertTriangle} tone="red" />
          <MetricCard label="Credit Amount" value={`TZS ${money(preview.totalCreditAmount)}`} icon={FileSpreadsheet} tone="blue" />
        </div>
      ) : null}
    </div>
  );
};

export const ReconBatches = () => {
  const { rows, loading, reload } = useReconList('/gateway/reconciliation/batches');
  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Statement Batches" subtitle="Manage imported bank statement batches." actions={<Button variant="secondary" onClick={reload}><RefreshCcw size={17} />Refresh</Button>} />
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

  const action = async (path, message) => {
    try {
      await gatewayApi.post(path);
      addToast(message, 'success');
      await load();
    } catch (error) {
      addToast(error?.response?.data?.message || message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader
        title="Batch Details"
        subtitle={batch?.batchNumber}
        actions={<>
          <Button variant="secondary" onClick={() => action(`/gateway/reconciliation/batches/${batchId}/auto-match`, 'Auto match complete')}><RefreshCcw size={17} />Auto Match</Button>
          <Button onClick={() => action(`/gateway/reconciliation/batches/${batchId}/auto-post`, 'Auto post complete')}><CheckCircle2 size={17} />Post Approved</Button>
        </>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total Rows" value={batch?.totalRows || 0} icon={ListChecks} />
        <MetricCard label="Posted" value={batch?.postedCount || 0} icon={CheckCircle2} tone="green" />
        <MetricCard label="Review" value={batch?.reviewCount || 0} icon={ClipboardCheck} tone="yellow" />
        <MetricCard label="Failed" value={batch?.failedCount || 0} icon={AlertTriangle} tone="red" />
      </div>
      <TableShell title="Batch Transactions">
        <ReconTable rows={transactions} columns={transactionColumns((row) => <Link className="text-[var(--tenant-primary)]" to={`/gateway/reconciliation/transactions?transactionId=${row.id}`}>View</Link>)} />
      </TableShell>
    </div>
  );
};

export const ReconTransactions = ({ mode = 'transactions' }) => {
  const config = useMemo(() => {
    const map = {
      transactions: { title: 'Transaction Workbench', path: '/gateway/reconciliation/transactions', params: {} },
      review: { title: 'Review Queue', path: '/gateway/reconciliation/review', params: {} },
      unmatched: { title: 'Unmatched Payments', path: '/gateway/reconciliation/unmatched', params: {} },
      suspense: { title: 'Suspense', path: '/gateway/reconciliation/suspense', params: {} },
      posted: { title: 'Posted Payments', path: '/gateway/reconciliation/posted', params: {} },
      failed: { title: 'Failed Postings', path: '/gateway/reconciliation/failed', params: {} },
    };
    return map[mode] || map.transactions;
  }, [mode]);
  const { rows, loading, reload } = useReconList(config.path, config.params);
  const { addToast } = useToast();

  const runAction = async (row, action) => {
    try {
      const path = mode === 'failed' && action === 'retry'
        ? `/gateway/reconciliation/failed/${row.id}/retry`
        : `/gateway/reconciliation/transactions/${row.id}/${action}`;
      await gatewayApi.post(path);
      addToast('Action completed.', 'success');
      await reload();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Action failed', 'error');
    }
  };

  const manualMatch = async (row) => {
    const clientId = window.prompt('Fineract client ID');
    if (!clientId) return;
    const loanId = window.prompt('Fineract loan/account ID');
    if (!loanId) return;
    try {
      const path = mode === 'unmatched'
        ? `/gateway/reconciliation/unmatched/${row.id}/match-client`
        : `/gateway/reconciliation/transactions/${row.id}/match`;
      if (mode === 'unmatched') {
        await gatewayApi.post(path, {
          clientId,
          loanId,
          loanAccountNo: loanId,
          score: 100,
          reason: 'Manual match',
        });
      } else {
        await gatewayApi.post(path);
      }
      addToast('Manual match saved.', 'success');
      await reload();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Manual match failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader title={config.title} subtitle="Search, review, match, and post reconciliation transactions." actions={<Button variant="secondary" onClick={reload}><Filter size={17} />Refresh</Button>} />
      <TableShell title={loading ? 'Loading Transactions...' : config.title}>
        <ReconTable rows={rows} columns={transactionColumns((row) => (
          <div className="flex gap-2">
            {mode !== 'posted' && mode !== 'failed' ? <button className="font-semibold text-[var(--tenant-primary)]" onClick={() => manualMatch(row)}>Match</button> : null}
            {row.matchStatus === 'REVIEW_REQUIRED' ? <button className="font-semibold text-[var(--tenant-primary)]" onClick={() => runAction(row, 'approve')}>Approve</button> : null}
            {(row.postingStatus === 'APPROVED_FOR_POSTING' || row.matchStatus === 'APPROVED_FOR_POSTING') ? <button className="font-semibold text-green-700" onClick={() => runAction(row, 'post')}>Post</button> : null}
            {mode === 'failed' ? <button className="font-semibold text-red-700" onClick={() => runAction(row, 'retry')}>Retry</button> : null}
          </div>
        ))} />
      </TableShell>
    </div>
  );
};

export const ReconMappings = () => {
  const { rows, loading, reload } = useReconList('/gateway/reconciliation/mappings');
  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Manual Mappings" subtitle="Maintain reusable transaction-to-client matching rules." actions={<Button variant="secondary" onClick={reload}><RefreshCcw size={17} />Refresh</Button>} />
      <TableShell title={loading ? 'Loading Mappings...' : 'Manual Mappings'}>
        <ReconTable rows={rows} columns={[
          { key: 'mappingType', header: 'Type' },
          { key: 'identifier', header: 'Identifier' },
          { key: 'targetClientName', header: 'Client' },
          { key: 'targetLoanAccountNo', header: 'Loan' },
          { key: 'confidence', header: 'Confidence', render: (row) => `${row.confidence || 0}%` },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
        ]} />
      </TableShell>
    </div>
  );
};

export const ReconReports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    gatewayApi.get('/gateway/reconciliation/reports')
      .then((response) => {
        const data = unwrap(response);
        setReports(Array.isArray(data?.reports) ? data.reports : []);
      })
      .catch(() => setReports([]));
  }, []);

  const fallbackReports = ['Daily Reconciliation Summary', 'Unmatched Transactions Detail', 'Failed Postings Analysis', 'Suspense Account Summary'];
  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Reports" subtitle="Generate reconciliation summaries and exception reports." />
      <Card>
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => gatewayApi.post('/gateway/reconciliation/reports/generate')}
          >
            <FileSpreadsheet size={17} />Generate Summary
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(reports.length ? reports : fallbackReports).map((report) => (
            <div key={report} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <FileSpreadsheet className="mb-3 text-[var(--tenant-primary)]" size={22} />
              <div className="font-semibold">{report}</div>
            </div>
          ))}
        </div>
      </Card>
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
    acceptedFileFormats: 'XLS, XLSX, CSV', requireStatementHeaderRow: true, checkDuplicatesOnImport: true, autoMatchAfterImport: true, defaultPaymentTypeId: 1, mappedPaymentType: 'Loan Repayment', suspenseAccountName: 'Suspense Account', suspenseAccountCode: '10100', duplicateClearingAccountName: 'Duplicate Clearing', duplicateClearingAccountCode: '110300', failedPostingAccountName: 'Failed Posting', failedPostingAccountCode: '110400',
  };
  const accountDefaults = { accountName: '', accountNumber: '', bankName: '', accountType: 'Collection', currency: 'TZS', branchName: '', glAccountName: '', glAccountId: '', defaultCollectionAccount: false, autoImportEnabled: true, statementFormat: 'MT940', reconciliationFrequency: 'Daily', active: true };
  const [activeSection, setActiveSection] = useState('Bank Accounts');
  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountForm, setAccountForm] = useState(null);
  const [filters, setFilters] = useState({ search: '', bank: '', accountType: '', branch: '', currency: '', status: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const loadSettings = async () => {
    const [settingsResponse, accountsResponse] = await Promise.all([gatewayApi.get('/gateway/reconciliation/settings'), gatewayApi.get('/gateway/reconciliation/bank-accounts')]);
    const loadedAccounts = unwrap(accountsResponse) || [];
    setSettings({ ...defaults, ...(unwrap(settingsResponse) || {}) });
    setAccounts(loadedAccounts);
    setSelectedAccountId((current) => current || loadedAccounts.find((account) => account.defaultCollectionAccount)?.id || loadedAccounts[0]?.id || '');
  };

  useEffect(() => { void loadSettings().catch((error) => addToast(error?.response?.data?.message || 'Failed to load settings', 'error')); }, []);

  const update = (key, value) => setSettings((current) => ({ ...(current || defaults), [key]: value }));
  const updateAccount = (key, value) => setAccountForm((current) => ({ ...(current || accountDefaults), [key]: value }));
  const text = (key) => (event) => update(key, event.target.value);
  const numeric = (key) => (event) => update(key, Number(event.target.value));
  const accountText = (key) => (event) => updateAccount(key, event.target.value);

  const saveSettings = async (message = 'Settings saved.') => {
    if (!settings) return;
    setSaving(true);
    try { const response = await gatewayApi.put('/gateway/reconciliation/settings', settings); setSettings({ ...defaults, ...(unwrap(response) || {}) }); addToast(message, 'success'); }
    catch (error) { addToast(error?.response?.data?.message || 'Failed to save settings', 'error'); }
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
  const unique = (field) => [...new Set(accounts.map((account) => account[field]).filter(Boolean))];
  const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
  const inputClass = 'mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[var(--tenant-primary)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  const exportAccounts = () => { const rows = [['Account Name','Account Number','Bank','Account Type','Currency','Branch','GL Account','Default','Status','Last Synced'], ...filteredAccounts.map((account) => [account.accountName, account.accountNumber, account.bankName, account.accountType, account.currency, account.branchName, account.glAccountName, account.defaultCollectionAccount ? 'Yes' : 'No', account.active ? 'Active' : 'Inactive', account.lastSyncedAt || ''])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = 'reconciliation-bank-accounts.csv'; link.click(); URL.revokeObjectURL(url); };

  const Toggle = ({ checked, onChange }) => <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-4' : 'left-0.5'}`} /></button>;
  const Field = ({ label, children }) => <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300"><span>{label}</span>{children}</label>;
  const SettingRow = ({ label, field, type = 'toggle', value }) => { const current = settings?.[field] ?? defaults[field]; return <div className="flex min-h-[34px] items-center justify-between gap-4 text-sm"><div className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-200"><Check size={13} className="text-green-600" /><span className="truncate">{label}</span></div>{type === 'toggle' ? <Toggle checked={Boolean(current)} onChange={(next) => update(field, next)} /> : null}{type === 'number' ? <input type="number" value={current} onChange={numeric(field)} className="h-8 w-24 rounded-md border border-slate-200 px-2 text-right text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /> : null}{type === 'text' ? <input value={current} onChange={text(field)} className="h-8 w-36 rounded-md border border-slate-200 px-2 text-right text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /> : null}{type === 'static' ? <span className="shrink-0 text-xs font-bold text-slate-800 dark:text-slate-100">{value}</span> : null}</div>; };
  const SettingsCard = ({ icon: Icon, tone, title, subtitle, children, action, onAction }) => <Card className="flex min-h-[190px] flex-col p-0"><div className="flex items-start gap-3 px-4 pt-4"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${tone}`}><Icon size={20} /></div><div className="min-w-0"><h3 className="text-base font-bold text-slate-950 dark:text-slate-50">{title}</h3><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p></div></div><div className="mt-4 flex-1 space-y-2 px-4 pb-4">{children}</div><button type="button" onClick={onAction} className="flex h-11 items-center justify-between border-t border-slate-100 px-4 text-sm font-semibold text-[var(--tenant-primary)] dark:border-slate-800"><span>{action}</span><ChevronRight size={16} /></button></Card>;
  const settingsNav = [{ label: 'General Settings', description: 'System preferences and defaults', icon: Settings }, { label: 'Bank Accounts', description: 'Manage bank & GL accounts', icon: Building2 }, { label: 'Branches', description: 'Manage branches and locations', icon: GitBranch }, { label: 'Users & Roles', description: 'Manage users, roles and permissions', icon: Users }, { label: 'Mapping Rules', description: 'Auto match rules and priorities', icon: SlidersHorizontal }, { label: 'Workflows', description: 'Review and approval workflows', icon: GitBranch }, { label: 'Notifications', description: 'Email and system notifications', icon: Bell }, { label: 'File & Import Settings', description: 'File formats and import preferences', icon: Upload }, { label: 'Retentions & Archival', description: 'Data retention and archival policies', icon: Archive }, { label: 'Audit Settings', description: 'Audit log and tracking preferences', icon: FileSpreadsheet }, { label: 'Integrations', description: 'Third-party integrations and APIs', icon: Plug }, { label: 'System Preferences', description: 'Regional, language and appearance', icon: SlidersHorizontal }];

  if (!settings) return <Card><div className="text-sm text-slate-500">Loading settings...</div></Card>;

  const renderGeneralSettings = () => <div className="space-y-4"><Card className="p-0"><div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div><h3 className="text-base font-bold text-slate-950 dark:text-slate-50">General Settings</h3><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="System Name"><input className={inputClass} value={settings.systemName || ''} onChange={text('systemName')} /></Field><Field label="Fiscal Year Start Month"><select className={inputClass} value={settings.fiscalYearStartMonth} onChange={text('fiscalYearStartMonth')}>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Default Date Range"><select className={inputClass} value={settings.defaultDateRange} onChange={text('defaultDateRange')}>{['Today','This Week','This Month','Last Month','This Quarter','This Year'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Time Zone"><select className={inputClass} value={settings.timeZone} onChange={text('timeZone')}>{['(UTC+03:00) East Africa Time','(UTC+00:00) UTC','(UTC+02:00) Central Africa Time','(UTC+03:00) Nairobi'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Default Currency"><select className={inputClass} value={settings.defaultCurrency} onChange={text('defaultCurrency')}><option value="TZS">TZS - Tanzanian Shilling</option><option value="USD">USD - US Dollar</option><option value="KES">KES - Kenyan Shilling</option><option value="UGX">UGX - Ugandan Shilling</option></select></Field><Field label="Number Format"><select className={inputClass} value={settings.numberFormat} onChange={text('numberFormat')}>{['1,234,567.89','1.234.567,89','1 234 567.89','1234567.89'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Items Per Page"><select className={inputClass} value={settings.defaultItemsPerPage} onChange={(event) => update('defaultItemsPerPage', Number(event.target.value))}>{[10,20,50,100].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><div><div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Theme</div><div className="mt-2 grid h-10 grid-cols-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">{[{ label: 'Light', icon: Sun }, { label: 'Dark', icon: Moon }, { label: 'System', icon: Monitor }].map((option) => { const Icon = option.icon; const active = settings.theme === option.label; return <button type="button" key={option.label} onClick={() => update('theme', option.label)} className={`flex items-center justify-center gap-2 text-sm font-semibold ${active ? 'bg-blue-50 text-[var(--tenant-primary)] ring-1 ring-inset ring-[var(--tenant-primary)] dark:bg-blue-950/30' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}><Icon size={15} />{option.label}</button>; })}</div></div></div></div><div className="border-l border-slate-100 pl-5 dark:border-slate-800"><div className="rounded-lg bg-blue-50 p-4 text-sm text-slate-700 dark:bg-blue-950/30 dark:text-slate-200"><div className="mb-3 flex items-center gap-2 font-bold text-slate-950 dark:text-slate-50"><ShieldCheck size={17} className="text-[var(--tenant-primary)]" />About General Settings</div>Manage system wide preferences and default values used across the reconciliation platform.</div><div className="mt-7 space-y-3"><Button type="button" className="w-full" disabled={saving} onClick={() => saveSettings()}><Save size={17} />Save Changes</Button><Button type="button" variant="secondary" className="w-full" disabled={saving} onClick={resetDefaults}><RotateCcw size={17} />Reset to Defaults</Button></div></div></div></Card><div className="grid gap-4 xl:grid-cols-3"><SettingsCard icon={CheckCircle2} tone="border-green-200 bg-green-50 text-green-700" title="Auto Matching" subtitle="Configure auto matching behavior." action="Configure Rules" onAction={() => setActiveSection('Mapping Rules')}><SettingRow label="Enable Auto Match" field="autoMatchEnabled" /><SettingRow label="Auto Match After Import" field="autoMatchAfterImport" /><SettingRow label="Auto Post Enabled" field="autoPostEnabled" /><SettingRow label="Auto Post Threshold" field="autoPostThreshold" type="number" /><SettingRow label="Review Threshold" field="reviewThreshold" type="number" /><SettingRow label="Allow Partial Matches" field="allowPartialMatches" /></SettingsCard><SettingsCard icon={ClipboardCheck} tone="border-purple-200 bg-purple-50 text-purple-700" title="Duplicate Management" subtitle="Configure duplicate detection." action="Configure Settings" onAction={() => saveSettings('Duplicate settings saved.')}><SettingRow label="Duplicate Check" field="duplicateCheckEnabled" /><SettingRow label="Check Duplicates on Import" field="checkDuplicatesOnImport" /><SettingRow label="Duplicate Window (Days)" field="duplicateWindowDays" type="number" /><SettingRow label="Match on Amount & Date" field="matchDuplicateOnAmountAndDate" /><SettingRow label="Allow Duplicate Override" field="allowDuplicateOverride" /></SettingsCard><SettingsCard icon={AlertTriangle} tone="border-orange-200 bg-orange-50 text-orange-700" title="Tolerance Settings" subtitle="Configure matching tolerances." action="Configure Tolerances" onAction={() => saveSettings('Tolerance settings saved.')}><SettingRow label="Amount Tolerance" field="amountTolerance" type="text" /><SettingRow label="Percentage Tolerance" field="percentageTolerance" type="text" /><SettingRow label="Date Tolerance (Days)" field="dateToleranceDays" type="number" /><SettingRow label="Description Variance" field="descriptionVariance" type="text" /></SettingsCard><SettingsCard icon={ShieldCheck} tone="border-teal-200 bg-teal-50 text-teal-700" title="Approval Settings" subtitle="Configure approvals and limits." action="Configure Workflows" onAction={() => saveSettings('Approval settings saved.')}><SettingRow label="Require Approval for Manual Match" field="requireApprovalForManualMatch" /><SettingRow label="Approval Limit (TZS)" field="manualMatchApprovalLimit" type="text" /><SettingRow label="Multi Level Approval" field="multiLevelApprovalEnabled" /><SettingRow label="Auto Post After Approval" field="autoPostAfterApprovalEnabled" /></SettingsCard><SettingsCard icon={Mail} tone="border-amber-200 bg-amber-50 text-amber-700" title="Email Notifications" subtitle="Manage email notifications." action="Manage Templates" onAction={() => saveSettings('Notification settings saved.')}><SettingRow label="Daily Reconciliation Summary" field="dailySummaryEmailEnabled" /><SettingRow label="Exception Alerts" field="exceptionAlertsEnabled" /><SettingRow label="Batch Completion Alerts" field="batchCompletionAlertsEnabled" /><SettingRow label="Failed Posting Alerts" field="failedPostingAlertsEnabled" /></SettingsCard><SettingsCard icon={Database} tone="border-blue-200 bg-blue-50 text-blue-700" title="Data Retention" subtitle="Configure data retention policies." action="Configure Retention" onAction={() => saveSettings('Retention settings saved.')}><SettingRow label="Retain Reconciliation Data" field="retentionYears" type="number" /><SettingRow label="Retain Audit Logs" field="auditRetentionYears" type="number" /><SettingRow label="Archive Inactive Batches" field="archiveInactiveBatchesAfterDays" type="number" /><SettingRow label="Auto Purge Options" field="autoPurgeEnabled" /></SettingsCard></div></div>;
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

  const renderBankAccounts = () => { const activeCount = accounts.filter((account) => account.active).length; const inactiveCount = accounts.length - activeCount; const defaultAccount = accounts.find((account) => account.defaultCollectionAccount); return <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-4"><div><h3 className="text-xl font-bold text-slate-950 dark:text-slate-50">Bank Accounts</h3><p className="text-sm text-slate-500">Manage collection accounts, settlement accounts, and GL mappings.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Bank Accounts" value={accounts.length} icon={Building2} tone="blue" caption="All configured accounts" /><MetricCard label="Active Accounts" value={activeCount} icon={CheckCircle2} tone="green" caption="Currently active" /><MetricCard label="Default Collection Account" value={defaultAccount?.accountName || '-'} icon={Star} tone="blue" caption={defaultAccount?.accountNumber || 'Not configured'} /><MetricCard label="Inactive Accounts" value={inactiveCount} icon={AlertTriangle} tone="orange" caption="Not currently active" /></div><div className="flex flex-wrap gap-3"><Button type="button" onClick={() => setAccountForm({ ...accountDefaults })}><Plus size={17} />Add Bank Account</Button><Button type="button" variant="secondary" onClick={exportAccounts}><Download size={17} />Export</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => accountAction('/gateway/reconciliation/bank-accounts/sync', 'Accounts synced.')}><RefreshCcw size={17} />Sync Accounts</Button></div><Card className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Field label="Search"><div className="relative"><input className={`${inputClass} pr-9`} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search account name or number..." /><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /></div></Field><Field label="Bank"><select className={inputClass} value={filters.bank} onChange={(event) => setFilters({ ...filters, bank: event.target.value })}><option value="">All Banks</option>{unique('bankName').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Account Type"><select className={inputClass} value={filters.accountType} onChange={(event) => setFilters({ ...filters, accountType: event.target.value })}><option value="">All Types</option>{unique('accountType').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Branch"><select className={inputClass} value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })}><option value="">All Branches</option>{unique('branchName').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Currency"><select className={inputClass} value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value })}><option value="">All Currencies</option>{unique('currency').map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status"><select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field></Card><Card className="p-0"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800/60"><tr>{['Account Name','Account Number','Bank','Account Type','Currency','Branch','GL Account','Default','Status','Last Synced','Actions'].map((head) => <th key={head} className="whitespace-nowrap px-3 py-3 text-left">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredAccounts.map((account) => <tr key={account.id} onClick={() => setSelectedAccountId(account.id)} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedAccount?.id === account.id ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}><td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{account.accountName}</td><td className="px-3 py-3">{account.accountNumber}</td><td className="px-3 py-3">{account.bankName}</td><td className="px-3 py-3"><Badge tone="blue">{account.accountType || 'Collection'}</Badge></td><td className="px-3 py-3">{account.currency}</td><td className="px-3 py-3">{account.branchName || '-'}</td><td className="px-3 py-3">{account.glAccountName || '-'}</td><td className="px-3 py-3"><Badge tone={account.defaultCollectionAccount ? 'blue' : 'gray'}>{account.defaultCollectionAccount ? 'Yes' : 'No'}</Badge></td><td className="px-3 py-3"><Badge tone={account.active ? 'green' : 'red'}>{account.active ? 'Active' : 'Inactive'}</Badge></td><td className="px-3 py-3">{formatDate(account.lastSyncedAt)}</td><td className="px-3 py-3"><div className="flex gap-1"><button type="button" title="Edit" onClick={(event) => { event.stopPropagation(); setAccountForm({ ...accountDefaults, ...account }); }} className="rounded p-1 text-[var(--tenant-primary)] hover:bg-blue-50"><Edit3 size={15} /></button><button type="button" title="Sync" onClick={(event) => { event.stopPropagation(); accountAction(`/gateway/reconciliation/bank-accounts/${account.id}/sync`, 'Account synced.'); }} className="rounded p-1 text-slate-600 hover:bg-slate-100"><RefreshCcw size={15} /></button><MoreVertical size={15} className="mt-1 text-slate-400" /></div></td></tr>)}{filteredAccounts.length === 0 ? <EmptyRow colSpan={11} message="No bank accounts found." /> : null}</tbody></table></div><div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800">Showing 1 to {filteredAccounts.length} of {accounts.length} accounts</div></Card><div className="grid gap-4 xl:grid-cols-2"><SettingsCard icon={FileSpreadsheet} tone="border-green-200 bg-green-50 text-green-700" title="Statement Import Rules" subtitle="Configure how statements are imported and validated." action="Configure Import Rules" onAction={() => saveSettings('Import rules saved.')}><SettingRow label="Accepted File Formats" field="acceptedFileFormats" type="text" /><SettingRow label="Require Header Row" field="requireStatementHeaderRow" /><SettingRow label="Check for Duplicates on Import" field="checkDuplicatesOnImport" /><SettingRow label="Check Plain Ref External ID" field="checkPlainReferenceExternalId" /><SettingRow label="Auto-match Transactions After Import" field="autoMatchAfterImport" /></SettingsCard><SettingsCard icon={ClipboardCheck} tone="border-purple-200 bg-purple-50 text-purple-700" title="GL & Posting Mapping" subtitle="Define GL mappings for postings and reconciliation." action="Configure GL Mapping" onAction={() => saveSettings('GL mapping saved.')}><SettingRow label="Mapped Payment Type" field="mappedPaymentType" type="text" /><SettingRow label="Default Payment Type ID" field="defaultPaymentTypeId" type="number" /><SettingRow label="Suspense Account" type="static" value={`${settings.suspenseAccountName} (${settings.suspenseAccountCode})`} /><SettingRow label="Duplicate Clearing Account" type="static" value={`${settings.duplicateClearingAccountName} (${settings.duplicateClearingAccountCode})`} /><SettingRow label="Failed Posting Account" type="static" value={`${settings.failedPostingAccountName} (${settings.failedPostingAccountCode})`} /></SettingsCard></div></div><Card className="p-0"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="text-base font-bold text-slate-950 dark:text-slate-50">Bank Account Details</div><ChevronRight size={18} className="rotate-180 text-slate-500" /></div><div className="p-5">{accountForm ? renderAccountForm() : selectedAccount ? <div className="space-y-4 text-sm"><div><div className="text-xs font-semibold text-slate-500">Account Name</div><div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{selectedAccount.accountName}</div></div><div><div className="text-xs font-semibold text-slate-500">Account Number</div><div className="mt-1 font-bold">{selectedAccount.accountNumber}</div></div><div><div className="text-xs font-semibold text-slate-500">Bank Name</div><div className="mt-1 font-bold">{selectedAccount.bankName}</div></div><div><div className="text-xs font-semibold text-slate-500">Account Type</div><Badge tone="blue">{selectedAccount.accountType || 'Collection'}</Badge></div><div className="grid grid-cols-2 gap-3"><div><div className="text-xs font-semibold text-slate-500">Branch</div><div className="mt-1 font-bold">{selectedAccount.branchName || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">Currency</div><div className="mt-1 font-bold">{selectedAccount.currency || '-'}</div></div></div><div className="border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex items-center justify-between py-2"><span>Default Collection Account</span><Toggle checked={Boolean(selectedAccount.defaultCollectionAccount)} onChange={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/default`, 'Default account updated.')} /></div><div className="flex items-center justify-between py-2"><span>Auto Import Enabled</span><Toggle checked={Boolean(selectedAccount.autoImportEnabled)} onChange={(next) => { setAccountForm({ ...accountDefaults, ...selectedAccount, autoImportEnabled: next }); }} /></div></div><div><div className="text-xs font-semibold text-slate-500">Statement Format</div><div className="mt-1 font-bold">{selectedAccount.statementFormat || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">GL Account Mapping</div><div className="mt-1 font-bold">{selectedAccount.glAccountName || '-'} {selectedAccount.glAccountId ? `(${selectedAccount.glAccountId})` : ''}</div></div><div><div className="text-xs font-semibold text-slate-500">Reconciliation Frequency</div><div className="mt-1 font-bold">{selectedAccount.reconciliationFrequency || '-'}</div></div><div><div className="text-xs font-semibold text-slate-500">Last Sync Time</div><div className="mt-1 font-bold">{formatDate(selectedAccount.lastSyncedAt)}</div></div><div className="space-y-3 pt-3"><Button type="button" className="w-full" onClick={() => setAccountForm({ ...accountDefaults, ...selectedAccount })}><Edit3 size={16} />Edit Account</Button><Button type="button" variant="secondary" className="w-full" onClick={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/default`, 'Default account updated.')}><Star size={16} />Set as Default</Button><Button type="button" variant="danger" className="w-full" onClick={() => accountAction(`/gateway/reconciliation/bank-accounts/${selectedAccount.id}/deactivate`, 'Account deactivated.')}><Trash2 size={16} />Deactivate</Button></div></div> : <div className="text-sm text-slate-500">Select an account to view details.</div>}</div></Card></div>; };

  return <div className="space-y-5"><ReconciliationHeader title="Settings" subtitle={`Reconciliation > Settings > ${activeSection}`} /><div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]"><Card className="p-0"><div className="border-b border-slate-100 px-5 py-4 text-base font-bold text-slate-950 dark:border-slate-800 dark:text-slate-50">Settings</div><div className="space-y-1 p-2">{settingsNav.map((item) => { const Icon = item.icon; const active = activeSection === item.label; return <button type="button" key={item.label} onClick={() => setActiveSection(item.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${active ? 'bg-blue-50 text-[var(--tenant-primary)] dark:bg-blue-950/30' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}><Icon size={21} className="shrink-0" /><span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.description}</span></span></button>; })}</div></Card>{activeSection === 'Bank Accounts' ? renderBankAccounts() : activeSection === 'Mapping Rules' ? renderMappingRules() : renderGeneralSettings()}</div></div>;
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



