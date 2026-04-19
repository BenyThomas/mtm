import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const pretty = (value) => JSON.stringify(value, null, 2);
const dateISO = () => new Date().toISOString().slice(0, 10);

const ENDPOINT_OPTIONS = [
    { value: 'loan', label: 'Loan Command' },
    { value: 'transactions', label: 'Loan Transaction Command' },
    { value: 'charges', label: 'Loan Charge Command' },
];

const COMMANDS = [
    {
        value: 'reschedule',
        label: 'Reschedule Loan',
        endpoint: 'loan',
        template: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', rescheduleFromDate: date, note: note || undefined }),
    },
    {
        value: 'waiveInterest',
        label: 'Waive Interest',
        endpoint: 'transactions',
        template: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, transactionAmount: amount ? Number(amount) : undefined, note: note || undefined }),
    },
    {
        value: 'writeoff',
        label: 'Write Off',
        endpoint: 'loan',
        template: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, note: note || undefined }),
    },
    {
        value: 'undowriteoff',
        label: 'Undo Write Off',
        endpoint: 'transactions',
        template: () => ({}),
    },
    {
        value: 'undoWaiveInterest',
        label: 'Undo Interest Waiver',
        endpoint: 'transactions',
        template: () => ({}),
    },
    {
        value: 'prepayLoan',
        label: 'Prepay / Foreclose',
        endpoint: 'transactions',
        template: ({ date, amount, note, paymentTypeId, externalId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, transactionAmount: amount ? Number(amount) : undefined, paymentTypeId: paymentTypeId ? Number(paymentTypeId) : undefined, externalId: externalId || undefined, note: note || undefined }),
    },
    {
        value: 'close-rescheduled',
        label: 'Close As Rescheduled',
        endpoint: 'loan',
        template: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, note: note || undefined }),
    },
    {
        value: 'close',
        label: 'Close Loan',
        endpoint: 'loan',
        template: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', closedOnDate: date, note: note || undefined }),
    },
    {
        value: 'waiveLoanCharge',
        label: 'Waive Loan Charge',
        endpoint: 'charges',
        template: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, amount: amount ? Number(amount) : undefined, note: note || undefined }),
    },
    {
        value: 'payLoanCharge',
        label: 'Pay Loan Charge',
        endpoint: 'charges',
        template: ({ date, amount, note, paymentTypeId, externalId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, amount: amount ? Number(amount) : undefined, paymentTypeId: paymentTypeId ? Number(paymentTypeId) : undefined, externalId: externalId || undefined, note: note || undefined }),
    },
    {
        value: 'waivePenalty',
        label: 'Waive Penalty',
        endpoint: 'charges',
        template: ({ date, amount, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transactionDate: date, amount: amount ? Number(amount) : undefined, note: note || undefined }),
    },
    {
        value: 'custom',
        label: 'Custom Command',
        endpoint: 'loan',
        template: () => ({}),
    },
];

const parseError = (e, fallback) =>
    e?.response?.data?.errors?.[0]?.defaultUserMessage ||
    e?.response?.data?.defaultUserMessage ||
    e?.response?.data?.message ||
    fallback;

const LoanAdvancedActionModal = ({ open, loanId, paymentTypeOptions, onClose, onDone }) => {
    const { addToast } = useToast();
    const [command, setCommand] = useState(COMMANDS[0].value);
    const [date, setDate] = useState(dateISO());
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentTypeId, setPaymentTypeId] = useState('');
    const [externalId, setExternalId] = useState('');
    const [chargeId, setChargeId] = useState('');
    const [endpointKind, setEndpointKind] = useState(COMMANDS[0].endpoint);
    const [customCommand, setCustomCommand] = useState('');
    const [payloadText, setPayloadText] = useState('{}');
    const [busy, setBusy] = useState(false);

    const commandMeta = useMemo(
        () => COMMANDS.find((item) => item.value === command) || COMMANDS[0],
        [command]
    );

    useEffect(() => {
        if (!open) return;
        setCommand(COMMANDS[0].value);
        setDate(dateISO());
        setAmount('');
        setNote('');
        setPaymentTypeId('');
        setExternalId('');
        setChargeId('');
        setEndpointKind(COMMANDS[0].endpoint);
        setCustomCommand('');
    }, [open, loanId]);

    useEffect(() => {
        if (!open) return;
        if (command !== 'custom') {
            setEndpointKind(commandMeta.endpoint);
        }
        setPayloadText(pretty(commandMeta.template({ date, amount, note, paymentTypeId, externalId })));
    }, [open, command, commandMeta, date, amount, note, paymentTypeId, externalId]);

    if (!open || !loanId) return null;

    const submit = async () => {
        const commandName = command === 'custom' ? customCommand.trim() : command;
        if (!commandName) {
            addToast('Command is required', 'error');
            return;
        }
        if (endpointKind === 'charges' && !chargeId.trim()) {
            addToast('Charge ID is required for loan charge commands', 'error');
            return;
        }

        let payload;
        try {
            payload = JSON.parse(payloadText || '{}');
        } catch {
            addToast('Payload must be valid JSON', 'error');
            return;
        }

        setBusy(true);
        try {
            const path = endpointKind === 'transactions'
                ? `/loans/${loanId}/transactions?command=${encodeURIComponent(commandName)}`
                : endpointKind === 'charges'
                    ? `/loans/${loanId}/charges/${encodeURIComponent(chargeId.trim())}?command=${encodeURIComponent(commandName)}`
                    : `/loans/${loanId}?command=${encodeURIComponent(commandName)}`;
            await api.post(path, payload);
            addToast(`Loan command '${commandName}' executed`, 'success');
            onDone && onDone();
        } catch (e) {
            addToast(parseError(e, `Command '${commandName}' failed`), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Advanced Loan Actions" size="5xl" footer={null}>
            <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium">Action</label>
                        <select value={command} onChange={(e) => setCommand(e.target.value)} className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                            {COMMANDS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Amount</label>
                        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional amount" className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Endpoint</label>
                        <select
                            value={endpointKind}
                            onChange={(e) => setEndpointKind(e.target.value)}
                            disabled={command !== 'custom'}
                            className="mt-1 w-full border rounded-md p-2 disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {ENDPOINT_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Payment Type</label>
                        <select value={paymentTypeId} onChange={(e) => setPaymentTypeId(e.target.value)} className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Select payment type</option>
                            {(paymentTypeOptions || []).map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Charge ID</label>
                        <input
                            value={chargeId}
                            onChange={(e) => setChargeId(e.target.value)}
                            placeholder="Required for charge commands"
                            disabled={endpointKind !== 'charges'}
                            className="mt-1 w-full border rounded-md p-2 disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Custom Command</label>
                        <input
                            value={customCommand}
                            onChange={(e) => setCustomCommand(e.target.value)}
                            placeholder="Only used for Custom Command"
                            disabled={command !== 'custom'}
                            className="mt-1 w-full border rounded-md p-2 disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">External ID</label>
                        <input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="Optional external/reference id" className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Note</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>

                <div>
                    <label className="block text-sm font-medium">Request Payload</label>
                    <textarea
                        rows={14}
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                        className="mt-1 w-full rounded-md border p-3 font-mono text-xs dark:bg-gray-900 dark:border-gray-600"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Use presets for common Fineract loan actions, or switch to Custom Command to call any supported loan, transaction, or charge command with your own payload.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={submit} disabled={busy}>{busy ? 'Processing...' : 'Submit'}</Button>
                </div>
            </div>
        </Modal>
    );
};

export default LoanAdvancedActionModal;
