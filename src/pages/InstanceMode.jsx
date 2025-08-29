import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * This page PUTs /instance-mode to switch the instance state.
 * We attempt a GET for current value if the tenant supports it; if not, we show “Unknown”.
 * Common modes covered: READ_WRITE, READ_ONLY, MAINTENANCE
 */
const MODE_OPTIONS = [
    { value: 'READ_WRITE', label: 'Read-Write (Active)' },
    { value: 'READ_ONLY', label: 'Read-Only' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
];

const InstanceMode = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState('UNKNOWN'); // display only
    const [mode, setMode] = useState('READ_WRITE');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            // Some Fineract builds expose a GET; if not, this will 404 and we fallback gracefully.
            const r = await api.get('/instance-mode').catch(() => null);
            if (r?.data) {
                // Accept a few shapes: {mode:'READ_ONLY'}, 'READ_ONLY', { value:'READ_ONLY' }
                const val =
                    r.data.mode ||
                    r.data.value ||
                    (typeof r.data === 'string' ? r.data : 'UNKNOWN');
                setCurrent(String(val).toUpperCase());
                setMode(String(val).toUpperCase());
            } else {
                setCurrent('UNKNOWN');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        setSaving(true);
        try {
            // Keep payload lean. If your tenant expects different keys, adjust here.
            const payload = {
                mode,
                ...(note.trim() ? { note: note.trim() } : {}),
            };
            await api.put('/instance-mode', payload);
            addToast('Instance mode updated', 'success');
            setCurrent(mode);
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Instance Mode</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={save} disabled={saving || loading}>
                        {saving ? 'Saving…' : 'Apply'}
                    </Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="8rem" />
                ) : (
                    <div className="space-y-4">
                        <div className="text-sm">
                            <div className="text-gray-500">Current Mode</div>
                            <div className="font-semibold">{current}</div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">New Mode</label>
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {MODE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Note (optional)</label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Reason/description"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="text-xs text-gray-500">
                            Switching to <strong>READ_ONLY</strong> or <strong>MAINTENANCE</strong> may block write operations.
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default InstanceMode;
