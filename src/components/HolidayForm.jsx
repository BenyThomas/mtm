import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial: holiday object for edit, or null for create
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const HolidayForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loadingTpl, setLoadingTpl] = useState(true);
    const [tpl, setTpl] = useState(null);

    const [officesLoading, setOfficesLoading] = useState(true);
    const [offices, setOffices] = useState([]);

    // Fields
    const [name, setName] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [repaymentsRescheduledTo, setRepaymentsRescheduledTo] = useState('');
    const [description, setDescription] = useState('');
    const [officeIds, setOfficeIds] = useState([]); // multi

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingTpl(true);
            try {
                const r = await api.get('/holidays/template');
                if (!cancelled) setTpl(r?.data || {});
            } catch {
                if (!cancelled) setTpl(null);
            } finally {
                if (!cancelled) setLoadingTpl(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setOfficesLoading(true);
            try {
                const r = await api.get('/offices');
                const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || r.data?.officeOptions || []);
                const norm = list.map(o => ({ id: o.id, name: o.name }));
                norm.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
                if (!cancelled) setOffices(norm);
            } catch {
                if (!cancelled) setOffices([]);
            } finally {
                if (!cancelled) setOfficesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // hydrate initial
    useEffect(() => {
        if (!initial) {
            setName('');
            setFromDate('');
            setToDate('');
            setRepaymentsRescheduledTo('');
            setDescription('');
            setOfficeIds([]);
            setErrors({});
            return;
        }
        setName(initial.name || '');
        // Accept dates in multiple shapes; use first 10 chars if ISO
        const iso = (v) => (v ? String(v).slice(0,10) : '');
        setFromDate(iso(initial.fromDate));
        setToDate(iso(initial.toDate));
        setRepaymentsRescheduledTo(iso(initial.repaymentsRescheduledTo));
        setDescription(initial.description || '');
        const ids =
            initial.offices?.map(o => o.id) ||
            initial.officeIds ||
            [];
        setOfficeIds(Array.isArray(ids) ? ids.map(Number) : []);
        setErrors({});
    }, [initial]);

    const toggleOffice = (id) => {
        setOfficeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!fromDate) e.fromDate = 'From date is required';
        if (!toDate) e.toDate = 'To date is required';
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) e.toDate = 'To date must be after From date';
        if (!officeIds.length) e.offices = 'Select at least one office';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            name: name.trim(),
            fromDate,
            toDate,
            ...(repaymentsRescheduledTo ? { repaymentsRescheduledTo } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            offices: officeIds,                    // most builds accept "offices": [ids]
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        };
        try {
            await onSubmit(payload);
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        }
    };

    const help = useMemo(() => {
        const reschedText = tpl?.rescheduleTypeOptions?.length
            ? 'Tenant supports reschedule types; this form uses explicit date. You can switch to reschedule types later if needed.'
            : 'If repayments fall within the holiday range and global config permits, they will be moved to this date.';
        return reschedText;
    }, [tpl]);

    return (
        <form onSubmit={submit} className="space-y-6">
            {loadingTpl ? <Card><Skeleton height="4rem" /></Card> : null}

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Name *</label>
                        <input
                            value={name}
                            onChange={(e)=>{ setName(e.target.value); if (errors.name) setErrors(x=>({ ...x, name:'' })); }}
                            placeholder="e.g. Eid al-Fitr"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Repayments Rescheduled To</label>
                        <input
                            type="date"
                            value={repaymentsRescheduledTo}
                            onChange={(e)=>setRepaymentsRescheduledTo(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">{help}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">From Date *</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e)=>{ setFromDate(e.target.value); if (errors.fromDate) setErrors(x=>({ ...x, fromDate:'' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.fromDate && <p className="text-xs text-red-500 mt-1">{errors.fromDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">To Date *</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e)=>{ setToDate(e.target.value); if (errors.toDate) setErrors(x=>({ ...x, toDate:'' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.toDate && <p className="text-xs text-red-500 mt-1">{errors.toDate}</p>}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium">Description</label>
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(e)=>setDescription(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Optional notes…"
                    />
                </div>
            </Card>

            <Card>
                <div className="font-semibold mb-2">Offices *</div>
                {officesLoading ? (
                    <Skeleton height="5rem" />
                ) : !offices.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No offices found.</div>
                ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
                        {offices.map(o => (
                            <label key={o.id} className="inline-flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">
                                <input
                                    type="checkbox"
                                    checked={officeIds.includes(o.id)}
                                    onChange={() => toggleOffice(o.id)}
                                />
                                <span>{o.name}</span>
                            </label>
                        ))}
                    </div>
                )}
                {errors.offices && <p className="text-xs text-red-500 mt-2">{errors.offices}</p>}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Holiday')}
                </Button>
            </div>
        </form>
    );
};

export default HolidayForm;
