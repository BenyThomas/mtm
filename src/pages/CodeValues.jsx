import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import CodeValueForm from '../components/CodeValueForm';

const CodeValues = () => {
    const { codeId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState(null); // optional: name/desc of the code
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            // Optional: fetch code meta if available
            try {
                const meta = await api.get(`/codes/${codeId}`);
                setCode(meta?.data || null);
            } catch {
                setCode(null);
            }
            const res = await api.get(`/codes/${codeId}/codevalues`);
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            // sort by position, then name
            list.sort((a, b) => {
                const pa = a.position ?? 99999;
                const pb = b.position ?? 99999;
                if (pa !== pb) return pa - pb;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load code values';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [codeId]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((v) => {
            const hay = [
                v.name, v.description, v.position, v.id, v.isActive,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, q]);

    const createValue = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post(`/codes/${codeId}/codevalues`, payload);
            addToast('Code value created', 'success');
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

    const doDelete = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/codes/${codeId}/codevalues/${deleteTarget.id}`);
            addToast('Code value deleted', 'success');
            setDeleteTarget(null);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {code ? (code.name || code.codeName || `Code #${codeId}`) : `Code #${codeId}`}
                    </h1>
                    {code?.description ? (
                        <div className="text-sm text-gray-600 dark:text-gray-300">{code.description}</div>
                    ) : null}
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Value</Button>
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
                            placeholder="Name, description, position…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button variant="secondary" onClick={() => navigate('/config/codes')}>
                            All Codes
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No code values found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Position</th>
                                <th className="py-2 pr-4">Active</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((v) => (
                                <tr key={v.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{v.id}</td>
                                    <td className="py-2 pr-4">{v.name}</td>
                                    <td className="py-2 pr-4">{v.position ?? '-'}</td>
                                    <td className="py-2 pr-4">{v.isActive ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{v.description || '-'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate(`/config/codes/${codeId}/values/${v.id}`)}
                                        >
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleteTarget(v)}>
                                            Delete
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
                title="New Code Value"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <CodeValueForm onSubmit={createValue} submitting={createBusy} />
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleteTarget}
                title="Delete Code Value"
                onClose={() => setDeleteTarget(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="danger" onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Delete <strong>{deleteTarget?.name}</strong> (#{deleteTarget?.id})? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default CodeValues;
