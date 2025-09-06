// src/components/TellerForm.jsx
import React, { useMemo, useState, useEffect } from 'react';
import useOffices from '../hooks/useOffices';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/** Normalize any incoming date to 'YYYY-MM-DD' for the date input */
const toISOInput = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;        // already ISO
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {                  // dd-MM-yyyy -> ISO
        const [d, m, y] = val.split('-');
        return `${y}-${m}-${d}`;
    }
    const dt = new Date(val);
    if (!isNaN(dt)) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return '';
};

/**
 * Props:
 *  - initial (optional): { id, name, description, officeId, startDate, status }
 *  - onSubmit: async(payload)
 *  - submitting: boolean
 *
 * CREATE/UPDATE payload (as required by your instance):
 * {
 *   "dateFormat": "yyyy-MM-dd",
 *   "locale": "en",
 *   "name": "Teller3",
 *   "officeId": 1,
 *   "startDate": "2025-09-01",
 *   "status": "ACTIVE",
 *   "description": "cash handling" // optional
 * }
 */
const TellerForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();
    const { offices, loading } = useOffices();

    const officeOptions = useMemo(
        () => (offices || []).map((o) => ({ id: o.id, name: o.name })),
        [offices]
    );

    const [name, setName] = useState(initial?.name || '');
    const [officeId, setOfficeId] = useState(initial?.officeId || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [startDate, setStartDate] = useState(toISOInput(initial?.startDate));
    const [status, setStatus] = useState(initial?.status || 'ACTIVE');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) return;
        setName(initial?.name || '');
        setOfficeId(initial?.officeId || '');
        setDescription(initial?.description || '');
        setStartDate(toISOInput(initial?.startDate));
        setStatus(initial?.status || 'ACTIVE');
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!officeId) e.officeId = 'Office is required';
        if (!startDate) e.startDate = 'Start date is required';
        if (!status) e.status = 'Status is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }

        // IMPORTANT: Keep ISO and send dateFormat 'yyyy-MM-dd'
        const payload = {
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            name: name.trim(),
            officeId: Number(officeId),
            startDate,              // e.g. '2025-09-01'
            status,                 // 'ACTIVE' | 'INACTIVE'
            ...(description.trim() ? { description: description.trim() } : {}),
        };

        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {loading ? (
                    <Skeleton height="4rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(x => ({ ...x, name: '' })); }}
                                placeholder="e.g. Head Office Teller 1"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Office *</label>
                            <select
                                value={officeId}
                                onChange={(e) => { setOfficeId(e.target.value); if (errors.officeId) setErrors(x => ({ ...x, officeId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select office…</option>
                                {officeOptions.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                            {errors.officeId && <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Start Date *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); if (errors.startDate) setErrors(x => ({ ...x, startDate: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Status *</label>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); if (errors.status) setErrors(x => ({ ...x, status: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                            {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Teller'}
                </Button>
            </div>
        </form>
    );
};

export default TellerForm;
