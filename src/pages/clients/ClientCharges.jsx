import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ClientChargeForm from '../../components/ClientChargeForm';
import { useToast } from '../../context/ToastContext';

const fmtDate = (d) => (Array.isArray(d) ? d.join('-') : (d || ''));

const ClientCharges = ({ clientId }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const [actionBusy, setActionBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/${clientId}/charges`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((c, i) => ({
                id: c.id || i + 1,
                name: c.name || c.chargeName || '',
                currencyCode: c.currency?.code || c.currencyCode || '',
                amount: c.amount || c.amountOrPercentage || '',
                amountOutstanding: c.amountOutstanding || c.outstandingAmount || '',
                amountWaived: c.amountWaived || 0,
                isPaid: Boolean(c.paid || c.isPaid),
                penalty: Boolean(c.penalty),
                dueDate: fmtDate(c.dueDate),
                chargeTimeType: c.chargeTimeType?.value || c.chargeTimeType || '',
                status: c.status?.value || c.status || '',
            }));
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load client charges', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId]);

    const addCharge = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/clients/${clientId}/charges`, payload);
            addToast('Charge added', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Add failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this client charge?')) return;
        try {
            await api.delete(`/clients/${clientId}/charges/${id}`);
            addToast('Charge deleted', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    const command = async (id, cmd, payload = {}) => {
        setActionBusy(true);
        try {
            // Try flexible command names (some instances use pay/waive, others paycharge/waivecharge)
            const tryOnce = (name) => api.post(`/clients/${clientId}/charges/${id}?command=${encodeURIComponent(name)}`, payload);
            try {
                await tryOnce(cmd);
            } catch {
                await tryOnce(cmd === 'pay' ? 'paycharge' : (cmd === 'waive' ? 'waivecharge' : cmd));
            }
            addToast(`Charge ${cmd} successful`, 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || `Unable to ${cmd} charge`;
            addToast(msg, 'error');
        } finally {
            setActionBusy(false);
        }
    };

    const pay = async (row) => {
        const amount = window.prompt('Enter amount to pay', String(row.amountOutstanding || row.amount || ''));
        if (amount === null) return;
        const date = window.prompt('Enter payment date (YYYY-MM-DD)', new Date().toISOString().slice(0,10));
        if (date === null) return;
        await command(row.id, 'pay', { amount: Number(amount), dateFormat: 'yyyy-MM-dd', locale: 'en', transactionDate: date, paymentDate: date });
    };

    const waive = async (row) => {
        if (!window.confirm('Waive this charge?')) return;
        await command(row.id, 'waive', { dateFormat: 'yyyy-MM-dd', locale: 'en' });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Charges</h2>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>Add Charge</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No client charges found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Due</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Outstanding</th>
                                <th className="py-2 pr-4">Waived</th>
                                <th className="py-2 pr-4">Paid?</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.name}</td>
                                    <td className="py-2 pr-4">{r.dueDate || '—'}</td>
                                    <td className="py-2 pr-4">{r.amount} {r.currencyCode}</td>
                                    <td className="py-2 pr-4">{r.amountOutstanding} {r.currencyCode}</td>
                                    <td className="py-2 pr-4">{r.amountWaived}</td>
                                    <td className="py-2 pr-4">{r.isPaid ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" disabled={actionBusy || r.isPaid} onClick={() => pay(r)}>Pay</Button>
                                        <Button variant="secondary" disabled={actionBusy || r.isPaid} onClick={() => waive(r)}>Waive</Button>
                                        <Button variant="danger" disabled={actionBusy} onClick={() => remove(r.id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={createOpen} title="Add Client Charge" onClose={() => setCreateOpen(false)} footer={null}>
                <ClientChargeForm clientId={clientId} onSubmit={addCharge} submitting={busy} />
            </Modal>
        </div>
    );
};

export default ClientCharges;
