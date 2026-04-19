import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const ClientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState(null);
    const [accounts, setAccounts] = useState(null);
    const [commandOpen, setCommandOpen] = useState(false);

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

    const savings = useMemo(() => accounts?.savingsAccounts || [], [accounts]);

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
                    <h1 className="text-2xl font-bold">{fullName(client)}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Client #{client.id} {client.accountNo ? `• ${client.accountNo}` : ''}
                        {client.status ? (
                            <span className="ml-2">
                                <Badge tone={statusTone(client.status)}>{client.status?.value || client.status?.code}</Badge>
                            </span>
                        ) : null}
                        {client.officeName ? <span className="ml-2">• {client.officeName}</span> : null}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => setCommandOpen(true)}>Actions</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Tabs
                tabs={[
                    { key: 'overview', label: 'Overview' },
                    { key: 'loans', label: 'Loans' },
                    { key: 'savings', label: 'Savings' },
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
                        <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                            <div><div className="text-gray-500">Display Name</div><div className="font-medium">{fullName(client)}</div></div>
                            <div><div className="text-gray-500">Client ID</div><div className="font-medium">{formatValue(client.id)}</div></div>
                            <div><div className="text-gray-500">Account No</div><div className="font-medium">{formatValue(client.accountNo)}</div></div>
                            <div><div className="text-gray-500">Status</div><div className="font-medium">{formatValue(client.status)}</div></div>
                            <div><div className="text-gray-500">Office</div><div className="font-medium">{formatValue(client.officeName)}</div></div>
                            <div><div className="text-gray-500">Staff</div><div className="font-medium">{formatValue(client.staffName)}</div></div>
                            <div><div className="text-gray-500">Submitted On</div><div className="font-medium">{formatValue(client.submittedOnDate)}</div></div>
                            <div><div className="text-gray-500">Activation Date</div><div className="font-medium">{formatValue(client.activationDate)}</div></div>
                            <div><div className="text-gray-500">Closed On</div><div className="font-medium">{formatValue(client.closedOnDate)}</div></div>
                            <div><div className="text-gray-500">External ID</div><div className="font-medium">{formatValue(client.externalId)}</div></div>
                            <div><div className="text-gray-500">Mobile</div><div className="font-medium">{formatValue(client.mobileNo)}</div></div>
                            <div><div className="text-gray-500">Email</div><div className="font-medium">{formatValue(client.emailAddress)}</div></div>
                            <div><div className="text-gray-500">Date of Birth</div><div className="font-medium">{formatValue(client.dateOfBirth)}</div></div>
                            <div><div className="text-gray-500">Gender</div><div className="font-medium">{formatValue(client.gender)}</div></div>
                            <div><div className="text-gray-500">Client Type</div><div className="font-medium">{formatValue(client.clientType)}</div></div>
                            <div><div className="text-gray-500">Client Classification</div><div className="font-medium">{formatValue(client.clientClassification)}</div></div>
                            <div><div className="text-gray-500">Legal Form</div><div className="font-medium">{formatValue(client.legalForm)}</div></div>
                        </div>
                    </Card>
                </div>

                <div data-tab="loans" className="space-y-4">
                    <Card>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <LoanTab clientId={id} />
                        </div>
                    </Card>
                </div>

                <div data-tab="savings" className="space-y-4">
                    <Card>
                        <div className="mb-3 flex items-center justify-between">
                            <div className="font-semibold">Savings Accounts</div>
                        </div>

                        {!savings.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No savings accounts.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        <th className="py-2 pr-4">#</th>
                                        <th className="py-2 pr-4">Account No</th>
                                        <th className="py-2 pr-4">Product</th>
                                        <th className="py-2 pr-4">Status</th>
                                        <th className="py-2 pr-4">Balance</th>
                                        <th className="py-2 pr-4"></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {savings.map((s) => {
                                        const sum = s.summary || s;
                                        const balance = sum.accountBalance ?? sum.balance ?? '-';
                                        const currency = (sum.currency && (sum.currency.code || sum.currency.name)) || s.currencyCode || '';
                                        return (
                                            <tr key={s.id} className="border-t border-gray-200 text-sm dark:border-gray-700">
                                                <td className="py-2 pr-4">{s.id}</td>
                                                <td className="py-2 pr-4">{s.accountNo || '-'}</td>
                                                <td className="py-2 pr-4">{s.productName || s.savingsProductName || '-'}</td>
                                                <td className="py-2 pr-4">
                                                    <Badge tone={statusTone(s.status)}>{s.status?.value || s.status?.code || '-'}</Badge>
                                                </td>
                                                <td className="py-2 pr-4">{balance} {currency}</td>
                                                <td className="py-2 pr-4">
                                                    <Button variant="secondary" onClick={() => navigate(`/savings/${s.id}`)}>View</Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                <div data-tab="documents" className="space-y-4">
                    <ClientDocumentsTab clientId={id} />
                </div>

                <div data-tab="timeline" className="space-y-4">
                    <Card>Client timeline and notes appear here.</Card>
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
                open={commandOpen}
                client={client}
                onClose={() => setCommandOpen(false)}
                onDone={() => {
                    setCommandOpen(false);
                    load();
                }}
            />
        </div>
    );
};

export default ClientProfile;
