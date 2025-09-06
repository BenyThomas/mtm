import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import StaffForm from '../components/StaffForm';

const StaffDetails = () => {
    const { staffId } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/staff/${staffId}`);
            const s = r?.data || {};
            const norm = {
                id: s.id,
                officeId: s.officeId || s.office?.id || '',
                officeName: s.officeName || s.office?.name || '',
                firstname: s.firstname || s.firstName || '',
                lastname: s.lastname || s.lastName || '',
                displayName: s.displayName || `${s.firstname || ''} ${s.lastname || ''}`.trim(),
                isLoanOfficer: Boolean(s.isLoanOfficer),
                mobileNo: s.mobileNo || '',
                externalId: s.externalId || '',
                emailAddress: s.emailAddress || s.email || '',
                isActive: s.isActive ?? true,
            };
            setStaff(norm);
        } catch (e) {
            setStaff(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load staff';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [staffId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            await api.put(`/staff/${staffId}`, payload);
            addToast('Staff updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
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

    if (!staff) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Staff</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/config/staff')}>Back to Staff</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{staff.displayName}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        #{staff.id} • {staff.officeName || '—'} • {staff.isLoanOfficer ? 'Loan Officer' : 'Staff'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/staff')}>All Staff</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Office</div>
                        <div className="font-medium">{staff.officeName || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Role</div>
                        <div className="font-medium">{staff.isLoanOfficer ? 'Loan Officer' : 'Staff'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Mobile</div>
                        <div className="font-medium">{staff.mobileNo || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Email</div>
                        <div className="font-medium">{staff.emailAddress || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">External ID</div>
                        <div className="font-medium">{staff.externalId || '—'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${staff.displayName}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <StaffForm initial={staff} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default StaffDetails;
