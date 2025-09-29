import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';

const KNOWN = {
    'maker-checker': { kind: 'flag', hint: 'Enable maker-checker (4-eyes) flow.' },
    'reschedule-future-repayments': { kind: 'flag' },
    'allow-transactions-on-non-workingday': { kind: 'flag' },
    'reschedule-repayments-on-holidays': { kind: 'flag' },
    'allow-transactions-on-holiday': { kind: 'flag' },
    'savings-interest-posting-current-period-end': { kind: 'flag' },
    'financial-year-beginning-month': { kind: 'int', min: 1, max: 12, hint: '1 = Jan … 12 = Dec' },
    'meetings-mandatory-for-jlg-loans': { kind: 'flag' },
};

const asBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
    return false;
};

/**
 * Props:
 * - initial: { id, name, enabled, value, stringValue, description? }
 * - onSubmit: async (payload) => void  // payload may include { enabled, value, stringValue }
 * - submitting: boolean
 */
const GlobalConfigForm = ({ initial, onSubmit, submitting }) => {
    const [enabled, setEnabled] = useState(false);
    const [value, setValue] = useState('');
    const [stringValue, setStringValue] = useState('');
    const [errors, setErrors] = useState({});

    const meta = useMemo(() => KNOWN[initial?.name] || null, [initial]);

    useEffect(() => {
        if (!initial) return;
        setEnabled(asBool(initial.enabled));
        setValue(
            initial.value != null && initial.value !== ''
                ? String(initial.value)
                : ''
        );
        setStringValue(initial.stringValue || '');
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (meta?.kind === 'int') {
            if (value === '' || Number.isNaN(Number(value))) e.value = 'Enter a number';
            const n = Number(value);
            if (meta.min != null && n < meta.min) e.value = `Must be ≥ ${meta.min}`;
            if (meta.max != null && n > meta.max) e.value = `Must be ≤ ${meta.max}`;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;

        const payload = { enabled: Boolean(enabled) };
        if (meta?.kind === 'int') {
            payload.value = Number(value);
        } else if (meta?.kind === 'flag') {
            // only enabled is relevant; some tenants also store 0/1 in value – keep it untouched unless set
            if (value !== '') payload.value = Number(value);
        } else {
            // unknown config – allow both fields (backend will pick relevant)
            if (value !== '') payload.value = Number(value);
            if (stringValue.trim()) payload.stringValue = stringValue.trim();
        }
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {/* Name (read-only) */}
            <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                    value={initial?.name || ''}
                    disabled
                    className="mt-1 w-full border rounded-md p-2 opacity-70 dark:bg-gray-700 dark:border-gray-600"
                />
            </div>

            {/* Enabled */}
            <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enabled
            </label>
            {initial?.description ? (
                <p className="text-xs text-gray-500">{initial.description}</p>
            ) : meta?.hint ? (
                <p className="text-xs text-gray-500">{meta.hint}</p>
            ) : null}

            {/* Value fields */}
            {meta?.kind === 'int' ? (
                <div>
                    <label className="block text-sm font-medium">Numeric Value *</label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (errors.value) setErrors((x) => ({ ...x, value: '' }));
                        }}
                        min={meta.min != null ? meta.min : undefined}
                        max={meta.max != null ? meta.max : undefined}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter number"
                    />
                    {errors.value ? <p className="text-xs text-red-500 mt-1">{errors.value}</p> : null}
                </div>
            ) : meta?.kind === 'flag' ? (
                <div>
                    <label className="block text-sm font-medium">Optional Numeric Value</label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Typically unused; backend may ignore"
                    />
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium">Numeric Value (optional)</label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="If this config expects a number"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">String Value (optional)</label>
                        <input
                            value={stringValue}
                            onChange={(e) => setStringValue(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="If this config expects text"
                        />
                    </div>
                </>
            )}

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save Configuration'}
                </Button>
            </div>
        </form>
    );
};

export default GlobalConfigForm;
