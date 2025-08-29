import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ReportForm from '../components/ReportForm';

const ReportDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/reports/${id}`);
            const d = r?.data || {};
            setReport({
                id: d.id,
                reportName: d.reportName || d.name,
                reportType: d.reportType || d.type,
                reportSubType: d.reportSubType || d.subType,
                reportCategory: d.reportCategory || d.category,
                useReport: d.useReport ?? d.use_report,
                coreReport: d.coreReport,
                description: d.description,
                reportSql: d.reportSql || d.sql,
                reportParameters: d.reportParameters || d.parameters || [],
            });
        } catch (e) {
            setReport(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load report';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.put(`/reports/${id}`, payload);
            addToast('Report updated', 'success');
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

    if (!report) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Report</h1>
                <Card>Not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{report.reportName}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {report.reportType || '—'} {report.reportSubType ? `• ${report.reportSubType}` : ''} {report.reportCategory ? `• ${report.reportCategory}` : ''}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/reports')}>All Reports</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">ID</div>
                        <div className="font-medium">{report.id}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Enabled</div>
                        <div className="font-medium">{report.useReport ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">{report.description || '—'}</div>
                    </div>
                </div>
            </Card>

            {/* SQL */}
            <Card>
                <div className="text-sm text-gray-500 mb-2">SQL</div>
                <pre className="overflow-x-auto text-xs p-3 bg-gray-900 text-gray-100 rounded-md">
{report.reportSql || '--'}
        </pre>
            </Card>

            {/* Parameters */}
            <Card>
                <div className="text-sm text-gray-500 mb-2">Parameters</div>
                {!report.reportParameters?.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">None</div>
                ) : (
                    <ul className="list-disc pl-6 text-sm">
                        {report.reportParameters.map((p, i) => (
                            <li key={i}>{p.name || p.reportParameterName || p.parameterName}</li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${report.reportName}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <ReportForm initial={report} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default ReportDetails;
