import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import DelinquencyRangeForm from '../../components/DelinquencyRangeForm';
import { useToast } from '../../context/ToastContext';

const normalizeRange = (x, idx) => ({
    id: x.id ?? idx + 1,
    classification: x.classification || '',
    min: x.minimumAgeDays ?? x.minAgeDays ?? x.minDays ?? x.min ?? 0,
    max: x.maximumAgeDays ?? x.maxAgeDays ?? x.maxDays ?? x.max ?? 0,
});

const DelinquencyRanges = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/delinquency/ranges');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setRows(list.map(normalizeRange));
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load ranges', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/delinquency/ranges', payload);
            addToast('Range created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage
                || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const openEdit = async (id) => {
        try {
            const r = await api.get(`/delinquency/ranges/${id}`);
            setEditItem(r?.data ? normalizeRange(r.data) : null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load range', 'error');
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/delinquency/ranges/${editItem.id}`, payload);
            addToast('Range updated', 'success');
            setEditItem(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage
                || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this range?')) return;
        try {
            await api.delete(`/delinquency/ranges/${id}`);
            addToast('Range deleted', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Delinquency Ranges</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Range</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No ranges found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Classification</th>
                                <th className="py-2 pr-4">Min Days</th>
                                <th className="py-2 pr-4">Max Days</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.classification || '—'}</td>
                                    <td className="py-2 pr-4">{r.min}</td>
                                    <td className="py-2 pr-4">{r.max}</td>
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
            <Modal open={createOpen} title="New Delinquency Range" onClose={() => setCreateOpen(false)} footer={null}>
                <DelinquencyRangeForm onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title="Edit Delinquency Range" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <DelinquencyRangeForm initial={editItem} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default DelinquencyRanges;
