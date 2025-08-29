import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import GlClosureForm from '../components/GlClosureForm';
import { useToast } from '../context/ToastContext';
import useOffices from '../hooks/useOffices';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    return String(d).slice(0, 10);
};

const GlClosureDetails = () => {
    const { id } = useParams();
    const { offices } = useOffices();
    const officeMap = useMemo(() => {
        const m = {};
        offices.forEach((o) => { m[o.id] = o.name; });
        return m;
    }, [offices]);

    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [closure, setClosure] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);

    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/glclosures/${id}`);
            setClosure(res.data || null);
        } catch {
            setClosure(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const updateClosure = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/glclosures/${id}`, payload);
            addToast('Closure updated', 'success');
            setEditOpen(false);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.defaultUserMessage
                || err?.response?.data?.defaultUserMessage
                || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    const deleteClosure = async () => {
        setDeleteBusy(true);
        try {
            await api.delete(`/glclosures/${id}`);
            addToast('Closure deleted', 'success');
            navigate('/accounting/closures', { replace: true });
        } catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.defaultUserMessage
                || err?.response?.data?.defaultUserMessage
                || 'Delete failed';
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

    if (!closure) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Accounting Closure</h1>
                <Card>Closure not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Closure #{closure.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {closure.officeName || officeMap[closure.officeId] || `Office ${closure.officeId}`} • {toISO(closure.closingDate)}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="danger" onClick={deleteClosure} disabled={deleteBusy}>
                        {deleteBusy ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Office</div>
                        <div className="font-medium">{closure.officeName || officeMap[closure.officeId] || closure.officeId}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Closing Date</div>
                        <div className="font-medium">{toISO(closure.closingDate)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">ID</div>
                        <div className="font-medium">{closure.id}</div>
                    </div>
                    <div className="md:col-span-3">
                        <div className="text-gray-500">Comments</div>
                        <div className="font-medium whitespace-pre-wrap">{closure.comments || '-'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title="Edit Accounting Closure"
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <GlClosureForm initial={closure} onSubmit={updateClosure} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default GlClosureDetails;
