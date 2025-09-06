import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZES = [10, 25, 50, 100];

const tryFetchHistory = async (params) => {
    // Some tenants expose /standinginstructions/history,
    // others use a flag on the main endpoint.
    try {
        const r = await api.get('/standinginstructions/history', { params });
        return r?.data;
    } catch (_) {
        try {
            const r2 = await api.get('/standinginstructions', { params: { ...params, history: true } });
            return r2?.data;
        } catch (__){
            // rare fallback
            const r3 = await api.get('/standinginstructions/runhistory', { params });
            return r3?.data;
        }
    }
};

const StandingInstructionsHistory = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    // filters / paging
    const [q, setQ] = useState('');
    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);
    const [sortBy, setSortBy] = useState('executionDate');
    const [sortOrder, setSortOrder] = useState('DESC');

    const load = async () => {
        setLoading(true);
        try {
            const data = await tryFetchHistory({ limit, offset, sortBy, sortOrder });
            const list = Array.isArray(data) ? data : (data?.pageItems || []);
            const totalFiltered = data?.totalFilteredRecords || data?.totalFiltered || data?.total || list.length;

            const norm = list.map((h, idx) => ({
                id: h.id || h.requestId || h.entryId || idx + 1,
                executionDate: h.executionDate || h.runOnDate || h.processedOn || h.date || '',
                amount: h.amount || h.transferAmount || h.txnAmount || '',
                fromAccount: h.fromAccount?.accountNo || h.fromAccountNo || h.fromAccountId || '',
                toAccount: h.toAccount?.accountNo || h.toAccountNo || h.toAccountId || '',
                status: h.status?.value || h.status || '',
                failureReason: h.failureReason || h.errorMessage || '',
            }));

            setItems(norm);
            setTotal(Number(totalFiltered ?? 0));
        } catch (e) {
            setItems([]);
            setTotal(0);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load history', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [limit, offset, sortBy, sortOrder]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.executionDate, x.amount, x.fromAccount, x.toAccount, x.status, x.failureReason]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    const toggleSort = (col) => {
        if (sortBy === col) {
            setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
        } else {
            setSortBy(col);
            setSortOrder('ASC');
        }
    };

    const canPrev = offset > 0;
    const canNext = offset + limit < total;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Standing Instructions History</h1>
                <div className="space-x-2">
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
                            placeholder="Date, account #, status, reason…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Page size</label>
                        <select
                            value={limit}
                            onChange={(e) => { setOffset(0); setLimit(Number(e.target.value)); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end justify-end gap-2">
                        <Button variant="secondary" disabled={!canPrev} onClick={() => setOffset((o) => Math.max(0, o - limit))}>Prev</Button>
                        <Button variant="secondary" disabled={!canNext} onClick={() => setOffset((o) => o + limit)}>Next</Button>
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No history entries found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('id')}>#</th>
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('executionDate')}>Date</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">From</th>
                                <th className="py-2 pr-4">To</th>
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('status')}>Status</th>
                                <th className="py-2 pr-4">Reason</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((h) => (
                                <tr key={h.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{h.id}</td>
                                    <td className="py-2 pr-4">{h.executionDate || '—'}</td>
                                    <td className="py-2 pr-4">{h.amount || '—'}</td>
                                    <td className="py-2 pr-4">{h.fromAccount || '—'}</td>
                                    <td className="py-2 pr-4">{h.toAccount || '—'}</td>
                                    <td className="py-2 pr-4">{h.status || '—'}</td>
                                    <td className="py-2 pr-4">{h.failureReason || '—'}</td>
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

export default StandingInstructionsHistory;
