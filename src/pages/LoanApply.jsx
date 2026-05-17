import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, Coins, Download, Settings2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import ScheduleTable from '../components/ScheduleTable';
import MiniCombobox from '../components/MiniCombobox';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useToast } from '../context/ToastContext';

const LOCALE = 'en';
const DATE_FORMAT = 'yyyy-MM-dd';
const todayISO = () => new Date().toISOString().slice(0, 10);

const FALLBACK_OPTIONS = {
    repaymentFrequencyTypeOptions: [
        { id: 1, value: 'Weeks' },
        { id: 2, value: 'Months' },
    ],
    interestRateFrequencyTypeOptions: [
        { id: 1, value: 'Per Year' },
        { id: 2, value: 'Per Month' },
    ],
    amortizationTypeOptions: [
        { id: 1, value: 'Equal Installments' },
        { id: 2, value: 'Equal Principal Payments' },
    ],
    interestTypeOptions: [
        { id: 0, value: 'Declining Balance' },
        { id: 1, value: 'Flat' },
    ],
    interestCalculationPeriodTypeOptions: [
        { id: 1, value: 'Same as Repayment Period' },
        { id: 2, value: 'Daily' },
    ],
    transactionProcessingStrategyOptions: [
        { code: 'mifos-standard-strategy', name: 'Mifos Standard' },
    ],
};

const toItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.pageItems)) return payload.pageItems;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
};

const numberOr = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const stringOr = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
};

const formatAmount = (value, currencyCode) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    const rendered = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numeric);
    return currencyCode ? `${rendered} ${currencyCode}` : rendered;
};

const productOptionLabel = (product) => {
    const name = product?.name || product?.productName || `Product #${product?.id}`;
    const currency = product?.currency?.code || product?.currencyCode || '';
    return `${name}${currency ? ` - ${currency}` : ''}`;
};

const personLabel = (item, fallbackPrefix) => {
    return (
        item?.displayName ||
        [item?.firstname, item?.middlename, item?.lastname].filter(Boolean).join(' ') ||
        item?.name ||
        `${fallbackPrefix} #${item?.id}`
    );
};

const metricClass =
    'rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/50';

const sectionTitleClass =
    'mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';

const LoanApply = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [catalogs, setCatalogs] = useState({
        clients: [],
        products: [],
        staff: [],
        funds: [],
        loanPurposes: [],
        template: FALLBACK_OPTIONS,
    });

    const [productDetails, setProductDetails] = useState(null);
    const [productLoading, setProductLoading] = useState(false);
    const [loanTemplate, setLoanTemplate] = useState(null);
    const [clientAccounts, setClientAccounts] = useState(null);

    const [form, setForm] = useState({
        clientId: '',
        productId: '',
        principal: '',
        externalId: '',
        loanPurposeId: '',
        fundId: '',
        loanOfficerId: '',
        loanType: 'individual',
        submittedOnDate: todayISO(),
        expectedDisbursementDate: todayISO(),
        repaymentsStartingFromDate: todayISO(),
        numberOfRepayments: '',
        repaymentEvery: '1',
        repaymentFrequencyType: '2',
        interestRatePerPeriod: '',
        interestRateFrequencyType: '2',
        amortizationType: '1',
        interestType: '0',
        interestCalculationPeriodType: '1',
        transactionProcessingStrategyCode: 'mifos-standard-strategy',
        loanScheduleProcessingType: 'HORIZONTAL',
        graceOnPrincipalPayment: '0',
        graceOnInterestPayment: '0',
        graceOnInterestCharged: '0',
        inArrearsTolerance: '0',
    });

    const [calcLoading, setCalcLoading] = useState(false);
    const [calcError, setCalcError] = useState('');
    const [schedule, setSchedule] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [clientsRes, productsRes, staffRes, fundsRes, templateRes, purposesRes] = await Promise.all([
                    api.get('/clients', { params: { limit: 200, orderBy: 'displayName', sortOrder: 'asc' } }),
                    api.get('/loanproducts', { params: { limit: 200, orderBy: 'name', sortOrder: 'asc' } }),
                    api.get('/staff').catch(() => ({ data: [] })),
                    api.get('/funds').catch(() => ({ data: [] })),
                    api.get('/loanproducts/template').catch(() => ({ data: FALLBACK_OPTIONS })),
                    api.get('/codes/3').catch(() => ({ data: { codeValues: [] } })),
                ]);

                if (cancelled) return;

                setCatalogs({
                    clients: toItems(clientsRes.data),
                    products: toItems(productsRes.data),
                    staff: toItems(staffRes.data),
                    funds: toItems(fundsRes.data),
                    loanPurposes: toItems(purposesRes.data?.codeValues || purposesRes.data?.values || []),
                    template: {
                        ...FALLBACK_OPTIONS,
                        ...(templateRes.data || {}),
                    },
                });
            } catch {
                if (cancelled) return;
                setCatalogs({
                    clients: [],
                    products: [],
                    staff: [],
                    funds: [],
                    loanPurposes: [],
                    template: FALLBACK_OPTIONS,
                });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!form.clientId) {
            setClientAccounts(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/clients/${form.clientId}/accounts`);
                if (!cancelled) setClientAccounts(res.data || null);
            } catch {
                if (!cancelled) setClientAccounts(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [form.clientId]);

    useEffect(() => {
        if (!form.productId) {
            setProductDetails(null);
            return;
        }
        let cancelled = false;
        (async () => {
            setProductLoading(true);
            try {
                const res = await api.get(`/loanproducts/${form.productId}`, {
                    params: { associations: 'charges' },
                });
                if (!cancelled) setProductDetails(res.data || null);
            } catch {
                if (!cancelled) setProductDetails(null);
            } finally {
                if (!cancelled) setProductLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [form.productId]);

    useEffect(() => {
        if (!form.clientId || !form.productId) {
            setLoanTemplate(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/loans/template', {
                    params: {
                        clientId: form.clientId,
                        productId: form.productId,
                        templateType: form.loanType,
                    },
                });
                if (!cancelled) setLoanTemplate(res.data || null);
            } catch {
                if (!cancelled) setLoanTemplate(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [form.clientId, form.productId, form.loanType]);

    useEffect(() => {
        if (!form.productId || !productDetails) return;

        const product = productDetails || {};
        const template = loanTemplate || {};
        const submittedOn = form.submittedOnDate || todayISO();

        setForm((current) => ({
            ...current,
            principal: stringOr(
                template?.principal?.default ??
                template?.principal ??
                product?.principal?.default ??
                product?.principal ??
                current.principal
            ),
            fundId: stringOr(
                template?.fundId ??
                product?.fundId ??
                product?.fund?.id ??
                current.fundId
            ),
            numberOfRepayments: stringOr(
                template?.numberOfRepayments?.default ??
                template?.numberOfRepayments ??
                product?.numberOfRepayments?.default ??
                product?.numberOfRepayments ??
                current.numberOfRepayments
            ),
            repaymentEvery: stringOr(
                template?.repaymentEvery ??
                product?.repaymentEvery ??
                current.repaymentEvery ??
                '1'
            ),
            repaymentFrequencyType: stringOr(
                template?.repaymentFrequencyType?.id ??
                template?.repaymentFrequencyType ??
                product?.repaymentFrequencyType?.id ??
                product?.repaymentFrequencyType ??
                current.repaymentFrequencyType ??
                '2'
            ),
            interestRatePerPeriod: stringOr(
                template?.interestRatePerPeriod ??
                product?.interestRatePerPeriod?.default ??
                product?.interestRatePerPeriod ??
                product?.interestRate ??
                current.interestRatePerPeriod
            ),
            interestRateFrequencyType: stringOr(
                template?.interestRateFrequencyType?.id ??
                template?.interestRateFrequencyType ??
                product?.interestRateFrequencyType?.id ??
                product?.interestRateFrequencyType ??
                current.interestRateFrequencyType ??
                '2'
            ),
            amortizationType: stringOr(
                template?.amortizationType?.id ??
                template?.amortizationType ??
                product?.amortizationType?.id ??
                product?.amortizationType ??
                current.amortizationType ??
                '1'
            ),
            interestType: stringOr(
                template?.interestType?.id ??
                template?.interestType ??
                product?.interestType?.id ??
                product?.interestType ??
                current.interestType ??
                '0'
            ),
            interestCalculationPeriodType: stringOr(
                template?.interestCalculationPeriodType?.id ??
                template?.interestCalculationPeriodType ??
                product?.interestCalculationPeriodType?.id ??
                product?.interestCalculationPeriodType ??
                current.interestCalculationPeriodType ??
                '1'
            ),
            transactionProcessingStrategyCode: stringOr(
                template?.transactionProcessingStrategyCode ??
                product?.transactionProcessingStrategyCode ??
                product?.transactionProcessingStrategy?.code ??
                current.transactionProcessingStrategyCode ??
                'mifos-standard-strategy'
            ),
            loanScheduleProcessingType: stringOr(
                product?.loanScheduleProcessingType?.code ??
                product?.loanScheduleProcessingType ??
                current.loanScheduleProcessingType ??
                'HORIZONTAL'
            ),
            graceOnPrincipalPayment: stringOr(
                template?.graceOnPrincipalPayment ??
                product?.graceOnPrincipalPayment ??
                current.graceOnPrincipalPayment ??
                '0'
            ),
            graceOnInterestPayment: stringOr(
                template?.graceOnInterestPayment ??
                product?.graceOnInterestPayment ??
                current.graceOnInterestPayment ??
                '0'
            ),
            graceOnInterestCharged: stringOr(
                template?.graceOnInterestCharged ??
                product?.graceOnInterestCharged ??
                current.graceOnInterestCharged ??
                '0'
            ),
            inArrearsTolerance: stringOr(
                template?.inArrearsTolerance ??
                product?.inArrearsTolerance ??
                current.inArrearsTolerance ??
                '0'
            ),
            expectedDisbursementDate: current.expectedDisbursementDate || submittedOn,
            repaymentsStartingFromDate: current.repaymentsStartingFromDate || current.expectedDisbursementDate || submittedOn,
        }));
    }, [form.productId, productDetails, loanTemplate]);

    const clientOptions = useMemo(
        () => catalogs.clients.map((item) => ({ id: Number(item.id), label: `${personLabel(item, 'Client')} (#${item.id})` })),
        [catalogs.clients]
    );
    const productOptions = useMemo(
        () => catalogs.products.map((item) => ({ id: Number(item.id), label: productOptionLabel(item) })),
        [catalogs.products]
    );
    const staffOptions = useMemo(
        () => catalogs.staff.map((item) => ({ id: Number(item.id), label: personLabel(item, 'Staff') })),
        [catalogs.staff]
    );
    const fundOptions = useMemo(
        () => catalogs.funds.map((item) => ({ id: Number(item.id), label: item.name || `Fund #${item.id}` })),
        [catalogs.funds]
    );
    const purposeOptions = useMemo(
        () => catalogs.loanPurposes.map((item) => ({ id: Number(item.id), label: item.name || item.value || `Purpose #${item.id}` })),
        [catalogs.loanPurposes]
    );

    const repaymentFrequencyOptions = loanTemplate?.repaymentFrequencyTypeOptions || catalogs.template.repaymentFrequencyTypeOptions || FALLBACK_OPTIONS.repaymentFrequencyTypeOptions;
    const interestRateFrequencyOptions = loanTemplate?.interestRateFrequencyTypeOptions || catalogs.template.interestRateFrequencyTypeOptions || FALLBACK_OPTIONS.interestRateFrequencyTypeOptions;
    const amortizationOptions = loanTemplate?.amortizationTypeOptions || catalogs.template.amortizationTypeOptions || FALLBACK_OPTIONS.amortizationTypeOptions;
    const interestTypeOptions = loanTemplate?.interestTypeOptions || catalogs.template.interestTypeOptions || FALLBACK_OPTIONS.interestTypeOptions;
    const interestCalculationOptions = loanTemplate?.interestCalculationPeriodTypeOptions || catalogs.template.interestCalculationPeriodTypeOptions || FALLBACK_OPTIONS.interestCalculationPeriodTypeOptions;
    const transactionStrategyOptions = loanTemplate?.transactionProcessingStrategyOptions || catalogs.template.transactionProcessingStrategyOptions || FALLBACK_OPTIONS.transactionProcessingStrategyOptions;

    const selectedClient = useMemo(
        () => catalogs.clients.find((item) => String(item.id) === String(form.clientId)) || null,
        [catalogs.clients, form.clientId]
    );
    const currencyCode = productDetails?.currency?.code || productDetails?.currencyCode || loanTemplate?.currency?.code || '';
    const productCharges = Array.isArray(productDetails?.charges) ? productDetails.charges : [];
    const savingsAccounts = Array.isArray(clientAccounts?.savingsAccounts) ? clientAccounts.savingsAccounts : [];

    const principalNumber = numberOr(form.principal);
    const validForCalc = Boolean(
        form.clientId &&
        form.productId &&
        principalNumber > 0 &&
        numberOr(form.numberOfRepayments) > 0 &&
        numberOr(form.repaymentEvery) > 0 &&
        numberOr(form.interestRatePerPeriod) >= 0 &&
        form.submittedOnDate &&
        form.expectedDisbursementDate &&
        form.transactionProcessingStrategyCode
    );

    const debouncedCalcKey = useDebouncedValue(
        {
            clientId: form.clientId,
            productId: form.productId,
            principal: form.principal,
            numberOfRepayments: form.numberOfRepayments,
            repaymentEvery: form.repaymentEvery,
            repaymentFrequencyType: form.repaymentFrequencyType,
            submittedOnDate: form.submittedOnDate,
            expectedDisbursementDate: form.expectedDisbursementDate,
            repaymentsStartingFromDate: form.repaymentsStartingFromDate,
            interestRatePerPeriod: form.interestRatePerPeriod,
            interestRateFrequencyType: form.interestRateFrequencyType,
            amortizationType: form.amortizationType,
            interestType: form.interestType,
            interestCalculationPeriodType: form.interestCalculationPeriodType,
            transactionProcessingStrategyCode: form.transactionProcessingStrategyCode,
            loanType: form.loanType,
            graceOnPrincipalPayment: form.graceOnPrincipalPayment,
            graceOnInterestPayment: form.graceOnInterestPayment,
            graceOnInterestCharged: form.graceOnInterestCharged,
            inArrearsTolerance: form.inArrearsTolerance,
        },
        500
    );

    const buildPayload = ({ forSchedule = false } = {}) => {
        const payload = {
            clientId: Number(form.clientId),
            productId: Number(form.productId),
            principal: numberOr(form.principal),
            submittedOnDate: form.submittedOnDate,
            expectedDisbursementDate: form.expectedDisbursementDate,
            repaymentsStartingFromDate: form.repaymentsStartingFromDate || form.expectedDisbursementDate,
            dateFormat: DATE_FORMAT,
            locale: LOCALE,
            loanType: form.loanType,
            numberOfRepayments: numberOr(form.numberOfRepayments),
            repaymentEvery: numberOr(form.repaymentEvery, 1),
            repaymentFrequencyType: numberOr(form.repaymentFrequencyType, 2),
            loanTermFrequency: numberOr(form.numberOfRepayments) * numberOr(form.repaymentEvery, 1),
            loanTermFrequencyType: numberOr(form.repaymentFrequencyType, 2),
            interestRatePerPeriod: numberOr(form.interestRatePerPeriod, 0),
            interestRateFrequencyType: numberOr(form.interestRateFrequencyType, 2),
            amortizationType: numberOr(form.amortizationType, 1),
            interestType: numberOr(form.interestType, 0),
            interestCalculationPeriodType: numberOr(form.interestCalculationPeriodType, 1),
            transactionProcessingStrategyCode: form.transactionProcessingStrategyCode,
            graceOnPrincipalPayment: numberOr(form.graceOnPrincipalPayment, 0),
            graceOnInterestPayment: numberOr(form.graceOnInterestPayment, 0),
            graceOnInterestCharged: numberOr(form.graceOnInterestCharged, 0),
            inArrearsTolerance: numberOr(form.inArrearsTolerance, 0),
        };

        if (stringOr(form.externalId)) payload.externalId = stringOr(form.externalId);
        if (stringOr(form.loanOfficerId)) payload.loanOfficerId = Number(form.loanOfficerId);
        if (stringOr(form.fundId)) payload.fundId = Number(form.fundId);
        if (stringOr(form.loanPurposeId)) payload.loanPurposeId = Number(form.loanPurposeId);
        if (stringOr(form.loanScheduleProcessingType)) payload.loanScheduleProcessingType = stringOr(form.loanScheduleProcessingType);

        if (productDetails?.maxOutstandingLoanBalance != null && Number(productDetails.maxOutstandingLoanBalance) > 0) {
            payload.maxOutstandingLoanBalance = Number(productDetails.maxOutstandingLoanBalance);
        }

        if (Array.isArray(productCharges) && productCharges.length) {
            const charges = productCharges
                .map((charge) => ({
                    chargeId: Number(charge.id ?? charge.chargeId),
                    amount: Number(charge.amount ?? charge.amountOrPercentage ?? 0),
                }))
                .filter((charge) => charge.chargeId);
            if (charges.length) payload.charges = charges;
        }

        if (!forSchedule) {
            payload.disbursementData = [
                {
                    expectedDisbursementDate: form.expectedDisbursementDate,
                    principal: numberOr(form.principal),
                },
            ];

            if (productDetails?.enableDownPayment) {
                payload.enableDownPayment = true;
                payload.disbursedAmountPercentageForDownPayment = numberOr(productDetails.disbursedAmountPercentageForDownPayment, 0);
                if (productDetails.enableAutoRepaymentForDownPayment) {
                    payload.enableAutoRepaymentForDownPayment = true;
                }
            }
        }

        return payload;
    };

    useEffect(() => {
        if (!validForCalc) {
            setSchedule(null);
            setCalcError('');
            return;
        }

        const controller = new AbortController();
        (async () => {
            setCalcLoading(true);
            setCalcError('');
            try {
                const res = await api.post('/loans?command=calculateLoanSchedule', buildPayload({ forSchedule: true }), {
                    signal: controller.signal,
                });
                setSchedule(res.data || null);
            } catch (err) {
                if (err?.name === 'CanceledError') return;
                const message =
                    err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                    err?.response?.data?.defaultUserMessage ||
                    'Loan schedule calculation failed';
                setCalcError(message);
                setSchedule(null);
            } finally {
                setCalcLoading(false);
            }
        })();

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCalcKey, validForCalc]);

    const createApplication = async () => {
        if (!validForCalc) {
            addToast('Complete the required loan inputs before submitting.', 'error');
            return;
        }

        setSaving(true);
        try {
            const res = await api.post('/loans', buildPayload());
            const newId = res.data?.loanId || res.data?.resourceId || res.data?.id;
            addToast('Loan application created', 'success');
            navigate(newId ? `/loans/${newId}` : '/loans');
        } catch (err) {
            const message =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Loan application failed';
            addToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const downloadExcelTemplate = async () => {
        try {
            const res = await api.get('/loans/downloadtemplate', {
                params: { officeId: 1, staffId: 1, dateFormat: 'mm-dd-yyyy' },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'loan-template.xls';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            addToast('Failed to download template', 'error');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="35%" />
                <Card><Skeleton height="18rem" /></Card>
                <Card><Skeleton height="20rem" /></Card>
            </div>
        );
    }

    const scheduleSummary = schedule?.repaymentSchedule || schedule || {};

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Apply Loan</h1>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Build the loan from product defaults, preview the repayment schedule, then submit the Fineract application.
                    </div>
                </div>
                <Button variant="secondary" onClick={downloadExcelTemplate}>
                    <Download size={16} />
                    Download Excel Template
                </Button>
            </div>

            <Card className="border-[color:var(--tenant-primary)]/15">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className={metricClass}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</div>
                        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                            {selectedClient ? personLabel(selectedClient, 'Client') : 'Select client'}
                        </div>
                    </div>
                    <div className={metricClass}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product</div>
                        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                            {productDetails?.name || 'Select product'}
                        </div>
                    </div>
                    <div className={metricClass}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Principal</div>
                        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                            {principalNumber > 0 ? formatAmount(principalNumber, currencyCode) : '-'}
                        </div>
                    </div>
                    <div className={metricClass}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule State</div>
                        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                            {calcLoading ? 'Calculating' : calcError ? 'Needs attention' : schedule ? 'Ready' : 'Waiting for inputs'}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                <div className="space-y-6">
                    <Card>
                        <div className={sectionTitleClass}>
                            <UserRound size={16} />
                            Borrower and Product
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <MiniCombobox
                                label="Client"
                                value={form.clientId ? Number(form.clientId) : null}
                                onChange={(value) => setForm((current) => ({ ...current, clientId: value ? String(value) : '' }))}
                                options={clientOptions}
                                placeholder="Search client"
                                required
                            />
                            <MiniCombobox
                                label="Loan Product"
                                value={form.productId ? Number(form.productId) : null}
                                onChange={(value) => setForm((current) => ({ ...current, productId: value ? String(value) : '' }))}
                                options={productOptions}
                                placeholder="Search product"
                                required
                            />
                            <div>
                                <label className="block text-sm font-medium">Principal *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.principal}
                                    onChange={(e) => setForm((current) => ({ ...current, principal: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">External ID</label>
                                <input
                                    value={form.externalId}
                                    onChange={(e) => setForm((current) => ({ ...current, externalId: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="Optional external reference"
                                />
                            </div>
                            <MiniCombobox
                                label="Loan Purpose"
                                value={form.loanPurposeId ? Number(form.loanPurposeId) : null}
                                onChange={(value) => setForm((current) => ({ ...current, loanPurposeId: value ? String(value) : '' }))}
                                options={purposeOptions}
                                placeholder="Select purpose"
                            />
                            <MiniCombobox
                                label="Fund"
                                value={form.fundId ? Number(form.fundId) : null}
                                onChange={(value) => setForm((current) => ({ ...current, fundId: value ? String(value) : '' }))}
                                options={fundOptions}
                                placeholder="Select fund"
                            />
                            <MiniCombobox
                                label="Loan Officer"
                                value={form.loanOfficerId ? Number(form.loanOfficerId) : null}
                                onChange={(value) => setForm((current) => ({ ...current, loanOfficerId: value ? String(value) : '' }))}
                                options={staffOptions}
                                placeholder="Select loan officer"
                            />
                            <div>
                                <label className="block text-sm font-medium">Loan Type *</label>
                                <select
                                    value={form.loanType}
                                    onChange={(e) => setForm((current) => ({ ...current, loanType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="individual">Individual</option>
                                    <option value="group">Group</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className={sectionTitleClass}>
                            <CalendarDays size={16} />
                            Dates and Repayment Terms
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium">Submitted On *</label>
                                <input
                                    type="date"
                                    value={form.submittedOnDate}
                                    onChange={(e) => setForm((current) => ({ ...current, submittedOnDate: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Expected Disbursement *</label>
                                <input
                                    type="date"
                                    value={form.expectedDisbursementDate}
                                    onChange={(e) => setForm((current) => ({ ...current, expectedDisbursementDate: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Repayments Start</label>
                                <input
                                    type="date"
                                    value={form.repaymentsStartingFromDate}
                                    onChange={(e) => setForm((current) => ({ ...current, repaymentsStartingFromDate: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Number of Repayments *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.numberOfRepayments}
                                    onChange={(e) => setForm((current) => ({ ...current, numberOfRepayments: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Repayment Every *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.repaymentEvery}
                                    onChange={(e) => setForm((current) => ({ ...current, repaymentEvery: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Repayment Frequency *</label>
                                <select
                                    value={form.repaymentFrequencyType}
                                    onChange={(e) => setForm((current) => ({ ...current, repaymentFrequencyType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {repaymentFrequencyOptions.map((option) => (
                                        <option key={option.id ?? option.value} value={option.id ?? option.value}>
                                            {option.value || option.name || option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className={sectionTitleClass}>
                            <Settings2 size={16} />
                            Pricing and Processing
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium">Interest Rate / Period *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.interestRatePerPeriod}
                                    onChange={(e) => setForm((current) => ({ ...current, interestRatePerPeriod: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Interest Rate Frequency</label>
                                <select
                                    value={form.interestRateFrequencyType}
                                    onChange={(e) => setForm((current) => ({ ...current, interestRateFrequencyType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {interestRateFrequencyOptions.map((option) => (
                                        <option key={option.id ?? option.value} value={option.id ?? option.value}>
                                            {option.value || option.name || option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Amortization Type</label>
                                <select
                                    value={form.amortizationType}
                                    onChange={(e) => setForm((current) => ({ ...current, amortizationType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {amortizationOptions.map((option) => (
                                        <option key={option.id ?? option.value} value={option.id ?? option.value}>
                                            {option.value || option.name || option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Interest Type</label>
                                <select
                                    value={form.interestType}
                                    onChange={(e) => setForm((current) => ({ ...current, interestType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {interestTypeOptions.map((option) => (
                                        <option key={option.id ?? option.value} value={option.id ?? option.value}>
                                            {option.value || option.name || option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Interest Calculation Period</label>
                                <select
                                    value={form.interestCalculationPeriodType}
                                    onChange={(e) => setForm((current) => ({ ...current, interestCalculationPeriodType: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {interestCalculationOptions.map((option) => (
                                        <option key={option.id ?? option.value} value={option.id ?? option.value}>
                                            {option.value || option.name || option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Transaction Processing Strategy</label>
                                <select
                                    value={form.transactionProcessingStrategyCode}
                                    onChange={(e) => setForm((current) => ({ ...current, transactionProcessingStrategyCode: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {transactionStrategyOptions.map((option) => (
                                        <option key={option.code ?? option.id ?? option.name} value={option.code ?? option.id ?? option.name}>
                                            {option.name || option.value || option.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Grace on Principal Payment</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.graceOnPrincipalPayment}
                                    onChange={(e) => setForm((current) => ({ ...current, graceOnPrincipalPayment: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Grace on Interest Payment</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.graceOnInterestPayment}
                                    onChange={(e) => setForm((current) => ({ ...current, graceOnInterestPayment: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Grace on Interest Charged</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.graceOnInterestCharged}
                                    onChange={(e) => setForm((current) => ({ ...current, graceOnInterestCharged: e.target.value }))}
                                    className="mt-1 w-full rounded-md border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-[color:var(--tenant-primary)]/15">
                        <div className={sectionTitleClass}>
                            <BriefcaseBusiness size={16} />
                            Product Snapshot
                        </div>
                        {productLoading ? (
                            <Skeleton height="10rem" />
                        ) : productDetails ? (
                            <div className="space-y-4 text-sm">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className={metricClass}>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Currency</div>
                                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{currencyCode || '-'}</div>
                                    </div>
                                    <div className={metricClass}>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Default Principal</div>
                                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                                            {formatAmount(productDetails?.principal?.default ?? productDetails?.principal, currencyCode)}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/30">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div>Principal range: <span className="font-medium">{formatAmount(productDetails?.minPrincipal ?? productDetails?.principal?.minimum, currencyCode)} - {formatAmount(productDetails?.maxPrincipal ?? productDetails?.principal?.maximum, currencyCode)}</span></div>
                                        <div>Repayments range: <span className="font-medium">{stringOr(productDetails?.minNumberOfRepayments ?? productDetails?.numberOfRepayments?.minimum, '-')} - {stringOr(productDetails?.maxNumberOfRepayments ?? productDetails?.numberOfRepayments?.maximum, '-')}</span></div>
                                        <div>Interest default: <span className="font-medium">{stringOr(productDetails?.interestRatePerPeriod?.default ?? productDetails?.interestRatePerPeriod ?? productDetails?.interestRate, '-')}</span></div>
                                        <div>Strategy: <span className="font-medium">{stringOr(productDetails?.transactionProcessingStrategyName || productDetails?.transactionProcessingStrategyCode, '-')}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product Charges</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {productCharges.length ? productCharges.map((charge) => (
                                            <span key={charge.id ?? charge.chargeId} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {charge.name || `Charge #${charge.id ?? charge.chargeId}`}
                                            </span>
                                        )) : <span className="text-sm text-slate-500 dark:text-slate-400">No product charges.</span>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Select a product to load Fineract defaults.</div>
                        )}
                    </Card>

                    <Card>
                        <div className={sectionTitleClass}>
                            <Coins size={16} />
                            Borrower Context
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>Client savings accounts: <span className="font-medium">{savingsAccounts.length}</span></div>
                            <div>Client office: <span className="font-medium">{selectedClient?.officeName || '-'}</span></div>
                            <div>Client status: <span className="font-medium">{selectedClient?.status?.value || selectedClient?.status?.code || '-'}</span></div>
                        </div>
                    </Card>
                </div>
            </div>

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={sectionTitleClass}>
                            <CalendarDays size={16} />
                            Schedule Preview
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Schedule calculation uses the same core fields that will be posted to Fineract.
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setForm((current) => ({ ...current, repaymentsStartingFromDate: current.expectedDisbursementDate || todayISO() }))}>
                            Align Repayments Start
                        </Button>
                        <Button onClick={createApplication} disabled={!validForCalc || calcLoading || saving}>
                            {saving ? 'Submitting...' : 'Create Application'}
                        </Button>
                    </div>
                </div>

                <div className="mt-5">
                    {calcLoading ? (
                        <Skeleton height="12rem" />
                    ) : calcError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                            {calcError}
                        </div>
                    ) : schedule ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className={metricClass}>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Principal Expected</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                                        {formatAmount(scheduleSummary?.totalPrincipalExpected, currencyCode)}
                                    </div>
                                </div>
                                <div className={metricClass}>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Interest Charged</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                                        {formatAmount(scheduleSummary?.totalInterestCharged, currencyCode)}
                                    </div>
                                </div>
                                <div className={metricClass}>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Repayment Expected</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                                        {formatAmount(scheduleSummary?.totalRepaymentExpected, currencyCode)}
                                    </div>
                                </div>
                                <div className={metricClass}>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Installments</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                                        {stringOr(form.numberOfRepayments, '-')}
                                    </div>
                                </div>
                            </div>
                            <ScheduleTable schedule={schedule?.repaymentSchedule || schedule} />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            Select the borrower and product, then complete the loan inputs to calculate the repayment schedule.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default LoanApply;
