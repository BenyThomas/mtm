import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ScheduleTable from '../components/ScheduleTable';
import LoanAdvancedActionModal from '../components/LoanAdvancedActionModal';
import { useToast } from '../context/ToastContext';
import LoanCollaterals from './loans/LoanCollaterals';
import {
    CheckCircle,        // Approve
    XCircle,            // Reject
    UserX,              // Withdraw (Applicant)
    Undo2,              // Undo Approval
    Wallet,             // Disburse
    PiggyBank,          // Disburse to Savings
    RotateCcw,          // Undo Disbursal
    ShieldCheck,        // Recover Guarantee
    ReceiptText,        // Record Repayment
    UserPlus,           // Assign Officer
    UserMinus,          // Unassign Officer
    Loader2,            // Busy spinner
    Eraser,             // Write Off
    Archive,            // Close
    BadgePercent,       // Waive Interest
    CircleDollarSign,   // Prepay/Foreclose
    History,            // Reschedule
    RefreshCw
} from 'lucide-react';


const dateISO = () => new Date().toISOString().slice(0, 10);

// Helpers to normalize dates/types from Fineract responses
const txDateToISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    if (typeof d === 'string') return d.slice(0, 10);
    return '';
};
const txTypeLabel = (t) => t?.value || t?.code || '-';

const parseError = (e, fallback) =>
    e?.response?.data?.errors?.[0]?.defaultUserMessage ||
    e?.response?.data?.defaultUserMessage ||
    e?.response?.data?.message ||
    fallback;

const isISODate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const formatDisplayDate = (value) => {
    const iso = txDateToISO(value);
    if (!iso) return '-';
    try {
        const parsed = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return iso;
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(parsed);
    } catch {
        return iso;
    }
};
const formatAmount = (value, currency) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    const rendered = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numeric);
    return currency ? `${rendered} ${currency}` : rendered;
};
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join('-');
    if (typeof value === 'object') return value.value || value.code || value.name || '-';
    return String(value);
};
const SummaryMetric = ({ label, value, tone = 'slate' }) => {
    const toneClass =
        tone === 'emerald' ? 'border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-900/20'
            : tone === 'amber' ? 'border-amber-200/70 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-900/20'
                : tone === 'rose' ? 'border-rose-200/70 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-900/20'
                    : 'border-slate-200/70 bg-white/80 dark:border-slate-700/70 dark:bg-slate-900/50';

    return (
        <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</div>
        </div>
    );
};

const SummaryField = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-sm font-medium break-words text-slate-800 dark:text-slate-100">{value}</div>
    </div>
);

const SummarySection = ({ title, children }) => (
    <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/30">
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {children}
        </div>
    </div>
);

const loanActionButtonClass =
    'border border-[color:var(--tenant-primary)]/20 bg-[color:var(--tenant-primary)]/8 text-[var(--tenant-primary)] hover:bg-[color:var(--tenant-primary)]/14 dark:border-[color:var(--tenant-primary)]/35 dark:bg-[color:var(--tenant-primary)]/12 dark:hover:bg-[color:var(--tenant-primary)]/18';

const LoanIconActionButton = ({ title, className = '', children, ...props }) => (
    <Button
        size="sm"
        variant="ghost"
        className={`h-11 w-11 shrink-0 rounded-xl p-0 shadow-sm ${loanActionButtonClass} ${className}`.trim()}
        title={title}
        aria-label={title}
        {...props}
    >
        {children}
    </Button>
);

const ChargeTable = ({ title, items, currency, onAction }) => (
    <Card>
        <div className="mb-3 text-sm font-semibold">{title}</div>
        {!items.length ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">No {title.toLowerCase()}.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Due</th>
                        <th className="py-2 pr-4">Waived</th>
                        <th className="py-2 pr-4">Paid</th>
                        <th className="py-2 pr-4">Outstanding</th>
                        <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((charge) => (
                        <tr key={charge.id || `${title}-${charge.name}`} className="border-t border-slate-200/70 dark:border-slate-700/70">
                            <td className="py-2 pr-4">{charge.name || '-'}</td>
                            <td className="py-2 pr-4">{formatAmount(charge.amount || charge.amountOrPercentage, currency)}</td>
                            <td className="py-2 pr-4">{formatAmount(charge.amountWaived, currency)}</td>
                            <td className="py-2 pr-4">{formatAmount(charge.amountPaid, currency)}</td>
                            <td className="py-2 pr-4">{formatAmount(charge.amountOutstanding, currency)}</td>
                            <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {charge.amountOutstanding > 0 && (
                                        <>
                                            <button
                                                onClick={() => onAction('waive', charge)}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                Waive
                                            </button>
                                            <button
                                                onClick={() => onAction('pay', charge)}
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                            >
                                                Pay
                                            </button>
                                        </>
                                    )}
                                    {(!charge.amountPaid || charge.amountPaid === 0) && (!charge.amountWaived || charge.amountWaived === 0) && (
                                        <button
                                            onClick={() => onAction('delete', charge)}
                                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        )}
    </Card>
);

const LoanDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();

    const [loan, setLoan] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Approve
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveBusy, setApproveBusy] = useState(false);
    const [approveNote, setApproveNote] = useState('');
    const [approveDate, setApproveDate] = useState(dateISO());
    const [approvedLoanAmount, setApprovedLoanAmount] = useState('');
    const [expectedDisbursementDate, setExpectedDisbursementDate] = useState('');

    // Disburse
    const [disburseOpen, setDisburseOpen] = useState(false);
    const [disburseBusy, setDisburseBusy] = useState(false);
    const [disburseDate, setDisburseDate] = useState(dateISO());
    const [disburseAmount, setDisburseAmount] = useState('');
    const [fixedEmiAmount, setFixedEmiAmount] = useState('');
    const [paymentTypeIdForDisburse, setPaymentTypeIdForDisburse] = useState('');

    // Disburse to savings
    const [disburseSavOpen, setDisburseSavOpen] = useState(false);
    const [disburseSavBusy, setDisburseSavBusy] = useState(false);
    const [disburseSavDate, setDisburseSavDate] = useState(dateISO());
    const [disburseSavAmount, setDisburseSavAmount] = useState('');
    const [disburseSavFixedEmi, setDisburseSavFixedEmi] = useState('');
    const [paymentTypeIdForDisburseSav, setPaymentTypeIdForDisburseSav] = useState('');

    // Repayment
    const [repayOpen, setRepayOpen] = useState(false);
    const [repayBusy, setRepayBusy] = useState(false);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayDate, setRepayDate] = useState(dateISO());
    const [repayPaymentTypeId, setRepayPaymentTypeId] = useState('');
    const [repayReceipt, setRepayReceipt] = useState('');
    const [paymentTypeOptions, setPaymentTypeOptions] = useState([{ id: 1, name: 'Cash' }]); // fallback

    // Reject
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectBusy, setRejectBusy] = useState(false);
    const [rejectedOnDate, setRejectedOnDate] = useState(dateISO());
    const [rejectNote, setRejectNote] = useState('');

    // Withdraw (applicant withdraws)
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawBusy, setWithdrawBusy] = useState(false);
    const [withdrawnOnDate, setWithdrawnOnDate] = useState(dateISO());
    const [withdrawNote, setWithdrawNote] = useState('');

    // Undo approval
    const [undoApprovalBusy, setUndoApprovalBusy] = useState(false);

    // Recover guarantee
    const [recoverGuaranteeBusy, setRecoverGuaranteeBusy] = useState(false);

    // Undo disbursal
    const [undoDisbursalBusy, setUndoDisbursalBusy] = useState(false);

    // Assign / Unassign Loan Officer
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignBusy, setAssignBusy] = useState(false);
    const [loanOfficerId, setLoanOfficerId] = useState('');
    const [assignmentDate, setAssignmentDate] = useState(dateISO());
    const [availableOfficers, setAvailableOfficers] = useState([]); // optional: populate from template if present

    const [unassignOpen, setUnassignOpen] = useState(false);
    const [unassignBusy, setUnassignBusy] = useState(false);
    const [unassignedOnDate, setUnassignedOnDate] = useState(dateISO());
    const [advancedActionOpen, setAdvancedActionOpen] = useState(false);
    const [selectedCommand, setSelectedCommand] = useState('');

    // Add Charge
    const [addChargeOpen, setAddChargeOpen] = useState(false);
    const [addChargeBusy, setAddChargeBusy] = useState(false);
    const [chargeOptions, setChargeOptions] = useState([]);
    const [selectedChargeId, setSelectedChargeId] = useState('');
    const [addChargeAmount, setAddChargeAmount] = useState('');
    const [addChargeDate, setAddChargeDate] = useState(dateISO());

    // Charge Actions (Waive/Pay)
    const [chargeActionOpen, setChargeActionOpen] = useState(false);
    const [chargeActionBusy, setChargeActionBusy] = useState(false);
    const [selectedChargeForAction, setSelectedChargeForAction] = useState(null);
    const [chargeActionType, setChargeActionType] = useState(''); // 'waive' or 'pay'
    const [chargeActionAmount, setChargeActionAmount] = useState('');
    const [chargeActionDate, setChargeActionDate] = useState(dateISO());
    const [chargeActionPaymentType, setChargeActionPaymentType] = useState('');

    // Transactions filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [typeFilter, setTypeFilter] = useState(''); // '' = all
    const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
    const [transactionDetailBusy, setTransactionDetailBusy] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionDetail, setTransactionDetail] = useState(null);
    const [adjustTransactionOpen, setAdjustTransactionOpen] = useState(false);
    const [adjustTransactionBusy, setAdjustTransactionBusy] = useState(false);
    const [adjustTransactionDate, setAdjustTransactionDate] = useState(dateISO());
    const [adjustTransactionAmount, setAdjustTransactionAmount] = useState('');
    const [adjustTransactionNote, setAdjustTransactionNote] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Loan with schedule
            const res = await api.get(`/loans/${id}`, { params: { associations: 'repaymentSchedule,charges' } });
            setLoan(res.data);

            // Template (for payment types and possibly officers)
            try {
                const t = await api.get(`/loans/${id}`, { params: { template: true } });
                const ptypes =
                    t?.data?.paymentTypeOptions ||
                    t?.data?.paymentTypeOptionsForRepayment ||
                    t?.data?.paymentTypeOptionsForDisbursement ||
                    [];
                if (Array.isArray(ptypes) && ptypes.length) {
                    const opts = ptypes.map((o) => ({
                        id: o.id ?? o.value ?? o.code,
                        name: o.name ?? o.value ?? o.code ?? `Type ${o.id}`,
                    }));
                    setPaymentTypeOptions(opts);
                    if (!repayPaymentTypeId && opts[0]) setRepayPaymentTypeId(String(opts[0].id));
                    if (!paymentTypeIdForDisburse && opts[0]) setPaymentTypeIdForDisburse(String(opts[0].id));
                    if (!paymentTypeIdForDisburseSav && opts[0]) setPaymentTypeIdForDisburseSav(String(opts[0].id));
                    if (!chargeActionPaymentType && opts[0]) setChargeActionPaymentType(String(opts[0].id));
                }

                // If your template exposes officer options (some setups do)
                const officers = t?.data?.loanOfficerOptions || t?.data?.staffOptions || [];
                if (Array.isArray(officers)) {
                    setAvailableOfficers(
                        officers.map((o) => ({ id: o.id, displayName: o.displayName || o.name || `Officer ${o.id}` }))
                    );
                }
            } catch {
                // ignore
            }

            // Transactions (supports array, Spring `content`, `pageItems`, or `transactions`)
            try {
                const t = await api.get(`/loans/${id}/transactions`);
                const d = t?.data;
                const items = Array.isArray(d)
                    ? d
                    : Array.isArray(d?.content)
                        ? d.content
                        : Array.isArray(d?.pageItems)
                            ? d.pageItems
                            : Array.isArray(d?.transactions)
                                ? d.transactions
                                : [];
                setTransactions(items);
            } catch {
                setTransactions([]);
            }

        } catch {
            setLoan(null);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChargeAction = (action, charge) => {
        setSelectedChargeForAction(charge);
        if (action === 'waive') {
            setChargeActionType('waive');
            setChargeActionAmount(charge.amountOutstanding);
            setChargeActionOpen(true);
        } else if (action === 'pay') {
            setChargeActionType('pay');
            setChargeActionAmount(charge.amountOutstanding);
            setChargeActionOpen(true);
        } else if (action === 'delete') {
            confirmDeleteCharge(charge);
        }
    };

    const confirmDeleteCharge = async (charge) => {
        if (!window.confirm(`Are you sure you want to delete the charge '${charge.name}'?`)) return;
        try {
            await api.delete(`/loans/${id}/charges/${charge.id}`);
            addToast('Charge deleted', 'success');
            fetchAll();
        } catch (e) {
            addToast(parseError(e, 'Failed to delete charge'), 'error');
        }
    };

    const fetchChargeTemplate = async () => {
        try {
            const res = await api.get(`/loans/${id}/charges/template`);
            const opts = res.data?.chargeOptions || [];
            setChargeOptions(opts);
            if (opts.length > 0) {
                setSelectedChargeId(String(opts[0].id));
                setAddChargeAmount(String(opts[0].amount || ''));
            }
        } catch (e) {
            addToast('Failed to load charge template', 'error');
        }
    };

    useEffect(() => {
        if (addChargeOpen) fetchChargeTemplate();
    }, [addChargeOpen]);

    const handleAddCharge = async () => {
        if (!selectedChargeId) {
            addToast('Please select a charge', 'error');
            return;
        }
        setAddChargeBusy(true);
        try {
            const payload = {
                chargeId: selectedChargeId,
                amount: Number(addChargeAmount),
                dueDate: addChargeDate,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
            };
            await api.post(`/loans/${id}/charges`, payload);
            addToast('Charge added successfully', 'success');
            setAddChargeOpen(false);
            fetchAll();
        } catch (e) {
            addToast(parseError(e, 'Failed to add charge'), 'error');
        } finally {
            setAddChargeBusy(false);
        }
    };

    const handleExecuteChargeAction = async () => {
        if (!selectedChargeForAction) return;
        setChargeActionBusy(true);
        try {
            let command;
            if (chargeActionType === 'waive') {
                command = selectedChargeForAction.penalty ? 'waivePenalty' : 'waiveLoanCharge';
            } else {
                command = 'payLoanCharge';
            }
            const payload = {
                amount: Number(chargeActionAmount),
                transactionDate: chargeActionDate,
                paymentTypeId: chargeActionType === 'pay' ? (chargeActionPaymentType ? Number(chargeActionPaymentType) : undefined) : undefined,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
            };
            await api.post(`/loans/${id}/charges/${selectedChargeForAction.id}?command=${command}`, payload);
            addToast(`Charge ${chargeActionType === 'waive' ? 'waived' : 'paid'} successfully`, 'success');
            setChargeActionOpen(false);
            fetchAll();
        } catch (e) {
            addToast(parseError(e, `Failed to ${chargeActionType} charge`), 'error');
        } finally {
            setChargeActionBusy(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const statusTone = (s) => {
        const code = s?.code || s?.value || '';
        if (/approved/i.test(code)) return 'blue';
        if (/active|disbursed/i.test(code)) return 'green';
        if (/submitted|pending/i.test(code)) return 'yellow';
        if (/rejected|withdrawn/i.test(code)) return 'red';
        if (/closed|writtenoff/i.test(code)) return 'gray';
        return 'gray';
    };

    // ---- Stage helpers (visibility rules) ----
    const statusCodeRaw = (loan?.status?.code || loan?.status?.value || '').toLowerCase();

    // Basic buckets (tuned for Fineract)
    const isSubmittedOnly = /submitted|pending/.test(statusCodeRaw);
    const isApprovedOnly =
        /approved/.test(statusCodeRaw) && !/active|disbursed/.test(statusCodeRaw);
    const isDisbursedActive = /active|disbursed/.test(statusCodeRaw);
    const isOverpaid = /overpaid/.test(statusCodeRaw);
    const isClosed = /closed/.test(statusCodeRaw); // covers all closed types (obligations met, written off, etc)
    const isRejected = /rejected/.test(statusCodeRaw);
    const isWithdrawn = /withdrawn/.test(statusCodeRaw);
    const isTerminal = isClosed || isRejected || isWithdrawn;

    // Optional timeline guards (safer than strings if your API returns them)
    const tl = loan?.timeline || {};
    const hasDisbursal =
        !!tl?.actualDisbursementDate || !!tl?.expectedDisbursementDate;

    const submittedOnDateISO = txDateToISO(tl?.submittedOnDate);
    const dueDateISO = useMemo(() => {
        const tlDue = txDateToISO(tl?.expectedMaturityDate || tl?.actualMaturityDate);
        if (tlDue) return tlDue;

        const periods = loan?.repaymentSchedule?.periods;
        if (!Array.isArray(periods) || !periods.length) return '';

        let max = '';
        for (const p of periods) {
            const d = txDateToISO(p?.dueDate);
            if (!d) continue;
            if (!max || d > max) max = d;
        }
        return max;
    }, [loan, tl?.expectedMaturityDate, tl?.actualMaturityDate]);

    // Officer presence (some payloads expose id or name)
    const hasOfficerAssigned = !!(loan?.loanOfficerId || loan?.loanOfficerName);

    // Final visibility rules
    const canApprove = isSubmittedOnly && !isTerminal;
    const canUndoApproval = isApprovedOnly && !isTerminal && !hasDisbursal;
    const canDisburse = isApprovedOnly && !isTerminal;
    const canDisburseToSavings = isApprovedOnly && !isTerminal;
    const canUndoDisbursal = isDisbursedActive && !isTerminal;

    const canReject = isSubmittedOnly && !isTerminal;
    const canWithdraw = isSubmittedOnly && !isTerminal;

    const canAssignOfficer = !isTerminal && !hasOfficerAssigned;
    const canUnassignOfficer = !isTerminal && hasOfficerAssigned;

    const canRecoverGuarantee = isDisbursedActive && !isTerminal;

    // Repayment: allowed while Active/Disbursed
    const canRecordRepayment = useMemo(() => isDisbursedActive, [isDisbursedActive]);

    const canWriteOff = isDisbursedActive;
    const canClose = isDisbursedActive || isOverpaid;
    const canWaiveInterest = isDisbursedActive;
    const canForeclose = isDisbursedActive;
    const canReschedule = isDisbursedActive;
    const isWrittenOffLike = /written|writeoff/.test(statusCodeRaw);
    const canUndoWriteOff = isWrittenOffLike;
    const canUndoWaiveInterest = !isClosed && !isRejected && !isWithdrawn;
    const canCloseAsRescheduled = !isClosed && !isRejected && !isWithdrawn && !isWrittenOffLike;
    const currencyCode = loan?.summary?.currency?.code || loan?.currency?.code || '';
    const nonPenaltyCharges = useMemo(
        () => (Array.isArray(loan?.charges) ? loan.charges.filter((item) => !item?.penalty) : []),
        [loan?.charges]
    );
    const penaltyCharges = useMemo(
        () => (Array.isArray(loan?.charges) ? loan.charges.filter((item) => item?.penalty) : []),
        [loan?.charges]
    );

    // --- Actions ---

    // Approve Loan Application
    const approve = async () => {
        // Client-side guards to avoid Fineract validation errors and reduce bad payloads.
        // "Submission date" here refers to the date the user is submitting this approval (today).
        const todayISO = dateISO();

        if (!isISODate(approveDate)) {
            addToast('Approved On date is required', 'error');
            return;
        }
        if (approveDate > todayISO) {
            addToast(`Approval date must be on or before ${todayISO}`, 'error');
            return;
        }
        if (isISODate(submittedOnDateISO) && approveDate < submittedOnDateISO) {
            addToast(`Approval date must be on or after submitted-on date (${submittedOnDateISO})`, 'error');
            return;
        }

        if (expectedDisbursementDate) {
            if (!isISODate(expectedDisbursementDate)) {
                addToast('Expected Disbursement Date must be a valid date', 'error');
                return;
            }
            if (expectedDisbursementDate < approveDate) {
                addToast('Expected Disbursement Date cannot be before Approval Date', 'error');
                return;
            }
            if (isISODate(dueDateISO) && expectedDisbursementDate > dueDateISO) {
                addToast(`Expected Disbursement Date must be on or before due date (${dueDateISO})`, 'error');
                return;
            }
        }

        setApproveBusy(true);
        try {
            const payload = {
                approvedOnDate: approveDate,
                note: approveNote || undefined,
                approvedLoanAmount: approvedLoanAmount ? Number(approvedLoanAmount) : undefined,
                expectedDisbursementDate: expectedDisbursementDate || undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            };
            await api.post(`/loans/${id}?command=approve`, payload);
            addToast('Loan Approved', 'success');
            setApproveOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Approve failed';
            addToast(msg, 'error');
        } finally {
            setApproveBusy(false);
        }
    };

    // Undo Loan Application Approval
    const undoApproval = async () => {
        setUndoApprovalBusy(true);
        try {
            await api.post(`/loans/${id}?command=undoApproval`, {
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Approval undone', 'success');
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Undo approval failed';
            addToast(msg, 'error');
        } finally {
            setUndoApprovalBusy(false);
        }
    };

    // Reject Loan Application
    const reject = async () => {
        setRejectBusy(true);
        try {
            await api.post(`/loans/${id}?command=reject`, {
                rejectedOnDate,
                note: rejectNote || undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Loan Rejected', 'success');
            setRejectOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Reject failed';
            addToast(msg, 'error');
        } finally {
            setRejectBusy(false);
        }
    };

    // Applicant Withdraws from Loan Application
    const withdraw = async () => {
        setWithdrawBusy(true);
        try {
            await api.post(`/loans/${id}?command=withdrawnByApplicant`, {
                withdrawnOnDate,
                note: withdrawNote || undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Application withdrawn', 'success');
            setWithdrawOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Withdraw failed';
            addToast(msg, 'error');
        } finally {
            setWithdrawBusy(false);
        }
    };

    // Disburse Loan
    const disburse = async () => {
        setDisburseBusy(true);
        try {
            await api.post(`/loans/${id}?command=disburse`, {
                actualDisbursementDate: disburseDate,
                transactionAmount: disburseAmount ? Number(disburseAmount) : undefined,
                fixedEmiAmount: fixedEmiAmount ? Number(fixedEmiAmount) : undefined,
                paymentTypeId: paymentTypeIdForDisburse ? Number(paymentTypeIdForDisburse) : undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Loan Disbursed', 'success');
            setDisburseOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Disburse failed';
            addToast(msg, 'error');
        } finally {
            setDisburseBusy(false);
        }
    };

    // Disburse Loan To Savings Account
    const disburseToSavings = async () => {
        setDisburseSavBusy(true);
        try {
            await api.post(`/loans/${id}?command=disbursetosavings`, {
                actualDisbursementDate: disburseSavDate,
                transactionAmount: disburseSavAmount ? Number(disburseSavAmount) : undefined,
                fixedEmiAmount: disburseSavFixedEmi ? Number(disburseSavFixedEmi) : undefined,
                paymentTypeId: paymentTypeIdForDisburseSav ? Number(paymentTypeIdForDisburseSav) : undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Loan Disbursed to Savings', 'success');
            setDisburseSavOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Disburse to savings failed';
            addToast(msg, 'error');
        } finally {
            setDisburseSavBusy(false);
        }
    };

    // Undo Loan Disbursal
    const undoDisbursal = async () => {
        setUndoDisbursalBusy(true);
        try {
            await api.post(`/loans/${id}?command=undodisbursal`, {
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Disbursal undone', 'success');
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Undo disbursal failed';
            addToast(msg, 'error');
        } finally {
            setUndoDisbursalBusy(false);
        }
    };

    // Recover Loan Guarantee
    const recoverGuarantee = async () => {
        setRecoverGuaranteeBusy(true);
        try {
            await api.post(`/loans/${id}?command=recoverGuarantees`, {
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Guarantee recovered', 'success');
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Recover guarantee failed';
            addToast(msg, 'error');
        } finally {
            setRecoverGuaranteeBusy(false);
        }
    };

    // Assign a Loan Officer
    const assignOfficer = async () => {
        if (!loanOfficerId) {
            addToast('Select a loan officer', 'error');
            return;
        }
        setAssignBusy(true);
        const payload = {
            loanOfficerId: Number(loanOfficerId),
            assignmentDate: assignmentDate,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        };
        try {
            await api.post(`/loans/${id}?command=assignLoanOfficer`, payload);
            addToast('Loan Officer assigned', 'success');
            await fetchAll();
        } catch (err) {
            const data = err?.response?.data;
            const msg = data?.errors?.[0]?.defaultUserMessage || data?.defaultUserMessage || 'Assign failed';
            addToast(msg, 'error');
        } finally {
            setAssignBusy(false);
        }
    };
    // --- Record Repayment handler ---
    const postRepayment = async () => {
        if (!repayAmount || Number(repayAmount) <= 0) {
            addToast('Enter a valid amount', 'error');
            return;
        }
        setRepayBusy(true);
        try {
            await api.post(`/loans/${id}/transactions?command=repayment`, {
                transactionDate: repayDate,
                transactionAmount: Number(repayAmount),
                paymentTypeId: repayPaymentTypeId ? Number(repayPaymentTypeId) : undefined,
                externalId: repayReceipt || undefined, // receipt/reference
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Repayment posted', 'success');
            setRepayOpen(false);
            // refresh loan + schedule + transactions
            await fetchAll();
            // reset form
            setRepayAmount('');
            setRepayReceipt('');
            setRepayDate(dateISO());
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Repayment failed';
            addToast(msg, 'error');
        } finally {
            setRepayBusy(false);
        }
    };


    // Unassign a Loan Officer
    const unassignOfficer = async () => {
        setUnassignBusy(true);
        try {
            await api.post(`/loans/${id}?command=unassignLoanOfficer`, {
                unassignedDate: unassignedOnDate,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Loan Officer unassigned', 'success');
            setUnassignOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Unassign failed';
            addToast(msg, 'error');
        } finally {
            setUnassignBusy(false);
        }
    };
    const openAdvancedAction = (command = '') => {
        setSelectedCommand(command);
        setAdvancedActionOpen(true);
    };
    const loanActions = useMemo(() => {
        const actions = [];
        if (canApprove) {
            actions.push({
                key: 'approve',
                title: 'Approve',
                icon: CheckCircle,
                onClick: () => setApproveOpen(true),
            });
        }
        if (canReject) {
            actions.push({
                key: 'reject',
                title: 'Reject',
                icon: XCircle,
                onClick: () => setRejectOpen(true),
            });
        }
        if (canWithdraw) {
            actions.push({
                key: 'withdraw',
                title: 'Withdraw',
                icon: UserX,
                onClick: () => setWithdrawOpen(true),
            });
        }
        if (canUndoApproval) {
            actions.push({
                key: 'undo-approval',
                title: undoApprovalBusy ? 'Undo Approval (Working)' : 'Undo Approval',
                icon: undoApprovalBusy ? Loader2 : Undo2,
                iconClassName: undoApprovalBusy ? 'animate-spin' : '',
                onClick: undoApproval,
            });
        }
        if (canDisburse) {
            actions.push({
                key: 'disburse',
                title: 'Disburse',
                icon: Wallet,
                onClick: () => setDisburseOpen(true),
            });
        }
        if (canDisburseToSavings) {
            actions.push({
                key: 'disburse-savings',
                title: 'Disburse to Savings',
                icon: PiggyBank,
                onClick: () => setDisburseSavOpen(true),
            });
        }
        if (canUndoDisbursal) {
            actions.push({
                key: 'undo-disbursal',
                title: undoDisbursalBusy ? 'Undo Disbursal (Working)' : 'Undo Disbursal',
                icon: undoDisbursalBusy ? Loader2 : RotateCcw,
                iconClassName: undoDisbursalBusy ? 'animate-spin' : '',
                onClick: undoDisbursal,
            });
        }
        if (canRecoverGuarantee) {
            actions.push({
                key: 'recover-guarantee',
                title: recoverGuaranteeBusy ? 'Recover Guarantee (Working)' : 'Recover Guarantee',
                icon: recoverGuaranteeBusy ? Loader2 : ShieldCheck,
                iconClassName: recoverGuaranteeBusy ? 'animate-spin' : '',
                onClick: recoverGuarantee,
            });
        }
        if (canRecordRepayment) {
            actions.push({
                key: 'repayment',
                title: 'Record Repayment',
                icon: ReceiptText,
                onClick: () => setRepayOpen(true),
            });
        }
        if (canAssignOfficer) {
            actions.push({
                key: 'assign-officer',
                title: 'Assign Officer',
                icon: UserPlus,
                onClick: () => setAssignOpen(true),
            });
        }
        if (canUnassignOfficer) {
            actions.push({
                key: 'unassign-officer',
                title: 'Unassign Officer',
                icon: UserMinus,
                onClick: () => setUnassignOpen(true),
            });
        }
        if (canUndoWriteOff) {
            actions.push({
                key: 'undo-writeoff',
                title: 'Undo Write Off',
                icon: Undo2,
                onClick: () => openAdvancedAction('undowriteoff'),
            });
        }
        if (canWaiveInterest) {
            actions.push({
                key: 'waive-interest',
                title: 'Waive Interest',
                icon: BadgePercent,
                onClick: () => openAdvancedAction('waiveInterest'),
            });
        }
        if (canUndoWaiveInterest) {
            actions.push({
                key: 'undo-waive-interest',
                title: 'Undo Interest Waiver',
                icon: Undo2,
                onClick: () => openAdvancedAction('undoWaiveInterest'),
            });
        }
        if (canForeclose) {
            actions.push({
                key: 'prepay-foreclose',
                title: 'Prepay / Foreclose',
                icon: CircleDollarSign,
                onClick: () => openAdvancedAction('prepayLoan'),
            });
        }
        if (canWriteOff) {
            actions.push({
                key: 'writeoff',
                title: 'Write Off',
                icon: Eraser,
                onClick: () => openAdvancedAction('writeoff'),
            });
        }
        if (canClose) {
            actions.push({
                key: 'close',
                title: 'Close Loan',
                icon: Archive,
                onClick: () => openAdvancedAction('close'),
            });
        }
        if (canCloseAsRescheduled) {
            actions.push({
                key: 'close-rescheduled',
                title: 'Close As Rescheduled',
                icon: CheckCircle,
                onClick: () => openAdvancedAction('close-rescheduled'),
            });
        }
        if (canReschedule) {
            actions.push({
                key: 'reschedule',
                title: 'Reschedule',
                icon: History,
                onClick: () => openAdvancedAction('reschedule'),
            });
        }
        return actions;
    }, [
        canApprove,
        canReject,
        canWithdraw,
        canUndoApproval,
        undoApprovalBusy,
        canDisburse,
        canDisburseToSavings,
        canUndoDisbursal,
        undoDisbursalBusy,
        canRecoverGuarantee,
        recoverGuaranteeBusy,
        canRecordRepayment,
        canAssignOfficer,
        canUnassignOfficer,
        canUndoWriteOff,
        canWaiveInterest,
        canUndoWaiveInterest,
        canForeclose,
        canWriteOff,
        canClose,
        canCloseAsRescheduled,
        canReschedule,
    ]);

    // Filters + CSV
    const filteredTx = useMemo(() => {
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        const list = [...transactions].sort((a, b) => {
            const da = new Date(txDateToISO(a.date));
            const db = new Date(txDateToISO(b.date));
            if (da - db !== 0) return da - db;
            return (a.id || 0) - (b.id || 0);
        });
        return list.filter((t) => {
            const d = new Date(txDateToISO(t.date));
            if (from && d < from) return false;
            if (to && d > to) return false;
            if (typeFilter && !new RegExp(typeFilter, 'i').test(t.type?.code || t.type?.value || '')) return false;
            return true;
        });
    }, [transactions, fromDate, toDate, typeFilter]);

    const exportCSV = () => {
        const rows = [
            ['Transaction ID', 'Date', 'Type', 'Amount', 'Running Balance', 'External ID'],
            ...filteredTx.map((t) => [
                t.id ?? '',
                txDateToISO(t.date),
                txTypeLabel(t.type),
                t.amount ?? t.amountPaid ?? '',
                t.runningBalance ?? t.outstandingLoanBalance ?? '',
                t.externalId ?? '',
            ]),
        ];
        const csv = rows
            .map((r) =>
                r
                    .map((cell) => {
                        const s = String(cell ?? '');
                        return `"${s.replace(/"/g, '""')}"`;
                    })
                    .join(',')
            )
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loan_${id}_transactions.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const openTransactionDetail = async (tx) => {
        if (!tx?.id) return;
        setSelectedTransaction(tx);
        setTransactionDetail(null);
        setTransactionDetailOpen(true);
        setTransactionDetailBusy(true);
        try {
            const res = await api.get(`/loans/${id}/transactions/${tx.id}`);
            setTransactionDetail(res.data || null);
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load transaction details';
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
            await api.post(`/loans/${id}/transactions/${selectedTransaction.id}`, {
                transactionDate: adjustTransactionDate,
                transactionAmount: Number(adjustTransactionAmount),
                note: adjustTransactionNote || undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Transaction adjusted', 'success');
            setAdjustTransactionOpen(false);
            await fetchAll();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Adjust transaction failed';
            addToast(msg, 'error');
        } finally {
            setAdjustTransactionBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="6rem" /></Card>
                <Card><Skeleton height="12rem" /></Card>
            </div>
        );
    }

    if (!loan) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Loan</h1>
                <Card>Loan not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Loan #{loan.id}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                        <Badge tone={statusTone(loan.status)}>{loan.status?.value || loan.status?.code || '-'}</Badge>
                        {loan.clientName ? <span>• {loan.clientName}</span> : null}
                        {loan.loanProductName ? <span>• {loan.loanProductName}</span> : null}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {loanActions.map((action) => (
                        <LoanIconActionButton
                            key={action.key}
                            title={action.title}
                            onClick={action.onClick}
                        >
                            <action.icon className={`h-5 w-5 ${action.iconClassName || ''}`.trim()} />
                        </LoanIconActionButton>
                    ))}
                    <LoanIconActionButton
                        title="Refresh Loan"
                        onClick={fetchAll}
                    >
                        <RefreshCw className="h-5 w-5" />
                    </LoanIconActionButton>
                </div>

            </div>

            {/* Tabs */}
            <Tabs
                tabs={[
                    { key: 'summary', label: 'Summary' },
                    { key: 'schedule', label: 'Schedule' },
                    { key: 'charges', label: 'Charges' },
                    { key: 'collaterals', label: 'Collaterals' },
                    { key: 'transactions', label: 'Transactions' },
                ]}
            >
                {/* Summary */}
                <div data-tab="summary" className="space-y-4">
                    <Card>
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <SummaryMetric
                                    label="Outstanding"
                                    value={formatAmount(loan.summary?.totalOutstanding, currencyCode)}
                                    tone={Number(loan.summary?.totalOutstanding ?? 0) > 0 ? 'amber' : 'slate'}
                                />
                                <SummaryMetric
                                    label="Disbursed"
                                    value={formatAmount(loan.summary?.principalDisbursed, currencyCode)}
                                    tone="emerald"
                                />
                                <SummaryMetric
                                    label="Total Repaid"
                                    value={formatAmount(loan.summary?.totalRepayment, currencyCode)}
                                    tone="slate"
                                />
                                <SummaryMetric
                                    label="Overdue"
                                    value={formatAmount(loan.summary?.totalOverdue, currencyCode)}
                                    tone={Number(loan.summary?.totalOverdue ?? 0) > 0 ? 'rose' : 'slate'}
                                />
                            </div>

                            <SummarySection title="Loan Snapshot">
                                <SummaryField label="Loan ID" value={formatValue(loan.id)} />
                                <SummaryField label="Account No" value={formatValue(loan.accountNo)} />
                                <SummaryField label="External ID" value={formatValue(loan.externalId)} />
                                <SummaryField label="Status" value={formatValue(loan.status)} />
                                <SummaryField label="Client" value={formatValue(loan.clientName)} />
                                <SummaryField label="Product" value={formatValue(loan.loanProductName)} />
                                <SummaryField label="Loan Officer" value={formatValue(loan.loanOfficerName)} />
                                <SummaryField label="Currency" value={currencyCode || '-'} />
                                <SummaryField label="Transaction Strategy" value={formatValue(loan.transactionProcessingStrategyName || loan.transactionProcessingStrategyCode)} />
                            </SummarySection>

                            <SummarySection title="Financials">
                                <SummaryField label="Principal Requested" value={formatAmount(loan.principal || loan.proposedPrincipal, currencyCode)} />
                                <SummaryField label="Approved Principal" value={formatAmount(loan.approvedPrincipal, currencyCode)} />
                                <SummaryField label="Disbursed Principal" value={formatAmount(loan.summary?.principalDisbursed, currencyCode)} />
                                <SummaryField label="Principal Total / Paid / Outstanding" value={`${formatAmount(loan.summary?.totalPrincipal, currencyCode)} / ${formatAmount(loan.summary?.principalPaid, currencyCode)} / ${formatAmount(loan.summary?.principalOutstanding, currencyCode)}`} />
                                <SummaryField label="Interest Charged / Paid / Outstanding" value={`${formatAmount(loan.summary?.interestCharged, currencyCode)} / ${formatAmount(loan.summary?.interestPaid, currencyCode)} / ${formatAmount(loan.summary?.interestOutstanding, currencyCode)}`} />
                                <SummaryField label="Fees Charged / Paid / Outstanding" value={`${formatAmount(loan.summary?.feeChargesCharged, currencyCode)} / ${formatAmount(loan.summary?.feeChargesPaid, currencyCode)} / ${formatAmount(loan.summary?.feeChargesOutstanding, currencyCode)}`} />
                                <SummaryField label="Penalties Charged / Paid / Outstanding" value={`${formatAmount(loan.summary?.penaltyChargesCharged, currencyCode)} / ${formatAmount(loan.summary?.penaltyChargesPaid, currencyCode)} / ${formatAmount(loan.summary?.penaltyChargesOutstanding, currencyCode)}`} />
                                <SummaryField label="Total Expected / Repaid / Outstanding" value={`${formatAmount(loan.summary?.totalRepaymentExpected, currencyCode)} / ${formatAmount(loan.summary?.totalRepayment, currencyCode)} / ${formatAmount(loan.summary?.totalOutstanding, currencyCode)}`} />
                                <SummaryField label="Days in Arrears" value={formatValue(loan.daysInArrears ?? loan.summary?.daysInArrears)} />
                            </SummarySection>

                            <SummarySection title="Terms">
                                <SummaryField label="Interest Rate / Period" value={formatValue(loan.interestRatePerPeriod)} />
                                <SummaryField label="Interest Method" value={formatValue(loan.interestType)} />
                                <SummaryField label="Interest Calculation" value={formatValue(loan.interestCalculationPeriodType)} />
                                <SummaryField label="Amortization" value={formatValue(loan.amortizationType)} />
                                <SummaryField label="Term" value={`${formatValue(loan.termFrequency)} x ${loan.termPeriodFrequencyType?.value || loan.termFrequencyType?.value || '-'}`} />
                                <SummaryField label="Repayment" value={`${formatValue(loan.repaymentEvery)} x ${loan.repaymentFrequencyType?.value || '-'}`} />
                            </SummarySection>

                            <SummarySection title="Lifecycle">
                                <SummaryField label="Submitted On" value={formatDisplayDate(loan.timeline?.submittedOnDate)} />
                                <SummaryField label="Approved On" value={formatDisplayDate(loan.timeline?.approvedOnDate)} />
                                <SummaryField label="Expected Disbursement" value={formatDisplayDate(loan.timeline?.expectedDisbursementDate)} />
                                <SummaryField label="Actual Disbursement" value={formatDisplayDate(loan.timeline?.actualDisbursementDate)} />
                                <SummaryField label="Maturity Date" value={formatDisplayDate(loan.timeline?.expectedMaturityDate || loan.timeline?.actualMaturityDate)} />
                            </SummarySection>
                        </div>
                    </Card>
                </div>

                {/* Schedule */}
                <div data-tab="schedule" className="space-y-4">
                    {!loan.repaymentSchedule ? (
                        <Card>Schedule not available.</Card>
                    ) : (
                        <ScheduleTable schedule={loan.repaymentSchedule}/>
                    )}
                </div>

                <div data-tab="charges" className="space-y-4">
                    {!isTerminal && (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setAddChargeOpen(true)}>Add Charge</Button>
                        </div>
                    )}
                    <div className="grid gap-4 xl:grid-cols-2">
                        <ChargeTable
                            title="Charges"
                            items={nonPenaltyCharges}
                            currency={currencyCode}
                            onAction={handleChargeAction}
                        />
                        <ChargeTable
                            title="Penalties"
                            items={penaltyCharges}
                            currency={currencyCode}
                            onAction={handleChargeAction}
                        />
                    </div>
                </div>

                <div data-tab="collaterals" className="space-y-4">
                    <LoanCollaterals loanId={id} />
                </div>

                {/* Transactions */}
                <div data-tab="transactions" className="space-y-4">
                    <Card>
                        {/* Filters + export */}
                        <div className="grid md:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-sm font-medium">From</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">To</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium">Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">All</option>
                                    <option value="repayment">Repayment</option>
                                    <option value="disbursement">Disbursement</option>
                                    <option value="waiver">Waiver</option>
                                    <option value="accrual">Accrual</option>
                                    <option value="charge">Charge</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mt-4 overflow-x-auto">
                            {!filteredTx.length ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400">No transactions.</div>
                            ) : (
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        <th className="py-2 pr-4">#</th>
                                        <th className="py-2 pr-4">Date</th>
                                        <th className="py-2 pr-4">Type</th>
                                        <th className="py-2 pr-4">Amount</th>
                                        <th className="py-2 pr-4">Running Balance</th>
                                        <th className="py-2 pr-4">Receipt / External ID</th>
                                        <th className="py-2 pr-4 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredTx.map((t) => (
                                        <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                            <td className="py-2 pr-4">{t.id}</td>
                                            <td className="py-2 pr-4">{txDateToISO(t.date)}</td>
                                            <td className="py-2 pr-4">{txTypeLabel(t.type)}</td>
                                            <td className="py-2 pr-4">{t.amount ?? t.amountPaid ?? '-'}</td>
                                            <td className="py-2 pr-4">{t.runningBalance ?? t.outstandingLoanBalance ?? '-'}</td>
                                            <td className="py-2 pr-4">{t.externalId ?? '-'}</td>
                                            <td className="py-2 pr-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="secondary" onClick={() => openTransactionDetail(t)}>
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => openAdjustTransaction(t)}
                                                        disabled={!t?.id || t?.manuallyReversed || t?.reversed}
                                                    >
                                                        Adjust
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </div>
            </Tabs>

            {/* Approve Modal */}
            <Modal
                open={approveOpen}
                title="Approve Loan"
                onClose={() => setApproveOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setApproveOpen(false)}>Cancel</Button>
                        <Button onClick={approve} disabled={approveBusy}>{approveBusy ? 'Approvingâ€¦' : 'Approve'}</Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Approved On *</label>
                        <input
                            type="date"
                            value={approveDate}
                            onChange={(e) => setApproveDate(e.target.value)}
                            min={isISODate(submittedOnDateISO) ? submittedOnDateISO : undefined}
                            max={dateISO()}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Approved Loan Amount (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={approvedLoanAmount}
                                onChange={(e) => setApprovedLoanAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. 500000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Expected Disbursement Date (optional)</label>
                            <input
                                type="date"
                                value={expectedDisbursementDate}
                                onChange={(e) => setExpectedDisbursementDate(e.target.value)}
                                min={isISODate(approveDate) ? approveDate : undefined}
                                max={isISODate(dueDateISO) ? dueDateISO : undefined}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <textarea
                            rows={3}
                            value={approveNote}
                            onChange={(e) => setApproveNote(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Modal>

            {/* Disburse Modal */}
            <Modal
                open={disburseOpen}
                title="Disburse Loan"
                onClose={() => setDisburseOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDisburseOpen(false)}>Cancel</Button>
                        <Button onClick={disburse} disabled={disburseBusy}>{disburseBusy ? 'Disbursingâ€¦' : 'Disburse'}</Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Disbursement Date *</label>
                        <input
                            type="date"
                            value={disburseDate}
                            onChange={(e) => setDisburseDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Transaction Amount (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={disburseAmount}
                                onChange={(e) => setDisburseAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. 500000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Fixed EMI Amount (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fixedEmiAmount}
                                onChange={(e) => setFixedEmiAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. 25000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Type</label>
                            <select
                                value={paymentTypeIdForDisburse}
                                onChange={(e) => setPaymentTypeIdForDisburse(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select</option>
                                {paymentTypeOptions.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Disburse to Savings Modal */}
            <Modal
                open={disburseSavOpen}
                title="Disburse Loan to Savings Account"
                onClose={() => setDisburseSavOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDisburseSavOpen(false)}>Cancel</Button>
                        <Button onClick={disburseToSavings} disabled={disburseSavBusy}>
                            {disburseSavBusy ? 'Disbursingâ€¦' : 'Disburse to Savings'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Disbursement Date *</label>
                        <input
                            type="date"
                            value={disburseSavDate}
                            onChange={(e) => setDisburseSavDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Transaction Amount (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={disburseSavAmount}
                                onChange={(e) => setDisburseSavAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. 500000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Fixed EMI Amount (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={disburseSavFixedEmi}
                                onChange={(e) => setDisburseSavFixedEmi(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. 25000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Type</label>
                            <select
                                value={paymentTypeIdForDisburseSav}
                                onChange={(e) => setPaymentTypeIdForDisburseSav(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select</option>
                                {paymentTypeOptions.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Repayment Modal */}
            <Modal
                open={repayOpen}
                title="Record Repayment"
                onClose={() => setRepayOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setRepayOpen(false)}>Cancel</Button>
                        <Button onClick={postRepayment} disabled={repayBusy}>
                            {repayBusy ? 'Postingâ€¦' : 'Post Repayment'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Amount *</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={repayAmount}
                            onChange={(e) => setRepayAmount(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g. 150000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Date *</label>
                        <input
                            type="date"
                            value={repayDate}
                            onChange={(e) => setRepayDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Payment Type</label>
                        <select
                            value={repayPaymentTypeId}
                            onChange={(e) => setRepayPaymentTypeId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select</option>
                            {paymentTypeOptions.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Receipt # (External ID)</label>
                        <input
                            value={repayReceipt}
                            onChange={(e) => setRepayReceipt(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g. RCPT-2025-0001"
                        />
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                open={rejectOpen}
                title="Reject Loan Application"
                onClose={() => setRejectOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button onClick={reject} disabled={rejectBusy}>
                            {rejectBusy ? 'Rejectingâ€¦' : 'Reject'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Rejected On *</label>
                        <input
                            type="date"
                            value={rejectedOnDate}
                            onChange={(e) => setRejectedOnDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <textarea
                            rows={3}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Reason for rejection"
                        />
                    </div>
                </div>
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                open={withdrawOpen}
                title="Applicant Withdraws from Application"
                onClose={() => setWithdrawOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
                        <Button onClick={withdraw} disabled={withdrawBusy}>
                            {withdrawBusy ? 'Withdrawingâ€¦' : 'Withdraw'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Withdrawn On *</label>
                        <input
                            type="date"
                            value={withdrawnOnDate}
                            onChange={(e) => setWithdrawnOnDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <textarea
                            rows={3}
                            value={withdrawNote}
                            onChange={(e) => setWithdrawNote(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Optional note"
                        />
                    </div>
                </div>
            </Modal>

            {/* Assign Officer Modal */}
            <Modal
                open={assignOpen}
                title="Assign Loan Officer"
                onClose={() => { setAssignOpen(false); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setAssignOpen(false); }}>
                            Close
                        </Button>
                        <Button onClick={assignOfficer} disabled={assignBusy}>
                            {assignBusy ? 'Assigningâ€¦' : 'Assign Officer'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Loan Officer *</label>
                            <select
                                value={loanOfficerId}
                                onChange={(e) => setLoanOfficerId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select officer</option>
                                {availableOfficers.map((o) => (
                                    <option key={o.id} value={o.id}>{o.displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Assignment Date *</label>
                            <input
                                type="date"
                                value={assignmentDate}
                                onChange={(e) => setAssignmentDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300">
                        Assign the selected loan officer from the chosen assignment date. When submitted successfully, the loan profile will show the updated officer.
                    </div>
                </div>
            </Modal>

            {/* Unassign Officer Modal */}
            <Modal
                open={unassignOpen}
                title="Unassign Loan Officer"
                onClose={() => setUnassignOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setUnassignOpen(false)}>Cancel</Button>
                        <Button onClick={unassignOfficer} disabled={unassignBusy}>
                            {unassignBusy ? 'Unassigningâ€¦' : 'Unassign'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Unassigned On *</label>
                        <input
                            type="date"
                            value={unassignedOnDate}
                            onChange={(e) => setUnassignedOnDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Modal>

            <LoanAdvancedActionModal
                open={advancedActionOpen}
                loanId={id}
                paymentTypeOptions={paymentTypeOptions}
                initialCommand={selectedCommand}
                onClose={() => setAdvancedActionOpen(false)}
                onDone={() => {
                    setAdvancedActionOpen(false);
                    fetchAll();
                }}
            />

            <Modal
                open={transactionDetailOpen}
                title={`Loan Transaction${selectedTransaction?.id ? ` #${selectedTransaction.id}` : ''}`}
                onClose={() => setTransactionDetailOpen(false)}
                footer={
                    <Button variant="secondary" onClick={() => setTransactionDetailOpen(false)}>
                        Close
                    </Button>
                }
            >
                {transactionDetailBusy ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Loading transaction details...</div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                            <div>
                                <div className="text-gray-500">Date</div>
                                <div className="font-medium">{txDateToISO(transactionDetail?.date || selectedTransaction?.date) || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Type</div>
                                <div className="font-medium">{txTypeLabel(transactionDetail?.type || selectedTransaction?.type)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Amount</div>
                                <div className="font-medium">{transactionDetail?.amount ?? selectedTransaction?.amount ?? selectedTransaction?.amountPaid ?? '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">External ID</div>
                                <div className="font-medium">{transactionDetail?.externalId ?? selectedTransaction?.externalId ?? '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Running Balance</div>
                                <div className="font-medium">{transactionDetail?.runningBalance ?? selectedTransaction?.runningBalance ?? selectedTransaction?.outstandingLoanBalance ?? '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Reversed</div>
                                <div className="font-medium">{transactionDetail?.manuallyReversed || transactionDetail?.reversed ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm mb-1">Raw Payload</div>
                            <pre className="max-h-80 overflow-auto rounded-md border p-3 text-xs dark:border-gray-600 dark:bg-gray-900">{JSON.stringify(transactionDetail || selectedTransaction || {}, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={adjustTransactionOpen}
                title={`Adjust Transaction${selectedTransaction?.id ? ` #${selectedTransaction.id}` : ''}`}
                onClose={() => setAdjustTransactionOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAdjustTransactionOpen(false)}>Cancel</Button>
                        <Button onClick={submitAdjustedTransaction} disabled={adjustTransactionBusy}>
                            {adjustTransactionBusy ? 'Adjusting...' : 'Adjust'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Transaction Date *</label>
                        <input
                            type="date"
                            value={adjustTransactionDate}
                            onChange={(e) => setAdjustTransactionDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Transaction Amount *</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={adjustTransactionAmount}
                            onChange={(e) => setAdjustTransactionAmount(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <textarea
                            rows={3}
                            value={adjustTransactionNote}
                            onChange={(e) => setAdjustTransactionNote(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Optional adjustment note"
                        />
                    </div>
                </div>
            </Modal>

            {/* Add Charge Modal */}
            <Modal
                open={addChargeOpen}
                title="Add Loan Charge"
                onClose={() => setAddChargeOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAddChargeOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCharge} disabled={addChargeBusy}>
                            {addChargeBusy ? 'Adding...' : 'Add Charge'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Charge *</label>
                        <select
                            value={selectedChargeId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedChargeId(id);
                                const opt = chargeOptions.find(o => String(o.id) === id);
                                if (opt) setAddChargeAmount(String(opt.amount || ''));
                            }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select a charge</option>
                            {chargeOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Amount *</label>
                        <input
                            type="number"
                            value={addChargeAmount}
                            onChange={(e) => setAddChargeAmount(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Due Date *</label>
                        <input
                            type="date"
                            value={addChargeDate}
                            onChange={(e) => setAddChargeDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Modal>

            {/* Waive/Pay Charge Modal */}
            <Modal
                open={chargeActionOpen}
                title={`${chargeActionType === 'waive' ? 'Waive' : 'Pay'} Loan Charge`}
                onClose={() => setChargeActionOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setChargeActionOpen(false)}>Cancel</Button>
                        <Button onClick={handleExecuteChargeAction} disabled={chargeActionBusy}>
                            {chargeActionBusy ? 'Processing...' : (chargeActionType === 'waive' ? 'Waive' : 'Pay')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="text-sm font-medium">
                        Charge: {selectedChargeForAction?.name}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Date *</label>
                        <input
                            type="date"
                            value={chargeActionDate}
                            onChange={(e) => setChargeActionDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Amount *</label>
                        <input
                            type="number"
                            value={chargeActionAmount}
                            onChange={(e) => setChargeActionAmount(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    {chargeActionType === 'pay' && (
                        <div>
                            <label className="block text-sm font-medium">Payment Type *</label>
                            <select
                                value={chargeActionPaymentType}
                                onChange={(e) => setChargeActionPaymentType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {paymentTypeOptions.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default LoanDetails;


