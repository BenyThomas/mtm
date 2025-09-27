import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import { listPermissions, updateMakerChecker } from '../../api/permissions';
import { useToast } from '../../context/ToastContext';
import { RefreshCw, ShieldCheck, LockKeyhole } from 'lucide-react';

const Permissions = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [dirty, setDirty] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const perms = await listPermissions();
            setItems(perms);
            setDirty(perms); // baseline
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load permissions', 'error');
            setItems([]);
            setDirty([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        const src = dirty.length ? dirty : items;
        if (!t) return src;
        return src.filter(p =>
            [p.code, p.entityName, p.actionName, p.description]
                .map(v => String(v ?? '').toLowerCase())
                .some(h => h.includes(t))
        );
    }, [q, items, dirty]);

    const toggleMC = (id) => {
        setDirty(prev => prev.map(p => (p.id === id ? { ...p, makerCheckerEnabled: !p.makerCheckerEnabled } : p)));
    };

    const openEdit = () => {
        setDirty(items);
        setEditOpen(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            await updateMakerChecker(dirty);
            addToast('Permissions updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold inline-flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" /> Permissions
                </h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                    <Button onClick={openEdit}><LockKeyhole className="w-4 h-4 mr-1" /> Enable/Disable Maker-Checker</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <label className="block text-sm font-medium">Search</label>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Code, entity, action, description…"
                    className="mt-1 w-full border rounded-md p-2"
                />
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600">No permissions found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Code</th>
                                <th className="py-2 pr-4">Entity</th>
                                <th className="py-2 pr-4">Action</th>
                                <th className="py-2 pr-4">Maker-Checker</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id} className="border-t text-sm">
                                    <td className="py-2 pr-4">{p.id}</td>
                                    <td className="py-2 pr-4">{p.code}</td>
                                    <td className="py-2 pr-4">{p.entityName}</td>
                                    <td className="py-2 pr-4">{p.actionName}</td>
                                    <td className="py-2 pr-4">{p.makerCheckerEnabled ? 'Enabled' : 'Disabled'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Maker-Checker bulk edit (modal with toggles rendered as clickable rows) */}
            <Modal
                open={editOpen}
                onClose={() => { if (!saving) setEditOpen(false); }}
                title="Enable / Disable Maker-Checker"
                size="5xl"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    </>
                }
            >
                <div className="text-sm text-gray-600 mb-3">Click a row to toggle Maker-Checker (write actions only).</div>
                <div className="max-h-[60vh] overflow-auto border rounded-md">
                    <table className="min-w-full">
                        <thead>
                        <tr className="text-left text-sm text-gray-500">
                            <th className="py-2 pr-4">Code</th>
                            <th className="py-2 pr-4">Entity</th>
                            <th className="py-2 pr-4">Action</th>
                            <th className="py-2 pr-4">Eligible</th>
                            <th className="py-2 pr-4">Maker-Checker</th>
                        </tr>
                        </thead>
                        <tbody>
                        {dirty.map(p => (
                            <tr
                                key={p.id}
                                className={`border-t cursor-pointer hover:bg-gray-50 ${!p.isWrite ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => p.isWrite && toggleMC(p.id)}
                            >
                                <td className="py-2 pr-4">{p.code}</td>
                                <td className="py-2 pr-4">{p.entityName}</td>
                                <td className="py-2 pr-4">{p.actionName}</td>
                                <td className="py-2 pr-4">{p.isWrite ? 'Yes' : 'No (read-only)'}</td>
                                <td className="py-2 pr-4">{p.makerCheckerEnabled ? 'Enabled' : 'Disabled'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};

export default Permissions;
