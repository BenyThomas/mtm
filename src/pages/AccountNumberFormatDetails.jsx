import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import AccountNumberFormatForm from '../components/AccountNumberFormatForm';
import Modal from '../components/Modal';

const labelEnum = (objOrVal) => {
    if (!objOrVal && objOrVal !== 0) return '-';
    if (typeof objOrVal === 'object') {
        return objOrVal.name || objOrVal.value || objOrVal.code || objOrVal.id || '-';
    }
    return String(objOrVal);
};

const AccountNumberFormatDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [fmt, setFmt] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/accountnumberformats/${id}`);
            setFmt(res?.data || null);
        } catch (err) {
            setFmt(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load format';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/accountnumberformats/${id}`, payload);
            addToast('Format updated', 'success');
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
            await api.delete(`/accountnumberformats/${id}`);
            addToast('Format deleted', 'success');
            navigate('/config/account-number-formats', { replace: true });
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

    if (!fmt) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Account Number Format</h1>
                <Card>Format not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Format #{fmt.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {labelEnum(fmt.accountType)} • length {fmt.accountNumberLength}
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
                        <div className="text-gray-500">Account Type</div>
                        <div className="font-medium">{labelEnum(fmt.accountType)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Length</div>
                        <div className="font-medium">{fmt.accountNumberLength}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Prefix</div>
                        <div className="font-medium">{`${labelEnum(fmt.prefixType)}${fmt.prefixValue ? `: ${fmt.prefixValue}` : ''}`}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Suffix</div>
                        <div className="font-medium">{`${labelEnum(fmt.suffixType)}${fmt.suffixValue ? `: ${fmt.suffixValue}` : ''}`}</div>
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title="Edit Account Number Format"
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <AccountNumberFormatForm initial={fmt} onSubmit={update} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default AccountNumberFormatDetails;
