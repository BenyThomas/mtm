import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

const parseImageError = (error, fallback) => {
    const response = error?.response?.data || {};
    const first = Array.isArray(response?.errors) ? response.errors[0] : null;
    const pieces = [
        first?.defaultUserMessage,
        first?.developerMessage,
        response?.defaultUserMessage,
        response?.developerMessage,
        error?.message,
    ].map((item) => String(item || '').trim()).filter(Boolean);
    return pieces[0] || fallback;
};

const isMethodFallbackCandidate = (error) => {
    const status = Number(error?.response?.status || error?.response?.data?.httpStatusCode || 0);
    return status === 404 || status === 405;
};

const isRepositoryIssue = (message) => {
    const normalized = String(message || '').toLowerCase();
    return normalized.includes('contentrepository')
        || normalized.includes('unable to create parent directories')
        || normalized.includes('error.msg.document.save');
};

const ClientImageTab = ({ clientId }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [lastError, setLastError] = useState('');

    const hasImage = !!imageUrl;
    const repositoryUnavailable = isRepositoryIssue(lastError);

    const cleanupUrl = (url) => {
        if (url) {
            try {
                window.URL.revokeObjectURL(url);
            } catch {
                // ignore cleanup failure
            }
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/clients/${clientId}/images`, { responseType: 'blob' });
            const contentType = response?.headers?.['content-type'] || '';
            const blob = response?.data instanceof Blob
                ? response.data
                : new Blob([response.data], { type: contentType || 'image/*' });
            const nextUrl = window.URL.createObjectURL(blob);
            setImageUrl((prev) => {
                cleanupUrl(prev);
                return nextUrl;
            });
            setLastError('');
        } catch {
            setImageUrl((prev) => {
                cleanupUrl(prev);
                return '';
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        return () => cleanupUrl(imageUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const fileLabel = useMemo(() => selectedFile?.name || 'No file selected', [selectedFile]);

    const submitUpload = async () => {
        if (!selectedFile) {
            addToast('Select an image first', 'error');
            return;
        }
        setBusy(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            try {
                await api.post(`/clients/${clientId}/images`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } catch (postError) {
                if (!isMethodFallbackCandidate(postError)) {
                    throw postError;
                }
                await api.put(`/clients/${clientId}/images`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            addToast('Client image updated', 'success');
            setUploadOpen(false);
            setSelectedFile(null);
            setLastError('');
            await load();
        } catch (error) {
            const message = parseImageError(error, 'Failed to upload client image');
            setLastError(message);
            addToast(message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const removeImage = async () => {
        if (!window.confirm('Delete this client image?')) return;
        setBusy(true);
        try {
            await api.delete(`/clients/${clientId}/images`);
            addToast('Client image deleted', 'success');
            setSelectedFile(null);
            setLastError('');
            await load();
        } catch (error) {
            const message = parseImageError(error, 'Failed to delete client image');
            setLastError(message);
            addToast(message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Image</h2>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load} disabled={busy}>Refresh</Button>
                    <Button onClick={() => setUploadOpen(true)} disabled={busy}>
                        {hasImage ? 'Replace Image' : 'Upload Image'}
                    </Button>
                    {hasImage ? (
                        <Button variant="danger" onClick={removeImage} disabled={busy}>Delete</Button>
                    ) : null}
                </div>
            </div>

            {repositoryUnavailable ? (
                <Card>
                    <div className="space-y-2 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 text-sm dark:border-amber-800/70 dark:bg-amber-950/20">
                        <div className="font-semibold text-amber-900 dark:text-amber-200">Image storage is unavailable</div>
                        <div className="text-amber-800 dark:text-amber-300">
                            Fineract accepted the request but could not write the client image to its content repository.
                            This is a backend storage configuration or filesystem permission issue.
                        </div>
                        <div className="break-words text-amber-900 dark:text-amber-200">{lastError}</div>
                    </div>
                </Card>
            ) : null}

            <Card>
                {loading ? (
                    <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                        Loading image...
                    </div>
                ) : hasImage ? (
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src={imageUrl}
                            alt="Client"
                            className="max-h-96 w-auto max-w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain dark:border-slate-700 dark:bg-slate-900"
                        />
                    </div>
                ) : (
                    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No client image.
                    </div>
                )}
            </Card>

            <Modal
                open={uploadOpen}
                title={hasImage ? 'Replace Client Image' : 'Upload Client Image'}
                onClose={() => {
                    setUploadOpen(false);
                    setSelectedFile(null);
                }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => {
                            setUploadOpen(false);
                            setSelectedFile(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={submitUpload} disabled={busy}>
                            {busy ? 'Uploading...' : 'Upload'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                        className="w-full"
                    />
                    <div className="text-sm text-slate-600 dark:text-slate-300">{fileLabel}</div>
                    {lastError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                            {lastError}
                        </div>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
};

export default ClientImageTab;
