import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial: hook object for edit, or null for create
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const HookForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loadingTpl, setLoadingTpl] = useState(true);
    const [tpl, setTpl] = useState(null);

    // Core fields
    const [hookType, setHookType] = useState('Web');              // maps to "name" at API
    const [displayName, setDisplayName] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Events (array of {entityName, actionName})
    const [events, setEvents] = useState([]);

    // Transport config (array of {name, value})
    const [config, setConfig] = useState([{ name: '', value: '' }]);

    const [errors, setErrors] = useState({});

    // --- Load template ---
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingTpl(true);
            try {
                const r = await api.get('/hooks/template');
                if (!cancelled) setTpl(r?.data || {});
            } catch {
                if (!cancelled) setTpl(null);
            } finally {
                if (!cancelled) setLoadingTpl(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // --- Normalize template options ---
    const typeOptions = useMemo(() => {
        // Often comes as: { templates: [{name, displayName, configParameters:[..]}], events: [...] }
        const templates = tpl?.templates || tpl?.hookTemplates || tpl?.types || [];
        const list = Array.isArray(templates) ? templates : [];
        const fromTpl = list.map(t => t?.name || t?.type || t?.code).filter(Boolean);

        // Fallback options if template is empty
        const fallback = ['Web', 'Kafka', 'SMS'];

        const merged = Array.from(new Set([...fromTpl, ...fallback]));
        return merged;
    }, [tpl]);

    const templateForType = useMemo(() => {
        const templates = tpl?.templates || tpl?.hookTemplates || [];
        if (!Array.isArray(templates)) return null;
        return templates.find(t => (t?.name || t?.type || t?.code) === hookType) || null;
    }, [tpl, hookType]);

    const eventOptions = useMemo(() => {
        /**
         * We expect one of:
         * - tpl.events: [{entityName, actionName}] or {entities:[...], actions:[...]}
         * - tpl.entityActionOptions: [{entityName, actionName}]
         */
        const list = tpl?.events || tpl?.eventOptions || tpl?.entityActionOptions || [];
        let out = [];
        if (Array.isArray(list)) {
            out = list
                .map(e => {
                    const ent = e?.entityName || e?.entity || e?.entityType;
                    const act = e?.actionName || e?.action;
                    return ent && act ? { entityName: String(ent).toUpperCase(), actionName: String(act).toUpperCase() } : null;
                })
                .filter(Boolean);
        } else {
            // Fallback matrix
            const fallbackEntities = ['CLIENT', 'LOAN', 'SAVINGS', 'GROUP'];
            const fallbackActions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'DISBURSE', 'REPAYMENT'];
            fallbackEntities.forEach(ent => {
                fallbackActions.forEach(act => out.push({ entityName: ent, actionName: act }));
            });
        }

        // de-duplicate
        const dedup = [];
        const set = new Set();
        out.forEach(e => {
            const key = `${e.entityName}:${e.actionName}`;
            if (!set.has(key)) { set.add(key); dedup.push(e); }
        });
        return dedup;
    }, [tpl]);

    // Suggested config fields based on type/template
    const suggestedConfig = useMemo(() => {
        // If template defines configParameters: [{name, required, type, defaultValue}]
        const params = templateForType?.configParameters || templateForType?.config || [];
        if (Array.isArray(params) && params.length) {
            return params.map(p => ({
                name: p.name || p.key || '',
                required: !!(p.required || p.mandatory),
                type: p.type || 'string',
                defaultValue: p.defaultValue ?? '',
            })).filter(p => p.name);
        }
        // Fallbacks by type
        if (hookType === 'Web') {
            return [
                { name: 'payloadURL', required: true, type: 'string', defaultValue: '' },
                { name: 'httpMethod', required: true, type: 'string', defaultValue: 'POST' },
                { name: 'contentType', required: false, type: 'string', defaultValue: 'application/json' },
                { name: 'secret', required: false, type: 'string', defaultValue: '' },
                { name: 'connectTimeout', required: false, type: 'number', defaultValue: '' },
                { name: 'readTimeout', required: false, type: 'number', defaultValue: '' },
            ];
        }
        if (hookType === 'Kafka') {
            return [
                { name: 'bootstrapServers', required: true, type: 'string', defaultValue: '' },
                { name: 'topic', required: true, type: 'string', defaultValue: '' },
                { name: 'acks', required: false, type: 'string', defaultValue: '1' },
            ];
        }
        if (hookType === 'SMS') {
            return [
                { name: 'provider', required: true, type: 'string', defaultValue: '' },
                { name: 'senderId', required: false, type: 'string', defaultValue: '' },
            ];
        }
        return [];
    }, [templateForType, hookType]);

    // Hydrate initial
    useEffect(() => {
        if (!initial) {
            setHookType('Web');
            setDisplayName('');
            setIsActive(true);
            setEvents([]);
            // Pre-seed config with suggested fields
            setConfig(
                suggestedConfig.length
                    ? suggestedConfig.map(p => ({ name: p.name, value: p.defaultValue ?? '' }))
                    : [{ name: '', value: '' }]
            );
            setErrors({});
            return;
        }
        setHookType(initial.name || initial.type || 'Web');
        setDisplayName(initial.displayName || initial.name || '');
        setIsActive(initial.isActive != null ? Boolean(initial.isActive) : true);
        // Events could be in various shapes
        const evs = Array.isArray(initial.events) ? initial.events : [];
        setEvents(
            evs.map(e => ({
                entityName: (e.entityName || e.entity || e.entityType || '').toUpperCase(),
                actionName: (e.actionName || e.action || '').toUpperCase(),
            })).filter(e => e.entityName && e.actionName)
        );
        const cfg = Array.isArray(initial.config)
            ? initial.config.map(c => ({ name: c.name, value: c.value }))
            : (Array.isArray(initial.configParameters)
                ? initial.configParameters.map(c => ({ name: c.name, value: c.value }))
                : []);
        setConfig(cfg.length ? cfg : (suggestedConfig.length ? suggestedConfig.map(p => ({ name: p.name, value: p.defaultValue ?? '' })) : [{ name: '', value: '' }]));
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    // When type changes and it's a create form, seed config with suggested
    useEffect(() => {
        if (initial) return;
        setConfig(
            suggestedConfig.length
                ? suggestedConfig.map(p => ({ name: p.name, value: p.defaultValue ?? '' }))
                : [{ name: '', value: '' }]
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hookType, suggestedConfig.length]);

    const toggleEvent = (e) => {
        const key = `${e.entityName}:${e.actionName}`;
        const has = events.some(x => `${x.entityName}:${x.actionName}` === key);
        if (has) setEvents(prev => prev.filter(x => `${x.entityName}:${x.actionName}` !== key));
        else setEvents(prev => [...prev, e]);
    };

    const setCfg = (i, patch) => {
        setConfig(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    };
    const addCfg = () => setConfig(prev => [...prev, { name: '', value: '' }]);
    const delCfg = (i) => setConfig(prev => prev.filter((_, idx) => idx !== i));

    const validate = () => {
        const e = {};
        if (!displayName.trim()) e.displayName = 'Display name is required';
        if (!hookType) e.hookType = 'Type is required';
        if (!events.length) e.events = 'Select at least one event';
        // Required config fields
        suggestedConfig.forEach(p => {
            if (p.required) {
                const found = config.find(c => c.name === p.name);
                if (!found || String(found.value ?? '').trim() === '') {
                    e[`config:${p.name}`] = `${p.name} is required`;
                }
            }
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            name: hookType,                               // "Web" | "Kafka" | ...
            displayName: displayName.trim(),
            isActive: Boolean(isActive),
            events: events.map(e => ({ entityName: e.entityName, actionName: e.actionName })),
            config: config
                .map(c => ({ name: (c.name || '').trim(), value: String(c.value ?? '') }))
                .filter(c => c.name),
        };
        try {
            await onSubmit(payload);
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {loadingTpl ? (
                <Card><Skeleton height="6rem" /></Card>
            ) : null}

            {/* Basic */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Type *</label>
                        <select
                            value={hookType}
                            onChange={(e) => { setHookType(e.target.value); if (errors.hookType) setErrors(x => ({ ...x, hookType: '' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select…</option>
                            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {errors.hookType && <p className="text-xs text-red-500 mt-1">{errors.hookType}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Display Name *</label>
                        <input
                            value={displayName}
                            onChange={(e) => { setDisplayName(e.target.value); if (errors.displayName) setErrors(x => ({ ...x, displayName: '' })); }}
                            placeholder="e.g. Loan Disbursed Webhook"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>}
                    </div>
                </div>

                <label className="inline-flex items-center gap-2 mt-3">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    Active
                </label>
            </Card>

            {/* Events */}
            <Card>
                <div className="flex items-center justify-between">
                    <div className="font-semibold">Events *</div>
                    <div className="space-x-2">
                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); setEvents([]); }}>Clear</Button>
                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); setEvents(eventOptions.slice(0, 20)); }}>Quick Select</Button>
                    </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
                    {eventOptions.map((e, i) => {
                        const key = `${e.entityName}:${e.actionName}`;
                        const checked = events.some(x => `${x.entityName}:${x.actionName}` === key);
                        return (
                            <label key={key} className="inline-flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleEvent(e)}
                                />
                                <span><span className="font-mono">{e.entityName}</span> → <span className="font-mono">{e.actionName}</span></span>
                            </label>
                        );
                    })}
                </div>
                {errors.events && <p className="text-xs text-red-500 mt-2">{errors.events}</p>}
            </Card>

            {/* Transport config */}
            <Card>
                <div className="flex items-center justify-between">
                    <div className="font-semibold">Transport Config</div>
                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); addCfg(); }}>Add Row</Button>
                </div>
                <div className="mt-3 space-y-2">
                    {config.map((c, i) => {
                        const err = errors[`config:${c.name}`];
                        return (
                            <div key={i} className="grid md:grid-cols-5 gap-2">
                                <input
                                    value={c.name}
                                    onChange={(e) => setCfg(i, { name: e.target.value })}
                                    placeholder={suggestedConfig[i]?.name || 'name'}
                                    className="md:col-span-2 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <input
                                    value={c.value}
                                    onChange={(e) => setCfg(i, { value: e.target.value })}
                                    placeholder="value"
                                    className="md:col-span-3 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div className="md:col-span-5 text-right">
                                    <Button variant="danger" onClick={(e) => { e.preventDefault(); delCfg(i); }}>Remove</Button>
                                </div>
                                {err && <p className="text-xs text-red-500 md:col-span-5 -mt-1">{err}</p>}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Hook')}
                </Button>
            </div>
        </form>
    );
};

export default HookForm;
