import React from 'react';
import { ChevronsUpDown, Search } from 'lucide-react';

const MiniCombobox = ({
                          label,
                          value,            // number | null
                          onChange,          // (id:number|null)=>void
                          options,           // [{ id:number, label:string }]
                          placeholder = 'Select…',
                          disabled = false,
                          required = false,
                      }) => {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const inputRef = React.useRef(null);
    const boxRef = React.useRef(null);

    const selected = React.useMemo(() => options.find(o => o.id === value), [options, value]);
    const filtered = React.useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return options;
        return options.filter(o => o.label.toLowerCase().includes(t));
    }, [options, q]);

    React.useEffect(() => {
        const onDocClick = (e) => {
            if (!boxRef.current) return;
            if (!boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const pick = (opt) => {
        onChange(opt?.id ?? null);
        setQ('');
        setOpen(false);
        inputRef.current?.blur();
    };

    return (
        <div ref={boxRef}>
            <label className="block text-sm font-medium">
                {label}{required && <span className="text-red-600"> *</span>}
            </label>
            <div
                className={`mt-1 flex items-center gap-2 rounded-md border p-2 dark:bg-gray-700 dark:border-gray-600 ${disabled ? 'opacity-60' : ''}`}
                onClick={() => !disabled && setOpen(true)}
            >
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    ref={inputRef}
                    value={open ? q : (selected?.label ?? '')}
                    onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                    onFocus={() => !disabled && setOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="flex-1 bg-transparent outline-none text-sm"
                    required={required && !selected}
                />
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
            </div>

            {open && !disabled && (
                <div className="relative">
                    <div className="absolute z-40 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow-lg">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                        ) : filtered.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => pick(opt)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${opt.id === value ? 'bg-gray-100' : ''}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiniCombobox;
