import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import ShareAccountForm from '../../components/ShareAccountForm';

const PAGE_SIZES = [10, 25, 50, 100];

const ShareAccounts = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    const [q, setQ] = useState('');
    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('DESC');

    const [createOpen, setCreateOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const type = 'shares'; // API: /accounts/{type}

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/accounts/${type}`, { params: { offset, limit, sortBy, sortOrder } });
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const totalFiltered = r?.data?.totalFilteredRecords || r?.data?.total || list.length;

            const norm = list.map((a) => ({
                id: a.id,
                accountNo: a.accountNo || a.accountNumber || '',
                clientName: a.clientName || a.client?.displayName || '',
                productName: a.productName || a.product?.name || '',
                status: a.status?.value || a.status || '',
                submittedOnDate: a.submittedOnDate || a.applicationDate || '',
                totalShares: a.totalApprovedShares || a.totalShares || '',
            }));

            setItems(norm);
            setTotal(Number(totalFiltered ?? list.length));
        } catch (e) {
            setItems([]);
            setTotal(0);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load share accounts', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [limit, offset, sortBy, sortOrder]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.accountNo, x.clientName, x.productName, x.status]
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

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/accounts/${type}`, payload);
            addToast('Share application submitted', 'success');
            setCreateOpen(false);
            setOffset(0);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Share Accounts</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Application</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Account #, client, product…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No share accounts found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('id')}>#</th>
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('accountNo')}>Account #</th>
                                <th className="py-2 pr-4">Client</th>
                                <th className="py-2 pr-4">Product</th>
                                <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('status')}>Status</th>
                                <th className="py-2 pr-4">Submitted</th>
                                <th className="py-2 pr-4">Total Shares</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((a) => (
                                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{a.id}</td>
                                    <td className="py-2 pr-4">{a.accountNo || '—'}</td>
                                    <td className="py-2 pr-4">{a.clientName || '—'}</td>
                                    <td className="py-2 pr-4">{a.productName || '—'}</td>
                                    <td className="py-2 pr-4">{a.status || '—'}</td>
                                    <td className="py-2 pr-4">{a.submittedOnDate || '—'}</td>
                                    <td className="py-2 pr-4">{a.totalShares || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/shares/${a.id}`)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={createOpen} title="New Share Application" onClose={() => setCreateOpen(false)} footer={null}>
                <ShareAccountForm onSubmit={create} submitting={busy} />
            </Modal>
        </div>
    );
};

export default ShareAccounts;
