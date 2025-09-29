import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};

/**
 * Props
 * - initial: { type, date } (optional; if present we treat as edit)
 * - typeOptions: string[] list of known types (for select when creating)
 * - onSubmit: async (payload) => void  // payload => { type, date, dateFormat, locale }
 * - submitting: boolean
 */
const BusinessDateForm = ({ initial, typeOptions, onSubmit, submitting }) => {
    const isEdit = Boolean(initial?.type);
    const [typeMode, setTypeMode] = useState(isEdit ? 'locked' : 'select'); // 'locked' | 'select' | 'custom'
    const [type, setType] = useState(initial?.type || '');
    const [date, setDate] = useState(toISO(initial?.date) || todayISO());
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) {
            setType('');
            setDate(todayISO());
            setTypeMode('select');
            setErrors({});
            return;
        }
        setType(initial.type || '');
        setDate(toISO(initial.date) || todayISO());
        setTypeMode('locked');
        setErrors({});
    }, [initial]);

    const typeOpts = useMemo(() => {
        const uniq = Array.from(new Set((typeOptions || []).filter(Boolean)));
        return uniq.sort((a, b) => a.localeCompare(b));
    }, [typeOptions]);

    const validate = () => {
        const e = {};
        if (!type || !type.trim()) e.type = 'Type is required';
        if (!date) e.date = 'Date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({
            type: type.trim(),
            date,                 // Some deployments accept "date"; if yours expects "businessDate", swap key here
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Business Date Type *</label>

                        {typeMode === 'locked' ? (
                            <input
                                value={type}
                                disabled
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 opacity-70"
                            />
                        ) : typeMode === 'select' ? (
                            <div className="flex gap-2">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select type…</option>
                                    {typeOpts.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                    <option value="__custom__">— Custom —</option>
                                </select>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setTypeMode('custom')}
                                >
                                    Custom
                                </Button>
                            </div>
                        ) : (
                            // custom text input
                            <input
                                value={type}
                                onChange={(e) => setType(e.target.value.toUpperCase())}
                                placeholder="e.g. BUSINESS_DATE or COB_DATE"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        )}

                        {errors.type ? <p className="text-xs text-red-500 mt-1">{errors.type}</p> : null}
                        {!isEdit && (
                            <p className="text-xs text-gray-500 mt-1">
                                Use an existing type or define a custom uppercase code.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.date ? <p className="text-xs text-red-500 mt-1">{errors.date}</p> : null}
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create / Update')}
                </Button>
            </div>
        </form>
    );
};

export default BusinessDateForm;
