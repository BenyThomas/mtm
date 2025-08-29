import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import FinancialActivityMappingForm from '../components/FinancialActivityMappingForm';
import { useNavigate } from 'react-router-dom';

const normalizeFAOptions = (tpl) => {
    const raw =
        tpl?.financialActivityOptions ||
        tpl?.financialActivities ||
        tpl?.financialActivityData ||
        [];
    const map = new Map();
    raw.forEach((o) => {
        const id = o.id ?? o.value ?? o.code;
        if (id != null && !map.has(id)) map.set(id, o.name ?? o.value ?? o.code ?? `Activity ${id}`);
    });
    return map;
};

const normalizeGLAccountMap = (tpl) => {
    const list = [
        ...(tpl?.glAccountOptions || []),
        ...(tpl?.assetAccountOptions || []),
        ...(tpl?.incomeAccountOptions || []),
        ...(tpl?.expenseAccountOptions || []),
        ...(tpl?.liabilityAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.assetAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.incomeAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.expenseAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.liabilityAccountOptions || []),
    ];
    const map = new Map();
    list.forEach((a) => {
        const id = a.id ?? a.accountId;
        if (id == null || map.has(id)) return;
        const code = a.glCode || a.code || id;
        const name = a.name || a.accountName || '';
        map.set(id, `${code}${name ? ` — ${name}` : ''}`);
    });
    return map;
};

const FinancialActivityMappings = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [templateLoading, setTemplateLoading] = useState(true);
    const [faMap, setFaMap] = useState(new Map());
    const [glMap, setGlMap] = useState(new Map());

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleteId, setDeleteId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financialactivityaccounts');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplate = async () => {
        setTemplateLoading(true);
        try {
            const res = await api.get('/financialactivityaccounts/template');
            setFaMap(normalizeFAOptions(res?.data || {}));
            setGlMap(normalizeGLAccountMap(res?.data || {}));
        } catch {
            setFaMap(new Map());
            setGlMap(new Map());
        } finally {
            setTemplateLoading(false);
        }
    };

    useEffect(() => {
        loadList();
        loadTemplate();
    }, []);

    const createMapping = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/financialactivityaccounts', payload);
            addToast('Mapping created', 'success');
            setCreateOpen(false);
            await loadList();
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

    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/financialactivityaccounts/${deleteId}`);
            addToast('Mapping deleted', 'success');
            setDeleteId(null);
            await loadList();
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

    const faName = (id) => {
        if (faMap.has(id)) return faMap.get(id);
        if (faMap.has(Number(id))) return faMap.get(Number(id));
        return id;
    };
    const glName = (id) => {
        if (glMap.has(id)) return glMap.get(id);
        if (glMap.has(Number(id))) return glMap.get(Number(id));
        return id;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Financial Activity ↔ GL Account</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Mapping</Button>
                    <Button variant="secondary" onClick={() => { loadList(); loadTemplate(); }}>
                        Refresh
                    </Button>
                </div>
            </div>

            <Card>
                {loading || templateLoading ? (
                    <Skeleton height="10rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No mappings found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Financial Activity</th>
                                <th className="py-2 pr-4">GL Account</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((m) => (
                                <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{m.id}</td>
                                    <td className="py-2 pr-4">{faName(m.financialActivityId)}</td>
                                    <td className="py-2 pr-4">{glName(m.glAccountId)}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/financial-activity-mappings/${m.id}`)}>
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleteId(m.id)}>Delete</Button>
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
                title="New Financial Activity Mapping"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <FinancialActivityMappingForm onSubmit={createMapping} submitting={createBusy} />
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleteId}
                title="Delete Mapping"
                onClose={() => setDeleteId(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to delete mapping <strong>#{deleteId}</strong>? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default FinancialActivityMappings;
