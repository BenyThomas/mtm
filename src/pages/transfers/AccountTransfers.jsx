import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import TransferForm from '../../components/TransferForm';

const AccountTransfers = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [refundOpen, setRefundOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/accounttransfers');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((t) => ({
                id: t.id,
                transferDate: t.transferDate || t.date || t.postedOn || '',
                amount: t.transferAmount || t.amount || t.txnAmount || '',
                fromAccount: t.fromAccount?.accountNo || t.fromAccountNo || t.fromAccountId || '',
                toAccount: t.toAccount?.accountNo || t.toAccountNo || t.toAccountId || '',
                description: t.description || t.note || '',
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load transfers', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) =>
            [x.id, x.transferDate, x.amount, x.fromAccount, x.toAccount, x.description]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    const create = async (payload, isRefund = false) => {
        setBusy(true);
        try {
            const ep = isRefund ? '/accounttransfers/refundByTransfer' : '/accounttransfers';
            await api.post(ep, payload);
            addToast(isRefund ? 'Refund posted' : 'Transfer created', 'success');
            setCreateOpen(false);
            setRefundOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Action failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Account Transfers</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setRefundOpen(true)}>Refund by Transfer</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Transfer</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Date, amount, account #, note…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No transfers found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Date</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">From</th>
                                <th className="py-2 pr-4">To</th>
                                <th className="py-2 pr-4">Note</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((t) => (
                                <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{t.id}</td>
                                    <td className="py-2 pr-4">{t.transferDate || '—'}</td>
                                    <td className="py-2 pr-4">{t.amount || '—'}</td>
                                    <td className="py-2 pr-4">{t.fromAccount || '—'}</td>
                                    <td className="py-2 pr-4">{t.toAccount || '—'}</td>
                                    <td className="py-2 pr-4">{t.description || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* New Transfer */}
            <Modal
                open={createOpen}
                title="New Transfer"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <TransferForm mode="standard" onSubmit={(p) => create(p, false)} submitting={busy} />
            </Modal>

            {/* Refund by Transfer */}
            <Modal
                open={refundOpen}
                title="Refund by Transfer"
                onClose={() => setRefundOpen(false)}
                footer={null}
            >
                <TransferForm mode="refund" onSubmit={(p) => create(p, true)} submitting={busy} />
            </Modal>
        </div>
    );
};

export default AccountTransfers;
