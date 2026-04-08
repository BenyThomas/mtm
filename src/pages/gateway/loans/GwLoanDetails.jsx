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
  getGwLoanWorkflow,
  repayGwLoanMobile,
  replaceGwLoan,
  runGwLoanAction,
} from '../../../api/gateway/loans';
import { listBankNames } from '../../../api/gateway/bankNames';
import { getOpsResource } from '../../../api/gateway/opsResources';
import api from '../../../api/axios';
import gatewayApi from '../../../api/gatewayAxios';
import { useToast } from '../../../context/ToastContext';

const pretty = (v) => JSON.stringify(v, null, 2);
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

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return 'green';
  if (v === 'ACTIVE') return 'blue';
  if (v === 'DISBURSED') return 'blue';
  if (v === 'SUBMITTED') return 'yellow';
  if (v === 'CLOSED') return 'gray';
  if (v === 'CREATED_IN_FINERACT') return 'yellow';
  if (v === 'UPSTREAM_FAILED') return 'red';
  return 'blue';
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
    fullName: normalizeText(`${profile?.firstName || ''} ${profile?.lastName || ''}`),
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
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState(dateISO());
  const [refundExternalId, setRefundExternalId] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowErr, setWorkflowErr] = useState('');

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
    (async () => {
      setWorkflowLoading(true);
      setWorkflowErr('');
      try {
        const data = await getGwLoanWorkflow(platformLoanId);
        if (cancelled) return;
        setWorkflow(data || null);
      } catch (e) {
        if (cancelled) return;
        setWorkflow(null);
        setWorkflowErr(e?.response?.data?.message || e?.message || 'Failed to load workflow');
      } finally {
        if (!cancelled) setWorkflowLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
  const canRepayViaSelcom =
    hasFineractLoanId &&
    (statusUpper === 'ACTIVE' || statusUpper === 'DISBURSED' || fxStatusUpper.includes('ACTIVE')) &&
    (outstandingAmount == null || outstandingAmount > 0);
  const nextWorkflowAction = canRefund
    ? 'refund'
    : canDisburse
      ? 'disburse'
      : canApprove
        ? 'approve'
        : canRepayViaSelcom
          ? 'repay'
          : '';

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
      await load();
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Disburse failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setDisburseBusy(false);
    }
  };

  const openRepayModal = async () => {
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
  };

  const openRefundModal = () => {
    setRefundAmount(overpaidAmount != null && overpaidAmount > 0 ? String(overpaidAmount) : '');
    setRefundDate(dateISO());
    setRefundExternalId('');
    setRefundNote('');
    setRefundOpen(true);
  };

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
    if (!normalizeText(repaymentMsisdn)) {
      addToast('Customer wallet MSISDN is required', 'error');
      return;
    }

    setRepayBusy(true);
    try {
      const provider = normalizeProvider(repaymentProvider) || resolveRepaymentProvider(loanAutomationCfg);
      const result = await repayGwLoanMobile(platformLoanId, {
        amount,
        provider: provider || undefined,
        currency: normalizeText(repaymentCurrency) || 'TZS',
        msisdn: normalizeText(repaymentMsisdn),
        payerName: normalizeText(repaymentPayerName) || undefined,
        payerEmail: normalizeText(repaymentPayerEmail) || undefined,
      });
      setRepaymentResult(result || null);
      addToast(`${provider || 'Mobile'} push initiated`, 'success');
    } catch (e) {
      const msg = extractGatewayErrorMessage(e, 'Repayment push failed');
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setRepayBusy(false);
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

  const unwrapGatewayBody = (response) => {
    const body = response?.data;
    return body && typeof body === 'object' && 'data' in body ? body.data : body;
  };

  const openDisburseModal = async () => {
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
                {saving ? 'Saving...' : 'Save'}
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
                  {nextWorkflowAction === 'approve' ? (
                    <Button
                      size="sm"
                      onClick={() => setApproveOpen(true)}
                      title="Approve loan"
                    >
                      Approve
                    </Button>
                  ) : null}
                  {nextWorkflowAction === 'disburse' ? (
                    <Button
                      size="sm"
                      onClick={openDisburseModal}
                      title="Disburse loan"
                    >
                      Disburse
                    </Button>
                  ) : null}
                  {nextWorkflowAction === 'repay' ? (
                    <Button
                      size="sm"
                      onClick={openRepayModal}
                      title="Repay loan via Selcom USSD push"
                    >
                      Repay Loan
                    </Button>
                  ) : null}
                  {nextWorkflowAction === 'refund' ? (
                    <Button
                      size="sm"
                      onClick={openRefundModal}
                      title="Refund overpaid amount"
                    >
                      Refund
                    </Button>
                  ) : null}
                  {!nextWorkflowAction && !workflowLoading ? (
                    <span className="text-sm text-slate-600 dark:text-slate-300">No workflow action available</span>
                  ) : null}
                </div>
              </Can>
            </div>

            {workflowErr ? (
              <div className="mt-3 text-sm text-rose-700 dark:text-rose-300">{workflowErr}</div>
            ) : null}
            {workflowLoading ? (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Refreshing workflow...</div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status" value={doc?.status} />
              <Field label="Fineract Status" value={fxStatusText || (fxLoading ? 'Loading...' : '')} />
              <Field label="Expected Disbursement" value={doc?.expectedDisbursementDate} mono />
              <Field label="Disbursement Type" value={doc?.disbursementType} />
              <Field label="Provider" value={doc?.disbursementProvider} />
              <Field label="Bank Name" value={doc?.disbursementBankName} />
              <Field label="Destination" value={doc?.disbursementAccount} mono />
              <Field label="Customer Wallet" value={customerRepaymentIdentity.msisdn} mono />
              <Field label="Overpaid Amount" value={overpaidAmount != null ? formatMoney(overpaidAmount) : ''} />
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
        title="Repay Loan via Mobile Push"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRepayOpen(false)} disabled={repayBusy}>
              Close
            </Button>
            <Button onClick={submitRepayMobile} disabled={repayBusy}>
              {repayBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Sending Push...
                </span>
              ) : (
                'Send Push'
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
              onChange={(e) => setRepaymentProvider(e.target.value)}
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer MSISDN</label>
            <input
              value={repaymentMsisdn}
              onChange={(e) => setRepaymentMsisdn(e.target.value)}
              placeholder="2557XXXXXXXX"
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
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
            Repayment is posted to Fineract only after the selected aggregator confirms payment completion.
          </div>
          {repaymentResult ? (
            <div className="sm:col-span-2 rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Push initiated</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Provider" value={repaymentResult?.provider} />
                <Field label="Payment Event ID" value={repaymentResult?.paymentEvent?.paymentEventId} mono />
                <Field label="Payment Status" value={repaymentResult?.paymentEvent?.status} />
                <Field label="Selcom Order ID" value={repaymentResult?.selcomOrder?.orderId} mono />
                <Field label="Selcom Trans ID" value={repaymentResult?.selcomOrder?.transid} mono />
                <Field label="Collection Status" value={repaymentResult?.selcomOrder?.paymentStatus} />
                <Field label="Gateway Reference" value={repaymentResult?.selcomOrder?.gatewayReference} mono />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default GwLoanDetails;
