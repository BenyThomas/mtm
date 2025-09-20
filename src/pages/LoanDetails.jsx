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
import { useToast } from '../context/ToastContext';
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
    Loader2             // Busy spinner
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
    const [assignReqPreview, setAssignReqPreview] = useState(null);
    const [assignRespPreview, setAssignRespPreview] = useState(null);
    const [availableOfficers, setAvailableOfficers] = useState([]); // optional: populate from template if present

    const [unassignOpen, setUnassignOpen] = useState(false);
    const [unassignBusy, setUnassignBusy] = useState(false);
    const [unassignedOnDate, setUnassignedOnDate] = useState(dateISO());

    // Transactions filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [typeFilter, setTypeFilter] = useState(''); // '' = all

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Loan with schedule
            const res = await api.get(`/loans/${id}`, { params: { associations: 'repaymentSchedule' } });
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

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const statusTone = (s) => {
        const code = s?.code || s?.value || '';
        if (/approved/i.test(code)) return 'blue';
        if (/active|disbursed/i.test(code)) return 'green';
        if (/submitted|pending/i.test(code)) return 'yellow';
        if (/closed|writtenoff/i.test(code)) return 'gray';
        return 'gray';
    };

    // ---- Stage helpers (visibility rules) ----
    const statusCodeRaw = (loan?.status?.code || loan?.status?.value || '').toLowerCase();

    // Basic buckets (tuned for Fineract)
    const isSubmittedOnly = /submitted|pending/.test(statusCodeRaw); // before approval
    const isApprovedOnly =
        /approved/.test(statusCodeRaw) && !/active|disbursed/.test(statusCodeRaw);
    const isDisbursedActive = /active|disbursed/.test(statusCodeRaw);
    const isClosedLike = /closed|writtenoff|overpaid/.test(statusCodeRaw);

    // Optional timeline guards (safer than strings if your API returns them)
    const tl = loan?.timeline || {};
    const hasDisbursal =
        !!tl?.actualDisbursementDate || !!tl?.expectedDisbursementDate;

    // Officer presence (some payloads expose id or name)
    const hasOfficerAssigned = !!(loan?.loanOfficerId || loan?.loanOfficerName);

    // Final visibility rules
    const canApprove = isSubmittedOnly && !isClosedLike;
    const canUndoApproval = isApprovedOnly && !isClosedLike && !hasDisbursal;
    const canDisburse = isApprovedOnly && !isClosedLike;
    const canDisburseToSavings = isApprovedOnly && !isClosedLike;
    const canUndoDisbursal = isDisbursedActive && !isClosedLike;

    const canReject = isSubmittedOnly && !isClosedLike;
    const canWithdraw = isSubmittedOnly && !isClosedLike;

    const canAssignOfficer = !isClosedLike; // usually allowed anytime before close
    const canUnassignOfficer = !isClosedLike && hasOfficerAssigned;

    const canRecoverGuarantee = isDisbursedActive && !isClosedLike;

    // Repayment: allowed while Active/Disbursed
    const canRecordRepayment = useMemo(() => isDisbursedActive, [isDisbursedActive]);

    // --- Actions ---

    // Approve Loan Application
    const approve = async () => {
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

    // Assign a Loan Officer (with request/response preview)
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
        setAssignReqPreview(payload);
        setAssignRespPreview(null);
        try {
            const resp = await api.post(`/loans/${id}?command=assignLoanOfficer`, payload);
            setAssignRespPreview(resp?.data || { ok: true });
            addToast('Loan Officer assigned', 'success');
            await fetchAll();
        } catch (err) {
            const data = err?.response?.data;
            setAssignRespPreview(data || { error: true });
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

                {/* Stage-aware action buttons */}
                <div className="flex flex-wrap gap-2">
                    {/* Submitted → Approve / Reject / Withdraw */}
                    {canApprove && (
                        <Button
                            variant="secondary"
                            onClick={() => setApproveOpen(true)}
                            title="Approve"
                            aria-label="Approve"
                            className="p-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                        </Button>
                    )}
                    {canReject && (
                        <Button
                            variant="secondary"
                            onClick={() => setRejectOpen(true)}
                            title="Reject"
                            aria-label="Reject"
                            className="p-2"
                        >
                            <XCircle className="w-5 h-5" />
                        </Button>
                    )}
                    {canWithdraw && (
                        <Button
                            variant="secondary"
                            onClick={() => setWithdrawOpen(true)}
                            title="Withdraw"
                            aria-label="Withdraw"
                            className="p-2"
                        >
                            <UserX className="w-5 h-5" />
                        </Button>
                    )}

                    {/* Approved (not yet active) → Undo Approval / Disburse */}
                    {canUndoApproval && (
                        <Button
                            variant="secondary"
                            onClick={undoApproval}
                            title="Undo Approval"
                            aria-label="Undo Approval"
                            className="p-2"
                        >
                            {undoApprovalBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Undo2 className="w-5 h-5" />}
                        </Button>
                    )}
                    {canDisburse && (
                        <Button
                            variant="secondary"
                            onClick={() => setDisburseOpen(true)}
                            title="Disburse"
                            aria-label="Disburse"
                            className="p-2"
                        >
                            <Wallet className="w-5 h-5" />
                        </Button>
                    )}
                    {canDisburseToSavings && (
                        <Button
                            variant="secondary"
                            onClick={() => setDisburseSavOpen(true)}
                            title="Disburse to Savings"
                            aria-label="Disburse to Savings"
                            className="p-2"
                        >
                            <PiggyBank className="w-5 h-5" />
                        </Button>
                    )}

                    {/* Active/Disbursed → Undo Disbursal / Recover Guarantee / Repay */}
                    {canUndoDisbursal && (
                        <Button
                            variant="secondary"
                            onClick={undoDisbursal}
                            title="Undo Disbursal"
                            aria-label="Undo Disbursal"
                            className="p-2"
                        >
                            {undoDisbursalBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                        </Button>
                    )}
                    {canRecoverGuarantee && (
                        <Button
                            onClick={recoverGuarantee}
                            title="Recover Guarantee"
                            aria-label="Recover Guarantee"
                            className="p-2"
                        >
                            {recoverGuaranteeBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        </Button>
                    )}
                    {canRecordRepayment && (
                        <Button
                            onClick={() => setRepayOpen(true)}
                            title="Add Repayment"
                            aria-label="Add Repayment"
                            className="p-2"
                        >
                            <ReceiptText className="w-5 h-5" />
                        </Button>
                    )}

                    {/* Officer Assignment */}
                    {canAssignOfficer && (
                        <Button
                            variant="secondary"
                            onClick={() => setAssignOpen(true)}
                            title="Assign Officer"
                            aria-label="Assign Officer"
                            className="p-2"
                        >
                            <UserPlus className="w-5 h-5" />
                        </Button>
                    )}
                    {canUnassignOfficer && (
                        <Button
                            variant="secondary"
                            onClick={() => setUnassignOpen(true)}
                            title="Unassign Officer"
                            aria-label="Unassign Officer"
                            className="p-2"
                        >
                            <UserMinus className="w-5 h-5" />
                        </Button>
                    )}
                </div>

            </div>

            {/* Tabs */}
            <Tabs
                tabs={[
                    { key: 'summary', label: 'Summary' },
                    { key: 'schedule', label: 'Schedule' },
                    { key: 'transactions', label: 'Transactions' },
                ]}
            >
                {/* Summary */}
                <div data-tab="summary" className="space-y-4">
                    <Card>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-gray-500">Product</div>
                                <div className="font-medium">{loan.loanProductName}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Principal</div>
                                <div className="font-medium">
                                    {loan.principal || loan.approvedPrincipal || loan.proposedPrincipal || '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Interest Rate / Period</div>
                                <div className="font-medium">{loan.interestRatePerPeriod || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Term</div>
                                <div className="font-medium">
                                    {loan.termFrequency} × {loan.termPeriodFrequencyType?.value || loan.termFrequencyType?.value || ''}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Repayment</div>
                                <div className="font-medium">
                                    {loan.repaymentEvery} × {loan.repaymentFrequencyType?.value || ''}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Currency</div>
                                <div
                                    className="font-medium">{loan.summary?.currency?.code || loan.currency?.code || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Principal (Total / Paid / Outstanding)</div>
                                <div className="font-medium">
                                    {loan.summary?.totalPrincipal ?? '-'} / {loan.summary?.principalPaid ?? '-'} / {loan.summary?.principalOutstanding ?? '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Interest (Charged / Paid / Outstanding)</div>
                                <div className="font-medium">
                                    {loan.summary?.interestCharged ?? '-'} / {loan.summary?.interestPaid ?? '-'} / {loan.summary?.interestOutstanding ?? '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Total (Expected / Repaid / Outstanding)</div>
                                <div className="font-medium">
                                    {loan.summary?.totalRepaymentExpected ?? '-'} / {loan.summary?.totalRepayment ?? '-'} / {loan.summary?.totalOutstanding ?? '-'}
                                </div>
                            </div>
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
                        <Button onClick={approve} disabled={approveBusy}>{approveBusy ? 'Approving…' : 'Approve'}</Button>
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
                        <Button onClick={disburse} disabled={disburseBusy}>{disburseBusy ? 'Disbursing…' : 'Disburse'}</Button>
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
                            {disburseSavBusy ? 'Disbursing…' : 'Disburse to Savings'}
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
                            {repayBusy ? 'Posting…' : 'Post Repayment'}
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
                            {rejectBusy ? 'Rejecting…' : 'Reject'}
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
                            {withdrawBusy ? 'Withdrawing…' : 'Withdraw'}
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

            {/* Assign Officer Modal (with request/response preview) */}
            <Modal
                open={assignOpen}
                title="Assign Loan Officer"
                onClose={() => { setAssignOpen(false); setAssignReqPreview(null); setAssignRespPreview(null); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setAssignOpen(false); setAssignReqPreview(null); setAssignRespPreview(null); }}>
                            Close
                        </Button>
                        <Button onClick={assignOfficer} disabled={assignBusy}>
                            {assignBusy ? 'Assigning…' : 'Assign Officer'}
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

                    {/* Request + Response preview */}
                    {assignReqPreview && (
                        <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-500 mb-1">Request Body</div>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
{JSON.stringify(assignReqPreview, null, 2)}
              </pre>
                        </div>
                    )}
                    {assignRespPreview && (
                        <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-500 mb-1">Response</div>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
{JSON.stringify(assignRespPreview, null, 2)}
              </pre>
                        </div>
                    )}
                    {!assignReqPreview && !assignRespPreview && (
                        <p className="text-xs text-gray-500">Submit to see the request payload and server response.</p>
                    )}
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
                            {unassignBusy ? 'Unassigning…' : 'Unassign'}
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
        </div>
    );
};

export default LoanDetails;
