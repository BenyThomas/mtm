import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ReportMailingJobForm from '../components/ReportMailingJobForm';

const ReportMailingJobDetails = () => {
    const { entityId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/reportmailingjobs/${entityId}`);
            const d = r?.data || {};
            setJob({
                id: d.id,
                name: d.name,
                isActive: d.isActive ?? d.active ?? true,
                reportName: d.reportName || d.reportTitle || d.report,
                reportId: d.reportId,
                reportParameters: Array.isArray(d.reportParameters) ? d.reportParameters : [],
                emailRecipients: d.emailRecipients || d.recipients || '',
                emailSubject: d.emailSubject || d.subject || '',
                emailMessage: d.emailMessage || d.message || '',
                emailAttachmentFileFormat: d.emailAttachmentFileFormat || d.attachmentFormat,
                startDateTime: d.startDateTime || d.startDatetime || d.startAt,
                cronExpression: d.cronExpression || d.cron || '',
                frequency: d.frequency || d.recurrence?.frequency || '',
                interval: d.interval || d.recurrence?.interval || '',
                daysOfWeek: d.daysOfWeek || d.recurrence?.daysOfWeek || [],
                nextRun: d.nextRunTime || d.nextFireTime || d.nextRunDateTime,
                lastRun: d.lastRunTime || d.previousRunStartTime,
            });
        } catch (e) {
            setJob(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load job';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [entityId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.put(`/reportmailingjobs/${entityId}`, payload);
            addToast('Job updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
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
                <h1 className="text-2xl font-bold">Report Mailing Job</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/config/report-mailing-jobs')}>Back</Button>
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
                        {job.reportName || '—'} • Active: <strong>{job.isActive ? 'Yes' : 'No'}</strong>
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/report-mailing-jobs')}>All Jobs</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid lg:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Attachment Format</div>
                        <div className="font-medium">{job.emailAttachmentFileFormat || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Recipients</div>
                        <div className="font-medium break-all">{job.emailRecipients || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Next Run</div>
                        <div className="font-medium">{job.nextRun || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Last Run</div>
                        <div className="font-medium">{job.lastRun || '—'}</div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="text-gray-500">Schedule</div>
                        <div className="font-medium">
                            {job.cronExpression
                                ? <>CRON: <span className="font-mono">{job.cronExpression}</span></>
                                : (job.frequency
                                    ? `${job.frequency}${job.interval ? ` / every ${job.interval}` : ''}${Array.isArray(job.daysOfWeek) && job.daysOfWeek.length ? ` / ${job.daysOfWeek.join(',')}` : ''}`
                                    : '—')}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Params */}
            <Card>
                <div className="text-sm text-gray-500 mb-2">Report Parameters</div>
                {!job.reportParameters?.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">None</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            {job.reportParameters.map((p, i) => (
                                <tr key={i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{p.name || p.reportParameterName || p.parameterName}</td>
                                    <td className="py-2 pr-4 whitespace-pre-wrap break-all">{String(p.value ?? '')}</td>
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
                footer={null}
            >
                <ReportMailingJobForm initial={job} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default ReportMailingJobDetails;
