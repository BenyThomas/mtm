// src/pages/config/EntityFieldConfig.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const COMMON_ENTITIES = [
    'clients',
    'groups',
    'loans',
    'savings',
    'staff',
    'offices',
    'charges',
    'loanproducts',
    'savingsproducts',
];

const EntityFieldConfig = () => {
    const { addToast } = useToast();

    const [entity, setEntity] = useState('clients');
    const [loading, setLoading] = useState(false);
    const [raw, setRaw] = useState(null);
    const [q, setQ] = useState('');
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

    const load = async (e = entity) => {
        setLoading(true);
        try {
            const r = await api.get(`/fieldconfiguration/${encodeURIComponent(e)}`);
            setRaw(r?.data ?? null);
        } catch (err) {
            setRaw(null);
            addToast(err?.response?.data?.defaultUserMessage || 'Failed to load field configuration', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load('clients'); /* initial load */ }, []);

    const rows = useMemo(() => {
        // The endpoint shape can vary; we try to normalize sensible keys.
        // Acceptable shapes:
        // 1) { fieldConfiguration: [{ field: 'firstname', enabled: true, mandatory: false, validationRegex: '...' }, ...] }
        // 2) Array of similar objects
        // 3) { pageItems: [...] }
        const data =
            (raw && (raw.fieldConfiguration || raw.fieldConfigurations)) ||
            (Array.isArray(raw) ? raw : raw?.pageItems) ||
            [];
        const norm = (data || []).map((x, idx) => ({
            id: x.id || idx + 1,
            field: x.field || x.fieldName || x.name || `#${idx + 1}`,
            enabled: typeof x.enabled === 'boolean' ? x.enabled : Boolean(x.isEnabled ?? x.active),
            mandatory: typeof x.mandatory === 'boolean' ? x.mandatory : Boolean(x.isMandatory),
            regex:
                x.validationRegex ||
                x.regex ||
                (x.validation && x.validation.regex) ||
                '',
            hint: x.description || x.hint || '',
            subentity: x.subentity || x.subEntity || x.section || '',
        }));

        let filtered = norm;
        if (showOnlyEnabled) filtered = filtered.filter((r) => r.enabled);
        const t = q.trim().toLowerCase();
        if (t) {
            filtered = filtered.filter((r) =>
                [r.field, r.regex, r.hint, r.subentity].some((v) => String(v || '').toLowerCase().includes(t))
            );
        }
        return filtered;
    }, [raw, q, showOnlyEnabled]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Entity Field Configuration</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => load(entity)}>Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-sm font-medium">Entity</label>
                        <div className="flex gap-2">
                            <select
                                value={entity}
                                onChange={(e) => setEntity(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {COMMON_ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <Button onClick={() => load(entity)}>Load</Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            You can also type a custom entity below and click Load.
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Custom Entity</label>
                        <input
                            placeholder="e.g. clients, loans, savings, staff …"
                            value={entity}
                            onChange={(e) => setEntity(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showOnlyEnabled}
                                onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                            />
                            <span className="text-sm">Show only enabled</span>
                        </label>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Field, regex, hint, subentity…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                {loading ? (
                    <Skeleton height="12rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No fields found for this entity.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Field</th>
                                <th className="py-2 pr-4">Enabled</th>
                                <th className="py-2 pr-4">Mandatory</th>
                                <th className="py-2 pr-4">Regex</th>
                                <th className="py-2 pr-4">Subentity</th>
                                <th className="py-2 pr-4">Hint</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.field}</td>
                                    <td className="py-2 pr-4">{r.enabled ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{r.mandatory ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{r.regex || '—'}</td>
                                    <td className="py-2 pr-4">{r.subentity || '—'}</td>
                                    <td className="py-2 pr-4">{r.hint || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default EntityFieldConfig;
