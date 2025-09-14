import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

const DATE_FORMAT_LABEL = 'dd MMMM yyyy';

// ---- date helpers ----
const pad = (n) => String(n).padStart(2, '0');

const arrToISO = (arr) => {
    // Fineract array date: [yyyy, mm, dd]
    if (Array.isArray(arr) && arr.length >= 3) {
        const [y, m, d] = arr;
        return `${y}-${pad(m)}-${pad(d)}`;
    }
    // already string?
    if (typeof arr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(arr)) return arr;
    return '';
};

const isoToDdMMMM = (iso) => {
    // stable UTC rendering to avoid TZ shifting
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map((x) => Number(x));
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    return dt.toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }); // => "11 April 2016"
};

// ---- UI helpers ----
const normalizeOptions = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((o) => ({
            id: o?.id ?? o?.taxComponentId,
            name: o?.name || o?.value || `#${o?.id}`,
        }))
        .filter((x) => x.id);
};

/**
 * Props:
 * - initial: { id, name, taxComponents: [{ taxComponentId, startDate }] }
 * - onSubmit: (payload) => Promise
 * - submitting: boolean
 */
const TaxGroupForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [componentOptions, setComponentOptions] = useState([]);

    // Form fields
    const [name, setName] = useState(initial?.name || '');

    // rows: [{ id: '7', startISO: '2016-04-11' }]
    const [rows, setRows] = useState(() => {
        if (!Array.isArray(initial?.taxComponents)) return [];
        return initial.taxComponents
            .map((c) => ({
                id: String(c?.taxComponentId ?? c?.id ?? ''),
                startISO: arrToISO(c?.startDate),
            }))
            .filter((r) => r.id);
    });

    const [errors, setErrors] = useState({});

    // Load template/options
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const tpl = await api.get('/taxes/group/template').catch(() => ({ data: {} }));
                let opts = normalizeOptions(
                    tpl?.data?.taxComponentOptions || tpl?.data?.taxComponents || []
                );

// Fallback to /taxes/component if template lacked options
                if (!opts.length) {
                    try {
                        const r = await api.get('/taxes/component');
                        opts = normalizeOptions(r?.data || []);
                    } catch {/* ignore */}
                }

                if (!cancelled) setComponentOptions(opts);
            } catch {
                if (!cancelled) setComponentOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Rehydrate if editing changes
    useEffect(() => {
        if (!initial) return;
        setName(initial?.name || '');
        const nextRows = Array.isArray(initial?.taxComponents)
            ? initial.taxComponents
                .map((c) => ({
                    id: String(c?.taxComponentId ?? c?.id ?? ''),
                    startISO: arrToISO(c?.startDate),
                }))
                .filter((r) => r.id)
            : [];
        setRows(nextRows);
        setErrors({});
    }, [initial?.id]);

    // Avoid duplicate selection by hiding chosen components from other rows
    const selectedIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

    const availableForIndex = (idx) => {
        const currentId = rows[idx]?.id;
        return componentOptions.filter(
            (o) => o.id === Number(currentId) || !selectedIds.has(String(o.id))
        );
    };

    const addRow = () => {
        setRows((prev) => [...prev, { id: '', startISO: '' }]);
    };

    const removeRow = (idx) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateRowId = (idx, id) => {
        setRows((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], id };
            return copy;
        });
    };

    const updateRowDate = (idx, iso) => {
        setRows((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], startISO: iso };
            return copy;
        });
    };

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        // ensure each row with id has valid format date (optional but if provided must be YYYY-MM-DD)
        rows.forEach((r, i) => {
            if (!r.id) e[`row-${i}-id`] = 'Component is required';
            if (r.startISO && !/^\d{4}-\d{2}-\d{2}$/.test(r.startISO)) {
                e[`row-${i}-date`] = 'Date must be YYYY-MM-DD';
            }
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const taxComponents = rows
            .filter((r) => r.id)
            .map((r) => ({
                taxComponentId: Number(r.id),
                ...(r.startISO ? { startDate: isoToDdMMMM(r.startISO) } : {}),
            }));

        const payload = {
            locale: 'en',
            dateFormat: DATE_FORMAT_LABEL,
            name: name.trim(),
            taxComponents,
        };

        await onSubmit(payload);
    };

    const labelFor = (idStr) => {
        const idNum = Number(idStr);
        const opt = componentOptions.find((o) => o.id === idNum);
        return opt?.name || (idStr ? `#${idStr}` : '');
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : (
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="max-w-xl">
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors((x) => ({ ...x, name: '' }));
                                }}
                                placeholder="e.g. VAT Group"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Components table */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Tax Components</label>
                                <Button type="button" variant="secondary" onClick={addRow}>
                                    Add Component
                                </Button>
                            </div>

                            {rows.length === 0 ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    No components added. Click “Add Component” to begin.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                        <tr className="text-left text-gray-500">
                                            <th className="py-2 pr-4">Component *</th>
                                            <th className="py-2 pr-4">Start Date</th>
                                            <th className="py-2 pr-4 w-24"></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {rows.map((r, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-t border-gray-200 dark:border-gray-700"
                                            >
                                                <td className="py-2 pr-4">
                                                    <select
                                                        value={r.id}
                                                        onChange={(e) => {
                                                            updateRowId(idx, e.target.value);
                                                            if (errors[`row-${idx}-id`])
                                                                setErrors((x) => ({
                                                                    ...x,
                                                                    [`row-${idx}-id`]: '',
                                                                }));
                                                        }}
                                                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                                    >
                                                        <option value="">Select component…</option>
                                                        {availableForIndex(idx).map((o) => (
                                                            <option key={o.id} value={o.id}>
                                                                {o.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors[`row-${idx}-id`] && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            {errors[`row-${idx}-id`]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-2 pr-4">
                                                    <input
                                                        type="date"
                                                        value={r.startISO || ''}
                                                        onChange={(e) => {
                                                            updateRowDate(idx, e.target.value);
                                                            if (errors[`row-${idx}-date`])
                                                                setErrors((x) => ({
                                                                    ...x,
                                                                    [`row-${idx}-date`]: '',
                                                                }));
                                                        }}
                                                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Sent as <code>{DATE_FORMAT_LABEL}</code>:{' '}
                                                        {r.startISO ? isoToDdMMMM(r.startISO) : '—'}
                                                    </p>
                                                    {errors[`row-${idx}-date`] && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            {errors[`row-${idx}-date`]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-2 pr-4">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => removeRow(idx)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {rows.length > 0 && (
                            <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-xs">
                                <div className="font-medium mb-1">Preview</div>
                                <ul className="list-disc pl-5 space-y-1">
                                    {rows.map((r, i) => (
                                        <li key={i}>
                                            {labelFor(r.id) || '(select a component)'} —{' '}
                                            {r.startISO ? isoToDdMMMM(r.startISO) : 'no date'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Tax Group'}
                </Button>
            </div>
        </form>
    );
};

export default TaxGroupForm;
