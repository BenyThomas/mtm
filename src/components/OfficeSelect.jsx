import React from 'react';
import useOffices from '../hooks/useOffices';
import Skeleton from './Skeleton';

const OfficeSelect = ({ value, onChange, includeAll = false, disabled = false, className = '' }) => {
    const { offices, loading } = useOffices();

    if (loading) {
        return <Skeleton height="2.25rem" />;
    }

    return (
        <select
            disabled={disabled}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value || '')}
            className={`w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 ${className}`}
        >
            {includeAll && <option value="">All offices</option>}
            {offices.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.name}{o.parentName ? ` — ${o.parentName}` : ''}
                </option>
            ))}
        </select>
    );
};

export default OfficeSelect;
