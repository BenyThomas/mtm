import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import HookForm from '../components/HookForm';

const HookDetails = () => {
    const { hookId } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [hook, setHook] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/hooks/${hookId}`);
            const d = r?.data || {};
            setHook({
                id: d.id,
                name: d.name,
                displayName: d.displayName || d.name,
                isActive: d.isActive ?? d.active ?? true,
                events: d.events || [],
                config: Array.isArray(d.config)
                    ? d.config
                    : (Array.isArray(d.configParameters) ? d.configParameters : []),
            });
        } catch (e) {
            setHook(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load hook';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [hookId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.put(`/hooks/${hookId}`, payload);
            addToast('Hook updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="8rem" /></Card>
            </div>
        );
    }

    if (!hook) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Hook</h1>
                <Card>Not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{hook.displayName}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {hook.name} • {hook.isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/hooks')}>All Hooks</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">ID</div>
                        <div className="font-medium">{hook.id}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Active</div>
                        <div className="font-medium">{hook.isActive ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500 mb-1">Events</div>
                        {!hook.events?.length ? (
                            <div className="text-gray-600 dark:text-gray-400">None</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {hook.events.map((e, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
                    <span className="font-mono">{(e.entityName || e.entity || '').toString().toUpperCase()}</span>
                    <span className="mx-1">→</span>
                    <span className="font-mono">{(e.actionName || e.action || '').toString().toUpperCase()}</span>
                  </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Config */}
            <Card>
                <div className="text-sm text-gray-500 mb-2">Transport Config</div>
                {!hook.config?.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">None</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            {hook.config.map((c, i) => (
                                <tr key={i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.name}</td>
                                    <td className="py-2 pr-4 whitespace-pre-wrap break-all">{String(c.value ?? '')}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${hook.displayName}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <HookForm initial={hook} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default HookDetails;
