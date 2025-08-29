import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import OfficeSelect from './OfficeSelect';
import { useToast } from '../context/ToastContext';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const LineRow = ({ line, onChange, onRemove, glOptions }) => {
    return (
        <div className="grid md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-5">
                <label className="block text-sm font-medium">GL Account *</label>
                <select
                    value={line.accountId}
                    onChange={(e) => onChange({ ...line, accountId: e.target.value })}
                    className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">Select account</option>
                    {glOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                            {(a.glCode || a.code || a.id) + (a.name ? ` — ${a.name}` : '')}
                        </option>
                    ))}
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium">Type *</label>
                <select
                    value={line.debitOrCredit}
                    onChange={(e) => onChange({ ...line, debitOrCredit: e.target.value })}
                    className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                </select>
            </div>
            <div className="md:col-span-3">
                <label className="block text-sm font-medium">Amount *</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => onChange({ ...line, amount: e.target.value })}
                    className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="0.00"
                />
            </div>
            <div className="md:col-span-2 flex">
                <Button variant="danger" onClick={onRemove} className="mt-6 w-full">Remove</Button>
            </div>
            <div className="md:col-span-12">
                <label className="block text-sm font-medium">Line Comments (optional)</label>
                <input
                    value={line.comments || ''}
                    onChange={(e) => onChange({ ...line, comments: e.target.value })}
                    className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Optional note for this line…"
                />
            </div>
        </div>
    );
};

/**
 * Props:
 *  - onSubmit: async (payload) => void
 *  - submitting: boolean
 *  - defaultOfficeId?: number|string
 */
const JournalEntryForm = ({ onSubmit, submitting, defaultOfficeId }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [glOptions, setGlOptions] = useState([]);

    // header fields
    const [officeId, setOfficeId] = useState(defaultOfficeId ? String(defaultOfficeId) : '');
    const [transactionDate, setTransactionDate] = useState(todayISO());
    const [referenceNumber, setReferenceNumber] = useState('');
    const [comments, setComments] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');

    // lines
    const [lines, setLines] = useState([
        { accountId: '', debitOrCredit: 'DEBIT', amount: '', comments: '' },
        { accountId: '', debitOrCredit: 'CREDIT', amount: '', comments: '' },
    ]);

    const [errors, setErrors] = useState({});

    // load GL account options
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get('/glaccounts');
                const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
                if (!cancelled) setGlOptions(list);
            } catch {
                if (!cancelled) setGlOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const totals = useMemo(() => {
        const d = lines.reduce((acc, l) => acc + (l.debitOrCredit === 'DEBIT' ? Number(l.amount || 0) : 0), 0);
        const c = lines.reduce((acc, l) => acc + (l.debitOrCredit === 'CREDIT' ? Number(l.amount || 0) : 0), 0);
        return { debit: d, credit: c, balanced: Math.abs(d - c) < 0.000001 };
    }, [lines]);

    const addLine = (type = 'DEBIT') => {
        setLines((ls) => [...ls, { accountId: '', debitOrCredit: type, amount: '', comments: '' }]);
    };

    const updateLine = (idx, next) => {
        setLines((ls) => {
            const arr = ls.slice();
            arr[idx] = next;
            return arr;
        });
    };

    const removeLine = (idx) => {
        setLines((ls) => ls.filter((_, i) => i !== idx));
    };

    const validate = () => {
        const e = {};
        if (!officeId) e.officeId = 'Office is required';
        if (!transactionDate) e.transactionDate = 'Transaction date is required';
        if (lines.length < 2) e.lines = 'At least two lines are required';
        lines.forEach((l, i) => {
            if (!l.accountId) e[`line_${i}_accountId`] = 'GL account is required';
            if (!l.amount || Number(l.amount) <= 0) e[`line_${i}_amount`] = 'Positive amount required';
            if (!l.debitOrCredit) e[`line_${i}_type`] = 'Type is required';
        });
        if (!totals.balanced) e.balanced = 'Debits must equal credits';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            officeId: Number(officeId),
            transactionDate,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            ...(referenceNumber ? { referenceNumber } : {}),
            ...(comments ? { comments } : {}),
            ...(currencyCode ? { currencyCode } : {}),
            journalEntries: lines.map((l) => ({
                accountId: Number(l.accountId),
                amount: Number(l.amount),
                debitOrCredit: l.debitOrCredit,
                ...(l.comments ? { comments: l.comments } : {}),
            })),
        };
        await onSubmit(payload);
    };

    if (loading) {
        return (
            <Card>
                <Skeleton height="10rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Header */}
            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium">Office *</label>
                    <OfficeSelect value={officeId} onChange={setOfficeId} />
                    {errors.officeId && <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Transaction Date *</label>
                    <input
                        type="date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.transactionDate && <p className="text-xs text-red-500 mt-1">{errors.transactionDate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Reference # (optional)</label>
                    <input
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. JV-2025-0001"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Comments (optional)</label>
                    <input
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Optional description for this journal entry…"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Currency Code (optional)</label>
                    <input
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. TZS"
                    />
                </div>
            </div>

            {/* Lines */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Lines</div>
                    <div className="space-x-2">
                        <Button variant="secondary" onClick={() => addLine('DEBIT')}>Add Debit</Button>
                        <Button variant="secondary" onClick={() => addLine('CREDIT')}>Add Credit</Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {lines.map((line, idx) => (
                        <div key={idx} className="border rounded-md p-3 dark:border-gray-700">
                            <LineRow
                                line={line}
                                glOptions={glOptions}
                                onChange={(next) => updateLine(idx, next)}
                                onRemove={() => removeLine(idx)}
                            />
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-red-500">
                                <div>{errors[`line_${idx}_accountId`] || ''}</div>
                                <div>{errors[`line_${idx}_type`] || ''}</div>
                                <div>{errors[`line_${idx}_amount`] || ''}</div>
                            </div>
                        </div>
                    ))}
                    {errors.lines && <p className="text-xs text-red-500">{errors.lines}</p>}
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">Total Debits: {totals.debit.toFixed(2)}</div>
                    <div className="font-medium">Total Credits: {totals.credit.toFixed(2)}</div>
                    <div className={`font-semibold ${totals.balanced ? 'text-green-600' : 'text-red-600'}`}>
                        {totals.balanced ? 'Balanced' : 'Not balanced'}
                    </div>
                </div>
                {errors.balanced && <p className="text-xs text-red-500 mt-1">{errors.balanced}</p>}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting || !totals.balanced}>
                    {submitting ? 'Posting…' : 'Post Journal Entry'}
                </Button>
            </div>
        </form>
    );
};

export default JournalEntryForm;
