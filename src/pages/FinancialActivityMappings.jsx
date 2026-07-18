import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import FinancialActivityMappingForm from '../components/FinancialActivityMappingForm';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.pageItems)) return value.pageItems;
    if (Array.isArray(value?.options)) return value.options;
    return [];
};

const normalizeFAOptions = (tpl) => {
    const raw = [
        ...asArray(tpl?.financialActivityOptions),
        ...asArray(tpl?.financialActivities),
        ...asArray(tpl?.financialActivityData),
        ...asArray(tpl?.financialActivityAccountOptions),
    ];
    const map = new Map();
    raw.forEach((o) => {
        const id = o?.id ?? o?.financialActivityId ?? o?.value ?? o?.code;
        if (id != null && !map.has(String(id))) {
            map.set(String(id), o?.name ?? o?.label ?? o?.value ?? o?.code ?? `Activity ${id}`);
        }
    });
    return map;
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
        ...asArray(tpl?.accountOptions),
        ...asArray(tpl?.glAccounts),
        ...asArray(tpl?.glAccountData),
        ...asArray(accounts),
    ];
    const map = new Map();
    list.forEach((a) => {
        const id = a?.id ?? a?.accountId ?? a?.glAccountId;
        if (id == null || map.has(String(id))) return;
        const code = a?.glCode || a?.code || id;
        const name = a?.name || a?.accountName || '';
        const type = a?.type?.value || a?.type?.code || a?.type || '';
        map.set(String(id), {
            id,
            code,
            name,
            type,
            label: `${code}${name ? ` - ${name}` : ''}`,
        });
    });
    return map;
};

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const mappingId = (mapping) => firstValue(mapping?.id, mapping?.financialActivityAccountId, mapping?.resourceId);

const activityId = (mapping) => firstValue(
    mapping?.financialActivityId,
    mapping?.financialActivityData?.id,
    mapping?.financialActivity?.id,
    mapping?.financialActivityType?.id,
    mapping?.financialActivityData?.value,
);

const glAccountId = (mapping) => firstValue(
    mapping?.glAccountId,
    mapping?.glAccountData?.id,
    mapping?.glAccount?.id,
    mapping?.accountId,
);

const directActivityName = (mapping) => firstValue(
    mapping?.financialActivityName,
    mapping?.financialActivityData?.name,
    mapping?.financialActivityData?.value,
    mapping?.financialActivity?.name,
    mapping?.financialActivityType?.value,
    mapping?.financialActivityType?.name,
);

const directGlAccountName = (mapping) => {
    const account = mapping?.glAccountData || mapping?.glAccount || mapping?.account || {};
    const code = firstValue(mapping?.glCode, mapping?.accountCode, account?.glCode, account?.code);
    const name = firstValue(mapping?.glAccountName, mapping?.accountName, account?.name, account?.accountName);
    if (code || name) return `${code || ''}${code && name ? ' - ' : ''}${name || ''}`;
    return '';
};

const IconAction = ({ label, children, className = '', ...props }) => (
    <Button
        {...props}
        aria-label={label}
        title={label}
        className={`group relative h-9 w-9 px-0 ${className}`}
    >
        {children}
        <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-100 dark:text-slate-900"
        >
            {label}
        </span>
    </Button>
);

const FinancialActivityMappings = () => {
    const { addToast } = useToast();
    const { can } = useAuth();
    const canCreate = can('CREATE_FINANCIALACTIVITYACCOUNT');
    const canUpdate = can('UPDATE_FINANCIALACTIVITYACCOUNT');
    const canDelete = can('DELETE_FINANCIALACTIVITYACCOUNT');

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [templateLoading, setTemplateLoading] = useState(true);
    const [faMap, setFaMap] = useState(new Map());
    const [glMap, setGlMap] = useState(new Map());

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [expandedId, setExpandedId] = useState(null);
    const [editMapping, setEditMapping] = useState(null);
    const [editBusy, setEditBusy] = useState(false);

    const [deleteId, setDeleteId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financialactivityaccounts');
            setItems(asArray(res.data));
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplate = async () => {
        setTemplateLoading(true);
        try {
            const [templateRes, glRes] = await Promise.allSettled([
                api.get('/financialactivityaccounts/template'),
                api.get('/glaccounts'),
            ]);
            const template = templateRes.status === 'fulfilled' ? templateRes.value?.data || {} : {};
            const accountsData = glRes.status === 'fulfilled' ? glRes.value?.data : [];
            setFaMap(normalizeFAOptions(template));
            setGlMap(normalizeGLAccountMap(template, asArray(accountsData)));
        } catch {
            setFaMap(new Map());
            setGlMap(new Map());
        } finally {
            setTemplateLoading(false);
        }
    };

    useEffect(() => {
        loadList();
        loadTemplate();
    }, []);

    const rowId = (mapping) => String(mappingId(mapping) ?? `${activityId(mapping) || 'activity'}-${glAccountId(mapping) || 'account'}`);
    const faName = (mapping) => directActivityName(mapping) || faMap.get(String(activityId(mapping))) || (activityId(mapping) != null ? `Activity ${activityId(mapping)}` : '-');
    const glAccount = (mapping) => glMap.get(String(glAccountId(mapping)));
    const glName = (mapping) => directGlAccountName(mapping) || glAccount(mapping)?.label || (glAccountId(mapping) != null ? `GL Account ${glAccountId(mapping)}` : '-');

    const formInitial = (mapping) => ({
        ...mapping,
        id: mappingId(mapping),
        financialActivityId: activityId(mapping),
        financialActivityName: faName(mapping),
        glAccountId: glAccountId(mapping),
        glAccountCode: glAccount(mapping)?.code,
        glAccountName: glAccount(mapping)?.name || directGlAccountName(mapping),
        glAccountType: glAccount(mapping)?.type,
    });

    const errorText = (err, fallback) =>
        err?.response?.data?.errors?.[0]?.defaultUserMessage ||
        err?.response?.data?.errors?.[0]?.developerMessage ||
        err?.response?.data?.defaultUserMessage ||
        fallback;

    const createMapping = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/financialactivityaccounts', payload);
            addToast('Mapping created', 'success');
            setCreateOpen(false);
            await loadList();
        } catch (err) {
            addToast(errorText(err, 'Create failed'), 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const updateMapping = async (payload) => {
        const id = mappingId(editMapping);
        if (id == null) return;
        setEditBusy(true);
        try {
            await api.put(`/financialactivityaccounts/${id}`, payload);
            addToast('Mapping updated', 'success');
            setEditMapping(null);
            await loadList();
        } catch (err) {
            addToast(errorText(err, 'Update failed'), 'error');
        } finally {
            setEditBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/financialactivityaccounts/${deleteId}`);
            addToast('Mapping deleted', 'success');
            setDeleteId(null);
            if (String(expandedId) === String(deleteId)) setExpandedId(null);
            await loadList();
        } catch (err) {
            addToast(errorText(err, 'Delete failed'), 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Financial Activity to GL Account</h1>
                <div className="flex items-center gap-2">
                    {canCreate ? (
                        <IconAction label="New Mapping" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                        </IconAction>
                    ) : null}
                    <IconAction label="Refresh" variant="secondary" onClick={() => { loadList(); loadTemplate(); }}>
                        <RefreshCw className="h-4 w-4" />
                    </IconAction>
                </div>
            </div>

            <Card>
                {loading || templateLoading ? (
                    <Skeleton height="10rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No mappings found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Mapping ID</th>
                                <th className="py-2 pr-4">Activity ID</th>
                                <th className="py-2 pr-4">Financial Activity</th>
                                <th className="py-2 pr-4">GL Account ID</th>
                                <th className="py-2 pr-4">GL Account</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((mapping) => {
                                const id = rowId(mapping);
                                const isExpanded = String(expandedId) === String(id);
                                const mapId = mappingId(mapping);
                                const actId = activityId(mapping);
                                const accountId = glAccountId(mapping);
                                return (
                                    <React.Fragment key={id}>
                                        <tr className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                            <td className="py-2 pr-4 font-medium">{mapId ?? '-'}</td>
                                            <td className="py-2 pr-4">{actId ?? '-'}</td>
                                            <td className="py-2 pr-4">{faName(mapping)}</td>
                                            <td className="py-2 pr-4">{accountId ?? '-'}</td>
                                            <td className="py-2 pr-4">{glName(mapping)}</td>
                                            <td className="py-2 pr-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <IconAction label={isExpanded ? 'Hide' : 'View'} variant="secondary" onClick={() => setExpandedId(isExpanded ? null : id)}>
                                                        {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </IconAction>
                                                    {canUpdate ? (
                                                        <IconAction label="Edit" variant="secondary" onClick={() => setEditMapping(mapping)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </IconAction>
                                                    ) : null}
                                                    {canDelete && mapId != null ? (
                                                        <IconAction label="Delete" variant="danger" onClick={() => setDeleteId(mapId)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </IconAction>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded ? (
                                            <tr className="border-t border-gray-100 bg-gray-50 text-sm dark:border-gray-800 dark:bg-gray-900/40">
                                                <td colSpan={6} className="p-4">
                                                    <div className="grid gap-4 md:grid-cols-4">
                                                        <div>
                                                            <div className="text-gray-500">Mapping ID</div>
                                                            <div className="font-medium">{mapId ?? '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">Financial Activity</div>
                                                            <div className="font-medium">{actId ?? '-'} - {faName(mapping)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">GL Account</div>
                                                            <div className="font-medium">{accountId ?? '-'} - {glName(mapping)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">GL Type</div>
                                                            <div className="font-medium">{glAccount(mapping)?.type || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={createOpen}
                title="New Financial Activity Mapping"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <FinancialActivityMappingForm onSubmit={createMapping} submitting={createBusy} />
            </Modal>

            <Modal
                open={!!editMapping}
                title={`Edit Mapping #${mappingId(editMapping) ?? ''}`.trim()}
                onClose={() => setEditMapping(null)}
                footer={null}
            >
                {editMapping ? (
                    <FinancialActivityMappingForm initial={formInitial(editMapping)} onSubmit={updateMapping} submitting={editBusy} />
                ) : null}
            </Modal>

            <Modal
                open={!!deleteId}
                title="Delete Mapping"
                onClose={() => setDeleteId(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
                            <Trash2 className="h-4 w-4" /> {deleteBusy ? 'Deleting...' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to delete mapping <strong>#{deleteId}</strong>? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default FinancialActivityMappings;
