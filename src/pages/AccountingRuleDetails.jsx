import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AccountingRuleForm from '../components/AccountingRuleForm';
import { useToast } from '../context/ToastContext';

const labelLine = (a) =>
    `${a.glAccountCode || a.accountCode || a.id || a.glAccountId}${a.glAccountName ? ` — ${a.glAccountName}` : ''}`.trim();

const AccountingRuleDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [rule, setRule] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/accountingrules/${id}`);
            setRule(res?.data || null);
        } catch {
            setRule(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const debitList = useMemo(() => rule?.debitAccounts || [], [rule]);
    const creditList = useMemo(() => rule?.creditAccounts || [], [rule]);

    const update = async (payload) => {
        setEditBusy(true);
        try {
            await api.put(`/accountingrules/${id}`, payload);
            addToast('Rule updated', 'success');
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
            await api.delete(`/accountingrules/${id}`);
            addToast('Rule deleted', 'success');
            navigate('/accounting/accounting-rules', { replace: true });
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

    if (!rule) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Accounting Rule</h1>
                <Card>Rule not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Rule #{rule.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {rule.name} {rule.officeName ? `• ${rule.officeName}` : ''}
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
                        <div className="font-medium">{rule.name}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Office</div>
                        <div className="font-medium">{rule.officeName || rule.officeId || '-'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div className="font-medium whitespace-pre-wrap">{rule.description || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Multiple Debits</div>
                        <div className="font-medium">{rule.allowMultipleDebitEntries ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Multiple Credits</div>
                        <div className="font-medium">{rule.allowMultipleCreditEntries ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            </Card>

            {/* Accounts */}
            <Card>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <div className="font-semibold mb-2">Debit Accounts</div>
                        {!debitList.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">None</div>
                        ) : (
                            <ul className="text-sm list-disc pl-5">
                                {debitList.map((a, idx) => (
                                    <li key={idx}>{labelLine(a)}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <div className="font-semibold mb-2">Credit Accounts</div>
                        {!creditList.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">None</div>
                        ) : (
                            <ul className="text-sm list-disc pl-5">
                                {creditList.map((a, idx) => (
                                    <li key={idx}>{labelLine(a)}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title="Edit Accounting Rule"
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <AccountingRuleForm initial={rule} onSubmit={update} submitting={editBusy} />
            </Modal>
        </div>
    );
};

export default AccountingRuleDetails;
