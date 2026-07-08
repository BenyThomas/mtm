import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../context/ToastContext';

const parseError = (error, fallback) =>
    error?.response?.data?.errors?.[0]?.defaultUserMessage ||
    error?.response?.data?.defaultUserMessage ||
    error?.response?.data?.message ||
    fallback;

const numberOrUndefined = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const accountId = (account) => account?.id ?? account?.accountId ?? account?.glAccountId;
const accountType = (account) => String(account?.type?.value || account?.type?.code || account?.type || '').toUpperCase();
const accountLabel = (account) => `${account?.glCode || account?.code || accountId(account)} - ${account?.name || account?.accountName || ''}`.trim();
const matchesType = (account, type) => accountType(account).includes(type);
const uniqueAccounts = (items) => {
    const seen = new Map();
    (items || []).forEach((account) => {
        const id = accountId(account);
        if (id != null && !seen.has(String(id))) seen.set(String(id), account);
    });
    return Array.from(seen.values());
};

const initialForm = {
    name: '',
    shortName: '',
    description: '',
    currencyCode: 'TZS',
    digitsAfterDecimal: 2,
    inMultiplesOf: 0,
    nominalAnnualInterestRate: 0,
    interestCompoundingPeriodType: 1,
    interestPostingPeriodType: 4,
    interestCalculationType: 1,
    interestCalculationDaysInYearType: 365,
    minRequiredOpeningBalance: '',
    lockinPeriodFrequency: '',
    lockinPeriodFrequencyType: 0,
    accountingRule: 1,
    allowOverdraft: false,
    enforceMinRequiredBalance: false,
    withdrawalFeeForTransfers: false,
    isDormancyTrackingActive: false,
    withHoldTax: false,
    chargeIds: '',
    savingsControlAccountId: '',
    savingsReferenceAccountId: '',
    transfersInSuspenseAccountId: '',
    interestOnSavingsAccountId: '',
    incomeFromFeeAccountId: '',
    incomeFromPenaltyAccountId: '',
    overdraftPortfolioControlId: '',
    incomeFromInterestId: '',
    writeOffAccountId: '',
};

const accountingFields = [
    ['savingsControlAccountId', 'Savings Control Account', 'LIABILITY'],
    ['savingsReferenceAccountId', 'Savings Reference Account', 'ASSET'],
    ['transfersInSuspenseAccountId', 'Transfers In Suspense Account', 'LIABILITY'],
    ['interestOnSavingsAccountId', 'Interest On Savings Account', 'EXPENSE'],
    ['incomeFromFeeAccountId', 'Income From Fee Account', 'INCOME'],
    ['incomeFromPenaltyAccountId', 'Income From Penalty Account', 'INCOME'],
    ['overdraftPortfolioControlId', 'Overdraft Portfolio Control', 'ASSET'],
    ['incomeFromInterestId', 'Income From Interest', 'INCOME'],
    ['writeOffAccountId', 'Write Off Account', 'EXPENSE'],
];

const SavingsProducts = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState([]);
    const [glAccounts, setGlAccounts] = useState([]);
    const [query, setQuery] = useState('');
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get('/savingsproducts');
            const items = Array.isArray(response.data) ? response.data : response.data?.pageItems || [];
            setProducts(items);
        } catch (error) {
            setProducts([]);
            addToast(parseError(error, 'Could not load savings products'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadGlAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const response = await api.get('/glaccounts');
            const items = Array.isArray(response.data) ? response.data : response.data?.pageItems || [];
            setGlAccounts(uniqueAccounts(items));
        } catch (_) {
            setGlAccounts([]);
        } finally {
            setLoadingAccounts(false);
        }
    };

    useEffect(() => {
        load();
        loadGlAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return products;
        return products.filter((product) => [
            product.name,
            product.shortName,
            product.id,
            product.currency?.code,
            product.currencyCode,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [products, query]);

    const accountsByType = useMemo(() => {
        const all = uniqueAccounts(glAccounts);
        return {
            ASSET: all.filter((account) => matchesType(account, 'ASSET')),
            LIABILITY: all.filter((account) => matchesType(account, 'LIABILITY')),
            INCOME: all.filter((account) => matchesType(account, 'INCOME')),
            EXPENSE: all.filter((account) => matchesType(account, 'EXPENSE')),
            ALL: all,
        };
    }, [glAccounts]);

    const isAccountingEnabled = Number(form.accountingRule) !== 1;

    const update = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Product name is required';
        if (!form.shortName.trim()) next.shortName = 'Short name is required';
        if (form.shortName.trim().length > 4) next.shortName = 'Short name must be 4 characters or fewer';
        if (isAccountingEnabled) {
            accountingFields.forEach(([field, label]) => {
                if (!form[field]) next[field] = `${label} is required`;
            });
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const parseChargeIds = () => form.chargeIds
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((id) => ({ id }));

    const createProduct = async (event) => {
        event.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                locale: 'en',
                name: form.name.trim(),
                shortName: form.shortName.trim(),
                description: form.description.trim() || form.name.trim(),
                currencyCode: form.currencyCode || 'TZS',
                digitsAfterDecimal: Number(form.digitsAfterDecimal || 2),
                inMultiplesOf: Number(form.inMultiplesOf || 0),
                nominalAnnualInterestRate: Number(form.nominalAnnualInterestRate || 0),
                interestCompoundingPeriodType: Number(form.interestCompoundingPeriodType || 1),
                interestPostingPeriodType: Number(form.interestPostingPeriodType || 4),
                interestCalculationType: Number(form.interestCalculationType || 1),
                interestCalculationDaysInYearType: Number(form.interestCalculationDaysInYearType || 365),
                accountingRule: Number(form.accountingRule || 1),
                allowOverdraft: Boolean(form.allowOverdraft),
                enforceMinRequiredBalance: Boolean(form.enforceMinRequiredBalance),
                withdrawalFeeForTransfers: Boolean(form.withdrawalFeeForTransfers),
                isDormancyTrackingActive: Boolean(form.isDormancyTrackingActive),
                withHoldTax: Boolean(form.withHoldTax),
            };
            const charges = parseChargeIds();
            if (charges.length) payload.charges = charges;
            const minOpening = numberOrUndefined(form.minRequiredOpeningBalance);
            if (minOpening !== undefined) payload.minRequiredOpeningBalance = minOpening;
            const lockin = numberOrUndefined(form.lockinPeriodFrequency);
            if (lockin !== undefined && lockin > 0) {
                payload.lockinPeriodFrequency = lockin;
                payload.lockinPeriodFrequencyType = Number(form.lockinPeriodFrequencyType || 0);
            }
            if (isAccountingEnabled) {
                accountingFields.forEach(([field]) => {
                    payload[field] = Number(form[field]);
                });
            }
            await api.post('/savingsproducts', payload);
            addToast('Savings product created', 'success');
            setForm(initialForm);
            setErrors({});
            await load();
        } catch (error) {
            addToast(parseError(error, 'Create savings product failed'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const accountOptions = (type) => {
        const typed = accountsByType[type] || [];
        return typed.length ? typed : accountsByType.ALL;
    };

    const renderAccountSelect = ([field, label, type]) => (
        <label key={field} className="text-sm">
            {label}
            <select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form[field]} onChange={update(field)} required={isAccountingEnabled} disabled={loadingAccounts}>
                <option value="">Select account</option>
                {accountOptions(type).map((account) => <option key={`${field}-${accountId(account)}`} value={accountId(account)}>{accountLabel(account)}</option>)}
            </select>
            {errors[field] ? <span className="mt-1 block text-xs text-red-600">{errors[field]}</span> : null}
        </label>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Savings Products</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Create and review Fineract savings products used for manual and reconciliation savings accounts.</p>
                </div>
                <Button variant="secondary" onClick={load} disabled={loading || saving}>Refresh</Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
                <Card>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <input
                            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 md:max-w-sm"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search products..."
                        />
                        <div className="text-sm text-gray-500">{filtered.length} products</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800/60">
                                <tr>
                                    <th className="px-3 py-3">Product</th>
                                    <th className="px-3 py-3">Currency</th>
                                    <th className="px-3 py-3">Interest</th>
                                    <th className="px-3 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {filtered.map((product) => {
                                    const active = product.active ?? product.status?.active ?? true;
                                    return (
                                        <tr key={product.id}>
                                            <td className="px-3 py-3">
                                                <div className="font-semibold">{product.name || '-'}</div>
                                                <div className="text-xs text-gray-500">ID {product.id} {product.shortName ? `- ${product.shortName}` : ''}</div>
                                            </td>
                                            <td className="px-3 py-3">{product.currency?.code || product.currencyCode || '-'}</td>
                                            <td className="px-3 py-3">{product.nominalAnnualInterestRate ?? product.interestRate ?? 0}%</td>
                                            <td className="px-3 py-3"><Badge tone={active ? 'green' : 'yellow'}>{active ? 'Active' : 'Inactive'}</Badge></td>
                                        </tr>
                                    );
                                })}
                                {!filtered.length ? (
                                    <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>{loading ? 'Loading products...' : 'No savings products found.'}</td></tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <form className="space-y-4" onSubmit={createProduct}>
                        <div>
                            <h2 className="text-lg font-semibold">New Savings Product</h2>
                            <p className="text-sm text-gray-500">Select Cash accounting only when the required GL accounts are mapped.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm">Name<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.name} onChange={update('name')} required />{errors.name ? <span className="mt-1 block text-xs text-red-600">{errors.name}</span> : null}</label>
                            <label className="text-sm">Short Name<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.shortName} onChange={update('shortName')} required maxLength={4} />{errors.shortName ? <span className="mt-1 block text-xs text-red-600">{errors.shortName}</span> : null}</label>
                            <label className="text-sm sm:col-span-2">Description<textarea className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.description} onChange={update('description')} rows={2} /></label>
                            <label className="text-sm">Currency<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.currencyCode} onChange={update('currencyCode')} /></label>
                            <label className="text-sm">Interest Rate %<input type="number" step="0.01" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.nominalAnnualInterestRate} onChange={update('nominalAnnualInterestRate')} /></label>
                            <label className="text-sm">Digits After Decimal<input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.digitsAfterDecimal} onChange={update('digitsAfterDecimal')} /></label>
                            <label className="text-sm">Multiples Of<input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.inMultiplesOf} onChange={update('inMultiplesOf')} /></label>
                            <label className="text-sm">Minimum Opening Balance<input type="number" step="0.01" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.minRequiredOpeningBalance} onChange={update('minRequiredOpeningBalance')} /></label>
                            <label className="text-sm">Charge IDs<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.chargeIds} onChange={update('chargeIds')} placeholder="Comma separated, e.g. 1,2" /></label>
                            <label className="text-sm">Accounting Rule<select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.accountingRule} onChange={update('accountingRule')}><option value="1">None</option><option value="2">Cash</option></select></label>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {['allowOverdraft','enforceMinRequiredBalance','withdrawalFeeForTransfers','isDormancyTrackingActive','withHoldTax'].map((field) => (
                                <label key={field} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={Boolean(form[field])} onChange={update(field)} />
                                    <span>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</span>
                                </label>
                            ))}
                        </div>

                        {isAccountingEnabled ? (
                            <div className="rounded-lg border p-3 dark:border-gray-800">
                                <div className="mb-3 font-semibold">Cash Accounting GL Mapping</div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {accountingFields.map(renderAccountSelect)}
                                </div>
                            </div>
                        ) : null}

                        <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Savings Product'}</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default SavingsProducts;