import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import GlobalConfigForm from '../components/GlobalConfigForm';

const pickList = (data) => {
    // Accepts array or {globalConfiguration:[...]} wrappers
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.globalConfiguration)) return data.globalConfiguration;
    if (data && Array.isArray(data.pageItems)) return data.pageItems;
    return [];
};

const asBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
    return false;
};

const GlobalConfigurations = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/configurations');
            const list = pickList(res?.data).map((x) => ({
                id: x.id,
                name: x.name,
                enabled: x.enabled,
                value: x.value,
                stringValue: x.stringValue,
                description: x.description,
            }));
            // Keep notable flags first
            const orderHint = [
                'maker-checker',
                'reschedule-future-repayments',
                'allow-transactions-on-non-workingday',
                'reschedule-repayments-on-holidays',
                'allow-transactions-on-holiday',
                'savings-interest-posting-current-period-end',
                'financial-year-beginning-month',
                'meetings-mandatory-for-jlg-loans',
            ];
            list.sort((a, b) => {
                const ia = orderHint.indexOf(a.name);
                const ib = orderHint.indexOf(b.name);
                if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load global configurations';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((c) => {
            const hay = [
                c.name, c.description, c.id, c.value, c.stringValue, c.enabled,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, q]);

    const quickToggle = async (item) => {
        const newEnabled = !asBool(item.enabled);
        // Prefer update-by-name
        try {
            await api.put(`/configurations/name/${encodeURIComponent(item.name)}`, { enabled: newEnabled });
        } catch {
            await api.put(`/configurations/${item.id}`, { enabled: newEnabled });
        }
        addToast(`"${item.name}" ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
        await load();
    };

    const save = async (payload) => {
        if (!editing) return;
        setSaving(true);
        try {
            // Try by name first for stability across tenants
            try {
                await api.put(`/configurations/name/${encodeURIComponent(editing.name)}`, payload);
            } catch {
                await api.put(`/configurations/${editing.id}`, payload);
            }
            addToast('Configuration saved', 'success');
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Global Configuration</h1>
                <div className="space-x-2">
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
                            placeholder="Name, description, value…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No configuration items found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Enabled</th>
                                <th className="py-2 pr-4">Value</th>
                                <th className="py-2 pr-4">String</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((c) => (
                                <tr key={`${c.id}-${c.name}`} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.id}</td>
                                    <td className="py-2 pr-4">
                                        <div className="font-medium">{c.name}</div>
                                        {c.description ? (
                                            <div className="text-xs text-gray-500 line-clamp-2">{c.description}</div>
                                        ) : null}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <label className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={asBool(c.enabled)}
                                                onChange={() => quickToggle(c)}
                                            />
                                            <span>{asBool(c.enabled) ? 'On' : 'Off'}</span>
                                        </label>
                                    </td>
                                    <td className="py-2 pr-4">{c.value ?? '—'}</td>
                                    <td className="py-2 pr-4">{c.stringValue || '—'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => setEditing(c)}>Edit</Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.location.assign(`/config/global-config/${encodeURIComponent(c.name)}`)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={!!editing}
                title={editing ? `Edit: ${editing.name}` : 'Edit Config'}
                onClose={() => setEditing(null)}
                footer={null}
            >
                {editing ? (
                    <GlobalConfigForm initial={editing} onSubmit={save} submitting={saving} />
                ) : null}
            </Modal>
        </div>
    );
};

export default GlobalConfigurations;
