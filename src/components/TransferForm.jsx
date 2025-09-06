import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - mode: 'standard' | 'refund'
 *  - onSubmit(payload): Promise
 *  - submitting: boolean
 *
 * Uses /accounttransfers/template (or templateRefundByTransfer for refund)
 * and sends a conservative payload:
 * {
 *   dateFormat: 'yyyy-MM-dd',
 *   locale: 'en',
 *   transferDate: 'YYYY-MM-DD',
 *   transferAmount: <number>,
 *   fromOfficeId?, fromClientId?, fromAccountType?, fromAccountId,
 *   toOfficeId?, toClientId?, toAccountType?, toAccountId,
 *   description?
 * }
 */
const TransferForm = ({ mode = 'standard', onSubmit, submitting }) => {
    const { addToast } = useToast();

    const isRefund = mode === 'refund';

    const [tplLoading, setTplLoading] = useState(true);
    const [fromAccountOptions, setFromAccountOptions] = useState([]);
    const [toAccountOptions, setToAccountOptions] = useState([]);
    const [accountTypeOptions, setAccountTypeOptions] = useState([]);

    // Fields
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [fromAccountType, setFromAccountType] = useState(''); // 2=Loan? 1=Savings? depends on template
    const [toAccountType, setToAccountType] = useState('');
    const [amount, setAmount] = useState('');
    const [transferDate, setTransferDate] = useState('');
    const [description, setDescription] = useState('');

    const [errors, setErrors] = useState({});

    const normalizeOptions = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr
            .map((o) => ({
                id: o.id ?? o.accountId ?? o.value ?? o.key,
                name: o.name ?? o.accountNo ?? o.text ?? o.label ?? `#${o.id || o.accountId}`,
            }))
            .filter((x) => x.id);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const ep = isRefund
                    ? '/accounttransfers/templateRefundByTransfer'
                    : '/accounttransfers/template';
                const r = await api.get(ep);
                const d = r?.data || {};

                const f = d?.fromAccountOptions || d?.fromAccounts || [];
                const t = d?.toAccountOptions || d?.toAccounts || [];
                const at = d?.accountTypeOptions || d?.accountTypes || [];

                if (!cancelled) {
                    setFromAccountOptions(normalizeOptions(f));
                    setToAccountOptions(normalizeOptions(t));
                    setAccountTypeOptions(
                        normalizeOptions(at).map((x) => ({
                            id: x.id,
                            name: x.name || x.label || x.text || String(x.id),
                        }))
                    );
                }
            } catch (_e) {
                if (!cancelled) {
                    setFromAccountOptions([]);
                    setToAccountOptions([]);
                    setAccountTypeOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isRefund]);

    const validate = () => {
        const e = {};
        if (!fromAccountId) e.fromAccountId = 'From account is required';
        if (!toAccountId) e.toAccountId = 'To account is required';
        if (!amount) e.amount = 'Amount is required';
        if (!transferDate) e.transferDate = 'Date is required';
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
            transferDate,
            transferAmount: Number(amount),
            fromAccountId: Number(fromAccountId),
            toAccountId: Number(toAccountId),
            ...(fromAccountType ? { fromAccountType: Number(fromAccountType) } : {}),
            ...(toAccountType ? { toAccountType: Number(toAccountType) } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="6rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* From account */}
                        <div>
                            <label className="block text-sm font-medium">From Account *</label>
                            {fromAccountOptions.length ? (
                                <select
                                    value={fromAccountId}
                                    onChange={(e) => setFromAccountId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select…</option>
                                    {fromAccountOptions.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
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

                        {/* To account */}
                        <div>
                            <label className="block text-sm font-medium">To Account *</label>
                            {toAccountOptions.length ? (
                                <select
                                    value={toAccountId}
                                    onChange={(e) => setToAccountId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select…</option>
                                    {toAccountOptions.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
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

                        {/* Account types if template provides */}
                        {accountTypeOptions.length ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium">From Account Type</label>
                                    <select
                                        value={fromAccountType}
                                        onChange={(e) => setFromAccountType(e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">(Auto)</option>
                                        {accountTypeOptions.map((x) => (
                                            <option key={x.id} value={x.id}>{x.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">To Account Type</label>
                                    <select
                                        value={toAccountType}
                                        onChange={(e) => setToAccountType(e.target.value)}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">(Auto)</option>
                                        {accountTypeOptions.map((x) => (
                                            <option key={x.id} value={x.id}>{x.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : null}

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
                            <label className="block text-sm font-medium">Date *</label>
                            <input
                                type="date"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.transferDate && <p className="text-xs text-red-500 mt-1">{errors.transferDate}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional note"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : isRefund ? 'Refund by Transfer' : 'Create Transfer'}
                </Button>
            </div>
        </form>
    );
};

export default TransferForm;
