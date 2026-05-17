import React, { useEffect, useMemo, useState } from 'react';
import {
    BadgeDollarSign,
    CalendarRange,
    Landmark,
    Percent,
    ReceiptText,
    ShieldAlert,
    WalletCards,
} from 'lucide-react';
import api from '../api/axios';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

const fieldClassName = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[color:var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const helpClassName = 'mt-1 text-xs text-slate-500 dark:text-slate-400';
const errorClassName = 'mt-1 text-xs text-red-500';

const parseOptionsWithValue = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((o) => ({
            id: o?.id ?? o?.code ?? o?.value ?? '',
            code: o?.code ?? '',
            name: o?.value ?? o?.label ?? o?.text ?? String(o?.id ?? ''),
        }))
        .filter((x) => x.id || x.code);
};

const normalizeNamedOptions = (arr, idKey = 'id', nameKey = 'name') => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((o) => ({
            id: o?.[idKey] ?? o?.value ?? o?.key,
            code: o?.code || o?.currencyCode || '',
            name:
                o?.[nameKey] ??
                o?.text ??
                o?.label ??
                o?.name ??
                String(o?.id ?? ''),
        }))
        .filter((x) => x.id || x.code);
};

const labelForOption = (options, value) => {
    const match = options.find((option) => String(option.id) === String(value));
    return match?.name || 'Not selected';
};

const sectionClassName = 'rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/35';

const ChargeFormSection = ({ title, description, icon: Icon, children }) => (
    <section className={sectionClassName}>
        <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--tenant-primary)]/20 bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)] dark:border-[color:var(--tenant-primary)]/30 dark:bg-[color:var(--tenant-primary)]/15">
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
                {description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
            </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
);

const ChargeForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [appliesToOptions, setAppliesToOptions] = useState([]);
    const [timeTypeOptions, setTimeTypeOptions] = useState([]);
    const [calcTypeOptions, setCalcTypeOptions] = useState([]);
    const [paymentModeOptions, setPaymentModeOptions] = useState([]);
    const [taxGroupOptions, setTaxGroupOptions] = useState([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);
    const [feeFrequencyOptions, setFeeFrequencyOptions] = useState([]);

    const [name, setName] = useState(initial?.name || '');
    const [currencyCode, setCurrencyCode] = useState(initial?.currencyCode || initial?.currency?.code || '');
    const [amount, setAmount] = useState(initial?.amount ?? initial?.amountPercentage ?? '');
    const [active, setActive] = useState(typeof initial?.active === 'boolean' ? initial.active : true);
    const [penalty, setPenalty] = useState(typeof initial?.penalty === 'boolean' ? initial.penalty : false);

    const [chargeAppliesTo, setChargeAppliesTo] = useState(initial?.chargeAppliesTo?.id || initial?.chargeAppliesTo || '');
    const [chargeTimeType, setChargeTimeType] = useState(initial?.chargeTimeType?.id || initial?.chargeTimeType || '');
    const [chargeCalculationType, setChargeCalculationType] = useState(initial?.chargeCalculationType?.id || initial?.chargeCalculationType || '');
    const [chargePaymentMode, setChargePaymentMode] = useState(initial?.chargePaymentMode?.id || initial?.chargePaymentMode || '');
    const [taxGroupId, setTaxGroupId] = useState(initial?.taxGroup?.id || initial?.taxGroupId || '');

    const [enablePaymentType, setEnablePaymentType] = useState(typeof initial?.enablePaymentType === 'boolean' ? initial.enablePaymentType : false);
    const [paymentTypeId, setPaymentTypeId] = useState(initial?.paymentTypeId || '');

    const [feeFrequency, setFeeFrequency] = useState(initial?.feeFrequency || '');
    const [feeInterval, setFeeInterval] = useState(initial?.feeInterval != null ? String(initial.feeInterval) : '');
    const [feeOnMonthDay, setFeeOnMonthDay] = useState(initial?.feeOnMonthDay || '');
    const [monthDayFormat, setMonthDayFormat] = useState(initial?.monthDayFormat || 'MM-dd');

    const [maxCap, setMaxCap] = useState(initial?.maxCap != null ? String(initial.maxCap) : '');
    const [minCap, setMinCap] = useState(initial?.minCap != null ? String(initial.minCap) : '');

    const [errors, setErrors] = useState({});

    const selectedTimeTypeLabel = useMemo(
        () => labelForOption(timeTypeOptions, chargeTimeType).toLowerCase(),
        [chargeTimeType, timeTypeOptions]
    );
    const selectedCalcTypeLabel = useMemo(
        () => labelForOption(calcTypeOptions, chargeCalculationType).toLowerCase(),
        [chargeCalculationType, calcTypeOptions]
    );

    const showsRecurringFields = selectedTimeTypeLabel.includes('overdue') || selectedTimeTypeLabel.includes('installment');
    const showsCapFields = selectedCalcTypeLabel.includes('percentage') || selectedCalcTypeLabel.includes('percent');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/charges/template');
                const d = r?.data || {};
                const currencies = d?.currencyOptions || d?.currencies || [];
                const appliesTo = d?.chargeAppliesToOptions || [];
                const timeTypes = d?.chargeTimeTypeOptions || [];
                const calcTypes = d?.chargeCalculationTypeOptions || d?.calculationTypeOptions || [];
                const paymentModes = d?.chargePaymetModeOptions || d?.chargePaymentModeOptions || [];
                const taxes = d?.taxGroupOptions || [];
                const paymentTypesFromTemplate = d?.paymentTypeOptions || [];
                const feeFreqOpts = d?.feeFrequencyOptions || [];

                if (!cancelled) {
                    setCurrencyOptions(
                        normalizeNamedOptions(currencies, 'code', 'name').map((c) => ({
                            id: c.code,
                            code: c.code,
                            name: `${c.code}${c.name ? ` - ${c.name}` : ''}`,
                        }))
                    );
                    setAppliesToOptions(parseOptionsWithValue(appliesTo));
                    setTimeTypeOptions(parseOptionsWithValue(timeTypes));
                    setCalcTypeOptions(parseOptionsWithValue(calcTypes));
                    setPaymentModeOptions(parseOptionsWithValue(paymentModes));
                    setTaxGroupOptions(normalizeNamedOptions(taxes));
                    setPaymentTypeOptions(parseOptionsWithValue(paymentTypesFromTemplate));
                    setFeeFrequencyOptions(parseOptionsWithValue(feeFreqOpts));
                }

                if (!cancelled && (!paymentTypesFromTemplate || !paymentTypesFromTemplate.length)) {
                    try {
                        const pt = await api.get('/paymenttypes');
                        const arr = Array.isArray(pt?.data) ? pt.data : [];
                        if (!cancelled) {
                            const parsed = arr.map((p) => ({
                                id: p?.id,
                                code: p?.code ?? '',
                                name: p?.name ?? String(p?.id ?? ''),
                            }));
                            setPaymentTypeOptions(parsed.filter((x) => x.id));
                        }
                    } catch {
                        // ignore if the endpoint is unavailable in this tenant
                    }
                }
            } catch {
                if (!cancelled) {
                    setCurrencyOptions([]);
                    setAppliesToOptions([]);
                    setTimeTypeOptions([]);
                    setCalcTypeOptions([]);
                    setPaymentModeOptions([]);
                    setTaxGroupOptions([]);
                    setPaymentTypeOptions([]);
                    setFeeFrequencyOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!initial) return;
        setName(initial?.name || '');
        setCurrencyCode(initial?.currencyCode || initial?.currency?.code || '');
        setAmount(initial?.amount ?? initial?.amountPercentage ?? '');
        setActive(typeof initial?.active === 'boolean' ? initial.active : true);
        setPenalty(typeof initial?.penalty === 'boolean' ? initial.penalty : false);
        setChargeAppliesTo(initial?.chargeAppliesTo?.id || initial?.chargeAppliesTo || '');
        setChargeTimeType(initial?.chargeTimeType?.id || initial?.chargeTimeType || '');
        setChargeCalculationType(initial?.chargeCalculationType?.id || initial?.chargeCalculationType || '');
        setChargePaymentMode(initial?.chargePaymentMode?.id || initial?.chargePaymentMode || '');
        setTaxGroupId(initial?.taxGroup?.id || initial?.taxGroupId || '');
        setEnablePaymentType(typeof initial?.enablePaymentType === 'boolean' ? initial.enablePaymentType : false);
        setPaymentTypeId(initial?.paymentTypeId || '');
        setFeeFrequency(initial?.feeFrequency || '');
        setFeeInterval(initial?.feeInterval != null ? String(initial.feeInterval) : '');
        setFeeOnMonthDay(initial?.feeOnMonthDay || '');
        setMonthDayFormat(initial?.monthDayFormat || 'MM-dd');
        setMaxCap(initial?.maxCap != null ? String(initial.maxCap) : '');
        setMinCap(initial?.minCap != null ? String(initial.minCap) : '');
        setErrors({});
    }, [initial?.id]);

    const clearError = (key) => {
        if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
    };

    const validate = () => {
        const nextErrors = {};
        if (!name.trim()) nextErrors.name = 'Name is required';
        if (!currencyCode) nextErrors.currencyCode = 'Currency is required';
        if (amount === '' || amount === null) nextErrors.amount = 'Amount is required';
        if (!chargeAppliesTo) nextErrors.chargeAppliesTo = 'Applies To is required';
        if (!chargeTimeType) nextErrors.chargeTimeType = 'Time Type is required';
        if (!chargeCalculationType) nextErrors.chargeCalculationType = 'Calculation Type is required';
        if (enablePaymentType && !paymentTypeId) nextErrors.paymentTypeId = 'Payment Type is required when enabled';
        if (showsRecurringFields && feeOnMonthDay && !monthDayFormat) nextErrors.monthDayFormat = 'Month day format is required when Fee On Month Day is provided';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }

        const payload = {
            name: name.trim(),
            currencyCode: currencyCode || '',
            amount: Number(amount) || 0,
            active: Boolean(active),
            penalty: Boolean(penalty),
            chargeAppliesTo: Number(chargeAppliesTo) || 0,
            chargeTimeType: Number(chargeTimeType) || 0,
            chargeCalculationType: Number(chargeCalculationType) || 0,
            chargePaymentMode: chargePaymentMode === '' ? 0 : Number(chargePaymentMode),
            taxGroupId: taxGroupId === '' ? 0 : Number(taxGroupId),
            enablePaymentType: Boolean(enablePaymentType),
            paymentTypeId: enablePaymentType ? (paymentTypeId === '' ? 0 : Number(paymentTypeId)) : 0,
            feeFrequency: String(feeFrequency || ''),
            feeInterval: String(feeInterval || ''),
            feeOnMonthDay: String(feeOnMonthDay || ''),
            monthDayFormat: String(monthDayFormat || ''),
            maxCap: maxCap === '' ? 0 : Number(maxCap),
            minCap: minCap === '' ? 0 : Number(minCap),
            locale: 'en',
        };

        await onSubmit(payload);
    };

    const summaryItems = [
        { label: 'Applies To', value: labelForOption(appliesToOptions, chargeAppliesTo) },
        { label: 'Time Type', value: labelForOption(timeTypeOptions, chargeTimeType) },
        { label: 'Calculation', value: labelForOption(calcTypeOptions, chargeCalculationType) },
        { label: 'Currency', value: currencyCode || 'Not selected' },
    ];

    return (
        <form onSubmit={submit} className="space-y-6">
            {tplLoading ? (
                <Skeleton height="24rem" />
            ) : (
                <>
                    <div className="rounded-2xl border border-[color:var(--tenant-primary)]/15 bg-gradient-to-br from-[color:var(--tenant-primary)]/10 via-white to-white p-4 dark:border-[color:var(--tenant-primary)]/25 dark:from-[color:var(--tenant-primary)]/15 dark:via-slate-900 dark:to-slate-900">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tenant-primary)]">Charge Setup</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                                    {initial?.id ? `Edit Charge #${initial.id}` : 'Create Charge'}
                                </h2>
                                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                                    Configure the charge definition, application timing, calculation logic, and optional payment controls in one flow.
                                </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {summaryItems.map((item) => (
                                    <div key={item.label} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</div>
                                        <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <ChargeFormSection
                        title="Core Definition"
                        description="Set the charge identity, monetary base, and high-level application target."
                        icon={ReceiptText}
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    clearError('name');
                                }}
                                placeholder="e.g. Registration Fee"
                                className={fieldClassName}
                            />
                            {errors.name ? <p className={errorClassName}>{errors.name}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Currency *</label>
                            <select
                                value={currencyCode}
                                onChange={(e) => {
                                    setCurrencyCode(e.target.value);
                                    clearError('currencyCode');
                                }}
                                className={fieldClassName}
                            >
                                <option value="">Select currency...</option>
                                {currencyOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errors.currencyCode ? <p className={errorClassName}>{errors.currencyCode}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    clearError('amount');
                                }}
                                placeholder="e.g. 5000"
                                className={fieldClassName}
                            />
                            <p className={helpClassName}>Use a fixed amount or percentage value depending on the selected calculation type.</p>
                            {errors.amount ? <p className={errorClassName}>{errors.amount}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Applies To *</label>
                            <select
                                value={chargeAppliesTo}
                                onChange={(e) => {
                                    setChargeAppliesTo(e.target.value);
                                    clearError('chargeAppliesTo');
                                }}
                                className={fieldClassName}
                            >
                                <option value="">Select target...</option>
                                {appliesToOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeAppliesTo ? <p className={errorClassName}>{errors.chargeAppliesTo}</p> : null}
                        </div>
                    </ChargeFormSection>

                    <ChargeFormSection
                        title="Application Logic"
                        description="Control when the charge is triggered and how the amount is computed."
                        icon={BadgeDollarSign}
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Time Type *</label>
                            <select
                                value={chargeTimeType}
                                onChange={(e) => {
                                    setChargeTimeType(e.target.value);
                                    clearError('chargeTimeType');
                                }}
                                className={fieldClassName}
                            >
                                <option value="">Select time type...</option>
                                {timeTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeTimeType ? <p className={errorClassName}>{errors.chargeTimeType}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Calculation Type *</label>
                            <select
                                value={chargeCalculationType}
                                onChange={(e) => {
                                    setChargeCalculationType(e.target.value);
                                    clearError('chargeCalculationType');
                                }}
                                className={fieldClassName}
                            >
                                <option value="">Select calculation type...</option>
                                {calcTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeCalculationType ? <p className={errorClassName}>{errors.chargeCalculationType}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Mode</label>
                            <select value={chargePaymentMode} onChange={(e) => setChargePaymentMode(e.target.value)} className={fieldClassName}>
                                <option value="">Default server value</option>
                                {paymentModeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            <p className={helpClassName}>If left empty, the payload sends 0 and lets Fineract apply its default payment mode.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tax Group</label>
                            <select value={taxGroupId} onChange={(e) => setTaxGroupId(e.target.value)} className={fieldClassName}>
                                <option value="">No tax group</option>
                                {taxGroupOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            <p className={helpClassName}>Leave this empty when the charge should not be tied to a tax group.</p>
                        </div>
                    </ChargeFormSection>

                    <ChargeFormSection
                        title="Recurring and Cap Controls"
                        description="These fields are relevant for recurring charges and percentage-based calculations."
                        icon={CalendarRange}
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fee Frequency</label>
                            {feeFrequencyOptions.length ? (
                                <select value={feeFrequency} onChange={(e) => setFeeFrequency(e.target.value)} className={fieldClassName}>
                                    <option value="">No frequency</option>
                                    {feeFrequencyOptions.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={feeFrequency}
                                    onChange={(e) => setFeeFrequency(e.target.value)}
                                    placeholder="e.g. frequencyperiodFrequencyType.months"
                                    className={fieldClassName}
                                />
                            )}
                            <p className={helpClassName}>Set when the charge recurs over time. Relevant now: {showsRecurringFields ? 'yes' : 'only if needed'}.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fee Interval</label>
                            <input
                                value={feeInterval}
                                onChange={(e) => setFeeInterval(e.target.value)}
                                placeholder="e.g. 1, 3, 12"
                                className={fieldClassName}
                            />
                            <p className={helpClassName}>Sent as a raw string to preserve the server contract.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fee On Month Day</label>
                            <input
                                value={feeOnMonthDay}
                                onChange={(e) => setFeeOnMonthDay(e.target.value)}
                                placeholder="MM-dd"
                                className={fieldClassName}
                            />
                            <p className={helpClassName}>Use with recurring monthly or annual charges when Fineract expects a fixed day.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Month Day Format</label>
                            <input
                                value={monthDayFormat}
                                onChange={(e) => {
                                    setMonthDayFormat(e.target.value);
                                    clearError('monthDayFormat');
                                }}
                                placeholder="MM-dd"
                                className={fieldClassName}
                            />
                            {errors.monthDayFormat ? <p className={errorClassName}>{errors.monthDayFormat}</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Min Cap</label>
                            <input type="number" value={minCap} onChange={(e) => setMinCap(e.target.value)} placeholder="0" className={fieldClassName} />
                            <p className={helpClassName}>Relevant now: {showsCapFields ? 'yes' : 'typically only for percentage charges'}.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Max Cap</label>
                            <input type="number" value={maxCap} onChange={(e) => setMaxCap(e.target.value)} placeholder="0" className={fieldClassName} />
                            <p className={helpClassName}>Set a ceiling when the calculated amount should not exceed a maximum.</p>
                        </div>
                    </ChargeFormSection>

                    <ChargeFormSection
                        title="Payment and Status Controls"
                        description="Attach optional payment-type restrictions and operational flags."
                        icon={WalletCards}
                    >
                        <div className="md:col-span-2">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                                    <span>Active</span>
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    <input type="checkbox" checked={penalty} onChange={(e) => setPenalty(e.target.checked)} />
                                    <span>Penalty charge</span>
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:col-span-2">
                                    <input type="checkbox" checked={enablePaymentType} onChange={(e) => setEnablePaymentType(e.target.checked)} />
                                    <span>Restrict charge to a specific payment type</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Type</label>
                            <select
                                value={paymentTypeId}
                                onChange={(e) => {
                                    setPaymentTypeId(e.target.value);
                                    clearError('paymentTypeId');
                                }}
                                className={`${fieldClassName} disabled:opacity-60`}
                                disabled={!enablePaymentType}
                            >
                                <option value="">Select payment type...</option>
                                {paymentTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.paymentTypeId ? <p className={errorClassName}>{errors.paymentTypeId}</p> : null}
                        </div>

                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-300">
                            <div className="flex items-start gap-2">
                                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[var(--tenant-primary)]" />
                                <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">Payload coverage</div>
                                    <div className="mt-1">
                                        This form sends all supported charge fields: amount, applies-to, time type, calculation type, payment mode, tax group, payment type controls, recurring fee fields, caps, active, penalty, locale.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ChargeFormSection>

                    <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/50 lg:grid-cols-4">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-800/50">
                            <Landmark size={18} className="text-[var(--tenant-primary)]" />
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Target</div>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{labelForOption(appliesToOptions, chargeAppliesTo)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-800/50">
                            <CalendarRange size={18} className="text-[var(--tenant-primary)]" />
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Timing</div>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{labelForOption(timeTypeOptions, chargeTimeType)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-800/50">
                            <Percent size={18} className="text-[var(--tenant-primary)]" />
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Calculation</div>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{labelForOption(calcTypeOptions, chargeCalculationType)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-800/50">
                            <WalletCards size={18} className="text-[var(--tenant-primary)]" />
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Flags</div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                                        {active ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${penalty ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                                        {penalty ? 'Penalty' : 'Standard'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : initial ? 'Save Charge' : 'Create Charge'}
                        </Button>
                    </div>
                </>
            )}
        </form>
    );
};

export default ChargeForm;
