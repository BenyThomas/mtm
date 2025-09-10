// src/components/ChargeForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Payload (commonly accepted by Fineract):
 * {
 *   name: "Registration Fee",
 *   currencyCode: "TZS",
 *   amount: 5000,
 *   active: true,
 *   penalty: false,
 *   chargeAppliesTo: 1,        // from options
 *   chargeTimeType: 1,         // from options
 *   chargeCalculationType: 1,  // from options
 *   chargePaymentMode: 0,      // optional, from options
 *   taxGroupId: 1              // optional, from options
 * }
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

    // Fields
    const [name, setName] = useState(initial?.name || '');
    const [currencyCode, setCurrencyCode] = useState(initial?.currencyCode || '');
    const [amount, setAmount] = useState(
        initial?.amount ?? initial?.amountPercentage ?? ''
    );
    const [active, setActive] = useState(
        typeof initial?.active === 'boolean' ? initial.active : true
    );
    const [penalty, setPenalty] = useState(
        typeof initial?.penalty === 'boolean' ? initial.penalty : false
    );
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
    const [taxGroupId, setTaxGroupId] = useState(
        initial?.taxGroup?.id || initial?.taxGroupId || ''
    );

    const [errors, setErrors] = useState({});
    const parseOptionsWithValue = (arr) => {
        if (!Array.isArray(arr)) return [];

        return arr.map((o) => ({
            id: o?.id ?? o?.code ?? o?.value ?? '',
            code: o?.code ?? '',
            name: o?.value ?? o?.label ?? o?.text ?? String(o?.id ?? ''),
        })).filter((x) => x.id || x.code);
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
                const paymentModes = d?.chargePaymentModeOptions || [];
                const taxes = d?.taxGroupOptions || [];

                if (!cancelled) {
                    setCurrencyOptions(norm(currencies, 'code', 'name').map((c) => ({
                        id: c.code,
                        name: `${c.code}${c.name ? ` — ${c.name}` : ''}`,
                    })));
                    setAppliesToOptions(parseOptionsWithValue(appliesTo));
                    setTimeTypeOptions(parseOptionsWithValue(timeTypes));
                    setCalcTypeOptions(parseOptionsWithValue(calcTypes));
                    setPaymentModeOptions(parseOptionsWithValue(paymentModes));
                    setTaxGroupOptions(parseOptionsWithValue(taxes));
                }
            } catch (_e) {
                if (!cancelled) {
                    setCurrencyOptions([]);
                    setAppliesToOptions([]);
                    setTimeTypeOptions([]);
                    setCalcTypeOptions([]);
                    setPaymentModeOptions([]);
                    setTaxGroupOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
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
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            name: name.trim(),
            currencyCode,
            amount: Number(amount), // percentage also goes here if calc type is percentage
            active: Boolean(active),
            penalty: Boolean(penalty),
            chargeAppliesTo: Number(chargeAppliesTo),
            chargeTimeType: Number(chargeTimeType),
            chargeCalculationType: Number(chargeCalculationType),
            ...(chargePaymentMode ? { chargePaymentMode: Number(chargePaymentMode) } : {}),
            ...(taxGroupId ? { taxGroupId: Number(taxGroupId) } : {}),
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
                        <div>
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(x => ({ ...x, name: '' })); }}
                                placeholder="e.g. Registration Fee"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Currency *</label>
                            <select
                                value={currencyCode}
                                onChange={(e) => { setCurrencyCode(e.target.value); if (errors.currencyCode) setErrors(x => ({ ...x, currencyCode: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select currency…</option>
                                {currencyOptions.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.currencyCode && <p className="text-xs text-red-500 mt-1">{errors.currencyCode}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors(x => ({ ...x, amount: '' })); }}
                                placeholder="e.g. 5000 (or % if percentage type)"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Applies To *</label>
                            <select
                                value={chargeAppliesTo}
                                onChange={(e) => { setChargeAppliesTo(e.target.value); if (errors.chargeAppliesTo) setErrors(x => ({ ...x, chargeAppliesTo: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {appliesToOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.chargeAppliesTo && <p className="text-xs text-red-500 mt-1">{errors.chargeAppliesTo}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Time Type *</label>
                            <select
                                value={chargeTimeType}
                                onChange={(e) => { setChargeTimeType(e.target.value); if (errors.chargeTimeType) setErrors(x => ({ ...x, chargeTimeType: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {timeTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.chargeTimeType && <p className="text-xs text-red-500 mt-1">{errors.chargeTimeType}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Calculation Type *</label>
                            <select
                                value={chargeCalculationType}
                                onChange={(e) => { setChargeCalculationType(e.target.value); if (errors.chargeCalculationType) setErrors(x => ({ ...x, chargeCalculationType: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {calcTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.chargeCalculationType && <p className="text-xs text-red-500 mt-1">{errors.chargeCalculationType}</p>}
                        </div>

                        {paymentModeOptions.length ? (
                            <div>
                                <label className="block text-sm font-medium">Payment Mode</label>
                                <select
                                    value={chargePaymentMode}
                                    onChange={(e) => setChargePaymentMode(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">(Default)</option>
                                    {paymentModeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                        ) : null}

                        {taxGroupOptions.length ? (
                            <div>
                                <label className="block text-sm font-medium">Tax Group</label>
                                <select
                                    value={taxGroupId}
                                    onChange={(e) => setTaxGroupId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">(None)</option>
                                    {taxGroupOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                        ) : null}

                        <div className="flex items-center gap-6">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={(e) => setActive(e.target.checked)}
                                />
                                <span className="text-sm">Active</span>
                            </label>

                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={penalty}
                                    onChange={(e) => setPenalty(e.target.checked)}
                                />
                                <span className="text-sm">Penalty</span>
                            </label>
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Charge')}
                </Button>
            </div>
        </form>
    );
};

export default ChargeForm;
