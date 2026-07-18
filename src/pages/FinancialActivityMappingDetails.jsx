import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FinancialActivityMappingForm from '../components/FinancialActivityMappingForm';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const normalizeFAOptions = (tpl) => {
    const raw =
        tpl?.financialActivityOptions ||
        tpl?.financialActivities ||
        tpl?.financialActivityData ||
        [];
    const map = new Map();
    raw.forEach((o) => {
        const id = o.id ?? o.value ?? o.code;
        if (id != null && !map.has(String(id))) {
            map.set(String(id), o.name ?? o.value ?? o.code ?? `Activity ${id}`);
        }
    });
    return map;
};

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.pageItems)) return value.pageItems;
    if (Array.isArray(value?.options)) return value.options;
    return [];
};

const accountOptionBuckets = (source) => [
    ...asArray(source),
    ...asArray(source?.assetAccountOptions),
    ...asArray(source?.incomeAccountOptions),
    ...asArray(source?.expenseAccountOptions),
    ...asArray(source?.liabilityAccountOptions),
    ...asArray(source?.equityAccountOptions),
];

const normalizeGLAccountMap = (tpl, accounts = []) => {
    const list = [
        ...accountOptionBuckets(tpl?.glAccountOptions),
        ...accountOptionBuckets(tpl?.accountingMappingOptions),
        ...asArray(tpl?.assetAccountOptions),
        ...asArray(tpl?.incomeAccountOptions),
        ...asArray(tpl?.expenseAccountOptions),
        ...asArray(tpl?.liabilityAccountOptions),
        ...asArray(tpl?.equityAccountOptions),
        ...asArray(accounts),
    ];
    const map = new Map();
    list.forEach((a) => {
        const id = a.id ?? a.accountId ?? a.glAccountId;
        if (id == null || map.has(String(id))) return;
        const code = a.glCode || a.code || id;
        const name = a.name || a.accountName || '';
        map.set(String(id), `${code}${name ? ` - ${name}` : ''}`);
    });
    return map;
};

const errorMessage = (err) =>
    err?.response?.data?.errors?.[0]?.defaultUserMessage ||
    err?.response?.data?.errors?.[0]?.developerMessage ||
    err?.response?.data?.defaultUserMessage ||
    err?.response?.data?.developerMessage ||
    err?.message ||
    'Mapping not found';

const extractActivityId = (err, fallbackId) => {
    const body = err?.response?.data || {};
    const argValue = body?.errors?.[0]?.args?.[0]?.value;
    if (argValue != null) return String(argValue);
    const message = [
        body?.errors?.[0]?.defaultUserMessage,
        body?.errors?.[0]?.developerMessage,
        body?.defaultUserMessage,
        body?.developerMessage,
    ].filter(Boolean).join(' ');
    const match = message.match(/financial Activity with Id\s+(\d+)/i) || message.match(/activity\D+(\d+)/i);
    if (match?.[1]) return match[1];
    return err?.response?.status === 404 ? String(fallbackId) : '';
};

const FinancialActivityMappingDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const { can } = useAuth();
    const canCreate = can('CREATE_FINANCIALACTIVITYACCOUNT');
    const canUpdate = can('UPDATE_FINANCIALACTIVITYACCOUNT');
    const canDelete = can('DELETE_FINANCIALACTIVITYACCOUNT');

    const [loading, setLoading] = useState(true);
    const [mapping, setMapping] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [faMap, setFaMap] = useState(new Map());
    const [glMap, setGlMap] = useState(new Map());

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const faName = (activityId) => faMap.get(String(activityId)) || `Activity ${activityId}`;
    const glName = (accountId) => glMap.get(String(accountId)) || `GL Account ${accountId}`;

    const load = async () => {
        setLoading(true);
        const [mappingResult, templateResult, glResult] = await Promise.allSettled([
            api.get(`/financialactivityaccounts/${id}`),
            api.get('/financialactivityaccounts/template'),
            api.get('/glaccounts'),
        ]);

        const template = templateResult.status === 'fulfilled' ? templateResult.value?.data || {} : {};
        const accountsData = glResult.status === 'fulfilled' ? glResult.value?.data : [];
        const accounts = Array.isArray(accountsData) ? accountsData : (accountsData?.pageItems || []);
        setFaMap(normalizeFAOptions(template));
        setGlMap(normalizeGLAccountMap(template, accounts));

        if (mappingResult.status === 'fulfilled') {
            setMapping(mappingResult.value?.data || null);
            setLoadError(null);
        } else {
            const err = mappingResult.reason;
            setMapping(null);
            setLoadError({
                status: err?.response?.status,
                message: errorMessage(err),
                activityId: extractActivityId(err, id),
            });
        }
        setLoading(false);
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
            addToast(errorMessage(err) || 'Update failed', 'error');
        } finally {
            setEditBusy(false);
        }
    };

    const createMissing = async (payload) => {
        setCreateBusy(true);
        try {
            const res = await api.post('/financialactivityaccounts', payload);
            addToast('Mapping created', 'success');
            setCreateOpen(false);
            const newId = res?.data?.resourceId || res?.data?.resourceIdentifier || res?.data?.changes?.id;
            if (newId != null) {
                navigate(`/accounting/financial-activity-mappings/${newId}`, { replace: true });
            } else {
                navigate('/accounting/financial-activity-mappings', { replace: true });
            }
        } catch (err) {
            addToast(errorMessage(err) || 'Create failed', 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const remove = async () => {
        setDeleteBusy(true);
        try {
            await api.delete(`/financialactivityaccounts/${id}`);
            addToast('Mapping deleted', 'success');
            navigate('/accounting/financial-activity-mappings', { replace: true });
        } catch (err) {
            addToast(errorMessage(err) || 'Delete failed', 'error');
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
        const missingActivityId = loadError?.activityId || id;
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Financial Activity Mapping</h1>
                    <Button variant="secondary" onClick={() => navigate('/accounting/financial-activity-mappings')}>Back to Mappings</Button>
                </div>

                <Card>
                    <div className="space-y-4 text-sm">
                        <div>
                            <div className="text-lg font-semibold">Mapping not found</div>
                            <div className="mt-1 text-gray-600 dark:text-gray-300">{loadError?.message || 'Fineract did not return this mapping.'}</div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <div className="text-gray-500">Requested Mapping ID</div>
                                <div className="font-medium">{id}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Detected Financial Activity ID</div>
                                <div className="font-medium">{missingActivityId || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">HTTP Status</div>
                                <div className="font-medium">{loadError?.status || '-'}</div>
                            </div>
                        </div>
                        {missingActivityId && canCreate ? (
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setCreateOpen(true)}>Create mapping for activity {missingActivityId}</Button>
                            </div>
                        ) : null}
                    </div>
                </Card>

                <Modal
                    open={createOpen}
                    title={`Create Mapping for Activity ${missingActivityId}`}
                    onClose={() => setCreateOpen(false)}
                    footer={null}
                >
                    <FinancialActivityMappingForm
                        initial={{ financialActivityId: Number(missingActivityId), financialActivityName: faName(missingActivityId) }}
                        onSubmit={createMissing}
                        submitting={createBusy}
                        lockFinancialActivity
                    />
                </Modal>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Mapping #{mapping.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Activity {mapping.financialActivityId} to GL account {mapping.glAccountId}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => navigate('/accounting/financial-activity-mappings')}>Back</Button>
                    {canUpdate ? <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button> : null}
                    {canDelete ? (
                        <Button variant="danger" onClick={remove} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting...' : 'Delete'}
                        </Button>
                    ) : null}
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Mapping ID</div>
                        <div className="font-medium">{mapping.id}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Financial Activity ID</div>
                        <div className="font-medium">{mapping.financialActivityId}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Financial Activity</div>
                        <div className="font-medium">{faName(mapping.financialActivityId)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">GL Account ID</div>
                        <div className="font-medium">{mapping.glAccountId}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500">GL Account</div>
                        <div className="font-medium">{glName(mapping.glAccountId)}</div>
                    </div>
                </div>
            </Card>

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