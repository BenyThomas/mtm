import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - initial (optional): normalized instruction (for edit)
 *  - onSubmit(payload): Promise
 *  - submitting: boolean
 *
 * Loads /standinginstructions/template to discover server options.
 * Conservative payload (commonly accepted):
 * {
 *   dateFormat: 'yyyy-MM-dd',
 *   locale: 'en',
 *   fromAccountType, fromAccountId,
 *   toAccountType, toAccountId,
 *   amount, transferType?, priority?, validFrom?, validTill?,
 *   recurrenceType?, recurrenceInterval?, recurrenceOnDay? / recurrenceOnMonthDay?
 * }
 */
const StandingInstructionForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);

    const [fromAccountOptions, setFromAccountOptions] = useState([]);
    const [toAccountOptions, setToAccountOptions] = useState([]);
    const [accountTypeOptions, setAccountTypeOptions] = useState([]);
    const [transferTypeOptions, setTransferTypeOptions] = useState([]);
    const [priorityOptions, setPriorityOptions] = useState([]);
    const [recurrenceTypeOptions, setRecurrenceTypeOptions] = useState([]);

    // Fields
    const [fromAccountType, setFromAccountType] = useState(initial?.fromAccountType || '');
    const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId || '');
    const [toAccountType, setToAccountType] = useState(initial?.toAccountType || '');
    const [toAccountId, setToAccountId] = useState(initial?.toAccountId || '');
    const [amount, setAmount] = useState(initial?.amount || '');
    const [transferType, setTransferType] = useState(initial?.transferType || '');
    const [priority, setPriority] = useState(initial?.priority || '');
    const [validFrom, setValidFrom] = useState(initial?.validFrom || '');
    const [validTill, setValidTill] = useState(initial?.validTill || '');

    const [recurrenceType, setRecurrenceType] = useState(initial?.recurrenceType || '');
    const [recurrenceInterval, setRecurrenceInterval] = useState(initial?.recurrenceInterval || '');
    const [recurrenceOnDay, setRecurrenceOnDay] = useState(initial?.recurrenceOnDay || '');

    const [errors, setErrors] = useState({});

    const normalize = (arr, idKey = 'id', nameKey = 'name') => {
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
            }))
            .filter((x) => x.id);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/standinginstructions/template');
                const d = r?.data || {};
                setFromAccountOptions(normalize(d?.fromAccountOptions || d?.fromAccounts || [], 'id', 'name'));
                setToAccountOptions(normalize(d?.toAccountOptions || d?.toAccounts || [], 'id', 'name'));
                setAccountTypeOptions(normalize(d?.accountTypeOptions || d?.accountTypes || [], 'id', 'name'));
                setTransferTypeOptions(normalize(d?.transferTypeOptions || d?.transferTypes || [], 'id', 'name'));
                setPriorityOptions(normalize(d?.priorityOptions || [], 'id', 'name'));
                setRecurrenceTypeOptions(normalize(d?.recurrenceTypeOptions || [], 'id', 'name'));
            } catch (_e) {
                if (!cancelled) {
                    setFromAccountOptions([]);
                    setToAccountOptions([]);
                    setAccountTypeOptions([]);
                    setTransferTypeOptions([]);
                    setPriorityOptions([]);
                    setRecurrenceTypeOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const validate = () => {
        const e = {};
        if (!fromAccountId) e.fromAccountId = 'From account is required';
        if (!toAccountId) e.toAccountId = 'To account is required';
        if (!amount) e.amount = 'Amount is required';
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
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            fromAccountId: Number(fromAccountId),
            toAccountId: Number(toAccountId),
            ...(fromAccountType ? { fromAccountType: Number(fromAccountType) } : {}),
            ...(toAccountType ? { toAccountType: Number(toAccountType) } : {}),
            amount: Number(amount),
            ...(transferType ? { transferType: Number(transferType) } : {}),
            ...(priority ? { priority: Number(priority) } : {}),
            ...(validFrom ? { validFrom } : {}),
            ...(validTill ? { validTill } : {}),
            ...(recurrenceType ? { recurrenceType: Number(recurrenceType) } : {}),
            ...(recurrenceInterval ? { recurrenceInterval: Number(recurrenceInterval) } : {}),
            ...(recurrenceOnDay ? { recurrenceOnDay: Number(recurrenceOnDay) } : {}),
        };
        await onSubmit(payload);
    };

    const numberRange = (start, end) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="8rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* From account/type */}
                        <div>
                            <label className="block text-sm font-medium">From Account *</label>
                            {fromAccountOptions.length ? (
                                <select
                                    value={fromAccountId}
                                    onChange={(e) => setFromAccountId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select…</option>
                                    {fromAccountOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            ) : (
                                <input
                                    value={fromAccountId}
                                    onChange={(e) => setFromAccountId(e.target.value)}
                                    placeholder="Enter account ID"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            )}
                            {errors.fromAccountId && <p className="text-xs text-red-500 mt-1">{errors.fromAccountId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">From Account Type</label>
                            <select
                                value={fromAccountType}
                                onChange={(e) => setFromAccountType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Auto)</option>
                                {accountTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        {/* To account/type */}
                        <div>
                            <label className="block text-sm font-medium">To Account *</label>
                            {toAccountOptions.length ? (
                                <select
                                    value={toAccountId}
                                    onChange={(e) => setToAccountId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select…</option>
                                    {toAccountOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            ) : (
                                <input
                                    value={toAccountId}
                                    onChange={(e) => setToAccountId(e.target.value)}
                                    placeholder="Enter account ID"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            )}
                            {errors.toAccountId && <p className="text-xs text-red-500 mt-1">{errors.toAccountId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">To Account Type</label>
                            <select
                                value={toAccountType}
                                onChange={(e) => setToAccountType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Auto)</option>
                                {accountTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        {/* Amount & dates */}
                        <div>
                            <label className="block text-sm font-medium">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Valid From</label>
                            <input
                                type="date"
                                value={validFrom}
                                onChange={(e) => setValidFrom(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Valid Till</label>
                            <input
                                type="date"
                                value={validTill}
                                onChange={(e) => setValidTill(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        {/* Transfer meta */}
                        <div>
                            <label className="block text-sm font-medium">Transfer Type</label>
                            <select
                                value={transferType}
                                onChange={(e) => setTransferType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Default)</option>
                                {transferTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Default)</option>
                                {priorityOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        {/* Recurrence */}
                        <div>
                            <label className="block text-sm font-medium">Recurrence Type</label>
                            <select
                                value={recurrenceType}
                                onChange={(e) => setRecurrenceType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(None)</option>
                                {recurrenceTypeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Recurrence Interval</label>
                            <input
                                type="number"
                                value={recurrenceInterval}
                                onChange={(e) => setRecurrenceInterval(e.target.value)}
                                placeholder="e.g. every 1 month"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Recurrence On Day</label>
                            <select
                                value={recurrenceOnDay}
                                onChange={(e) => setRecurrenceOnDay(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(None)</option>
                                {numberRange(1, 31).map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Instruction')}
                </Button>
            </div>
        </form>
    );
};

export default StandingInstructionForm;
