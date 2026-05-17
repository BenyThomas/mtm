import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Tabs from '../../components/Tabs';
import Skeleton from '../../components/Skeleton';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ClientDocumentsTab from './ClientDocumentsTab';
import ClientCharges from './ClientCharges';
import ClientAddresses from './ClientAddresses';
import ClientCommandModal from '../../components/ClientCommandModal';
import ClientIdentifiers from './ClientIdentifiers';
import ClientTransactions from './ClientTransactions';
import ClientCollaterals from './ClientCollaterals';
import LoanTab from './LoanTab';
import ClientFamilyMembersTab from '../ClientFamilyMembersTab';
import ClientImageTab from './ClientImageTab';
import ClientNotesTimelineTab from './ClientNotesTimelineTab';
import ClientAccountsOverview from './ClientAccountsOverview';
import { getVisibleClientActions } from '../../utils/clientActions';

const statusTone = (s) => {
    const code = s?.code || s?.value || '';
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted/i.test(code)) return 'yellow';
    if (/closed|dormant|inactivated/i.test(code)) return 'gray';
    return 'gray';
};

const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join('-');
    if (typeof value === 'object') return value.value || value.code || value.name || '-';
    return String(value);
};

const fullName = (client) =>
    client?.displayName ||
    [client?.firstname, client?.middlename, client?.lastname].filter(Boolean).join(' ') ||
    '-';

const OverviewField = ({ label, value, emphasis = false }) => (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <div className={`mt-1 break-words ${emphasis ? 'text-base font-semibold text-slate-900 dark:text-slate-50' : 'text-sm text-slate-700 dark:text-slate-200'}`}>
            {value}
        </div>
    </div>
);

const OverviewSection = ({ title, children }) => (
    <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/30">
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {children}
        </div>
    </div>
);

const actionButtonClass = () =>
    'border border-[color:var(--tenant-primary)]/20 bg-[color:var(--tenant-primary)]/8 text-[var(--tenant-primary)] hover:bg-[color:var(--tenant-primary)]/14 dark:border-[color:var(--tenant-primary)]/35 dark:bg-[color:var(--tenant-primary)]/12 dark:hover:bg-[color:var(--tenant-primary)]/18';

const IconActionButton = ({ icon: Icon, title, className = '', ...props }) => (
    <Button
        size="sm"
        variant="ghost"
        className={`h-11 w-11 shrink-0 rounded-xl p-0 shadow-sm ${actionButtonClass()} ${className}`.trim()}
        title={title}
        aria-label={title}
        {...props}
    >
        <Icon size={20} strokeWidth={2.5} />
    </Button>
);

const ClientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState(null);
    const [accounts, setAccounts] = useState(null);
    const [commandOpen, setCommandOpen] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [c, a] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/clients/${id}/accounts`),
            ]);
            setClient(c.data);
            setAccounts(a.data);
        } catch {
            setClient(null);
            setAccounts(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const hasAssignedStaff = Boolean(client?.staffId || client?.staffName);
    const savingsAccounts = Array.isArray(accounts?.savingsAccounts) ? accounts.savingsAccounts : [];
    const clientActions = useMemo(
        () => getVisibleClientActions(client, { hasAssignedStaff, savingsAccounts }),
        [client, hasAssignedStaff, savingsAccounts]
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="8rem" /></Card>
                <Card><Skeleton height="12rem" /></Card>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Client</h1>
                <Card>Client not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">{fullName(client)}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Client #{client.id} {client.accountNo ? `• ${client.accountNo}` : ''}
                        {client.status ? (
                            <span className="ml-2">
                                <Badge tone={statusTone(client.status)}>{client.status?.value || client.status?.code}</Badge>
                            </span>
                        ) : null}
                        {client.officeName ? <span className="ml-2">• {client.officeName}</span> : null}
                        {client.staffName ? <span className="ml-2">• {client.staffName}</span> : null}
                    </div>
                </div>
                    <div className="flex items-center gap-2">
                        {clientActions.map((action) => (
                            <IconActionButton
                                key={action.command}
                                icon={action.icon}
                                title={action.title}
                                onClick={() => setCommandOpen(action.command)}
                            />
                        ))}
                        <IconActionButton
                            icon={Pencil}
                            title="Edit client"
                            onClick={() => navigate(`/clients/${id}/edit`)}
                        />
                        <IconActionButton
                            icon={RefreshCw}
                            title="Refresh client"
                            onClick={load}
                        />
                    </div>
                </div>

            <Tabs
                tabs={[
                    { key: 'overview', label: 'Overview' },
                    { key: 'image', label: 'Image' },
                    { key: 'accounts', label: 'Accounts' },
                    { key: 'loans', label: 'Loans' },
                    { key: 'documents', label: 'Documents' },
                    { key: 'timeline', label: 'Timeline' },
                    { key: 'charges', label: 'Charges' },
                    { key: 'address', label: 'Address' },
                    { key: 'family', label: 'Family' },
                    { key: 'identifiers', label: 'Identifiers' },
                    { key: 'transactions', label: 'Transactions' },
                    { key: 'collateral', label: 'Collaterals' },
                ]}
            >
                <div data-tab="overview" className="space-y-4">
                    <Card>
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <OverviewField label="Client Name" value={fullName(client)} emphasis />
                                <OverviewField label="Status" value={formatValue(client.status)} emphasis />
                                <OverviewField label="Office" value={formatValue(client.officeName)} />
                                <OverviewField label="Assigned Staff" value={formatValue(client.staffName)} />
                            </div>

                            <OverviewSection title="Identity">
                                <OverviewField label="Client ID" value={formatValue(client.id)} />
                                <OverviewField label="Account No" value={formatValue(client.accountNo)} />
                                <OverviewField label="External ID" value={formatValue(client.externalId)} />
                                <OverviewField label="Legal Form" value={formatValue(client.legalForm)} />
                                <OverviewField label="Client Type" value={formatValue(client.clientType)} />
                                <OverviewField label="Classification" value={formatValue(client.clientClassification)} />
                            </OverviewSection>

                            <OverviewSection title="Personal Details">
                                <OverviewField label="First Name" value={formatValue(client.firstname)} />
                                <OverviewField label="Middle Name" value={formatValue(client.middlename)} />
                                <OverviewField label="Last Name" value={formatValue(client.lastname)} />
                                <OverviewField label="Date of Birth" value={formatValue(client.dateOfBirth)} />
                                <OverviewField label="Gender" value={formatValue(client.gender)} />
                            </OverviewSection>

                            <OverviewSection title="Contact">
                                <OverviewField label="Mobile" value={formatValue(client.mobileNo)} />
                                <OverviewField label="Email" value={formatValue(client.emailAddress)} />
                            </OverviewSection>

                            <OverviewSection title="Lifecycle">
                                <OverviewField label="Submitted On" value={formatValue(client.submittedOnDate)} />
                                <OverviewField label="Activation Date" value={formatValue(client.activationDate)} />
                                <OverviewField label="Closed On" value={formatValue(client.closedOnDate)} />
                            </OverviewSection>
                        </div>
                    </Card>
                </div>

                <div data-tab="image" className="space-y-4">
                    <ClientImageTab clientId={id} />
                </div>

                <div data-tab="accounts" className="space-y-4">
                    <ClientAccountsOverview accounts={accounts} />
                </div>

                <div data-tab="loans" className="space-y-4">
                    <Card>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <LoanTab clientId={id} />
                        </div>
                    </Card>
                </div>

                <div data-tab="documents" className="space-y-4">
                    <ClientDocumentsTab clientId={id} />
                </div>

                <div data-tab="timeline" className="space-y-4">
                    <ClientNotesTimelineTab clientId={id} client={client} />
                </div>

                <div data-tab="charges" className="space-y-4">
                    <ClientCharges clientId={id} />
                </div>

                <div data-tab="address" className="space-y-4">
                    <ClientAddresses clientId={id} />
                </div>

                <div data-tab="identifiers" className="space-y-4">
                    <ClientIdentifiers clientId={id} />
                </div>

                <div data-tab="family" className="space-y-4">
                    <ClientFamilyMembersTab clientId={id} />
                </div>

                <div data-tab="transactions" className="space-y-4">
                    <ClientTransactions clientId={id} clientExternalId={client.externalId} />
                </div>

                <div data-tab="collateral" className="space-y-4">
                    <ClientCollaterals clientId={id} />
                </div>
            </Tabs>

            <ClientCommandModal
                open={Boolean(commandOpen)}
                client={client}
                initialCommand={commandOpen || 'activate'}
                lockCommand
                onClose={() => setCommandOpen('')}
                onDone={() => {
                    setCommandOpen('');
                    load();
                }}
            />
        </div>
    );
};

export default ClientProfile;
