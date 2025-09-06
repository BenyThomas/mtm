import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import DelinquencyBucketForm from '../../components/DelinquencyBucketForm';
import { useToast } from '../../context/ToastContext';

const normalizeRange = (x, idx) => ({
    id: x.id ?? idx + 1,
    classification: x.classification || '',
    min: x.minimumAgeDays ?? x.minAgeDays ?? x.minDays ?? x.min ?? 0,
    max: x.maximumAgeDays ?? x.maxAgeDays ?? x.maxDays ?? x.max ?? 0,
});

const normalizeBucket = (b, idx) => ({
    id: b.id ?? idx + 1,
    name: b.name ?? b.bucketName ?? '',
    ranges: Array.isArray(b.ranges) ? b.ranges.map((r, i) => normalizeRange(r, i)) : [],
});

const DelinquencyBuckets = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const [rangesLoading, setRangesLoading] = useState(true);
    const [ranges, setRanges] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const loadRanges = async () => {
        setRangesLoading(true);
        try {
            const r = await api.get('/delinquency/ranges');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setRanges(list.map(normalizeRange));
        } catch (e) {
            setRanges([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load ranges', 'error');
        } finally {
            setRangesLoading(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/delinquency/buckets');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setRows(list.map(normalizeBucket));
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load buckets', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRanges(); load(); }, []); // eslint-disable-line

    const options = useMemo(
        () =>
            ranges.map(r => ({
                id: r.id,
                label: `${r.classification ? `${r.classification} — ` : ''}${r.min} to ${r.max} days`,
            })),
        [ranges]
    );

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/delinquency/buckets', payload);
            addToast('Bucket created', 'success');
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
            const r = await api.get(`/delinquency/buckets/${id}`);
            setEditItem(r?.data ? normalizeBucket(r.data) : null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load bucket', 'error');
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/delinquency/buckets/${editItem.id}`, payload);
            addToast('Bucket updated', 'success');
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
        if (!window.confirm('Delete this bucket?')) return;
        try {
            await api.delete(`/delinquency/buckets/${id}`);
            addToast('Bucket deleted', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Delinquency Buckets</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { loadRanges(); load(); }}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)} disabled={rangesLoading}>New Bucket</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No buckets found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Ranges</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(b => (
                                <tr key={b.id} className="border-t border-gray-200 dark:border-gray-700 text-sm align-top">
                                    <td className="py-2 pr-4">{b.id}</td>
                                    <td className="py-2 pr-4">{b.name || '—'}</td>
                                    <td className="py-2 pr-4">
                                        {!b.ranges.length ? '—' : (
                                            <ul className="list-disc ml-4 space-y-1">
                                                {b.ranges.map(r => (
                                                    <li key={r.id}>
                                                        {(r.classification ? `${r.classification} — ` : '') + `${r.min} to ${r.max} days`}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => openEdit(b.id)}>Edit</Button>
                                        <Button variant="danger" onClick={() => remove(b.id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create */}
            <Modal open={createOpen} title="New Delinquency Bucket" onClose={() => setCreateOpen(false)} footer={null}>
                <DelinquencyBucketForm
                    rangesOptions={options}
                    onSubmit={create}
                    submitting={busy}
                />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title="Edit Delinquency Bucket" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <DelinquencyBucketForm
                        rangesOptions={options}
                        initial={editItem}
                        onSubmit={save}
                        submitting={busy}
                    />
                ) : null}
            </Modal>
        </div>
    );
};

export default DelinquencyBuckets;
