import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import GlAccountForm from '../components/GlAccountForm';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge';

const typeName = (a) => a?.type?.value || a?.type?.name || a?.typeName || '';
const usageName = (a) => a?.usage?.value || a?.usage?.name || a?.usageName || '';

const GlAccounts = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [usageFilter, setUsageFilter] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleteId, setDeleteId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/glaccounts');
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
        return items.filter((a) => {
            if (q) {
                const hay = [
                    a.name,
                    a.glCode || a.code,
                    typeName(a),
                    usageName(a),
                    a.description,
                    a.id,
                ].map((x) => String(x || '').toLowerCase());
                if (!hay.some((h) => h.includes(q))) return false;
            }
            if (typeFilter && !new RegExp(typeFilter, 'i').test(typeName(a))) return false;
            if (usageFilter && !new RegExp(usageFilter, 'i').test(usageName(a))) return false;
            return true;
        });
    }, [items, query, typeFilter, usageFilter]);

    const createAccount = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/glaccounts', payload);
            addToast('GL account created', 'success');
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
            await api.delete(`/glaccounts/${deleteId}`);
            addToast('GL account deleted', 'success');
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

    const downloadTemplate = async () => {
        try {
            const res = await api.get('/glaccounts/downloadtemplate', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'glaccounts_template.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('Template downloaded', 'success');
        } catch (err) {
            addToast('Download failed', 'error');
        }
    };

    const uploadTemplate = async (file) => {
        if (!file) return;
        try {
            const form = new FormData();
            form.append('file', file);
            await api.post('/glaccounts/uploadtemplate', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Template uploaded', 'success');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Upload failed';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">GL Accounts</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => uploadTemplate(e.target.files?.[0])}
                        />
                        Upload Template
                    </label>
                    <Button onClick={() => setCreateOpen(true)}>New Account</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            placeholder="Name, code, type, usage…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="asset">Asset</option>
                            <option value="liability">Liability</option>
                            <option value="equity">Equity</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Usage</label>
                        <select
                            value={usageFilter}
                            onChange={(e) => setUsageFilter(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="detail">Detail</option>
                            <option value="header">Header</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No GL accounts found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Code</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Usage</th>
                                <th className="py-2 pr-4">Manual</th>
                                <th className="py-2 pr-4">Disabled</th>
                                <th className="py-2 pr-4">Parent</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((a) => (
                                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{a.id}</td>
                                    <td className="py-2 pr-4">{a.glCode || a.code}</td>
                                    <td className="py-2 pr-4">{a.name}</td>
                                    <td className="py-2 pr-4">
                                        <Badge tone="blue">{typeName(a) || '-'}</Badge>
                                    </td>
                                    <td className="py-2 pr-4">
                                        <Badge tone="gray">{usageName(a) || '-'}</Badge>
                                    </td>
                                    <td className="py-2 pr-4">{a.manualEntriesAllowed ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{a.disabled ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{a.parentName || a.parent?.name || a.parentId || '-'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/gl-accounts/${a.id}`)}>
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleteId(a.id)}>
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
                title="New GL Account"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <GlAccountForm onSubmit={createAccount} submitting={createBusy} />
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleteId}
                title="Delete GL Account"
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
                    Are you sure you want to delete account <strong>#{deleteId}</strong>? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default GlAccounts;
