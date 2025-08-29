import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import CodeForm from '../components/CodeForm';

const Codes = () => {
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
            const res = await api.get('/codes');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load codes';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((c) => {
            const hay = [
                c.name, c.description, c.id, c.systemDefined,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, q]);

    const createCode = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/codes', payload);
            addToast('Code created', 'success');
            setCreateOpen(false);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Codes</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Code</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
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
                            placeholder="Name, description…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No codes found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4">System</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.id}</td>
                                    <td className="py-2 pr-4">{c.name}</td>
                                    <td className="py-2 pr-4">{c.description || '—'}</td>
                                    <td className="py-2 pr-4">{c.systemDefined ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate(`/config/codes/${c.id}`)}
                                        >
                                            View / Edit
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate(`/config/codes/${c.id}/values`)}
                                        >
                                            Manage Values
                                        </Button>
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
                title="New Code"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <CodeForm onSubmit={createCode} submitting={createBusy} />
            </Modal>
        </div>
    );
};

export default Codes;
