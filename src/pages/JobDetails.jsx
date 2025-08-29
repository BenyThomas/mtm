import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const fmt = (v) => (v ? String(v) : '—');

const JobDetails = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [history, setHistory] = useState([]);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editCron, setEditCron] = useState('');
    const [editActive, setEditActive] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/jobs/${jobId}`);
            const d = r?.data || {};
            const j = {
                id: d.id,
                name: d.displayName || d.name || d.shortName,
                shortName: d.shortName,
                cron: d.cronExpression || d.cron || '',
                active: d.active ?? d.isActive ?? false,
                nextRun: d.nextRunTime || d.nextRunDateTime,
                lastRun: d.previousRunStartTime || d.lastRunTime || d.lastRunDateTime,
                lastStatus: d.previousRunStatus || d.lastRunStatus,
                currentlyRunning: d.currentlyRunning || false,
                description: d.description || '',
            };
            setJob(j);
            setEditCron(j.cron || '');
            setEditActive(!!j.active);
        } catch (e) {
            setJob(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load job';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }

        setHistoryLoading(true);
        try {
            const h = await api.get(`/jobs/${jobId}/runhistory`);
            const list = Array.isArray(h.data) ? h.data : (h.data?.pageItems || []);
            const norm = list.map((r, idx) => ({
                id: r.id ?? idx,
                started: r.startTime || r.startedAt || r.jobRunStartTime,
                ended: r.endTime || r.endedAt || r.jobRunEndTime,
                status: r.status || r.runStatus,
                note: r.errorMessage || r.note || '',
                durationMs: r.duration || r.durationInMillis,
            }));
            norm.sort((a, b) => String(b.started || '').localeCompare(String(a.started || '')));
            setHistory(norm);
        } catch (e) {
            setHistory([]);
            // no toast needed every time; keep page readable
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [jobId]);

    const runNow = async () => {
        try {
            await api.post(`/jobs/${jobId}`);
            addToast('Job queued to run', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Run failed';
            addToast(msg, 'error');
        }
    };

    const saveEdit = async () => {
        setEditBusy(true);
        try {
            const payload = {};
            if (editCron.trim()) payload.cronExpression = editCron.trim();
            payload.active = !!editActive;
            await api.put(`/jobs/${jobId}`, payload);
            addToast('Job updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="8rem" /></Card>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Job</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/config/jobs')}>Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{job.name}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        Short name: <span className="font-mono">{fmt(job.shortName)}</span> •
                        {' '}Active: <strong>{job.active ? 'Yes' : 'No'}</strong>
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button onClick={runNow} disabled={job.currentlyRunning}>Run Now</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/jobs')}>All Jobs</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid lg:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Cron</div>
                        <div className="font-medium">{fmt(job.cron)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Next Run</div>
                        <div className="font-medium">{fmt(job.nextRun)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Last Run</div>
                        <div className="font-medium">{fmt(job.lastRun)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Last Status</div>
                        <div className="font-medium">{fmt(job.lastStatus)}</div>
                    </div>
                    {job.description ? (
                        <div className="lg:col-span-2">
                            <div className="text-gray-500">Description</div>
                            <div className="font-medium">{job.description}</div>
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* Run history */}
            <Card>
                <div className="font-semibold mb-2">Run History</div>
                {historyLoading ? (
                    <Skeleton height="10rem" />
                ) : !history.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No runs found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Started</th>
                                <th className="py-2 pr-4">Ended</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Duration (ms)</th>
                                <th className="py-2 pr-4">Note</th>
                            </tr>
                            </thead>
                            <tbody>
                            {history.map(h => (
                                <tr key={h.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{fmt(h.started)}</td>
                                    <td className="py-2 pr-4">{fmt(h.ended)}</td>
                                    <td className="py-2 pr-4">{fmt(h.status)}</td>
                                    <td className="py-2 pr-4">{fmt(h.durationMs)}</td>
                                    <td className="py-2 pr-4">{fmt(h.note)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${job.name}`}
                onClose={() => setEditOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={editBusy}>
                            {editBusy ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Cron Expression</label>
                        <input
                            value={editCron}
                            onChange={(e) => setEditCron(e.target.value)}
                            placeholder="e.g. 0 0/10 * * * ?"
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
            </Modal>
        </div>
    );
};

export default JobDetails;
