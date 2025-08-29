import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import AccountingRuleForm from '../components/AccountingRuleForm';

const AccountingRules = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [query, setQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/accountingrules');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((r) => {
            const hay = [
                r.name, r.description, r.officeName, r.id,
            ].map((x) => String(x || '').toLowerCase());
            return hay.some((h) => h.includes(q));
        });
    }, [items, query]);

    const createRule = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/accountingrules', payload);
            addToast('Accounting rule created', 'success');
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
        if (!deleteId) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/accountingrules/${deleteId}`);
            addToast('Accounting rule deleted', 'success');
            setDeleteId(null);
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
                <h1 className="text-2xl font-bold">Accounting Rules</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Rule</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Name, description, office…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No accounting rules found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Multiple</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.name}</td>
                                    <td className="py-2 pr-4">{r.officeName || r.officeId || '-'}</td>
                                    <td className="py-2 pr-4">
                                        D:{r.allowMultipleDebitEntries ? 'Y' : 'N'} / C:{r.allowMultipleCreditEntries ? 'Y' : 'N'}
                                    </td>
                                    <td className="py-2 pr-4">{r.description || '-'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/accounting-rules/${r.id}`)}>
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleteId(r.id)}>Delete</Button>
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
                title="New Accounting Rule"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <AccountingRuleForm onSubmit={createRule} submitting={createBusy} />
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleteId}
                title="Delete Rule"
                onClose={() => setDeleteId(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to delete rule <strong>#{deleteId}</strong>? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default AccountingRules;
