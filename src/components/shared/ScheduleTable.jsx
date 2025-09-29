import React, { useState } from 'react';
import Card from './Card';

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

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                <tr className="text-left text-sm text-gray-500">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Due Date</th>
                    <th className="py-2 pr-4">Principal</th>
                    <th className="py-2 pr-4">Interest</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4"></th>
                </tr>
                </thead>
                <tbody>
                {periods
                    .filter((p) => (p?.period || p?.period === 0)) // keep all, but usually first is disbursement period
                    .map((p, idx) => {
                        const isOpen = !!open[idx];
                        const due =
                            Array.isArray(p.dueDate) ? p.dueDate.join('-') : p.dueDate || '-';
                        const principal = p.principalDue ?? p.principalOriginalDue ?? 0;
                        const interest = p.interestDue ?? p.interestOriginalDue ?? 0;
                        const total = p.totalDueForPeriod ?? p.totalInstallmentAmount ?? (Number(principal) + Number(interest));
                        return (
                            <React.Fragment key={idx}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{p.period}</td>
                                    <td className="py-2 pr-4">{due}</td>
                                    <td className="py-2 pr-4">{principal}</td>
                                    <td className="py-2 pr-4">{interest}</td>
                                    <td className="py-2 pr-4">{total}</td>
                                    <td className="py-2 pr-4">
                                        <button
                                            className="text-primary hover:underline"
                                            onClick={() => setOpen((o) => ({ ...o, [idx]: !o[idx] }))}
                                        >
                                            {isOpen ? 'Hide' : 'Details'}
                                        </button>
                                    </td>
                                </tr>
                                {isOpen ? (
                                    <tr className="text-xs text-gray-600 dark:text-gray-400">
                                        <td colSpan={6} className="py-2 pr-4">
                                            <div className="grid sm:grid-cols-3 gap-3">
                                                <div>
                                                    <div className="text-gray-500">Principal Due</div>
                                                    <div className="font-medium">{p.principalDue ?? '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Interest Due</div>
                                                    <div className="font-medium">{p.interestDue ?? '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Fees Due</div>
                                                    <div className="font-medium">{p.feeChargesDue ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Penalty Due</div>
                                                    <div className="font-medium">{p.penaltyChargesDue ?? 0}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Principal Outstanding</div>
                                                    <div className="font-medium">{p.principalLoanBalanceOutstanding ?? '-'}</div>
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
    );
};

export default ScheduleTable;
