import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { ArrowRightLeft, CheckCircle, PiggyBank, RotateCcw, Trash2, Undo2, UserMinus, UserPlus, XCircle } from 'lucide-react';

const toISO = (d) => (d ? String(d).slice(0, 10) : '');

const actionTileClass = (selected, tone = 'slate') => {
    const toneClass =
        tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300'
            : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300'
                : tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300'
                    : tone === 'cyan' ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-900/20 dark:text-cyan-300'
                        : tone === 'violet' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-900/20 dark:text-violet-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200';

    const selectedClass = selected
        ? 'ring-2 ring-[var(--tenant-primary)] ring-offset-2 dark:ring-offset-slate-900'
        : 'hover:-translate-y-[1px] hover:shadow-sm';

    return `flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all ${toneClass} ${selectedClass}`;
};

const COMMANDS = [
    {
        value: 'activate',
        label: 'Activate',
        description: 'Activate the client account using the selected date.',
        icon: CheckCircle,
        tone: 'emerald',
        fields: ['date'],
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', activationDate: date }),
    },
    {
        value: 'close',
        label: 'Close',
        description: 'Close the client account. Add a closure reason when needed.',
        icon: XCircle,
        tone: 'rose',
        fields: ['date', 'reasonId'],
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', closureDate: date, closureReasonId: reasonId || undefined }),
    },
    {
        value: 'reject',
        label: 'Reject',
        description: 'Reject the client and optionally record a rejection reason.',
        icon: XCircle,
        tone: 'rose',
        fields: ['date', 'reasonId'],
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', rejectionDate: date, rejectionReasonId: reasonId || undefined }),
    },
    {
        value: 'withdraw',
        label: 'Withdraw',
        description: 'Withdraw the client application and optionally record a reason.',
        icon: Undo2,
        tone: 'amber',
        fields: ['date', 'reasonId'],
        template: ({ date, reasonId }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', withdrawalDate: date, withdrawalReasonId: reasonId || undefined }),
    },
    {
        value: 'reactivate',
        label: 'Reactivate',
        description: 'Reopen the client account with the selected reactivation date.',
        icon: RotateCcw,
        tone: 'emerald',
        fields: ['date'],
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reactivationDate: date }),
    },
    {
        value: 'undoReject',
        label: 'Undo Reject',
        description: 'Reopen a previously rejected client.',
        icon: RotateCcw,
        tone: 'amber',
        fields: ['date'],
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reopenedDate: date }),
    },
    {
        value: 'undoWithdraw',
        label: 'Undo Withdraw',
        description: 'Reopen a previously withdrawn client.',
        icon: RotateCcw,
        tone: 'amber',
        fields: ['date'],
        template: ({ date }) => ({ locale: 'en', dateFormat: 'yyyy-MM-dd', reopenedDate: date }),
    },
    {
        value: 'assignStaff',
        label: 'Assign Staff',
        description: 'Assign a staff member to manage this client.',
        icon: UserPlus,
        tone: 'violet',
        fields: ['staffId'],
        template: ({ staffId }) => ({ staffId: staffId ? Number(staffId) : undefined }),
    },
    {
        value: 'unassignStaff',
        label: 'Unassign Staff',
        description: 'Remove the assigned staff member from this client.',
        icon: UserMinus,
        tone: 'amber',
        fields: [],
        template: () => ({}),
    },
    {
        value: 'updateSavingsAccount',
        label: 'Update Default Savings',
        description: 'Select which savings account should be linked as the default.',
        icon: PiggyBank,
        tone: 'cyan',
        fields: ['savingsAccountId'],
        template: ({ savingsAccountId }) => ({ savingsAccountId: savingsAccountId ? Number(savingsAccountId) : undefined }),
    },
    {
        value: 'proposeTransfer',
        label: 'Propose Transfer',
        description: 'Propose transferring this client to another office.',
        icon: ArrowRightLeft,
        tone: 'slate',
        fields: ['officeId', 'note'],
        template: ({ officeId, note }) => ({ destinationOfficeId: officeId ? Number(officeId) : undefined, note: note || undefined }),
    },
    {
        value: 'withdrawTransfer',
        label: 'Withdraw Transfer',
        description: 'Withdraw a transfer request for this client.',
        icon: Undo2,
        tone: 'amber',
        fields: ['note'],
        template: ({ note }) => ({ note: note || undefined }),
    },
    {
        value: 'rejectTransfer',
        label: 'Reject Transfer',
        description: 'Reject a pending transfer request.',
        icon: XCircle,
        tone: 'rose',
        fields: ['note'],
        template: ({ note }) => ({ note: note || undefined }),
    },
    {
        value: 'acceptTransfer',
        label: 'Accept Transfer',
        description: 'Accept a pending transfer into this office.',
        icon: CheckCircle,
        tone: 'emerald',
        fields: ['note'],
        template: ({ note }) => ({ note: note || undefined }),
    },
    {
        value: 'proposeAndAcceptTransfer',
        label: 'Propose + Accept Transfer',
        description: 'Transfer the client immediately to another office.',
        icon: ArrowRightLeft,
        tone: 'cyan',
        fields: ['officeId', 'note'],
        template: ({ officeId, note }) => ({ destinationOfficeId: officeId ? Number(officeId) : undefined, note: note || undefined }),
    },
    {
        value: 'delete',
        label: 'Delete',
        description: 'Permanently delete the client record if the backend allows it.',
        icon: Trash2,
        tone: 'rose',
        fields: [],
        template: () => ({}),
    },
];

const parseError = (e, fallback) =>
    e?.response?.data?.errors?.[0]?.defaultUserMessage ||
    e?.response?.data?.defaultUserMessage ||
    e?.response?.data?.message ||
    fallback;

const ClientCommandModal = ({ open, client, onClose, onDone, initialCommand = 'activate', lockCommand = false }) => {
    const { addToast } = useToast();

    const [command, setCommand] = useState('activate');
    const [date, setDate] = useState(toISO(new Date().toISOString()));
    const [note, setNote] = useState('');
    const [staffId, setStaffId] = useState('');
    const [staffOptions, setStaffOptions] = useState([]);
    const [officeId, setOfficeId] = useState('');
    const [officeOptions, setOfficeOptions] = useState([]);
    const [reasonId, setReasonId] = useState('');
    const [savingsAccountId, setSavingsAccountId] = useState('');
    const [savingsOptions, setSavingsOptions] = useState([]);
    const [busy, setBusy] = useState(false);

    const commandMeta = useMemo(
        () => COMMANDS.find((item) => item.value === command) || COMMANDS[0],
        [command]
    );

    useEffect(() => {
        if (!open) return;
        setCommand(initialCommand || 'activate');
        setDate(toISO(new Date().toISOString()));
        setNote('');
        setStaffId('');
        setOfficeId('');
        setReasonId('');
        setSavingsAccountId('');
    }, [open, client?.id, initialCommand]);

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

    if (!open || !client) return null;

    const submit = async () => {
        const commandName = command;
        if (!commandName) {
            addToast('Command is required', 'error');
            return;
        }
        if (commandMeta.fields.includes('staffId') && !staffId) {
            addToast('Staff is required for this action', 'error');
            return;
        }
        if (commandMeta.fields.includes('officeId') && !officeId) {
            addToast('Office is required for this action', 'error');
            return;
        }
        if (commandMeta.fields.includes('savingsAccountId') && !savingsAccountId) {
            addToast('Savings account is required for this action', 'error');
            return;
        }
        const payload = commandMeta.template({
            client,
            date,
            note,
            staffId,
            officeId,
            reasonId,
            savingsAccountId,
        });

        setBusy(true);
        try {
            if (commandName === 'delete') {
                if (!window.confirm(`Delete client ${client.displayName || client.id}?`)) {
                    setBusy(false);
                    return;
                }
                await api.delete(`/clients/${client.id}`);
            } else {
                await api.post(`/clients/${client.id}?command=${encodeURIComponent(commandName)}`, payload);
            }
            addToast(`Client command '${commandName}' executed`, 'success');
            onDone && onDone();
        } catch (e) {
            addToast(parseError(e, `Command '${commandName}' failed`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const showField = (field) => commandMeta.fields.includes(field);

    return (
        <Modal open={open} onClose={onClose} title={`Client Actions - ${client.displayName || client.id}`} size="4xl" footer={null}>
            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-800/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Client</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{client.displayName || client.id}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {client.status?.value || client.status?.code || 'Client'}{client.officeName ? ` • ${client.officeName}` : ''}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                    <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70">
                        <label className="block text-sm font-medium">{lockCommand ? 'Action' : 'Select Action'}</label>
                        {lockCommand ? (
                            <>
                                <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-50">
                                    {commandMeta.label}
                                </div>
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{commandMeta.description}</div>
                            </>
                        ) : (
                            <>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {COMMANDS.map((item) => {
                                        const Icon = item.icon;
                                        const selected = item.value === command;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => setCommand(item.value)}
                                                className={actionTileClass(selected, item.tone)}
                                            >
                                                <Icon size={22} strokeWidth={2.4} />
                                                <div className="text-xs font-semibold uppercase tracking-wide">{item.label}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{commandMeta.description}</div>
                            </>
                        )}
                    </div>

                    <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/70 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20">
                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">What Will Happen</div>
                        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                            {commandMeta.label} will be submitted directly to the mapped Fineract client using the form values below.
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {showField('date') ? (
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70">
                            <label className="block text-sm font-medium">Effective Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-2 w-full rounded-xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    ) : null}

                    {showField('reasonId') ? (
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70">
                            <label className="block text-sm font-medium">Reason</label>
                            <input
                                value={reasonId}
                                onChange={(e) => setReasonId(e.target.value)}
                                placeholder="Enter reason code or identifier if required"
                                className="mt-2 w-full rounded-xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    ) : null}

                    {showField('staffId') ? (
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70">
                            <label className="block text-sm font-medium">Staff</label>
                            <select
                                value={staffId}
                                onChange={(e) => setStaffId(e.target.value)}
                                className="mt-2 w-full rounded-xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select staff</option>
                                {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    ) : null}

                    {showField('officeId') ? (
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70">
                            <label className="block text-sm font-medium">Destination Office</label>
                            <select
                                value={officeId}
                                onChange={(e) => setOfficeId(e.target.value)}
                                className="mt-2 w-full rounded-xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select office</option>
                                {officeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    ) : null}

                    {showField('savingsAccountId') ? (
                        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/70 md:col-span-2">
                            <label className="block text-sm font-medium">Default Savings Account</label>
                            <select
                                value={savingsAccountId}
                                onChange={(e) => setSavingsAccountId(e.target.value)}
                                className="mt-2 w-full rounded-xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select savings account</option>
                                {savingsOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    ) : null}
                </div>

                {showField('note') ? (
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <textarea
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional note for this action"
                            className="mt-2 w-full rounded-2xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                ) : null}

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
