import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import DocumentUpload from '../../components/DocumentUpload';

const fmtSize = (bytes) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    return `${(n / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

/**
 * Props:
 * - clientId: number|string (required)
 */
const ClientDocumentsTab = ({ clientId }) => {
    const { addToast } = useToast();

    const base = useMemo(() => `/clients/${clientId}/documents`, [clientId]);

    const [loading, setLoading] = useState(true);
    const [docs, setDocs] = useState([]);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [editing, setEditing] = useState(null); // doc object
    const [editBusy, setEditBusy] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editNewFile, setEditNewFile] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(base);
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            const norm = list.map((d) => ({
                id: d.id,
                name: d.name || d.fileName || d.displayName || '',
                description: d.description || d.note || '',
                fileName: d.fileName || d.name || '',
                size: d.size || d.fileSize || d.length,
                type: d.type || d.contentType || '',
                createdOn: d.createdOn || d.createdAt || d.submittedOnDate,
            }));
            norm.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            setDocs(norm);
        } catch (e) {
            setDocs([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load documents';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [base]);

    const upload = async ({ files, name, description }) => {
        setUploading(true);
        try {
            for (const f of files) {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('name', name || f.name);
                if (description) fd.append('description', description);
                await api.post(base, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            addToast('Upload complete', 'success');
            setUploadOpen(false);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Upload failed';
            addToast(msg, 'error');
        } finally {
            setUploading(false);
        }
    };

    const download = async (doc) => {
        try {
            const res = await api.get(`${base}/${doc.id}/attachment`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: res?.headers?.['content-type'] || doc.type || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const serverName = (() => {
                const cd = res?.headers?.['content-disposition'] || '';
                const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
                return decodeURIComponent(m?.[1] || m?.[2] || '');
            })();
            a.href = url;
            a.download = serverName || doc.fileName || doc.name || 'attachment';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Download failed';
            addToast(msg, 'error');
        }
    };

    const remove = async (doc) => {
        if (!window.confirm(`Delete "${doc.name || doc.fileName}"?`)) return;
        try {
            await api.delete(`${base}/${doc.id}`);
            addToast('Document removed', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        }
    };

    const openEdit = async (doc) => {
        try {
            const res = await api.get(`${base}/${doc.id}`);
            const d = res?.data || doc;
            setEditing(d);
            setEditName(d.name || d.fileName || '');
            setEditDescription(d.description || '');
            setEditNewFile(null);
        } catch {
            setEditing(doc);
            setEditName(doc.name || doc.fileName || '');
            setEditDescription(doc.description || '');
            setEditNewFile(null);
        }
    };

    const saveEdit = async () => {
        if (!editing) return;
        setEditBusy(true);
        try {
            const fd = new FormData();
            if (editName?.trim()) fd.append('name', editName.trim());
            if (editDescription?.trim()) fd.append('description', editDescription.trim());
            if (editNewFile) fd.append('file', editNewFile);
            await api.put(`${base}/${editing.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Document updated', 'success');
            setEditing(null);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="font-semibold">Documents</div>
                <div className="space-x-2">
                    <Button onClick={() => setUploadOpen(true)}>Upload</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* List */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !docs.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No documents yet. Click “Upload”.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">File</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Size</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {docs.map((d) => (
                                <tr key={d.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{d.name || '—'}</td>
                                    <td className="py-2 pr-4">{d.fileName || '—'}</td>
                                    <td className="py-2 pr-4">{d.type || '—'}</td>
                                    <td className="py-2 pr-4">{fmtSize(d.size)}</td>
                                    <td className="py-2 pr-4">{d.description || '—'}</td>
                                    <td className="py-2 pr-4 space-x-2 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => download(d)}>Download</Button>
                                        <Button variant="secondary" onClick={() => openEdit(d)}>Edit</Button>
                                        <Button variant="danger" onClick={() => remove(d)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Upload modal */}
            <Modal
                open={uploadOpen}
                title="Upload Documents"
                onClose={() => setUploadOpen(false)}
                footer={null}
            >
                <DocumentUpload onUpload={upload} uploading={uploading} />
            </Modal>

            {/* Edit modal */}
            <Modal
                open={!!editing}
                title={`Edit Document${editing?.name ? `: ${editing.name}` : ''}`}
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
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Description</label>
                            <input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Replace File (optional)</label>
                            <input
                                type="file"
                                onChange={(e) => setEditNewFile(e.target.files?.[0] || null)}
                                className="mt-1 w-full"
                            />
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default ClientDocumentsTab;
