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

    return (
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
                        const balance = p.principalLoanBalanceOutstanding ?? '-';
                        const currency = schedule?.currency?.code || '';
                        const format = (v) => {
                            if (v == null || v === '-') return v;
                            const num = Number(v);
                            if (isNaN(num)) return v;
                            return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
                        };
                        const s = periodStatus(p);

                        return (
                            <React.Fragment key={idx}>
                                <tr
                                    className={`border-t border-gray-200 dark:border-gray-700 text-sm transition-colors ${rowClassForStatus(
                                        s
                                    )}`}
                                >
                                    <td className="py-2 pr-4">{p.period ?? (idx === 0 ? 'D' : idx)}</td>
                                    <td className="py-2 pr-4">{dueISO}</td>
                                    <td className="py-2 pr-4">{arrDateToISO(p.obligationsMetOnDate) || '-'}</td>
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
                                        <td colSpan={8} className="py-3 pr-4 text-gray-700 dark:text-gray-200">
                                            <div className="grid sm:grid-cols-3 gap-3">
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Paid On</div>
                                                    <div className="font-medium">
                                                        {arrDateToISO(p.obligationsMetOnDate) || '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Principal Paid</div>
                                                    <div className="font-medium">
                                                        {format(p.principalPaid ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Interest Paid</div>
                                                    <div className="font-medium">
                                                        {format(p.interestPaid ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Fees Paid</div>
                                                    <div className="font-medium">
                                                        {format(p.feeChargesPaid ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Penalty Paid</div>
                                                    <div className="font-medium">
                                                        {format(p.penaltyChargesPaid ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Principal Due</div>
                                                    <div className="font-medium">
                                                        {format(p.principalDue ?? p.principalOriginalDue ?? '-')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Interest Due</div>
                                                    <div className="font-medium">
                                                        {format(p.interestDue ?? p.interestOriginalDue ?? '-')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Fees Due</div>
                                                    <div className="font-medium">
                                                        {format(p.feeChargesDue ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Penalty Due</div>
                                                    <div className="font-medium">
                                                        {format(p.penaltyChargesDue ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">
                                                        Principal Outstanding
                                                    </div>
                                                    <div className="font-medium">
                                                        {format(p.principalLoanBalanceOutstanding ?? '-')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Installment</div>
                                                    <div className="font-medium">
                                                        {format(p.totalInstallmentAmountForPeriod ??
                                                            p.totalDueForPeriod ??
                                                            '-')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Paid</div>
                                                    <div className="font-medium">
                                                        {format(p.totalPaidForPeriod ?? 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600 dark:text-gray-300">Outstanding</div>
                                                    <div className="font-medium">
                                                        {format(p.totalOutstandingForPeriod ?? 0)}
                                                    </div>
                                                </div>
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
    );
};

export default ScheduleTable;
