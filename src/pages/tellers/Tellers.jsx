import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import TellerForm from '../../components/TellerForm';

const Tellers = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/tellers');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((t) => ({
                id: t.id,
                name: t.name || t.tellerName || `Teller #${t.id}`,
                officeId: t.officeId || t.office?.id,
                officeName: t.officeName || t.office?.name,
                description: t.description || '',
                status: t.status || t.isActive ? 'Active' : '—',
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load tellers', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.name, x.officeName, x.description, x.status]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    const create = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/tellers', payload);
            addToast('Teller created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Tellers</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Teller</Button>
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
                            placeholder="Name, office, description…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No tellers found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((t) => (
                                <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{t.id}</td>
                                    <td className="py-2 pr-4">{t.name}</td>
                                    <td className="py-2 pr-4">{t.officeName || '—'}</td>
                                    <td className="py-2 pr-4">{t.status || '—'}</td>
                                    <td className="py-2 pr-4">{t.description || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/tellers/${t.id}`)}>View / Edit</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create modal */}
            <Modal
                open={createOpen}
                title="New Teller"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <TellerForm onSubmit={create} submitting={createBusy} />
            </Modal>
        </div>
    );
};

export default Tellers;
