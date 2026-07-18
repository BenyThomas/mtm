import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BadgeDollarSign, Ban, CheckCircle, CreditCard, HandCoins, Lock, Pencil, Percent, PiggyBank, RefreshCw, RotateCcw, Shield, Undo2, Unlock, UserMinus, UserPlus, Wallet, XCircle } from 'lucide-react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Tabs from '../components/Tabs';
import ReversalHistory from '../components/ReversalHistory';
import ReversalModal from '../components/ReversalModal';
import { useToast } from '../context/ToastContext';

const ACCOUNT_TYPE_LOAN = 1;
const ACCOUNT_TYPE_SAVINGS = 2;
const fieldClass = 'mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800';
const dateISO = () => new Date().toISOString().slice(0, 10);

const statusTone = (s) => {
    const code = s?.code || s?.value || '';
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted|approved/i.test(code)) return 'yellow';
    return 'gray';
};
const parseError = (err, fallback) => err?.response?.data?.errors?.[0]?.defaultUserMessage || err?.response?.data?.defaultUserMessage || err?.response?.data?.message || fallback;
const firstNonBlank = (...values) => values.find((v) => v !== null && v !== undefined && String(v).trim() !== '')?.toString().trim() || '';
const nested = (root, key, childKey) => root?.[key] && typeof root[key] === 'object' ? root[key][childKey] : undefined;
const asDate = (value) => Array.isArray(value) && value.length >= 3 ? `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}` : firstNonBlank(value).slice(0, 10);
const compactReferencePart = (value, fallback = 'REF') => {
    const compact = String(value || '').replace(/[^A-Za-z0-9]/g, '');
    return compact || fallback;
};
const internalSavingsRepaymentReference = ({ loanId, savingsAccountId }) => {
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `SLR-${stamp}-L${compactReferencePart(loanId)}-S${compactReferencePart(savingsAccountId)}`;
};
const formatDate = (value) => asDate(value) || '-';
const formatAmount = (value, currency) => Number.isFinite(Number(value)) ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value))}${currency ? ` ${currency}` : ''}` : '-';
const formatValue = (value) => value === null || value === undefined || value === '' ? '-' : Array.isArray(value) ? value.join('-') : typeof value === 'object' ? value.value || value.code || value.name || value.displayName || '-' : String(value);
const toRows = (data) => Array.isArray(data) ? data : Array.isArray(data?.pageItems) ? data.pageItems : Array.isArray(data?.transactions) ? data.transactions : [];
const statusFlags = (status) => ({
    submitted: Boolean(status?.submittedAndPendingApproval) || /submitted|pending/i.test(status?.code || status?.value || ''),
    approved: Boolean(status?.approved) || /approved/i.test(status?.code || status?.value || ''),
    active: Boolean(status?.active) || (/active/i.test(status?.code || status?.value || '') && !/inactive/i.test(status?.code || status?.value || '')),
    closed: Boolean(status?.closed) || /closed/i.test(status?.code || status?.value || ''),
});
const Field = ({ label, children }) => <label className="block text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
const DetailField = ({ label, value, mono = false }) => <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div><div className={`mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{formatValue(value)}</div></div>;

const SavingsAccountDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [acc, setAcc] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [clientAccounts, setClientAccounts] = useState(null);
    const [reversalOpen, setReversalOpen] = useState(false);
    const [reversalHistoryKey, setReversalHistoryKey] = useState(0);
    const [commandModal, setCommandModal] = useState(null);
    const [commandBusy, setCommandBusy] = useState(false);
    const [commandForm, setCommandForm] = useState({});
    const [transactionModal, setTransactionModal] = useState(null);
    const [transactionBusy, setTransactionBusy] = useState(false);
    const [transactionForm, setTransactionForm] = useState({});
    const [loanTransferOpen, setLoanTransferOpen] = useState(false);
    const [loanTransferBusy, setLoanTransferBusy] = useState(false);
    const [loanTransferForm, setLoanTransferForm] = useState({ toAccountId: '', transferDate: dateISO(), transferAmount: '', transferDescription: 'Loan repayment from savings' });
    const [chargeModal, setChargeModal] = useState(null);
    const [chargeBusy, setChargeBusy] = useState(false);
    const [chargeForm, setChargeForm] = useState({});

    const load = async () => {
        setLoading(true);
        try { const res = await api.get(`/savingsaccounts/${id}`); setAcc(res.data); }
        catch (err) { setAcc(null); addToast(parseError(err, 'Failed to load savings account'), 'error'); }
        finally { setLoading(false); }
    };
    const loadTransactions = async () => { try { const res = await api.get(`/savingsaccounts/${id}/transactions`); setTransactions(toRows(res.data)); } catch { setTransactions([]); } };
    const loadTransfers = async () => {
        try {
            const res = await api.get('/accounttransfers', { params: { limit: 100 } });
            setTransfers(toRows(res.data).filter((item) => firstNonBlank(item.fromAccountId, nested(item, 'fromAccount', 'id')) === String(id) || firstNonBlank(item.toAccountId, nested(item, 'toAccount', 'id')) === String(id)));
        } catch { setTransfers([]); }
    };
    const loadClientAccounts = async (account = acc) => {
        const clientId = firstNonBlank(account?.clientId, nested(account, 'client', 'id'));
        if (!clientId) return setClientAccounts(null);
        try { const res = await api.get(`/clients/${clientId}/accounts`); setClientAccounts(res.data); } catch { setClientAccounts(null); }
    };
    const refreshAll = async () => { await load(); await Promise.all([loadTransactions(), loadTransfers()]); };

    useEffect(() => { load(); loadTransactions(); loadTransfers(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (acc) loadClientAccounts(acc); }, [acc?.id, acc?.clientId]); // eslint-disable-line react-hooks/exhaustive-deps

    const summary = useMemo(() => acc?.summary || acc || {}, [acc]);
    const currency = firstNonBlank(summary?.currency?.code, summary?.currencyCode, acc?.currency?.code, acc?.currencyCode);
    const balance = firstNonBlank(summary?.accountBalance, acc?.accountBalance, acc?.balance);
    const available = firstNonBlank(summary?.availableBalance, acc?.availableBalance, summary?.withdrawableBalance);
    const flags = useMemo(() => statusFlags(acc?.status), [acc?.status]);
    const clientId = firstNonBlank(acc?.clientId, nested(acc, 'client', 'id'));
    const officeId = firstNonBlank(acc?.officeId, acc?.clientOfficeId, nested(acc, 'office', 'id'));
    const loanAccounts = useMemo(() => {
        const rows = clientAccounts?.loanAccounts || clientAccounts?.loans || [];
        return Array.isArray(rows) ? rows.filter((loan) => !statusFlags(loan.status).closed) : [];
    }, [clientAccounts]);
    const accountActions = useMemo(() => {
        const actions = [];
        if (flags.submitted) {
            actions.push({ key: 'approve', label: 'Approve', icon: CheckCircle, dateField: 'approvedOnDate', dateLabel: 'Approved On' });
            actions.push({ key: 'reject', label: 'Reject', icon: XCircle, dateField: 'rejectedOnDate', dateLabel: 'Rejected On', note: true });
            actions.push({ key: 'withdraw', label: 'Withdraw Application', icon: Ban, dateField: 'withdrawnOnDate', dateLabel: 'Withdrawn On', note: true });
        }
        if (flags.approved) {
            actions.push({ key: 'activate', label: 'Activate', icon: Wallet, dateField: 'activatedOnDate', dateLabel: 'Activated On' });
            actions.push({ key: 'undoApproval', label: 'Undo Approval', icon: Undo2 });
        }
        if (flags.active) {
            actions.push({ key: 'close', label: 'Close', icon: XCircle, dateField: 'closedOnDate', dateLabel: 'Closed On', close: true, note: true });
            actions.push({ key: 'calculateInterest', label: 'Calculate Interest', icon: Percent });
            actions.push({ key: 'postInterest', label: 'Post Interest', icon: BadgeDollarSign });
            actions.push({ key: 'updateWithHoldTax', label: 'Update Withholding Tax', icon: Shield, withholdTax: true });
            actions.push({ key: 'block', label: 'Block Account', icon: Lock });
            actions.push({ key: 'unblock', label: 'Unblock Account', icon: Unlock });
            actions.push({ key: 'blockCredit', label: 'Block Credit', icon: Lock });
            actions.push({ key: 'unblockCredit', label: 'Unblock Credit', icon: Unlock });
            actions.push({ key: 'blockDebit', label: 'Block Debit', icon: Lock });
            actions.push({ key: 'unblockDebit', label: 'Unblock Debit', icon: Unlock });
            actions.push({ key: 'assignSavingsOfficer', label: 'Assign Officer', icon: UserPlus, officer: 'assign' });
            actions.push({ key: 'unassignSavingsOfficer', label: 'Unassign Officer', icon: UserMinus, officer: 'unassign' });
        }
        return actions;
    }, [flags]);

    const openCommand = (action) => {
        setCommandModal(action);
        setCommandForm({ [action.dateField || 'actionDate']: dateISO(), note: '', withdrawBalance: false, paymentTypeId: '', toSavingsOfficerId: '', fromSavingsOfficerId: acc?.fieldOfficerId || acc?.savingsOfficerId || '', withHoldTax: Boolean(acc?.withHoldTax), taxGroupId: firstNonBlank(acc?.taxGroup?.id, acc?.taxGroupId) });
    };
    const submitCommand = async () => {
        if (!commandModal) return;
        const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
        if (commandModal.dateField) payload[commandModal.dateField] = commandForm[commandModal.dateField] || dateISO();
        if (commandModal.note && commandForm.note?.trim()) payload.note = commandForm.note.trim();
        if (commandModal.close) {
            payload.withdrawBalance = Boolean(commandForm.withdrawBalance);
            if (commandForm.paymentTypeId) payload.paymentTypeId = Number(commandForm.paymentTypeId);
            ['accountNumber', 'checkNumber', 'routingCode', 'receiptNumber', 'bankNumber'].forEach((key) => { if (commandForm[key]?.trim()) payload[key] = commandForm[key].trim(); });
        }
        if (commandModal.officer === 'assign') {
            if (!commandForm.toSavingsOfficerId) return addToast('Savings officer ID is required', 'error');
            payload.assignmentDate = commandForm.assignmentDate || dateISO();
            payload.toSavingsOfficerId = Number(commandForm.toSavingsOfficerId);
            if (commandForm.fromSavingsOfficerId) payload.fromSavingsOfficerId = Number(commandForm.fromSavingsOfficerId);
        }
        if (commandModal.officer === 'unassign') payload.unassignedDate = commandForm.unassignedDate || dateISO();
        if (commandModal.withholdTax) {
            payload.withHoldTax = Boolean(commandForm.withHoldTax);
            if (payload.withHoldTax && !commandForm.taxGroupId) return addToast('Tax group ID is required when withholding tax is enabled', 'error');
            if (commandForm.taxGroupId) payload.taxGroupId = Number(commandForm.taxGroupId);
        }
        setCommandBusy(true);
        try {
            if (commandModal.withholdTax) {
                await api.put(`/savingsaccounts/${id}?command=updateWithHoldTax`, payload);
            } else {
                await api.post(`/savingsaccounts/${id}?command=${encodeURIComponent(commandModal.key)}`, payload);
            }
            addToast(`${commandModal.label} posted`, 'success');
            setCommandModal(null);
            await refreshAll();
        } catch (err) { addToast(parseError(err, `${commandModal.label} failed`), 'error'); }
        finally { setCommandBusy(false); }
    };

    const openTransaction = (type, tx = null) => {
        setTransactionModal({ type, tx });
        setTransactionForm({ transactionDate: asDate(tx?.date || tx?.transactionDate) || dateISO(), transactionAmount: type === 'modify' ? firstNonBlank(tx?.amount, tx?.transactionAmount) : '', paymentTypeId: firstNonBlank(tx?.paymentDetailData?.paymentType?.id, tx?.paymentTypeId), externalId: firstNonBlank(tx?.externalId), note: '' });
    };
    const submitTransaction = async () => {
        if (!transactionModal) return;
        const { type, tx } = transactionModal;
        const amountRequired = ['deposit', 'withdrawal', 'modify'].includes(type);
        if (amountRequired && (!transactionForm.transactionAmount || Number(transactionForm.transactionAmount) <= 0)) return addToast('Enter a valid amount', 'error');
        if (['deposit', 'withdrawal'].includes(type) && !transactionForm.paymentTypeId) return addToast('Payment Type ID is required', 'error');
        const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
        if (amountRequired) {
            payload.transactionDate = transactionForm.transactionDate || dateISO();
            payload.transactionAmount = Number(transactionForm.transactionAmount);
            if (transactionForm.paymentTypeId) payload.paymentTypeId = Number(transactionForm.paymentTypeId);
            if (transactionForm.externalId?.trim()) payload.externalId = transactionForm.externalId.trim();
        }
        if (transactionForm.note?.trim()) payload.note = transactionForm.note.trim();
        setTransactionBusy(true);
        try {
            const accountLevel = type === 'deposit' || type === 'withdrawal';
            const path = accountLevel ? `/savingsaccounts/${id}/transactions?command=${encodeURIComponent(type)}` : `/savingsaccounts/${id}/transactions/${tx.id}?command=${encodeURIComponent(type)}`;
            await api.post(path, payload);
            addToast('Savings transaction posted', 'success');
            setTransactionModal(null);
            await refreshAll();
        } catch (err) { addToast(parseError(err, 'Savings transaction failed'), 'error'); }
        finally { setTransactionBusy(false); }
    };

    const selectedLoan = loanAccounts.find((loan) => String(loan.id || loan.accountId) === String(loanTransferForm.toAccountId));
    const submitLoanTransfer = async () => {
        if (!loanTransferForm.toAccountId) return addToast('Select or enter a loan account', 'error');
        if (!loanTransferForm.transferAmount || Number(loanTransferForm.transferAmount) <= 0) return addToast('Enter a valid repayment amount', 'error');
        const toOfficeId = firstNonBlank(selectedLoan?.officeId, selectedLoan?.clientOfficeId, nested(selectedLoan, 'office', 'id'), officeId);
        const transferExternalId = internalSavingsRepaymentReference({ loanId: loanTransferForm.toAccountId, savingsAccountId: id });
        const payload = {
            locale: 'en', dateFormat: 'yyyy-MM-dd',
            fromOfficeId: officeId ? Number(officeId) : undefined,
            fromClientId: clientId ? Number(clientId) : undefined,
            fromAccountType: ACCOUNT_TYPE_SAVINGS,
            fromAccountId: Number(id),
            toOfficeId: toOfficeId ? Number(toOfficeId) : undefined,
            toClientId: clientId ? Number(clientId) : undefined,
            toAccountType: ACCOUNT_TYPE_LOAN,
            toAccountId: Number(loanTransferForm.toAccountId),
            transferDate: loanTransferForm.transferDate || dateISO(),
            transferAmount: Number(loanTransferForm.transferAmount),
            externalId: transferExternalId,
            transferDescription: loanTransferForm.transferDescription?.trim() || 'Loan repayment from savings',
        };
        Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
        setLoanTransferBusy(true);
        try {
            await api.post('/accounttransfers', payload);
            addToast('Loan repayment from savings posted', 'success');
            setLoanTransferOpen(false);
            setLoanTransferForm((prev) => ({ ...prev, toAccountId: '', transferAmount: '' }));
            await refreshAll();
        } catch (err) { addToast(parseError(err, 'Loan repayment from savings failed'), 'error'); }
        finally { setLoanTransferBusy(false); }
    };

    const openCharge = (type, charge) => {
        setChargeModal({ type, charge });
        setChargeForm({ dueDate: asDate(charge?.dueDate) || dateISO(), amount: firstNonBlank(charge?.amountOutstanding, charge?.amount), paymentTypeId: '' });
    };
    const submitCharge = async () => {
        if (!chargeModal?.charge?.id) return;
        const command = chargeModal.type === 'waive' ? 'waive' : 'paycharge';
        const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
        if (chargeModal.type === 'pay') {
            payload.dueDate = chargeForm.dueDate || dateISO();
            if (chargeForm.amount) payload.amount = Number(chargeForm.amount);
            if (chargeForm.paymentTypeId) payload.paymentTypeId = Number(chargeForm.paymentTypeId);
        }
        setChargeBusy(true);
        try {
            await api.post(`/savingsaccounts/${id}/charges/${chargeModal.charge.id}?command=${command}`, payload);
            addToast(chargeModal.type === 'waive' ? 'Charge waived' : 'Charge paid', 'success');
            setChargeModal(null);
            await refreshAll();
        } catch (err) { addToast(parseError(err, 'Charge action failed'), 'error'); }
        finally { setChargeBusy(false); }
    };

    if (loading) return <div className="space-y-6"><Skeleton height="2rem" width="40%" /><Card><Skeleton height="10rem" /></Card></div>;
    if (!acc) return <div className="space-y-6"><h1 className="text-2xl font-bold">Savings Account</h1><Card>Account not found.</Card></div>;
    const charges = Array.isArray(acc.charges) ? acc.charges : [];
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Savings #{acc.id} {acc.accountNo ? `- ${acc.accountNo}` : ''}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        {acc.status ? <Badge tone={statusTone(acc.status)}>{acc.status?.value || acc.status?.code}</Badge> : null}
                        {acc.clientName ? <span>{acc.clientName}</span> : null}
                        {acc.savingsProductName ? <span>{acc.savingsProductName}</span> : null}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => openTransaction('deposit')} disabled={flags.closed}><Wallet size={16} /> Deposit</Button>
                    <Button variant="secondary" onClick={() => openTransaction('withdrawal')} disabled={!flags.active}><HandCoins size={16} /> Withdraw</Button>
                    <Button variant="secondary" onClick={() => setLoanTransferOpen(true)} disabled={!flags.active}><PiggyBank size={16} /> Pay Loan</Button>
                    <Button variant="secondary" onClick={refreshAll}><RefreshCw size={16} /> Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <DetailField label="Product" value={acc.savingsProductName || acc.productName} />
                    <DetailField label="Currency" value={currency} />
                    <DetailField label="Account Balance" value={balance ? `${balance} ${currency}` : '-'} />
                    <DetailField label="Available Balance" value={available ? `${available} ${currency}` : '-'} />
                    <DetailField label="Nominal Annual Interest" value={firstNonBlank(acc?.nominalAnnualInterestRate, acc?.interestRate)} />
                    <DetailField label="Client ID" value={clientId} mono />
                    <DetailField label="Office ID" value={officeId} mono />
                    <DetailField label="Minimum Required Balance" value={acc.minRequiredBalance} />
                </div>
            </Card>

            <Tabs initial={searchParams.get('tab') || 'overview'} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'actions', label: 'Actions' }, { key: 'transactions', label: 'Transactions' }, { key: 'transfers', label: 'Transfers & Loans' }, { key: 'charges', label: 'Charges' }, { key: 'reversals', label: 'Reversals' }]}>
                <div data-tab="overview" className="space-y-4">
                    <Card><div className="grid gap-4 text-sm md:grid-cols-3">
                        <DetailField label="Status" value={acc.status?.value || acc.status?.code} />
                        <DetailField label="Submitted On" value={formatDate(acc.timeline?.submittedOnDate || acc.submittedOnDate)} />
                        <DetailField label="Approved On" value={formatDate(acc.timeline?.approvedOnDate || acc.approvedOnDate)} />
                        <DetailField label="Activated On" value={formatDate(acc.timeline?.activatedOnDate || acc.activatedOnDate)} />
                        <DetailField label="Closed On" value={formatDate(acc.timeline?.closedOnDate || acc.closedOnDate)} />
                        <DetailField label="Savings Officer" value={acc.fieldOfficerName || acc.savingsOfficerName || acc.fieldOfficerId || acc.savingsOfficerId} />
                        <DetailField label="Interest Compounding" value={acc.interestCompoundingPeriodType} />
                        <DetailField label="Interest Posting" value={acc.interestPostingPeriodType} />
                        <DetailField label="Account Blocked" value={acc.accountBlocked === true ? 'Yes' : 'No'} />
                    </div></Card>
                </div>

                <div data-tab="actions" className="space-y-4">
                    <Card>
                        <div className="mb-3 text-sm font-semibold">Savings Account Actions</div>
                        {accountActions.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{accountActions.map((action) => { const Icon = action.icon || Shield; return <Button key={action.key} variant="secondary" className="justify-start" onClick={() => openCommand(action)}><Icon size={16} /> {action.label}</Button>; })}</div> : <div className="text-sm text-slate-600 dark:text-slate-300">No state-specific actions are currently available for this account status.</div>}
                    </Card>
                </div>

                <div data-tab="transactions" className="space-y-4">
                    <Card>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold">Transactions</div><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => openTransaction('deposit')} disabled={flags.closed}><Wallet size={15} /> Deposit</Button><Button size="sm" variant="secondary" onClick={() => openTransaction('withdrawal')} disabled={!flags.active}><HandCoins size={15} /> Withdraw</Button></div></div>
                        {!transactions.length ? <div className="text-sm text-slate-600 dark:text-slate-300">No transactions found.</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Running Balance</th><th className="py-2 pr-4 text-right">Actions</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id || `${tx.transactionDate}-${tx.amount}`} className="border-t border-slate-200 dark:border-slate-700"><td className="py-2 pr-4">{formatDate(tx.date || tx.transactionDate)}</td><td className="py-2 pr-4">{tx.transactionType?.value || tx.type?.value || tx.type || '-'}</td><td className="py-2 pr-4">{formatAmount(tx.amount || tx.transactionAmount, currency)}</td><td className="py-2 pr-4">{formatAmount(tx.runningBalance, currency)}</td><td className="py-2 text-right"><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => openTransaction('modify', tx)}><Pencil size={14} /> Modify</Button><Button size="sm" variant="ghost" onClick={() => openTransaction('undo', tx)}><Undo2 size={14} /> Undo</Button><Button size="sm" variant="ghost" onClick={() => openTransaction('holdAmount', tx)}><Lock size={14} /> Hold</Button><Button size="sm" variant="ghost" onClick={() => openTransaction('releaseAmount', tx)}><Unlock size={14} /> Release</Button></div></td></tr>)}</tbody></table></div>}
                    </Card>
                </div>

                <div data-tab="transfers" className="space-y-4">
                    <Card>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-semibold">Pay Loan From Savings</div><div className="text-xs text-slate-500">Posts a Fineract account transfer from savings account type 2 to loan account type 1.</div></div><Button size="sm" onClick={() => setLoanTransferOpen(true)} disabled={!flags.active}><PiggyBank size={15} /> New Loan Payment</Button></div>
                        {loanAccounts.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{loanAccounts.map((loan) => <div key={loan.id || loan.accountId} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><div className="font-semibold">{loan.productName || loan.loanProductName || 'Loan Account'}</div><div className="mt-1 text-slate-600 dark:text-slate-300">#{loan.id || loan.accountId} {loan.accountNo ? `- ${loan.accountNo}` : ''}</div><div className="mt-1">{formatValue(loan.status)}</div></div>)}</div> : <div className="text-sm text-slate-600 dark:text-slate-300">No loan accounts were returned for this savings account client. You can still enter a loan account ID manually in the payment modal.</div>}
                    </Card>
                    <Card><div className="mb-3 text-sm font-semibold">Recent Account Transfers</div>{!transfers.length ? <div className="text-sm text-slate-600 dark:text-slate-300">No recent transfers found for this account.</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Reference</th><th className="py-2 pr-4">From</th><th className="py-2 pr-4">To</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Description</th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.id || transfer.resourceId || `${transfer.transferDate}-${transfer.amount}`} className="border-t border-slate-200 dark:border-slate-700"><td className="py-2 pr-4">{formatDate(transfer.transferDate || transfer.date)}</td><td className="py-2 pr-4 font-mono">{formatValue(transfer.externalId || transfer.reference)}</td><td className="py-2 pr-4">{formatValue(transfer.fromAccount || transfer.fromAccountId)}</td><td className="py-2 pr-4">{formatValue(transfer.toAccount || transfer.toAccountId)}</td><td className="py-2 pr-4">{formatAmount(transfer.transferAmount || transfer.amount, currency)}</td><td className="py-2 pr-4">{transfer.transferDescription || transfer.description || '-'}</td></tr>)}</tbody></table></div>}</Card>
                </div>

                <div data-tab="charges" className="space-y-4">
                    <Card><div className="mb-3 text-sm font-semibold">Savings Charges</div>{!charges.length ? <div className="text-sm text-slate-600 dark:text-slate-300">No charges found.</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Due</th><th className="py-2 pr-4">Paid</th><th className="py-2 pr-4">Waived</th><th className="py-2 pr-4">Outstanding</th><th className="py-2 pr-4 text-right">Actions</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id || charge.name} className="border-t border-slate-200 dark:border-slate-700"><td className="py-2 pr-4">{charge.name || '-'}</td><td className="py-2 pr-4">{formatAmount(charge.amount || charge.amountOrPercentage, currency)}</td><td className="py-2 pr-4">{formatAmount(charge.amountPaid, currency)}</td><td className="py-2 pr-4">{formatAmount(charge.amountWaived, currency)}</td><td className="py-2 pr-4">{formatAmount(charge.amountOutstanding, currency)}</td><td className="py-2 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => openCharge('pay', charge)} disabled={!charge.amountOutstanding}><CreditCard size={14} /> Pay</Button><Button size="sm" variant="ghost" onClick={() => openCharge('waive', charge)} disabled={!charge.amountOutstanding}><RotateCcw size={14} /> Waive</Button></div></td></tr>)}</tbody></table></div>}</Card>
                </div>

                <div data-tab="reversals" className="space-y-4"><div className="flex justify-end"><Button variant="secondary" onClick={() => setReversalOpen(true)}><Undo2 size={16} /> Reverse Transaction</Button></div><ReversalHistory scope="SAVINGS" fineractEntityId={String(id)} refreshKey={reversalHistoryKey} /></div>
            </Tabs>
            <Modal open={Boolean(commandModal)} title={commandModal?.label || 'Savings Action'} onClose={() => setCommandModal(null)} size="lg" footer={<><Button variant="secondary" onClick={() => setCommandModal(null)} disabled={commandBusy}>Cancel</Button><Button onClick={submitCommand} disabled={commandBusy}>{commandBusy ? 'Posting...' : 'Post Action'}</Button></>}>
                <div className="grid gap-4">
                    {commandModal?.dateField ? <Field label={commandModal.dateLabel || 'Date'}><input type="date" className={fieldClass} value={commandForm[commandModal.dateField] || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, [commandModal.dateField]: e.target.value }))} /></Field> : null}
                    {commandModal?.officer === 'assign' ? <div className="grid gap-4 md:grid-cols-2"><Field label="Assignment Date"><input type="date" className={fieldClass} value={commandForm.assignmentDate || dateISO()} onChange={(e) => setCommandForm((prev) => ({ ...prev, assignmentDate: e.target.value }))} /></Field><Field label="To Savings Officer ID"><input className={fieldClass} value={commandForm.toSavingsOfficerId || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, toSavingsOfficerId: e.target.value }))} /></Field><Field label="From Savings Officer ID"><input className={fieldClass} value={commandForm.fromSavingsOfficerId || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, fromSavingsOfficerId: e.target.value }))} /></Field></div> : null}
                    {commandModal?.officer === 'unassign' ? <Field label="Unassigned Date"><input type="date" className={fieldClass} value={commandForm.unassignedDate || dateISO()} onChange={(e) => setCommandForm((prev) => ({ ...prev, unassignedDate: e.target.value }))} /></Field> : null}
                    {commandModal?.close ? <div className="grid gap-4 md:grid-cols-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(commandForm.withdrawBalance)} onChange={(e) => setCommandForm((prev) => ({ ...prev, withdrawBalance: e.target.checked }))} />Withdraw remaining balance</label><Field label="Payment Type ID"><input className={fieldClass} value={commandForm.paymentTypeId || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, paymentTypeId: e.target.value }))} /></Field>{['accountNumber', 'checkNumber', 'routingCode', 'receiptNumber', 'bankNumber'].map((field) => <Field key={field} label={field}><input className={fieldClass} value={commandForm[field] || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Field>)}</div> : null}
                    {commandModal?.withholdTax ? <div className="grid gap-4 md:grid-cols-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(commandForm.withHoldTax)} onChange={(e) => setCommandForm((prev) => ({ ...prev, withHoldTax: e.target.checked }))} />Withhold tax</label><Field label="Tax Group ID"><input className={fieldClass} value={commandForm.taxGroupId || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, taxGroupId: e.target.value }))} /></Field></div> : null}
                    {commandModal?.note ? <Field label="Note"><textarea className={fieldClass} rows={3} value={commandForm.note || ''} onChange={(e) => setCommandForm((prev) => ({ ...prev, note: e.target.value }))} /></Field> : null}
                </div>
            </Modal>

            <Modal open={Boolean(transactionModal)} title={transactionModal?.type === 'withdrawal' ? 'Withdraw From Savings' : transactionModal?.type === 'deposit' ? 'Deposit To Savings' : 'Transaction Action'} onClose={() => setTransactionModal(null)} size="lg" footer={<><Button variant="secondary" onClick={() => setTransactionModal(null)} disabled={transactionBusy}>Cancel</Button><Button onClick={submitTransaction} disabled={transactionBusy}>{transactionBusy ? 'Posting...' : 'Submit'}</Button></>}>
                <div className="grid gap-4 md:grid-cols-2">
                    {['deposit', 'withdrawal', 'modify'].includes(transactionModal?.type) ? <><Field label="Transaction Date"><input type="date" className={fieldClass} value={transactionForm.transactionDate || ''} onChange={(e) => setTransactionForm((prev) => ({ ...prev, transactionDate: e.target.value }))} /></Field><Field label="Amount"><input type="number" min="0" step="0.01" className={fieldClass} value={transactionForm.transactionAmount || ''} onChange={(e) => setTransactionForm((prev) => ({ ...prev, transactionAmount: e.target.value }))} /></Field><Field label="Payment Type ID"><input className={fieldClass} value={transactionForm.paymentTypeId || ''} onChange={(e) => setTransactionForm((prev) => ({ ...prev, paymentTypeId: e.target.value }))} /></Field><Field label="External ID"><input className={fieldClass} value={transactionForm.externalId || ''} onChange={(e) => setTransactionForm((prev) => ({ ...prev, externalId: e.target.value }))} /></Field></> : null}
                    <div className="md:col-span-2"><Field label="Note"><textarea className={fieldClass} rows={3} value={transactionForm.note || ''} onChange={(e) => setTransactionForm((prev) => ({ ...prev, note: e.target.value }))} /></Field></div>
                </div>
            </Modal>

            <Modal open={loanTransferOpen} title="Pay Loan From Savings" onClose={() => setLoanTransferOpen(false)} size="lg" footer={<><Button variant="secondary" onClick={() => setLoanTransferOpen(false)} disabled={loanTransferBusy}>Cancel</Button><Button onClick={submitLoanTransfer} disabled={loanTransferBusy}>{loanTransferBusy ? 'Posting...' : 'Post Loan Payment'}</Button></>}>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Loan Account">{loanAccounts.length ? <select className={fieldClass} value={loanTransferForm.toAccountId} onChange={(e) => setLoanTransferForm((prev) => ({ ...prev, toAccountId: e.target.value }))}><option value="">Select loan account</option>{loanAccounts.map((loan) => <option key={loan.id || loan.accountId} value={loan.id || loan.accountId}>#{loan.id || loan.accountId} {loan.accountNo ? `- ${loan.accountNo}` : ''} {loan.productName || loan.loanProductName ? `- ${loan.productName || loan.loanProductName}` : ''}</option>)}</select> : <input className={fieldClass} value={loanTransferForm.toAccountId} onChange={(e) => setLoanTransferForm((prev) => ({ ...prev, toAccountId: e.target.value }))} placeholder="Loan account ID" />}</Field>
                    <Field label="Amount"><input type="number" min="0" step="0.01" className={fieldClass} value={loanTransferForm.transferAmount} onChange={(e) => setLoanTransferForm((prev) => ({ ...prev, transferAmount: e.target.value }))} /></Field>
                    <Field label="Transfer Date"><input type="date" className={fieldClass} value={loanTransferForm.transferDate} onChange={(e) => setLoanTransferForm((prev) => ({ ...prev, transferDate: e.target.value }))} /></Field>
                    <Field label="Description"><input className={fieldClass} value={loanTransferForm.transferDescription} onChange={(e) => setLoanTransferForm((prev) => ({ ...prev, transferDescription: e.target.value }))} /></Field>
                    <div className="md:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">From savings account #{id} to loan account using Fineract account transfer. The customer API also exposes /me/savings/{'{savingsAccountId}'}/loan-repayments with ownership and idempotency checks.</div>
                </div>
            </Modal>

            <Modal open={Boolean(chargeModal)} title={chargeModal?.type === 'waive' ? 'Waive Savings Charge' : 'Pay Savings Charge'} onClose={() => setChargeModal(null)} size="md" footer={<><Button variant="secondary" onClick={() => setChargeModal(null)} disabled={chargeBusy}>Cancel</Button><Button onClick={submitCharge} disabled={chargeBusy}>{chargeBusy ? 'Posting...' : 'Submit'}</Button></>}>
                {chargeModal?.type === 'pay' ? <div className="grid gap-4"><Field label="Due Date"><input type="date" className={fieldClass} value={chargeForm.dueDate || ''} onChange={(e) => setChargeForm((prev) => ({ ...prev, dueDate: e.target.value }))} /></Field><Field label="Amount"><input type="number" min="0" step="0.01" className={fieldClass} value={chargeForm.amount || ''} onChange={(e) => setChargeForm((prev) => ({ ...prev, amount: e.target.value }))} /></Field><Field label="Payment Type ID"><input className={fieldClass} value={chargeForm.paymentTypeId || ''} onChange={(e) => setChargeForm((prev) => ({ ...prev, paymentTypeId: e.target.value }))} /></Field></div> : <div className="text-sm text-slate-600 dark:text-slate-300">This will waive the selected outstanding savings charge.</div>}
            </Modal>

            <ReversalModal open={reversalOpen} scope="SAVINGS" defaults={{ command: 'undo', fineractEntityId: String(id) }} commandOptions={[{ value: 'undo', label: 'Undo transaction' }, { value: 'reverse', label: 'Reverse transaction' }]} onClose={() => setReversalOpen(false)} onDone={async () => { setReversalHistoryKey((current) => current + 1); await refreshAll(); }} />
        </div>
    );
};

export default SavingsAccountDetails;
