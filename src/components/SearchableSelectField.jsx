import React from 'react';
import { ChevronsUpDown, Search } from 'lucide-react';

const SearchableSelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  helperText = '',
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const normalizedOptions = React.useMemo(
    () => (Array.isArray(options) ? options.filter(Boolean) : []),
    [options],
  );

  const selected = React.useMemo(
    () => normalizedOptions.find((option) => String(option.id) === String(value ?? '')),
    [normalizedOptions, value],
  );

  const filtered = React.useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((option) => String(option.label || '').toLowerCase().includes(q));
  }, [normalizedOptions, query]);

  React.useEffect(() => {
    const onDocClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (option) => {
    onChange?.(option ? option.id : '');
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={rootRef}>
      <label className="block text-sm font-medium">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <div
        className={`mt-1 flex items-center gap-2 rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700 ${disabled ? 'opacity-60' : ''}`}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={open ? query : selected?.label || ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm outline-none"
          required={required && !selected}
        />
        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
      </div>
      {helperText ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</div> : null}
      {open && !disabled ? (
        <div className="relative">
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  onClick={() => pick(option)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${String(option.id) === String(value ?? '') ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchableSelectField;
