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

    // Approve/Disburse
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveBusy, setApproveBusy] = useState(false);
    const [approveNote, setApproveNote] = useState('');
    const [approveDate, setApproveDate] = useState(dateISO());

    const [disburseOpen, setDisburseOpen] = useState(false);
    const [disburseBusy, setDisburseBusy] = useState(false);
    const [disburseDate, setDisburseDate] = useState(dateISO());
    const [paymentTypeIdForDisburse, setPaymentTypeIdForDisburse] = useState('');

    // Repayment (Epic F1)
    const [repayOpen, setRepayOpen] = useState(false);
    const [repayBusy, setRepayBusy] = useState(false);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayDate, setRepayDate] = useState(dateISO());
    const [repayPaymentTypeId, setRepayPaymentTypeId] = useState('');
    const [repayReceipt, setRepayReceipt] = useState('');
    const [paymentTypeOptions, setPaymentTypeOptions] = useState([{ id: 1, name: 'Cash' }]); // fallback

    // Transactions filters (Epic F2)
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [typeFilter, setTypeFilter] = useState(''); // '' = all

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Loan with schedule
            const res = await api.get(`/loans/${id}`, { params: { associations: 'repaymentSchedule' } });
            setLoan(res.data);

            // Payment type options for transactions (via template)
            try {
                const t = await api.get(`/loans/${id}`, { params: { template: true } });
                const opts =
                    t?.data?.paymentTypeOptions ||
                    t?.data?.paymentTypeOptionsForRepayment ||
                    t?.data?.paymentTypeOptionsForDisbursement ||
                    [];
                if (Array.isArray(opts) && opts.length) {
                    setPaymentTypeOptions(opts.map((o) => ({
                        id: o.id ?? o.value ?? o.code,
                        name: o.name ?? o.value ?? o.code ?? `Type ${o.id}`,
                    })));
                    if (!repayPaymentTypeId) setRepayPaymentTypeId(String(opts[0]?.id ?? ''));
                    if (!paymentTypeIdForDisburse) setPaymentTypeIdForDisburse(String(opts[0]?.id ?? ''));
                }
            } catch {
                // keep fallback
            }

            // Transactions
            try {
                const t = await api.get(`/loans/${id}/transactions`);
                const items = Array.isArray(t.data) ? t.data : t.data?.pageItems || t.data?.transactions || [];
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

    // --- Actions: Approve / Disburse (existing) ---
    const approve = async () => {
        setApproveBusy(true);
        try {
            await api.post(`/loans/${id}?command=approve`, {
                approvedOnDate: approveDate,
                note: approveNote || undefined,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
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

    const disburse = async () => {
        setDisburseBusy(true);
        try {
            await api.post(`/loans/${id}?command=disburse`, {
                actualDisbursementDate: disburseDate,
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

    // --- Record Repayment (Epic F1) ---
    const canRecordRepayment = useMemo(() => {
        const code = loan?.status?.code || loan?.status?.value || '';
        return /active|disbursed/i.test(code); // allow while active
    }, [loan]);

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
                externalId: repayReceipt || undefined, // store receipt #
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            });
            addToast('Repayment posted', 'success');
            setRepayOpen(false);
            // refresh loan + schedule + transactions
            await fetchAll();
            // clear form
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

    // --- Transactions filters + CSV (Epic F2) ---
    const filteredTx = useMemo(() => {
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        const list = [...transactions].sort((a, b) => {
            // sort by date asc then id
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
        const csv = rows.map((r) =>
            r.map((cell) => {
                const s = String(cell ?? '');
                return `"${s.replace(/"/g, '""')}"`;
            }).join(',')
        ).join('\n');
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
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                        <Badge tone={statusTone(loan.status)}>{loan.status?.value || loan.status?.code || '-'}</Badge>
                        {loan.clientName ? <span>• {loan.clientName}</span> : null}
                        {loan.loanProductName ? <span>• {loan.loanProductName}</span> : null}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button
                        variant="secondary"
                        onClick={() => setApproveOpen(true)}
                        disabled={/approved|active|disbursed|closed/i.test(loan.status?.code || '')}
                    >
                        Approve
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setDisburseOpen(true)}
                        disabled={/active|disbursed|closed/i.test(loan.status?.code || '')}
                    >
                        Disburse
                    </Button>
                    <Button
                        onClick={() => setRepayOpen(true)}
                        disabled={!canRecordRepayment}
                    >
                        Record Repayment
                    </Button>
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
                                <div className="font-medium">{loan.principal || loan.approvedPrincipal || loan.proposedPrincipal || '-'}</div>
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
                        </div>
                    </Card>
                </div>

                {/* Schedule */}
                <div data-tab="schedule" className="space-y-4">
                    {!loan.repaymentSchedule ? (
                        <Card>Schedule not available.</Card>
                    ) : (
                        <ScheduleTable schedule={loan.repaymentSchedule} />
                    )}
                </div>

                {/* Transactions (Epic F2) */}
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
                        <label className="block text-sm font-medium">Approved On</label>
                        <input
                            type="date"
                            value={approveDate}
                            onChange={(e) => setApproveDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
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
                        <label className="block text-sm font-medium">Disbursement Date</label>
                        <input
                            type="date"
                            value={disburseDate}
                            onChange={(e) => setDisburseDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
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
            </Modal>

            {/* Repayment Modal (Epic F1) */}
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
        </div>
    );
};

export default LoanDetails;
