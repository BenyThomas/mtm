import React from 'react';
import { Search, Check, X } from 'lucide-react';

/**
 * Props:
 *  - label: string
 *  - options: [{ id:number, name:string, isSelfService?:boolean }]
 *  - value: number[]                 // selected role IDs
 *  - onChange: (ids:number[]) => void
 *  - disabled?: boolean
 *  - required?: boolean
 *  - placeholder?: string            // placeholder for the filter input
 */
const MultiSelect = ({
                             label,
                             options,
                             value,
                             onChange,
                             disabled = false,
                             required = false,
                             placeholder = 'Type to search roles…',
                         }) => {
    const [q, setQ] = React.useState('');
    const [focused, setFocused] = React.useState(false);
    const wrapperRef = React.useRef(null);

    const selectedSet = React.useMemo(() => new Set(value), [value]);
    const byId = React.useMemo(() => {
        const m = new Map();
        options.forEach(o => m.set(o.id, o));
        return m;
    }, [options]);

    const filtered = React.useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return [];
        return options.filter(o => (o.name || '').toLowerCase().includes(t));
    }, [options, q]);

    // show list only when user is typing and the field is focused
    const open = focused && q.trim().length > 0;

    const add = (id) => {
        if (disabled) return;
        if (!selectedSet.has(id)) onChange([...value, id]);
    };
    const remove = (id) => {
        if (disabled) return;
        if (selectedSet.has(id)) onChange(value.filter(v => v !== id));
    };
    const toggle = (id) => (selectedSet.has(id) ? remove(id) : add(id));
    const clearAll = () => onChange([]);

    // close dropdown when clicking outside
    React.useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(e.target)) setFocused(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const joined = value.join(',');

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium">
                {label}{required && <span className="text-red-600"> *</span>}
            </label>

            {/* Selected chips */}
            <div className={`mt-1 flex flex-wrap gap-2 rounded-md border p-2 ${disabled ? 'opacity-60' : ''}`}>
                {value.length === 0 ? (
                    <span className="text-sm text-gray-500">No roles selected</span>
                ) : (
                    value.map(id => {
                        const r = byId.get(id);
                        if (!r) return null;
                        return (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800"
                            >
                {r.name}
                                {r.isSelfService && (
                                    <span className="ml-1 px-1 rounded bg-blue-100 text-blue-700">Self-service</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => remove(id)}
                                    className="ml-1 p-0.5 hover:bg-gray-200 rounded"
                                    disabled={disabled}
                                    aria-label={`Remove ${r?.name ?? 'role'}`}
                                >
                  <X className="w-3 h-3" />
                </button>
              </span>
                        );
                    })
                )}
            </div>

            {/* Filter field (drives visibility) */}
            <div
                className="mt-2 flex items-center gap-2 rounded-md border p-2"
                onFocus={() => !disabled && setFocused(true)}
            >
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    className="flex-1 bg-transparent outline-none text-sm"
                    placeholder={placeholder}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => !disabled && setFocused(true)}
                    disabled={disabled}
                />
                {q && (
                    <button
                        type="button"
                        onClick={() => setQ('')}
                        className="p-1 rounded hover:bg-gray-100"
                        aria-label="Clear"
                        disabled={disabled}
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Options list: only visible while typing */}
            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow-lg">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                    ) : (
                        filtered.map(r => {
                            const active = selectedSet.has(r.id);
                            return (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => toggle(r.id)}
                                    disabled={disabled}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                                        active ? 'bg-gray-100' : ''
                                    }`}
                                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                      {r.isSelfService && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Self-service
                      </span>
                      )}
                  </span>
                                    {active && <Check className="w-4 h-4 text-gray-600" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Actions / validation helper */}
            <div className="mt-2 flex items-center gap-2">
                <button
                    type="button"
                    onClick={clearAll}
                    disabled={disabled || value.length === 0}
                    className="px-2 py-1 text-xs rounded-md border hover:bg-gray-50 disabled:opacity-50"
                >
                    Clear
                </button>
                <span className="text-xs text-gray-500">{value.length} selected</span>
            </div>

            {required && (
                <input type="text" className="hidden" value={joined} onChange={() => {}} required />
            )}
        </div>
    );
};

export default MultiSelect;
