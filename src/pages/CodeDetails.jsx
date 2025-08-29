import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import CodeForm from '../components/CodeForm';

const CodeDetails = () => {
    const { codeId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/codes/${codeId}`);
            setCode(res?.data || null);
        } catch (err) {
            setCode(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load code';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [codeId]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/codes/${codeId}`, payload);
            addToast('Code updated', 'success');
            setEditOpen(false);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    const remove = async () => {
        setDeleteBusy(true);
        try {
            await api.delete(`/codes/${codeId}`);
            addToast('Code deleted', 'success');
            navigate('/config/codes', { replace: true });
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
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

    if (!code) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Code</h1>
                <Card>Not found.</Card>
            </div>
        );
    }

    const isSystem = Boolean(code.systemDefined);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Code #{code.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {code.name} {isSystem ? '• System' : ''}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => navigate(`/config/codes/${code.id}/values`)}>
                        Manage Values
                    </Button>
                    <Button variant="secondary" onClick={() => setEditOpen(true)} disabled={isSystem}>
                        Edit
                    </Button>
                    <Button variant="danger" onClick={remove} disabled={isSystem || deleteBusy}>
                        {deleteBusy ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Name</div>
                        <div className="font-medium">{code.name}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">System Defined</div>
                        <div className="font-medium">{isSystem ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">{code.description || '—'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit "${code.name}"`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <CodeForm initial={code} onSubmit={update} submitting={editBusy} />
                {isSystem ? (
                    <p className="text-xs text-amber-600 mt-3">
                        This is a system-defined code and may not be editable in your tenant.
                    </p>
                ) : null}
            </Modal>
        </div>
    );
};

export default CodeDetails;
