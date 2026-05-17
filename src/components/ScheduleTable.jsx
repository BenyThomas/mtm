import React, { useState } from 'react';
import Card from './Card';
import { ChevronDown, ChevronUp } from 'lucide-react'; // icons

/**
 * Renders a repayment schedule with expandable rows.
 * Accepts Fineract-like schedule: { periods: [ { period, dueDate, principalDue, interestDue, totalDue, ... } ], ... }
 */
const ScheduleTable = ({ schedule }) => {
    const periods = schedule?.periods || [];
    const [open, setOpen] = useState({}); // {periodIndex: boolean}

    if (!periods.length) {
        return <Card>No schedule periods available.</Card>;
    }

    const arrDateToISO = (arr) => {
        if (!Array.isArray(arr) || arr.length < 3) return '';
        const [y, m, d] = arr;
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const formatDate = (value) => {
        const iso = Array.isArray(value) ? arrDateToISO(value) : (typeof value === 'string' ? value.slice(0, 10) : '');
        if (!iso) return '-';
        try {
            const parsed = new Date(`${iso}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) return iso;
            return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(parsed);
        } catch {
            return iso;
        }
    };

    const currency = schedule?.currency?.code || '';
    const format = (v) => {
        if (v == null || v === '') return '-';
        if (v === '-') return v;
        const num = Number(v);
        if (isNaN(num)) return String(v);
        return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;
    };

    const detailFields = (p) => ([
        { label: 'Paid On', value: formatDate(p.obligationsMetOnDate) },
        { label: 'From Date', value: formatDate(p.fromDate) },
        { label: 'Due Date', value: formatDate(p.dueDate) },
        { label: 'Principal Original Due', value: format(p.principalOriginalDue) },
        { label: 'Principal Due', value: format(p.principalDue) },
        { label: 'Principal Paid', value: format(p.principalPaid) },
        { label: 'Principal Written Off', value: format(p.principalWrittenOff) },
        { label: 'Principal Outstanding', value: format(p.principalOutstanding ?? p.principalLoanBalanceOutstanding) },
        { label: 'Interest Original Due', value: format(p.interestOriginalDue) },
        { label: 'Interest Due', value: format(p.interestDue) },
        { label: 'Interest Paid', value: format(p.interestPaid) },
        { label: 'Interest Waived', value: format(p.interestWaived) },
        { label: 'Interest Written Off', value: format(p.interestWrittenOff) },
        { label: 'Interest Outstanding', value: format(p.interestOutstanding) },
        { label: 'Fees Due', value: format(p.feeChargesDue) },
        { label: 'Fees Paid', value: format(p.feeChargesPaid) },
        { label: 'Fees Waived', value: format(p.feeChargesWaived) },
        { label: 'Fees Written Off', value: format(p.feeChargesWrittenOff) },
        { label: 'Fees Outstanding', value: format(p.feeChargesOutstanding) },
        { label: 'Penalty Due', value: format(p.penaltyChargesDue) },
        { label: 'Penalty Paid', value: format(p.penaltyChargesPaid) },
        { label: 'Penalty Waived', value: format(p.penaltyChargesWaived) },
        { label: 'Penalty Written Off', value: format(p.penaltyChargesWrittenOff) },
        { label: 'Penalty Outstanding', value: format(p.penaltyChargesOutstanding) },
        { label: 'Total Original Due', value: format(p.totalOriginalDueForPeriod) },
        { label: 'Installment', value: format(p.totalInstallmentAmountForPeriod ?? p.totalDueForPeriod) },
        { label: 'Total Paid', value: format(p.totalPaidForPeriod) },
        { label: 'Total Outstanding', value: format(p.totalOutstandingForPeriod) },
        { label: 'Loan Balance', value: format(p.principalLoanBalanceOutstanding) },
        { label: 'Days in Period', value: p.daysInPeriod ?? '-' },
        { label: 'Down Payment Period', value: typeof p.downPaymentPeriod === 'boolean' ? (p.downPaymentPeriod ? 'Yes' : 'No') : '-' },
        { label: 'Down Payment Amount', value: format(p.downPaymentAmount) },
        { label: 'Completed', value: typeof p.complete === 'boolean' ? (p.complete ? 'Yes' : 'No') : '-' },
    ]).filter((item) => item.value !== '-' && item.value !== null && item.value !== undefined);

    const isPast = (iso) => {
        if (!iso) return false;
        const today = new Date();
        const date = new Date(iso);
        // compare only Y-M-D (strip time)
        return date.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
    };

    const periodStatus = (p) => {
        if (p?.complete) return 'Paid';
        const dueISO = arrDateToISO(p?.dueDate);
        const outstanding = Number(p?.totalOutstandingForPeriod ?? 0);
        if (outstanding > 0) {
            if (isPast(dueISO)) return 'Overdue';
            const principal = p.principalDue ?? p.principalOriginalDue ?? 0;
            const interest = p.interestDue ?? p.interestOriginalDue ?? 0;
            const fees = p.feeChargesDue ?? 0;
            const penalties = p.penaltyChargesDue ?? 0;
            const totalDue = Number(principal) + Number(interest) + Number(fees) + Number(penalties);
            if (outstanding < totalDue - 0.01) return 'Partial';
        }
        return 'Upcoming';
    };

    // Row styling by status
    const rowClassForStatus = (s) => {
        switch (s) {
            case 'Paid':
                return 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case 'Overdue':
                return 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            case 'Partial':
                return 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
            default:
                return 'bg-gray-50 text-gray-800 dark:bg-gray-800/30 dark:text-gray-200';
        }
    };

    // Status text color (keeps header/body readability)
    const statusTextClass = (s) => {
        switch (s) {
            case 'Paid':
                return 'text-green-700 dark:text-green-300';
            case 'Overdue':
                return 'text-red-700 dark:text-red-300';
            case 'Partial':
                return 'text-amber-700 dark:text-amber-300';
            default:
                return 'text-gray-700 dark:text-gray-300';
        }
    };

    // Details row background to match but slightly lighter/darker
    const detailsRowClassForStatus = (s) => {
        switch (s) {
            case 'Paid':
                return 'bg-green-100/60 dark:bg-green-900/50';
            case 'Overdue':
                return 'bg-red-100/60 dark:bg-red-900/50';
            case 'Partial':
                return 'bg-amber-100/60 dark:bg-amber-900/50';
            default:
                return 'bg-gray-100/60 dark:bg-gray-800/50';
        }
    };

    const overdueInstallments = periods.filter((p) => periodStatus(p) === 'Overdue').length;
    const totalExpected =
        schedule?.totalRepaymentExpected ??
        periods.reduce((sum, p) => sum + Number(p?.totalDueForPeriod ?? p?.totalInstallmentAmountForPeriod ?? 0), 0);
    const totalPaid =
        schedule?.totalPaidInAdvance ??
        periods.reduce((sum, p) => sum + Number(p?.totalPaidForPeriod ?? 0), 0);
    const totalOutstanding =
        schedule?.totalOutstanding ??
        periods.reduce((sum, p) => sum + Number(p?.totalOutstandingForPeriod ?? 0), 0);

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Expected</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{format(totalExpected)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Paid</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{format(totalPaid)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Outstanding</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{format(totalOutstanding)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Overdue Installments</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{overdueInstallments}</div>
                </div>
            </div>

            <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Due Date</th>
                    <th className="py-2 pr-4">Paid Date</th>
                    <th className="py-2 pr-4">Principal</th>
                    <th className="py-2 pr-4">Interest</th>
                    <th className="py-2 pr-4">Fees</th>
                    <th className="py-2 pr-4">Penalties</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Balance</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Action</th>
                </tr>
                </thead>
                <tbody>
                {periods
                    .filter((p) => p?.period || p?.period === 0) // show all periods (including 0 if present)
                    .map((p, idx) => {
                        const isOpen = !!open[idx];
                        const dueISO = arrDateToISO(p?.dueDate) || '-';
                        const principal = p.principalDue ?? p.principalOriginalDue ?? 0;
                        const interest = p.interestDue ?? p.interestOriginalDue ?? 0;
                        const fees = p.feeChargesDue ?? 0;
                        const penalties = p.penaltyChargesDue ?? 0;
                        const total =
                            p.totalDueForPeriod ??
                            p.totalInstallmentAmountForPeriod ??
                            Number(principal) + Number(interest) + Number(fees) + Number(penalties);
                        const balance = p.principalLoanBalanceOutstanding ?? p.principalOutstanding ?? '-';
                        const s = periodStatus(p);
                        const fields = detailFields(p);

                        return (
                            <React.Fragment key={idx}>
                                <tr
                                    className={`border-t border-gray-200 dark:border-gray-700 text-sm transition-colors ${rowClassForStatus(
                                        s
                                    )}`}
                                >
                                    <td className="py-2 pr-4">{p.period ?? (idx === 0 ? 'D' : idx)}</td>
                                    <td className="py-2 pr-4">{formatDate(p.dueDate)}</td>
                                    <td className="py-2 pr-4">{formatDate(p.obligationsMetOnDate)}</td>
                                    <td className="py-2 pr-4">{format(principal)}</td>
                                    <td className="py-2 pr-4">{format(interest)}</td>
                                    <td className="py-2 pr-4">{format(fees)}</td>
                                    <td className="py-2 pr-4">{format(penalties)}</td>
                                    <td className="py-2 pr-4 font-semibold">{format(total)}</td>
                                    <td className="py-2 pr-4">{format(balance)}</td>
                                    <td className={`py-2 pr-4 font-medium ${statusTextClass(s)}`}>{s}</td>
                                    <td className="py-2 pr-4">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                                            onClick={() =>
                                                setOpen((o) => ({ ...o, [idx]: !o[idx] }))
                                            }
                                        >
                                            {isOpen ? (
                                                <>
                                                    <ChevronUp size={16} strokeWidth={2} />
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={16} strokeWidth={2} />
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>

                                {isOpen && (
                                    <tr className={`${detailsRowClassForStatus(s)} text-xs`}>
                                        <td colSpan={11} className="py-3 pr-4 text-gray-700 dark:text-gray-200">
                                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                {fields.map((field) => (
                                                    <div key={`${idx}-${field.label}`}>
                                                        <div className="text-gray-600 dark:text-gray-300">{field.label}</div>
                                                        <div className="font-medium">{field.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
        </div>
    );
};

export default ScheduleTable;
