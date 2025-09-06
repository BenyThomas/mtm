import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Modal from './Modal';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - open, onClose
 *  - tellerId, cashierId
 *  - mode: 'allocate' | 'settle'
 *  - onDone: callback after success
 *
 * Attempts to read /transactions/template for currencies/payment types.
 * Sends only filled fields to avoid "unsupported" errors.
 */
const CashMovementModal = ({ open, onClose, tellerId, cashierId, mode, onDone }) => {
    const { addToast } = useToast();
    const [tplLoading, setTplLoading] = useState(true);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [paymentTypes, setPaymentTypes] = useState([]);

    const [amount, setAmount] = useState('');
    const [txnDate, setTxnDate] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');
    const [paymentTypeId, setPaymentTypeId] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/tellers/${tellerId}/cashiers/${cashierId}/transactions/template`);
                const d = r?.data || {};
                const cur =
                    d?.currencyOptions || d?.currencies || d?.currency || [];
                const pay =
                    d?.paymentTypeOptions || d?.paymentTypes || [];
                const curList = Array.isArray(cur) ? cur : [];
                const payList = Array.isArray(pay) ? pay : [];
                if (!cancelled) {
                    setCurrencyOptions(curList.map((c) => c.code || c.currencyCode || c.name || c.value).filter(Boolean));
                    setPaymentTypes(payList.map((p) => ({ id: p.id ?? p.value ?? p.key, name: p.name ?? p.text ?? p.label ?? `#${p.id}` })).filter((x) => x.id));
                }
            } catch (_e) {
                if (!cancelled) {
                    setCurrencyOptions([]);
                    setPaymentTypes([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, tellerId, cashierId]);

    const title = mode === 'settle' ? 'Settle Cash From Cashier' : 'Allocate Cash To Cashier';
    const endpoint = mode === 'settle' ? 'settle' : 'allocate';

    const submit = async () => {
        if (!amount) {
            addToast('Amount is required', 'error');
            return;
        }
        setBusy(true);
        try {
            const payload = {
                txnAmount: Number(amount),
                ...(txnDate ? { txnDate, dateFormat: 'yyyy-MM-dd', locale: 'en' } : { locale: 'en' }),
                ...(currencyCode ? { currencyCode } : {}),
                ...(paymentTypeId ? { paymentTypeId: Number(paymentTypeId) } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
            };
            await api.post(`/tellers/${tellerId}/cashiers/${cashierId}/${endpoint}`, payload);
            addToast(mode === 'settle' ? 'Cash settled' : 'Cash allocated', 'success');
            onClose();
            onDone?.();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Action failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={busy}>{busy ? 'Processing…' : (mode === 'settle' ? 'Settle' : 'Allocate')}</Button>
                </>
            }
        >
            {tplLoading ? (
                <Skeleton height="6rem" />
            ) : (
                <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Date</label>
                            <input
                                type="date"
                                value={txnDate}
                                onChange={(e) => setTxnDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Currency</label>
                            <select
                                value={currencyCode}
                                onChange={(e) => setCurrencyCode(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(Default)</option>
                                {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Type</label>
                            <select
                                value={paymentTypeId}
                                onChange={(e) => setPaymentTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">(None)</option>
                                {paymentTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Optional"
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default CashMovementModal;
