import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import MiniCombobox from '../../components/MiniCombobox';
import { useToast } from '../../context/ToastContext';
import { getUserTemplate } from '../../api/users';
import { generateCollectionSheet, saveCollectionSheet } from '../../api/collectionSheet';
import { CalendarDays, Building2, RefreshCw, Save, CheckCircle2 } from 'lucide-react';

const numberOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const dateToYYYYMMDD = (d) => {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const CollectionSheet = () => {
    const { addToast } = useToast();

    // filters
    const [officeOpts, setOfficeOpts] = useState([]);           // {id,label}[]
    const [officeId, setOfficeId]   = useState(null);
    const [meetingDate, setMeetingDate] = useState(dateToYYYYMMDD(new Date()));

    // data
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(null);           // raw response (whatever server returns)
    const [rowsLoans, setRowsLoans] = useState([]);             // editable repayments
    const [rowsSavings, setRowsSavings] = useState([]);         // editable savings
    const [q, setQ] = useState('');                             // search across client/loan fields

    // save modal
    const [saveOpen, setSaveOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // load offices from users template
    useEffect(() => {
        (async () => {
            try {
                const tpl = await getUserTemplate();
                const offices = (tpl.allowedOffices || []).map(o => ({ id: o.id, label: o.name || `Office ${o.id}` }));
                setOfficeOpts(offices);
                if (!officeId && offices.length) setOfficeId(offices[0].id);
            } catch {
                // swallow; show empty
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generate = async () => {
        if (!officeId || !meetingDate) {
            addToast('Select office and meeting date', 'error'); return;
        }
        setLoading(true);
        setGenerated(null);
        try {
            const data = await generateCollectionSheet({
                officeId: Number(officeId),
                transactionDate: meetingDate,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
            });

            // Heuristics: normalize arrays for editing—backends differ in shape; map common fields
            const loans = (data?.loans || data?.loanTransactions || data?.bulkRepaymentTransactions || [])
                .map((x, idx) => ({
                    // ids
                    loanId: x.loanId ?? x.id ?? x.loan?.id ?? idx,
                    clientName: x.clientName || x.client?.displayName || x.client || '',
                    // expected amounts
                    dueAmount: numberOrNull(x.amountDue || x.totalDue || x.installmentAmount) ?? 0,
                    // editable amount to pay (defaulting to due)
                    transactionAmount: numberOrNull(x.transactionAmount ?? x.amountPaid ?? x.amount ?? x.amountDue) ?? 0,
                    // payment meta (optional)
                    paymentTypeId: x.paymentTypeId ?? '',
                    receiptNumber: x.receiptNumber || '',
                    accountNumber: x.accountNumber || '',
                    routingCode: x.routingCode || '',
                    bankNumber: x.bankNumber || '',
                    checkNumber: x.checkNumber || '',
                }));

            const savings = (data?.savings || data?.savingsDue || data?.bulkSavingsDueTransactions || [])
                .map((x, idx) => ({
                    savingsId: x.savingsId ?? x.id ?? x.savings?.id ?? idx,
                    clientName: x.clientName || x.client?.displayName || x.client || '',
                    depositAccountType: x.depositAccountType ?? 0,   // backend expects a number
                    dueAmount: numberOrNull(x.amountDue || x.totalDue || x.installmentAmount) ?? 0,
                    transactionAmount: numberOrNull(x.transactionAmount ?? x.amountPaid ?? x.amount ?? x.amountDue) ?? 0,
                    paymentTypeId: x.paymentTypeId ?? '',
                    receiptNumber: x.receiptNumber || '',
                    accountNumber: x.accountNumber || '',
                    routingCode: x.routingCode || '',
                    bankNumber: x.bankNumber || '',
                    checkNumber: x.checkNumber || '',
                }));

            setGenerated(data);
            setRowsLoans(loans);
            setRowsSavings(savings);
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to generate collection sheet';
            addToast(msg, 'error');
            setGenerated(null);
            setRowsLoans([]); setRowsSavings([]);
        } finally {
            setLoading(false);
        }
    };

    const updateLoanField = (i, key, v) => {
        setRowsLoans(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
    };
    const updateSavingField = (i, key, v) => {
        setRowsSavings(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
    };

    const filteredLoans = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rowsLoans;
        return rowsLoans.filter(r =>
            [r.clientName, r.loanId, r.receiptNumber, r.accountNumber]
                .map(v => String(v ?? '').toLowerCase())
                .some(h => h.includes(t))
        );
    }, [rowsLoans, q]);

    const filteredSavings = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rowsSavings;
        return rowsSavings.filter(r =>
            [r.clientName, r.savingsId, r.receiptNumber, r.accountNumber]
                .map(v => String(v ?? '').toLowerCase())
                .some(h => h.includes(t))
        );
    }, [rowsSavings, q]);

    const totals = useMemo(() => {
        const loansSum   = filteredLoans.reduce((a, r) => a + (numberOrNull(r.transactionAmount) ?? 0), 0);
        const savingsSum = filteredSavings.reduce((a, r) => a + (numberOrNull(r.transactionAmount) ?? 0), 0);
        return { loansSum, savingsSum, grand: loansSum + savingsSum };
    }, [filteredLoans, filteredSavings]);

    const openSave = () => {
        if (!rowsLoans.length && !rowsSavings.length) {
            addToast('Nothing to save', 'error'); return;
        }
        setSaveOpen(true);
    };

    const doSave = async () => {
        setSaving(true);
        try {
            const bulkRepaymentTransactions = rowsLoans
                .filter(r => (numberOrNull(r.transactionAmount) ?? 0) > 0)
                .map(r => ({
                    loanId: Number(r.loanId),
                    transactionAmount: Number(r.transactionAmount),
                    ...(r.paymentTypeId ? { paymentTypeId: Number(r.paymentTypeId) } : {}),
                    ...(r.receiptNumber ? { receiptNumber: r.receiptNumber } : {}),
                    ...(r.accountNumber ? { accountNumber: r.accountNumber } : {}),
                    ...(r.routingCode ? { routingCode: r.routingCode } : {}),
                    ...(r.bankNumber ? { bankNumber: r.bankNumber } : {}),
                    ...(r.checkNumber ? { checkNumber: r.checkNumber } : {}),
                }));

            const bulkSavingsDueTransactions = rowsSavings
                .filter(r => (numberOrNull(r.transactionAmount) ?? 0) > 0)
                .map(r => ({
                    savingsId: Number(r.savingsId),
                    transactionAmount: Number(r.transactionAmount),
                    depositAccountType: Number(r.depositAccountType ?? 0),
                    ...(r.paymentTypeId ? { paymentTypeId: Number(r.paymentTypeId) } : {}),
                    ...(r.receiptNumber ? { receiptNumber: r.receiptNumber } : {}),
                    ...(r.accountNumber ? { accountNumber: r.accountNumber } : {}),
                    ...(r.routingCode ? { routingCode: r.routingCode } : {}),
                    ...(r.bankNumber ? { bankNumber: r.bankNumber } : {}),
                    ...(r.checkNumber ? { checkNumber: r.checkNumber } : {}),
                }));

            await saveCollectionSheet({
                officeId: Number(officeId),
                transactionDate: meetingDate,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
                bulkRepaymentTransactions,
                bulkSavingsDueTransactions,
            });

            setSaveOpen(false);
            addToast('Collection sheet saved', 'success');
            // Optionally refresh to recompute dues:
            await generate();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Save failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold inline-flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" /> Collection Sheet
                </h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={generate}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Generate
                    </Button>
                    <Button onClick={openSave} disabled={!rowsLoans.length && !rowsSavings.length}>
                        <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4">
                    <MiniCombobox
                        label={(<span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-500" /> Office</span>)}
                        value={officeId}
                        onChange={setOfficeId}
                        options={officeOpts}
                        placeholder="Type to search office…"
                    />
                    <div>
                        <label className="block text-sm font-medium">Meeting date</label>
                        <input
                            type="date"
                            className="mt-1 w-full border rounded-md p-2"
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            className="mt-1 w-full border rounded-md p-2"
                            placeholder="Client, loan/savings id, receipt…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Content */}
            {loading ? (
                <Card><Skeleton height="14rem" /></Card>
            ) : (
                <>
                    {/* Loans Table */}
                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold">Loan Repayments</h2>
                            <div className="text-sm text-gray-600">Total: <span className="font-semibold">{totals.loansSum.toFixed(2)}</span></div>
                        </div>
                        {!filteredLoans.length ? (
                            <div className="text-sm text-gray-600">No loan repayments for this office/date.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        <th className="py-2 pr-4">Loan ID</th>
                                        <th className="py-2 pr-4">Client</th>
                                        <th className="py-2 pr-4">Due</th>
                                        <th className="py-2 pr-4">Pay</th>
                                        <th className="py-2 pr-4">Payment Type ID</th>
                                        <th className="py-2 pr-4">Receipt</th>
                                        <th className="py-2 pr-4">Account #</th>
                                        <th className="py-2 pr-4">Routing</th>
                                        <th className="py-2 pr-4">Bank</th>
                                        <th className="py-2 pr-4">Cheque</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredLoans.map((r, idx) => (
                                        <tr key={`${r.loanId}-${idx}`} className="border-t">
                                            <td className="py-2 pr-4">{r.loanId}</td>
                                            <td className="py-2 pr-4">{r.clientName || '—'}</td>
                                            <td className="py-2 pr-4">{Number(r.dueAmount ?? 0).toFixed(2)}</td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.transactionAmount}
                                                    onChange={(e) => updateLoanField(idx, 'transactionAmount', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    type="number"
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.paymentTypeId}
                                                    onChange={(e) => updateLoanField(idx, 'paymentTypeId', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.receiptNumber}
                                                    onChange={(e) => updateLoanField(idx, 'receiptNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.accountNumber}
                                                    onChange={(e) => updateLoanField(idx, 'accountNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.routingCode}
                                                    onChange={(e) => updateLoanField(idx, 'routingCode', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-20 border rounded-md p-1"
                                                    value={r.bankNumber}
                                                    onChange={(e) => updateLoanField(idx, 'bankNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.checkNumber}
                                                    onChange={(e) => updateLoanField(idx, 'checkNumber', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Savings Table */}
                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold">Savings (Mandatory Deposits)</h2>
                            <div className="text-sm text-gray-600">Total: <span className="font-semibold">{totals.savingsSum.toFixed(2)}</span></div>
                        </div>
                        {!filteredSavings.length ? (
                            <div className="text-sm text-gray-600">No savings due for this office/date.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        <th className="py-2 pr-4">Savings ID</th>
                                        <th className="py-2 pr-4">Client</th>
                                        <th className="py-2 pr-4">Due</th>
                                        <th className="py-2 pr-4">Deposit</th>
                                        <th className="py-2 pr-4">Payment Type ID</th>
                                        <th className="py-2 pr-4">Receipt</th>
                                        <th className="py-2 pr-4">Account #</th>
                                        <th className="py-2 pr-4">Routing</th>
                                        <th className="py-2 pr-4">Bank</th>
                                        <th className="py-2 pr-4">Cheque</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredSavings.map((r, idx) => (
                                        <tr key={`${r.savingsId}-${idx}`} className="border-t">
                                            <td className="py-2 pr-4">{r.savingsId}</td>
                                            <td className="py-2 pr-4">{r.clientName || '—'}</td>
                                            <td className="py-2 pr-4">{Number(r.dueAmount ?? 0).toFixed(2)}</td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.transactionAmount}
                                                    onChange={(e) => updateSavingField(idx, 'transactionAmount', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    type="number"
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.paymentTypeId}
                                                    onChange={(e) => updateSavingField(idx, 'paymentTypeId', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.receiptNumber}
                                                    onChange={(e) => updateSavingField(idx, 'receiptNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-28 border rounded-md p-1"
                                                    value={r.accountNumber}
                                                    onChange={(e) => updateSavingField(idx, 'accountNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.routingCode}
                                                    onChange={(e) => updateSavingField(idx, 'routingCode', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-20 border rounded-md p-1"
                                                    value={r.bankNumber}
                                                    onChange={(e) => updateSavingField(idx, 'bankNumber', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                <input
                                                    className="w-24 border rounded-md p-1"
                                                    value={r.checkNumber}
                                                    onChange={(e) => updateSavingField(idx, 'checkNumber', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* Save confirmation */}
            <Modal
                open={saveOpen}
                onClose={() => { if (!saving) setSaveOpen(false); }}
                title="Save Collection Sheet"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setSaveOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={doSave} disabled={saving}>
                            {saving ? 'Saving…' : (<span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Save</span>)}
                        </Button>
                    </>
                }
            >
                <div className="space-y-2 text-sm">
                    <p>Office: <span className="font-semibold">{officeOpts.find(o => o.id === officeId)?.label || officeId}</span></p>
                    <p>Date: <span className="font-semibold">{meetingDate}</span></p>
                    <p>Loans: <span className="font-semibold">{totals.loansSum.toFixed(2)}</span></p>
                    <p>Savings: <span className="font-semibold">{totals.savingsSum.toFixed(2)}</span></p>
                    <p>Grand Total: <span className="font-semibold">{totals.grand.toFixed(2)}</span></p>
                </div>
            </Modal>
        </div>
    );
};

export default CollectionSheet;
