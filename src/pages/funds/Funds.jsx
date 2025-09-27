import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import FundForm from '../../components/FundForm';
import { useToast } from '../../context/ToastContext';
import { Pencil, Plus } from 'lucide-react';

const Funds = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');

    // Create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/funds'); // baseURL should already include /api/v1
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((f) => ({
                id: f.id,
                name: f.name || '',
                externalId: f.externalId || '',
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load funds';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((f) =>
            [f.id, f.name, f.externalId]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    // Create
    const create = async (payload) => {
        if (!payload?.name) {
            addToast('Name is required', 'error');
            return;
        }
        setCreateBusy(true);
        try {
            await api.post('/funds', payload);
            addToast('Fund created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    // Edit
    const openEdit = (fund) => {
        setEditing(fund);
        setEditOpen(true);
    };

    const update = async (payload) => {
        if (!editing?.id) return;
        if (!payload?.name) {
            addToast('Name is required', 'error');
            return;
        }
        setEditBusy(true);
        try {
            await api.put(`/funds/${editing.id}`, payload);
            addToast('Fund updated', 'success');
            setEditOpen(false);
            setEditing(null);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Funds</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> New Fund
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, External ID…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No funds found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Transaction Reference</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((f) => (
                                <tr key={f.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{f.id}</td>
                                    <td className="py-2 pr-4">{f.name}</td>
                                    <td className="py-2 pr-4">{f.externalId || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => openEdit(f)}>
                                            <Pencil className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New Fund"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fill in the fund details below. Fields marked with * are required.
                    </p>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <FundForm onSubmit={create} submitting={createBusy} />
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                open={editOpen}
                onClose={() => { if (!editBusy) { setEditOpen(false); setEditing(null); } }}
                title="Edit Fund"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Update the fund details below.
                    </p>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <FundForm initial={editing} onSubmit={update} submitting={editBusy} />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Funds;
