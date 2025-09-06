import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ProvisioningCriteriaForm from '../components/ProvisioningCriteriaForm';
import { useNavigate } from 'react-router-dom';

const ProvisioningCriteria = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/provisioningcriteria');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((x) => ({
                id: x.id,
                name: x.criteriaName || x.name || `Criteria #${x.id}`,
                description: x.description,
                lastModified: x.lastModifiedOnDate || x.lastModified || x.createdOnDate || null,
            }));
            norm.sort((a, b) => String(a.name).localeCompare(String(b.name)));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load provisioning criteria';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((c) => [c.id, c.name, c.description].map((v) => String(v ?? '').toLowerCase()).some((s) => s.includes(t)));
    }, [items, q]);

    const create = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/provisioningcriteria', payload);
            addToast('Provisioning Criteria created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const doDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/provisioningcriteria/${deleting.id}`);
            addToast('Provisioning Criteria deleted', 'success');
            setDeleting(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Provisioning Criteria</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Criteria</Button>
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
                            placeholder="Name or description…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No criteria found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4">Last Modified</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.id}</td>
                                    <td className="py-2 pr-4">{c.name}</td>
                                    <td className="py-2 pr-4">{c.description || '—'}</td>
                                    <td className="py-2 pr-4">{c.lastModified || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/provisioning-criteria/${c.id}`)}>View / Edit</Button>
                                        <Button variant="danger" onClick={() => setDeleting(c)}>Delete</Button>
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
                title="New Provisioning Criteria"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <ProvisioningCriteriaForm onSubmit={create} submitting={createBusy} />
            </Modal>

            {/* Delete modal */}
            <Modal
                open={!!deleting}
                title="Delete Provisioning Criteria"
                onClose={() => setDeleting(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
                        <Button variant="danger" onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">Delete criteria <strong>{deleting?.name}</strong>?</p>
            </Modal>
        </div>
    );
};

export default ProvisioningCriteria;
