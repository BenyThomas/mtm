import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

// Normalize generic options → [{id,name}]
const normalizeOptions = (arr, idKey = 'id', nameKey = 'name') => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((o) => ({
            id: o?.[idKey] ?? o?.value ?? o?.key ?? o?.id,
            name:
                o?.[nameKey] ??
                o?.text ??
                o?.label ??
                o?.glCode ??
                o?.code ??
                o?.name ??
                String(o?.id ?? ''),
        }))
        .filter((x) => x.id);
};

/**
 * Props:
 *  - initial (optional): criteria object for edit (normalized in Details page)
 *  - onSubmit: async(payload) => void
 *  - submitting: boolean
 *
 * This version posts ONLY the keys most instances accept:
 *  { criteriaName, provisioningcriteria: [...], (optional) loanProducts: [{id}] }
 */
const ProvisioningCriteriaForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    // Template-driven option lists
    const [tplLoading, setTplLoading] = useState(true);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [glLiabilityOptions, setGlLiabilityOptions] = useState([]);
    const [glExpenseOptions, setGlExpenseOptions] = useState([]);
    const [loanProductOptions, setLoanProductOptions] = useState([]);

    // Fields
    const [criteriaName, setCriteriaName] = useState('');
    const [selectedLoanProductIds, setSelectedLoanProductIds] = useState(new Set());
    const [rows, setRows] = useState([
        { categoryId: '', minAge: 0, maxAge: 0, provisioningPercentage: 0, liabilityAccount: '', expenseAccount: '' },
    ]);
    const [errors, setErrors] = useState({});

    // Load template
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/provisioningcriteria/template');
                const d = r?.data || {};
                const cats =
                    d?.categories ||
                    d?.categoryOptions ||
                    d?.provisioningCategories ||
                    d?.provisioningcriteriaCategories ||
                    d?.definitions ||
                    [];
                const liab =
                    d?.liabilityAccountOptions ||
                    d?.glAccountLiabilityOptions ||
                    d?.glAccounts ||
                    d?.glAccountOptions ||
                    [];
                const exp =
                    d?.expenseAccountOptions ||
                    d?.glAccountExpenseOptions ||
                    d?.glAccounts ||
                    d?.glAccountOptions ||
                    [];
                const prods = d?.loanProducts || d?.loanProductOptions || d?.products || [];

                if (!cancelled) {
                    setCategoryOptions(
                        normalizeOptions(cats, 'categoryId', 'categoryName').map((c) => ({
                            id: c.id,
                            name: c.name || c.categoryName || String(c.id),
                        }))
                    );
                    setGlLiabilityOptions(normalizeOptions(liab));
                    setGlExpenseOptions(normalizeOptions(exp));
                    setLoanProductOptions(normalizeOptions(prods, 'id', 'name'));
                }
            } catch (_e) {
                if (!cancelled) {
                    setCategoryOptions([]);
                    setGlLiabilityOptions([]);
                    setGlExpenseOptions([]);
                    setLoanProductOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Hydrate for edit
    useEffect(() => {
        if (!initial) {
            setCriteriaName('');
            setSelectedLoanProductIds(new Set());
            setRows([{ categoryId: '', minAge: 0, maxAge: 0, provisioningPercentage: 0, liabilityAccount: '', expenseAccount: '' }]);
            setErrors({});
            return;
        }
        setCriteriaName(initial.criteriaName || initial.name || '');

        // If Details normalized these, we can just read them:
        const lpIds = Array.isArray(initial.loanProductIds) ? initial.loanProductIds : [];
        setSelectedLoanProductIds(new Set(lpIds));

        const normRows = Array.isArray(initial.entries)
            ? initial.entries.map((r) => ({
                categoryId: r.categoryId ?? '',
                minAge: Number(r.minAge ?? 0),
                maxAge: Number(r.maxAge ?? 0),
                provisioningPercentage: Number(r.provisioningPercentage ?? r.percentage ?? 0),
                liabilityAccount: r.liabilityAccount ?? r.liabilityAccountId ?? '',
                expenseAccount: r.expenseAccount ?? r.expenseAccountId ?? '',
            }))
            : [];
        setRows(normRows.length ? normRows : [{ categoryId: '', minAge: 0, maxAge: 0, provisioningPercentage: 0, liabilityAccount: '', expenseAccount: '' }]);
        setErrors({});
    }, [initial]);

    // Row helpers
    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                categoryId: categoryOptions[0]?.id ?? '',
                minAge: 0,
                maxAge: 0,
                provisioningPercentage: 0,
                liabilityAccount: '',
                expenseAccount: '',
            },
        ]);
    };
    const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
    const setRow = (idx, patch) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    const toggleProduct = (id) => {
        setSelectedLoanProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Validation for the strict payload
    const validate = () => {
        const e = {};
        if (!criteriaName.trim()) e.criteriaName = 'Name is required';
        if (!rows.length) e.rows = 'At least one bucket is required';
        rows.forEach((r, i) => {
            if (!r.categoryId) e[`rows.${i}.categoryId`] = 'Category is required';
            if (r.minAge === '' || r.minAge === null || isNaN(Number(r.minAge))) e[`rows.${i}.minAge`] = 'Min Age is required';
            if (r.maxAge === '' || r.maxAge === null || isNaN(Number(r.maxAge))) e[`rows.${i}.maxAge`] = 'Max Age is required';
            if (Number(r.minAge) > Number(r.maxAge)) e[`rows.${i}.range`] = 'Min must be ≤ Max';
            if (r.provisioningPercentage === '' || r.provisioningPercentage === null || isNaN(Number(r.provisioningPercentage))) e[`rows.${i}.pct`] = 'Percentage is required';
            if (!r.liabilityAccount) e[`rows.${i}.liab`] = 'Liability GL required';
            if (!r.expenseAccount) e[`rows.${i}.exp`] = 'Expense GL required';
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

        // STRICT payload:
        //  - criteriaName
        //  - provisioningcriteria: [{categoryId,minAge,maxAge,provisioningPercentage,liabilityAccount,expenseAccount}]
        //  - loanProducts (optional): [{id}]
        const provisioningcriteria = rows.map((r) => ({
            categoryId: Number(r.categoryId),
            minAge: Number(r.minAge),
            maxAge: Number(r.maxAge),
            provisioningPercentage: Number(r.provisioningPercentage),
            liabilityAccount: Number(r.liabilityAccount),
            expenseAccount: Number(r.expenseAccount),
        }));

        const loanProducts =
            selectedLoanProductIds.size > 0
                ? Array.from(selectedLoanProductIds).map((id) => ({ id: Number(id) }))
                : undefined;

        const payload = {
            criteriaName: criteriaName.trim(),
            provisioningcriteria,
            ...(loanProducts ? { loanProducts } : {}),
        };

        await onSubmit(payload);
    };

    const lpIndex = useMemo(() => new Map(loanProductOptions.map((p) => [p.id, p.name])), [loanProductOptions]);

    return (
        <form onSubmit={submit} className="space-y-6">
            {tplLoading ? <Card><Skeleton height="4rem" /></Card> : null}

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Criteria Name *</label>
                        <input
                            value={criteriaName}
                            onChange={(e) => { setCriteriaName(e.target.value); if (errors.criteriaName) setErrors((x) => ({ ...x, criteriaName: '' })); }}
                            placeholder="e.g. Standard Loan Loss Provisioning"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.criteriaName && <p className="text-xs text-red-500 mt-1">{errors.criteriaName}</p>}
                    </div>
                </div>
            </Card>

            {/* Buckets */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Buckets *</div>
                    <Button type="button" variant="secondary" onClick={addRow}>Add Bucket</Button>
                </div>

                {!rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No buckets yet.</div>
                ) : (
                    <div className="space-y-4">
                        {rows.map((r, idx) => (
                            <div key={idx} className="rounded-lg border p-3 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">Bucket #{idx + 1}</div>
                                    <Button type="button" variant="danger" onClick={() => removeRow(idx)}>Remove</Button>
                                </div>

                                <div className="grid md:grid-cols-3 gap-3 mt-3">
                                    <div>
                                        <label className="block text-sm font-medium">Category *</label>
                                        <select
                                            value={r.categoryId}
                                            onChange={(e) => setRow(idx, { categoryId: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select…</option>
                                            {categoryOptions.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        {errors[`rows.${idx}.categoryId`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.categoryId`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Min Age (DPD) *</label>
                                        <input
                                            type="number"
                                            value={r.minAge}
                                            onChange={(e) => setRow(idx, { minAge: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        {errors[`rows.${idx}.minAge`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.minAge`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Max Age (DPD) *</label>
                                        <input
                                            type="number"
                                            value={r.maxAge}
                                            onChange={(e) => setRow(idx, { maxAge: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        {errors[`rows.${idx}.maxAge`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.maxAge`]}</p>}
                                        {errors[`rows.${idx}.range`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.range`]}</p>}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-3 mt-3">
                                    <div>
                                        <label className="block text-sm font-medium">% Provision *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={r.provisioningPercentage}
                                            onChange={(e) => setRow(idx, { provisioningPercentage: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        {errors[`rows.${idx}.pct`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.pct`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Liability GL *</label>
                                        <select
                                            value={r.liabilityAccount}
                                            onChange={(e) => setRow(idx, { liabilityAccount: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select…</option>
                                            {glLiabilityOptions.map((o) => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                        {errors[`rows.${idx}.liab`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.liab`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Expense GL *</label>
                                        <select
                                            value={r.expenseAccount}
                                            onChange={(e) => setRow(idx, { expenseAccount: e.target.value })}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select…</option>
                                            {glExpenseOptions.map((o) => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                        {errors[`rows.${idx}.exp`] && <p className="text-xs text-red-500 mt-1">{errors[`rows.${idx}.exp`]}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {errors.rows && <p className="text-xs text-red-500 mt-2">{errors.rows}</p>}
            </Card>

            {/* Optional: restrict to specific loan products */}
            <Card>
                <details className="group">
                    <summary className="cursor-pointer text-sm font-medium select-none">
                        Restrict to specific Loan Products (optional)
                    </summary>
                    <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-auto pr-1">
                        {loanProductOptions.length ? (
                            loanProductOptions.map((lp) => (
                                <label key={lp.id} className="inline-flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={selectedLoanProductIds.has(lp.id)}
                                        onChange={() => toggleProduct(lp.id)}
                                    />
                                    <span className="truncate" title={lp.name}>{lp.name}</span>
                                </label>
                            ))
                        ) : (
                            <div className="text-xs text-gray-500">No loan product options available.</div>
                        )}
                    </div>
                    {!!selectedLoanProductIds.size && (
                        <p className="text-[11px] text-gray-500 mt-2">
                            Selected: {Array.from(selectedLoanProductIds).map((id) => lpIndex.get(id) || id).join(', ')}
                        </p>
                    )}
                </details>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Criteria'}
                </Button>
            </div>
        </form>
    );
};

export default ProvisioningCriteriaForm;
