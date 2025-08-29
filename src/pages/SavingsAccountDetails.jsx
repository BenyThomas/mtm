import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';
import Button from '../components/Button';

const statusTone = (s) => {
    const code = s?.code || s?.value || '';
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted/i.test(code)) return 'yellow';
    if (/closed|dormant|inactivated/i.test(code)) return 'gray';
    return 'gray';
};

const SavingsAccountDetails = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [acc, setAcc] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/savingsaccounts/${id}`);
            setAcc(res.data);
        } catch {
            setAcc(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const summary = useMemo(() => acc?.summary || acc || {}, [acc]);
    const currency = summary?.currency?.code || summary?.currencyCode || '';
    const balance = summary?.accountBalance ?? summary?.balance ?? '-';
    const available = summary?.availableBalance ?? '-';
    const interestRate = acc?.nominalAnnualInterestRate ?? acc?.interestRate ?? '-';

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="10rem" /></Card>
            </div>
        );
    }

    if (!acc) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Savings Account</h1>
                <Card>Account not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Savings #{acc.id} {acc.accountNo ? `• ${acc.accountNo}` : ''}
                    </h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {acc.status && (
                            <Badge tone={statusTone(acc.status)}>
                                {acc.status?.value || acc.status?.code}
                            </Badge>
                        )}
                        {acc.clientName ? <span className="ml-2">• {acc.clientName}</span> : null}
                        {acc.savingsProductName ? <span className="ml-2">• {acc.savingsProductName}</span> : null}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Product</div>
                        <div className="font-medium">{acc.savingsProductName || acc.productName || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Currency</div>
                        <div className="font-medium">{currency || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Interest Rate (Nominal Annual)</div>
                        <div className="font-medium">{interestRate}</div>
                    </div>

                    <div>
                        <div className="text-gray-500">Account Balance</div>
                        <div className="font-semibold">{balance} {currency}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Available Balance</div>
                        <div className="font-semibold">{available} {currency}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Status</div>
                        <div className="font-medium">{acc.status?.value || acc.status?.code || '-'}</div>
                    </div>

                    <div>
                        <div className="text-gray-500">Minimum Required Balance</div>
                        <div className="font-medium">{acc.minRequiredBalance ?? '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Interest Compounding</div>
                        <div className="font-medium">{acc.interestCompoundingPeriodType?.value || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Lock-in Period</div>
                        <div className="font-medium">
                            {acc.lockinPeriodFrequency ? `${acc.lockinPeriodFrequency} × ${acc.lockinPeriodFrequencyType?.value || ''}` : '-'}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SavingsAccountDetails;
