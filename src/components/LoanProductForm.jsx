import React, { useEffect, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import SearchableSelectField from './SearchableSelectField';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const FALLBACK_TEMPLATE = {
    currencyOptions: [{ code: 'TZS', name: 'Tanzanian Shilling' }, { code: 'USD', name: 'US Dollar' }],
    fundOptions: [],
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
        { code: 'mifos-standard-strategy', name: 'Mifos Standard' },
    ],

    // Extras for features
    loanScheduleTypeOptions: [
        { id: 1, code: 'CUMULATIVE', value: 'Cumulative' },
        { id: 2, code: 'PROGRESSIVE', value: 'Progressive' },
    ],
    loanScheduleProcessingTypeOptions: [
        { id: 1, code: 'HORIZONTAL', value: 'Horizontal' },
        { id: 2, code: 'VERTICAL', value: 'Vertical' },
    ],
    capitalizedIncomeCalculationTypeOptions: [{ id: 'FLAT', code: 'flat', value: 'Flat' }],
    capitalizedIncomeStrategyOptions: [{ id: 'EQUAL_AMORTIZATION', code: 'equal', value: 'Equal amortization' }],
    capitalizedIncomeTypeOptions: [
        { id: 'FEE', value: 'Fee' },
        { id: 'INTEREST', value: 'Interest' },
    ],
    buyDownFeeCalculationTypeOptions: [{ id: 'FLAT', value: 'Flat' }],
    buyDownFeeStrategyOptions: [{ id: 'EQUAL_AMORTIZATION', value: 'Equal amortization' }],
    buyDownFeeIncomeTypeOptions: [
        { id: 'FEE', value: 'Fee' },
        { id: 'INTEREST', value: 'Interest' },
    ],
    chargeOptions: [],
    accountingMappingOptions: {
        assetAccountOptions: [],
        incomeAccountOptions: [],
        expenseAccountOptions: [],
        liabilityAccountOptions: [],
    },

    // Recalculation option sets
    interestRecalculationCompoundingTypeOptions: [
        { id: 0, value: 'None' },
        { id: 1, value: 'Interest' },
        { id: 2, value: 'Fee' },
        { id: 3, value: 'Fee and Interest' },
    ],
    interestRecalculationFrequencyTypeOptions: [
        { id: 1, value: 'Same as repayment period' },
        { id: 2, value: 'Daily' },
        { id: 3, value: 'Weekly' },
        { id: 4, value: 'Monthly' },
    ],
    rescheduleStrategyTypeOptions: [
        { id: 1, value: 'Reschedule next repayments' },
        { id: 2, value: 'Reduce number of installments' },
        { id: 3, value: 'Reduce EMI amount' },
        { id: 4, value: 'Adjust last, unpaid period' },
    ],
    preClosureInterestCalculationStrategyOptions: [
        { id: 1, value: 'Till Pre-Close Date' },
        { id: 2, value: 'Till Rest Frequency Date' },
    ],
};

const numberOrUndefined = (v) =>
    v === '' || v === null || v === undefined ? undefined : Number(v);
const optionIdOrValue = (o) => o?.id ?? o?.value;
const optionCodeOrValue = (o) => o?.code ?? o?.value;
const hasValidNumber = (v) => {
    if (v === '' || v === null || v === undefined) return false;
    return Number.isFinite(Number(v));
};

const stringOrUndefined = (v) => {
    if (v === null || v === undefined) return undefined;
    const text = String(v).trim();
    return text ? text : undefined;
};

const normalizeEnumToken = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    const raw = typeof value === 'object'
        ? (value.code ?? value.value ?? value.id ?? '')
        : value;
    const text = String(raw || '').trim();
    if (!text) return fallback;
    return text.replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase();
};

const stringifyStructuredValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

const ATTRIBUTE_OVERRIDE_OPTIONS = [
    {
        key: 'amortizationType',
        label: 'Amortization method',
        hint: 'Allow the loan application to use a different amortization method.',
    },
    {
        key: 'interestType',
        label: 'Interest type',
        hint: 'Allow flat or declining-balance interest to be changed on the loan.',
    },
    {
        key: 'transactionProcessingStrategyCode',
        label: 'Transaction processing strategy',
        hint: 'Allow the payment allocation strategy to be changed on the loan.',
    },
    {
        key: 'interestCalculationPeriodType',
        label: 'Interest calculation period',
        hint: 'Allow the interest calculation period to be changed on the loan.',
    },
    {
        key: 'inArrearsTolerance',
        label: 'Arrears tolerance',
        hint: 'Allow the arrears tolerance amount to be changed on the loan.',
    },
    {
        key: 'repaymentEvery',
        label: 'Repayment interval',
        hint: 'Allow the repayment interval to be changed on the loan.',
    },
    {
        key: 'graceOnPrincipalAndInterestPayment',
        label: 'Principal and interest grace periods',
        hint: 'Allow principal and interest grace periods to be changed on the loan.',
    },
    {
        key: 'graceOnArrearsAgeing',
        label: 'Arrears ageing grace period',
        hint: 'Allow the arrears ageing grace period to be changed on the loan.',
    },
];

const normalizeAttributeOverrides = (value) => {
    let source = value;
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source);
        } catch {
            source = {};
        }
    }
    if (!source || Array.isArray(source) || typeof source !== 'object') return {};

    return Object.fromEntries(
        ATTRIBUTE_OVERRIDE_OPTIONS.map(({ key }) => [key, Boolean(source[key])])
    );
};

const toISO = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value) && value.length >= 3) {
        const [year, month, day] = value;
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const text = String(value).trim();
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const normalizeAccountingOptions = (options) => ({
    assetAccountOptions: Array.isArray(options?.assetAccountOptions) ? options.assetAccountOptions : [],
    incomeAccountOptions: Array.isArray(options?.incomeAccountOptions) ? options.incomeAccountOptions : [],
    expenseAccountOptions: Array.isArray(options?.expenseAccountOptions) ? options.expenseAccountOptions : [],
    liabilityAccountOptions: Array.isArray(options?.liabilityAccountOptions) ? options.liabilityAccountOptions : [],
});

const hasAccountingOptions = (options) =>
    Object.values(normalizeAccountingOptions(options)).some((items) => items.length > 0);

const accountingOptionId = (account) => String(account?.id ?? account?.accountId ?? '');
const isDisabledAccountingOption = (account) =>
    account?.disabled === true || String(account?.disabled ?? '').toLowerCase() === 'true';
const findAccountingOption = (options, id) =>
    (options || []).find((account) => accountingOptionId(account) === String(id));

const buildAccountingOptionsFromGlAccounts = (accounts) => {
    const normalized = Array.isArray(accounts)
        ? accounts
            .map((account) => {
                const id = Number(account?.id ?? account?.accountId);
                if (!Number.isInteger(id) || id <= 0) return null;
                return {
                    id,
                    glCode: account?.glCode ?? account?.code ?? '',
                    name: account?.name ?? account?.nameDecorated ?? `#${id}`,
                    disabled: Boolean(account?.disabled),
                    typeLabel: String(
                        account?.type?.value ??
                        account?.classification?.value ??
                        account?.accountType?.value ??
                        account?.type ??
                        ''
                    ).toLowerCase(),
                };
            })
            .filter(Boolean)
        : [];

    const buckets = {
        assetAccountOptions: normalized.filter((account) => account.typeLabel.includes('asset')),
        incomeAccountOptions: normalized.filter((account) => account.typeLabel.includes('income')),
        expenseAccountOptions: normalized.filter((account) => account.typeLabel.includes('expense')),
        liabilityAccountOptions: normalized.filter((account) => account.typeLabel.includes('liability')),
    };

    return {
        assetAccountOptions: buckets.assetAccountOptions.map(({ typeLabel, ...account }) => account),
        incomeAccountOptions: buckets.incomeAccountOptions.map(({ typeLabel, ...account }) => account),
        expenseAccountOptions: buckets.expenseAccountOptions.map(({ typeLabel, ...account }) => account),
        liabilityAccountOptions: buckets.liabilityAccountOptions.map(({ typeLabel, ...account }) => account),
    };
};

const parseJsonValue = (value, label) => {
    const text = stringOrUndefined(value);
    if (!text) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`${label} must be valid JSON`);
    }
};

const SectionTitle = ({ icon, children, hint }) => (
    <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <div className="font-semibold">{children}</div>
        </div>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </div>
);

/**
 * Props:
 * - initial: existing product object (for edit)
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const LoanProductForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [tpl, setTpl] = useState(FALLBACK_TEMPLATE);
    const [templateError, setTemplateError] = useState('');
    const [capabilities, setCapabilities] = useState({
        incomeCapitalization: false,
        buyDownFee: false,
    });

    // ----- Core fields -----
    const [form, setForm] = useState({
        name: '',
        shortName: '',
        description: '',
        fundId: '',
        currencyCode: 'TZS',
        digitsAfterDecimal: 0,
        inMultiplesOf: '',
        includeInBorrowerCycle: false,
        externalId: '',
        startDate: '',
        closeDate: '',

        principalMin: '',
        principalDefault: '',
        principalMax: '',

        rateMin: '',
        rateDefault: '',
        rateMax: '',
        interestRateFrequencyType: 2, // Months default

        numRepaymentsMin: '',
        numRepaymentsDefault: '',
        numRepaymentsMax: '',

        repaymentEvery: 1,
        repaymentFrequencyType: 2, // Months

        amortizationType: 1,
        interestType: 0,
        interestCalculationPeriodType: 1,
        allowPartialPeriodInterestCalculation: false,
        inArrearsTolerance: '',
        multiDisbursement: false,
        maxOutstandingLoanBalance: '',
        maxTrancheCount: '',
        syncExpectedWithDisbursementDate: false,
        recurringMoratoriumOnPrincipalPeriods: '',
        graceOnArrearsAgeing: '',
        overdueDaysForNPA: '',
        minimumDaysBetweenDisbursalAndFirstRepayment: '',
        principalThresholdForLastInstallment: '',
        installmentAmountInMultiplesOf: '',
        canUseForTopup: false,
        accountMovesOutOfNPAOnlyOnArrearsCompletion: false,
        allowVariableInstallments: false,
        minimumGapBetweenInstallments: '',
        maximumGapBetweenInstallments: '',
        holdGuaranteeFunds: false,
        mandatoryGuarantee: '',
        minimumGuaranteeFromGuarantor: '',
        minimumGuaranteeFromOwnFunds: '',
        delinquencyBucketId: '',
        dueDaysForRepaymentEvent: '',
        overDueDaysForRepaymentEvent: '',
        enableInstallmentLevelDelinquency: false,
        allowAttributeOverrides: {},
        graceOnPrincipalPayment: '',
        graceOnInterestPayment: '',
        graceOnInterestCharged: '',

        daysInMonthType: 30,
        daysInYearType: 365,

        // Strategy / Charges / Accounting
        transactionProcessingStrategyId: '',
        paymentAllocation: '',
        creditAllocation: '',

        // Advanced allocation (only for advanced strategy)
        fixedLength: '',
        fixedPrincipalPercentagePerInstallment: '',

        chargeIds: [],

        accountingRule: 1, // 1=None, 2=Cash, 3=Accrual Periodic

        // GL mappings (required if accountingRule !== 1)
        fundSourceAccountId: '',
        loanPortfolioAccountId: '',
        interestOnLoanAccountId: '',
        incomeFromFeeAccountId: '',
        incomeFromPenaltyAccountId: '',
        incomeFromRecoveryAccountId: '',
        writeOffAccountId: '',
        overpaymentLiabilityAccountId: '',
        transfersInSuspenseAccountId: '',

        // Accrual Periodic
        receivableInterestAccountId: '',
        receivableFeeAccountId: '',
        receivablePenaltyAccountId: '',

        // Feature toggles & dependent fields
        // Down payment
        enableDownPayment: false,
        disbursedAmountPercentageForDownPayment: '',
        enableAutoRepaymentForDownPayment: false,

        // Capitalized income
        enableIncomeCapitalization: false,
        capitalizedIncomeCalculationType: 'FLAT',
        capitalizedIncomeStrategy: 'EQUAL_AMORTIZATION',
        capitalizedIncomeType: 'FEE',
        incomeFromCapitalizationAccountId: '',

        // Buy-down fee
        enableBuyDownFee: false,
        buyDownFeeCalculationType: 'FLAT',
        buyDownFeeStrategy: 'EQUAL_AMORTIZATION',
        buyDownFeeIncomeType: 'FEE',
        incomeFromBuyDownAccountId: '',

        // Loan schedule
        loanScheduleType: 'CUMULATIVE',
        loanScheduleProcessingType: 'HORIZONTAL',

        // Interest Recalculation
        isInterestRecalculationEnabled: false,
        interestRecalculationCompoundingMethod: 0,       // enum id
        rescheduleStrategyMethod: 1,                     // enum id
        preClosureInterestCalculationStrategy: 1,        // enum id
        recalculationCompoundingFrequencyType: 1,        // enum id
        recalculationCompoundingFrequencyInterval: 1,    // number
        recalculationRestFrequencyType: 1,               // enum id
        recalculationRestFrequencyInterval: 1,           // number
        disallowInterestCalculationOnPastDue: false,
        allowCompoundingOnEod: false,
        isCompoundingToBePostedAsTransaction: false,

    });

    const [errors, setErrors] = useState({});

    // ---------- Load template ----------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setTemplateError('');
            setCapabilities({
                incomeCapitalization: false,
                buyDownFee: false,
            });
            try {
                const res = await api.get('/loanproducts/template');
                const templateData = res?.data || {};
                let accountingMappingOptions = normalizeAccountingOptions(templateData.accountingMappingOptions);

                if (!hasAccountingOptions(accountingMappingOptions)) {
                    try {
                        const glRes = await api.get('/glaccounts');
                        const glAccounts = Array.isArray(glRes?.data) ? glRes.data : glRes?.data?.pageItems || [];
                        const fallbackOptions = buildAccountingOptionsFromGlAccounts(glAccounts);
                        if (hasAccountingOptions(fallbackOptions)) {
                            accountingMappingOptions = fallbackOptions;
                        }
                    } catch {
                        accountingMappingOptions = normalizeAccountingOptions(templateData.accountingMappingOptions);
                    }
                }

                if (!cancelled && res?.data) {
                    const hasTemplateProperty = (name) =>
                        Object.prototype.hasOwnProperty.call(templateData, name);
                    setCapabilities({
                        incomeCapitalization:
                            hasTemplateProperty('capitalizedIncomeCalculationTypeOptions') ||
                            hasTemplateProperty('capitalizedIncomeStrategyOptions') ||
                            hasTemplateProperty('capitalizedIncomeTypeOptions') ||
                            hasTemplateProperty('enableIncomeCapitalization') ||
                            Boolean(initial?.enableIncomeCapitalization),
                        buyDownFee:
                            hasTemplateProperty('buyDownFeeCalculationTypeOptions') ||
                            hasTemplateProperty('buyDownFeeStrategyOptions') ||
                            hasTemplateProperty('buyDownFeeIncomeTypeOptions') ||
                            hasTemplateProperty('enableBuyDownFee') ||
                            Boolean(initial?.enableBuyDownFee),
                    });
                    setTpl({
                        currencyOptions: templateData.currencyOptions || FALLBACK_TEMPLATE.currencyOptions,
                        fundOptions: templateData.fundOptions || FALLBACK_TEMPLATE.fundOptions,
                        amortizationTypeOptions: templateData.amortizationTypeOptions || FALLBACK_TEMPLATE.amortizationTypeOptions,
                        interestTypeOptions: templateData.interestTypeOptions || FALLBACK_TEMPLATE.interestTypeOptions,
                        interestCalculationPeriodTypeOptions: templateData.interestCalculationPeriodTypeOptions || FALLBACK_TEMPLATE.interestCalculationPeriodTypeOptions,
                        repaymentFrequencyTypeOptions: templateData.repaymentFrequencyTypeOptions || FALLBACK_TEMPLATE.repaymentFrequencyTypeOptions,
                        interestRateFrequencyTypeOptions: templateData.interestRateFrequencyTypeOptions || FALLBACK_TEMPLATE.interestRateFrequencyTypeOptions,
                        daysInMonthTypeOptions: templateData.daysInMonthTypeOptions || FALLBACK_TEMPLATE.daysInMonthTypeOptions,
                        daysInYearTypeOptions: templateData.daysInYearTypeOptions || FALLBACK_TEMPLATE.daysInYearTypeOptions,
                        accountingRuleOptions: templateData.accountingRuleOptions || FALLBACK_TEMPLATE.accountingRuleOptions,
                        transactionProcessingStrategyOptions: templateData.transactionProcessingStrategyOptions || FALLBACK_TEMPLATE.transactionProcessingStrategyOptions,
                        chargeOptions: templateData.chargeOptions || [],
                        accountingMappingOptions,

                        // New option sets
                        loanScheduleTypeOptions: templateData.loanScheduleTypeOptions || FALLBACK_TEMPLATE.loanScheduleTypeOptions,
                        loanScheduleProcessingTypeOptions: templateData.loanScheduleProcessingTypeOptions || FALLBACK_TEMPLATE.loanScheduleProcessingTypeOptions,
                        capitalizedIncomeCalculationTypeOptions: templateData.capitalizedIncomeCalculationTypeOptions || FALLBACK_TEMPLATE.capitalizedIncomeCalculationTypeOptions,
                        capitalizedIncomeStrategyOptions: templateData.capitalizedIncomeStrategyOptions || FALLBACK_TEMPLATE.capitalizedIncomeStrategyOptions,
                        capitalizedIncomeTypeOptions: templateData.capitalizedIncomeTypeOptions || FALLBACK_TEMPLATE.capitalizedIncomeTypeOptions,
                        buyDownFeeCalculationTypeOptions: templateData.buyDownFeeCalculationTypeOptions || FALLBACK_TEMPLATE.buyDownFeeCalculationTypeOptions,
                        buyDownFeeStrategyOptions: templateData.buyDownFeeStrategyOptions || FALLBACK_TEMPLATE.buyDownFeeStrategyOptions,
                        buyDownFeeIncomeTypeOptions: templateData.buyDownFeeIncomeTypeOptions || FALLBACK_TEMPLATE.buyDownFeeIncomeTypeOptions,

                        // Recalc sets
                        interestRecalculationCompoundingTypeOptions:
                            templateData.interestRecalculationCompoundingTypeOptions ||
                            FALLBACK_TEMPLATE.interestRecalculationCompoundingTypeOptions,
                        interestRecalculationFrequencyTypeOptions:
                            templateData.interestRecalculationFrequencyTypeOptions ||
                            FALLBACK_TEMPLATE.interestRecalculationFrequencyTypeOptions,
                        rescheduleStrategyTypeOptions:
                            templateData.rescheduleStrategyTypeOptions ||
                            FALLBACK_TEMPLATE.rescheduleStrategyTypeOptions,
                        preClosureInterestCalculationStrategyOptions:
                            templateData.preClosureInterestCalculationStrategyOptions ||
                            FALLBACK_TEMPLATE.preClosureInterestCalculationStrategyOptions,
                    });

                    // Default strategy if available and not in edit mode
                    if (!initial) {
                        const firstStrat = templateData.transactionProcessingStrategyOptions?.find(
                            (strategy) => strategy?.code !== 'advanced-payment-allocation-strategy'
                        );
                        if (firstStrat?.code) {
                            setForm((f) => ({
                                ...f,
                                transactionProcessingStrategyId: firstStrat.code,
                            }));
                        }
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    setTemplateError(
                        error?.response?.data?.defaultUserMessage ||
                        error?.response?.data?.message ||
                        'Unable to load the Fineract loan-product template. Product configuration is disabled to prevent invalid options.'
                    );
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

        const arrToIds = (arr) =>
            Array.isArray(arr) ? arr.map((c) => String(c.id ?? c.chargeId ?? c)) : [];

        const toId = (x) => (x && (x.id || x.accountId)) || '';

        setForm((f) => ({
            ...f,
            name: initial.name || '',
            shortName: initial.shortName || '',
            description: initial.description || '',
            fundId: initial.fundId ?? initial.fund?.id ?? '',
            currencyCode: initial.currency?.code || initial.currencyCode || f.currencyCode,
            digitsAfterDecimal:
                initial.currency?.decimalPlaces ?? initial.digitsAfterDecimal ?? f.digitsAfterDecimal,
            inMultiplesOf: initial.currency?.inMultiplesOf ?? initial.inMultiplesOf ?? '',
            includeInBorrowerCycle: Boolean(initial.includeInBorrowerCycle),
            externalId: initial.externalId ?? '',
            startDate: toISO(initial.startDate),
            closeDate: toISO(initial.closeDate),

            principalMin: initial.principal?.minimum ?? initial.minPrincipal ?? '',
            principalDefault:
                initial.principal?.default ?? initial.principal ?? initial.principalAmount ?? '',
            principalMax: initial.principal?.maximum ?? initial.maxPrincipal ?? '',

            rateMin: initial.interestRatePerPeriod?.minimum ?? initial.minInterestRatePerPeriod ?? '',
            rateDefault:
                initial.interestRatePerPeriod?.default ??
                initial.interestRatePerPeriod ??
                initial.interestRate ??
                '',
            rateMax: initial.interestRatePerPeriod?.maximum ?? initial.maxInterestRatePerPeriod ?? '',

            interestRateFrequencyType:
                initial.interestRateFrequencyType?.id ??
                initial.interestRateFrequencyType ??
                f.interestRateFrequencyType,

            numRepaymentsMin: initial.numberOfRepayments?.minimum ?? initial.minNumberOfRepayments ?? '',
            numRepaymentsDefault: initial.numberOfRepayments?.default ?? initial.numberOfRepayments ?? '',
            numRepaymentsMax: initial.numberOfRepayments?.maximum ?? initial.maxNumberOfRepayments ?? '',

            repaymentEvery: initial.repaymentEvery ?? 1,
            repaymentFrequencyType:
                initial.repaymentFrequencyType?.id ?? initial.repaymentFrequencyType ?? 2,

            amortizationType: initial.amortizationType?.id ?? initial.amortizationType ?? 1,
            interestType: initial.interestType?.id ?? initial.interestType ?? 0,
            interestCalculationPeriodType:
                initial.interestCalculationPeriodType?.id ??
                initial.interestCalculationPeriodType ??
                1,
            allowPartialPeriodInterestCalculation: Boolean(
                initial.allowPartialPeriodInterestCalculation ?? initial.allowPartialPeriodInterestCalcualtion
            ),
            inArrearsTolerance: initial.inArrearsTolerance ?? '',
            multiDisbursement: Boolean(initial.multiDisburseLoan ?? initial.multiDisbursement),
            maxOutstandingLoanBalance: initial.maxOutstandingLoanBalance ?? '',
            maxTrancheCount: initial.maxTrancheCount ?? '',
            syncExpectedWithDisbursementDate: Boolean(initial.syncExpectedWithDisbursementDate),
            recurringMoratoriumOnPrincipalPeriods: initial.recurringMoratoriumOnPrincipalPeriods ?? '',
            graceOnArrearsAgeing: initial.graceOnArrearsAgeing ?? '',
            overdueDaysForNPA: initial.overdueDaysForNPA ?? '',
            minimumDaysBetweenDisbursalAndFirstRepayment:
                initial.minimumDaysBetweenDisbursalAndFirstRepayment ?? '',
            principalThresholdForLastInstallment: initial.principalThresholdForLastInstallment ?? '',
            installmentAmountInMultiplesOf: initial.installmentAmountInMultiplesOf ?? '',
            canUseForTopup: Boolean(initial.canUseForTopup),
            accountMovesOutOfNPAOnlyOnArrearsCompletion:
                Boolean(initial.accountMovesOutOfNPAOnlyOnArrearsCompletion),
            allowVariableInstallments: Boolean(initial.allowVariableInstallments),
            minimumGapBetweenInstallments: initial.minimumGapBetweenInstallments ?? '',
            maximumGapBetweenInstallments: initial.maximumGapBetweenInstallments ?? '',
            holdGuaranteeFunds: Boolean(initial.holdGuaranteeFunds),
            mandatoryGuarantee: initial.mandatoryGuarantee ?? '',
            minimumGuaranteeFromGuarantor: initial.minimumGuaranteeFromGuarantor ?? '',
            minimumGuaranteeFromOwnFunds: initial.minimumGuaranteeFromOwnFunds ?? '',
            delinquencyBucketId: initial.delinquencyBucket?.id ?? initial.delinquencyBucketId ?? '',
            dueDaysForRepaymentEvent: initial.dueDaysForRepaymentEvent ?? '',
            overDueDaysForRepaymentEvent: initial.overDueDaysForRepaymentEvent ?? '',
            enableInstallmentLevelDelinquency: Boolean(initial.enableInstallmentLevelDelinquency),
            allowAttributeOverrides: normalizeAttributeOverrides(initial.allowAttributeOverrides),
            graceOnPrincipalPayment: initial.graceOnPrincipalPayment ?? '',
            graceOnInterestPayment: initial.graceOnInterestPayment ?? '',
            graceOnInterestCharged: initial.graceOnInterestCharged ?? '',

            daysInMonthType: initial.daysInMonthType?.id ?? initial.daysInMonthType ?? 30,
            daysInYearType: initial.daysInYearType?.id ?? initial.daysInYearType ?? 365,

            // strategies
            transactionProcessingStrategyId:
                initial.transactionProcessingStrategyCode ||
                initial.transactionProcessingStrategy?.code ||
                initial.transactionProcessingStrategyId ||
                f.transactionProcessingStrategyId,
            paymentAllocation: stringifyStructuredValue(initial.paymentAllocation),
            creditAllocation: stringifyStructuredValue(initial.creditAllocation),

            // advanced allocation (if present)
            fixedLength: initial.fixedLength ?? '',
            fixedPrincipalPercentagePerInstallment:
                initial.fixedPrincipalPercentagePerInstallment ?? '',

            chargeIds: arrToIds(initial.charges),

            // accounting
            accountingRule: initial.accountingRule?.id ?? initial.accountingRule ?? 1,

            fundSourceAccountId: toId(initial.fundSourceAccount) || initial.fundSourceAccountId || '',
            loanPortfolioAccountId:
                toId(initial.loanPortfolioAccount) || initial.loanPortfolioAccountId || '',
            interestOnLoanAccountId:
                toId(initial.interestOnLoanAccount) || initial.interestOnLoanAccountId || '',
            incomeFromFeeAccountId:
                toId(initial.incomeFromFeeAccount) || initial.incomeFromFeeAccountId || '',
            incomeFromPenaltyAccountId:
                toId(initial.incomeFromPenaltyAccount) || initial.incomeFromPenaltyAccountId || '',
            incomeFromRecoveryAccountId:
                toId(initial.incomeFromRecoveryAccount) || initial.incomeFromRecoveryAccountId || '',
            writeOffAccountId: toId(initial.writeOffAccount) || initial.writeOffAccountId || '',
            overpaymentLiabilityAccountId:
                toId(initial.overpaymentLiabilityAccount) || initial.overpaymentLiabilityAccountId || '',
            transfersInSuspenseAccountId:
                toId(initial.transfersInSuspenseAccount) || initial.transfersInSuspenseAccountId || '',

            receivableInterestAccountId:
                toId(initial.receivableInterestAccount) || initial.receivableInterestAccountId || '',
            receivableFeeAccountId:
                toId(initial.receivableFeeAccount) || initial.receivableFeeAccountId || '',
            receivablePenaltyAccountId:
                toId(initial.receivablePenaltyAccount) || initial.receivablePenaltyAccountId || '',

            // toggles + dependent fields
            enableDownPayment: Boolean(initial.enableDownPayment),
            disbursedAmountPercentageForDownPayment:
                initial.disbursedAmountPercentageForDownPayment ?? '',
            enableAutoRepaymentForDownPayment: Boolean(initial.enableAutoRepaymentForDownPayment),

            enableIncomeCapitalization: Boolean(initial.enableIncomeCapitalization),
            capitalizedIncomeCalculationType:
                initial.capitalizedIncomeCalculationType || f.capitalizedIncomeCalculationType,
            capitalizedIncomeStrategy:
                initial.capitalizedIncomeStrategy || f.capitalizedIncomeStrategy,
            capitalizedIncomeType: initial.capitalizedIncomeType || f.capitalizedIncomeType,
            incomeFromCapitalizationAccountId:
                initial.incomeFromCapitalizationAccountId || '',

            enableBuyDownFee: Boolean(initial.enableBuyDownFee),
            buyDownFeeCalculationType: initial.buyDownFeeCalculationType || f.buyDownFeeCalculationType,
            buyDownFeeStrategy: initial.buyDownFeeStrategy || f.buyDownFeeStrategy,
            buyDownFeeIncomeType: initial.buyDownFeeIncomeType || f.buyDownFeeIncomeType,
            incomeFromBuyDownAccountId: initial.incomeFromBuyDownAccountId || '',

            loanScheduleType: normalizeEnumToken(initial.loanScheduleType, f.loanScheduleType),
            loanScheduleProcessingType:
                normalizeEnumToken(initial.loanScheduleProcessingType, f.loanScheduleProcessingType),

            // Interest Recalculation
            isInterestRecalculationEnabled: Boolean(initial.isInterestRecalculationEnabled),
            interestRecalculationCompoundingMethod: initial.interestRecalculationCompoundingMethod ?? 0,
            rescheduleStrategyMethod: initial.rescheduleStrategyMethod ?? 1,
            preClosureInterestCalculationStrategy: initial.preClosureInterestCalculationStrategy ?? 1,
            recalculationCompoundingFrequencyType: initial.recalculationCompoundingFrequencyType ?? 1,
            recalculationCompoundingFrequencyInterval: initial.recalculationCompoundingFrequencyInterval ?? 1,
            recalculationRestFrequencyType: initial.recalculationRestFrequencyType ?? 1,
            recalculationRestFrequencyInterval: initial.recalculationRestFrequencyInterval ?? 1,
            disallowInterestCalculationOnPastDue: Boolean(initial.disallowInterestCalculationOnPastDue),
            allowCompoundingOnEod: Boolean(initial.allowCompoundingOnEod),
            isCompoundingToBePostedAsTransaction: Boolean(initial.isCompoundingToBePostedAsTransaction),
        }));
    }, [initial]);

    const setField = (k, v) => {
        setForm((s) => ({ ...s, [k]: v }));
        setErrors((e) => ({ ...e, [k]: '' }));
    };

    const isAccountingEnabled = Number(form.accountingRule) !== 1;
    const isAccrual = Number(form.accountingRule) === 3;
    const isAdvancedAlloc = form.transactionProcessingStrategyId === 'advanced-payment-allocation-strategy';
    const accountingOptions = normalizeAccountingOptions(tpl.accountingMappingOptions);
    const missingAccountingOptionTypes = [
        ['assetAccountOptions', 'asset'],
        ['incomeAccountOptions', 'income'],
        ['expenseAccountOptions', 'expense'],
        ['liabilityAccountOptions', 'liability'],
    ]
        .filter(([key]) => accountingOptions[key].length === 0)
        .map(([, label]) => label);

    // ---------- Validation ----------
    const validate = () => {
        const e = {};
        if (templateError) e.template = templateError;
        if (!form.name) e.name = 'Name is required';
        if (!form.shortName) e.shortName = 'Short name is required';
        if (!form.currencyCode) e.currencyCode = 'Currency is required';

        if (form.principalDefault === '' || Number(form.principalDefault) <= 0) {
            e.principalDefault = 'Default principal is required';
        }
        if (form.numRepaymentsDefault === '' || Number(form.numRepaymentsDefault) <= 0) {
            e.numRepaymentsDefault = '# of repayments is required';
        }
        if (form.rateDefault === '' || Number(form.rateDefault) < 0 || !hasValidNumber(form.rateDefault)) {
            e.rateDefault = 'Default interest rate is required';
        }
        if (form.rateMin !== '' && (!hasValidNumber(form.rateMin) || Number(form.rateMin) < 0)) {
            e.rateMin = 'Minimum interest rate must be 0 or more';
        }
        if (form.rateMax !== '' && (!hasValidNumber(form.rateMax) || Number(form.rateMax) < 0)) {
            e.rateMax = 'Maximum interest rate must be 0 or more';
        }
        if (
            hasValidNumber(form.rateMin) &&
            hasValidNumber(form.rateDefault) &&
            Number(form.rateMin) > Number(form.rateDefault)
        ) {
            e.rateMin = 'Minimum rate cannot exceed default rate';
        }
        if (
            hasValidNumber(form.rateMax) &&
            hasValidNumber(form.rateDefault) &&
            Number(form.rateDefault) > Number(form.rateMax)
        ) {
            e.rateMax = 'Maximum rate cannot be below default rate';
        }
        if (!form.repaymentEvery || Number(form.repaymentEvery) <= 0) {
            e.repaymentEvery = 'Repayment every is required';
        }
        if (!hasValidNumber(form.interestRateFrequencyType)) {
            e.interestRateFrequencyType = 'Rate frequency is required';
        }
        if (!hasValidNumber(form.repaymentFrequencyType)) {
            e.repaymentFrequencyType = 'Repayment frequency is required';
        }
        if (!hasValidNumber(form.amortizationType)) {
            e.amortizationType = 'Amortization is required';
        }
        if (!hasValidNumber(form.interestType)) {
            e.interestType = 'Interest type is required';
        }
        if (!hasValidNumber(form.interestCalculationPeriodType)) {
            e.interestCalculationPeriodType = 'Interest calculation period is required';
        }
        if (!hasValidNumber(form.daysInMonthType)) {
            e.daysInMonthType = 'Days in month type is required';
        }
        if (!hasValidNumber(form.daysInYearType)) {
            e.daysInYearType = 'Days in year type is required';
        }
        if (!form.transactionProcessingStrategyId) {
            e.transactionProcessingStrategyId = 'Processing strategy is required';
        }

        if (isAdvancedAlloc) {
            try {
                const allocation = parseJsonValue(form.paymentAllocation, 'Payment allocation');
                if (!Array.isArray(allocation) || allocation.length === 0) {
                    e.paymentAllocation =
                        'This advanced product has no payment allocation rules. Configure it directly in Fineract before editing it here.';
                }
            } catch (error) {
                e.paymentAllocation = error.message;
            }
        }

        if (form.multiDisbursement) {
            if (!hasValidNumber(form.maxOutstandingLoanBalance) || Number(form.maxOutstandingLoanBalance) <= 0) {
                e.maxOutstandingLoanBalance = 'Maximum outstanding balance is required';
            }
            if (!hasValidNumber(form.maxTrancheCount) || Number(form.maxTrancheCount) <= 0) {
                e.maxTrancheCount = 'Maximum tranche count is required';
            }
        }

        if (
            form.allowVariableInstallments &&
            hasValidNumber(form.minimumGapBetweenInstallments) &&
            hasValidNumber(form.maximumGapBetweenInstallments) &&
            Number(form.minimumGapBetweenInstallments) > Number(form.maximumGapBetweenInstallments)
        ) {
            e.maximumGapBetweenInstallments = 'Maximum gap must be greater than or equal to minimum gap';
        }

        if (form.enableDownPayment) {
            if (
                form.disbursedAmountPercentageForDownPayment === '' ||
                Number(form.disbursedAmountPercentageForDownPayment) < 0
            ) {
                e.disbursedAmountPercentageForDownPayment = 'Percent is required';
            }
        }

        if (capabilities.incomeCapitalization && form.enableIncomeCapitalization && isAccountingEnabled) {
            if (!form.incomeFromCapitalizationAccountId) {
                e.incomeFromCapitalizationAccountId = 'Required (Accounting enabled)';
            }
        }

        if (capabilities.buyDownFee && form.enableBuyDownFee && isAccountingEnabled) {
            if (!form.incomeFromBuyDownAccountId) {
                e.incomeFromBuyDownAccountId = 'Required (Accounting enabled)';
            }
        }

        if (isAccountingEnabled) {
            if (missingAccountingOptionTypes.length > 0) {
                e.accountingOptions =
                    `Fineract did not provide valid ${missingAccountingOptionTypes.join(', ')} GL account options`;
            }
            const checkAccountingAccount = (field, label, expectedType, options) => {
                const value = form[field];
                if (!value) {
                    e[field] = 'Required';
                    return;
                }
                const selected = findAccountingOption(options, value);
                if (!selected) {
                    e[field] = label + ' must be an active ' + expectedType + ' GL account';
                    return;
                }
                if (isDisabledAccountingOption(selected)) {
                    e[field] = label + ' is disabled';
                }
            };

            [
                ['fundSourceAccountId', 'Fund Source', 'asset', accountingOptions.assetAccountOptions],
                ['loanPortfolioAccountId', 'Loan Portfolio', 'asset', accountingOptions.assetAccountOptions],
                ['interestOnLoanAccountId', 'Interest on Loan', 'income', accountingOptions.incomeAccountOptions],
                ['incomeFromFeeAccountId', 'Income from Fees', 'income', accountingOptions.incomeAccountOptions],
                ['incomeFromPenaltyAccountId', 'Income from Penalties', 'income', accountingOptions.incomeAccountOptions],
                ['incomeFromRecoveryAccountId', 'Income from Recovery', 'income', accountingOptions.incomeAccountOptions],
                ['writeOffAccountId', 'Write-off', 'expense', accountingOptions.expenseAccountOptions],
                ['overpaymentLiabilityAccountId', 'Overpayment Liability', 'liability', accountingOptions.liabilityAccountOptions],
                ['transfersInSuspenseAccountId', 'Transfers in Suspense', 'asset', accountingOptions.assetAccountOptions],
            ].forEach(([field, label, expectedType, options]) => {
                checkAccountingAccount(field, label, expectedType, options);
            });

            if (isAccrual) {
                [
                    ['receivableInterestAccountId', 'Receivable Interest', 'asset', accountingOptions.assetAccountOptions],
                    ['receivableFeeAccountId', 'Receivable Fees', 'asset', accountingOptions.assetAccountOptions],
                    ['receivablePenaltyAccountId', 'Receivable Penalties', 'asset', accountingOptions.assetAccountOptions],
                ].forEach(([field, label, expectedType, options]) => {
                    checkAccountingAccount(field, label, expectedType, options);
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
            description: stringOrUndefined(form.description),
            fundId: numberOrUndefined(form.fundId),
            currencyCode: form.currencyCode,
            digitsAfterDecimal: numberOrUndefined(form.digitsAfterDecimal),
            inMultiplesOf: numberOrUndefined(form.inMultiplesOf),
            includeInBorrowerCycle: Boolean(form.includeInBorrowerCycle),
            externalId: stringOrUndefined(form.externalId),
            startDate: stringOrUndefined(form.startDate),
            closeDate: stringOrUndefined(form.closeDate),

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
            allowPartialPeriodInterestCalculation: Boolean(form.allowPartialPeriodInterestCalculation),
            inArrearsTolerance: numberOrUndefined(form.inArrearsTolerance),
            graceOnPrincipalPayment: numberOrUndefined(form.graceOnPrincipalPayment),
            graceOnInterestPayment: numberOrUndefined(form.graceOnInterestPayment),
            graceOnInterestCharged: numberOrUndefined(form.graceOnInterestCharged),
            recurringMoratoriumOnPrincipalPeriods:
                numberOrUndefined(form.recurringMoratoriumOnPrincipalPeriods),
            syncExpectedWithDisbursementDate: Boolean(form.syncExpectedWithDisbursementDate),
            graceOnArrearsAgeing: numberOrUndefined(form.graceOnArrearsAgeing),
            overdueDaysForNPA: numberOrUndefined(form.overdueDaysForNPA),
            minimumDaysBetweenDisbursalAndFirstRepayment:
                numberOrUndefined(form.minimumDaysBetweenDisbursalAndFirstRepayment),
            principalThresholdForLastInstallment:
                numberOrUndefined(form.principalThresholdForLastInstallment),
            installmentAmountInMultiplesOf: numberOrUndefined(form.installmentAmountInMultiplesOf),
            canUseForTopup: Boolean(form.canUseForTopup),
            accountMovesOutOfNPAOnlyOnArrearsCompletion:
                Boolean(form.accountMovesOutOfNPAOnlyOnArrearsCompletion),
            allowVariableInstallments: Boolean(form.allowVariableInstallments),
            minimumGapBetweenInstallments:
                form.allowVariableInstallments
                    ? numberOrUndefined(form.minimumGapBetweenInstallments)
                    : undefined,
            maximumGapBetweenInstallments:
                form.allowVariableInstallments
                    ? numberOrUndefined(form.maximumGapBetweenInstallments)
                    : undefined,
            holdGuaranteeFunds: Boolean(form.holdGuaranteeFunds),
            mandatoryGuarantee: numberOrUndefined(form.mandatoryGuarantee),
            minimumGuaranteeFromGuarantor: numberOrUndefined(form.minimumGuaranteeFromGuarantor),
            minimumGuaranteeFromOwnFunds: numberOrUndefined(form.minimumGuaranteeFromOwnFunds),
            delinquencyBucketId: numberOrUndefined(form.delinquencyBucketId),
            dueDaysForRepaymentEvent: numberOrUndefined(form.dueDaysForRepaymentEvent),
            overDueDaysForRepaymentEvent: numberOrUndefined(form.overDueDaysForRepaymentEvent),
            enableInstallmentLevelDelinquency: Boolean(form.enableInstallmentLevelDelinquency),
            allowAttributeOverrides: Object.fromEntries(
                ATTRIBUTE_OVERRIDE_OPTIONS.map(({ key }) => [
                    key,
                    Boolean(form.allowAttributeOverrides?.[key]),
                ])
            ),

            daysInMonthType: Number(form.daysInMonthType),
            daysInYearType: Number(form.daysInYearType),

            // strategy by code
            transactionProcessingStrategyCode: form.transactionProcessingStrategyId || undefined,
            paymentAllocation: isAdvancedAlloc
                ? parseJsonValue(form.paymentAllocation, 'Payment allocation')
                : undefined,
            creditAllocation: isAdvancedAlloc
                ? parseJsonValue(form.creditAllocation, 'Credit allocation')
                : undefined,

            // loan schedule
            loanScheduleType: normalizeEnumToken(form.loanScheduleType),
            loanScheduleProcessingType: normalizeEnumToken(form.loanScheduleProcessingType),

            charges: (form.chargeIds || []).map((id) => ({ id: Number(id) })),

            accountingRule: Number(form.accountingRule),

            locale: 'en',
        };

        if (payload.startDate || payload.closeDate) {
            payload.dateFormat = 'yyyy-MM-dd';
        }

        payload.multiDisburseLoan = Boolean(form.multiDisbursement);
        if (form.multiDisbursement) {
            payload.maxOutstandingLoanBalance = numberOrUndefined(form.maxOutstandingLoanBalance);
            payload.maxTrancheCount = numberOrUndefined(form.maxTrancheCount);
        }

        if (!payload.loanScheduleType) {
            delete payload.loanScheduleType;
        }
        if (!payload.loanScheduleProcessingType) {
            delete payload.loanScheduleProcessingType;
        }

        // --- ALWAYS include this flag (fix) ---
        payload.isInterestRecalculationEnabled = Boolean(form.isInterestRecalculationEnabled);

        // Include recalculation details only when enabled (independent of accounting)
        if (form.isInterestRecalculationEnabled) {
            payload.interestRecalculationCompoundingMethod = Number(form.interestRecalculationCompoundingMethod);
            payload.rescheduleStrategyMethod = Number(form.rescheduleStrategyMethod);
            payload.preClosureInterestCalculationStrategy = Number(form.preClosureInterestCalculationStrategy);

            payload.recalculationCompoundingFrequencyType = Number(form.recalculationCompoundingFrequencyType);
            payload.recalculationCompoundingFrequencyInterval = numberOrUndefined(form.recalculationCompoundingFrequencyInterval);

            payload.recalculationRestFrequencyType = Number(form.recalculationRestFrequencyType);
            payload.recalculationRestFrequencyInterval = numberOrUndefined(form.recalculationRestFrequencyInterval);

            payload.disallowInterestCalculationOnPastDue = Boolean(form.disallowInterestCalculationOnPastDue);
            payload.allowCompoundingOnEod = Boolean(form.allowCompoundingOnEod);
            payload.isCompoundingToBePostedAsTransaction = Boolean(form.isCompoundingToBePostedAsTransaction);
        }

        if (isAdvancedAlloc && hasValidNumber(form.fixedLength)) {
            payload.fixedLength = numberOrUndefined(form.fixedLength);
        }
        if (isAdvancedAlloc && hasValidNumber(form.fixedPrincipalPercentagePerInstallment)) {
            payload.fixedPrincipalPercentagePerInstallment =
                numberOrUndefined(form.fixedPrincipalPercentagePerInstallment);
        }

        // Down payment
        if (form.enableDownPayment) {
            payload.enableDownPayment = true;
            payload.disbursedAmountPercentageForDownPayment =
                numberOrUndefined(form.disbursedAmountPercentageForDownPayment);
            payload.enableAutoRepaymentForDownPayment = Boolean(
                form.enableAutoRepaymentForDownPayment
            );
        } else {
            payload.enableDownPayment = false;
        }

        // These fields are version-dependent and are only sent when the template advertises support.
        if (capabilities.incomeCapitalization) {
            if (form.enableIncomeCapitalization) {
                payload.enableIncomeCapitalization = true;
                payload.capitalizedIncomeCalculationType = form.capitalizedIncomeCalculationType;
                payload.capitalizedIncomeStrategy = form.capitalizedIncomeStrategy;
                payload.capitalizedIncomeType = form.capitalizedIncomeType;
                if (isAccountingEnabled && form.incomeFromCapitalizationAccountId) {
                    payload.incomeFromCapitalizationAccountId = Number(
                        form.incomeFromCapitalizationAccountId
                    );
                }
            } else {
                payload.enableIncomeCapitalization = false;
            }
        }

        if (capabilities.buyDownFee) {
            if (form.enableBuyDownFee) {
                payload.enableBuyDownFee = true;
                payload.buyDownFeeCalculationType = form.buyDownFeeCalculationType;
                payload.buyDownFeeStrategy = form.buyDownFeeStrategy;
                payload.buyDownFeeIncomeType = form.buyDownFeeIncomeType;
                if (isAccountingEnabled && form.incomeFromBuyDownAccountId) {
                    payload.incomeFromBuyDownAccountId = Number(form.incomeFromBuyDownAccountId);
                }
            } else {
                payload.enableBuyDownFee = false;
            }
        }

        // Accounting mappings (only when accounting enabled)
        if (isAccountingEnabled) {
            payload.fundSourceAccountId = Number(form.fundSourceAccountId);
            payload.loanPortfolioAccountId = Number(form.loanPortfolioAccountId);
            payload.interestOnLoanAccountId = Number(form.interestOnLoanAccountId);
            payload.incomeFromFeeAccountId = Number(form.incomeFromFeeAccountId);
            payload.incomeFromPenaltyAccountId = Number(form.incomeFromPenaltyAccountId);
            payload.incomeFromRecoveryAccountId = Number(form.incomeFromRecoveryAccountId);
            payload.writeOffAccountId = Number(form.writeOffAccountId);
            payload.overpaymentLiabilityAccountId = Number(form.overpaymentLiabilityAccountId);
            payload.transfersInSuspenseAccountId = Number(form.transfersInSuspenseAccountId);

            if (isAccrual) {
                payload.receivableInterestAccountId = Number(form.receivableInterestAccountId);
                payload.receivableFeeAccountId = Number(form.receivableFeeAccountId);
                payload.receivablePenaltyAccountId = Number(form.receivablePenaltyAccountId);
            }
        }

        Object.keys(payload).forEach((key) => {
            if (payload[key] === undefined) delete payload[key];
        });
        return payload;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        try {
            const payload = buildPayload();
            await onSubmit(payload);
        } catch (error) {
            addToast(error?.message || 'Invalid product configuration', 'error');
        }
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
        fundOptions,
        chargeOptions,
        accountingMappingOptions,

        // new sets
        loanScheduleTypeOptions,
        loanScheduleProcessingTypeOptions,
        capitalizedIncomeCalculationTypeOptions,
        capitalizedIncomeStrategyOptions,
        capitalizedIncomeTypeOptions,
        buyDownFeeCalculationTypeOptions,
        buyDownFeeStrategyOptions,
        buyDownFeeIncomeTypeOptions,
    } = tpl;

    const assets = accountingMappingOptions?.assetAccountOptions || [];
    const income = accountingMappingOptions?.incomeAccountOptions || [];
    const expenses = accountingMappingOptions?.expenseAccountOptions || [];
    const liability = accountingMappingOptions?.liabilityAccountOptions || [];
    const fundSelectOptions = (Array.isArray(fundOptions) ? fundOptions : [])
        .map((fund) => {
            const id = optionIdOrValue(fund);
            if (id === null || id === undefined || id === '') return null;
            return {
                id: String(id),
                label: [fund.name || fund.value || `Fund #${id}`, fund.externalId].filter(Boolean).join(' - '),
            };
        })
        .filter(Boolean);
    const processingStrategyChoices = (transactionProcessingStrategyOptions || []).filter((strategy) => {
        const code = strategy?.code ?? strategy?.id ?? strategy?.value;
        return code !== 'advanced-payment-allocation-strategy' || isAdvancedAlloc;
    });
    const acctOptionLabel = (a) =>
        `${a.glCode || a.code || ''} ${a.name ? `— ${a.name}` : ''}`.trim();

    if (loading) {
        return (
            <Card>
                <Skeleton height="14rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {templateError ? (
                <div
                    role="alert"
                    className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
                >
                    <div className="font-semibold">Loan product configuration unavailable</div>
                    <div className="mt-1">{templateError}</div>
                </div>
            ) : null}

            {/* Basics */}
            <Card>
                <SectionTitle icon="📄" hint="Core details">
                    Basics
                </SectionTitle>
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
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Description</label>
                        <textarea
                            rows="3"
                            value={form.description}
                            onChange={(e) => setField('description', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">External ID</label>
                        <input value={form.externalId} onChange={(e) => setField('externalId', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Currency Multiples</label>
                        <input type="number" min="0" value={form.inMultiplesOf}
                            onChange={(e) => setField('inMultiplesOf', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Available From</label>
                        <input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Available Until</label>
                        <input type="date" value={form.closeDate} onChange={(e) => setField('closeDate', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={form.includeInBorrowerCycle}
                            onChange={(e) => setField('includeInBorrowerCycle', e.target.checked)} />
                        <span className="text-sm">Include in borrower cycle</span>
                    </label>
                    <div>
                        {fundOptions?.length ? (
                            <SearchableSelectField
                                label="Fund"
                                value={form.fundId}
                                onChange={(value) => setField('fundId', String(value || ''))}
                                options={fundSelectOptions}
                                placeholder="Search fund"
                            />
                        ) : (
                            <input
                                type="number"
                                min="1"
                                value={form.fundId}
                                onChange={(e) => setField('fundId', e.target.value)}
                                placeholder="Fund ID"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        )}
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
                <SectionTitle icon="💰">Principal</SectionTitle>
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
                <SectionTitle icon="📈">Interest Rate</SectionTitle>
                <div className="grid md:grid-cols-5 gap-4">
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
                        {errors.rateMin && <p className="text-xs text-red-500 mt-1">{errors.rateMin}</p>}
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
                        {errors.rateDefault && <p className="text-xs text-red-500 mt-1">{errors.rateDefault}</p>}
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
                        {errors.rateMax && <p className="text-xs text-red-500 mt-1">{errors.rateMax}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Rate Frequency</label>
                        <select
                            value={form.interestRateFrequencyType}
                            onChange={(e) => setField('interestRateFrequencyType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {(interestRateFrequencyTypeOptions || []).map((o) => (
                                <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                        {errors.interestRateFrequencyType && (
                            <p className="text-xs text-red-500 mt-1">{errors.interestRateFrequencyType}</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Repayments */}
            <Card>
                <SectionTitle icon="🗓️">Repayments</SectionTitle>
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
                        {errors.numRepaymentsDefault && (
                            <p className="text-xs text-red-500 mt-1">{errors.numRepaymentsDefault}</p>
                        )}
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
                        {errors.repaymentEvery && (
                            <p className="text-xs text-red-500 mt-1">{errors.repaymentEvery}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Frequency *</label>
                        <select
                            value={form.repaymentFrequencyType}
                            onChange={(e) => setField('repaymentFrequencyType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {repaymentFrequencyTypeOptions.map((o) => (
                                <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                        {errors.repaymentFrequencyType && (
                            <p className="text-xs text-red-500 mt-1">{errors.repaymentFrequencyType}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Amortization *</label>
                        <select
                            value={form.amortizationType}
                            onChange={(e) => setField('amortizationType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {amortizationTypeOptions.map((o) => (
                                <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                        {errors.amortizationType && (
                            <p className="text-xs text-red-500 mt-1">{errors.amortizationType}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Interest Type *</label>
                        <select
                            value={form.interestType}
                            onChange={(e) => setField('interestType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {interestTypeOptions.map((o) => (
                                <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                        {errors.interestType && (
                            <p className="text-xs text-red-500 mt-1">{errors.interestType}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Interest Calc Period *</label>
                        <select
                            value={form.interestCalculationPeriodType}
                            onChange={(e) => setField('interestCalculationPeriodType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {interestCalculationPeriodTypeOptions.map((o) => (
                                <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                    {o.value || o.name}
                                </option>
                            ))}
                        </select>
                        {errors.interestCalculationPeriodType && (
                            <p className="text-xs text-red-500 mt-1">{errors.interestCalculationPeriodType}</p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">In Arrears Tolerance</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.inArrearsTolerance}
                            onChange={(e) => setField('inArrearsTolerance', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.allowPartialPeriodInterestCalculation}
                                onChange={(e) => setField('allowPartialPeriodInterestCalculation', e.target.checked)}
                            />
                            <span className="text-sm">Allow Partial Period Interest Calculation</span>
                        </label>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">Grace on Principal Payment</label>
                        <input
                            type="number"
                            min="0"
                            value={form.graceOnPrincipalPayment}
                            onChange={(e) => setField('graceOnPrincipalPayment', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Grace on Interest Payment</label>
                        <input
                            type="number"
                            min="0"
                            value={form.graceOnInterestPayment}
                            onChange={(e) => setField('graceOnInterestPayment', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Grace on Interest Charged</label>
                        <input
                            type="number"
                            min="0"
                            value={form.graceOnInterestCharged}
                            onChange={(e) => setField('graceOnInterestCharged', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.multiDisbursement}
                            onChange={(e) => setField('multiDisbursement', e.target.checked)}
                        />
                        <span className="text-sm">Enable Multi-Disbursement</span>
                    </label>
                </div>
                {form.multiDisbursement ? (
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium">Maximum Outstanding Balance *</label>
                            <input type="number" min="0" step="0.01" value={form.maxOutstandingLoanBalance}
                                onChange={(e) => setField('maxOutstandingLoanBalance', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                            {errors.maxOutstandingLoanBalance ? <p className="text-xs text-red-500 mt-1">{errors.maxOutstandingLoanBalance}</p> : null}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Maximum Tranche Count *</label>
                            <input type="number" min="1" value={form.maxTrancheCount}
                                onChange={(e) => setField('maxTrancheCount', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                            {errors.maxTrancheCount ? <p className="text-xs text-red-500 mt-1">{errors.maxTrancheCount}</p> : null}
                        </div>
                    </div>
                ) : null}
                <div className="mt-4">
                    <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={form.syncExpectedWithDisbursementDate}
                            onChange={(e) => setField('syncExpectedWithDisbursementDate', e.target.checked)} />
                        <span className="text-sm">Synchronize expected first repayment with disbursement date</span>
                    </label>
                </div>

                {/* Loan Schedule */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium">Loan Schedule Type</label>
                        <select
                            value={form.loanScheduleType}
                            onChange={(e) => setField('loanScheduleType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {(loanScheduleTypeOptions || []).map((o) => (
                                <option key={optionCodeOrValue(o)} value={optionCodeOrValue(o)}>
                                    {o.value || o.code}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Schedule Processing</label>
                        <select
                            value={form.loanScheduleProcessingType}
                            onChange={(e) => setField('loanScheduleProcessingType', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {(loanScheduleProcessingTypeOptions || []).map((o) => (
                                <option key={optionCodeOrValue(o)} value={optionCodeOrValue(o)}>
                                    {o.value || o.code}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Interest Recalculation */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Interest Recalculation</div>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isInterestRecalculationEnabled}
                            onChange={(e) => setField('isInterestRecalculationEnabled', e.target.checked)}
                        />
                        <span>Enable</span>
                    </label>
                </div>

                {form.isInterestRecalculationEnabled && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Compounding Method</label>
                            <select
                                value={form.interestRecalculationCompoundingMethod}
                                onChange={(e) => setField('interestRecalculationCompoundingMethod', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {(tpl.interestRecalculationCompoundingTypeOptions || []).map((o) => (
                                    <option key={o.id} value={o.id}>{o.value}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Reschedule Strategy</label>
                            <select
                                value={form.rescheduleStrategyMethod}
                                onChange={(e) => setField('rescheduleStrategyMethod', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {(tpl.rescheduleStrategyTypeOptions || []).map((o) => (
                                    <option key={o.id} value={o.id}>{o.value}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Pre-Closure Interest Strategy</label>
                            <select
                                value={form.preClosureInterestCalculationStrategy}
                                onChange={(e) => setField('preClosureInterestCalculationStrategy', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {(tpl.preClosureInterestCalculationStrategyOptions || []).map((o) => (
                                    <option key={o.id} value={o.id}>{o.value}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Compounding Freq. Type</label>
                                <select
                                    value={form.recalculationCompoundingFrequencyType}
                                    onChange={(e) => setField('recalculationCompoundingFrequencyType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(tpl.interestRecalculationFrequencyTypeOptions || []).map((o) => (
                                        <option key={o.id} value={o.id}>{o.value}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Compounding Interval</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.recalculationCompoundingFrequencyInterval}
                                    onChange={(e) => setField('recalculationCompoundingFrequencyInterval', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Rest Freq. Type</label>
                                <select
                                    value={form.recalculationRestFrequencyType}
                                    onChange={(e) => setField('recalculationRestFrequencyType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(tpl.interestRecalculationFrequencyTypeOptions || []).map((o) => (
                                        <option key={o.id} value={o.id}>{o.value}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Rest Interval</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.recalculationRestFrequencyInterval}
                                    onChange={(e) => setField('recalculationRestFrequencyInterval', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 pt-2">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.disallowInterestCalculationOnPastDue}
                                    onChange={(e) => setField('disallowInterestCalculationOnPastDue', e.target.checked)}
                                />
                                <span className="text-sm">Disallow interest on past due</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.allowCompoundingOnEod}
                                    onChange={(e) => setField('allowCompoundingOnEod', e.target.checked)}
                                />
                                <span className="text-sm">Allow compounding on EOD</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isCompoundingToBePostedAsTransaction}
                                    onChange={(e) => setField('isCompoundingToBePostedAsTransaction', e.target.checked)}
                                />
                                <span className="text-sm">Post compounding as transaction</span>
                            </label>
                        </div>
                    </div>
                )}
            </Card>

            {/* Processing Strategy & Charges */}
            <Card>
                <SectionTitle icon="⚙️" hint="Affects allocation & special fields">
                    Processing Strategy & Charges
                </SectionTitle>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Transaction Processing Strategy *</label>
                        <select
                            value={form.transactionProcessingStrategyId}
                            onChange={(e) => setField('transactionProcessingStrategyId', e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select strategy</option>
                            {processingStrategyChoices.map((s) => (
                                <option key={s.code} value={s.code}>
                                    {s.name || s.code}
                                </option>
                            ))}
                        </select>
                        {errors.transactionProcessingStrategyId && (
                            <p className="text-xs text-red-500 mt-1">{errors.transactionProcessingStrategyId}</p>
                        )}
                        {!isAdvancedAlloc ? (
                            <p className="mt-1 text-xs text-gray-500">
                                Advanced payment allocation is configured directly in Fineract because it requires ordered transaction rules.
                            </p>
                        ) : null}
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

                {/* Advanced allocation panel (conditional) */}
                {isAdvancedAlloc && (
                    <div className="mt-4 rounded-md border p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                        <div className="text-sm font-medium mb-2">Advanced Payment Allocation Product</div>
                        <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                            Existing allocation rules are retained when this product is saved. Edit the ordered payment
                            and credit allocation rules directly in Fineract.
                        </p>
                        {errors.paymentAllocation ? (
                            <p className="mb-3 text-xs text-red-500">{errors.paymentAllocation}</p>
                        ) : null}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Fixed Length</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.fixedLength}
                                    onChange={(e) => setField('fixedLength', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.fixedLength && <p className="text-xs text-red-500 mt-1">{errors.fixedLength}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fixed Principal % / Installment</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.fixedPrincipalPercentagePerInstallment}
                                    onChange={(e) => setField('fixedPrincipalPercentagePerInstallment', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.fixedPrincipalPercentagePerInstallment && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errors.fixedPrincipalPercentagePerInstallment}
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            These fields are only valid with the <code>advanced-payment-allocation-strategy</code>.
                        </p>
                    </div>
                )}
            </Card>

            {/* Feature Toggles */}
            <Card>
                <SectionTitle icon="🧩">Optional Features</SectionTitle>

                {/* Down Payment */}
                <div className="rounded-md border p-4 mb-4 dark:border-gray-700">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.enableDownPayment}
                            onChange={(e) => setField('enableDownPayment', e.target.checked)}
                        />
                        <span className="text-sm font-medium">Enable Down Payment</span>
                    </label>

                    {form.enableDownPayment && (
                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-sm font-medium">% of Disbursed Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.disbursedAmountPercentageForDownPayment}
                                    onChange={(e) => setField('disbursedAmountPercentageForDownPayment', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.disbursedAmountPercentageForDownPayment && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {errors.disbursedAmountPercentageForDownPayment}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-end">
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.enableAutoRepaymentForDownPayment}
                                        onChange={(e) => setField('enableAutoRepaymentForDownPayment', e.target.checked)}
                                    />
                                    <span className="text-sm">Auto-repay Down Payment</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Income Capitalization */}
                {capabilities.incomeCapitalization ? (
                    <div className="rounded-md border p-4 mb-4 dark:border-gray-700">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.enableIncomeCapitalization}
                            onChange={(e) => setField('enableIncomeCapitalization', e.target.checked)}
                        />
                        <span className="text-sm font-medium">Enable Income Capitalization</span>
                    </label>

                    {form.enableIncomeCapitalization && (
                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-sm font-medium">Calculation</label>
                                <select
                                    value={form.capitalizedIncomeCalculationType}
                                    onChange={(e) => setField('capitalizedIncomeCalculationType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(capitalizedIncomeCalculationTypeOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Strategy</label>
                                <select
                                    value={form.capitalizedIncomeStrategy}
                                    onChange={(e) => setField('capitalizedIncomeStrategy', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(capitalizedIncomeStrategyOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Type</label>
                                <select
                                    value={form.capitalizedIncomeType}
                                    onChange={(e) => setField('capitalizedIncomeType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(capitalizedIncomeTypeOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {isAccountingEnabled && (
                                <div>
                                    <label className="block text-sm font-medium">Income from Capitalization (Income) *</label>
                                    <select
                                        value={form.incomeFromCapitalizationAccountId}
                                        onChange={(e) => setField('incomeFromCapitalizationAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.incomeFromCapitalizationAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.incomeFromCapitalizationAccountId}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                ) : null}

                {/* Buy-Down Fee */}
                {capabilities.buyDownFee ? (
                    <div className="rounded-md border p-4 dark:border-gray-700">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.enableBuyDownFee}
                            onChange={(e) => setField('enableBuyDownFee', e.target.checked)}
                        />
                        <span className="text-sm font-medium">Enable Buy-Down Fee</span>
                    </label>

                    {form.enableBuyDownFee && (
                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-sm font-medium">Calculation</label>
                                <select
                                    value={form.buyDownFeeCalculationType}
                                    onChange={(e) => setField('buyDownFeeCalculationType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(buyDownFeeCalculationTypeOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Strategy</label>
                                <select
                                    value={form.buyDownFeeStrategy}
                                    onChange={(e) => setField('buyDownFeeStrategy', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(buyDownFeeStrategyOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Income Type</label>
                                <select
                                    value={form.buyDownFeeIncomeType}
                                    onChange={(e) => setField('buyDownFeeIncomeType', e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {(buyDownFeeIncomeTypeOptions || []).map((o) => (
                                        <option key={optionIdOrValue(o)} value={optionIdOrValue(o)}>
                                            {o.value || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {isAccountingEnabled && (
                                <div>
                                    <label className="block text-sm font-medium">Income from Buy-Down (Income) *</label>
                                    <select
                                        value={form.incomeFromBuyDownAccountId}
                                        onChange={(e) => setField('incomeFromBuyDownAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.incomeFromBuyDownAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.incomeFromBuyDownAccountId}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                ) : null}
            </Card>

            <Card>
                <SectionTitle icon="⚙">Fineract Risk & Lifecycle Configuration</SectionTitle>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        ['Recurring Principal Moratorium', 'recurringMoratoriumOnPrincipalPeriods'],
                        ['Grace on Arrears Ageing', 'graceOnArrearsAgeing'],
                        ['Overdue Days for NPA', 'overdueDaysForNPA'],
                        ['Minimum Days: Disbursal to First Repayment', 'minimumDaysBetweenDisbursalAndFirstRepayment'],
                        ['Principal Threshold for Last Installment', 'principalThresholdForLastInstallment'],
                        ['Installment Amount Multiples', 'installmentAmountInMultiplesOf'],
                        ['Mandatory Guarantee (%)', 'mandatoryGuarantee'],
                        ['Minimum Guarantor Guarantee (%)', 'minimumGuaranteeFromGuarantor'],
                        ['Minimum Own Funds Guarantee (%)', 'minimumGuaranteeFromOwnFunds'],
                        ['Delinquency Bucket ID', 'delinquencyBucketId'],
                        ['Due Days for Repayment Event', 'dueDaysForRepaymentEvent'],
                        ['Overdue Days for Repayment Event', 'overDueDaysForRepaymentEvent'],
                    ].map(([label, field]) => (
                        <div key={field}>
                            <label className="block text-sm font-medium">{label}</label>
                            <input type="number" min="0" step="0.01" value={form[field]}
                                onChange={(e) => setField(field, e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-4">
                    {[
                        ['canUseForTopup', 'Can be used for top-up loans'],
                        ['accountMovesOutOfNPAOnlyOnArrearsCompletion', 'Move account out of NPA only after arrears completion'],
                        ['holdGuaranteeFunds', 'Hold guarantee funds'],
                        ['enableInstallmentLevelDelinquency', 'Enable installment-level delinquency'],
                        ['allowVariableInstallments', 'Allow variable installments'],
                    ].map(([field, label]) => (
                        <label key={field} className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={Boolean(form[field])}
                                onChange={(e) => setField(field, e.target.checked)} />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>

                {form.allowVariableInstallments ? (
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium">Minimum Gap Between Installments</label>
                            <input type="number" min="0" value={form.minimumGapBetweenInstallments}
                                onChange={(e) => setField('minimumGapBetweenInstallments', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Maximum Gap Between Installments</label>
                            <input type="number" min="0" value={form.maximumGapBetweenInstallments}
                                onChange={(e) => setField('maximumGapBetweenInstallments', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                            {errors.maximumGapBetweenInstallments ? <p className="text-xs text-red-500 mt-1">{errors.maximumGapBetweenInstallments}</p> : null}
                        </div>
                    </div>
                ) : null}

                <div className="mt-5 rounded-md border p-4 dark:border-gray-700">
                    <div className="font-medium">Loan-level Overrides</div>
                    <p className="mt-1 text-xs text-gray-500">
                        Select which product settings staff may change when creating an individual loan.
                    </p>
                    <div className="mt-4 grid md:grid-cols-2 gap-3">
                        {ATTRIBUTE_OVERRIDE_OPTIONS.map(({ key, label, hint }) => (
                            <label key={key} className="flex items-start gap-3 rounded-md border p-3 dark:border-gray-700">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={Boolean(form.allowAttributeOverrides?.[key])}
                                    onChange={(event) => {
                                        const checked = event.target.checked;
                                        setForm((current) => ({
                                            ...current,
                                            allowAttributeOverrides: {
                                                ...current.allowAttributeOverrides,
                                                [key]: checked,
                                            },
                                        }));
                                    }}
                                />
                                <span>
                                    <span className="block text-sm font-medium">{label}</span>
                                    <span className="block text-xs text-gray-500">{hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Accounting */}
            <Card>
                <SectionTitle icon="📚" hint="Shown only when accounting ≠ None">Accounting</SectionTitle>
                {errors.accountingOptions ? (
                    <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
                        {errors.accountingOptions}. Correct the GL account types in Fineract before saving this product.
                    </div>
                ) : null}
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
                                    <label className="block text-sm font-medium">Income from Recovery (Income) *</label>
                                    <select
                                        value={form.incomeFromRecoveryAccountId}
                                        onChange={(e) => setField('incomeFromRecoveryAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {income.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.incomeFromRecoveryAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.incomeFromRecoveryAccountId}</p>
                                    )}
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
                                    {errors.overpaymentLiabilityAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.overpaymentLiabilityAccountId}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Transfers in Suspense (Asset) *</label>
                                    <select
                                        value={form.transfersInSuspenseAccountId}
                                        onChange={(e) => setField('transfersInSuspenseAccountId', e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select</option>
                                        {assets.map((a) => (
                                            <option key={a.id} value={a.id}>{acctOptionLabel(a)}</option>
                                        ))}
                                    </select>
                                    {errors.transfersInSuspenseAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.transfersInSuspenseAccountId}</p>
                                    )}
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
                                        {errors.receivableInterestAccountId && (
                                            <p className="text-xs text-red-500 mt-1">{errors.receivableInterestAccountId}</p>
                                        )}
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
                                        {errors.receivableFeeAccountId && (
                                            <p className="text-xs text-red-500 mt-1">{errors.receivableFeeAccountId}</p>
                                        )}
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
                                        {errors.receivablePenaltyAccountId && (
                                            <p className="text-xs text-red-500 mt-1">{errors.receivablePenaltyAccountId}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting || Boolean(templateError)}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Product'}
                </Button>
            </div>
        </form>
    );
};

export default LoanProductForm;
