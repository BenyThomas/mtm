import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

/**
 * This page is resilient to multiple backend shapes:
 *  - { enabled: true }                                  // global toggle
 *  - true/false                                         // rare: boolean body → treated as { enabled }
 *  - { enabled: true, events: [{name, enabled}, ...] }  // list under "events"
 *  - { events: { Loan:true, Client:false, ... }, ... }  // map under "events"
 *  - [{ id/name/code/type, enabled }, ...]              // array of items
 *
 * We normalize everything into a flat list of items with "path" back-references.
 * On save we write the new booleans back into a clone of the original shape and PUT it.
 */

// Build a display label from a raw node
const labelOf = (node, fallback) => {
    const first =
        node?.name ??
        node?.displayName ??
        node?.code ??
        node?.type ??
        node?.key ??
        node?.id ??
        '';
    const txt = String(first || '').trim();
    return txt || fallback;
};

// Set nested value by path (supports keys and numeric indices)
const setByPath = (root, path, value) => {
    if (!path || !path.length) return root;
    const clone = Array.isArray(root) ? [...root] : { ...root };
    let cur = clone;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const next = cur[key];
        cur[key] = Array.isArray(next)
            ? [...next]
            : (next && typeof next === 'object')
                ? { ...next }
                : (typeof path[i + 1] === 'number' ? [] : {});
        cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return clone;
};

// Normalize server config into flat items with paths to booleans
const normalize = (data) => {
    const items = [];
    const paths = []; // parallel array for quicker access

    // Case: primitive boolean → treat as {enabled}
    if (typeof data === 'boolean') {
        items.push({ key: '__global__', label: 'External events', enabled: data });
        paths.push(['enabled']); // we’ll later wrap back into {enabled}
        return { items, paths, kind: 'primitive-boolean' };
    }

    // Case: object-ish
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Root "enabled"
        if (Object.prototype.hasOwnProperty.call(data, 'enabled')) {
            items.push({
                key: '__global__',
                label: 'External events',
                enabled: !!data.enabled,
            });
            paths.push(['enabled']);
        }

        // Any other root-level boolean switches (e.g. "postToKafka": true)
        Object.entries(data).forEach(([k, v]) => {
            if (k === 'enabled') return;
            if (typeof v === 'boolean') {
                items.push({ key: k, label: k, enabled: v });
                paths.push([k]);
            }
        });

        // Events as list or map
        if (Array.isArray(data.events)) {
            data.events.forEach((ev, idx) => {
                if (typeof ev?.enabled === 'boolean') {
                    items.push({
                        key: `events[${idx}]`,
                        label: `Event: ${labelOf(ev, `Item ${idx + 1}`)}`,
                        enabled: !!ev.enabled,
                    });
                    paths.push(['events', idx, 'enabled']);
                }
            });
        } else if (data.events && typeof data.events === 'object') {
            Object.entries(data.events).forEach(([k, v]) => {
                if (typeof v === 'boolean') {
                    items.push({
                        key: `events.${k}`,
                        label: `Event: ${k}`,
                        enabled: !!v,
                    });
                    paths.push(['events', k]);
                }
            });
        }

        return { items, paths, kind: 'object' };
    }

    // Case: array of items
    if (Array.isArray(data)) {
        data.forEach((row, idx) => {
            const flag = row?.enabled ?? row?.isEnabled ?? row?.active;
            if (typeof flag === 'boolean') {
                items.push({
                    key: row?.id ?? row?.code ?? row?.name ?? row?.type ?? String(idx),
                    label: labelOf(row, `Item ${idx + 1}`),
                    enabled: !!flag,
                });
                // Assume "enabled" is the key to flip
                paths.push([idx, Object.prototype.hasOwnProperty.call(row, 'enabled') ? 'enabled'
                    : (Object.prototype.hasOwnProperty.call(row, 'isEnabled') ? 'isEnabled' : 'active')]);
            }
        });
        return { items, paths, kind: 'array' };
    }

    // Fallback: nothing togglable
    return { items: [], paths: [], kind: 'unknown' };
};

const ExternalEventsConfig = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [raw, setRaw] = useState(null);

    const [items, setItems] = useState([]);     // [{key,label,enabled}]
    const [paths, setPaths] = useState([]);     // [[path...]]
    const [kind, setKind] = useState('object'); // shape info
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            // Base path is already /api/api/v1 via axios baseURL
            const r = await api.get('/externalevents/configuration');
            const data = r?.data;
            setRaw(data);
            const norm = normalize(data);
            setItems(norm.items);
            setPaths(norm.paths);
            setKind(norm.kind);
        } catch (e) {
            setRaw(null);
            setItems([]);
            setPaths([]);
            setKind('unknown');
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load configuration';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setAll = (val) => {
        setItems((prev) => prev.map((i) => ({ ...i, enabled: !!val })));
    };

    const save = async () => {
        if (!paths.length) {
            addToast('Nothing to save', 'info');
            return;
        }
        setSaving(true);
        try {
            let payload;

            if (kind === 'primitive-boolean') {
                // PUT expects an object; send { enabled: ... }
                const globalIdx = items.findIndex((i) => i.key === '__global__');
                const flag = globalIdx >= 0 ? !!items[globalIdx].enabled : false;
                payload = { enabled: flag };
            } else {
                // Clone the original and set all toggles back by path
                let updated = raw;
                items.forEach((item, i) => {
                    updated = setByPath(updated, paths[i], !!item.enabled);
                });
                // If original was primitive boolean, wrap into object
                if (typeof updated === 'boolean') {
                    updated = { enabled: updated };
                }
                payload = updated;
            }

            await api.put('/externalevents/configuration', payload);
            addToast('External events configuration saved', 'success');
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasGlobal = useMemo(
        () => items.some((i) => i.key === '__global__'),
        [items]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">External Events</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button variant="secondary" onClick={() => setAll(true)}>Enable All</Button>
                    <Button variant="secondary" onClick={() => setAll(false)}>Disable All</Button>
                    <Button onClick={save} disabled={saving || loading}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        No toggles available in this tenant’s configuration.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Setting</th>
                                <th className="py-2 pr-4">Enabled</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((it, idx) => (
                                <tr key={it.key || idx} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">
                                        {it.label}
                                        {it.key === '__global__' && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">
                          Global
                        </span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={!!it.enabled}
                                                onChange={(e) => {
                                                    const v = e.target.checked;
                                                    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, enabled: v } : p)));
                                                }}
                                            />
                                            <span>{it.enabled ? 'On' : 'Off'}</span>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {!hasGlobal && (
                            <div className="text-xs text-gray-500 mt-3">
                                Tip: Your tenant doesn’t expose a global switch; you can still bulk enable/disable using the buttons above.
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ExternalEventsConfig;
