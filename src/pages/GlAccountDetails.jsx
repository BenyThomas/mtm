import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import GlAccountForm from '../components/GlAccountForm';
import { useToast } from '../context/ToastContext';

const nameOf = (obj) => obj?.value || obj?.name || '';

const GlAccountDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [acc, setAcc] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/glaccounts/${id}`);
            setAcc(res?.data || null);
        } catch {
            setAcc(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/glaccounts/${id}`, payload);
            addToast('GL account updated', 'success');
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
            await api.delete(`/glaccounts/${id}`);
            addToast('GL account deleted', 'success');
            navigate('/accounting/gl-accounts', { replace: true });
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
                <Card><Skeleton height="10rem" /></Card>
            </div>
        );
    }

    if (!acc) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">GL Account</h1>
                <Card>Account not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">GL Account #{acc.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {acc.glCode || acc.code} • {acc.name}
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
                        <div className="text-gray-500">Code</div>
                        <div className="font-medium">{acc.glCode || acc.code || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Name</div>
                        <div className="font-medium">{acc.name || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Type</div>
                        <div className="font-medium">{nameOf(acc.type) || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Usage</div>
                        <div className="font-medium">{nameOf(acc.usage) || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Parent</div>
                        <div className="font-medium">{acc.parentName || acc.parent?.name || acc.parentId || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Manual Entries Allowed</div>
                        <div className="font-medium">{acc.manualEntriesAllowed ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Disabled</div>
                        <div className="font-medium">{acc.disabled ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">{acc.description || '-'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title="Edit GL Account"
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <GlAccountForm initial={acc} onSubmit={update} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default GlAccountDetails;
