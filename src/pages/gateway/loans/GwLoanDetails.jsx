import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Loader2 } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';
import Can from '../../../components/Can';
import ScheduleTable from '../../../components/ScheduleTable';
import {
  approveGwLoan,
  deleteGwLoan,
  disburseGwLoan,
  getGwLoan,
  replaceGwLoan,
} from '../../../api/gateway/loans';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

const pretty = (v) => JSON.stringify(v, null, 2);
const dateISO = () => new Date().toISOString().slice(0, 10);

const copyToClipboard = async (text) => {
  const t = String(text || '');
  if (!t) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch (_) {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return 'green';
  if (v === 'DISBURSED') return 'blue';
  if (v === 'SUBMITTED') return 'yellow';
  if (v === 'CLOSED') return 'gray';
  if (v === 'CREATED_IN_FINERACT') return 'yellow';
  if (v === 'UPSTREAM_FAILED') return 'red';
  return 'blue';
};

const toNumOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatMoney = (v) => {
  const n = toNumOrNull(v);
  if (n == null) return '-';
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
};

const isPenaltyCharge = (c) => {
  if (!c || typeof c !== 'object') return false;
  if (c?.isPenalty === true) return true;
  const tt = String(c?.chargeTimeType?.value || c?.chargeTimeType || '').toLowerCase();
  if (tt.includes('penalt')) return true;
  const name = String(c?.name || c?.chargeName || '').toLowerCase();
  return name.includes('penalt');
};

const Field = ({ label, value, mono }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`mt-1 text-sm ${mono ? 'font-mono break-all' : ''} text-slate-900 dark:text-slate-50`}>{value || '-'}</div>
  </div>
);

const ChargesTable = ({ items }) => {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">None</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/70 dark:bg-slate-900/40">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Name</th>
            <th className="px-3 py-2 text-left font-semibold">Amount</th>
            <th className="px-3 py-2 text-left font-semibold">Paid</th>
            <th className="px-3 py-2 text-left font-semibold">Outstanding</th>
            <th className="px-3 py-2 text-left font-semibold">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, idx) => {
            const due =
              c?.dueDate && Array.isArray(c.dueDate) && c.dueDate.length >= 3
                ? `${c.dueDate[0]}-${String(c.dueDate[1]).padStart(2, '0')}-${String(c.dueDate[2]).padStart(2, '0')}`
                : c?.dueDate || '';
            return (
              <tr key={String(c?.id || c?.chargeId || idx)} className="border-t border-slate-200/60 dark:border-slate-700/60">
                <td className="px-3 py-2">{String(c?.name || c?.chargeName || '')}</td>
                <td className="px-3 py-2">{formatMoney(c?.amount)}</td>
                <td className="px-3 py-2">{formatMoney(c?.amountPaid)}</td>
                <td className="px-3 py-2">{formatMoney(c?.amountOutstanding)}</td>
                <td className="px-3 py-2">{due ? String(due) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const GwLoanDetails = () => {
  const { platformLoanId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [doc, setDoc] = useState(null);
  const [editor, setEditor] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [fxLoading, setFxLoading] = useState(false);
  const [fxErr, setFxErr] = useState('');
  const [fxLoan, setFxLoan] = useState(null);

  // workflow modals
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedTenureMonths, setApprovedTenureMonths] = useState('');
  const [approvedOnDate, setApprovedOnDate] = useState(dateISO());

  const [disburseOpen, setDisburseOpen] = useState(false);
  const [disburseBusy, setDisburseBusy] = useState(false);
  const [actualDisbursementDate, setActualDisbursementDate] = useState(dateISO());

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getGwLoan(platformLoanId);
      setDoc(data);
      setEditor(pretty(data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformLoanId]);

  useEffect(() => {
    let cancelled = false;
    const fineractLoanId = doc?.fineractLoanId ? String(doc.fineractLoanId) : '';
    if (!fineractLoanId) {
      setFxLoan(null);
      setFxErr('');
      setFxLoading(false);
      return () => {};
    }

    (async () => {
      setFxLoading(true);
      setFxErr('');
      try {
        const r = await api.get(`/loans/${encodeURIComponent(fineractLoanId)}`, {
          params: { associations: 'repaymentSchedule,charges' },
        });
        if (cancelled) return;
        setFxLoan(r?.data || null);
      } catch (e) {
        if (cancelled) return;
        setFxLoan(null);
        setFxErr(e?.response?.data?.message || e?.message || 'Failed to load Fineract loan details');
      } finally {
        if (!cancelled) setFxLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc?.fineractLoanId]);

  const dirty = useMemo(() => {
    try {
      return pretty(doc) !== editor;
    } catch {
      return true;
    }
  }, [doc, editor]);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const body = JSON.parse(editor);
      const updated = await replaceGwLoan(platformLoanId, body);
      setDoc(updated);
      setEditor(pretty(updated));
      addToast('Loan saved', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete platform loan ${platformLoanId}? This cannot be undone.`)) return;
    setSaving(true);
    setErr('');
    try {
      await deleteGwLoan(platformLoanId);
      addToast('Loan deleted', 'success');
      navigate('/gateway/loans', { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Delete failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label, value) => {
    const ok = await copyToClipboard(value);
    if (ok) addToast(`${label} copied`, 'success');
    else addToast(`Failed to copy ${label}`, 'error');
  };

  const fxStatusText = useMemo(() => {
    if (!fxLoan) return '';
    const s = fxLoan?.status;
    if (s && typeof s === 'object') {
      return String(s?.value || s?.code || '');
    }
    return String(s || '');
  }, [fxLoan]);

  const statusUpper = String(doc?.status || '').trim().toUpperCase();
  const fxStatusUpper = String(fxStatusText || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  const fxPendingApproval =
    fxStatusUpper === 'SUBMITTED AND PENDING APPROVAL' ||
    fxStatusUpper.includes('PENDING APPROVAL') ||
    fxStatusUpper.startsWith('SUBMITTED');

  const fxApproved = fxStatusUpper === 'APPROVED' || fxStatusUpper.includes('APPROVED');
  const fxNotDisbursedOrClosed =
    !fxStatusUpper.includes('ACTIVE') &&
    !fxStatusUpper.includes('DISBURSED') &&
    !fxStatusUpper.includes('CLOSED') &&
    !fxStatusUpper.includes('WRITTEN OFF') &&
    !fxStatusUpper.includes('WRITEOFF');

  const canApprove =
    statusUpper === 'SUBMITTED' ||
    ((statusUpper !== 'APPROVED' && statusUpper !== 'DISBURSED' && statusUpper !== 'CLOSED') && fxPendingApproval);

  const hasFineractLoanId = !!String(doc?.fineractLoanId || '').trim();
  const canDisburse =
    hasFineractLoanId &&
    statusUpper !== 'DISBURSED' &&
    statusUpper !== 'CLOSED' &&
    (statusUpper === 'APPROVED' || (fxApproved && fxNotDisbursedOrClosed));

  const fxCharges = useMemo(() => (Array.isArray(fxLoan?.charges) ? fxLoan.charges : []), [fxLoan]);
  const fxPenalties = useMemo(() => fxCharges.filter(isPenaltyCharge), [fxCharges]);
  const fxNonPenaltyCharges = useMemo(() => fxCharges.filter((c) => !isPenaltyCharge(c)), [fxCharges]);

  const submitApprove = async () => {
    setApproveBusy(true);
    try {
      const payload = {
        approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
        approvedTenureMonths: approvedTenureMonths ? Number(approvedTenureMonths) : undefined,
        approvedOnDate: approvedOnDate || undefined,
      };
      const updated = await approveGwLoan(platformLoanId, payload);
      setDoc(updated);
      setEditor(pretty(updated));
      addToast('Loan approved', 'success');
      setApproveOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Approve failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setApproveBusy(false);
    }
  };

  const submitDisburse = async () => {
    setDisburseBusy(true);
    try {
      const payload = { actualDisbursementDate: actualDisbursementDate || undefined };
      await disburseGwLoan(platformLoanId, payload);
      addToast('Disbursement triggered', 'success');
      setDisburseOpen(false);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Disburse failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setDisburseBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gw Loan</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-mono">{platformLoanId}</span>
              {doc?.status ? <Badge tone={statusTone(doc.status)}>{doc.status}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/gateway/loans')}>
              Back
            </Button>
            <Can any={['GW_OPS_WRITE']}>
              <Button
                variant="secondary"
                onClick={() => setShowAdvanced((s) => !s)}
                title="Toggle Advanced JSON Editor"
              >
                {showAdvanced ? 'Hide JSON' : 'Advanced JSON'}
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="danger"
                onClick={doDelete}
                disabled={saving}
              >
                Delete
              </Button>
            </Can>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
          {err}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <Skeleton height="1.2rem" width="60%" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="1rem" width="100%" />
            ))}
          </div>
        </Card>
      ) : !doc ? (
        <Card>
          <div className="text-sm text-slate-600 dark:text-slate-300">Loan not found</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Summary</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => copy('Platform loan id', doc?.platformLoanId)}
                  disabled={!doc?.platformLoanId}
                  aria-label="Copy platform loan id"
                  title="Copy platform loan id"
                >
                  <Copy size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => copy('Fineract loan id', doc?.fineractLoanId)}
                  disabled={!doc?.fineractLoanId}
                  aria-label="Copy fineract loan id"
                  title="Copy fineract loan id"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Platform Loan ID" value={doc?.platformLoanId} mono />
              <Field label="Fineract Loan ID" value={doc?.fineractLoanId} mono />
              <Field label="Customer ID" value={doc?.customerId} />
              <Field label="Fineract Client ID" value={doc?.fineractClientId} />
              <Field label="Product Code" value={doc?.productCode} />
              <Field label="Fineract Product ID" value={doc?.fineractProductId != null ? String(doc.fineractProductId) : ''} />
              <Field label="Principal" value={doc?.principal != null ? String(doc.principal) : ''} />
              <Field label="Tenure (months)" value={doc?.tenureMonths != null ? String(doc.tenureMonths) : ''} />
              <Field label="Outstanding" value={doc?.outstandingAmount != null ? String(doc.outstandingAmount) : ''} />
              <Field label="Total Repaid" value={doc?.totalRepaid != null ? String(doc.totalRepaid) : ''} />
              <Field label="Applied At" value={doc?.appliedAt} mono />
              <Field label="Approved At" value={doc?.approvedAt} mono />
              <Field label="Disbursed At" value={doc?.disbursedAt} mono />
              <Field label="Closed At" value={doc?.closedAt} mono />
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Workflow</div>
              <Can any={['GW_OPS_WRITE']}>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setApproveOpen(true)}
                    disabled={!canApprove}
                    title={canApprove ? 'Approve loan' : 'Loan is not SUBMITTED'}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDisburseOpen(true)}
                    disabled={!canDisburse}
                    title={
                      canDisburse
                        ? 'Disburse loan'
                        : !hasFineractLoanId
                          ? 'Missing Fineract loan id'
                          : 'Loan must be APPROVED in Platform or Fineract'
                    }
                  >
                    Disburse
                  </Button>
                </div>
              </Can>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status" value={doc?.status} />
              <Field label="Fineract Status" value={fxStatusText || (fxLoading ? 'Loading...' : '')} />
              <Field label="Expected Disbursement" value={doc?.expectedDisbursementDate} mono />
              <Field label="Disbursement Type" value={doc?.disbursementType} />
              <Field label="Provider" value={doc?.disbursementProvider} />
              <Field label="Destination" value={doc?.disbursementAccount} mono />
            </div>
          </Card>

          <Can any={['GW_OPS_WRITE']}>
            {showAdvanced ? (
              <Card className="lg:col-span-2 p-0 overflow-hidden">
                <div className="border-b border-slate-200/70 px-4 py-3 text-sm font-semibold dark:border-slate-700/60">
                  Advanced JSON Editor (PUT replace)
                </div>
                <textarea
                  className="h-[60vh] w-full resize-none bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  spellCheck={false}
                />
              </Card>
            ) : null}
          </Can>

          <Card className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Repayment Schedule</div>
              {fxLoading ? (
                <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="animate-spin" size={14} /> Loading
                </div>
              ) : null}
            </div>

            {!doc?.fineractLoanId ? (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No Fineract loan id, schedule unavailable.</div>
            ) : fxErr ? (
              <div className="mt-3 text-sm text-rose-700 dark:text-rose-300">{fxErr}</div>
            ) : fxLoan?.repaymentSchedule ? (
              <div className="mt-3">
                <ScheduleTable schedule={fxLoan.repaymentSchedule} />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No schedule available.</div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold">Charges and Penalties</div>
            {!doc?.fineractLoanId ? (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No Fineract loan id, charges unavailable.</div>
            ) : fxErr ? (
              <div className="mt-3 text-sm text-rose-700 dark:text-rose-300">{fxErr}</div>
            ) : (
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Charges</div>
                  <ChargesTable items={fxNonPenaltyCharges} />
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Penalties</div>
                  <ChargesTable items={fxPenalties} />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={approveOpen}
        onClose={() => (approveBusy ? null : setApproveOpen(false))}
        title="Approve Loan"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)} disabled={approveBusy}>
              Cancel
            </Button>
            <Button onClick={submitApprove} disabled={approveBusy}>
              {approveBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Approving…
                </span>
              ) : (
                'Approve'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Approved On</label>
            <input
              type="date"
              value={approvedOnDate}
              onChange={(e) => setApprovedOnDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Approved Amount (optional)</label>
            <input
              inputMode="decimal"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
              placeholder={doc?.principal != null ? String(doc.principal) : ''}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Approved Tenure (months, optional)</label>
            <input
              inputMode="numeric"
              value={approvedTenureMonths}
              onChange={(e) => setApprovedTenureMonths(e.target.value)}
              placeholder={doc?.tenureMonths != null ? String(doc.tenureMonths) : ''}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            If amount/tenure are blank, Gateway defaults to submitted values.
          </div>
        </div>
      </Modal>

      <Modal
        open={disburseOpen}
        onClose={() => (disburseBusy ? null : setDisburseOpen(false))}
        title="Disburse Loan"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisburseOpen(false)} disabled={disburseBusy}>
              Cancel
            </Button>
            <Button onClick={submitDisburse} disabled={disburseBusy}>
              {disburseBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Disbursing…
                </span>
              ) : (
                'Disburse'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actual Disbursement Date</label>
            <input
              type="date"
              value={actualDisbursementDate}
              onChange={(e) => setActualDisbursementDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            This triggers a disbursement order and executes it.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GwLoanDetails;
