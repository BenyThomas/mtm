import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ReportMailingJobForm from '../components/ReportMailingJobForm';

const ReportMailingJobs = () => {
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
            const r = await api.get('/reportmailingjobs');
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(j => ({
                id: j.id,
                name: j.name,
                isActive: j.isActive ?? j.active ?? true,
                reportName: j.reportName || j.reportTitle || j.report,
                reportId: j.reportId,
                attachmentFormat: j.emailAttachmentFileFormat || j.attachmentFormat,
                recipients: j.emailRecipients || j.recipients,
                cron: j.cronExpression || j.cron || '',
                frequency: j.frequency || j.recurrence?.frequency,
                interval: j.interval || j.recurrence?.interval,
                nextRun: j.nextRunTime || j.nextFireTime || j.nextRunDateTime,
            }));
            norm.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load jobs';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter(j => {
            const hay = [j.id, j.name, j.reportName, j.recipients, j.cron, j.frequency].map(v => String(v ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [items, q]);

    const createJob = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/reportmailingjobs', payload);
            addToast('Report mailing job created', 'success');
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
            await api.delete(`/reportmailingjobs/${deleting.id}`);
            addToast('Job deleted', 'success');
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
                <h1 className="text-2xl font-bold">Report Mailing Jobs</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Job</Button>
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
                            placeholder="Name, report, recipients, cron…"
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">No report mailing jobs found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Report</th>
                                <th className="py-2 pr-4">Format</th>
                                <th className="py-2 pr-4">Active</th>
                                <th className="py-2 pr-4">Next Run</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((j) => (
                                <tr key={j.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{j.id}</td>
                                    <td className="py-2 pr-4">{j.name}</td>
                                    <td className="py-2 pr-4">{j.reportName || '—'}</td>
                                    <td className="py-2 pr-4">{j.attachmentFormat || '—'}</td>
                                    <td className="py-2 pr-4">{j.isActive ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{j.nextRun || '—'}</td>
                                    <td className="py-2 pr-4 space-x-2 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/config/report-mailing-jobs/${j.id}`)}>View / Edit</Button>
                                        <Button variant="danger" onClick={() => setDeleting(j)}>Delete</Button>
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
                title="New Report Mailing Job"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <ReportMailingJobForm onSubmit={createJob} submitting={createBusy} />
            </Modal>

            {/* Delete modal */}
            <Modal
                open={!!deleting}
                title="Delete Job"
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
                <p className="text-sm">Delete job <strong>{deleting?.name}</strong>?</p>
            </Modal>
        </div>
    );
};

export default ReportMailingJobs;
