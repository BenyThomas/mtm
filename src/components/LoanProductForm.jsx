import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const FALLBACK_TEMPLATE = {
    currencyOptions: [{ code: 'TZS', name: 'Tanzanian Shilling' }, { code: 'USD', name: 'US Dollar' }],
    amortizationTypeOptions: [
        { id: 1, value: 'Equal installments' },
        { id: 2, value: 'Equal principal payments' },
    ],
    interestTypeOptions: [
        { id: 0, value: 'Declining Balance' },
        { id: 1, value: 'Flat' },
    ],
    interestCalculationPeriodTypeOptions: [
        { id: 1, value: 'Same as repayment period' },
        { id: 2, value: 'Daily' },
    ],
    repaymentFrequencyTypeOptions: [
        { id: 1, value: 'Weeks' },
        { id: 2, value: 'Months' },
    ],
    interestRateFrequencyTypeOptions: [
        { id: 1, value: 'Per Year' },
        { id: 2, value: 'Per Month' },
    ],
    daysInMonthTypeOptions: [
        { id: 1, value: 'Actual' },
        { id: 30, value: '30 Days' },
    ],
    daysInYearTypeOptions: [
        { id: 360, value: '360 Days' },
        { id: 365, value: '365 Days' },
        { id: 366, value: '366 Days' },
    ],
    accountingRuleOptions: [
        { id: 1, value: 'None' },
        { id: 2, value: 'Cash' },
        { id: 3, value: 'Accrual (Periodic)' },
    ],
    transactionProcessingStrategyOptions: [
        { id: 1, code: 'mifos-standard-strategy', name: 'Mifos Standard' },
    ],
    chargeOptions: [],
    accountingMappingOptions: {
        assetAccountOptions: [],
        incomeAccountOptions: [],
        expenseAccountOptions: [],
        liabilityAccountOptions: [],
    },
};

const numberOrUndefined = (v) =>
    v === '' || v === null || v === undefined ? undefined : Number(v);

/**
 * Props:
 * - initial: existing product object (for edit)
 * - onSubmit: async (payload) => void  // parent calls POST/PUT
 * - submitting: boolean
 */
const LoanProductForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [tpl, setTpl] = useState(FALLBACK_TEMPLATE);

    // ----- Core fields -----
    const [form, setForm] = useState({
        name: '',
        shortName: '',
        currencyCode: 'TZS',
        digitsAfterDecimal: 0,

        principalMin: '',
        principalDefault: '',
        principalMax: '',

        rateMin: '',
        rateDefault: '',
        rateMax: '',

        interestRateFrequencyType: 2, // Months default (safe fallback)

        numRepaymentsMin: '',
        numRepaymentsDefault: '',
        numRepaymentsMax: '',

        repaymentEvery: 1,
        repaymentFrequencyType: 2, // Months

        amortizationType: 1,
        interestType: 0,
        interestCalculationPeriodType: 1,

        daysInMonthType: 30, // common default
        daysInYearType: 365,

        // ----- Strategy / Charges / Accounting -----
        transactionProcessingStrategyId: '',
        chargeIds: [],

        accountingRule: 1, // 1=None, 2=Cash, 3=Accrual Periodic

        // GL mappings (required if accountingRule !== 1)
        // Cash requires these
        fundSourceAccountId: '',
        loanPortfolioAccountId: '',
        interestOnLoanAccountId: '',
        incomeFromFeeAccountId: '',
        incomeFromPenaltyAccountId: '',
        writeOffAccountId: '',
        overpaymentLiabilityAccountId: '',

        // Accrual Periodic requires the above plus receivables
        receivableInterestAccountId: '',
        receivableFeeAccountId: '',
        receivablePenaltyAccountId: '',
    });

    const [errors, setErrors] = useState({});

    // ---------- Load template ----------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get('/loanproducts/template');
                if (!cancelled && res?.data) {
                    setTpl({
                        currencyOptions:
                            res.data.currencyOptions || FALLBACK_TEMPLATE.currencyOptions,
                        amortizationTypeOptions:
                            res.data.amortizationTypeOptions ||
                            FALLBACK_TEMPLATE.amortizationTypeOptions,
                        interestTypeOptions:
                            res.data.interestTypeOptions || FALLBACK_TEMPLATE.interestTypeOptions,
                        interestCalculationPeriodTypeOptions:
                            res.data.interestCalculationPeriodTypeOptions ||
                            FALLBACK_TEMPLATE.interestCalculationPeriodTypeOptions,
                        repaymentFrequencyTypeOptions:
                            res.data.repaymentFrequencyTypeOptions ||
                            FALLBACK_TEMPLATE.repaymentFrequencyTypeOptions,
                        interestRateFrequencyTypeOptions:
                            res.data.interestRateFrequencyTypeOptions ||
                            FALLBACK_TEMPLATE.interestRateFrequencyTypeOptions,
                        daysInMonthTypeOptions:
                            res.data.daysInMonthTypeOptions ||
                            FALLBACK_TEMPLATE.daysInMonthTypeOptions,
                        daysInYearTypeOptions:
                            res.data.daysInYearTypeOptions ||
                            FALLBACK_TEMPLATE.daysInYearTypeOptions,
                        accountingRuleOptions:
                            res.data.accountingRuleOptions ||
                            FALLBACK_TEMPLATE.accountingRuleOptions,
                        transactionProcessingStrategyOptions:
                            res.data.transactionProcessingStrategyOptions ||
                            FALLBACK_TEMPLATE.transactionProcessingStrategyOptions,
                        chargeOptions: res.data.chargeOptions || [],
                        accountingMappingOptions:
                            res.data.accountingMappingOptions ||
                            FALLBACK_TEMPLATE.accountingMappingOptions,
                    });

                    // Default strategy if available and not in edit mode
                    if (!initial) {
                        const firstStrat =
                            (res.data.transactionProcessingStrategyOptions || [])[0];
                        if (firstStrat?.id) {
                            setForm((f) => ({
                                ...f,
                                transactionProcessingStrategyId: firstStrat.id,
                            }));
                        }
                    }
                }
            } catch {
                // keep fallbacks
                if (!initial) {
                    const firstStrat =
                        FALLBACK_TEMPLATE.transactionProcessingStrategyOptions[0];
                    if (firstStrat?.id) {
                        setForm((f) => ({
                            ...f,
                            transactionProcessingStrategyId: firstStrat.id,
                        }));
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => (cancelled = true);
    }, [initial]);

    // ---------- Map existing product -> form (edit mode) ----------
    useEffect(() => {
        if (!initial) return;

        // charges might come as array of { id, name }
        const initialChargeIds =
            Array.isArray(initial.charges) && initial.charges.length
                ? initial.charges.map((c) => String(c.id ?? c.chargeId ?? c))
                : [];

        // accounting mappings: try to read ids from typical keys
        const toId = (x) => (x && (x.id || x.accountId)) || '';

        setForm((f) => ({
            ...f,
            name: initial.name || '',
            shortName:
                initial.shortName || (initial.shortName === 0 ? '0' : initial.shortName) || '',
            currencyCode: initial.currency?.code || initial.currencyCode || f.currencyCode,
            digitsAfterDecimal:
                initial.currency?.decimalPlaces ??
                initial.digitsAfterDecimal ??
                f.digitsAfterDecimal,

            principalMin:
                initial.principal?.minimum ?? initial.minPrincipal ?? '',
            principalDefault:
                initial.principal?.default ?? initial.principal ?? initial.principalAmount ?? '',
            principalMax:
                initial.principal?.maximum ?? initial.maxPrincipal ?? '',

            rateMin:
                initial.interestRatePerPeriod?.minimum ?? initial.minInterestRatePerPeriod ?? '',
            rateDefault:
                initial.interestRatePerPeriod?.default ??
                initial.interestRatePerPeriod ??
                initial.interestRate ??
                '',
            rateMax:
                initial.interestRatePerPeriod?.maximum ?? initial.maxInterestRatePerPeriod ?? '',

            interestRateFrequencyType:
                initial.interestRateFrequencyType?.id ??
                initial.interestRateFrequencyType ??
                f.interestRateFrequencyType,

            numRepaymentsMin:
                initial.numberOfRepayments?.minimum ?? initial.minNumberOfRepayments ?? '',
            numRepaymentsDefault:
                initial.numberOfRepayments?.default ?? initial.numberOfRepayments ?? '',
            numRepaymentsMax:
                initial.numberOfRepayments?.maximum ?? initial.maxNumberOfRepayments ?? '',

            repaymentEvery: initial.repaymentEvery ?? 1,
            repaymentFrequencyType:
                initial.repaymentFrequencyType?.id ??
                initial.repaymentFrequencyType ??
                2,

            amortizationType:
                initial.amortizationType?.id ?? initial.amortizationType ?? 1,
            interestType:
                initial.interestType?.id ?? initial.interestType ?? 0,
            interestCalculationPeriodType:
                initial.interestCalculationPeriodType?.id ??
                initial.interestCalculationPeriodType ??
                1,

            daysInMonthType:
                initial.daysInMonthType?.id ?? initial.daysInMonthType ?? 30,
            daysInYearType:
                initial.daysInYearType?.id ?? initial.daysInYearType ?? 365,

            transactionProcessingStrategyId:
                initial.transactionProcessingStrategy?.id ??
                initial.transactionProcessingStrategyId ??
                f.transactionProcessingStrategyId,

            chargeIds: initialChargeIds,

            accountingRule:
                initial.accountingRule?.id ?? initial.accountingRule ?? 1,

            fundSourceAccountId: toId(initial.fundSourceAccount),
            loanPortfolioAccountId: toId(initial.loanPortfolioAccount),
            interestOnLoanAccountId: toId(initial.interestOnLoanAccount),
            incomeFromFeeAccountId: toId(initial.incomeFromFeeAccount),
            incomeFromPenaltyAccountId: toId(initial.incomeFromPenaltyAccount),
            writeOffAccountId: toId(initial.writeOffAccount),
            overpaymentLiabilityAccountId: toId(initial.overpaymentLiabilityAccount),

            receivableInterestAccountId: toId(initial.receivableInterestAccount),
            receivableFeeAccountId: toId(initial.receivableFeeAccount),
            receivablePenaltyAccountId: toId(initial.receivablePenaltyAccount),
        }));
    }, [initial]);

    const setField = (k, v) => {
        setForm((s) => ({ ...s, [k]: v }));
        setErrors((e) => ({ ...e, [k]: '' }));
    };

    const isAccountingEnabled = Number(form.accountingRule) !== 1;
    const isAccrual = Number(form.accountingRule) === 3;

    // ---------- Validation ----------
    const validate = () => {
        const e = {};
        if (!form.name) e.name = 'Name is required';
        if (!form.shortName) e.shortName = 'Short name is required';
        if (!form.currencyCode) e.currencyCode = 'Currency is required';

        if (form.principalDefault === '' || Number(form.principalDefault) <= 0) {
            e.principalDefault = 'Default principal is required';
        }
        if (form.numRepaymentsDefault === '' || Number(form.numRepaymentsDefault) <= 0) {
            e.numRepaymentsDefault = '# of repayments is required';
        }
        if (!form.repaymentEvery || Number(form.repaymentEvery) <= 0) {
            e.repaymentEvery = 'Repayment every is required';
        }
        if (!form.transactionProcessingStrategyId) {
            e.transactionProcessingStrategyId = 'Processing strategy is required';
        }

        if (isAccountingEnabled) {
            // Cash & Accrual both require these:
            [
                'fundSourceAccountId',
                'loanPortfolioAccountId',
                'interestOnLoanAccountId',
                'incomeFromFeeAccountId',
                'incomeFromPenaltyAccountId',
                'writeOffAccountId',
                'overpaymentLiabilityAccountId',
            ].forEach((k) => {
                if (!form[k]) e[k] = 'Required';
            });

            if (isAccrual) {
                ['receivableInterestAccountId', 'receivableFeeAccountId', 'receivablePenaltyAccountId'].forEach((k) => {
                    if (!form[k]) e[k] = 'Required';
                });
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ---------- Build payload ----------
    const buildPayload = () => {
        const payload = {
            name: form.name,
            shortName: form.shortName,
            currencyCode: form.currencyCode,
            digitsAfterDecimal: numberOrUndefined(form.digitsAfterDecimal),

            minPrincipal: numberOrUndefined(form.principalMin),
            principal: numberOrUndefined(form.principalDefault),
            maxPrincipal: numberOrUndefined(form.principalMax),

            minInterestRatePerPeriod: numberOrUndefined(form.rateMin),
            interestRatePerPeriod: numberOrUndefined(form.rateDefault),
            maxInterestRatePerPeriod: numberOrUndefined(form.rateMax),
            interestRateFrequencyType: Number(form.interestRateFrequencyType),

            minNumberOfRepayments: numberOrUndefined(form.numRepaymentsMin),
            numberOfRepayments: numberOrUndefined(form.numRepaymentsDefault),
            maxNumberOfRepayments: numberOrUndefined(form.numRepaymentsMax),

            repaymentEvery: numberOrUndefined(form.repaymentEvery),
            repaymentFrequencyType: Number(form.repaymentFrequencyType),

            amortizationType: Number(form.amortizationType),
            interestType: Number(form.interestType),
            interestCalculationPeriodType: Number(form.interestCalculationPeriodType),

            daysInMonthType: Number(form.daysInMonthType),
            daysInYearType: Number(form.daysInYearType),

            transactionProcessingStrategyId: Number(form.transactionProcessingStrategyId),

            charges: (form.chargeIds || []).map((id) => ({ id: Number(id) })),

            accountingRule: Number(form.accountingRule),

            locale: 'en',
        };

        if (isAccountingEnabled) {
            payload.fundSourceAccountId = Number(form.fundSourceAccountId);
            payload.loanPortfolioAccountId = Number(form.loanPortfolioAccountId);
            payload.interestOnLoanAccountId = Number(form.interestOnLoanAccountId);
            payload.incomeFromFeeAccountId = Number(form.incomeFromFeeAccountId);
            payload.incomeFromPenaltyAccountId = Number(form.incomeFromPenaltyAccountId);
            payload.writeOffAccountId = Number(form.writeOffAccountId);
            payload.overpaymentLiabilityAccountId = Number(form.overpaymentLiabilityAccountId);

            if (isAccrual) {
                payload.receivableInterestAccountId = Number(form.receivableInterestAccountId);
                payload.receivableFeeAccountId = Number(form.receivableFeeAccountId);
                payload.receivablePenaltyAccountId = Number(form.receivablePenaltyAccountId);
            }
        }

        return payload;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = buildPayload();
        await onSubmit(payload);
    };

    // ---------- Options ----------
    const {
        currencyOptions,
        amortizationTypeOptions,
        interestTypeOptions,
        interestCalculationPeriodTypeOptions,
        repaymentFrequencyTypeOptions,
        interestRateFrequencyTypeOptions,
        daysInMonthTypeOptions,
        daysInYearTypeOptions,
        accountingRuleOptions,
        transactionProcessingStrategyOptions,
        chargeOptions,
        accountingMappingOptions,
    } = tpl;

    const assets = accountingMappingOptions?.assetAccountOptions || [];
    const income = accountingMappingOptions?.incomeAccountOptions || [];
    const expenses = accountingMappingOptions?.expenseAccountOptions || [];
    const liability = accountingMappingOptions?.liabilityAccountOptions || [];

    const acctOptionLabel = (a) => `${a.glCode || a.code || ''} ${a.name ? `— ${a.name}` : ''}`.trim();

    if (loading) {
        return (
            <Card>
                <Skeleton height="14rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basics */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Name *</label>
                        <input
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Short Name *</label>
                        <input
                            value={form.shortName}
                            onChange={(e) => setField('shortName', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.shortName && <p className="text-xs text-red-500 mt-1">{errors.shortName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Currency *</label>
                        <select
                            value={form.currencyCode}
                            onChange={(e) => setField('currencyCode', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {currencyOptions.map((c) => (
                                <option key={c.code || c.value} value={c.code || c.value}>
                                    {c.code || c.value} {c.name ? `— ${c.name}` : ''}
                                </option>
                            ))}
                        </select>
                        {errors.currencyCode && <p className="text-xs text-red-500 mt-1">{errors.currencyCode}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Digits After Decimal</label>
                        <input
                            type="number"
                            min="0"
                            value={form.digitsAfterDecimal}
                            onChange={(e) => setField('digitsAfterDecimal', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Principal */}
            <Card>
                <div className="font-semibold mb-2">Principal</div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Min</label>
                        <input
                            type="number"
                            min="0"
                            value={form.principalMin}
                            onChange={(e) => setField('principalMin', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Default *</label>
                        <input
                            type="number"
                            min="0"
                            value={form.principalDefault}
                            onChange={(e) => setField('principalDefault', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.principalDefault && <p className="text-xs text-red-500 mt-1">{errors.principalDefault}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Max</label>
                        <input
                            type="number"
                            min="0"
                            value={form.principalMax}
                            onChange={(e) => setField('principalMax', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Interest */}
            <Card>
                <div className="font-semibold mb-2">Interest Rate</div>
                <div className="grid md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Min (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.rateMin}
                            onChange={(e) => setField('rateMin', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Default (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.rateDefault}
                            onChange={(e) => setField('rateDefault', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Max (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.rateMax}
                            onChange={(e) => setField('rateMax', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Rate Frequency</label>
                        <select
                            value={form.interestRateFrequencyType}
                            onChange={(e) => setField('interestRateFrequencyType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {(interestRateFrequencyTypeOptions || []).map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Repayments */}
            <Card>
                <div className="font-semibold mb-2">Repayments</div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Min # of Repayments</label>
                        <input
                            type="number"
                            min="0"
                            value={form.numRepaymentsMin}
                            onChange={(e) => setField('numRepaymentsMin', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Default # of Repayments *</label>
                        <input
                            type="number"
                            min="1"
                            value={form.numRepaymentsDefault}
                            onChange={(e) => setField('numRepaymentsDefault', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.numRepaymentsDefault && <p className="text-xs text-red-500 mt-1">{errors.numRepaymentsDefault}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Max # of Repayments</label>
                        <input
                            type="number"
                            min="0"
                            value={form.numRepaymentsMax}
                            onChange={(e) => setField('numRepaymentsMax', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">Repayment Every *</label>
                        <input
                            type="number"
                            min="1"
                            value={form.repaymentEvery}
                            onChange={(e) => setField('repaymentEvery', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.repaymentEvery && <p className="text-xs text-red-500 mt-1">{errors.repaymentEvery}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Frequency *</label>
                        <select
                            value={form.repaymentFrequencyType}
                            onChange={(e) => setField('repaymentFrequencyType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {repaymentFrequencyTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Amortization *</label>
                        <select
                            value={form.amortizationType}
                            onChange={(e) => setField('amortizationType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {amortizationTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Interest Type *</label>
                        <select
                            value={form.interestType}
                            onChange={(e) => setField('interestType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {interestTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Interest Calc Period *</label>
                        <select
                            value={form.interestCalculationPeriodType}
                            onChange={(e) => setField('interestCalculationPeriodType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {interestCalculationPeriodTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">Days in Month</label>
                        <select
                            value={form.daysInMonthType}
                            onChange={(e) => setField('daysInMonthType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {daysInMonthTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Days in Year</label>
                        <select
                            value={form.daysInYearType}
                            onChange={(e) => setField('daysInYearType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {daysInYearTypeOptions.map((o) => (
                                <option key={o.id || o.value} value={o.id || o.value}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Processing Strategy & Charges */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Transaction Processing Strategy *</label>
                        <select
                            value={form.transactionProcessingStrategyId}
                            onChange={(e) => setField('transactionProcessingStrategyId', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select strategy</option>
                            {transactionProcessingStrategyOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name || s.code || `Strategy ${s.id}`}
                                </option>
                            ))}
                        </select>
                        {errors.transactionProcessingStrategyId && (
                            <p className="text-xs text-red-500 mt-1">{errors.transactionProcessingStrategyId}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Charges</label>
                        <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-40 overflow-auto border rounded p-2 dark:border-gray-600">
                            {!chargeOptions?.length ? (
                                <div className="text-sm text-gray-500">No charge options available.</div>
                            ) : (
                                chargeOptions.map((ch) => {
                                    const id = String(ch.id);
                                    const checked = form.chargeIds.includes(id);
                                    return (
                                        <label key={id} className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    setForm((prev) => {
                                                        const next = new Set(prev.chargeIds);
                                                        if (e.target.checked) next.add(id);
                                                        else next.delete(id);
                                                        return { ...prev, chargeIds: Array.from(next) };
                                                    });
                                                }}
                                            />
                                            <span className="text-sm">
                        {ch.name} {ch.currency?.code ? `(${ch.currency.code})` : ''}
                      </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Accounting */}
            <Card>
                <div className="font-semibold mb-2">Accounting</div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Accounting Rule</label>
                        <select
                            value={form.accountingRule}
                            onChange={(e) => setField('accountingRule', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {accountingRuleOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {isAccountingEnabled && (
                    <div className="mt-4 space-y-6">
                        <div>
                            <div className="font-medium mb-2">Required Accounts</div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Fund Source (Asset) *</label>
                                    <select
                                        value={form.fundSourceAccountId}
                                        onChange={(e) => setField('fundSourceAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {assets.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.fundSourceAccountId && <p className="text-xs text-red-500 mt-1">{errors.fundSourceAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Loan Portfolio (Asset) *</label>
                                    <select
                                        value={form.loanPortfolioAccountId}
                                        onChange={(e) => setField('loanPortfolioAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {assets.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.loanPortfolioAccountId && <p className="text-xs text-red-500 mt-1">{errors.loanPortfolioAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Interest on Loan (Income) *</label>
                                    <select
                                        value={form.interestOnLoanAccountId}
                                        onChange={(e) => setField('interestOnLoanAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.interestOnLoanAccountId && <p className="text-xs text-red-500 mt-1">{errors.interestOnLoanAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Income from Fees (Income) *</label>
                                    <select
                                        value={form.incomeFromFeeAccountId}
                                        onChange={(e) => setField('incomeFromFeeAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.incomeFromFeeAccountId && <p className="text-xs text-red-500 mt-1">{errors.incomeFromFeeAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Income from Penalties (Income) *</label>
                                    <select
                                        value={form.incomeFromPenaltyAccountId}
                                        onChange={(e) => setField('incomeFromPenaltyAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.incomeFromPenaltyAccountId && <p className="text-xs text-red-500 mt-1">{errors.incomeFromPenaltyAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Write-off (Expense) *</label>
                                    <select
                                        value={form.writeOffAccountId}
                                        onChange={(e) => setField('writeOffAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {expenses.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.writeOffAccountId && <p className="text-xs text-red-500 mt-1">{errors.writeOffAccountId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Overpayment Liability (Liability) *</label>
                                    <select
                                        value={form.overpaymentLiabilityAccountId}
                                        onChange={(e) => setField('overpaymentLiabilityAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {liability.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.overpaymentLiabilityAccountId && <p className="text-xs text-red-500 mt-1">{errors.overpaymentLiabilityAccountId}</p>}
                                </div>
                            </div>
                        </div>

                        {isAccrual && (
                            <div>
                                <div className="font-medium mb-2">Accrual Accounts (Periodic)</div>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Receivable Interest (Asset) *</label>
                                        <select
                                            value={form.receivableInterestAccountId}
                                            onChange={(e) => setField('receivableInterestAccountId', e.target.value)}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select</option>
                                            {assets.map((a) => (
                                                <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                            ))}
                                        </select>
                                        {errors.receivableInterestAccountId && <p className="text-xs text-red-500 mt-1">{errors.receivableInterestAccountId}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Receivable Fees (Asset) *</label>
                                        <select
                                            value={form.receivableFeeAccountId}
                                            onChange={(e) => setField('receivableFeeAccountId', e.target.value)}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select</option>
                                            {assets.map((a) => (
                                                <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                            ))}
                                        </select>
                                        {errors.receivableFeeAccountId && <p className="text-xs text-red-500 mt-1">{errors.receivableFeeAccountId}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Receivable Penalties (Asset) *</label>
                                        <select
                                            value={form.receivablePenaltyAccountId}
                                            onChange={(e) => setField('receivablePenaltyAccountId', e.target.value)}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="">Select</option>
                                            {assets.map((a) => (
                                                <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                            ))}
                                        </select>
                                        {errors.receivablePenaltyAccountId && <p className="text-xs text-red-500 mt-1">{errors.receivablePenaltyAccountId}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Product')}
                </Button>
            </div>
        </form>
    );
};

export default LoanProductForm;
