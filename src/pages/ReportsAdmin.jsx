import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ReportForm from '../components/ReportForm';

const ReportsAdmin = () => {
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
            const res = await api.get('/reports');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            const norm = list.map(r => ({
                id: r.id,
                reportName: r.reportName || r.name,
                reportType: r.reportType || r.type,
                reportSubType: r.reportSubType || r.subType,
                reportCategory: r.reportCategory || r.category,
                coreReport: r.coreReport,
                useReport: r.useReport ?? r.use_report,
                description: r.description,
            }));
            norm.sort((a, b) => String(a.reportName || '').localeCompare(String(b.reportName || '')));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load reports';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((r) => {
            const hay = [
                r.id, r.reportName, r.reportType, r.reportCategory, r.description,
            ].map(v => String(v ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [items, q]);

    const createReport = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/reports', payload);
            addToast('Report created', 'success');
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
            await api.delete(`/reports/${deleting.id}`);
            addToast('Report deleted', 'success');
            setDeleting(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Reports (Admin)</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Report</Button>
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
                            placeholder="Name, type, category…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No reports found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Category</th>
                                <th className="py-2 pr-4">Enabled</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.reportName}</td>
                                    <td className="py-2 pr-4">{r.reportType || '—'}</td>
                                    <td className="py-2 pr-4">{r.reportCategory || '—'}</td>
                                    <td className="py-2 pr-4">{r.useReport ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/config/reports/${r.id}`)}>
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleting(r)}>Delete</Button>
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
                title="New Report"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <ReportForm onSubmit={createReport} submitting={createBusy} />
            </Modal>

            {/* Delete modal */}
            <Modal
                open={!!deleting}
                title="Delete Report"
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
                <p className="text-sm">Delete report <strong>{deleting?.reportName}</strong>?</p>
            </Modal>
        </div>
    );
};

export default ReportsAdmin;
