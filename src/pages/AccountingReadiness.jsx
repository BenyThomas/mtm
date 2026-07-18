import React, { useMemo, useState } from 'react';
import api from '../api/axios';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';

const REQUIRED_GL_TYPES = [
    { key: 'asset', label: 'Asset' },
    { key: 'liability', label: 'Liability' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expense' },
];

const OPERATIONAL_CHECKLIST = [
    {
        key: 'glAccounts',
        title: 'GL Accounts',
        detail: 'Create active asset, liability, income, and expense accounts.',
        links: [{ to: '/accounting/gl-accounts', label: 'Open GL Accounts' }],
    },
    {
        key: 'financialMappings',
        title: 'Financial Activity Mapping',
        detail: 'Map each financial activity from the Fineract template to a GL account.',
        links: [{ to: '/accounting/financial-activity-mappings', label: 'Open Mappings' }],
    },
    {
        key: 'productAccounting',
        title: 'Loan/Savings Product Accounting',
        detail: 'Select accounting rules and required GL accounts on every loan and savings product.',
        links: [
            { to: '/loan-products', label: 'Loan Products' },
            { to: '/savings-products', label: 'Savings Products' },
        ],
    },
    {
        key: 'journalTest',
        title: 'Journal Entry Test',
        detail: 'Post a balanced test journal entry and confirm GL balances update as expected.',
        links: [{ to: '/accounting/journal-entries', label: 'Journal Entries' }],
    },
    {
        key: 'periodClose',
        title: 'Accrual/Provisioning/Closure Setup',
        detail: 'Configure provisioning criteria, run accruals when required, and close GL periods.',
        links: [
            { to: '/accounting/accruals', label: 'Run Accruals' },
            { to: '/accounting/provisioning-criteria', label: 'Provisioning Criteria' },
            { to: '/accounting/closures', label: 'GL Closures' },
        ],
    },
];

const typeKey = (value) => {
    const raw = typeof value === 'object' && value !== null
        ? value.value || value.name || value.code || value.id
        : value;
    const text = String(raw ?? '').toLowerCase();
    if (text.includes('asset') || text === '1') return 'asset';
    if (text.includes('liabil') || text === '2') return 'liability';
    if (text.includes('equity') || text === '3') return 'equity';
    if (text.includes('income') || text === '4') return 'income';
    if (text.includes('expense') || text === '5') return 'expense';
    return text || 'unknown';
};

const toItems = (data) => Array.isArray(data) ? data : (data?.pageItems || []);

const accountId = (account) => account?.id ?? account?.accountId;

const accountLabel = (account) => {
    const id = accountId(account);
    const code = account?.glCode || account?.code || id;
    const name = account?.name || account?.accountName || '';
    return `${code}${name ? ` - ${name}` : ''}`;
};

const financialActivityId = (activity) => activity?.id ?? activity?.value ?? activity?.code;

const financialActivityLabel = (activity) => {
    const id = financialActivityId(activity);
    return activity?.name || activity?.value || activity?.code || `Activity ${id}`;
};

const normalizeActivities = (template) => {
    const source =
        template?.financialActivityOptions ||
        template?.financialActivities ||
        template?.financialActivityData ||
        [];
    const seen = new Map();
    source.forEach((activity) => {
        const id = financialActivityId(activity);
        if (id != null && !seen.has(String(id))) {
            seen.set(String(id), { id, label: financialActivityLabel(activity) });
        }
    });
    return Array.from(seen.values());
};

const templateAccountOptions = (template) => ({
    asset: [
        ...(template?.assetAccountOptions || []),
        ...(template?.accountingMappingOptions?.assetAccountOptions || []),
    ],
    liability: [
        ...(template?.liabilityAccountOptions || []),
        ...(template?.accountingMappingOptions?.liabilityAccountOptions || []),
    ],
    income: [
        ...(template?.incomeAccountOptions || []),
        ...(template?.accountingMappingOptions?.incomeAccountOptions || []),
    ],
    expense: [
        ...(template?.expenseAccountOptions || []),
        ...(template?.accountingMappingOptions?.expenseAccountOptions || []),
    ],
});

const endpointError = (error) =>
    error?.response?.data?.errors?.[0]?.defaultUserMessage ||
    error?.response?.data?.defaultUserMessage ||
    error?.message ||
    'Request failed';

const statusTone = (ok) => ok ? 'green' : 'red';

const StatusBadge = ({ ok }) => (
    <Badge tone={statusTone(ok)}>{ok ? 'Ready' : 'Needs setup'}</Badge>
);

const AccountingReadiness = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [data, setData] = useState({
        glAccounts: [],
        financialMappings: [],
        financialTemplate: null,
        loanTemplate: null,
        savingsTemplate: null,
        errors: {},
    });

    const load = async () => {
        setLoading(true);
        const requests = {
            glAccounts: api.get('/glaccounts'),
            financialMappings: api.get('/financialactivityaccounts'),
            financialTemplate: api.get('/financialactivityaccounts/template'),
            loanTemplate: api.get('/loanproducts/template'),
            savingsTemplate: api.get('/savingsproducts/template'),
        };

        const entries = await Promise.all(
            Object.entries(requests).map(async ([key, request]) => {
                try {
                    const response = await request;
                    return [key, response?.data, null];
                } catch (error) {
                    return [key, null, endpointError(error)];
                }
            })
        );

        const next = {
            glAccounts: [],
            financialMappings: [],
            financialTemplate: null,
            loanTemplate: null,
            savingsTemplate: null,
            errors: {},
        };

        entries.forEach(([key, value, error]) => {
            if (error) {
                next.errors[key] = error;
                return;
            }
            if (key === 'glAccounts' || key === 'financialMappings') {
                next[key] = toItems(value);
            } else {
                next[key] = value || {};
            }
        });

        setData(next);
        setLoaded(true);
        setLoading(false);

        if (Object.keys(next.errors).length) {
            addToast('Accounting readiness loaded with endpoint warnings', 'error');
        }
    };

    React.useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const readiness = useMemo(() => {
        const activeAccounts = data.glAccounts.filter((account) => !account?.disabled);
        const accountsByType = REQUIRED_GL_TYPES.reduce((acc, type) => {
            acc[type.key] = activeAccounts.filter((account) => typeKey(account?.type ?? account?.typeId) === type.key);
            return acc;
        }, {});
        const missingGlTypes = REQUIRED_GL_TYPES.filter((type) => !accountsByType[type.key]?.length);

        const financialActivities = normalizeActivities(data.financialTemplate);
        const mappedActivityIds = new Set(
            data.financialMappings
                .map((mapping) => mapping?.financialActivityId)
                .filter((id) => id != null)
                .map((id) => String(id))
        );
        const missingFinancialActivities = financialActivities.filter(
            (activity) => !mappedActivityIds.has(String(activity.id))
        );

        const loanOptions = templateAccountOptions(data.loanTemplate);
        const savingsOptions = templateAccountOptions(data.savingsTemplate);
        const templateGaps = REQUIRED_GL_TYPES.map((type) => ({
            ...type,
            loanCount: loanOptions[type.key]?.length || 0,
            savingsCount: savingsOptions[type.key]?.length || 0,
        }));

        const endpointCount = 5;
        const failedEndpointCount = Object.keys(data.errors).length;
        const hasFinancialTemplate = Boolean(data.financialTemplate);
        const hasLoanTemplate = Boolean(data.loanTemplate);
        const hasSavingsTemplate = Boolean(data.savingsTemplate);
        const ready =
            failedEndpointCount === 0 &&
            missingGlTypes.length === 0 &&
            hasFinancialTemplate &&
            hasLoanTemplate &&
            hasSavingsTemplate &&
            financialActivities.length > 0 &&
            missingFinancialActivities.length === 0;

        const productTemplateReady = hasLoanTemplate && hasSavingsTemplate &&
            !data.errors.loanTemplate &&
            !data.errors.savingsTemplate &&
            templateGaps.some((row) => row.loanCount > 0) &&
            templateGaps.some((row) => row.savingsCount > 0);
        const checklistStatus = {
            glAccounts: missingGlTypes.length === 0,
            financialMappings: financialActivities.length > 0 && missingFinancialActivities.length === 0,
            productAccounting: productTemplateReady,
            journalTest: null,
            periodClose: null,
        };

        return {
            accountsByType,
            activeAccounts,
            checklistStatus,
            endpointCount,
            failedEndpointCount,
            financialActivities,
            missingFinancialActivities,
            missingGlTypes,
            ready,
            templateGaps,
        };
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Accounting Readiness</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Validate GL account types, financial activity mappings, and product accounting templates.
                    </div>
                </div>
                <Button variant="secondary" onClick={load} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            {loading && !loaded ? (
                <Card><Skeleton height="16rem" /></Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <div className="text-sm text-gray-500">Overall</div>
                            <div className="mt-2"><StatusBadge ok={readiness.ready} /></div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-500">Active GL Accounts</div>
                            <div className="mt-2 text-2xl font-semibold">{readiness.activeAccounts.length}</div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-500">Mapped Activities</div>
                            <div className="mt-2 text-2xl font-semibold">
                                {data.financialMappings.length}/{readiness.financialActivities.length || '-'}
                            </div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-500">Endpoint Health</div>
                            <div className="mt-2 text-2xl font-semibold">
                                {readiness.endpointCount - readiness.failedEndpointCount}/{readiness.endpointCount}
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Operational Checklist</h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Follow this sequence when preparing accounting for posting and period operations.
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
                            {OPERATIONAL_CHECKLIST.map((step, index) => {
                                const status = readiness.checklistStatus[step.key];
                                const tone = status === null ? 'yellow' : status ? 'green' : 'red';
                                const label = status === null ? 'Manual check' : status ? 'Ready' : 'Needs setup';
                                return (
                                    <div key={step.key} className="grid gap-3 py-4 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="font-medium">{step.title}</div>
                                                <Badge tone={tone}>{label}</Badge>
                                            </div>
                                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.detail}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 md:justify-end">
                                            {step.links.map((link) => (
                                                <Link
                                                    key={link.to}
                                                    to={link.to}
                                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    {link.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {Object.keys(data.errors).length ? (
                        <Card className="border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-100">
                            <div className="font-semibold">Endpoint warnings</div>
                            <div className="mt-3 overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left">
                                        <th className="py-2 pr-4">Endpoint</th>
                                        <th className="py-2 pr-4">Message</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {Object.entries(data.errors).map(([key, message]) => (
                                        <tr key={key} className="border-t border-red-200 dark:border-red-800">
                                            <td className="py-2 pr-4 font-medium">{key}</td>
                                            <td className="py-2 pr-4">{message}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : null}

                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Required GL Account Types</h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    At least one active account is required for each core accounting type.
                                </div>
                            </div>
                            <StatusBadge ok={!readiness.missingGlTypes.length} />
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Active Accounts</th>
                                    <th className="py-2 pr-4">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {REQUIRED_GL_TYPES.map((type) => {
                                    const accounts = readiness.accountsByType[type.key] || [];
                                    return (
                                        <tr key={type.key} className="border-t border-gray-200 dark:border-gray-700">
                                            <td className="py-2 pr-4 font-medium">{type.label}</td>
                                            <td className="py-2 pr-4">
                                                {accounts.length ? accounts.slice(0, 4).map(accountLabel).join(', ') : 'None'}
                                                {accounts.length > 4 ? `, +${accounts.length - 4} more` : ''}
                                            </td>
                                            <td className="py-2 pr-4"><StatusBadge ok={accounts.length > 0} /></td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Financial Activity Mappings</h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Every activity from the Fineract template should have a GL account mapping.
                                </div>
                            </div>
                            <StatusBadge ok={!readiness.missingFinancialActivities.length && readiness.financialActivities.length > 0} />
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">Activity ID</th>
                                    <th className="py-2 pr-4">Activity</th>
                                    <th className="py-2 pr-4">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {readiness.financialActivities.length ? readiness.financialActivities.map((activity) => {
                                    const mapped = data.financialMappings.some(
                                        (mapping) => String(mapping?.financialActivityId) === String(activity.id)
                                    );
                                    return (
                                        <tr key={activity.id} className="border-t border-gray-200 dark:border-gray-700">
                                            <td className="py-2 pr-4">{activity.id}</td>
                                            <td className="py-2 pr-4">{activity.label}</td>
                                            <td className="py-2 pr-4"><StatusBadge ok={mapped} /></td>
                                        </tr>
                                    );
                                }) : (
                                    <tr className="border-t border-gray-200 dark:border-gray-700">
                                        <td className="py-3 pr-4" colSpan={3}>No financial activity options were returned by the template.</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Product Accounting Templates</h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Loan and savings product templates should expose account choices by type.
                                </div>
                            </div>
                            <StatusBadge ok={!data.errors.loanTemplate && !data.errors.savingsTemplate} />
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Loan Template Options</th>
                                    <th className="py-2 pr-4">Savings Template Options</th>
                                </tr>
                                </thead>
                                <tbody>
                                {readiness.templateGaps.map((row) => (
                                    <tr key={row.key} className="border-t border-gray-200 dark:border-gray-700">
                                        <td className="py-2 pr-4 font-medium">{row.label}</td>
                                        <td className="py-2 pr-4">{row.loanCount}</td>
                                        <td className="py-2 pr-4">{row.savingsCount}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default AccountingReadiness;
