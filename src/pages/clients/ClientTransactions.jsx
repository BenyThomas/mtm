import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

/**
 * Props:
 * - clientId
 * - clientExternalId (optional) to enable external-id endpoints
 */
const ClientTransactions = ({ clientId, clientExternalId }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const [useExternal, setUseExternal] = useState(Boolean(clientExternalId));

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [busy, setBusy] = useState(false);

    const listById = async () => {
        const r = await api.get(`/clients/${clientId}/transactions`);
        return Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || r?.data || []);
    };

    const listByExternal = async () => {
        const r = await api.get(`/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions`);
        return Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || r?.data || []);
    };

    const load = async () => {
        setLoading(true);
        try {
            const list = useExternal ? await listByExternal() : await listById();
            const norm = list.map((t, idx) => {
                const date = Array.isArray(t.transactionDate) ? t.transactionDate.join('-') : (t.transactionDate || t.date || '');
                const type = t.type?.value || t.type || t.transactionType || '';
                const amount = t.amount || t.amountOutstanding || t.amountPaid || t.amountWaived || t.chargesAmount || 0;
                const balance = t.runningBalance || t.balance || '';
                return {
                    id: t.id || t.transactionId || idx + 1,
                    externalId: t.externalId || t.transactionExternalId || '',
                    date,
                    amount,
                    currency: t.currency?.code || t.currencyCode || '',
                    type,
                    balance,
                    note: t.note || '',
                };
            });
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load transactions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId, useExternal]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        return rows.filter(r => {
            const inSearch = !t || [r.id, r.externalId, r.type, r.amount, r.date, r.note]
                .map(v => String(v || '').toLowerCase())
                .some(s => s.includes(t));
            if (!inSearch) return false;
            if (fromDate && r.date && r.date < fromDate) return false;
            if (toDate && r.date && r.date > toDate) return false;
            return true;
        });
    }, [rows, q, fromDate, toDate]);

    const undo = async (row) => {
        if (!window.confirm('Undo this transaction?')) return;
        setBusy(true);
        try {
            const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
            // Prefer external endpoints if in external mode or row has externalId
            if (useExternal && clientExternalId) {
                if (row.externalId) {
                    await api.post(`/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions/external-id/${encodeURIComponent(row.externalId)}`, payload);
                } else {
                    await api.post(`/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions/${row.id}`, payload);
                }
            } else {
                if (row.externalId) {
                    await api.post(`/clients/${clientId}/transactions/external-id/${encodeURIComponent(row.externalId)}`, payload);
                } else {
                    await api.post(`/clients/${clientId}/transactions/${row.id}`, payload);
                }
            }
            addToast('Transaction undone', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Undo failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Transactions</h2>
                <div className="flex items-center gap-2">
                    {clientExternalId ? (
                        <label className="text-sm inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={useExternal}
                                onChange={(e) => setUseExternal(e.target.checked)}
                            />
                            Use external-id API
                        </label>
                    ) : null}
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Type, amount, date, note…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
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
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No transactions.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">External ID</th>
                                <th className="py-2 pr-4">Date</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Balance</th>
                                <th className="py-2 pr-4">Note</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(r => (
                                <tr key={`${r.id}-${r.externalId || ''}`} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.externalId || '—'}</td>
                                    <td className="py-2 pr-4">{r.date || '—'}</td>
                                    <td className="py-2 pr-4">{r.type || '—'}</td>
                                    <td className="py-2 pr-4">{r.amount} {r.currency}</td>
                                    <td className="py-2 pr-4">{r.balance || '—'}</td>
                                    <td className="py-2 pr-4">{r.note || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="danger" disabled={busy} onClick={() => undo(r)}>Undo</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ClientTransactions;
