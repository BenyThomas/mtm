import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import ProvisioningCriteriaForm from '../components/ProvisioningCriteriaForm';

const ProvisioningCriteriaDetails = () => {
    const { criteriaId } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [criteria, setCriteria] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/provisioningcriteria/${criteriaId}`);
            const d = r?.data || {};

            // Server shapes found in the wild:
            //  - criteriaName
            //  - provisioningcriteria: [{categoryId, categoryName, minAge, maxAge, provisioningPercentage, liabilityAccount, expenseAccount}]
            //  - loanProducts: [{id, name}] (optional)
            const pc = Array.isArray(d.provisioningcriteria) ? d.provisioningcriteria : [];

            const entries = pc.map((x) => ({
                categoryId: x.categoryId ?? '',
                categoryName: x.categoryName,
                minAge: Number(x.minAge ?? 0),
                maxAge: Number(x.maxAge ?? 0),
                provisioningPercentage: Number(x.provisioningPercentage ?? 0),
                liabilityAccount: x.liabilityAccount ?? '',
                expenseAccount: x.expenseAccount ?? '',
            }));

            const loanProductIds = Array.isArray(d.loanProducts) ? d.loanProducts.map((p) => p.id) : [];

            setCriteria({
                id: d.id,
                criteriaName: d.criteriaName || d.name || `Criteria #${criteriaId}`,
                entries,
                loanProductIds,
            });
        } catch (e) {
            setCriteria(null);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load provisioning criteria';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [criteriaId]);

    const save = async (payload) => {
        setSaving(true);
        try {
            // PUT must follow the same strict shape as POST
            await api.put(`/provisioningcriteria/${criteriaId}`, payload);
            addToast('Provisioning Criteria updated', 'success');
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

    if (!criteria) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Provisioning Criteria</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/accounting/provisioning-criteria')}>Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{criteria.criteriaName}</h1>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="secondary" onClick={() => navigate('/accounting/provisioning-criteria')}>All Criteria</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                {!criteria.entries?.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No buckets defined.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Category</th>
                                <th className="py-2 pr-4">Min DPD</th>
                                <th className="py-2 pr-4">Max DPD</th>
                                <th className="py-2 pr-4">% Provision</th>
                                <th className="py-2 pr-4">Liability GL</th>
                                <th className="py-2 pr-4">Expense GL</th>
                            </tr>
                            </thead>
                            <tbody>
                            {criteria.entries.map((r, i) => (
                                <tr key={i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{i + 1}</td>
                                    <td className="py-2 pr-4">{r.categoryName ?? r.categoryId}</td>
                                    <td className="py-2 pr-4">{r.minAge}</td>
                                    <td className="py-2 pr-4">{r.maxAge}</td>
                                    <td className="py-2 pr-4">{r.provisioningPercentage}%</td>
                                    <td className="py-2 pr-4">{r.liabilityAccount || '—'}</td>
                                    <td className="py-2 pr-4">{r.expenseAccount || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            <Modal
                open={editOpen}
                title={`Edit: ${criteria.criteriaName}`}
                onClose={() => setEditOpen(false)}
                footer={null}
            >
                <ProvisioningCriteriaForm initial={criteria} onSubmit={save} submitting={saving} />
            </Modal>
        </div>
    );
};

export default ProvisioningCriteriaDetails;
