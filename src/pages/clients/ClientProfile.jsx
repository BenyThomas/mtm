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

// NEW
import ClientIdentifiers from './ClientIdentifiers';
import ClientTransactions from './ClientTransactions';
import ClientCollaterals from "./ClientCollaterals";
import LoanTab from "./LoanTab";

const statusTone = (s) => {
    const code = s?.code || s?.value || '';
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted/i.test(code)) return 'yellow';
    if (/closed|dormant|inactivated/i.test(code)) return 'gray';
    return 'gray';
};

const ClientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState(null);
    const [accounts, setAccounts] = useState(null);

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

    const savings = useMemo(() => {
        return accounts?.savingsAccounts || [];
    }, [accounts]);

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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {client.displayName || [client.firstname, client.lastname].filter(Boolean).join(' ')}
                    </h1>
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
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                tabs={[
                    { key: 'overview', label: 'Overview' },
                    { key: 'loans', label: 'Loans' },
                    { key: 'savings', label: 'Savings' },
                    { key: 'documents', label: 'Documents' },
                    { key: 'timeline', label: 'Timeline' },
                    { key: 'charges', label: 'Charges' },
                    { key: 'address', label: 'Address' },
                    // NEW:
                    { key: 'identifiers', label: 'Identifiers' },
                    { key: 'transactions', label: 'Transactions' },
                    { key: 'collateral', label: 'Collaterals' },
                ]}
            >
                {/* Overview */}
                <div data-tab="overview" className="space-y-4">
                    <Card>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-gray-500">Office</div>
                                <div className="font-medium">{client.officeName || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Mobile</div>
                                <div className="font-medium">{client.mobileNo || '-'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Activation Date</div>
                                <div className="font-medium">
                                    {Array.isArray(client.activationDate) ? client.activationDate.join('-') : (client.activationDate || '-')}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">External ID</div>
                                <div className="font-medium">{client.externalId || '—'}</div>
                            </div>
                        </div>
                    </Card>
                </div>
                {/*389*/}
                {/*667*/}

                {/* Loans (placeholder) */}
                <div data-tab="loans" className="space-y-4">
                    <Card>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <LoanTab clientId={id} />
                        </div>
                    </Card>
                </div>

                {/* Savings */}
                <div data-tab="savings" className="space-y-4">
                    <Card>
                        <div className="flex items-center justify-between mb-3">
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
                                            <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                                <td className="py-2 pr-4">{s.id}</td>
                                                <td className="py-2 pr-4">{s.accountNo || '-'}</td>
                                                <td className="py-2 pr-4">{s.productName || s.savingsProductName || '-'}</td>
                                                <td className="py-2 pr-4">
                                                    <Badge tone={statusTone(s.status)}>{s.status?.value || s.status?.code || '-'}</Badge>
                                                </td>
                                                <td className="py-2 pr-4">{balance} {currency}</td>
                                                <td className="py-2 pr-4">
                                                    <Button variant="secondary" onClick={() => navigate(`/savings/${s.id}`)}>
                                                        View
                                                    </Button>
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

                {/* Documents */}
                <div data-tab="documents" className="space-y-4">
                    <ClientDocumentsTab clientId={id} />
                </div>

                {/* Timeline */}
                <div data-tab="timeline" className="space-y-4">
                    <Card>Client timeline and notes appear here.</Card>
                </div>

                {/* Charges */}
                <div data-tab="charges" className="space-y-4">
                    <ClientCharges clientId={id} />
                </div>

                {/* Address */}
                <div data-tab="address" className="space-y-4">
                    <ClientAddresses clientId={id} />
                </div>

                {/* NEW: Identifiers */}
                <div data-tab="identifiers" className="space-y-4">
                    <ClientIdentifiers clientId={id} />
                </div>

                {/* NEW: Transactions */}
                <div data-tab="transactions" className="space-y-4">
                    <ClientTransactions clientId={id} clientExternalId={client.externalId} />
                </div>
                {/* Collaterals */}
                <div data-tab="collateral" className="space-y-4">
                    <ClientCollaterals clientId={id} />
                </div>
            </Tabs>
        </div>
    );
};

export default ClientProfile;
