import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import OfficeForm from '../components/OfficeForm';

/**
 * Supports two routes:
 *  - /config/offices/:officeId
 *  - /config/offices/external/:externalId
 */
const OfficeDetails = () => {
    const { officeId, externalId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [office, setOffice] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const isExternalRoute = Boolean(externalId);

    const load = async () => {
        setLoading(true);
        try {
            const path = isExternalRoute
                ? `/offices/external-id/${encodeURIComponent(externalId)}`
                : `/offices/${officeId}`;
            const r = await api.get(path);
            const d = r?.data || {};
            setOffice({
                id: d.id,
                name: d.name,
                externalId: d.externalId,
                openingDate: d.openingDate,
                parentId: d.parentId || d.parent?.id,
                parentName: d.parentName || d.parent?.name,
                hierarchy: d.hierarchy,
                isHeadOffice: d.parentId ? false : true,
            });
        } catch (e) {
            setOffice(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load office';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [officeId, externalId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            if (isExternalRoute) {
                await api.put(`/offices/external-id/${encodeURIComponent(externalId)}`, payload);
            } else {
                await api.put(`/offices/${officeId}`, payload);
            }
            addToast('Office updated', 'success');
            setEditOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
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

    if (!office) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Office</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/config/offices')}>Back to Offices</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{office.name}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        #{office.id} • {office.hierarchy || '—'} • {office.parentName ? `Parent: ${office.parentName}` : 'Head Office'}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/config/offices')}>All Offices</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">External ID</div>
                        <div className="font-medium">{office.externalId || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Opening Date</div>
                        <div className="font-medium">{office.openingDate || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Hierarchy</div>
                        <div className="font-medium">{office.hierarchy || '—'}</div>
                    </div>
                </div>
            </Card>

            {/* Edit Modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${office.name}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <OfficeForm initial={office} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default OfficeDetails;
