import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StaffForm from '../components/StaffForm';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const Staff = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [q, setQ] = useState('');
    const [loanOfficerOnly, setLoanOfficerOnly] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);

    // Normalize any incoming date to "YYYY-MM-DD"
    const normalizeToDateInput = (v) => {
        if (!v) return '';
        if (Array.isArray(v) && v.length >= 3) {
            const [y, m, d] = v;
            return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        if (typeof v === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
            const dt = new Date(v);
            if (!Number.isNaN(dt.getTime())) {
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            return '';
        }
        if (v instanceof Date && !Number.isNaN(v.getTime())) {
            const y = v.getFullYear();
            const m = String(v.getMonth() + 1).padStart(2, '0');
            const d = String(v.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return '';
    };

    const formatDateForCell = (yyyyMMdd) => {
        if (!yyyyMMdd) return '—';
        // Keep it simple and consistent; you can localize if needed
        return yyyyMMdd;
    };

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/staff');
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((s) => ({
                id: s.id,
                firstname: s.firstname || s.firstName || '',
                lastname: s.lastname || s.lastName || '',
                displayName: s.displayName || `${s.firstname || ''} ${s.lastname || ''}`.trim(),
                officeId: s.officeId || s.office?.id,
                officeName: s.officeName || s.office?.name,
                isLoanOfficer: Boolean(s.isLoanOfficer),
                mobileNo: s.mobileNo || '',
                externalId: s.externalId || '',
                joiningDate: normalizeToDateInput(
                    s.joiningDate ?? s.joinedDate ?? s.dateOfJoining ?? s.joiningdate
                ),
                isActive: s.isActive ?? true,
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load staff';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = items;
        if (loanOfficerOnly) list = list.filter((x) => x.isLoanOfficer);
        const t = q.trim().toLowerCase();
        if (!t) return list;
        return list.filter((s) =>
            [s.id, s.firstname, s.lastname, s.displayName, s.officeName, s.mobileNo, s.externalId, s.joiningDate]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q, loanOfficerOnly]);

    const create = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/staff', payload);
            addToast('Staff created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const downloadTemplateHref = '/api/api/v1/staff/downloadtemplate';

    const uploadTemplate = async () => {
        if (!uploadFile) {
            addToast('Choose a file to upload', 'error');
            return;
        }
        setUploadBusy(true);
        try {
            const form = new FormData();
            form.append('file', uploadFile);
            await api.post('/staff/uploadtemplate', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Template uploaded', 'success');
            setUploadOpen(false);
            setUploadFile(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Upload failed';
            addToast(msg, 'error');
        } finally {
            setUploadBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Staff</h1>
                <div className="space-x-2">
                    <a href={downloadTemplateHref} target="_blank" rel="noreferrer">
                        <Button variant="secondary">Download Template</Button>
                    </a>
                    <Button variant="secondary" onClick={() => setUploadOpen(true)}>Upload Template</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>New Staff</Button>
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
                            placeholder="Name, office, mobile, Emp. ID, joining date…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="inline-flex items-center gap-2 text-sm mt-6">
                            <input
                                type="checkbox"
                                checked={loanOfficerOnly}
                                onChange={(e) => setLoanOfficerOnly(e.target.checked)}
                            />
                            <span>Loan Officers only</span>
                        </label>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No staff found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Role</th>
                                <th className="py-2 pr-4">Mobile</th>
                                <th className="py-2 pr-4">Joining Date</th>
                                <th className="py-2 pr-4">Emp. ID</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{s.id}</td>
                                    <td className="py-2 pr-4">{s.displayName}</td>
                                    <td className="py-2 pr-4">{s.officeName || '—'}</td>
                                    <td className="py-2 pr-4">
                                        {s.isLoanOfficer ? (
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200">
                          Loan Officer
                        </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Staff
                        </span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-4">{s.mobileNo || '—'}</td>
                                    <td className="py-2 pr-4">{formatDateForCell(s.joiningDate)}</td>
                                    <td className="py-2 pr-4">{s.externalId || '—'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => navigate(`/config/staff/${s.id}`)}>
                                            View / Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Modal — wider & prettier */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New Staff"
                size="5xl"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fill in the staff details below. Fields marked with * are required.
                    </p>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <StaffForm onSubmit={create} submitting={createBusy} />
                    </div>
                </div>
            </Modal>

            {/* Upload Template modal */}
            <Modal
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                title="Upload Staff Template"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button onClick={uploadTemplate} disabled={uploadBusy}>
                            {uploadBusy ? 'Uploading…' : 'Upload'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a CSV/Excel file generated from the downloaded template format.
                    </p>
                    <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="w-full file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-sm hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Staff;
