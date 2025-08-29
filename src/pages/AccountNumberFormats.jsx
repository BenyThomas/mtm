import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import AccountNumberFormatForm from '../components/AccountNumberFormatForm';

const labelEnum = (objOrVal) => {
    if (!objOrVal && objOrVal !== 0) return '-';
    if (typeof objOrVal === 'object') {
        return objOrVal.name || objOrVal.value || objOrVal.code || objOrVal.id || '-';
    }
    return String(objOrVal);
};

const AccountNumberFormats = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [query, setQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/accountnumberformats');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load formats';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = query.trim().toLowerCase();
        if (!t) return items;
        return items.filter((f) => {
            const hay = [
                labelEnum(f.accountType),
                labelEnum(f.prefixType),
                f.prefixValue,
                labelEnum(f.suffixType),
                f.suffixValue,
                f.accountNumberLength,
                f.id,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, query]);

    const createFormat = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/accountnumberformats', payload);
            addToast('Account number format created', 'success');
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Account Number Formats</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Format</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type, prefix/suffix, length…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No formats found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Account Type</th>
                                <th className="py-2 pr-4">Length</th>
                                <th className="py-2 pr-4">Prefix</th>
                                <th className="py-2 pr-4">Suffix</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((f) => (
                                <tr key={f.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{f.id}</td>
                                    <td className="py-2 pr-4">{labelEnum(f.accountType)}</td>
                                    <td className="py-2 pr-4">{f.accountNumberLength}</td>
                                    <td className="py-2 pr-4">
                                        {`${labelEnum(f.prefixType)}${f.prefixValue ? `: ${f.prefixValue}` : ''}`}
                                    </td>
                                    <td className="py-2 pr-4">
                                        {`${labelEnum(f.suffixType)}${f.suffixValue ? `: ${f.suffixValue}` : ''}`}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate(`/config/account-number-formats/${f.id}`)}
                                        >
                                            View / Edit
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
                title="New Account Number Format"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <AccountNumberFormatForm onSubmit={createFormat} submitting={createBusy} />
            </Modal>
        </div>
    );
};

export default AccountNumberFormats;
