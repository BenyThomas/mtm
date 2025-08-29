import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import HolidayForm from '../components/HolidayForm';

const statusText = (s) => {
    if (!s) return 'PENDING';
    if (typeof s === 'string') return s;
    return s.value || s.code || s.text || 'PENDING';
};

const HolidayDetails = () => {
    const { holidayId } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [holiday, setHoliday] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/holidays/${holidayId}`);
            const d = r?.data || {};
            setHoliday({
                id: d.id,
                name: d.name,
                fromDate: d.fromDate,
                toDate: d.toDate,
                repaymentsRescheduledTo: d.repaymentsRescheduledTo,
                description: d.description,
                status: statusText(d.status),
                offices: Array.isArray(d.offices) ? d.offices : [],
                officeIds: Array.isArray(d.offices) ? d.offices.map(o => o.id) : [],
            });
        } catch (e) {
            setHoliday(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load holiday';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [holidayId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.put(`/holidays/${holidayId}`, payload);
            addToast('Holiday updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const activate = async () => {
        try {
            await api.post(`/holidays/${holidayId}`, {});
            addToast('Holiday activated', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Activate failed';
            addToast(msg, 'error');
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

    if (!holiday) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Holiday</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/config/holidays')}>Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{holiday.name}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {holiday.fromDate} → {holiday.toDate} • Status: <strong>{holiday.status}</strong>
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    {holiday.status !== 'ACTIVE' && <Button onClick={activate}>Activate</Button>}
                    <Button variant="secondary" onClick={() => navigate('/config/holidays')}>All Holidays</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid lg:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Repayments Rescheduled To</div>
                        <div className="font-medium">{holiday.repaymentsRescheduledTo || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Offices</div>
                        <div className="font-medium">{holiday.offices?.map(o => o.name).join(', ') || '—'}</div>
                    </div>
                    {holiday.description ? (
                        <div className="lg:col-span-2">
                            <div className="text-gray-500">Description</div>
                            <div className="font-medium">{holiday.description}</div>
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${holiday.name}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <HolidayForm initial={holiday} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default HolidayDetails;
