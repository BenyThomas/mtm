import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import HolidayForm from '../components/HolidayForm';
import { useNavigate } from 'react-router-dom';

const statusText = (s) => {
    if (!s) return 'PENDING';
    if (typeof s === 'string') return s;
    return s.value || s.code || s.text || 'PENDING';
};

const Holidays = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/holidays');
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(h => ({
                id: h.id,
                name: h.name,
                fromDate: h.fromDate,
                toDate: h.toDate,
                repaymentsRescheduledTo: h.repaymentsRescheduledTo,
                description: h.description,
                status: statusText(h.status),
                offices: h.offices || [],
            }));
            norm.sort((a,b)=>String(b.fromDate||'').localeCompare(String(a.fromDate||'')));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load holidays';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter(h => {
            const hay = [h.id, h.name, h.status, h.description].map(v => String(v ?? '').toLowerCase());
            return hay.some(x => x.includes(t));
        });
    }, [items, q]);

    const createHoliday = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/holidays', payload);
            addToast('Holiday created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const doDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/holidays/${deleting.id}`);
            addToast('Holiday deleted', 'success');
            setDeleting(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const activate = async (h) => {
        try {
            await api.post(`/holidays/${h.id}`, {}); // Activate
            addToast('Holiday activated', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Activate failed';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Holidays</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Holiday</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, status…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No holidays found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">From</th>
                                <th className="py-2 pr-4">To</th>
                                <th className="py-2 pr-4">Rescheduled To</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Offices</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(h => (
                                <tr key={h.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{h.id}</td>
                                    <td className="py-2 pr-4">{h.name}</td>
                                    <td className="py-2 pr-4">{h.fromDate || '—'}</td>
                                    <td className="py-2 pr-4">{h.toDate || '—'}</td>
                                    <td className="py-2 pr-4">{h.repaymentsRescheduledTo || '—'}</td>
                                    <td className="py-2 pr-4">{h.status}</td>
                                    <td className="py-2 pr-4">{(h.offices || []).map(o=>o.name).join(', ') || '—'}</td>
                                    <td className="py-2 pr-4 space-x-2 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/config/holidays/${h.id}`)}>View / Edit</Button>
                                        {h.status !== 'ACTIVE' && <Button onClick={() => activate(h)}>Activate</Button>}
                                        <Button variant="danger" onClick={() => setDeleting(h)}>Delete</Button>
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
                title="New Holiday"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <HolidayForm onSubmit={createHoliday} submitting={createBusy} />
            </Modal>

            {/* Delete modal */}
            <Modal
                open={!!deleting}
                title="Delete Holiday"
                onClose={() => setDeleting(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
                        <Button variant="danger" onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">Delete holiday <strong>{deleting?.name}</strong>?</p>
            </Modal>
        </div>
    );
};

export default Holidays;
