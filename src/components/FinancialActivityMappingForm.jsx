import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import api from '../api/axios';

const dedupeById = (arr = []) => {
    const map = new Map();
    arr.forEach((x) => {
        const id = x?.id ?? x?.accountId;
        if (id != null && !map.has(id)) map.set(id, x);
    });
    return Array.from(map.values());
};

const normalizeFAOptions = (tpl) => {
    const raw =
        tpl?.financialActivityOptions ||
        tpl?.financialActivities ||
        tpl?.financialActivityData ||
        [];
    return raw.map((o) => ({
        id: o.id ?? o.value ?? o.code,
        name: o.name ?? o.value ?? o.code ?? `Activity ${o.id}`,
    }));
};

const normalizeGLAccountOptions = (tpl) => {
    const flat = [
        ...(tpl?.glAccountOptions || []),
        ...(tpl?.assetAccountOptions || []),
        ...(tpl?.incomeAccountOptions || []),
        ...(tpl?.expenseAccountOptions || []),
        ...(tpl?.liabilityAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.assetAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.incomeAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.expenseAccountOptions || []),
        ...(tpl?.accountingMappingOptions?.liabilityAccountOptions || []),
    ];
    const unique = dedupeById(flat);
    return unique.map((a) => ({
        id: a.id ?? a.accountId,
        code: a.glCode || a.code || '',
        name: a.name || a.accountName || '',
        type: a.type?.value || a.type || '',
    }));
};

const glLabel = (a) =>
    `${a.code ? a.code : a.id}${a.name ? ` — ${a.name}` : ''}`.trim();

/**
 * Props:
 * - initial: { id, financialActivityId, glAccountId }
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const FinancialActivityMappingForm = ({ initial, onSubmit, submitting }) => {
    const [loading, setLoading] = useState(true);
    const [faOptions, setFaOptions] = useState([]);
    const [glOptions, setGlOptions] = useState([]);

    const [financialActivityId, setFinancialActivityId] = useState('');
    const [glAccountId, setGlAccountId] = useState('');
    const [errors, setErrors] = useState({});

    // load template options
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get('/financialactivityaccounts/template');
                if (cancelled) return;
                setFaOptions(normalizeFAOptions(res?.data || {}));
                setGlOptions(normalizeGLAccountOptions(res?.data || {}));
            } catch {
                // fallback empty; UI will show no options
                if (cancelled) return;
                setFaOptions([]);
                setGlOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => (cancelled = true);
    }, []);

    // hydrate initial values for edit
    useEffect(() => {
        if (!initial) return;
        setFinancialActivityId(
            initial.financialActivityId != null ? String(initial.financialActivityId) : ''
        );
        setGlAccountId(initial.glAccountId != null ? String(initial.glAccountId) : '');
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!financialActivityId) e.financialActivityId = 'Financial activity is required';
        if (!glAccountId) e.glAccountId = 'GL account is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({
            financialActivityId: Number(financialActivityId),
            glAccountId: Number(glAccountId),
        });
    };

    const onFAChange = (v) => {
        setFinancialActivityId(v || '');
        if (errors.financialActivityId) setErrors((x) => ({ ...x, financialActivityId: '' }));
    };

    const onGLChange = (v) => {
        setGlAccountId(v || '');
        if (errors.glAccountId) setErrors((x) => ({ ...x, glAccountId: '' }));
    };

    const groupedGL = useMemo(() => {
        // simple grouping by type if available
        const groups = {};
        glOptions.forEach((a) => {
            const k = a.type || 'Accounts';
            groups[k] = groups[k] || [];
            groups[k].push(a);
        });
        return groups;
    }, [glOptions]);

    if (loading) {
        return (
            <Card>
                <Skeleton height="8rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Financial Activity *</label>
                <select
                    value={financialActivityId}
                    onChange={(e) => onFAChange(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">Select activity</option>
                    {faOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.name}
                        </option>
                    ))}
                </select>
                {errors.financialActivityId && (
                    <p className="text-xs text-red-500 mt-1">{errors.financialActivityId}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium">GL Account *</label>
                <select
                    value={glAccountId}
                    onChange={(e) => onGLChange(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">Select account</option>
                    {Object.entries(groupedGL).map(([group, arr]) => (
                        <optgroup key={group} label={group}>
                            {arr.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {glLabel(a)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {errors.glAccountId && (
                    <p className="text-xs text-red-500 mt-1">{errors.glAccountId}</p>
                )}
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Mapping'}
                </Button>
            </div>
        </form>
    );
};

export default FinancialActivityMappingForm;
