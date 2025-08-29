import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import GlobalConfigForm from '../components/GlobalConfigForm';

const asBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
    return false;
};

const GlobalConfigDetails = () => {
    const { key } = useParams(); // key can be name or id
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [cfg, setCfg] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            let data = null;

            // Try as name
            try {
                const r1 = await api.get(`/configurations/name/${encodeURIComponent(key)}`);
                data = r1?.data;
            } catch {
                // Try as id
                const r2 = await api.get(`/configurations/${key}`);
                data = r2?.data;
            }

            if (!data) throw new Error('Not found');

            setCfg({
                id: data.id,
                name: data.name,
                enabled: data.enabled,
                value: data.value,
                stringValue: data.stringValue,
                description: data.description,
            });
        } catch (err) {
            setCfg(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load configuration';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [key]);

    const save = async (payload) => {
        if (!cfg) return;
        setSaving(true);
        try {
            try {
                await api.put(`/configurations/name/${encodeURIComponent(cfg.name)}`, payload);
            } catch {
                await api.put(`/configurations/${cfg.id}`, payload);
            }
            addToast('Configuration saved', 'success');
            setEditOpen(false);
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

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="8rem" /></Card>
            </div>
        );
    }

    if (!cfg) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Global Configuration</h1>
                <Card>Configuration not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Config: {cfg.name}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {asBool(cfg.enabled) ? 'Enabled' : 'Disabled'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/global-config')}>All Configs</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">ID</div>
                        <div className="font-medium">{cfg.id}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Name</div>
                        <div className="font-medium">{cfg.name}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Value</div>
                        <div className="font-medium">{cfg.value ?? '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">String Value</div>
                        <div className="font-medium">{cfg.stringValue || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">
                            {cfg.description || '—'}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${cfg.name}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <GlobalConfigForm initial={cfg} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default GlobalConfigDetails;
