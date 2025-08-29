import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import api from '../api/axios';

const normalizeTypeOptions = (tpl) => {
    const src =
        tpl?.accountTypeOptions ||
        tpl?.typeOptions ||
        tpl?.glAccountTypeOptions ||
        tpl?.glAccountTypeData ||
        [];
    return (src || []).map((o) => ({
        id: o.id ?? o.value ?? o.code,
        name: o.name ?? o.value ?? o.code ?? `Type ${o.id}`,
    }));
};

const normalizeUsageOptions = (tpl) => {
    const src =
        tpl?.accountUsageOptions ||
        tpl?.usageOptions ||
        tpl?.glAccountUsageOptions ||
        [];
    return (src || []).map((o) => ({
        id: o.id ?? o.value ?? o.code,
        name: o.name ?? o.value ?? o.code ?? `Usage ${o.id}`,
    }));
};

const normalizeParentOptionsFromTpl = (tpl) => {
    const src =
        tpl?.parentAccountOptions ||
        tpl?.glAccountOptions ||
        tpl?.allowedParents ||
        [];
    return (src || []).map((a) => ({
        id: a.id,
        code: a.glCode || a.code || '',
        name: a.name || '',
    }));
};

const normalizeParentOptionsFromList = (arr) =>
    (arr || []).map((a) => ({
        id: a.id,
        code: a.glCode || a.code || '',
        name: a.name || '',
    }));

const labelParent = (a) => `${a.code ? a.code : a.id}${a.name ? ` — ${a.name}` : ''}`.trim();

/**
 * Props:
 *  - initial: existing account object for edit (optional)
 *  - onSubmit: async (payload) => void
 *  - submitting: boolean
 */
const GlAccountForm = ({ initial, onSubmit, submitting }) => {
    const [loading, setLoading] = useState(true);

    const [typeOptions, setTypeOptions] = useState([]);
    const [usageOptions, setUsageOptions] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);

    const [name, setName] = useState('');
    const [glCode, setGlCode] = useState('');
    const [typeId, setTypeId] = useState('');
    const [usageId, setUsageId] = useState('');
    const [parentId, setParentId] = useState('');
    const [manualEntriesAllowed, setManualEntriesAllowed] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const [description, setDescription] = useState('');

    const [errors, setErrors] = useState({});

    // Load template + fallback parents
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const tplRes = await api.get('/glaccounts/template');
                if (cancelled) return;

                const tOpts = normalizeTypeOptions(tplRes.data);
                const uOpts = normalizeUsageOptions(tplRes.data);
                const pFromTpl = normalizeParentOptionsFromTpl(tplRes.data);

                setTypeOptions(tOpts);
                setUsageOptions(uOpts);

                if (pFromTpl.length) {
                    setParentOptions(pFromTpl);
                } else {
                    // fallback: fetch all accounts and use as parent list
                    try {
                        const listRes = await api.get('/glaccounts');
                        const list = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.pageItems || []);
                        setParentOptions(normalizeParentOptionsFromList(list));
                    } catch {
                        setParentOptions([]);
                    }
                }
            } catch {
                // template failed; try list as total fallback
                try {
                    const listRes = await api.get('/glaccounts');
                    const list = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.pageItems || []);
                    setParentOptions(normalizeParentOptionsFromList(list));
                } catch {
                    setParentOptions([]);
                }
                setTypeOptions([]);
                setUsageOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Hydrate for editing
    useEffect(() => {
        if (!initial) return;
        setName(initial.name || '');
        setGlCode(initial.glCode || initial.code || '');
        setTypeId(
            initial.type?.id != null
                ? String(initial.type.id)
                : initial.typeId != null
                    ? String(initial.typeId)
                    : ''
        );
        setUsageId(
            initial.usage?.id != null
                ? String(initial.usage.id)
                : initial.usageId != null
                    ? String(initial.usageId)
                    : ''
        );
        setParentId(
            initial.parentId != null
                ? String(initial.parentId)
                : initial.parent?.id != null
                    ? String(initial.parent.id)
                    : ''
        );
        setManualEntriesAllowed(
            initial.manualEntriesAllowed != null ? Boolean(initial.manualEntriesAllowed) : true
        );
        setDisabled(initial.disabled != null ? Boolean(initial.disabled) : false);
        setDescription(initial.description || '');
        setErrors({});
    }, [initial]);

    const clearErr = (k) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!glCode.trim()) e.glCode = 'GL code is required';
        if (!typeId) e.typeId = 'Type is required';
        if (!usageId) e.usageId = 'Usage is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;

        // Fineract payload
        const payload = {
            name: name.trim(),
            glCode: glCode.trim(),
            type: Number(typeId),
            usage: Number(usageId),
            manualEntriesAllowed: Boolean(manualEntriesAllowed),
            // parentId is optional; only include if chosen
            ...(parentId ? { parentId: Number(parentId) } : {}),
            // disabled & description optional
            ...(disabled != null ? { disabled: Boolean(disabled) } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
        };

        await onSubmit(payload);
    };

    const groupedParents = useMemo(() => {
        // Just a flat list; can be enhanced to group by type if needed
        return parentOptions;
    }, [parentOptions]);

    if (loading) {
        return (
            <Card>
                <Skeleton height="8rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Name *</label>
                    <input
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearErr('name'); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. Loans Portfolio"
                    />
                    {errors.name ? <p className="text-xs text-red-500 mt-1">{errors.name}</p> : null}
                </div>
                <div>
                    <label className="block text-sm font-medium">GL Code *</label>
                    <input
                        value={glCode}
                        onChange={(e) => { setGlCode(e.target.value); clearErr('glCode'); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. 1401"
                    />
                    {errors.glCode ? <p className="text-xs text-red-500 mt-1">{errors.glCode}</p> : null}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Type *</label>
                    <select
                        value={typeId}
                        onChange={(e) => { setTypeId(e.target.value); clearErr('typeId'); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select type</option>
                        {typeOptions.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {errors.typeId ? <p className="text-xs text-red-500 mt-1">{errors.typeId}</p> : null}
                </div>
                <div>
                    <label className="block text-sm font-medium">Usage *</label>
                    <select
                        value={usageId}
                        onChange={(e) => { setUsageId(e.target.value); clearErr('usageId'); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select usage</option>
                        {usageOptions.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    {errors.usageId ? <p className="text-xs text-red-500 mt-1">{errors.usageId}</p> : null}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Parent Account (optional)</label>
                    <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">(No parent)</option>
                        {groupedParents.map((p) => (
                            <option key={p.id} value={p.id}>{labelParent(p)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-4 mt-6">
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={manualEntriesAllowed}
                            onChange={(e) => setManualEntriesAllowed(e.target.checked)}
                        />
                        Manual entries allowed
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={disabled}
                            onChange={(e) => setDisabled(e.target.checked)}
                        />
                        Disabled
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Notes about this GL account…"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Account'}
                </Button>
            </div>
        </form>
    );
};

export default GlAccountForm;
