import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import EntityDatatableCheckForm from '../components/EntityDatatableCheckForm';

const EntityDatatableChecks = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleting, setDeleting] = useState(null); // item
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/entityDatatableChecks');
            // Response can be array or {pageItems:[...]}
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            // Normalize typical props with safe defaults
            const norm = list.map((x) => ({
                id: x.id ?? x.entityDatatableCheckId ?? x.checkId,
                entity: x.entity ?? x.entityName ?? x.apptableName ?? '',
                status: x.status ?? x.statusName ?? x.when ?? '',
                datatableName: x.datatableName ?? x.dataTableName ?? x.tableName ?? '',
                productId: x.productId ?? x.loanProductId ?? x.savingsProductId ?? null,
                productName: x.productName ?? x.loanProductName ?? x.savingsProductName ?? '',
            }));
            norm.sort((a, b) => String(a.entity).localeCompare(String(b.entity)) || String(a.datatableName).localeCompare(String(b.datatableName)));
            setItems(norm);
        } catch (err) {
            setItems([]);
            const msg = err?.response?.data?.defaultUserMessage || 'Failed to load checks';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((i) => {
            const hay = [
                i.id, i.entity, i.status, i.datatableName, i.productId, i.productName,
            ].map((v) => String(v ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, q]);

    const createItem = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/entityDatatableChecks', payload);
            addToast('Entity datatable check created', 'success');
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
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/entityDatatableChecks/${deleting.id}`);
            addToast('Check deleted', 'success');
            setDeleting(null);
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
                <h1 className="text-2xl font-bold">Entity Datatable Checks</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Check</Button>
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
                            placeholder="Entity, status, datatable, product…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No checks found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Entity</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Datatable</th>
                                <th className="py-2 pr-4">Product</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((i) => (
                                <tr key={i.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{i.id}</td>
                                    <td className="py-2 pr-4">{i.entity}</td>
                                    <td className="py-2 pr-4">{String(i.status)}</td>
                                    <td className="py-2 pr-4">{i.datatableName}</td>
                                    <td className="py-2 pr-4">{i.productName || i.productId || '—'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="danger" onClick={() => setDeleting(i)}>Delete</Button>
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
                title="New Entity Datatable Check"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <EntityDatatableCheckForm onSubmit={createItem} submitting={createBusy} />
            </Modal>

            {/* Delete modal */}
            <Modal
                open={!!deleting}
                title="Delete Check"
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
                <p className="text-sm">
                    Delete check <strong>#{deleting?.id}</strong> for <strong>{deleting?.entity}</strong> → <strong>{deleting?.datatableName}</strong>?
                </p>
            </Modal>
        </div>
    );
};

export default EntityDatatableChecks;
