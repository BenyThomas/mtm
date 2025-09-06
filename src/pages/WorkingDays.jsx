import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const DEFAULT_MAP = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 7, label: 'Sun' },
];

const WorkingDays = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [days, setDays] = useState([]); // array of numeric ids
    const [rescheduleToNextWorkingDay, setRescheduleToNextWorkingDay] = useState(null); // optional
    const [extendTermForDailyRepayments, setExtendTermForDailyRepayments] = useState(null); // optional
    const [repaymentRescheduleType, setRepaymentRescheduleType] = useState(''); // optional

    const [serverDayMap, setServerDayMap] = useState([]); // if API provides names/ids

    const dayOptions = useMemo(() => serverDayMap.length ? serverDayMap : DEFAULT_MAP, [serverDayMap]);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/workingdays');
            const d = r?.data || {};

            // Common shapes in Fineract:
            // { workingDays: [1,2,3,4,5], rescheduleToNextWorkingDay: true, extendTermForDailyRepayments: false,
            //   repaymentRescheduleType: { id: 1, value: 'next_working_day' }, dayOfWeekTypeOptions: [{id:1, value:'MON'},...] }
            const ws = d.workingDays || d.days || d.workingdays || [];
            setDays(Array.isArray(ws) ? ws.map(Number) : []);

            if (typeof d.rescheduleToNextWorkingDay === 'boolean') {
                setRescheduleToNextWorkingDay(d.rescheduleToNextWorkingDay);
            }
            if (typeof d.extendTermForDailyRepayments === 'boolean') {
                setExtendTermForDailyRepayments(d.extendTermForDailyRepayments);
            }
            if (d.repaymentRescheduleType && (d.repaymentRescheduleType.id || d.repaymentRescheduleType.value)) {
                setRepaymentRescheduleType(String(d.repaymentRescheduleType.id || d.repaymentRescheduleType.value));
            }

            const options = d.dayOfWeekTypeOptions || d.daysOfWeekOptions || [];
            if (Array.isArray(options) && options.length) {
                setServerDayMap(options.map((o) => ({
                    id: o.id ?? o.value ?? o.key,
                    label: o.value ?? o.name ?? o.text ?? `#${o.id}`,
                })).filter(x => x.id));
            } else {
                setServerDayMap([]);
            }
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load working days', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleDay = (id) => {
        setDays((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const save = async () => {
        setSaving(true);
        try {
            // Most instances accept PUT /workingdays with:
            // { workingDays: [1..7], locale: 'en' } plus optional flags if supported.
            const payload = {
                workingDays: days.map(Number).sort((a, b) => a - b),
                locale: 'en',
            };
            if (rescheduleToNextWorkingDay !== null) payload.rescheduleToNextWorkingDay = rescheduleToNextWorkingDay;
            if (extendTermForDailyRepayments !== null) payload.extendTermForDailyRepayments = extendTermForDailyRepayments;
            if (repaymentRescheduleType) payload.repaymentRescheduleType = isNaN(Number(repaymentRescheduleType))
                ? { value: repaymentRescheduleType }
                : Number(repaymentRescheduleType);

            await api.put('/workingdays', payload);
            addToast('Working days updated', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Working Days</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={save} disabled={saving || loading}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="8rem" />
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {dayOptions.map((d) => (
                                <label key={d.id} className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={days.includes(Number(d.id))}
                                        onChange={() => toggleDay(Number(d.id))}
                                    />
                                    <span>{d.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Optional flags (render only if present in GET) */}
                        {rescheduleToNextWorkingDay !== null || extendTermForDailyRepayments !== null || repaymentRescheduleType ? (
                            <div className="grid md:grid-cols-3 gap-4">
                                {rescheduleToNextWorkingDay !== null && (
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={rescheduleToNextWorkingDay}
                                            onChange={(e) => setRescheduleToNextWorkingDay(e.target.checked)}
                                        />
                                        <span className="text-sm">Reschedule to next working day</span>
                                    </label>
                                )}
                                {extendTermForDailyRepayments !== null && (
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={extendTermForDailyRepayments}
                                            onChange={(e) => setExtendTermForDailyRepayments(e.target.checked)}
                                        />
                                        <span className="text-sm">Extend term for daily repayments</span>
                                    </label>
                                )}
                                {repaymentRescheduleType ? (
                                    <div>
                                        <label className="block text-sm font-medium">Reschedule Type</label>
                                        <input
                                            value={repaymentRescheduleType}
                                            onChange={(e) => setRepaymentRescheduleType(e.target.value)}
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="(keep as-is unless you know allowed values)"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default WorkingDays;
