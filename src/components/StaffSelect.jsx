import React, { useMemo, useState } from 'react';
import useStaff from '../hooks/useStaff';
import Skeleton from './Skeleton';
import OfficeSelect from './OfficeSelect';

const StaffSelect = ({
                         value,
                         onChange,
                         officeFilterEnabled = true,
                         loanOfficerOnly = false,
                         activeOnly = true,
                         className = '',
                     }) => {
    const [officeId, setOfficeId] = useState('');
    const [query, setQuery] = useState('');
    const { staff, onlyLoanOfficers, loading } = useStaff({ officeId, activeOnly });

    const options = useMemo(() => {
        const list = loanOfficerOnly ? onlyLoanOfficers : staff;
        const q = query.trim().toLowerCase();
        if (!q) return list;
        return list.filter((s) =>
            [s.displayName, s.officeName, String(s.id)].some((f) => (f || '').toLowerCase().includes(q))
        );
    }, [loanOfficerOnly, staff, onlyLoanOfficers, query]);

    if (loading) {
        return <Skeleton height="6rem" />;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {officeFilterEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <OfficeSelect
                        includeAll
                        value={officeId}
                        onChange={setOfficeId}
                    />
                    <input
                        placeholder="Search staff (name, id, office)…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            )}
            <select
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
            >
                <option value="">Select staff</option>
                {options.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.displayName} {s.isLoanOfficer ? '• Loan Officer' : ''} — {s.officeName}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default StaffSelect;
