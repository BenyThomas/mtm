import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FinancialActivityMappingForm from '../components/FinancialActivityMappingForm';
import { useToast } from '../context/ToastContext';

const FinancialActivityMappingDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [mapping, setMapping] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);

    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/financialactivityaccounts/${id}`);
            setMapping(res?.data || null);
        } catch {
            setMapping(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/financialactivityaccounts/${id}`, payload);
            addToast('Mapping updated', 'success');
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
            await api.delete(`/financialactivityaccounts/${id}`);
            addToast('Mapping deleted', 'success');
            navigate('/accounting/financial-activity-mappings', { replace: true });
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

    if (!mapping) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Financial Activity Mapping</h1>
                <Card>Mapping not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Mapping #{mapping.id}</h1>
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
                        <div className="text-gray-500">Financial Activity ID</div>
                        <div className="font-medium">{mapping.financialActivityId}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">GL Account ID</div>
                        <div className="font-medium">{mapping.glAccountId}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Mapping ID</div>
                        <div className="font-medium">{mapping.id}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title="Edit Mapping"
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <FinancialActivityMappingForm initial={mapping} onSubmit={update} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default FinancialActivityMappingDetails;
