import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import SearchableSelectField from './SearchableSelectField';
import api from '../api/axios';

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.pageItems)) return value.pageItems;
    if (Array.isArray(value?.options)) return value.options;
    return [];
};

const dedupeById = (arr = []) => {
    const map = new Map();
    arr.forEach((x) => {
        const id = x?.id ?? x?.accountId ?? x?.glAccountId;
        if (id != null && !map.has(String(id))) map.set(String(id), x);
    });
    return Array.from(map.values());
};

const normalizeFAOptions = (tpl) => {
    const raw = [
        ...asArray(tpl?.financialActivityOptions),
        ...asArray(tpl?.financialActivities),
        ...asArray(tpl?.financialActivityData),
        ...asArray(tpl?.financialActivityAccountOptions),
    ];

    return dedupeById(raw.map((o) => {
        const id = o?.id ?? o?.financialActivityId ?? o?.value ?? o?.code;
        return {
            id,
            name: o?.name ?? o?.value ?? o?.label ?? o?.code ?? (id != null ? `Activity ${id}` : ''),
        };
    })).filter((o) => o.id != null);
};

const accountOptionBuckets = (source) => [
    ...asArray(source),
    ...asArray(source?.assetAccountOptions),
    ...asArray(source?.incomeAccountOptions),
    ...asArray(source?.expenseAccountOptions),
    ...asArray(source?.liabilityAccountOptions),
    ...asArray(source?.equityAccountOptions),
];

const normalizeGLAccountOptions = (tpl) => {
    const flat = [
        ...accountOptionBuckets(tpl?.glAccountOptions),
        ...accountOptionBuckets(tpl?.accountingMappingOptions),
        ...asArray(tpl?.assetAccountOptions),
        ...asArray(tpl?.incomeAccountOptions),
        ...asArray(tpl?.expenseAccountOptions),
        ...asArray(tpl?.liabilityAccountOptions),
        ...asArray(tpl?.equityAccountOptions),
        ...asArray(tpl?.accountOptions),
        ...asArray(tpl?.glAccounts),
        ...asArray(tpl?.glAccountData),
    ];

    return dedupeById(flat).map((a) => ({
        id: a.id ?? a.accountId ?? a.glAccountId,
        code: a.glCode || a.code || '',
        name: a.name || a.accountName || '',
        type: a.type?.value || a.type?.code || a.type || '',
    })).filter((a) => a.id != null);
};

const glLabel = (a) =>
    `${a.code ? a.code : a.id}${a.name ? ` - ${a.name}` : ''}`.trim();

/**
 * Props:
 * - initial: { id, financialActivityId, glAccountId }
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const FinancialActivityMappingForm = ({ initial, onSubmit, submitting, lockFinancialActivity = false }) => {
    const [loading, setLoading] = useState(true);
    const [faOptions, setFaOptions] = useState([]);
    const [glOptions, setGlOptions] = useState([]);

    const [financialActivityId, setFinancialActivityId] = useState('');
    const [glAccountId, setGlAccountId] = useState('');
    const [errors, setErrors] = useState({});

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
                if (cancelled) return;
                setFaOptions([]);
                setGlOptions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

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

    const displayedFaOptions = useMemo(() => {
        if (financialActivityId && !faOptions.some((option) => String(option.id) === String(financialActivityId))) {
            return [
                { id: financialActivityId, name: initial?.financialActivityName || `Activity ${financialActivityId}` },
                ...faOptions,
            ];
        }
        return faOptions;
    }, [faOptions, financialActivityId, initial?.financialActivityName]);

    const displayedGlOptions = useMemo(() => {
        if (glAccountId && !glOptions.some((option) => String(option.id) === String(glAccountId))) {
            return [
                {
                    id: glAccountId,
                    code: initial?.glAccountCode || '',
                    name: initial?.glAccountName || `GL Account ${glAccountId}`,
                    type: initial?.glAccountType || 'Accounts',
                },
                ...glOptions,
            ];
        }
        return glOptions;
    }, [glOptions, glAccountId, initial?.glAccountCode, initial?.glAccountName, initial?.glAccountType]);

    const faSelectOptions = useMemo(() => displayedFaOptions.map((option) => ({
        id: String(option.id),
        label: `${option.id}${option.name ? ` - ${option.name}` : ''}`,
    })), [displayedFaOptions]);

    const glSelectOptions = useMemo(() => displayedGlOptions.map((account) => ({
        id: String(account.id),
        label: `${glLabel(account)}${account.type ? ` (${account.type})` : ''}`,
    })), [displayedGlOptions]);

    const isEdit = Boolean(initial?.id);

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
                <SearchableSelectField
                    label="Financial Activity"
                    value={financialActivityId}
                    onChange={onFAChange}
                    options={faSelectOptions}
                    placeholder={faSelectOptions.length ? 'Search activity by ID or name' : 'No activities available'}
                    disabled={lockFinancialActivity}
                    required
                />
                {errors.financialActivityId && (
                    <p className="text-xs text-red-500 mt-1">{errors.financialActivityId}</p>
                )}
            </div>

            <div>
                <SearchableSelectField
                    label="GL Account"
                    value={glAccountId}
                    onChange={onGLChange}
                    options={glSelectOptions}
                    placeholder={glSelectOptions.length ? 'Search GL account by code, ID, or name' : 'No GL accounts available'}
                    required
                />
                {errors.glAccountId && (
                    <p className="text-xs text-red-500 mt-1">{errors.glAccountId}</p>
                )}
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Mapping'}
                </Button>
            </div>
        </form>
    );
};

export default FinancialActivityMappingForm;
