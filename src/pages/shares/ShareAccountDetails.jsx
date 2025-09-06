import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

/** Generic action modal for share-account POST commands */
const ActionModal = ({ open, title, fields = [], onClose, onSubmit, busy }) => {
    const [values, setValues] = useState({});

    useEffect(() => {
        if (open) setValues({});
    }, [open]);

    const setVal = (k, v) => setValues((s) => ({ ...s, [k]: v }));

    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSubmit(values)} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</Button>
                </>
            }
        >
            <div className="space-y-3">
                {fields.map((f) => (
                    <div key={f.name}>
                        <label className="block text-sm font-medium">{f.label}</label>
                        {f.type === 'date' ? (
                            <input
                                type="date"
                                value={values[f.name] || ''}
                                onChange={(e) => setVal(f.name, e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        ) : (
                            <input
                                type={f.type || 'text'}
                                value={values[f.name] || ''}
                                onChange={(e) => setVal(f.name, e.target.value)}
                                placeholder={f.placeholder || ''}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        )}
                    </div>
                ))}
            </div>
        </Modal>
    );
};

const ShareAccountDetails = () => {
    const { accountId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const type = 'shares';

    const [loading, setLoading] = useState(true);
    const [acct, setAcct] = useState(null);

    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState({ open: false, command: null, title: '', fields: [] });

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/accounts/${type}/${accountId}`);
            const d = r?.data || {};
            setAcct({
                id: d.id,
                accountNo: d.accountNo || d.accountNumber,
                clientName: d.clientName || d.client?.displayName,
                productName: d.productName || d.product?.name,
                status: d.status?.value || d.status,
                submittedOnDate: d.submittedOnDate || d.applicationDate,
                activatedOnDate: d.activatedOnDate || d.activationDate,
                approvedOnDate: d.approvedOnDate || d.approvalDate,
                totalApprovedShares: d.totalApprovedShares || d.totalShares,
                currency: d.currency?.code || d.currencyCode,
            });
        } catch (e) {
            setAcct(null);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load account', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [accountId]);

    const doCommand = async (command, values = {}) => {
        setBusy(true);
        try {
            const payload = { dateFormat: 'yyyy-MM-dd', locale: 'en' };

            // map known fields if present
            if (values.date) payload.date = values.date;
            if (values.approvedOnDate) payload.approvedOnDate = values.approvedOnDate;
            if (values.activatedOnDate) payload.activatedOnDate = values.activatedOnDate;
            if (values.closedOnDate) payload.closedOnDate = values.closedOnDate;

            if (values.requestedShares) payload.requestedShares = Number(values.requestedShares);
            if (values.approvedShares) payload.approvedShares = Number(values.approvedShares);
            if (values.redeemShares) payload.redeemShares = Number(values.redeemShares);

            await api.post(`/accounts/${type}/${accountId}?command=${encodeURIComponent(command)}`, payload);
            addToast(`Action '${command}' successful`, 'success');
            setModal({ open: false, command: null, title: '', fields: [] });
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || `Action '${command}' failed`;
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const openAction = (command) => {
        // Define minimal fields per command
        switch (command) {
            case 'approve':
                setModal({ open: true, command, title: 'Approve Application', fields: [{ name: 'approvedOnDate', label: 'Approved On', type: 'date' }] });
                break;
            case 'undoApproval':
                setModal({ open: true, command, title: 'Undo Approval', fields: [{ name: 'date', label: 'Date', type: 'date' }] });
                break;
            case 'reject':
                setModal({ open: true, command, title: 'Reject Application', fields: [{ name: 'date', label: 'Rejected On', type: 'date' }] });
                break;
            case 'activate':
                setModal({ open: true, command, title: 'Activate Account', fields: [{ name: 'activatedOnDate', label: 'Activated On', type: 'date' }] });
                break;
            case 'close':
                setModal({ open: true, command, title: 'Close Account', fields: [{ name: 'closedOnDate', label: 'Closed On', type: 'date' }] });
                break;
            case 'applyadditionalshares':
                setModal({ open: true, command, title: 'Apply Additional Shares', fields: [
                        { name: 'requestedShares', label: 'Requested Shares', type: 'number' },
                        { name: 'date', label: 'Requested On', type: 'date' },
                    ] });
                break;
            case 'approveadditionalshares':
                setModal({ open: true, command, title: 'Approve Additional Shares', fields: [
                        { name: 'approvedShares', label: 'Approved Shares', type: 'number' },
                        { name: 'approvedOnDate', label: 'Approved On', type: 'date' },
                    ] });
                break;
            case 'rejectadditionalshares':
                setModal({ open: true, command, title: 'Reject Additional Shares', fields: [{ name: 'date', label: 'Rejected On', type: 'date' }] });
                break;
            case 'redeemshares':
                setModal({ open: true, command, title: 'Redeem Shares', fields: [
                        { name: 'redeemShares', label: 'No. of Shares', type: 'number' },
                        { name: 'date', label: 'Redeemed On', type: 'date' },
                    ] });
                break;
            default:
                setModal({ open: true, command, title: `Run: ${command}`, fields: [{ name: 'date', label: 'Date', type: 'date' }] });
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

    if (!acct) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Share Account</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/shares')}>Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Share #{acct.id} — {acct.accountNo || ''}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        Client: {acct.clientName || '—'} • Product: {acct.productName || '—'} • Status: {acct.status || '—'}
                    </div>
                </div>
                <Button variant="secondary" onClick={() => navigate('/shares')}>All Shares</Button>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-md border p-3 dark:border-gray-700">
                        <div className="text-gray-500">Submitted On</div>
                        <div className="font-medium">{acct.submittedOnDate || '—'}</div>
                    </div>
                    <div className="rounded-md border p-3 dark:border-gray-700">
                        <div className="text-gray-500">Approved On</div>
                        <div className="font-medium">{acct.approvedOnDate || '—'}</div>
                    </div>
                    <div className="rounded-md border p-3 dark:border-gray-700">
                        <div className="text-gray-500">Activated On</div>
                        <div className="font-medium">{acct.activatedOnDate || '—'}</div>
                    </div>
                    <div className="rounded-md border p-3 dark:border-gray-700">
                        <div className="text-gray-500">Total Approved Shares</div>
                        <div className="font-medium">{acct.totalApprovedShares || '—'}</div>
                    </div>
                </div>
            </Card>

            {/* Actions */}
            <Card>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openAction('approve')}>Approve</Button>
                    <Button variant="secondary" onClick={() => openAction('undoApproval')}>Undo Approval</Button>
                    <Button variant="danger" onClick={() => openAction('reject')}>Reject</Button>
                    <Button onClick={() => openAction('activate')}>Activate</Button>
                    <Button variant="danger" onClick={() => openAction('close')}>Close</Button>
                    <Button onClick={() => openAction('applyadditionalshares')}>Apply Additional</Button>
                    <Button onClick={() => openAction('approveadditionalshares')}>Approve Additional</Button>
                    <Button variant="danger" onClick={() => openAction('rejectadditionalshares')}>Reject Additional</Button>
                    <Button onClick={() => openAction('redeemshares')}>Redeem</Button>
                </div>
            </Card>

            <ActionModal
                open={modal.open}
                title={modal.title}
                fields={modal.fields}
                onClose={() => setModal({ open: false, command: null, title: '', fields: [] })}
                onSubmit={(vals) => doCommand(modal.command, vals)}
                busy={busy}
            />
        </div>
    );
};

export default ShareAccountDetails;
