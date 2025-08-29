import React, { useEffect, useState } from 'react';
import OfficeSelect from './OfficeSelect';
import Button from './Button';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    return String(d).slice(0, 10);
};

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Props:
 * - initial: { id, officeId, closingDate, comments }
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const GlClosureForm = ({ initial, onSubmit, submitting }) => {
    // accept string or number; keep as string in state for <select>
    const [officeId, setOfficeId] = useState('');
    const [closingDate, setClosingDate] = useState(todayISO());
    const [comments, setComments] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) return;
        setOfficeId(
            initial.officeId === 0 || initial.officeId === '0'
                ? '0'
                : initial.officeId != null
                    ? String(initial.officeId)
                    : ''
        );
        setClosingDate(toISO(initial.closingDate) || todayISO());
        setComments(initial.comments || '');
        setErrors({});
    }, [initial]);

    const clearFieldError = (name) => {
        setErrors((e) => (e[name] ? { ...e, [name]: '' } : e));
    };

    const validate = () => {
        const e = {};
        // Treat empty string/null/undefined as invalid; any non-empty string or number is valid
        if (officeId === '' || officeId === null || officeId === undefined) e.officeId = 'Office is required';
        if (!closingDate) e.closingDate = 'Closing date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({
            officeId: Number(officeId), // API expects number
            closingDate,
            comments: comments || undefined,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Office *</label>
                <OfficeSelect
                    value={officeId}
                    onChange={(val) => {
                        // normalize to string for select value
                        const v = val === undefined || val === null ? '' : String(val);
                        setOfficeId(v);
                        clearFieldError('officeId'); // ✅ clear error immediately when user selects
                    }}
                />
                {errors.officeId ? <p className="text-xs text-red-500 mt-1">{errors.officeId}</p> : null}
            </div>

            <div>
                <label className="block text-sm font-medium">Closing Date *</label>
                <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => {
                        setClosingDate(e.target.value);
                        clearFieldError('closingDate'); // ✅ clear error on change
                    }}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.closingDate ? <p className="text-xs text-red-500 mt-1">{errors.closingDate}</p> : null}
            </div>

            <div>
                <label className="block text-sm font-medium">Comments</label>
                <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Optional notes about this closure…"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Closure'}
                </Button>
            </div>
        </form>
    );
};

export default GlClosureForm;
