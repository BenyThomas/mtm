import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - tellerId (required)
 *  - initial (optional): { id, staffId, fromDate, toDate, isFullDay, startTime, endTime, description }
 *  - onSubmit: async(payload)
 *  - submitting: boolean
 *
 * Conservative payload (commonly accepted):
 *  { staffId, isFullDay, fromDate?, toDate?, startTime?, endTime?, description?, dateFormat:'yyyy-MM-dd', locale:'en' }
 */
const CashierForm = ({ tellerId, initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [staffOptions, setStaffOptions] = useState([]);

    const [staffId, setStaffId] = useState(initial?.staffId || '');
    const [isFullDay, setIsFullDay] = useState(Boolean(initial?.isFullDay ?? true));
    const [fromDate, setFromDate] = useState(initial?.fromDate ? String(initial.fromDate).slice(0,10) : '');
    const [toDate, setToDate] = useState(initial?.toDate ? String(initial.toDate).slice(0,10) : '');
    const [startTime, setStartTime] = useState(initial?.startTime || '');
    const [endTime, setEndTime] = useState(initial?.endTime || '');
    const [description, setDescription] = useState(initial?.description || '');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/tellers/${tellerId}/cashiers/template`);
                const d = r?.data || {};
                const raw =
                    d?.staffOptions || d?.loanOfficerOptions || d?.staff || [];
                const list = Array.isArray(raw) ? raw : [];
                const opts = list
                    .map((s) => ({
                        id: s.id ?? s.value ?? s.key,
                        name: s.displayName || s.name || `${s.firstname || s.firstName || ''} ${s.lastname || s.lastName || ''}`.trim() || String(s.id),
                    }))
                    .filter((x) => x.id);
                if (!cancelled) setStaffOptions(opts);
            } catch (_e) {
                if (!cancelled) setStaffOptions([]);
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [tellerId]);

    const validate = () => {
        const e = {};
        if (!staffId) e.staffId = 'Staff is required';
        if (!isFullDay) {
            if (!startTime) e.startTime = 'Start time required';
            if (!endTime) e.endTime = 'End time required';
        }
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
            staffId: Number(staffId),
            isFullDay: Boolean(isFullDay),
            ...(fromDate ? { fromDate, dateFormat: 'yyyy-MM-dd', locale: 'en' } : { locale: 'en' }),
            ...(toDate ? { toDate, dateFormat: 'yyyy-MM-dd', locale: 'en' } : {}),
            ...(startTime && !isFullDay ? { startTime } : {}),
            ...(endTime && !isFullDay ? { endTime } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="4rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Staff *</label>
                            <select
                                value={staffId}
                                onChange={(e) => { setStaffId(e.target.value); if (errors.staffId) setErrors(x => ({ ...x, staffId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select staff…</option>
                                {staffOptions.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {errors.staffId && <p className="text-xs text-red-500 mt-1">{errors.staffId}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="isFullDay"
                                type="checkbox"
                                checked={isFullDay}
                                onChange={(e) => setIsFullDay(e.target.checked)}
                            />
                            <label htmlFor="isFullDay" className="text-sm">Full day</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">From date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">To date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        {!isFullDay && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium">Start time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => { setStartTime(e.target.value); if (errors.startTime) setErrors(x => ({ ...x, startTime: '' })); }}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">End time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => { setEndTime(e.target.value); if (errors.endTime) setErrors(x => ({ ...x, endTime: '' })); }}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
                                </div>
                            </>
                        )}

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
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Cashier'}
                </Button>
            </div>
        </form>
    );
};

export default CashierForm;
