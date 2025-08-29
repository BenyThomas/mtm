import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import OfficeSelect from './OfficeSelect';

const normalizeAccounts = (tpl, fallbackList) => {
    const flat = [
        ...(tpl?.accountOptions || []),
        ...(tpl?.glAccountOptions || []),
        ...(tpl?.assetAccountOptions || []),
        ...(tpl?.incomeAccountOptions || []),
        ...(tpl?.expenseAccountOptions || []),
        ...(tpl?.liabilityAccountOptions || []),
    ];
    const source = flat.length ? flat : (fallbackList || []);
    const seen = new Map();
    source.forEach((a) => {
        const id = a.id ?? a.accountId;
        if (id != null && !seen.has(id)) {
            seen.set(id, {
                id,
                code: a.glCode || a.code || '',
                name: a.name || a.accountName || '',
                type: a.type?.value || a.type || '',
            });
        }
    });
    return Array.from(seen.values());
};

const labelGL = (a) =>
    `${a.code ? a.code : a.id}${a.name ? ` — ${a.name}` : ''}`.trim();

const getMultiValues = (selectEl) =>
    Array.from(selectEl.selectedOptions).map((o) => o.value);

/**
 * Props:
 *  - initial: existing rule (for edit) — optional
 *  - onSubmit: async (payload) => void
 *  - submitting: boolean
 */
const AccountingRuleForm = ({ initial, onSubmit, submitting }) => {
    const [loading, setLoading] = useState(true);
    const [glOptions, setGlOptions] = useState([]);

    const [name, setName] = useState('');
    const [officeId, setOfficeId] = useState('');
    const [description, setDescription] = useState('');
    const [allowMultiDebit, setAllowMultiDebit] = useState(false);
    const [allowMultiCredit, setAllowMultiCredit] = useState(false);
    const [debitIds, setDebitIds] = useState([]);
    const [creditIds, setCreditIds] = useState([]);
    const [errors, setErrors] = useState({});

    // Template + fallback accounts
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [tplRes, listRes] = await Promise.allSettled([
                    api.get('/accountingrules/template'),
                    api.get('/glaccounts'),
                ]);
                const tpl = tplRes.status === 'fulfilled' ? tplRes.value?.data : {};
                const list = listRes.status === 'fulfilled'
                    ? (Array.isArray(listRes.value.data) ? listRes.value.data : (listRes.value.data?.pageItems || []))
                    : [];
                const opts = normalizeAccounts(tpl, list);
                if (!cancelled) setGlOptions(opts);
            } catch {
                if (!cancelled) setGlOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Hydrate initial on edit
    useEffect(() => {
        if (!initial) return;
        setName(initial.name || '');
        setOfficeId(
            initial.officeId != null
                ? String(initial.officeId)
                : initial.office?.id != null
                    ? String(initial.office.id) : ''
        );
        setDescription(initial.description || '');
        setAllowMultiDebit(Boolean(initial.allowMultipleDebitEntries));
        setAllowMultiCredit(Boolean(initial.allowMultipleCreditEntries));
        setDebitIds(
            (initial.debitAccounts || [])
                .map((x) => String(x.id || x.glAccountId || x.accountId))
                .filter(Boolean)
        );
        setCreditIds(
            (initial.creditAccounts || [])
                .map((x) => String(x.id || x.glAccountId || x.accountId))
                .filter(Boolean)
        );
        setErrors({});
    }, [initial]);

    const groupedGL = useMemo(() => {
        const groups = {};
        glOptions.forEach((a) => {
            const k = a.type || 'Accounts';
            groups[k] = groups[k] || [];
            groups[k].push(a);
        });
        return groups;
    }, [glOptions]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!debitIds.length) e.debitIds = 'Select at least one debit account';
        if (!creditIds.length) e.creditIds = 'Select at least one credit account';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;

        // Payload aligns with common Fineract structure for accounting rules
        const payload = {
            name: name.trim(),
            ...(officeId ? { officeId: Number(officeId) } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            allowMultipleDebitEntries: Boolean(allowMultiDebit),
            allowMultipleCreditEntries: Boolean(allowMultiCredit),
            debitAccounts: debitIds.map((id) => ({ glAccountId: Number(id) })),
            creditAccounts: creditIds.map((id) => ({ glAccountId: Number(id) })),
        };

        await onSubmit(payload);
    };

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
                        onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: '' })); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. End-of-Day Cash to Bank"
                    />
                    {errors.name ? <p className="text-xs text-red-500 mt-1">{errors.name}</p> : null}
                </div>
                <div>
                    <label className="block text-sm font-medium">Office (optional)</label>
                    <OfficeSelect includeAll value={officeId} onChange={setOfficeId} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Describe when and how this rule should be used…"
                />
            </div>

            <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={allowMultiDebit}
                        onChange={(e) => setAllowMultiDebit(e.target.checked)}
                    />
                    Allow multiple debits
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={allowMultiCredit}
                        onChange={(e) => setAllowMultiCredit(e.target.checked)}
                    />
                    Allow multiple credits
                </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Debit Accounts *</label>
                    <select
                        multiple
                        value={debitIds}
                        onChange={(e) => {
                            const vals = getMultiValues(e.target);
                            setDebitIds(vals);
                            if (errors.debitIds) setErrors((x) => ({ ...x, debitIds: '' }));
                        }}
                        className="mt-1 w-full h-40 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        {Object.entries(groupedGL).map(([group, arr]) => (
                            <optgroup key={group} label={group}>
                                {arr.map((a) => (
                                    <option key={a.id} value={a.id}>{labelGL(a)}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {errors.debitIds ? <p className="text-xs text-red-500 mt-1">{errors.debitIds}</p> : null}
                </div>

                <div>
                    <label className="block text-sm font-medium">Credit Accounts *</label>
                    <select
                        multiple
                        value={creditIds}
                        onChange={(e) => {
                            const vals = getMultiValues(e.target);
                            setCreditIds(vals);
                            if (errors.creditIds) setErrors((x) => ({ ...x, creditIds: '' }));
                        }}
                        className="mt-1 w-full h-40 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        {Object.entries(groupedGL).map(([group, arr]) => (
                            <optgroup key={group} label={group}>
                                {arr.map((a) => (
                                    <option key={a.id} value={a.id}>{labelGL(a)}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {errors.creditIds ? <p className="text-xs text-red-500 mt-1">{errors.creditIds}</p> : null}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Rule')}
                </Button>
            </div>
        </form>
    );
};

export default AccountingRuleForm;
