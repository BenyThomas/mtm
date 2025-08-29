import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const fmt = (v) => (v ? String(v) : '—');

const SchedulerJobs = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [editing, setEditing] = useState(null);      // job
    const [editBusy, setEditBusy] = useState(false);
    const [editCron, setEditCron] = useState('');
    const [editActive, setEditActive] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/jobs');
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(j => ({
                id: j.id,
                name: j.displayName || j.name || j.shortName,
                shortName: j.shortName,
                cron: j.cronExpression || j.cron || '',
                active: j.active ?? j.isActive ?? false,
                nextRun: j.nextRunTime || j.nextRunDateTime,
                lastRun: j.previousRunStartTime || j.lastRunTime || j.lastRunDateTime,
                lastStatus: j.previousRunStatus || j.lastRunStatus,
                currentlyRunning: j.currentlyRunning || false,
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
            const hay = [j.id, j.name, j.shortName, j.cron, j.lastStatus].map(v => String(v ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [items, q]);

    const runNow = async (job) => {
        try {
            // Either /jobs/{id} (POST) or /jobs/short-name/{shortName} (POST). We’ll use id.
            await api.post(`/jobs/${job.id}`);
            addToast(`"${job.name}" queued to run`, 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Run failed';
            addToast(msg, 'error');
        }
    };

    const toggleActive = async (job, next) => {
        try {
            await api.put(`/jobs/${job.id}`, { active: !!next });
            addToast(`"${job.name}" ${next ? 'activated' : 'deactivated'}`, 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        }
    };

    const openEdit = (job) => {
        setEditing(job);
        setEditCron(job.cron || '');
        setEditActive(!!job.active);
    };

    const saveEdit = async () => {
        if (!editing) return;
        setEditBusy(true);
        try {
            const payload = {};
            if (editCron.trim()) payload.cronExpression = editCron.trim();
            payload.active = !!editActive;
            await api.put(`/jobs/${editing.id}`, payload);
            addToast('Job updated', 'success');
            setEditing(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Scheduler Jobs</h1>
                <div className="space-x-2">
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
                            placeholder="Name, short name, cron, status…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="14rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No jobs found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Short Name</th>
                                <th className="py-2 pr-4">Cron</th>
                                <th className="py-2 pr-4">Active</th>
                                <th className="py-2 pr-4">Last Run</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Next Run</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((j) => (
                                <tr key={j.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{j.id}</td>
                                    <td className="py-2 pr-4">{j.name}</td>
                                    <td className="py-2 pr-4">{fmt(j.shortName)}</td>
                                    <td className="py-2 pr-4">{fmt(j.cron)}</td>
                                    <td className="py-2 pr-4">{j.active ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{fmt(j.lastRun)}</td>
                                    <td className="py-2 pr-4">{fmt(j.lastStatus)}</td>
                                    <td className="py-2 pr-4">{fmt(j.nextRun)}</td>
                                    <td className="py-2 pr-4 space-x-2 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/config/jobs/${j.id}`)}>Details</Button>
                                        <Button variant="secondary" onClick={() => openEdit(j)}>Edit</Button>
                                        <Button onClick={() => runNow(j)} disabled={j.currentlyRunning}>Run Now</Button>
                                        <Button variant={j.active ? 'danger' : 'secondary'} onClick={() => toggleActive(j, !j.active)}>
                                            {j.active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={!!editing}
                title={editing ? `Edit: ${editing.name}` : 'Edit Job'}
                onClose={() => setEditing(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={editBusy}>{editBusy ? 'Saving…' : 'Save'}</Button>
                    </>
                }
            >
                {editing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Cron Expression</label>
                            <input
                                value={editCron}
                                onChange={(e) => setEditCron(e.target.value)}
                                placeholder="e.g. 0 0/5 * * * ?"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-1">Quartz Cron format.</p>
                        </div>
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editActive}
                                onChange={(e) => setEditActive(e.target.checked)}
                            />
                            Active
                        </label>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default SchedulerJobs;
