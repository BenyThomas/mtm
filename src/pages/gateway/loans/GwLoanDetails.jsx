import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle, Copy, Download, FileSpreadsheet, FileText, Loader2, ReceiptText, RotateCcw, Settings2, Trash2, Undo2, UserPlus, Wallet, XCircle } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';
import Can from '../../../components/Can';
import ScheduleTable from '../../../components/ScheduleTable';
import StaffSelect from '../../../components/StaffSelect';
import Tabs from '../../../components/Tabs';
import {
  adjustGwLoanTransaction,
  approveGwLoan,
  deleteGwLoan,
  disburseGwLoan,
  getGwLoan,
  getGwLoanTransaction,
  getGwLoanTransactions,
  downloadGwLoanSchedule,
  getGwLoanWorkflow,
  refreshGwSelcomRepaymentOrder,
  repayGwLoanMobile,
  reverseGwLoanTransaction,
  runGwLoanAction,
} from '../../../api/gateway/loans';
import { listBankNames } from '../../../api/gateway/bankNames';
import { getOpsResource } from '../../../api/gateway/opsResources';
import api from '../../../api/axios';
import gatewayApi from '../../../api/gatewayAxios';
import { useToast } from '../../../context/ToastContext';
import { getGwLoanStatusCode, getGwLoanStatusLabel, getGwLoanStatusTone } from '../../../utils/gwLoanStatus';

const dateISO = () => new Date().toISOString().slice(0, 10);
const DISBURSEMENT_TYPES = ['BANK', 'MOBILE_MONEY', 'CASH'];
const BANK_NAME_TYPE_BY_DISBURSEMENT = {
  BANK: 'BANK',
  MOBILE_MONEY: 'MNO',
};

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

const normalizeText = (v) => {
  const s = String(v ?? '').trim();
  return s ? s : '';
};

const normalizeProvider = (v) => normalizeText(v).toUpperCase();
const upper = (v) => normalizeText(v).toUpperCase();

const deriveTypeFromProvider = (provider) => {
  const p = normalizeProvider(provider);
  if (p === 'EPIKPAY') return 'CASH';
  if (p === 'AZAMPAY' || p === 'SELCOM') return 'MOBILE_MONEY';
  return '';
};

const extractCustomerProfile = (customerDoc) => {
  if (!customerDoc || typeof customerDoc !== 'object') return {};
  const profile = customerDoc?.profile && typeof customerDoc.profile === 'object' ? customerDoc.profile : {};
  return {
    bankName: normalizeText(profile?.bankName),
    bankAccount: normalizeText(profile?.bankAccount),
    walletMsisdn: normalizeText(profile?.walletMsisdn),
    phone: normalizeText(profile?.phone),
    email: normalizeText(profile?.email),
    fullName: normalizeText(`${profile?.firstName || ''} ${profile?.middleName || ''} ${profile?.lastName || ''}`),
  };
};

const extractGatewayErrorMessage = (e, fallback) => {
  const body = e?.response?.data || {};
  const upstreamPayload = body?.meta?.upstream?.payload || {};
  const upstreamErrors = Array.isArray(upstreamPayload?.errors) ? upstreamPayload.errors : [];
  if (upstreamErrors.length > 0) {
    const first = upstreamErrors[0] || {};
    const m = normalizeText(first?.defaultUserMessage) || normalizeText(first?.developerMessage);
    if (m) return m;
  }
  const directErrors = Array.isArray(body?.errors) ? body.errors : [];
  if (directErrors.length > 0) {
    const first = directErrors[0] || {};
    const m = normalizeText(first?.details);
    if (m) return m;
  }
  return body?.message || e?.message || fallback;
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


const txDateToISO = (value) => {
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return normalizeText(value);
};

const formatDisplayDate = (value, { withTime = false } = {}) => {
  if (!value) return '';
  let iso = '';
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else {
    iso = String(value).trim();
  }
  if (!iso) return '';
  try {
    const parsed = iso.includes('T') ? new Date(iso) : new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    const options = withTime
      ? { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: '2-digit' };
    return new Intl.DateTimeFormat(undefined, options).format(parsed);
  } catch {
    return iso;
  }
};

const txTypeLabel = (tx) => {
  const type = tx?.type;
  if (type && typeof type === 'object') {
    return String(type?.value || type?.code || '');
  }
  return String(type || tx?.transactionType || '');
};

const firstNumeric = (...values) => {
  for (const value of values) {
    const n = toNumOrNull(value);
    if (n != null) return n;
  }
  return null;
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
            const due = formatDisplayDate(c?.dueDate);
            return (
              <tr key={String(c?.id || c?.chargeId || idx)} className="border-t border-slate-200/60 dark:border-slate-700/60">
                <td className="px-3 py-2">{String(c?.name || c?.chargeName || '')}</td>
                <td className="px-3 py-2">{formatMoney(c?.amount)}</td>
                <td className="px-3 py-2">{formatMoney(c?.amountPaid)}</td>
                <td className="px-3 py-2">{formatMoney(c?.amountOutstanding)}</td>
                <td className="px-3 py-2">{due || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const FINERACT_ACTIONS = {
  reschedule: {
    title: 'Reschedule Loan',
    icon: CalendarDays,
    endpoint: 'loan',
    buildPayload: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', rescheduleFromDate: date, note: note || undefined }),
    needsDate: true,
    needsNote: true,
  },
  waiveInterest: {
    title: 'Waive Interest',
    icon: ReceiptText,
    endpoint: 'transactions',
    buildPayload: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, transactionAmount: amount ? Number(amount) : undefined, note: note || undefined }),
    needsDate: true,
    needsAmount: true,
    needsNote: true,
  },
  writeoff: {
    title: 'Write Off',
    icon: XCircle,
    endpoint: 'loan',
    buildPayload: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, note: note || undefined }),
    needsDate: true,
    needsNote: true,
  },
  undowriteoff: {
    title: 'Undo Write Off',
    icon: RotateCcw,
    endpoint: 'transactions',
    buildPayload: () => ({}),
  },
  undoWaiveInterest: {
    title: 'Undo Interest Waiver',
    icon: Undo2,
    endpoint: 'transactions',
    buildPayload: () => ({}),
  },
  prepayLoan: {
    title: 'Prepay / Foreclose',
    icon: Wallet,
    endpoint: 'transactions',
    buildPayload: ({ date, amount, note, paymentTypeId, externalId }) => ({
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
      transactionDate: date,
      transactionAmount: amount ? Number(amount) : undefined,
      paymentTypeId: paymentTypeId ? Number(paymentTypeId) : undefined,
      externalId: externalId || undefined,
      note: note || undefined,
    }),
    needsDate: true,
    needsAmount: true,
    needsNote: true,
    needsPaymentType: true,
    needsExternalId: true,
  },
  'close-rescheduled': {
    title: 'Close As Rescheduled',
    icon: CheckCircle,
    endpoint: 'loan',
    buildPayload: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, note: note || undefined }),
    needsDate: true,
    needsNote: true,
  },
  close: {
    title: 'Close Loan',
    icon: FileText,
    endpoint: 'loan',
    buildPayload: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', closedOnDate: date, note: note || undefined }),
    needsDate: true,
    needsNote: true,
  },
  waiveLoanCharge: {
    title: 'Waive Loan Charge',
    icon: ReceiptText,
    endpoint: 'charges',
    buildPayload: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, amount: amount ? Number(amount) : undefined, note: note || undefined }),
    needsDate: true,
    needsAmount: true,
    needsNote: true,
    needsChargeId: true,
  },
  payLoanCharge: {
    title: 'Pay Loan Charge',
    icon: Download,
    endpoint: 'charges',
    buildPayload: ({ date, amount, note, paymentTypeId, externalId }) => ({
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
      transactionDate: date,
      amount: amount ? Number(amount) : undefined,
      paymentTypeId: paymentTypeId ? Number(paymentTypeId) : undefined,
      externalId: externalId || undefined,
      note: note || undefined,
    }),
    needsDate: true,
    needsAmount: true,
    needsNote: true,
    needsPaymentType: true,
    needsExternalId: true,
    needsChargeId: true,
  },
  waivePenalty: {
    title: 'Waive Penalty',
    icon: Trash2,
    endpoint: 'charges',
    buildPayload: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, amount: amount ? Number(amount) : undefined, note: note || undefined }),
    needsDate: true,
    needsAmount: true,
    needsNote: true,
    needsChargeId: true,
  },
  custom: {
    title: 'Custom Command',
    icon: Settings2,
    endpoint: 'loan',
    buildPayload: () => ({}),
    needsCustomCommand: true,
    needsPayload: true,
  },
};

const actionButtonClass = (tone = 'slate') => {
  if (tone === 'emerald') return 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35';
  if (tone === 'amber') return 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/35';
  if (tone === 'rose') return 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/35';
  if (tone === 'cyan') return 'border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/35';
  if (tone === 'violet') return 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/35';
  return 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800';
};

const GwLoanDetails = () => {
  const { platformLoanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [doc, setDoc] = useState(null);

  const [fxLoading, setFxLoading] = useState(false);
  const [fxErr, setFxErr] = useState('');
  const [fxLoan, setFxLoan] = useState(null);
  const [scheduleExporting, setScheduleExporting] = useState('');

  // workflow modals
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedTenureMonths, setApprovedTenureMonths] = useState('');
  const [approvedOnDate, setApprovedOnDate] = useState(dateISO());
  const [simpleActionOpen, setSimpleActionOpen] = useState('');
  const [simpleActionBusy, setSimpleActionBusy] = useState(false);
  const [simpleActionDate, setSimpleActionDate] = useState(dateISO());
  const [simpleActionNote, setSimpleActionNote] = useState('');

  const [disburseOpen, setDisburseOpen] = useState(false);
  const [disburseBusy, setDisburseBusy] = useState(false);
  const [actualDisbursementDate, setActualDisbursementDate] = useState(dateISO());
  const [disbursementType, setDisbursementType] = useState('');
  const [disbursementProvider, setDisbursementProvider] = useState('');
  const [disbursementBankName, setDisbursementBankName] = useState('');
  const [disbursementAccount, setDisbursementAccount] = useState('');
  const [bankNameOptions, setBankNameOptions] = useState([]);
  const [loanAutomationCfg, setLoanAutomationCfg] = useState(null);
  const [customerProfile, setCustomerProfile] = useState({});
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayBusy, setRepayBusy] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentCurrency, setRepaymentCurrency] = useState('TZS');
  const [repaymentProvider, setRepaymentProvider] = useState('');
  const [repaymentMsisdn, setRepaymentMsisdn] = useState('');
  const [repaymentPayerName, setRepaymentPayerName] = useState('');
  const [repaymentPayerEmail, setRepaymentPayerEmail] = useState('');
  const [repaymentResult, setRepaymentResult] = useState(null);
  const [repaymentBanner, setRepaymentBanner] = useState(null);
  const [repaymentRefreshBusy, setRepaymentRefreshBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState(dateISO());
  const [refundExternalId, setRefundExternalId] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowErr, setWorkflowErr] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsErr, setTransactionsErr] = useState('');
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const [transactionDetailBusy, setTransactionDetailBusy] = useState(false);
  const [transactionDetail, setTransactionDetail] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [adjustTransactionOpen, setAdjustTransactionOpen] = useState(false);
  const [adjustTransactionBusy, setAdjustTransactionBusy] = useState(false);
  const [adjustTransactionDate, setAdjustTransactionDate] = useState(dateISO());
  const [adjustTransactionAmount, setAdjustTransactionAmount] = useState('');
  const [adjustTransactionNote, setAdjustTransactionNote] = useState('');
  const [reverseTransactionOpen, setReverseTransactionOpen] = useState(false);
  const [reverseTransactionBusy, setReverseTransactionBusy] = useState(false);
  const [reverseTransactionDate, setReverseTransactionDate] = useState(dateISO());
  const [reverseTransactionNote, setReverseTransactionNote] = useState('');
  const [assignOfficerOpen, setAssignOfficerOpen] = useState(false);
  const [assignOfficerBusy, setAssignOfficerBusy] = useState(false);
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(dateISO());
  const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);
  const [fineractActionOpen, setFineractActionOpen] = useState('');
  const [fineractActionBusy, setFineractActionBusy] = useState(false);
  const [fineractActionDate, setFineractActionDate] = useState(dateISO());
  const [fineractActionAmount, setFineractActionAmount] = useState('');
  const [fineractActionNote, setFineractActionNote] = useState('');
  const [fineractActionPaymentTypeId, setFineractActionPaymentTypeId] = useState('');
  const [fineractActionExternalId, setFineractActionExternalId] = useState('');
  const [fineractActionChargeId, setFineractActionChargeId] = useState('');
  const [fineractActionCustomCommand, setFineractActionCustomCommand] = useState('');
  const [fineractActionPayload, setFineractActionPayload] = useState('{}');
  const returnTo = location?.state?.returnTo;
  const returnTab = location?.state?.tab;
  const goBack = () => {
    if (returnTo) {
      navigate(returnTo, { state: { tab: returnTab || 'loans' } });
      return;
    }
    navigate('/gateway/loans');
  };

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getGwLoan(platformLoanId);
      setDoc(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowData = async () => {
    setWorkflowLoading(true);
    setWorkflowErr('');
    try {
      const data = await getGwLoanWorkflow(platformLoanId);
      setWorkflow(data || null);
    } catch (e) {
      setWorkflow(null);
      setWorkflowErr(e?.response?.data?.message || e?.message || 'Failed to load workflow');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const loadTransactionsData = async () => {
    if (!platformLoanId) {
      setTransactions([]);
      return;
    }
    setTransactionsLoading(true);
    setTransactionsErr('');
    try {
      const data = await getGwLoanTransactions(platformLoanId);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      setTransactions([]);
      setTransactionsErr(e?.response?.data?.message || e?.message || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadFineractLoanData = async (fineractLoanId) => {
    const resolvedLoanId = fineractLoanId ? String(fineractLoanId) : '';
    if (!resolvedLoanId) {
      setFxLoan(null);
      setFxErr('');
      setFxLoading(false);
      return;
    }
    setFxLoading(true);
    setFxErr('');
    try {
      const r = await api.get(`/loans/${encodeURIComponent(resolvedLoanId)}`, {
        params: { associations: 'repaymentSchedule,charges' },
      });
      setFxLoan(r?.data || null);
    } catch (e) {
      setFxLoan(null);
      setFxErr(e?.response?.data?.message || e?.message || 'Failed to load Fineract loan details');
    } finally {
      setFxLoading(false);
    }
  };

  const refreshLoanViews = async (nextDoc) => {
    const currentDoc = nextDoc || doc;
    const fineractLoanId = currentDoc?.fineractLoanId ? String(currentDoc.fineractLoanId) : '';
    await Promise.all([
      load(),
      loadWorkflowData(),
      loadFineractLoanData(fineractLoanId),
      loadTransactionsData(),
    ]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformLoanId]);

  useEffect(() => {
    loadWorkflowData();
  }, [platformLoanId]);

  useEffect(() => {
    loadTransactionsData();
  }, [platformLoanId]);

  useEffect(() => {
    const fineractLoanId = doc?.fineractLoanId ? String(doc.fineractLoanId) : '';
    loadFineractLoanData(fineractLoanId);
  }, [doc?.fineractLoanId]);

  useEffect(() => {
    let cancelled = false;
    const fineractLoanId = String(doc?.fineractLoanId || '').trim();
    if (!fineractLoanId) {
      setPaymentTypeOptions([]);
      return () => {};
    }
    (async () => {
      try {
        const t = await api.get(`/loans/${encodeURIComponent(fineractLoanId)}`, { params: { template: true } });
        if (cancelled) return;
        const ptypes =
          t?.data?.paymentTypeOptions ||
          t?.data?.paymentTypeOptionsForRepayment ||
          t?.data?.paymentTypeOptionsForDisbursement ||
          [];
        setPaymentTypeOptions(Array.isArray(ptypes)
          ? ptypes.map((o) => ({
            id: o.id ?? o.value ?? o.code,
            name: o.name ?? o.value ?? o.code ?? `Type ${o.id}`,
          }))
          : []);
      } catch (_) {
        if (!cancelled) setPaymentTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc?.fineractLoanId]);

  useEffect(() => {
    let cancelled = false;
    const customerId = normalizeText(doc?.customerId);
    if (!customerId) {
      setCustomerProfile({});
      return () => {};
    }
    (async () => {
      try {
        const customer = await getOpsResource('customers', customerId);
        if (cancelled) return;
        setCustomerProfile(extractCustomerProfile(customer));
      } catch (_) {
        if (cancelled) return;
        setCustomerProfile({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc?.customerId]);

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

  const exportSchedule = async (format) => {
    if (!platformLoanId) return;
    setScheduleExporting(format);
    try {
      const res = await downloadGwLoanSchedule(platformLoanId, format);
      const contentType = res?.headers?.['content-type'] || (format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf');
      const blob = new Blob([res.data], { type: contentType });
      const fallbackName = `${platformLoanId}-repayment-schedule.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      const disposition = String(res?.headers?.['content-disposition'] || '');
      const match = disposition.match(/filename="?([^"]+)"?/i);
      triggerDownload(blob, match?.[1] || fallbackName);
      addToast(`Schedule downloaded as ${format.toUpperCase()}`, 'success');
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Schedule download failed', 'error');
    } finally {
      setScheduleExporting('');
    }
  };

  const fxStatusText = useMemo(() => {
    if (!fxLoan) return '';
    const s = fxLoan?.status;
    if (s && typeof s === 'object') {
      return String(s?.value || s?.code || '');
    }
    return String(s || '');
  }, [fxLoan]);

  const statusUpper = getGwLoanStatusCode(doc);
  const statusDisplay = getGwLoanStatusLabel(doc);
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
    ((statusUpper !== 'APPROVED' && statusUpper !== 'ACTIVE' && statusUpper !== 'DISBURSED' && statusUpper !== 'CLOSED') && fxPendingApproval);

  const hasFineractLoanId = !!String(doc?.fineractLoanId || '').trim();
  const canDisburse =
    hasFineractLoanId &&
    statusUpper !== 'ACTIVE' &&
    statusUpper !== 'DISBURSED' &&
    statusUpper !== 'CLOSED' &&
    (statusUpper === 'APPROVED' || (fxApproved && fxNotDisbursedOrClosed));
  const outstandingAmount = toNumOrNull(doc?.outstandingAmount);
  const workflowActions = Array.isArray(workflow?.availableActions) ? workflow.availableActions : [];
  const hasWorkflowAction = (action) => workflowActions.includes(action);
  const canReject = hasFineractLoanId && (hasWorkflowAction('reject') || canApprove);
  const canUndoApproval = hasFineractLoanId && hasWorkflowAction('undoApproval');
  const canUndoDisbursement = hasFineractLoanId && hasWorkflowAction('undodisbursal');
  const fineractOverpaid = fxLoan?.status?.overpaid === true || /overpaid/i.test(String(fxStatusText || ''));
  const localOverpaid = statusUpper === 'OVERPAID';
  const overpaidAmount = firstNumeric(
    workflow?.refundAmount,
    fxLoan?.summary?.totalOverpaid,
    fxLoan?.summary?.overpaid,
    fxLoan?.summary?.totalOverpaidAmount,
    fxLoan?.summary?.overpaymentAmount,
    fxLoan?.summary?.overpaymentPortionDerived
  );
  const refundAction = workflow?.refundAction || '';
  const canRefund =
    hasFineractLoanId &&
    (Boolean(refundAction) || fineractOverpaid || localOverpaid) &&
    (!refundAction || workflowActions.includes(refundAction)) &&
    overpaidAmount != null &&
    overpaidAmount > 0;

  const customerDestinationByType = useMemo(() => ({
    BANK: normalizeText(customerProfile?.bankAccount),
    MOBILE_MONEY: normalizeText(customerProfile?.walletMsisdn),
  }), [customerProfile]);
  const customerRepaymentIdentity = useMemo(() => ({
    msisdn: normalizeText(customerProfile?.walletMsisdn) || normalizeText(customerProfile?.phone) || normalizeText(doc?.customerPhone),
    payerName: normalizeText(customerProfile?.fullName) || normalizeText(doc?.customerFullName),
    payerEmail: normalizeText(customerProfile?.email),
  }), [customerProfile, doc?.customerFullName, doc?.customerPhone]);
  const customerDisplayName = customerRepaymentIdentity.payerName || normalizeText(doc?.customerId);
  const currentLoanOfficerId = firstNumeric(fxLoan?.loanOfficerId, fxLoan?.loanOfficer?.id, doc?.loanOfficerId);
  const currentLoanOfficerName = normalizeText(
    fxLoan?.loanOfficerName
    || fxLoan?.loanOfficer?.displayName
    || fxLoan?.loanOfficer?.name
    || doc?.loanOfficerName
  );
  const hasAssignedLoanOfficer = currentLoanOfficerId != null || Boolean(currentLoanOfficerName);
  const canAssignLoanOfficer = hasFineractLoanId && !hasAssignedLoanOfficer && statusUpper !== 'CLOSED';
  const canOpenAdvancedFineractActions = hasFineractLoanId;
  const canRepayViaSelcom =
    hasFineractLoanId &&
    (statusUpper === 'ACTIVE' || statusUpper === 'DISBURSED' || fxStatusUpper.includes('ACTIVE')) &&
    (outstandingAmount == null || outstandingAmount > 0);
  const canDeleteLoan =
    !hasFineractLoanId &&
    statusUpper !== 'SUBMITTED' &&
    statusUpper !== 'APPROVED' &&
    statusUpper !== 'ACTIVE' &&
    statusUpper !== 'DISBURSED' &&
    statusUpper !== 'CLOSED';
  const primaryWorkflowActions = [
    {
      key: 'approve',
      icon: CheckCircle,
      tone: 'emerald',
      title: 'Approve loan',
      onClick: () => setApproveOpen(true),
      show: canApprove,
    },
    {
      key: 'disburse',
      icon: Wallet,
      tone: 'cyan',
      title: 'Disburse loan',
      onClick: openDisburseModal,
      show: canDisburse,
    },
    {
      key: 'repay',
      icon: ReceiptText,
      tone: 'emerald',
      title: 'Repay loan',
      onClick: openRepayModal,
      show: canRepayViaSelcom,
    },
    {
      key: 'refund',
      icon: RotateCcw,
      tone: 'amber',
      title: 'Refund overpaid amount',
      onClick: openRefundModal,
      show: canRefund,
    },
  ].filter((item) => item.show);
  const secondaryWorkflowActions = [
    {
      key: 'reject',
      icon: XCircle,
      tone: 'rose',
      title: 'Reject loan',
      onClick: () => openSimpleActionModal('reject'),
      show: canReject,
    },
    {
      key: 'undo-approval',
      icon: Undo2,
      tone: 'amber',
      title: 'Undo approval',
      onClick: () => openSimpleActionModal('undoApproval'),
      show: canUndoApproval,
    },
    {
      key: 'undo-disbursement',
      icon: RotateCcw,
      tone: 'amber',
      title: 'Undo disbursement',
      onClick: () => openSimpleActionModal('undodisbursal'),
      show: canUndoDisbursement,
    },
  ].filter((item) => item.show);
  const hasAnyWorkflowAction = primaryWorkflowActions.length > 0 || secondaryWorkflowActions.length > 0;
  const isClosedLike = statusUpper === 'CLOSED' || fxStatusUpper.includes('CLOSED');
  const isWrittenOffLike = fxStatusUpper.includes('WRITTEN OFF') || fxStatusUpper.includes('WRITEOFF');
  const isActiveLike = statusUpper === 'ACTIVE' || statusUpper === 'DISBURSED' || fxStatusUpper.includes('ACTIVE') || fxStatusUpper.includes('DISBURSED');
  const availableChargeIds = useMemo(() => {
    const chargeRows = Array.isArray(fxLoan?.charges) ? fxLoan.charges : [];
    return chargeRows
      .map((item) => ({
        value: String(item?.id ?? item?.chargeId ?? ''),
        label: `${item?.name || item?.chargeName || 'Charge'}${item?.id || item?.chargeId ? ` (#${item?.id ?? item?.chargeId})` : ''}`,
      }))
      .filter((item) => item.value);
  }, [fxLoan?.charges]);
  const fineractPresetActions = [
    { key: 'reschedule', show: hasFineractLoanId && isActiveLike && !isClosedLike && !isWrittenOffLike },
    { key: 'waiveInterest', show: hasFineractLoanId && isActiveLike && !isClosedLike && !isWrittenOffLike },
    { key: 'writeoff', show: hasFineractLoanId && isActiveLike && !isClosedLike && !isWrittenOffLike },
    { key: 'undowriteoff', show: hasFineractLoanId && isWrittenOffLike },
    { key: 'undoWaiveInterest', show: hasFineractLoanId && !isClosedLike },
    { key: 'prepayLoan', show: hasFineractLoanId && isActiveLike && !isClosedLike && !isWrittenOffLike },
    { key: 'close-rescheduled', show: hasFineractLoanId && !isClosedLike && !isWrittenOffLike },
    { key: 'close', show: hasFineractLoanId && !isClosedLike && !isWrittenOffLike },
    { key: 'waiveLoanCharge', show: hasFineractLoanId && availableChargeIds.length > 0 && !isClosedLike },
    { key: 'payLoanCharge', show: hasFineractLoanId && availableChargeIds.length > 0 && !isClosedLike },
    { key: 'waivePenalty', show: hasFineractLoanId && availableChargeIds.length > 0 && !isClosedLike },
    { key: 'custom', show: hasFineractLoanId },
  ].filter((item) => item.show).map((item) => {
    const toneMap = {
      reschedule: 'violet',
      waiveInterest: 'amber',
      writeoff: 'rose',
      undowriteoff: 'amber',
      undoWaiveInterest: 'amber',
      prepayLoan: 'emerald',
      'close-rescheduled': 'cyan',
      close: 'slate',
      waiveLoanCharge: 'amber',
      payLoanCharge: 'emerald',
      waivePenalty: 'rose',
      custom: 'slate',
    };
    return { ...item, ...FINERACT_ACTIONS[item.key], tone: toneMap[item.key] || 'slate' };
  });

  const submitAssignLoanOfficer = async () => {
    if (!doc?.fineractLoanId) {
      addToast('Fineract loan id is missing', 'error');
      return;
    }
    if (!assignedOfficerId) {
      addToast('Select a loan officer', 'error');
      return;
    }
    setAssignOfficerBusy(true);
    try {
      await api.post(`/loans/${encodeURIComponent(String(doc.fineractLoanId))}?command=assignLoanOfficer`, {
        toLoanOfficerId: Number(assignedOfficerId),
        assignmentDate,
        dateFormat: 'yyyy-MM-dd',
        locale: 'en',
        fromLoanOfficerId: '',
      });
      setAssignOfficerOpen(false);
      addToast('Loan officer assigned', 'success');
      await refreshLoanViews();
    } catch (e) {
      addToast(extractGatewayErrorMessage(e, 'Assign loan officer failed'), 'error');
    } finally {
      setAssignOfficerBusy(false);
    }
  };

  const openFineractActionModal = (actionKey) => {
    const meta = FINERACT_ACTIONS[actionKey];
    if (!meta) return;
    setFineractActionDate(dateISO());
    setFineractActionAmount('');
    setFineractActionNote('');
    setFineractActionPaymentTypeId('');
    setFineractActionExternalId('');
    setFineractActionChargeId(availableChargeIds[0]?.value || '');
    setFineractActionCustomCommand('');
    setFineractActionPayload('{}');
    setFineractActionOpen(actionKey);
  };

  const submitFineractAction = async () => {
    const meta = FINERACT_ACTIONS[fineractActionOpen];
    const fineractLoanId = String(doc?.fineractLoanId || '').trim();
    if (!meta || !fineractLoanId) return;
    if (meta.needsChargeId && !String(fineractActionChargeId || '').trim()) {
      addToast('Charge ID is required', 'error');
      return;
    }
    if (meta.needsCustomCommand && !String(fineractActionCustomCommand || '').trim()) {
      addToast('Command is required', 'error');
      return;
    }

    let payload;
    try {
      payload = meta.needsPayload
        ? JSON.parse(fineractActionPayload || '{}')
        : meta.buildPayload({
          date: fineractActionDate,
          amount: fineractActionAmount,
          note: fineractActionNote,
          paymentTypeId: fineractActionPaymentTypeId,
          externalId: fineractActionExternalId,
        });
    } catch (_) {
      addToast('Payload must be valid JSON', 'error');
      return;
    }

    setFineractActionBusy(true);
    try {
      const commandName = meta.needsCustomCommand ? fineractActionCustomCommand.trim() : fineractActionOpen;
      const path = meta.endpoint === 'transactions'
        ? `/loans/${encodeURIComponent(fineractLoanId)}/transactions?command=${encodeURIComponent(commandName)}`
        : meta.endpoint === 'charges'
          ? `/loans/${encodeURIComponent(fineractLoanId)}/charges/${encodeURIComponent(String(fineractActionChargeId).trim())}?command=${encodeURIComponent(commandName)}`
          : `/loans/${encodeURIComponent(fineractLoanId)}?command=${encodeURIComponent(commandName)}`;
      await api.post(path, payload);
      addToast(`${meta.title} submitted`, 'success');
      setFineractActionOpen('');
      await refreshLoanViews();
    } catch (e) {
      addToast(extractGatewayErrorMessage(e, `${meta.title} failed`), 'error');
    } finally {
      setFineractActionBusy(false);
    }
  };

  const filteredBankNameOptions = useMemo(() => {
    const requiredType = BANK_NAME_TYPE_BY_DISBURSEMENT[disbursementType];
    if (!requiredType) {
      return [];
    }
    const rows = Array.isArray(bankNameOptions) ? bankNameOptions : [];
    return rows
      .filter((item) => upper(item?.type || 'BANK') === requiredType)
      .map((item) => normalizeText(item?.name))
      .filter(Boolean);
  }, [bankNameOptions, disbursementType]);

  const destinationLabelByType = useMemo(() => ({
    BANK: 'Customer Bank Account',
    MOBILE_MONEY: 'Customer Wallet MSISDN',
    CASH: 'Destination Account',
  }), []);

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
      addToast('Loan approved', 'success');
      setApproveOpen(false);
      await refreshLoanViews(updated);
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
      const payload = {
        actualDisbursementDate: actualDisbursementDate || undefined,
        disbursementType: normalizeText(disbursementType) || undefined,
        disbursementProvider: normalizeProvider(disbursementProvider) || undefined,
        disbursementBankName: normalizeText(disbursementBankName) || undefined,
        disbursementAccount: normalizeText(disbursementAccount) || undefined,
      };
      if (payload.disbursementType && payload.disbursementType !== 'CASH' && !payload.disbursementBankName) {
        addToast('Please select bank name before disbursement', 'error');
        setDisburseBusy(false);
        return;
      }
      if (payload.disbursementType && payload.disbursementType !== 'CASH' && !payload.disbursementAccount) {
        addToast('Customer destination account is missing. Update customer profile first.', 'error');
        setDisburseBusy(false);
        return;
      }
      const result = await disburseGwLoan(platformLoanId, payload);
      const status = normalizeText(result?.status) || 'UNKNOWN';
      const reference = normalizeText(result?.aggregatorReferenceId);
      addToast(
        reference
          ? `Disbursement ${status}: ref ${reference}`
          : `Disbursement ${status}`,
        'success'
      );
      setDisburseOpen(false);
      await refreshLoanViews(doc);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Disburse failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setDisburseBusy(false);
    }
  };

  const simpleActionMeta = {
    reject: {
      title: 'Reject Loan',
      button: 'Reject',
      success: 'Loan rejected',
      fallbackError: 'Reject failed',
      dateLabel: 'Rejected On',
    },
    undoApproval: {
      title: 'Undo Approval',
      button: 'Undo Approval',
      success: 'Loan approval undone',
      fallbackError: 'Undo approval failed',
      dateLabel: 'Approval Date',
    },
    undodisbursal: {
      title: 'Undo Disbursement',
      button: 'Undo Disbursement',
      success: 'Loan disbursement undone',
      fallbackError: 'Undo disbursement failed',
      dateLabel: 'Transaction Date',
    },
  };

  const openSimpleActionModal = (action) => {
    setSimpleActionDate(dateISO());
    setSimpleActionNote('');
    setSimpleActionOpen(action);
  };

  const submitSimpleAction = async () => {
    const action = simpleActionOpen;
    const meta = simpleActionMeta[action];
    if (!action || !meta) return;
    setSimpleActionBusy(true);
    try {
      await runGwLoanAction(platformLoanId, action, {
        date: simpleActionDate || undefined,
        note: normalizeText(simpleActionNote) || undefined,
      });
      addToast(meta.success, 'success');
      setSimpleActionOpen('');
      await refreshLoanViews(doc);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, meta.fallbackError);
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSimpleActionBusy(false);
    }
  };

  async function openRepayModal() {
    let cfg = loanAutomationCfg;
    if (!cfg) {
      try {
        const r = await gatewayApi.get('/ops/config/loan-automation');
        cfg = unwrapGatewayBody(r) || null;
        setLoanAutomationCfg(cfg);
      } catch (_) {
        cfg = null;
      }
    }
    setRepaymentAmount(outstandingAmount != null && outstandingAmount > 0 ? String(outstandingAmount) : '');
    setRepaymentCurrency('TZS');
    setRepaymentProvider(resolveRepaymentProvider(cfg));
    setRepaymentMsisdn(customerRepaymentIdentity.msisdn || '');
    setRepaymentPayerName(customerRepaymentIdentity.payerName || '');
    setRepaymentPayerEmail(customerRepaymentIdentity.payerEmail || '');
    setRepaymentResult(null);
    setRepayOpen(true);
  }

  function openRefundModal() {
    setRefundAmount(overpaidAmount != null && overpaidAmount > 0 ? String(overpaidAmount) : '');
    setRefundDate(dateISO());
    setRefundExternalId('');
    setRefundNote('');
    setRefundOpen(true);
  }

  const submitRefund = async () => {
    const amount = overpaidAmount;
    if (amount == null || amount <= 0) {
      addToast('Fineract overpaid amount is missing', 'error');
      return;
    }
    setRefundBusy(true);
    try {
      await runGwLoanAction(platformLoanId, refundAction, {
        date: refundDate || undefined,
        amount,
        externalId: normalizeText(refundExternalId) || undefined,
        note: normalizeText(refundNote) || undefined,
      });
      addToast('Refund submitted', 'success');
      setRefundOpen(false);
      await load();
      const wf = await getGwLoanWorkflow(platformLoanId);
      setWorkflow(wf || null);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Refund failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setRefundBusy(false);
    }
  };

  const submitRepayMobile = async () => {
    const amount = toNumOrNull(repaymentAmount);
    if (amount == null || amount <= 0) {
      addToast('Repayment amount must be greater than zero', 'error');
      return;
    }
    if (!isEpikpayRepayment && !normalizeText(repaymentMsisdn)) {
      addToast('Customer wallet MSISDN is required', 'error');
      return;
    }

    setRepayBusy(true);
    const provider = repaymentProviderValue;
    try {
      const result = await repayGwLoanMobile(platformLoanId, {
        amount,
        provider: provider || undefined,
        channel: provider === 'EPIKPAY' ? 'CASH' : undefined,
        currency: normalizeText(repaymentCurrency) || 'TZS',
        msisdn: isEpikpayRepayment ? undefined : normalizeText(repaymentMsisdn),
        payerName: normalizeText(repaymentPayerName) || undefined,
        payerEmail: normalizeText(repaymentPayerEmail) || undefined,
      });
      setRepaymentResult(result || null);
      setRepaymentBanner({
        provider,
        result: result || null,
        title: provider === 'EPIKPAY' ? 'Cash repayment posted successfully' : `${provider || 'Mobile'} repayment request submitted`,
      });
      setRepayOpen(false);
      await refreshLoanViews(doc);
      addToast(provider === 'EPIKPAY' ? 'Cash repayment posted' : `${provider || 'Mobile'} push initiated`, 'success');
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, provider === 'EPIKPAY' ? 'Cash repayment failed' : 'Repayment push failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setRepayBusy(false);
    }
  };

  const refreshSelcomRepaymentBanner = async () => {
    const orderId = repaymentBanner?.result?.selcomOrder?.orderId;
    const paymentEventId = repaymentBanner?.result?.paymentEvent?.paymentEventId;
    if (!orderId) {
      addToast('No Selcom order found to refresh', 'error');
      return;
    }

    setRepaymentRefreshBusy(true);
    try {
      const refreshed = await refreshGwSelcomRepaymentOrder(orderId, paymentEventId);
      setRepaymentResult((current) => ({
        ...(current || repaymentBanner?.result || {}),
        ...refreshed,
      }));
      setRepaymentBanner((current) => current ? ({
        ...current,
        result: {
          ...(current.result || {}),
          ...refreshed,
        },
      }) : current);
      await refreshLoanViews(doc);
      addToast('Selcom order status refreshed', 'success');
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Failed to refresh Selcom order status');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setRepaymentRefreshBusy(false);
    }
  };

  const openTransactionDetail = async (tx) => {
    if (!tx?.id) return;
    setSelectedTransaction(tx);
    setTransactionDetail(null);
    setTransactionDetailOpen(true);
    setTransactionDetailBusy(true);
    try {
      const data = await getGwLoanTransaction(platformLoanId, tx.id);
      setTransactionDetail(data || null);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Failed to load transaction details');
      addToast(msg, 'error');
    } finally {
      setTransactionDetailBusy(false);
    }
  };

  const openAdjustTransaction = (tx) => {
    setSelectedTransaction(tx);
    setAdjustTransactionDate(txDateToISO(tx?.date) || dateISO());
    setAdjustTransactionAmount(String(tx?.amount ?? tx?.amountPaid ?? ''));
    setAdjustTransactionNote('');
    setAdjustTransactionOpen(true);
  };

  const openReverseTransaction = (tx) => {
    setSelectedTransaction(tx);
    setReverseTransactionDate(dateISO());
    setReverseTransactionNote('');
    setReverseTransactionOpen(true);
  };

  const submitAdjustedTransaction = async () => {
    if (!selectedTransaction?.id) {
      addToast('Transaction is required', 'error');
      return;
    }
    if (!adjustTransactionDate) {
      addToast('Transaction date is required', 'error');
      return;
    }
    if (!adjustTransactionAmount || Number(adjustTransactionAmount) <= 0) {
      addToast('Enter a valid transaction amount', 'error');
      return;
    }
    setAdjustTransactionBusy(true);
    try {
      await adjustGwLoanTransaction(platformLoanId, selectedTransaction.id, {
        transactionDate: adjustTransactionDate,
        transactionAmount: Number(adjustTransactionAmount),
        note: normalizeText(adjustTransactionNote) || undefined,
      });
      addToast('Transaction adjusted', 'success');
      setAdjustTransactionOpen(false);
      await refreshLoanViews(doc);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Adjust transaction failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setAdjustTransactionBusy(false);
    }
  };

  const submitReverseTransaction = async () => {
    if (!selectedTransaction?.id) {
      addToast('Transaction is required', 'error');
      return;
    }
    setReverseTransactionBusy(true);
    try {
      await reverseGwLoanTransaction(platformLoanId, selectedTransaction.id, {
        date: reverseTransactionDate || undefined,
        note: normalizeText(reverseTransactionNote) || undefined,
      });
      addToast('Transaction reversed', 'success');
      setReverseTransactionOpen(false);
      await refreshLoanViews(doc);
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Reverse transaction failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setReverseTransactionBusy(false);
    }
  };

  const resolveConfigProvider = (cfg) => {
    const preferred = normalizeProvider(cfg?.disbursementAggregatorProvider);
    if (preferred) return preferred;
    return normalizeProvider(cfg?.paymentAggregatorDefaultProvider);
  };

  const resolveRepaymentProvider = (cfg) => {
    const preferred = normalizeProvider(cfg?.paymentAggregatorDefaultProvider);
    if (preferred) return preferred;
    const enabled = Array.isArray(cfg?.paymentAggregatorEnabledProviders)
      ? cfg.paymentAggregatorEnabledProviders.map((x) => normalizeProvider(x)).filter(Boolean)
      : [];
    return enabled[0] || '';
  };

  const resolveProviderOptions = (cfg) => {
    const enabled = Array.isArray(cfg?.paymentAggregatorEnabledProviders)
      ? cfg.paymentAggregatorEnabledProviders.map((x) => normalizeProvider(x)).filter(Boolean)
      : [];
    const fallback = normalizeProvider(cfg?.paymentAggregatorDefaultProvider);
    const uniq = Array.from(new Set([...enabled, ...(fallback ? [fallback] : [])]));
    return uniq;
  };

  const repaymentProviderValue = normalizeProvider(repaymentProvider) || resolveRepaymentProvider(loanAutomationCfg);
  const isEpikpayRepayment = repaymentProviderValue === 'EPIKPAY';

  const unwrapGatewayBody = (response) => {
    const body = response?.data;
    return body && typeof body === 'object' && 'data' in body ? body.data : body;
  };

  async function openDisburseModal() {
    let cfg = loanAutomationCfg;
    let banks = bankNameOptions;
    if (!cfg) {
      try {
        const r = await gatewayApi.get('/ops/config/loan-automation');
        cfg = unwrapGatewayBody(r) || null;
        setLoanAutomationCfg(cfg);
      } catch (_) {
        cfg = null;
      }
    }
    if (!Array.isArray(banks) || banks.length === 0) {
      try {
        const data = await listBankNames({ active: true, limit: 500, offset: 0, orderBy: 'name', sortOrder: 'asc' });
        const rows = Array.isArray(data?.items) ? data.items : [];
        banks = rows
          .map((x) => ({
            name: normalizeText(x?.name),
            type: upper(x?.type || 'BANK'),
          }))
          .filter((x) => x.name);
        setBankNameOptions(banks);
      } catch (_) {
        banks = [];
      }
    }

    const configProvider = resolveConfigProvider(cfg);
    const providerValue = normalizeProvider(doc?.disbursementProvider) || configProvider;
    const bankNameValue = normalizeText(doc?.disbursementBankName);
    const bankTypeValue = BANK_NAME_TYPE_BY_DISBURSEMENT[upper(doc?.disbursementType) || deriveTypeFromProvider(providerValue)] || 'BANK';
    if (bankNameValue && !banks.some((item) => normalizeText(item?.name) === bankNameValue)) {
      banks = [...banks, { name: bankNameValue, type: bankTypeValue }];
      setBankNameOptions(banks);
    }
    let typeValue = upper(doc?.disbursementType);
    if (!typeValue) {
      typeValue = deriveTypeFromProvider(providerValue);
    }

    if (providerValue === 'EPIKPAY') {
      typeValue = 'CASH';
    }
    if (!typeValue || !DISBURSEMENT_TYPES.includes(typeValue)) {
      typeValue = 'MOBILE_MONEY';
    }

    const customerAccountValue = typeValue === 'CASH' ? '' : (customerDestinationByType[typeValue] || '');
    const customerBankName = normalizeText(customerProfile?.bankName);
    const allowedNames = banks
      .filter((item) => upper(item?.type || 'BANK') === (BANK_NAME_TYPE_BY_DISBURSEMENT[typeValue] || ''))
      .map((item) => normalizeText(item?.name))
      .filter(Boolean);
    const initialBankName = allowedNames.includes(customerBankName)
      ? customerBankName
      : (allowedNames.includes(bankNameValue) ? bankNameValue : '');
    setActualDisbursementDate(dateISO());
    setDisbursementType(typeValue);
    setDisbursementProvider(providerValue);
    setDisbursementBankName(typeValue === 'CASH' ? '' : initialBankName);
    setDisbursementAccount(customerAccountValue);
    setDisburseOpen(true);
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{customerDisplayName || 'Customer'}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>Phone:</span>
              <span className="font-mono">{customerRepaymentIdentity.msisdn || '-'}</span>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => copy('Customer phone', customerRepaymentIdentity.msisdn)}
                disabled={!customerRepaymentIdentity.msisdn}
                aria-label="Copy customer phone"
                title="Copy customer phone"
              >
                <Copy size={16} />
              </Button>
              {statusUpper ? <Badge tone={getGwLoanStatusTone(doc)}>{statusDisplay}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={goBack}>
              Back
            </Button>
            <Can any={['GW_OPS_WRITE']}>
              {doc ? primaryWorkflowActions.map((action) => (
                <Button
                  key={action.key}
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 rounded-xl p-0 shadow-sm ${actionButtonClass(action.tone)}`}
                  onClick={action.onClick}
                  title={action.title}
                  aria-label={action.title}
                >
                  <action.icon size={18} strokeWidth={2.2} />
                </Button>
              )) : null}
              {doc ? secondaryWorkflowActions.map((action) => (
                <Button
                  key={action.key}
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 rounded-xl p-0 shadow-sm ${actionButtonClass(action.tone)}`}
                  onClick={action.onClick}
                  title={action.title}
                  aria-label={action.title}
                >
                  <action.icon size={18} strokeWidth={2.2} />
                </Button>
              )) : null}
              {doc && canAssignLoanOfficer ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 rounded-xl p-0 shadow-sm ${actionButtonClass('violet')}`}
                  onClick={() => setAssignOfficerOpen(true)}
                  title="Assign loan officer"
                  aria-label="Assign loan officer"
                >
                  <UserPlus size={18} strokeWidth={2.2} />
                </Button>
              ) : null}
              {doc && canDeleteLoan ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 rounded-xl p-0 shadow-sm ${actionButtonClass('rose')}`}
                  onClick={doDelete}
                  disabled={saving}
                  title="Delete loan"
                  aria-label="Delete loan"
                >
                  <Trash2 size={18} strokeWidth={2.2} />
                </Button>
              ) : null}
              {doc && canOpenAdvancedFineractActions ? fineractPresetActions.map((action) => (
                <Button
                  key={action.key}
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 rounded-xl p-0 shadow-sm ${actionButtonClass(action.tone)}`}
                  onClick={() => openFineractActionModal(action.key)}
                  title={action.title}
                  aria-label={action.title}
                >
                  <action.icon size={18} strokeWidth={2.2} />
                </Button>
              )) : null}
            </Can>
          </div>
        </div>
      </section>

      {repaymentBanner ? (
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                {repaymentBanner.title}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Provider" value={repaymentBanner?.result?.provider || repaymentBanner?.provider} />
                <Field label="Payment Event ID" value={repaymentBanner?.result?.paymentEvent?.paymentEventId} mono />
                <Field label="Payment Status" value={repaymentBanner?.result?.paymentEvent?.status} />
                {repaymentBanner?.result?.selcomOrder ? (
                  <>
                    <Field label="Selcom Order ID" value={repaymentBanner?.result?.selcomOrder?.orderId} mono />
                    <Field label="Selcom Trans ID" value={repaymentBanner?.result?.selcomOrder?.transid} mono />
                    <Field label="Collection Status" value={repaymentBanner?.result?.selcomOrder?.paymentStatus} />
                    <Field label="Gateway Reference" value={repaymentBanner?.result?.selcomOrder?.gatewayReference} mono />
                  </>
                ) : (
                  <>
                    <Field label="Channel" value={repaymentBanner?.result?.paymentEvent?.channel} />
                    <Field label="External Payment ID" value={repaymentBanner?.result?.paymentEvent?.externalPaymentId} mono />
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {repaymentBanner?.result?.selcomOrder?.orderId ? (
                <Button variant="secondary" size="sm" onClick={refreshSelcomRepaymentBanner} disabled={repaymentRefreshBusy}>
                  {repaymentRefreshBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> Refreshing...
                    </span>
                  ) : (
                    'Refresh Status'
                  )}
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={() => setRepaymentBanner(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
        <div className="grid gap-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Workflow</div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Loan status and disbursement details from GW and Fineract.
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/30 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Current Status" value={doc?.status} />
              <Field label="Fineract Status" value={fxStatusText || (fxLoading ? 'Loading...' : '')} />
              <Field label="Loan Officer" value={currentLoanOfficerName} />
              <Field label="Expected Disbursement" value={formatDisplayDate(doc?.expectedDisbursementDate)} />
              <Field label="Overpaid Amount" value={overpaidAmount != null ? formatMoney(overpaidAmount) : ''} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Platform Loan ID" value={doc?.platformLoanId} mono />
              <Field label="Fineract Loan ID" value={doc?.fineractLoanId} mono />
              <Field label="Disbursement Type" value={doc?.disbursementType} />
              <Field label="Provider" value={doc?.disbursementProvider} />
              <Field label="Bank Name" value={doc?.disbursementBankName} />
              <Field label="Destination" value={doc?.disbursementAccount} mono />
              <Field label="Customer Wallet" value={customerRepaymentIdentity.msisdn} mono />
            </div>

            <div className="mt-3">
              <Can any={['GW_OPS_WRITE']}>
                {!hasAnyWorkflowAction && !workflowLoading ? (
                  <div className="text-xs text-slate-600 dark:text-slate-300">No workflow action available</div>
                ) : null}
              </Can>

              {workflowErr ? (
                <div className="mt-2 text-xs text-rose-700 dark:text-rose-300">{workflowErr}</div>
              ) : null}
              {workflowLoading ? (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">Refreshing workflow...</div>
              ) : null}
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Tabs
              tabs={[
                { key: 'summary', label: 'Summary' },
                { key: 'schedule', label: 'Schedule' },
                { key: 'charges', label: 'Charges' },
                { key: 'transactions', label: 'Transactions' },
              ]}
            >
              <div data-tab="summary">
                <Card>
                  <div className="mb-4 text-sm font-semibold">Loan Summary</div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Customer Name" value={customerDisplayName} />
                    <Field label="Loan Officer" value={currentLoanOfficerName} />
                    <Field label="Platform Loan ID" value={doc?.platformLoanId} mono />
                    <Field label="Fineract Loan ID" value={doc?.fineractLoanId} mono />
                    <Field label="Product" value={doc?.productCode} />
                    <Field label="Fineract Client ID" value={doc?.fineractClientId} />
                    <Field label="Fineract Product ID" value={doc?.fineractProductId != null ? String(doc.fineractProductId) : ''} />
                    <Field label="Principal" value={doc?.principal != null ? String(doc.principal) : ''} />
                    <Field label="Tenure (months)" value={doc?.tenureMonths != null ? String(doc.tenureMonths) : ''} />
                    <Field label="Outstanding" value={doc?.outstandingAmount != null ? String(doc.outstandingAmount) : ''} />
                    <Field label="Total Repaid" value={doc?.totalRepaid != null ? String(doc.totalRepaid) : ''} />
                    <Field label="Applied At" value={formatDisplayDate(doc?.appliedAt, { withTime: true })} />
                    <Field label="Approved At" value={formatDisplayDate(doc?.approvedAt, { withTime: true })} />
                    <Field label="Disbursed At" value={formatDisplayDate(doc?.disbursedAt, { withTime: true })} />
                    <Field label="Closed At" value={formatDisplayDate(doc?.closedAt, { withTime: true })} />
                  </div>
                </Card>
              </div>

              <div data-tab="schedule">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Repayment Schedule</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {doc?.fineractLoanId ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => exportSchedule('pdf')}
                            disabled={!!scheduleExporting}
                          >
                            {scheduleExporting === 'pdf' ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => exportSchedule('xlsx')}
                            disabled={!!scheduleExporting}
                          >
                            {scheduleExporting === 'xlsx' ? <Loader2 className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
                            Excel
                          </Button>
                        </>
                      ) : null}
                      {fxLoading ? (
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Loader2 className="animate-spin" size={14} /> Loading
                        </div>
                      ) : null}
                    </div>
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
              </div>

              <div data-tab="charges">
                <Card>
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

              <div data-tab="transactions">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Transactions</div>
                    {transactionsLoading ? (
                      <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="animate-spin" size={14} /> Loading
                      </div>
                    ) : null}
                  </div>
                  {!doc?.fineractLoanId ? (
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No Fineract loan id, transactions unavailable.</div>
                  ) : transactionsErr ? (
                    <div className="mt-3 text-sm text-rose-700 dark:text-rose-300">{transactionsErr}</div>
                  ) : !transactions.length ? (
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No transactions.</div>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">#</th>
                            <th className="px-3 py-2 text-left font-semibold">Date</th>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                            <th className="px-3 py-2 text-left font-semibold">Amount</th>
                            <th className="px-3 py-2 text-left font-semibold">Running Balance</th>
                            <th className="px-3 py-2 text-left font-semibold">External ID</th>
                            <th className="px-3 py-2 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr key={String(tx?.id || `${txTypeLabel(tx)}-${txDateToISO(tx?.date)}`)} className="border-t border-slate-200/60 dark:border-slate-700/60">
                              <td className="px-3 py-2">{tx?.id ?? '-'}</td>
                              <td className="px-3 py-2">{formatDisplayDate(tx?.date) || '-'}</td>
                              <td className="px-3 py-2">{txTypeLabel(tx) || '-'}</td>
                              <td className="px-3 py-2">{tx?.amount ?? tx?.amountPaid ?? '-'}</td>
                              <td className="px-3 py-2">{tx?.runningBalance ?? tx?.outstandingLoanBalance ?? '-'}</td>
                              <td className="px-3 py-2">{tx?.externalId ?? '-'}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => openTransactionDetail(tx)}>
                                    Details
                                  </Button>
                                  <Can any={['GW_OPS_WRITE']}>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => openReverseTransaction(tx)}
                                      disabled={!tx?.id || tx?.manuallyReversed || tx?.reversed}
                                    >
                                      Reverse
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => openAdjustTransaction(tx)}
                                      disabled={!tx?.id || tx?.manuallyReversed || tx?.reversed}
                                    >
                                      Adjust
                                    </Button>
                                  </Can>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </Tabs>
          </div>
        </div>
      )}

      <Modal
        open={!!fineractActionOpen}
        onClose={() => (fineractActionBusy ? null : setFineractActionOpen(''))}
        title={FINERACT_ACTIONS[fineractActionOpen]?.title || 'Fineract Action'}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setFineractActionOpen('')} disabled={fineractActionBusy}>
              Cancel
            </Button>
            <Button onClick={submitFineractAction} disabled={fineractActionBusy}>
              {fineractActionBusy ? 'Submitting...' : 'Submit'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FINERACT_ACTIONS[fineractActionOpen]?.needsDate ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</label>
              <input
                type="date"
                value={fineractActionDate}
                onChange={(e) => setFineractActionDate(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsAmount ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</label>
              <input
                inputMode="decimal"
                value={fineractActionAmount}
                onChange={(e) => setFineractActionAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsPaymentType ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payment Type</label>
              <select
                value={fineractActionPaymentTypeId}
                onChange={(e) => setFineractActionPaymentTypeId(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Select payment type</option>
                {paymentTypeOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsExternalId ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">External ID</label>
              <input
                value={fineractActionExternalId}
                onChange={(e) => setFineractActionExternalId(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsChargeId ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Charge</label>
              <select
                value={fineractActionChargeId}
                onChange={(e) => setFineractActionChargeId(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Select charge</option>
                {availableChargeIds.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsCustomCommand ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Command</label>
              <input
                value={fineractActionCustomCommand}
                onChange={(e) => setFineractActionCustomCommand(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsNote ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note</label>
              <textarea
                rows={3}
                value={fineractActionNote}
                onChange={(e) => setFineractActionNote(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          {FINERACT_ACTIONS[fineractActionOpen]?.needsPayload ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payload</label>
              <textarea
                rows={10}
                value={fineractActionPayload}
                onChange={(e) => setFineractActionPayload(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 font-mono text-xs dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={assignOfficerOpen}
        onClose={() => (assignOfficerBusy ? null : setAssignOfficerOpen(false))}
        title="Assign Loan Officer"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAssignOfficerOpen(false)} disabled={assignOfficerBusy}>
              Cancel
            </Button>
            <Button onClick={submitAssignLoanOfficer} disabled={assignOfficerBusy}>
              {assignOfficerBusy ? 'Assigning...' : 'Assign Officer'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Loan Officer</label>
            <StaffSelect
              value={assignedOfficerId}
              onChange={setAssignedOfficerId}
              loanOfficerOnly
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assignment Date</label>
            <input
              type="date"
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300">
            Assign the selected officer to the mapped Fineract loan. The loan page will refresh after a successful assignment.
          </div>
        </div>
      </Modal>

      <Modal
        open={transactionDetailOpen}
        onClose={() => setTransactionDetailOpen(false)}
        title={`Transaction${selectedTransaction?.id ? ` #${selectedTransaction.id}` : ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setTransactionDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {transactionDetailBusy ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="animate-spin" size={16} /> Loading transaction details...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transaction ID" value={transactionDetail?.id ?? selectedTransaction?.id} />
            <Field label="Date" value={formatDisplayDate(transactionDetail?.date || selectedTransaction?.date)} />
            <Field label="Type" value={txTypeLabel(transactionDetail || selectedTransaction)} />
            <Field label="Amount" value={transactionDetail?.amount ?? selectedTransaction?.amount ?? selectedTransaction?.amountPaid} />
            <Field label="Running Balance" value={transactionDetail?.runningBalance ?? selectedTransaction?.runningBalance ?? selectedTransaction?.outstandingLoanBalance} />
            <Field label="External ID" value={transactionDetail?.externalId ?? selectedTransaction?.externalId} mono />
            <Field label="Reversed" value={(transactionDetail?.manuallyReversed || transactionDetail?.reversed || selectedTransaction?.manuallyReversed || selectedTransaction?.reversed) ? 'Yes' : 'No'} />
            <Field label="Office ID" value={transactionDetail?.officeId} />
          </div>
        )}
      </Modal>

      <Modal
        open={reverseTransactionOpen}
        onClose={() => (reverseTransactionBusy ? null : setReverseTransactionOpen(false))}
        title={`Reverse Transaction${selectedTransaction?.id ? ` #${selectedTransaction.id}` : ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReverseTransactionOpen(false)} disabled={reverseTransactionBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReverseTransaction} disabled={reverseTransactionBusy}>
              {reverseTransactionBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Reversing...
                </span>
              ) : (
                'Reverse'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction Date (optional)</label>
            <input
              type="date"
              value={reverseTransactionDate}
              onChange={(e) => setReverseTransactionDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note (optional)</label>
            <textarea
              rows={3}
              value={reverseTransactionNote}
              onChange={(e) => setReverseTransactionNote(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Reverse only marks the selected transaction as reversed. Use Adjust when you want reversal plus a replacement transaction with a new amount/date.
          </div>
        </div>
      </Modal>

      <Modal
        open={adjustTransactionOpen}
        onClose={() => (adjustTransactionBusy ? null : setAdjustTransactionOpen(false))}
        title={`Adjust Transaction${selectedTransaction?.id ? ` #${selectedTransaction.id}` : ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustTransactionOpen(false)} disabled={adjustTransactionBusy}>
              Cancel
            </Button>
            <Button onClick={submitAdjustedTransaction} disabled={adjustTransactionBusy}>
              {adjustTransactionBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Adjusting...
                </span>
              ) : (
                'Adjust'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction Date</label>
            <input
              type="date"
              value={adjustTransactionDate}
              onChange={(e) => setAdjustTransactionDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction Amount</label>
            <input
              inputMode="decimal"
              value={adjustTransactionAmount}
              onChange={(e) => setAdjustTransactionAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note (optional)</label>
            <textarea
              rows={3}
              value={adjustTransactionNote}
              onChange={(e) => setAdjustTransactionNote(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Fineract adjustment reverses the selected transaction and posts a replacement transaction with the values entered here.
          </div>
        </div>
      </Modal>

      <Modal
        open={!!simpleActionOpen}
        onClose={() => (simpleActionBusy ? null : setSimpleActionOpen(''))}
        title={simpleActionMeta[simpleActionOpen]?.title || 'Loan Action'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSimpleActionOpen('')} disabled={simpleActionBusy}>
              Cancel
            </Button>
            <Button variant={simpleActionOpen === 'reject' ? 'danger' : 'primary'} onClick={submitSimpleAction} disabled={simpleActionBusy}>
              {simpleActionBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Working...
                </span>
              ) : (
                simpleActionMeta[simpleActionOpen]?.button || 'Submit'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {simpleActionMeta[simpleActionOpen]?.dateLabel || 'Transaction Date'}
            </label>
            <input
              type="date"
              value={simpleActionDate}
              onChange={(e) => setSimpleActionDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note (optional)</label>
            <textarea
              rows={3}
              value={simpleActionNote}
              onChange={(e) => setSimpleActionNote(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </Modal>

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
                  <Loader2 className="animate-spin" size={16} /> Approving...
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
                  <Loader2 className="animate-spin" size={16} /> Disbursing...
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Disbursement Type</label>
            <select
              value={disbursementType}
              onChange={(e) => {
                const nextType = upper(e.target.value);
                setDisbursementType(nextType);
                setDisbursementBankName('');
                if (nextType === 'CASH') {
                  const providerFallback = normalizeProvider(disbursementProvider) || resolveConfigProvider(loanAutomationCfg);
                  setDisbursementProvider(providerFallback === 'EPIKPAY' ? 'EPIKPAY' : providerFallback);
                  setDisbursementAccount('');
                } else if (nextType === 'MOBILE_MONEY' && !normalizeProvider(disbursementProvider)) {
                  const providerFallback = resolveConfigProvider(loanAutomationCfg);
                  if (providerFallback) setDisbursementProvider(providerFallback);
                  setDisbursementAccount(customerDestinationByType.MOBILE_MONEY || '');
                } else if (nextType === 'BANK') {
                  setDisbursementAccount(customerDestinationByType.BANK || '');
                }
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {DISBURSEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</label>
            <select
              value={disbursementProvider}
              onChange={(e) => {
                const provider = normalizeProvider(e.target.value);
                setDisbursementProvider(provider);
                if (provider === 'EPIKPAY') {
                  setDisbursementType('CASH');
                  setDisbursementAccount('');
                } else if ((provider === 'SELCOM' || provider === 'AZAMPAY') && disbursementType !== 'BANK') {
                  setDisbursementType('MOBILE_MONEY');
                  setDisbursementAccount(customerDestinationByType.MOBILE_MONEY || '');
                }
              }}
              disabled={disbursementType === 'BANK'}
              className="mt-1 w-full rounded-xl border p-2.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Auto (Loan Automation Config)</option>
              {resolveProviderOptions(loanAutomationCfg).map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bank Name</label>
            <select
              value={disbursementBankName}
              onChange={(e) => setDisbursementBankName(normalizeText(e.target.value))}
              disabled={disbursementType === 'CASH'}
              className="mt-1 w-full rounded-xl border p-2.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">{disbursementType === 'MOBILE_MONEY' ? 'Select MNO' : 'Select bank'}</option>
              {filteredBankNameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {destinationLabelByType[disbursementType] || 'Customer Destination'}
            </label>
            <div className="mt-1 rounded-xl border bg-slate-50 px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700/50">
              {disbursementType === 'CASH'
                ? 'Not required for CASH'
                : (disbursementAccount || 'Missing in customer profile')}
            </div>
          </div>
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Destination account is sourced from customer profile (bank account/wallet) and is not editable here.
          </div>
        </div>
      </Modal>

      <Modal
        open={refundOpen}
        onClose={() => (refundBusy ? null : setRefundOpen(false))}
        title="Refund Overpayment"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundOpen(false)} disabled={refundBusy}>
              Cancel
            </Button>
            <Button onClick={submitRefund} disabled={refundBusy}>
              {refundBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Refunding...
                </span>
              ) : (
                'Refund'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Refund is available only when Fineract reports the loan as overpaid.
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Refund Date</label>
            <input
              type="date"
              value={refundDate}
              onChange={(e) => setRefundDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Refund Amount</label>
            <input
              value={refundAmount}
              readOnly
              disabled
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">External ID (optional)</label>
            <input
              value={refundExternalId}
              onChange={(e) => setRefundExternalId(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note (optional)</label>
            <textarea
              rows={3}
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={repayOpen}
        onClose={() => (repayBusy ? null : setRepayOpen(false))}
        title={isEpikpayRepayment ? 'Repay Loan via Cash Payment' : 'Repay Loan via Mobile Push'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRepayOpen(false)} disabled={repayBusy}>
              Close
            </Button>
            <Button onClick={submitRepayMobile} disabled={repayBusy}>
              {repayBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> {isEpikpayRepayment ? 'Posting Payment...' : 'Sending Push...'}
                </span>
              ) : (
                isEpikpayRepayment ? 'Post Cash Payment' : 'Send Push'
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aggregator</label>
            <select
              value={repaymentProvider}
              onChange={(e) => {
                const nextProvider = e.target.value;
                setRepaymentProvider(nextProvider);
                if (normalizeProvider(nextProvider) === 'EPIKPAY') {
                  setRepaymentMsisdn('');
                } else if (!normalizeText(repaymentMsisdn)) {
                  setRepaymentMsisdn(customerRepaymentIdentity.msisdn || '');
                }
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Auto (Default Aggregator)</option>
              {resolveProviderOptions(loanAutomationCfg).map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</label>
            <input
              inputMode="decimal"
              value={repaymentAmount}
              onChange={(e) => setRepaymentAmount(e.target.value)}
              placeholder={outstandingAmount != null ? String(outstandingAmount) : '0'}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Currency</label>
            <input
              value={repaymentCurrency}
              onChange={(e) => setRepaymentCurrency(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          {!isEpikpayRepayment ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer MSISDN</label>
              <input
                value={repaymentMsisdn}
                onChange={(e) => setRepaymentMsisdn(e.target.value)}
                placeholder="2557XXXXXXXX"
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payer Name</label>
            <input
              value={repaymentPayerName}
              onChange={(e) => setRepaymentPayerName(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payer Email</label>
            <input
              value={repaymentPayerEmail}
              onChange={(e) => setRepaymentPayerEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="sm:col-span-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300">
            {isEpikpayRepayment
              ? 'Cash repayment is posted directly to Fineract through the gateway.'
              : 'Repayment is posted to Fineract only after the selected aggregator confirms payment completion.'}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GwLoanDetails;
