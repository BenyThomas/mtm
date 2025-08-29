import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};
const normalizeList = (data) => {
    // Accepts array or object map { TYPE: date }
    if (Array.isArray(data)) {
        return data.map((x, i) => ({
            type: x.type || x.name || x.code || `TYPE_${i+1}`,
            date: x.date || x.businessDate || x.value || x,
        })).filter((x) => x.type);
    }
    if (data && typeof data === 'object') {
        return Object.entries(data).map(([k, v]) => ({
            type: k,
            date: (v && typeof v === 'object') ? (v.date || v.businessDate) : v,
        }));
    }
    return [];
};

import BusinessDateForm from '../components/BusinessDateForm';

const BusinessDates = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(null); // { type, date } or null
    const [saving, setSaving] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/businessdate');
            const list = normalizeList(res?.data);
            list.sort((a, b) => a.type.localeCompare(b.type));
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load business dates';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const typeOptions = useMemo(
        () => Array.from(new Set(items.map((x) => x.type))).sort((a, b) => a.localeCompare(b)),
        [items]
    );

    const filtered = useMemo(() => {
        const t = query.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.type, toISO(x.date)].map((s) => String(s || '').toLowerCase()).some((s) => s.includes(t))
        );
    }, [items, query]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.post('/businessdate', payload);
            addToast('Business date saved', 'success');
            setEditing(null);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const setAllToday = async () => {
        if (!items.length) return;
        setBulkBusy(true);
        try {
            const today = todayISO();
            // sequential to keep it simple; can parallel if needed
            for (const it of items) {
                await api.post('/businessdate', {
                    type: it.type,
                    date: today,
                    dateFormat: 'yyyy-MM-dd',
                    locale: 'en',
                });
            }
            addToast('All business dates set to today', 'success');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Bulk update failed';
            addToast(msg, 'error');
        } finally {
            setBulkBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Business Dates</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button variant="secondary" onClick={setAllToday} disabled={bulkBusy || !items.length}>
                        {bulkBusy ? 'Updating…' : 'Set All to Today'}
                    </Button>
                    <Button onClick={() => setEditing({})}>New Date</Button>
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
                            placeholder="Type or date…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No business dates found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Date</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((d) => (
                                <tr key={d.type} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{d.type}</td>
                                    <td className="py-2 pr-4">{toISO(d.date)}</td>
                                    <td className="py-2 pr-4">
                                        <Button variant="secondary" onClick={() => setEditing(d)}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create/Edit modal */}
            <Modal
                open={!!editing}
                title={editing?.type ? `Edit ${editing.type}` : 'Create / Update Business Date'}
                onClose={() => setEditing(null)}
                footer={null}
            >
                <BusinessDateForm
                    initial={editing?.type ? editing : null}
                    typeOptions={typeOptions}
                    onSubmit={save}
                    submitting={saving}
                />
            </Modal>
        </div>
    );
};

export default BusinessDates;
