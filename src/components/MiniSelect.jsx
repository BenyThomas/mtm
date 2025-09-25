import React from 'react';

/**
 * Props:
 *  - label: string
 *  - value: string | number | null
 *  - onChange: (id) => void
 *  - options: [{ id, label }]
 *  - placeholder?: string
 *  - disabled?: boolean
 *  - required?: boolean
 *  - searchable?: boolean
 */
const MiniSelect = ({
                        label,
                        value,
                        onChange,
                        options,
                        placeholder = 'Select…',
                        disabled = false,
                        required = false,
                        searchable = true,
                    }) => {
    const [q, setQ] = React.useState('');
    const filtered = React.useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return options;
        return options.filter(o => String(o.label).toLowerCase().includes(t));
    }, [options, q]);

    return (
        <div>
            <label className="block text-sm font-medium">{label}{required && <span className="text-red-600"> *</span>}</label>
            {searchable && (
                <input
                    className="mt-1 w-full border rounded-md p-2 text-sm"
                    placeholder="Search…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    disabled={disabled}
                />
            )}
            <select
                className="mt-2 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled}
                required={required}
            >
                <option value="">{placeholder}</option>
                {filtered.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                ))}
            </select>
        </div>
    );
};

export default MiniSelect;
