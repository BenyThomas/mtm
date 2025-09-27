import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

const DATE_FORMAT_LABEL = 'dd MMMM yyyy';
const pad = (n) => String(n).padStart(2, '0');

const arrToISO = (arr) => {
    if (Array.isArray(arr) && arr.length >= 3) {
        const [y, m, d] = arr;
        return `${y}-${pad(m)}-${pad(d)}`;
    }
    if (typeof arr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(arr)) return arr;
    return '';
};
// keep this helper near the top
const toPositiveIntOrEmpty = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : '';
};

const isoToDdMMMM = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    return dt.toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};


const normalizeTypeOptions = (arr) =>
    (Array.isArray(arr) ? arr : []).map((o) => ({
        id: o?.id,
        name: o?.value || o?.name || o?.code || `#${o?.id}`,
    })).filter((x) => x.id);

// when you build glAccountOptions, make sure ids are numbers
const flattenGlAccountOptions = (obj) => {
    const out = [];
    if (obj && typeof obj === 'object') {
        Object.values(obj).forEach((arr) => {
            if (Array.isArray(arr)) {
                arr.forEach((a) => {
                    const id = Number(a?.id);
                    if (Number.isInteger(id) && id > 0) {
                        out.push({
                            id,
                            name: a.nameDecorated || (a.glCode ? `${a.glCode} - ${a.name}` : a.name) || `#${id}`,
                        });
                    }
                });
            }
        });
    }
    return out;
};

/**
 * Props:
 * - initial: tax component object (or null)
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const TaxComponentForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);

    // Options
    const [glAccountTypeOptions, setGlAccountTypeOptions] = useState([]);
    const [glAccountOptions, setGlAccountOptions] = useState([]); // flattened

    // Fields
    const [name, setName] = useState(initial?.name || '');
    const [percentage, setPercentage] = useState(
        typeof initial?.percentage === 'number' ? initial.percentage : ''
    );
    const [startISO, setStartISO] = useState(arrToISO(initial?.startDate) || '');

    const [creditAccountType, setCreditAccountType] = useState(
        Number(initial?.creditAccountType?.id ?? initial?.creditAccountType) || ''
    );
    const [creditAccountId, setCreditAccountId] = useState(
        Number(initial?.creditAccount?.id ?? initial?.creditAccountId) || ''
    );

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const tpl = await api.get('/taxes/component/template').catch(() => ({ data: {} }));

                const typeOpts = normalizeTypeOptions(tpl?.data?.glAccountTypeOptions || []);
                let glOpts = flattenGlAccountOptions(tpl?.data?.glAccountOptions || {});

                // Fallback to /glaccounts if template didn't provide options
                if (!glOpts.length) {
                    try {
                        const glRes = await api.get('/glaccounts');
                        const arr = Array.isArray(glRes?.data) ? glRes.data : [];
                        glOpts = arr.map((a) => ({
                            id: a?.id,
                            name: a?.nameDecorated || (a?.glCode ? `${a.glCode} - ${a.name}` : a?.name) || `#${a?.id}`,
                        })).filter((x) => x.id);
                    } catch {
                        // ignore
                    }
                }

                if (!cancelled) {
                    setGlAccountTypeOptions(typeOpts);
                    setGlAccountOptions(glOpts);
                }
            } catch {
                if (!cancelled) {
                    setGlAccountTypeOptions([]);
                    setGlAccountOptions([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Rehydrate when editing
    useEffect(() => {
        if (!initial) return;
        setName(initial?.name || '');
        setPercentage(typeof initial?.percentage === 'number' ? initial.percentage : '');
        setStartISO(arrToISO(initial?.startDate) || '');
        setCreditAccountType(initial?.creditAccountType?.id || initial?.creditAccountType || '');
        setCreditAccountId(initial?.creditAccount?.id || initial?.creditAccountId || '');
        setErrors({});
    }, [initial?.id]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (percentage === '' || percentage === null) e.percentage = 'Percentage is required';

        const nId = Number(creditAccountId);
        if (!Number.isInteger(nId) || nId <= 0) e.creditAccountId = 'Credit account is required';

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
            locale: 'en',
            dateFormat: DATE_FORMAT_LABEL,
            name: name.trim(),
            percentage: Number(percentage),
            ...(startISO ? { startDate: isoToDdMMMM(startISO) } : {}),
            ...(Number.isInteger(Number(creditAccountType)) && Number(creditAccountType) > 0
                ? { creditAccountType: Number(creditAccountType) }
                : {}),
            ...(Number.isInteger(Number(creditAccountId)) && Number(creditAccountId) > 0
                ? { creditAcountId: Number(creditAccountId) }
                : {}),
        };
        console.debug('Submitting tax component payload:', payload);
        await onSubmit(payload);
    };

    const findName = (idStr) => {
        const id = Number(idStr);
        return glAccountOptions.find((x) => x.id === id)?.name || (idStr ? `#${idStr}` : '');
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: '' })); }}
                                placeholder="e.g. VAT 18%"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Percentage *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={percentage}
                                onChange={(e) => { setPercentage(e.target.value); if (errors.percentage) setErrors((x) => ({ ...x, percentage: '' })); }}
                                placeholder="e.g. 18"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.percentage && <p className="text-xs text-red-500 mt-1">{errors.percentage}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Start Date</label>
                            <input
                                type="date"
                                value={startISO}
                                onChange={(e) => setStartISO(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {startISO ? `Will send as ${isoToDdMMMM(startISO)} (${DATE_FORMAT_LABEL})` : 'Optional'}
                            </p>
                        </div>


                        <div>
                            <label className="block text-sm font-medium">Credit Account Type</label>
                            <select
                                value={creditAccountType}
                                onChange={(e) => setCreditAccountType(toPositiveIntOrEmpty(e.target.value))}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Any)</option>
                                {glAccountTypeOptions.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Credit Account *</label>
                            <select
                                value={creditAccountId}
                                onChange={(e) => {
                                    const v = toPositiveIntOrEmpty(e.target.value);
                                    setCreditAccountId(v);
                                    if (errors.creditAccountId) setErrors((x) => ({ ...x, creditAccountId: '' }));
                                }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {glAccountOptions.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            {errors.creditAccountId && <p className="text-xs text-red-500 mt-1">{errors.creditAccountId}</p>}
                        </div>

                        {/* Tiny preview */}
                        {(creditAccountId) && (
                            <div className="md:col-span-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-xs">
                                <div className="font-medium mb-1">Preview</div>
                                <div>Credit: {findName(creditAccountId) || '—'}</div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Component')}
                </Button>
            </div>
        </form>
    );
};

export default TaxComponentForm;
