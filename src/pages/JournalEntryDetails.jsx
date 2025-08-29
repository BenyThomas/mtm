import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};

const JournalEntryDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/journalentries/${id}`);
            setEntry(res?.data || null);
        } catch {
            setEntry(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const lines = useMemo(() => {
        // some tenants return a single entry with lines; others return properties directly
        return entry?.lines || entry?.journalEntryLines || entry?.pageItems || entry?.entries || [];
    }, [entry]);

    const totals = useMemo(() => {
        const debit = lines.reduce((s, l) => s + (l.entryType?.value === 'DEBIT' || l.debitOrCredit === 'DEBIT' ? Number(l.amount || 0) : 0), 0);
        const credit = lines.reduce((s, l) => s + (l.entryType?.value === 'CREDIT' || l.debitOrCredit === 'CREDIT' ? Number(l.amount || 0) : 0), 0);
        return { debit, credit, balanced: Math.abs(debit - credit) < 0.000001 };
    }, [lines]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="10rem" /></Card>
            </div>
        );
    }

    if (!entry) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Journal Entry</h1>
                <Card>Entry not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Journal Entry #{entry.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Tx: {entry.transactionId || '-'} • Date: {toISO(entry.entryDate || entry.transactionDate || entry.createdDate)} • Office: {entry.officeName || entry.officeId || '-'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Reference</div>
                        <div className="font-medium">{entry.referenceNumber || entry.reference || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Currency</div>
                        <div className="font-medium">{entry.currencyCode || entry.currency?.code || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Comments</div>
                        <div className="font-medium">{entry.comments || '-'}</div>
                    </div>
                </div>
            </Card>

            {/* Lines */}
            <Card>
                <div className="font-semibold mb-3">Lines</div>
                {!lines.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No lines.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Account</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Comments</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lines.map((l, idx) => (
                                <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">
                                        {(l.glAccountCode || l.accountCode || l.accountId) + (l.glAccountName ? ` — ${l.glAccountName}` : '')}
                                    </td>
                                    <td className="py-2 pr-4">{l.entryType?.value || l.debitOrCredit || '-'}</td>
                                    <td className="py-2 pr-4">{l.amount}</td>
                                    <td className="py-2 pr-4">{l.comments || '-'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 grid md:grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">Total Debits: {totals.debit.toFixed(2)}</div>
                    <div className="font-medium">Total Credits: {totals.credit.toFixed(2)}</div>
                    <div className={`font-semibold ${totals.balanced ? 'text-green-600' : 'text-red-600'}`}>
                        {totals.balanced ? 'Balanced' : 'Not balanced'}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default JournalEntryDetails;
