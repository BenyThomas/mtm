import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import CollateralManagementForm from '../../components/CollateralManagementForm';
import { useToast } from '../../context/ToastContext';

const CollateralManagement = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const [template, setTemplate] = useState(null);
    const [tplLoading, setTplLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const normalize = (list) => {
        return (Array.isArray(list) ? list : []).map((x, idx) => ({
            id: x.id ?? idx + 1,
            name: x.name || '',
            typeId: x.typeId ?? x.collateralTypeId ?? x.type?.id,
            typeName: x.type?.name ?? x.collateralTypeName ?? x.type ?? '',
            quality: x.quality || '',
            unitTypeId: x.unitTypeId || '',
            basePrice: x.basePrice ?? x.unitPrice ?? '',
            description: x.description || '',
        }));
    };

    const loadTemplate = async () => {
        setTplLoading(true);
        try {
            const r = await api.get('/collateral-management/template');
            setTemplate(r?.data || {});
        } catch (e) {
            setTemplate(null);
            addToast('Failed to load collateral template', 'error');
        } finally {
            setTplLoading(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/collateral-management');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setRows(normalize(list));
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load collaterals', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTemplate(); load(); }, []); // eslint-disable-line

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/collateral-management', payload);
            addToast('Collateral created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const openEdit = async (id) => {
        try {
            const r = await api.get(`/collateral-management/${id}`);
            setEditItem(r?.data || null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load collateral', 'error');
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/collateral-management/${editItem.id}`, payload);
            addToast('Collateral updated', 'success');
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
        if (!window.confirm('Delete this collateral?')) return;
        try {
            await api.delete(`/collateral-management/${id}`);
            addToast('Collateral deleted', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Collateral Management</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { loadTemplate(); load(); }}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)} disabled={tplLoading}>New Collateral</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No collaterals found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Quality</th>
                                <th className="py-2 pr-4">Unit Type</th>
                                <th className="py-2 pr-4">Base Price</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.name || '—'}</td>
                                    <td className="py-2 pr-4">{r.typeName || r.typeId}</td>
                                    <td className="py-2 pr-4">{r.quality || '—'}</td>
                                    <td className="py-2 pr-4">{r.unitTypeId || '—'}</td>
                                    <td className="py-2 pr-4">{r.basePrice}</td>
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
            <Modal open={createOpen} title="New Collateral" onClose={() => setCreateOpen(false)} footer={null}>
                <CollateralManagementForm template={template} onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title="Edit Collateral" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <CollateralManagementForm initial={editItem} template={template} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default CollateralManagement;
