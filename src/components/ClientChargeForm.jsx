import React, { useEffect, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const toISO = (v) => (v ? String(v).slice(0, 10) : '');

const normalize = (arr, idKey = 'id', nameKey = 'name') => {
    if (!Array.isArray(arr)) return [];
    return arr.map(o => ({
        id: o?.[idKey] ?? o?.value ?? o?.key,
        name: o?.[nameKey] ?? o?.displayName ?? o?.text ?? o?.label ?? String(o?.id ?? '')
    })).filter(x => x.id);
};

const ClientChargeForm = ({ clientId, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [chargesOptions, setChargesOptions] = useState([]);
    const [currencyCode, setCurrencyCode] = useState('');

    // fields
    const [chargeId, setChargeId] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/clients/${clientId}/charges/template`);
                const d = r?.data || {};
                const options = normalize(d?.chargeOptions || d?.charges || []);
                if (!cancelled) {
                    setChargesOptions(options);
                    setCurrencyCode(d?.currency?.code || d?.currencyCode || '');
                }
            } catch (e) {
                if (!cancelled) {
                    setChargesOptions([]);
                    setCurrencyCode('');
                    addToast('Failed to load client charge template', 'error');
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [clientId, addToast]);

    const validate = () => {
        const e = {};
        if (!chargeId) e.chargeId = 'Charge is required';
        if (!dueDate) e.dueDate = 'Due date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return addToast('Please fix validation errors', 'error');

        const payload = {
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            chargeId: Number(chargeId),
            dueDate: toISO(dueDate),
            ...(amount !== '' ? { amount: Number(amount) } : {}),
            ...(currencyCode ? { currencyCode } : {}),
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
                            <label className="block text-sm font-medium">Charge *</label>
                            <select
                                value={chargeId}
                                onChange={(e) => { setChargeId(e.target.value); if (errors.chargeId) setErrors(x => ({ ...x, chargeId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select charge…</option>
                                {chargesOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.chargeId && <p className="text-xs text-red-500 mt-1">{errors.chargeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Due Date *</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => { setDueDate(e.target.value); if (errors.dueDate) setErrors(x => ({ ...x, dueDate: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="If charge is amount-editable"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">Currency: {currencyCode || '—'}</p>
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Charge'}</Button>
            </div>
        </form>
    );
};

export default ClientChargeForm;
