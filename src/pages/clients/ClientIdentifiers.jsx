import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import IdentifierForm from '../../components/IdentifierForm';
import { useToast } from '../../context/ToastContext';

/**
 * Props:
 * - clientId
 */
const ClientIdentifiers = ({ clientId }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/${clientId}/identifiers`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((x, idx) => ({
                id: x.id || idx + 1,
                documentTypeId: x.documentTypeId || x.documentType?.id,
                documentTypeName: x.documentType?.name || x.documentType || '-',
                documentKey: x.documentKey || '',
                description: x.description || '',
            }));
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load identifiers', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId]);

    const openEdit = async (id) => {
        try {
            const r = await api.get(`/clients/${clientId}/identifiers/${id}`);
            setEditItem(r?.data || null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load identifier', 'error');
        }
    };

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/clients/${clientId}/identifiers`, payload);
            addToast('Identifier created', 'success');
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
            await api.put(`/clients/${clientId}/identifiers/${editItem.id}`, payload);
            addToast('Identifier updated', 'success');
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
        if (!window.confirm('Delete this identifier?')) return;
        try {
            await api.delete(`/clients/${clientId}/identifiers/${id}`);
            addToast('Identifier deleted', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    const filtered = rows.filter(r => {
        const t = q.trim().toLowerCase();
        if (!t) return true;
        return [r.id, r.documentTypeName, r.documentKey, r.description]
            .map(v => String(v || '').toLowerCase())
            .some(s => s.includes(t));
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Identifiers</h2>
                <div className="flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search identifiers…"
                        className="hidden md:block w-60 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>Add Identifier</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No identifiers found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Key / Number</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.documentTypeName}</td>
                                    <td className="py-2 pr-4">{r.documentKey}</td>
                                    <td className="py-2 pr-4">{r.description || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => openEdit(r.id)}>Edit</Button>
                                        <Button variant="danger" onClick={() => remove(r.id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create */}
            <Modal open={createOpen} title="Add Identifier" onClose={() => setCreateOpen(false)} footer={null}>
                <IdentifierForm clientId={clientId} onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title="Edit Identifier" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <IdentifierForm clientId={clientId} initial={editItem} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default ClientIdentifiers;
