import React, { useMemo, useState } from 'react';
import useOffices from '../hooks/useOffices';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import OfficeForm from '../components/OfficeForm';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Offices = () => {
    const { offices, loading, reload } = useOffices();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Filters/search
    const [q, setQ] = useState('');

    // Create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    // Upload template
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);

    // External ID quick open
    const [externalId, setExternalId] = useState('');

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return offices;
        return offices.filter(o => {
            const hay = [o.id, o.name, o.parentName, o.externalId, o.openingDate, o.hierarchy]
                .map(v => String(v ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [offices, q]);

    const createOffice = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/offices', payload);
            addToast('Office created', 'success');
            setCreateOpen(false);
            await reload();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const downloadTemplateHref = '/api/api/v1/offices/downloadtemplate'; // proxied by Vite

    const uploadTemplate = async () => {
        if (!uploadFile) {
            addToast('Choose a file to upload', 'error');
            return;
        }
        setUploadBusy(true);
        try {
            const form = new FormData();
            form.append('file', uploadFile);
            await api.post('/offices/uploadtemplate', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Template uploaded', 'success');
            setUploadOpen(false);
            setUploadFile(null);
            await reload();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Upload failed';
            addToast(msg, 'error');
        } finally {
            setUploadBusy(false);
        }
    };

    const openByExternalId = async () => {
        const id = externalId.trim();
        if (!id) {
            addToast('Enter an External ID', 'error');
            return;
        }
        try {
            // Verify exists then navigate to dedicated route
            await api.get(`/offices/external-id/${encodeURIComponent(id)}`);
            navigate(`/config/offices/external/${encodeURIComponent(id)}`);
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Office not found for that External ID';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Offices</h1>
                <div className="space-x-2">
                    <a href={downloadTemplateHref} target="_blank" rel="noreferrer">
                        <Button variant="secondary">Download Template</Button>
                    </a>
                    <Button variant="secondary" onClick={() => setUploadOpen(true)}>Upload Template</Button>
                    <Button variant="secondary" onClick={reload}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Office</Button>
                </div>
            </div>

            {/* Filters + External ID quick open */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, parent, external id, hierarchy…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Open by External ID</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="External ID"
                                className="flex-1 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <Button variant="secondary" onClick={openByExternalId}>Open</Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No offices found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Parent</th>
                                <th className="py-2 pr-4">External ID</th>
                                <th className="py-2 pr-4">Opening Date</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((o) => (
                                <tr key={o.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{o.id}</td>
                                    <td className="py-2 pr-4">{o.name}</td>
                                    <td className="py-2 pr-4">{o.parentName || '-'}</td>
                                    <td className="py-2 pr-4">{o.externalId || '-'}</td>
                                    <td className="py-2 pr-4">{o.openingDate || '-'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/offices/${o.id}`)}>
                                            View / Edit
                                        </Button>
                                        {o.externalId ? (
                                            <Button variant="secondary" onClick={() => navigate(`/offices/external/${encodeURIComponent(o.externalId)}`)}>
                                                Open by Ext
                                            </Button>
                                        ) : null}
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
                title="New Office"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <OfficeForm onSubmit={createOffice} submitting={createBusy} />
            </Modal>

            {/* Upload template modal */}
            <Modal
                open={uploadOpen}
                title="Upload Offices Template"
                onClose={() => setUploadOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button onClick={uploadTemplate} disabled={uploadBusy}>
                            {uploadBusy ? 'Uploading…' : 'Upload'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a CSV/Excel file using the downloaded template format.
                    </p>
                    <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="w-full"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Offices;
