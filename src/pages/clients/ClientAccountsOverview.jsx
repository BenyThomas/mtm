import React, { useMemo } from 'react';
import { Activity, ArrowRightLeft, Eye, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';

const statusTone = (status) => {
    const code = (status?.code || status?.value || status || '').toString();
    if (/active|approved|open/i.test(code)) return 'green';
    if (/pending|submitted|hold|matured/i.test(code)) return 'yellow';
    if (/closed|withdrawn|rejected|inactive/i.test(code)) return 'gray';
    return 'gray';
};

const moneyValue = (row) => {
    const summary = row?.summary || {};
    return summary.accountBalance
        ?? summary.totalDeposits
        ?? summary.totalApprovedShares
        ?? row?.loanBalance
        ?? row?.amount
        ?? row?.principal
        ?? '-';
};

const currencyCode = (row) => {
    const summary = row?.summary || {};
    return summary.currency?.code || row?.currency?.code || row?.currencyCode || '';
};

const normalizeAccounts = (accounts) => ({
    loans: Array.isArray(accounts?.loanAccounts) ? accounts.loanAccounts : [],
    savings: Array.isArray(accounts?.savingsAccounts) ? accounts.savingsAccounts : [],
    shares: Array.isArray(accounts?.shareAccounts) ? accounts.shareAccounts : [],
    fixedDeposits: Array.isArray(accounts?.fixedDepositAccounts) ? accounts.fixedDepositAccounts : [],
    recurringDeposits: Array.isArray(accounts?.recurringDepositAccounts) ? accounts.recurringDepositAccounts : [],
});

const Section = ({ title, rows, rowLink, rowActions }) => {
    if (!rows.length) return null;
    return (
        <Card>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400">{rows.length} item(s)</div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="text-left text-sm text-slate-500">
                        <th className="py-2 pr-4">#</th>
                        <th className="py-2 pr-4">Account No</th>
                        <th className="py-2 pr-4">Product</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4" />
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row, index) => {
                        const productName = row.productName || row.loanProductName || row.savingsProductName || row.shareProductName || '-';
                        const amount = moneyValue(row);
                        const code = currencyCode(row);
                        const accountNo = row.accountNo || row.externalId || '-';
                        return (
                            <tr key={row.id || `${title}-${index}`} className="border-t border-slate-200 text-sm dark:border-slate-700">
                                <td className="py-2 pr-4">{row.id || '-'}</td>
                                <td className="py-2 pr-4">{accountNo}</td>
                                <td className="py-2 pr-4">{productName}</td>
                                <td className="py-2 pr-4">
                                    <Badge tone={statusTone(row.status)}>{row.status?.value || row.status?.code || '-'}</Badge>
                                </td>
                                <td className="py-2 pr-4">{amount} {code}</td>
                                <td className="py-2 pr-4 whitespace-nowrap">
                                    {rowActions ? rowActions(row) : rowLink ? (
                                        <Button size="sm" variant="secondary" onClick={() => rowLink(row)}>
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Button>
                                    ) : null}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const ClientAccountsOverview = ({ accounts }) => {
    const navigate = useNavigate();
    const normalized = useMemo(() => normalizeAccounts(accounts || {}), [accounts]);
    const summary = useMemo(() => ([
        { label: 'Loans', value: normalized.loans.length },
        { label: 'Savings', value: normalized.savings.length },
        { label: 'Shares', value: normalized.shares.length },
        { label: 'Fixed Deposits', value: normalized.fixedDeposits.length },
        { label: 'Recurring Deposits', value: normalized.recurringDeposits.length },
    ]), [normalized]);

    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {summary.map((item) => (
                    <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50"
                    >
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{item.value}</div>
                    </div>
                ))}
            </div>

            {!summary.some((item) => item.value > 0) ? (
                <Card>
                    <div className="text-sm text-slate-500 dark:text-slate-400">No client accounts found.</div>
                </Card>
            ) : null}

            <Section title="Loan Accounts" rows={normalized.loans} rowLink={(row) => navigate(`/loans/${row.id}`)} />
            <Section
                title="Savings Accounts"
                rows={normalized.savings}
                rowActions={(row) => (
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/savings/${row.id}`)}>
                            <Eye className="h-4 w-4" />
                            View
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/savings/${row.id}?tab=actions`)}>
                            <ListChecks className="h-4 w-4" />
                            Actions
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/savings/${row.id}?tab=transactions`)}>
                            <Activity className="h-4 w-4" />
                            Txns
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/savings/${row.id}?tab=transfers`)}>
                            <ArrowRightLeft className="h-4 w-4" />
                            Transfer
                        </Button>
                    </div>
                )}
            />
            <Section title="Share Accounts" rows={normalized.shares} rowLink={(row) => navigate(`/shares/${row.id}`)} />
            <Section title="Fixed Deposit Accounts" rows={normalized.fixedDeposits} />
            <Section title="Recurring Deposit Accounts" rows={normalized.recurringDeposits} />
        </div>
    );
};

export default ClientAccountsOverview;
