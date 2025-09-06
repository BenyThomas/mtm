import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const toISO = (d) => (d ? String(d).slice(0, 10) : '');

const ClientCommandModal = ({ open, client, onClose, onDone }) => {
    const { addToast } = useToast();

    const [command, setCommand] = useState('activate');
    const [date, setDate] = useState(toISO(new Date().toISOString()));
    const [note, setNote] = useState('');
    const [staffId, setStaffId] = useState('');
    const [staffOptions, setStaffOptions] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCommand('activate');
        setDate(toISO(new Date().toISOString()));
        setNote('');
        setStaffId('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        // Load staff when opening or when choosing assignStaff
        (async () => {
            try {
                const r = await api.get('/staff', { params: { limit: 200, offset: 0 } });
                const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
                setStaffOptions(list.map(s => ({ id: s.id, name: s.displayName || s.firstname ? `${s.firstname || ''} ${s.lastname || ''}`.trim() : s.name || `#${s.id}` })));
            } catch {
                setStaffOptions([]);
            }
        })();
    }, [open]);

    if (!open || !client) return null;

    const fields = (() => {
        if (command === 'activate') return ['date', 'note'];
        if (command === 'close') return ['date', 'note'];
        if (command === 'assignStaff') return ['date', 'staffId', 'note'];
        if (command === 'unassignStaff') return ['date', 'note'];
        return [];
    })();

    const submit = async () => {
        setBusy(true);
        try {
            const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
            if (fields.includes('date')) payload.activationDate = date; // default key; map below per command
            if (fields.includes('note') && note) payload.note = note;
            if (fields.includes('staffId')) payload.staffId = Number(staffId);

            // key mapping per command
            if (command === 'close') {
                payload.closureDate = date;
                delete payload.activationDate;
            }
            if (command === 'unassignStaff') {
                payload.unassignedDate = date;
                delete payload.activationDate;
            }
            if (command === 'assignStaff') {
                payload.assignmentDate = date;
                delete payload.activationDate;
            }

            await api.post(`/clients/${client.id}?command=${encodeURIComponent(command)}`, payload);
            addToast(`Command '${command}' executed`, 'success');
            onDone && onDone();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || `Command '${command}' failed`;
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={`Client Actions — ${client.displayName || client.id}`} footer={null}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Action</label>
                    <select
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="activate">Activate</option>
                        <option value="close">Close</option>
                        <option value="assignStaff">Assign Staff</option>
                        <option value="unassignStaff">Unassign Staff</option>
                        {/* You can add: reject, withdraw, reactivate, undoreject, undowithdraw, transfer actions, etc. */}
                    </select>
                </div>

                {fields.includes('date') && (
                    <div>
                        <label className="block text-sm font-medium">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                )}

                {fields.includes('staffId') && (
                    <div>
                        <label className="block text-sm font-medium">Staff *</label>
                        <select
                            value={staffId}
                            onChange={(e) => setStaffId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select staff…</option>
                            {staffOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {fields.includes('note') && (
                    <div>
                        <label className="block text-sm font-medium">Note</label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional note"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={submit} disabled={busy || (fields.includes('staffId') && !staffId)}>
                        {busy ? 'Processing…' : 'Submit'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ClientCommandModal;
