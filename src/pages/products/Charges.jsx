// src/pages/products/Charges.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import ChargeForm from '../../components/ChargeForm';

const PAGE_SIZES = [10, 25, 50, 100];

const Charges = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/charges', { params: { offset, limit } });
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((c) => ({
                id: c.id,
                name: c.name,
                currencyCode: c.currencyCode || c.currency?.code,
                amount: c.amount ?? c.amountPercentage ?? '',
                appliesTo: c.chargeAppliesTo?.value || c.appliesTo || '',
                timeType: c.chargeTimeType?.value || c.timeType || '',
                calcType: c.chargeCalculationType?.value || c.calculationType || '',
                penalty: typeof c.penalty === 'boolean' ? c.penalty : (c.penalty === 'true'),
                active: typeof c.active === 'boolean' ? c.active : (c.active === 'true'),
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load charges', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [limit, offset]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.name, x.currencyCode, x.amount, x.appliesTo, x.timeType, x.calcType]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    const canPrev = offset > 0;
    const canNext = filtered.length === limit; // rough; many tenants don’t return total

    const openEdit = async (id) => {
        try {
            const r = await api.get(`/charges/${id}`);
            const d = r?.data || {};
            setEditItem(d);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load charge', 'error');
        }
    };

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/charges', payload);
            addToast('Charge created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/charges/${editItem.id}`, payload);
            addToast('Charge updated', 'success');
            setEditItem(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this charge?')) return;
        try {
            await api.delete(`/charges/${id}`);
            addToast('Charge deleted', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Charges</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Charge</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, currency, type…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No charges found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Currency</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Applies To</th>
                                <th className="py-2 pr-4">Time</th>
                                <th className="py-2 pr-4">Calc</th>
                                <th className="py-2 pr-4">Penalty</th>
                                <th className="py-2 pr-4">Active</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.id}</td>
                                    <td className="py-2 pr-4">{c.name}</td>
                                    <td className="py-2 pr-4">{c.currencyCode || '—'}</td>
                                    <td className="py-2 pr-4">{c.amount}</td>
                                    <td className="py-2 pr-4">{c.appliesTo || '—'}</td>
                                    <td className="py-2 pr-4">{c.timeType || '—'}</td>
                                    <td className="py-2 pr-4">{c.calcType || '—'}</td>
                                    <td className="py-2 pr-4">{c.penalty ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{c.active ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => openEdit(c.id)}>Edit</Button>
                                        <Button variant="danger" onClick={() => remove(c.id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create */}
            <Modal open={createOpen} title="New Charge" onClose={() => setCreateOpen(false)} footer={null}>
                <ChargeForm onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title={editItem ? `Edit Charge #${editItem.id}` : 'Edit Charge'} onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <ChargeForm initial={editItem} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default Charges;
