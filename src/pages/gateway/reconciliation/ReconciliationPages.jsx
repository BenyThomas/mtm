import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Filter,
  ListChecks,
  RefreshCcw,
  Search,
  Settings,
  UploadCloud,
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
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const formData = () => {
    const data = new FormData();
    data.append('file', file);
    data.append('bankAccountId', bankAccountId);
    data.append('statementDate', statementDate);
    data.append('importCreditOnly', 'true');
    data.append('checkDuplicates', 'true');
    data.append('runAutoMatching', 'true');
    data.append('autoPostHighConfidence', 'false');
    return data;
  };

  const submit = async (mode) => {
    if (!file || !bankAccountId || !statementDate) {
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
          <input value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Mongo bank account id" />
          <label className="block text-sm font-semibold">Statement Date</label>
          <input type="date" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <label className="block text-sm font-semibold">Statement File</label>
          <input type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-5 text-sm dark:border-slate-700" />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => submit('preview')}><Search size={17} />Preview</Button>
            <Button type="button" disabled={busy} onClick={() => submit('import')}><UploadCloud size={17} />Import</Button>
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
      await gatewayApi.post(`/gateway/reconciliation/transactions/${row.id}/${action}`);
      addToast('Action completed.', 'success');
      await reload();
    } catch (error) {
      addToast(error?.response?.data?.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader title={config.title} subtitle="Search, review, match, and post reconciliation transactions." actions={<Button variant="secondary" onClick={reload}><Filter size={17} />Refresh</Button>} />
      <TableShell title={loading ? 'Loading Transactions...' : config.title}>
        <ReconTable rows={rows} columns={transactionColumns((row) => (
          <div className="flex gap-2">
            {mode !== 'posted' ? <button className="font-semibold text-[var(--tenant-primary)]" onClick={() => runAction(row, 'match')}>Match</button> : null}
            {row.matchStatus === 'APPROVED_FOR_POSTING' ? <button className="font-semibold text-green-700" onClick={() => runAction(row, 'post')}>Post</button> : null}
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
  const [settings, setSettings] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    gatewayApi.get('/gateway/reconciliation/settings')
      .then((response) => setSettings(unwrap(response)))
      .catch(() => addToast('Failed to load settings', 'error'));
  }, []);

  const save = async () => {
    try {
      const response = await gatewayApi.put('/gateway/reconciliation/settings', settings);
      setSettings(unwrap(response));
      addToast('Settings saved.', 'success');
    } catch (error) {
      addToast(error?.response?.data?.message || 'Failed to save settings', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <ReconciliationHeader title="Settings" subtitle="Configure matching thresholds, duplicate checks, and retry behavior." actions={<Button onClick={save}><Settings size={17} />Save</Button>} />
      <Card className="grid gap-4 md:grid-cols-2">
        {settings ? <>
          <label className="text-sm font-semibold">Auto Post Threshold
            <input type="number" value={settings.autoPostThreshold || 95} onChange={(e) => setSettings({ ...settings, autoPostThreshold: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="text-sm font-semibold">Review Threshold
            <input type="number" value={settings.reviewThreshold || 70} onChange={(e) => setSettings({ ...settings, reviewThreshold: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="text-sm font-semibold">Duplicate Window Days
            <input type="number" value={settings.duplicateWindowDays || 7} onChange={(e) => setSettings({ ...settings, duplicateWindowDays: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="text-sm font-semibold">Max Posting Retry Attempts
            <input type="number" value={settings.maxPostingRetryAttempts || 5} onChange={(e) => setSettings({ ...settings, maxPostingRetryAttempts: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
        </> : <div className="text-sm text-slate-500">Loading settings...</div>}
      </Card>
    </div>
  );
};
