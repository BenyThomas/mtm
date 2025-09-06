import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import StandingInstructionForm from '../../components/StandingInstructionForm';

const StandingInstructions = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/standinginstructions');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((s) => ({
                id: s.id,
                amount: s.amount || s.transferAmount || '',
                fromAccount: s.fromAccount?.accountNo || s.fromAccountNo || s.fromAccountId || '',
                toAccount: s.toAccount?.accountNo || s.toAccountNo || s.toAccountId || '',
                validFrom: s.validFrom || s.startDate || '',
                validTill: s.validTill || s.endDate || '',
                recurrenceType: s.recurrenceType?.value || s.recurrenceType || '',
                status: s.status?.value || s.status || '',
                // For edit hydration
                fromAccountId: s.fromAccountId || s.fromAccount?.id,
                toAccountId: s.toAccountId || s.toAccount?.id,
                fromAccountType: s.fromAccountType?.id || s.fromAccountType,
                toAccountType: s.toAccountType?.id || s.toAccountType,
                transferType: s.transferType?.id || s.transferType,
                priority: s.priority?.id || s.priority,
                recurrenceInterval: s.recurrenceInterval,
                recurrenceOnDay: s.recurrenceOnDay || s.recurrenceOnMonthDay,
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load standing instructions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.amount, x.fromAccount, x.toAccount, x.status, x.recurrenceType]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/standinginstructions', payload);
            addToast('Standing instruction created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = async (payload) => {
        if (!editItem) return;
        setBusy(true);
        try {
            await api.put(`/standinginstructions/${editItem.id}`, payload);
            addToast('Standing instruction updated', 'success');
            setEditItem(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (item) => {
        if (!window.confirm('Delete this standing instruction?')) return;
        try {
            await api.put(`/standinginstructions/${item.id}`, { deleted: true }); // Many instances soft-delete via PUT
            addToast('Standing instruction deleted', 'success');
            await load();
        } catch (e) {
            // If your instance requires DELETE (rare), switch to api.delete(`/standinginstructions/${item.id}`)
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Standing Instructions</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Instruction</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Amount, account #, status, recurrence…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No standing instructions found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">From</th>
                                <th className="py-2 pr-4">To</th>
                                <th className="py-2 pr-4">Valid From</th>
                                <th className="py-2 pr-4">Valid Till</th>
                                <th className="py-2 pr-4">Recurrence</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{s.id}</td>
                                    <td className="py-2 pr-4">{s.amount || '—'}</td>
                                    <td className="py-2 pr-4">{s.fromAccount || '—'}</td>
                                    <td className="py-2 pr-4">{s.toAccount || '—'}</td>
                                    <td className="py-2 pr-4">{s.validFrom || '—'}</td>
                                    <td className="py-2 pr-4">{s.validTill || '—'}</td>
                                    <td className="py-2 pr-4">{s.recurrenceType || '—'}</td>
                                    <td className="py-2 pr-4">{s.status || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => setEditItem(s)}>Edit</Button>
                                        <Button variant="danger" onClick={() => remove(s)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create modal */}
            <Modal
                open={createOpen}
                title="New Standing Instruction"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <StandingInstructionForm onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit modal */}
            <Modal
                open={!!editItem}
                title={editItem ? `Edit Standing Instruction #${editItem.id}` : 'Edit'}
                onClose={() => setEditItem(null)}
                footer={null}
            >
                {editItem ? (
                    <StandingInstructionForm initial={editItem} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default StandingInstructions;
