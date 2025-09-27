import React, { useEffect, useState } from 'react';
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

        interestRateFrequencyType: 2, // Months default

        numRepaymentsMin: '',
        numRepaymentsDefault: '',
        numRepaymentsMax: '',

        repaymentEvery: 1,
        repaymentFrequencyType: 2, // Months

        amortizationType: 1,
        interestType: 0,
        interestCalculationPeriodType: 1,

        daysInMonthType: 30,
        daysInYearType: 365,

        // Strategy / Charges / Accounting
        transactionProcessingStrategyId: '',

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
        writeOffAccountId: '',
        overpaymentLiabilityAccountId: '',

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
            try {
                const res = await api.get('/loanproducts/template');
                if (!cancelled && res?.data) {
                    setTpl({
                        currencyOptions: res.data.currencyOptions || FALLBACK_TEMPLATE.currencyOptions,
                        amortizationTypeOptions: res.data.amortizationTypeOptions || FALLBACK_TEMPLATE.amortizationTypeOptions,
                        interestTypeOptions: res.data.interestTypeOptions || FALLBACK_TEMPLATE.interestTypeOptions,
                        interestCalculationPeriodTypeOptions: res.data.interestCalculationPeriodTypeOptions || FALLBACK_TEMPLATE.interestCalculationPeriodTypeOptions,
                        repaymentFrequencyTypeOptions: res.data.repaymentFrequencyTypeOptions || FALLBACK_TEMPLATE.repaymentFrequencyTypeOptions,
                        interestRateFrequencyTypeOptions: res.data.interestRateFrequencyTypeOptions || FALLBACK_TEMPLATE.interestRateFrequencyTypeOptions,
                        daysInMonthTypeOptions: res.data.daysInMonthTypeOptions || FALLBACK_TEMPLATE.daysInMonthTypeOptions,
                        daysInYearTypeOptions: res.data.daysInYearTypeOptions || FALLBACK_TEMPLATE.daysInYearTypeOptions,
                        accountingRuleOptions: res.data.accountingRuleOptions || FALLBACK_TEMPLATE.accountingRuleOptions,
                        transactionProcessingStrategyOptions: res.data.transactionProcessingStrategyOptions || FALLBACK_TEMPLATE.transactionProcessingStrategyOptions,
                        chargeOptions: res.data.chargeOptions || [],
                        accountingMappingOptions: res.data.accountingMappingOptions || FALLBACK_TEMPLATE.accountingMappingOptions,

                        // New option sets
                        loanScheduleTypeOptions: res.data.loanScheduleTypeOptions || FALLBACK_TEMPLATE.loanScheduleTypeOptions,
                        loanScheduleProcessingTypeOptions: res.data.loanScheduleProcessingTypeOptions || FALLBACK_TEMPLATE.loanScheduleProcessingTypeOptions,
                        capitalizedIncomeCalculationTypeOptions: res.data.capitalizedIncomeCalculationTypeOptions || FALLBACK_TEMPLATE.capitalizedIncomeCalculationTypeOptions,
                        capitalizedIncomeStrategyOptions: res.data.capitalizedIncomeStrategyOptions || FALLBACK_TEMPLATE.capitalizedIncomeStrategyOptions,
                        capitalizedIncomeTypeOptions: res.data.capitalizedIncomeTypeOptions || FALLBACK_TEMPLATE.capitalizedIncomeTypeOptions,
                        buyDownFeeCalculationTypeOptions: res.data.buyDownFeeCalculationTypeOptions || FALLBACK_TEMPLATE.buyDownFeeCalculationTypeOptions,
                        buyDownFeeStrategyOptions: res.data.buyDownFeeStrategyOptions || FALLBACK_TEMPLATE.buyDownFeeStrategyOptions,
                        buyDownFeeIncomeTypeOptions: res.data.buyDownFeeIncomeTypeOptions || FALLBACK_TEMPLATE.buyDownFeeIncomeTypeOptions,

                        // Recalc sets
                        interestRecalculationCompoundingTypeOptions:
                            res.data.interestRecalculationCompoundingTypeOptions ||
                            FALLBACK_TEMPLATE.interestRecalculationCompoundingTypeOptions,
                        interestRecalculationFrequencyTypeOptions:
                            res.data.interestRecalculationFrequencyTypeOptions ||
                            FALLBACK_TEMPLATE.interestRecalculationFrequencyTypeOptions,
                        rescheduleStrategyTypeOptions:
                            res.data.rescheduleStrategyTypeOptions ||
                            FALLBACK_TEMPLATE.rescheduleStrategyTypeOptions,
                        preClosureInterestCalculationStrategyOptions:
                            res.data.preClosureInterestCalculationStrategyOptions ||
                            FALLBACK_TEMPLATE.preClosureInterestCalculationStrategyOptions,
                    });

                    // Default strategy if available and not in edit mode
                    if (!initial) {
                        const firstStrat = res.data.transactionProcessingStrategyOptions?.[0];
                        if (firstStrat?.code) {
                            setForm((f) => ({
                                ...f,
                                transactionProcessingStrategyId: firstStrat.code,
                            }));
                        }
                    }
                }
            } catch {
                if (!initial) {
                    const firstStrat = FALLBACK_TEMPLATE.transactionProcessingStrategyOptions[0];
                    if (firstStrat?.code) {
                        setForm((f) => ({ ...f, transactionProcessingStrategyId: firstStrat.code }));
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

        const arrToIds = (arr) =>
            Array.isArray(arr) ? arr.map((c) => String(c.id ?? c.chargeId ?? c)) : [];

        const toId = (x) => (x && (x.id || x.accountId)) || '';

        setForm((f) => ({
            ...f,
            name: initial.name || '',
            shortName: initial.shortName || '',
            currencyCode: initial.currency?.code || initial.currencyCode || f.currencyCode,
            digitsAfterDecimal:
                initial.currency?.decimalPlaces ?? initial.digitsAfterDecimal ?? f.digitsAfterDecimal,

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

            daysInMonthType: initial.daysInMonthType?.id ?? initial.daysInMonthType ?? 30,
            daysInYearType: initial.daysInYearType?.id ?? initial.daysInYearType ?? 365,

            // strategies
            transactionProcessingStrategyId:
                initial.transactionProcessingStrategyCode ||
                initial.transactionProcessingStrategy?.code ||
                initial.transactionProcessingStrategyId ||
                f.transactionProcessingStrategyId,

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
            writeOffAccountId: toId(initial.writeOffAccount) || initial.writeOffAccountId || '',
            overpaymentLiabilityAccountId:
                toId(initial.overpaymentLiabilityAccount) || initial.overpaymentLiabilityAccountId || '',

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

            loanScheduleType: initial.loanScheduleType || f.loanScheduleType,
            loanScheduleProcessingType:
                initial.loanScheduleProcessingType || f.loanScheduleProcessingType,

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

        if (isAdvancedAlloc) {
            if (form.fixedLength === '') e.fixedLength = 'Required';
            if (form.fixedPrincipalPercentagePerInstallment === '')
                e.fixedPrincipalPercentagePerInstallment = 'Required';
        }

        if (form.enableDownPayment) {
            if (
                form.disbursedAmountPercentageForDownPayment === '' ||
                Number(form.disbursedAmountPercentageForDownPayment) < 0
            ) {
                e.disbursedAmountPercentageForDownPayment = 'Percent is required';
            }
        }

        if (form.enableIncomeCapitalization && isAccountingEnabled) {
            if (!form.incomeFromCapitalizationAccountId) {
                e.incomeFromCapitalizationAccountId = 'Required (Accounting enabled)';
            }
        }

        if (form.enableBuyDownFee && isAccountingEnabled) {
            if (!form.incomeFromBuyDownAccountId) {
                e.incomeFromBuyDownAccountId = 'Required (Accounting enabled)';
            }
        }

        if (isAccountingEnabled) {
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

            // strategy by code
            transactionProcessingStrategyCode: form.transactionProcessingStrategyId || undefined,

            // loan schedule
            loanScheduleType: form.loanScheduleType,
            loanScheduleProcessingType: form.loanScheduleProcessingType,

            charges: (form.chargeIds || []).map((id) => ({ id: Number(id) })),

            accountingRule: Number(form.accountingRule),

            locale: 'en',
        };

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

        // Advanced Payment Allocation exclusive fields
        if (isAdvancedAlloc) {
            payload.fixedLength = numberOrUndefined(form.fixedLength);
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

        // Capitalized income
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

        // Buy-down fee
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

        // Accounting mappings (only when accounting enabled)
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
                                <option key={o.code || o.value} value={o.code || o.value}>
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
                                <option key={o.code || o.value} value={o.code || o.value}>
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
                            {transactionProcessingStrategyOptions.map((s) => (
                                <option key={s.code} value={s.code}>
                                    {s.name || s.code}
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

                {/* Advanced allocation panel (conditional) */}
                {isAdvancedAlloc && (
                    <div className="mt-4 rounded-md border p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                        <div className="text-sm font-medium mb-2">Advanced Payment Allocation</div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Fixed Length *</label>
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
                                <label className="block text-sm font-medium">Fixed Principal % / Installment *</label>
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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

                {/* Buy-Down Fee */}
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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
                                        <option key={o.id || o.value} value={o.id || o.value}>
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
            </Card>

            {/* Accounting */}
            <Card>
                <SectionTitle icon="📚" hint="Shown only when accounting ≠ None">Accounting</SectionTitle>
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
                                    {errors.overpaymentLiabilityAccountId && (
                                        <p className="text-xs text-red-500 mt-1">{errors.overpaymentLiabilityAccountId}</p>
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
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Product'}
                </Button>
            </div>
        </form>
    );
};

export default LoanProductForm;
