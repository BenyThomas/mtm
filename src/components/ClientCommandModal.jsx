import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const toISO = (d) => (d ? String(d).slice(0, 10) : '');

const COMMANDS = [
    {
        value: 'activate',
        label: 'Activate',
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', activationDate: date }),
    },
    {
        value: 'close',
        label: 'Close',
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', closureDate: date, closureReasonId: reasonId || undefined }),
    },
    {
        value: 'reject',
        label: 'Reject',
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', rejectionDate: date, rejectionReasonId: reasonId || undefined }),
    },
    {
        value: 'withdraw',
        label: 'Withdraw',
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', withdrawalDate: date, withdrawalReasonId: reasonId || undefined }),
    },
    {
        value: 'reactivate',
        label: 'Reactivate',
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reactivationDate: date }),
    },
    {
        value: 'undoReject',
        label: 'Undo Reject',
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reopenedDate: date }),
    },
    {
        value: 'undoWithdraw',
        label: 'Undo Withdraw',
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reopenedDate: date }),
    },
    {
        value: 'assignStaff',
        label: 'Assign Staff',
        template: ({ date, staffId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', assignmentDate: date, staffId: staffId ? Number(staffId) : undefined }),
    },
    {
        value: 'unassignStaff',
        label: 'Unassign Staff',
        template: ({ date, staffId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', unassignedDate: date, staffId: staffId ? Number(staffId) : undefined }),
    },
    {
        value: 'updateSavingsAccount',
        label: 'Update Default Savings',
        template: ({ savingsAccountId }) => ({ savingsAccountId: savingsAccountId ? Number(savingsAccountId) : undefined }),
    },
    {
        value: 'proposeTransfer',
        label: 'Propose Transfer',
        template: ({ date, officeId, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transferDate: date, destinationOfficeId: officeId ? Number(officeId) : undefined, note: note || undefined }),
    },
    {
        value: 'withdrawTransfer',
        label: 'Withdraw Transfer',
        template: ({ note }) => ({ note: note || undefined }),
    },
    {
        value: 'rejectTransfer',
        label: 'Reject Transfer',
        template: ({ note }) => ({ note: note || undefined }),
    },
    {
        value: 'acceptTransfer',
        label: 'Accept Transfer',
        template: ({ date, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transferDate: date, note: note || undefined }),
    },
    {
        value: 'proposeAndAcceptTransfer',
        label: 'Propose + Accept Transfer',
        template: ({ date, officeId, note }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', transferDate: date, destinationOfficeId: officeId ? Number(officeId) : undefined, note: note || undefined }),
    },
    {
        value: 'custom',
        label: 'Custom Command',
        template: () => ({}),
    },
];

const pretty = (value) => JSON.stringify(value, null, 2);

const parseError = (e, fallback) =>
    e?.response?.data?.errors?.[0]?.defaultUserMessage ||
    e?.response?.data?.defaultUserMessage ||
    e?.response?.data?.message ||
    fallback;

const ClientCommandModal = ({ open, client, onClose, onDone }) => {
    const { addToast } = useToast();

    const [command, setCommand] = useState('activate');
    const [date, setDate] = useState(toISO(new Date().toISOString()));
    const [note, setNote] = useState('');
    const [staffId, setStaffId] = useState('');
    const [staffOptions, setStaffOptions] = useState([]);
    const [officeId, setOfficeId] = useState('');
    const [officeOptions, setOfficeOptions] = useState([]);
    const [reasonId, setReasonId] = useState('');
    const [reasonOptions, setReasonOptions] = useState([]);
    const [savingsAccountId, setSavingsAccountId] = useState('');
    const [savingsOptions, setSavingsOptions] = useState([]);
    const [payloadText, setPayloadText] = useState('{}');
    const [customCommand, setCustomCommand] = useState('');
    const [busy, setBusy] = useState(false);

    const commandMeta = useMemo(
        () => COMMANDS.find((item) => item.value === command) || COMMANDS[0],
        [command]
    );

    useEffect(() => {
        if (!open) return;
        setCommand('activate');
        setDate(toISO(new Date().toISOString()));
        setNote('');
        setStaffId('');
        setOfficeId('');
        setReasonId('');
        setSavingsAccountId('');
        setCustomCommand('');
    }, [open, client?.id]);

    useEffect(() => {
        if (!open || !client?.id) return;
        (async () => {
            try {
                const [staffRes, officeRes, accountsRes] = await Promise.all([
                    api.get('/staff', { params: { limit: 200, offset: 0 } }).catch(() => ({ data: [] })),
                    api.get('/offices').catch(() => ({ data: [] })),
                    api.get(`/clients/${client.id}/accounts`).catch(() => ({ data: {} })),
                ]);
                const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : (staffRes?.data?.pageItems || []);
                const officeRows = Array.isArray(officeRes?.data) ? officeRes.data : (officeRes?.data?.pageItems || []);
                const savingsRows = Array.isArray(accountsRes?.data?.savingsAccounts) ? accountsRes.data.savingsAccounts : [];
                setStaffOptions(staffRows.map((s) => ({
                    id: s.id,
                    name: s.displayName || [s.firstname, s.lastname].filter(Boolean).join(' ') || s.name || `#${s.id}`,
                })));
                setOfficeOptions(officeRows.map((o) => ({ id: o.id, name: o.name || `Office ${o.id}` })));
                setSavingsOptions(savingsRows.map((s) => ({
                    id: s.id,
                    name: `${s.accountNo || s.id} - ${s.productName || s.savingsProductName || 'Savings'}`,
                })));
            } catch {
                setStaffOptions([]);
                setOfficeOptions([]);
                setSavingsOptions([]);
            }
        })();
    }, [open, client?.id]);

    useEffect(() => {
        if (!open) return;
        const nextPayload = commandMeta.template({
            client,
            date,
            note,
            staffId,
            officeId,
            reasonId,
            savingsAccountId,
        });
        setPayloadText(pretty(nextPayload));
    }, [open, commandMeta, client, date, note, staffId, officeId, reasonId, savingsAccountId]);

    if (!open || !client) return null;

    const submit = async () => {
        const commandName = command === 'custom' ? customCommand.trim() : command;
        if (!commandName) {
            addToast('Command is required', 'error');
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
            await api.post(`/clients/${client.id}?command=${encodeURIComponent(commandName)}`, payload);
            addToast(`Client command '${commandName}' executed`, 'success');
            onDone && onDone();
        } catch (e) {
            addToast(parseError(e, `Command '${commandName}' failed`), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={`Client Actions - ${client.displayName || client.id}`} size="5xl" footer={null}>
            <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium">Action</label>
                        <select
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {COMMANDS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
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
                    <div>
                        <label className="block text-sm font-medium">Reason ID</label>
                        <input
                            value={reasonId}
                            onChange={(e) => setReasonId(e.target.value)}
                            placeholder="Optional numeric reason"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Staff</label>
                        <select
                            value={staffId}
                            onChange={(e) => setStaffId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select staff</option>
                            {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Office</label>
                        <select
                            value={officeId}
                            onChange={(e) => setOfficeId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select office</option>
                            {officeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Savings Account</label>
                        <select
                            value={savingsAccountId}
                            onChange={(e) => setSavingsAccountId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select savings account</option>
                            {savingsOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Note</label>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional note"
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
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
                        Pick a preset command or switch to Custom Command to execute any Fineract client command with a hand-edited payload.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={submit} disabled={busy}>
                        {busy ? 'Processing...' : 'Submit'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ClientCommandModal;
