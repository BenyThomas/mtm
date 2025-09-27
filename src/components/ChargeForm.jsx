import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * This form builds a full payload for POST /charges including all known keys:
 * {
 *   active, amount, chargeAppliesTo, chargeCalculationType, chargePaymentMode,
 *   chargeTimeType, currencyCode, enablePaymentType, feeFrequency, feeInterval,
 *   feeOnMonthDay, locale, maxCap, minCap, monthDayFormat, name, paymentTypeId,
 *   penalty, taxGroupId
 * }
 *
 * Notes:
 * - We still validate only a subset (name, currencyCode, amount, appliesTo, timeType, calcType).
 * - We include all fields in the payload (with sensible defaults) to satisfy your requirement.
 */

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

    // Fields
    const [name, setName] = useState(initial?.name || '');
    const [currencyCode, setCurrencyCode] = useState(initial?.currencyCode || initial?.currency?.code || '');
    const [amount, setAmount] = useState(initial?.amount ?? initial?.amountPercentage ?? '');
    const [active, setActive] = useState(typeof initial?.active === 'boolean' ? initial.active : true);
    const [penalty, setPenalty] = useState(typeof initial?.penalty === 'boolean' ? initial.penalty : false);

    const [chargeAppliesTo, setChargeAppliesTo] = useState(
        initial?.chargeAppliesTo?.id || initial?.chargeAppliesTo || ''
    );
    const [chargeTimeType, setChargeTimeType] = useState(
        initial?.chargeTimeType?.id || initial?.chargeTimeType || ''
    );
    const [chargeCalculationType, setChargeCalculationType] = useState(
        initial?.chargeCalculationType?.id || initial?.chargeCalculationType || ''
    );
    const [chargePaymentMode, setChargePaymentMode] = useState(
        initial?.chargePaymentMode?.id || initial?.chargePaymentMode || ''
    );

    const [taxGroupId, setTaxGroupId] = useState(initial?.taxGroup?.id || initial?.taxGroupId || '');

    // New fields required by your schema
    const [enablePaymentType, setEnablePaymentType] = useState(
        typeof initial?.enablePaymentType === 'boolean' ? initial.enablePaymentType : false
    );
    const [paymentTypeId, setPaymentTypeId] = useState(initial?.paymentTypeId || '');

    const [feeFrequency, setFeeFrequency] = useState(initial?.feeFrequency || '');
    const [feeInterval, setFeeInterval] = useState(
        initial?.feeInterval != null ? String(initial.feeInterval) : ''
    );
    const [feeOnMonthDay, setFeeOnMonthDay] = useState(initial?.feeOnMonthDay || ''); // Expect "MM-dd" text
    const [monthDayFormat, setMonthDayFormat] = useState(initial?.monthDayFormat || 'MM-dd');

    const [maxCap, setMaxCap] = useState(initial?.maxCap != null ? String(initial.maxCap) : '');
    const [minCap, setMinCap] = useState(initial?.minCap != null ? String(initial.minCap) : '');

    const [errors, setErrors] = useState({});

    // Helpers to normalize option arrays
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

    const norm = (arr, idKey = 'id', nameKey = 'name') => {
        if (!Array.isArray(arr)) return [];
        return arr
            .map((o) => ({
                id: o?.[idKey] ?? o?.value ?? o?.key,
                name:
                    o?.[nameKey] ??
                    o?.text ??
                    o?.label ??
                    o?.name ??
                    String(o?.id ?? ''),
                code: o?.code || o?.currencyCode,
            }))
            .filter((x) => x.id || x.code);
    };

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
                const paymentModes = d?.chargePaymetModeOptions || [];
                const taxes = d?.taxGroupOptions || [];
                const paymentTypesFromTemplate = d?.paymentTypeOptions || [];
                const feeFreqOpts = d?.feeFrequencyOptions || [];

                if (!cancelled) {
                    setCurrencyOptions(
                        norm(currencies, 'code', 'name').map((c) => ({
                            id: c.code,
                            name: `${c.code}${c.name ? ` — ${c.name}` : ''}`,
                        }))
                    );
                    setAppliesToOptions(parseOptionsWithValue(appliesTo));
                    setTimeTypeOptions(parseOptionsWithValue(timeTypes));
                    setCalcTypeOptions(parseOptionsWithValue(calcTypes));
                    setPaymentModeOptions(parseOptionsWithValue(paymentModes));
                    setTaxGroupOptions(norm(taxes));
                    setPaymentTypeOptions(parseOptionsWithValue(paymentTypesFromTemplate));
                    setFeeFrequencyOptions(parseOptionsWithValue(feeFreqOpts));
                }

                // Fallback: if no paymentTypeOptions in template, try /paymenttypes
                if (!cancelled && (!paymentTypesFromTemplate || !paymentTypesFromTemplate.length)) {
                    try {
                        const pt = await api.get('/paymenttypes');
                        const arr = Array.isArray(pt?.data) ? pt.data : [];
                        if (!cancelled) {
                            // /paymenttypes returns objects with id & name; normalize to {id, name}
                            const parsed = arr.map((p) => ({
                                id: p?.id,
                                code: p?.code ?? '',
                                name: p?.name ?? String(p?.id ?? ''),
                            }));
                            setPaymentTypeOptions(parsed.filter((x) => x.id));
                        }
                    } catch {
                        // ignore if not available
                    }
                }
            } catch (_e) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rehydrate when editing
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!currencyCode) e.currencyCode = 'Currency is required';
        if (amount === '' || amount === null) e.amount = 'Amount is required';
        if (!chargeAppliesTo) e.chargeAppliesTo = 'Applies To is required';
        if (!chargeTimeType) e.chargeTimeType = 'Time Type is required';
        if (!chargeCalculationType) e.chargeCalculationType = 'Calculation Type is required';
        if (enablePaymentType && !paymentTypeId) e.paymentTypeId = 'Payment Type is required when enabled';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }

        // Ensure we send ALL fields with defaults if empty
        const payload = {
            name: name.trim(),
            currencyCode: currencyCode || '',
            amount: Number(amount) || 0,
            active: Boolean(active),
            penalty: Boolean(penalty),

            chargeAppliesTo: Number(chargeAppliesTo) || 0,
            chargeTimeType: Number(chargeTimeType) || 0,
            chargeCalculationType: Number(chargeCalculationType) || 0,
            chargePaymentMode: chargePaymentMode === '' ? 0 : Number(chargePaymentMode), // default 0

            taxGroupId: taxGroupId === '' ? 0 : Number(taxGroupId),

            enablePaymentType: Boolean(enablePaymentType),
            paymentTypeId: enablePaymentType
                ? (paymentTypeId === '' ? 0 : Number(paymentTypeId))
                : 0,

            feeFrequency: String(feeFrequency || ''),     // as per your schema
            feeInterval: String(feeInterval || ''),       // schema says string
            feeOnMonthDay: String(feeOnMonthDay || ''),   // e.g. "03-15" if using MM-dd
            monthDayFormat: String(monthDayFormat || ''), // e.g. "MM-dd"

            maxCap: maxCap === '' ? 0 : Number(maxCap),
            minCap: minCap === '' ? 0 : Number(minCap),

            locale: 'en',
        };

        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="8rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors((x) => ({ ...x, name: '' }));
                                }}
                                placeholder="e.g. Registration Fee"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium">Currency *</label>
                            <select
                                value={currencyCode}
                                onChange={(e) => {
                                    setCurrencyCode(e.target.value);
                                    if (errors.currencyCode) setErrors((x) => ({ ...x, currencyCode: '' }));
                                }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select currency…</option>
                                {currencyOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errors.currencyCode && <p className="text-xs text-red-500 mt-1">{errors.currencyCode}</p>}
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (errors.amount) setErrors((x) => ({ ...x, amount: '' }));
                                }}
                                placeholder="e.g. 5000 (or % if percentage type)"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                        </div>

                        {/* Applies To */}
                        <div>
                            <label className="block text-sm font-medium">Applies To *</label>
                            <select
                                value={chargeAppliesTo}
                                onChange={(e) => {
                                    setChargeAppliesTo(e.target.value);
                                    if (errors.chargeAppliesTo) setErrors((x) => ({ ...x, chargeAppliesTo: '' }));
                                }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {appliesToOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeAppliesTo && <p className="text-xs text-red-500 mt-1">{errors.chargeAppliesTo}</p>}
                        </div>

                        {/* Time Type */}
                        <div>
                            <label className="block text-sm font-medium">Time Type *</label>
                            <select
                                value={chargeTimeType}
                                onChange={(e) => {
                                    setChargeTimeType(e.target.value);
                                    if (errors.chargeTimeType) setErrors((x) => ({ ...x, chargeTimeType: '' }));
                                }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {timeTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeTimeType && <p className="text-xs text-red-500 mt-1">{errors.chargeTimeType}</p>}
                        </div>

                        {/* Calculation Type */}
                        <div>
                            <label className="block text-sm font-medium">Calculation Type *</label>
                            <select
                                value={chargeCalculationType}
                                onChange={(e) => {
                                    setChargeCalculationType(e.target.value);
                                    if (errors.chargeCalculationType) setErrors((x) => ({ ...x, chargeCalculationType: '' }));
                                }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {calcTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.chargeCalculationType && (
                                <p className="text-xs text-red-500 mt-1">{errors.chargeCalculationType}</p>
                            )}
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label className="block text-sm font-medium">Payment Mode</label>
                            <select
                                value={chargePaymentMode}
                                onChange={(e) => setChargePaymentMode(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Default 0)</option>
                                {paymentModeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">If empty, we will send 0.</p>
                        </div>

                        {/* Tax Group */}
                        <div>
                            <label className="block text-sm font-medium">Tax Group</label>
                            <select
                                value={taxGroupId}
                                onChange={(e) => setTaxGroupId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(None → 0)</option>
                                {taxGroupOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">If none selected, we will send 0.</p>
                        </div>

                        {/* Enable Payment Type */}
                        <div className="col-span-full">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={enablePaymentType}
                                    onChange={(e) => setEnablePaymentType(e.target.checked)}
                                />
                                <span className="text-sm">Enable Payment Type</span>
                            </label>
                        </div>

                        {/* Payment Type Id */}
                        <div>
                            <label className="block text-sm font-medium">Payment Type</label>
                            <select
                                value={paymentTypeId}
                                onChange={(e) => setPaymentTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                                disabled={!enablePaymentType}
                            >
                                <option value="">(None → 0)</option>
                                {paymentTypeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.paymentTypeId && <p className="text-xs text-red-500 mt-1">{errors.paymentTypeId}</p>}
                        </div>

                        {/* Fee Frequency (SELECT from template options) */}
                        <div>
                            <label className="block text-sm font-medium">Fee Frequency</label>
                            {feeFrequencyOptions.length ? (
                                <select
                                    value={feeFrequency}
                                    onChange={(e) => setFeeFrequency(e.target.value)} // send option.code
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">(None)</option>
                                    {feeFrequencyOptions.map((o) => (
                                        <option key={o.id} value={o.id }>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={feeFrequency}
                                    onChange={(e) => setFeeFrequency(e.target.value)}
                                    placeholder='e.g. "frequencyperiodFrequencyType.months"'
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                We send the option <code>code</code> (e.g. <code>frequencyperiodFrequencyType.days</code>).
                            </p>
                        </div>

                        {/* Fee Interval (string per schema) */}
                        <div>
                            <label className="block text-sm font-medium">Fee Interval</label>
                            <input
                                value={feeInterval}
                                onChange={(e) => setFeeInterval(e.target.value)}
                                placeholder="e.g. 1, 3, 12"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">Raw string is sent as-is.</p>
                        </div>

                        {/* Fee On Month Day (MM-dd) */}
                        <div>
                            <label className="block text-sm font-medium">Fee On Month Day</label>
                            <input
                                value={feeOnMonthDay}
                                onChange={(e) => setFeeOnMonthDay(e.target.value)}
                                placeholder="MM-dd (e.g. 03-15)"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                We will send <code>monthDayFormat</code> along with this value.
                            </p>
                        </div>

                        {/* Month Day Format */}
                        <div>
                            <label className="block text-sm font-medium">Month Day Format</label>
                            <input
                                value={monthDayFormat}
                                onChange={(e) => setMonthDayFormat(e.target.value)}
                                placeholder="e.g. MM-dd"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        {/* Caps */}
                        <div>
                            <label className="block text-sm font-medium">Min Cap</label>
                            <input
                                type="number"
                                value={minCap}
                                onChange={(e) => setMinCap(e.target.value)}
                                placeholder="0"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Max Cap</label>
                            <input
                                type="number"
                                value={maxCap}
                                onChange={(e) => setMaxCap(e.target.value)}
                                placeholder="0"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        {/* Active / Penalty */}
                        <div className="col-span-full flex items-center gap-6">
                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                                <span className="text-sm">Active</span>
                            </label>

                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={penalty} onChange={(e) => setPenalty(e.target.checked)} />
                                <span className="text-sm">Penalty</span>
                            </label>
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Charge'}
                </Button>
            </div>
        </form>
    );
};

export default ChargeForm;
