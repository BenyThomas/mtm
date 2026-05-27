import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoanCollateralForm from '../../components/LoanCollateralForm';
import { useToast } from '../../context/ToastContext';

const LoanCollaterals = ({ loanId: loanIdProp }) => {
    const { loanId: loanIdParam, id: loanIdRouteId } = useParams();
    const loanId = loanIdProp || loanIdParam || loanIdRouteId;
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');

    const [template, setTemplate] = useState(null);
    const [tplLoading, setTplLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const normalize = (list) => {
        return (Array.isArray(list) ? list : []).map((x, idx) => ({
            id: x.id ?? x.collateralId ?? idx + 1,
            typeId: x.typeId ?? x.collateralTypeId ?? x.type?.id,
            typeName: x.type?.name ?? x.collateralTypeName ?? x.type ?? '',
            quantity: x.quantity ?? 1,
            value: x.value ?? x.total ?? x.totalValue ?? x.amount ?? 0,
            description: x.description || '',
        }));
    };

    const loadTemplate = async () => {
        setTplLoading(true);
        try {
            const r = await api.get(`/loans/${loanId}/collaterals/template`);
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
            const r = await api.get(`/loans/${loanId}/collaterals`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setRows(normalize(list));
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load collaterals', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTemplate(); load(); }, [loanId]); // eslint-disable-line react-hooks/exhaustive-deps

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/loans/${loanId}/collaterals`, payload);
            addToast('Collateral added', 'success');
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
            const r = await api.get(`/loans/${loanId}/collaterals/${id}`);
            setEditItem(r?.data || null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load collateral', 'error');
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/loans/${loanId}/collaterals/${editItem.id}`, payload);
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
        if (!window.confirm('Remove this collateral?')) return;
        try {
            await api.delete(`/loans/${loanId}/collaterals/${id}`);
            addToast('Collateral removed', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    const filtered = rows.filter((r) => {
        const t = q.trim().toLowerCase();
        if (!t) return true;
        return [r.id, r.typeName, r.value, r.description]
            .map((v) => String(v || '').toLowerCase())
            .some((s) => s.includes(t));
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Loan Collaterals</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fineract allows loan collateral add/remove only before the loan is approved.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search collaterals..."
                        className="w-full md:w-56 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Button variant="secondary" onClick={() => { loadTemplate(); load(); }}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)} disabled={tplLoading}>Add Collateral</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No collaterals.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Quantity</th>
                                <th className="py-2 pr-4">Value</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.typeName || r.typeId}</td>
                                    <td className="py-2 pr-4">{r.quantity}</td>
                                    <td className="py-2 pr-4">{r.value}</td>
                                    <td className="py-2 pr-4">{r.description || '-'}</td>
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

            <Modal open={createOpen} title="Add Collateral" onClose={() => setCreateOpen(false)} footer={null}>
                <LoanCollateralForm loanId={loanId} template={template} onSubmit={create} submitting={busy} />
            </Modal>

            <Modal open={!!editItem} title="Edit Collateral" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <LoanCollateralForm loanId={loanId} initial={editItem} template={template} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default LoanCollaterals;
