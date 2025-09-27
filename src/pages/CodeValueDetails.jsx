import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import CodeValueForm from '../components/CodeValueForm';

const CodeValueDetails = () => {
    const { codeId, valueId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [value, setValue] = useState(null);
    const [code, setCode] = useState(null); // optional meta
    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            try {
                const meta = await api.get(`/codes/${codeId}`);
                setCode(meta?.data || null);
            } catch {
                setCode(null);
            }
            const res = await api.get(`/codes/${codeId}/codevalues/${valueId}`);
            setValue(res?.data || null);
        } catch (err) {
            setValue(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load code value';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [codeId, valueId]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/codes/${codeId}/codevalues/${valueId}`, payload);
            addToast('Code value updated', 'success');
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
            await api.delete(`/codes/${codeId}/codevalues/${valueId}`);
            addToast('Code value deleted', 'success');
            navigate(`/config/codes/${codeId}/values`, { replace: true });
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

    if (!value) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Code Value</h1>
                <Card>Not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {(code?.name || code?.codeName || `Code #${codeId}`)} • Value #{value.id}
                    </h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {value.name} {value.active ? '• Active' : '• Inactive'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="danger" onClick={remove} disabled={deleteBusy}>
                        {deleteBusy ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Name</div>
                        <div className="font-medium">{value.name}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Position</div>
                        <div className="font-medium">{value.position ?? '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Active</div>
                        <div className="font-medium">{value.active ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">{value.description || '-'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit "${value.name}"`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <CodeValueForm initial={value} onSubmit={update} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default CodeValueDetails;
