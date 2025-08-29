import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial: job object for edit, or null for create
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const ReportMailingJobForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loadingTpl, setLoadingTpl] = useState(true);
    const [tpl, setTpl] = useState(null);

    // Basics
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Report & params
    const [reportId, setReportId] = useState('');
    const [reportName, setReportName] = useState('');
    const [reportParams, setReportParams] = useState([{ name: '', value: '' }]);

    // Email
    const [emailRecipients, setEmailRecipients] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [attachmentFormat, setAttachmentFormat] = useState('PDF');

    // Start
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const defaultTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const [startDate, setStartDate] = useState(defaultDate);
    const [startTime, setStartTime] = useState(defaultTime);

    // Schedule
    const [useCron, setUseCron] = useState(false);
    const [cronExpression, setCronExpression] = useState('');
    const [frequency, setFrequency] = useState('DAILY'); // DAILY | WEEKLY | MONTHLY
    const [interval, setInterval] = useState(1);
    const [daysOfWeek, setDaysOfWeek] = useState([]);   // for WEEKLY

    const [errors, setErrors] = useState({});

    // Load template for options
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingTpl(true);
            try {
                const r = await api.get('/reportmailingjobs/template');
                if (!cancelled) setTpl(r?.data || {});
            } catch {
                if (!cancelled) setTpl(null);
            } finally {
                if (!cancelled) setLoadingTpl(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const reportOptions = useMemo(() => {
        // Many tenants expose { reportOptions: [{id, reportName}] }
        const list = tpl?.reportOptions || tpl?.reports || [];
        if (Array.isArray(list) && list.length) {
            return list.map(r => ({
                id: r.id ?? r.reportId ?? r.value ?? r.key,
                name: r.reportName ?? r.name ?? r.text ?? r.label,
            })).filter(x => x.id && x.name);
        }
        return []; // fallback: manual name entry
    }, [tpl]);

    const formatOptions = useMemo(() => {
        const list = tpl?.emailAttachmentFileFormatOptions || tpl?.formats || [];
        const fromTpl = Array.isArray(list) ? list.map(x => x?.name || x?.value || x).filter(Boolean) : [];
        const fallback = ['PDF', 'XLSX', 'CSV'];
        return Array.from(new Set([...fromTpl, ...fallback]));
    }, [tpl]);

    const weekdayOptions = useMemo(() => {
        // Try template; else fallback Mon..Sun
        const fromTpl = tpl?.daysOfWeek || [];
        if (Array.isArray(fromTpl) && fromTpl.length) return fromTpl.map(x => String(x).toUpperCase());
        return ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
    }, [tpl]);

    // Hydrate initial
    useEffect(() => {
        if (!initial) {
            setName('');
            setIsActive(true);
            setReportId('');
            setReportName('');
            setReportParams([{ name: '', value: '' }]);
            setEmailRecipients('');
            setEmailSubject('');
            setEmailMessage('');
            setAttachmentFormat('PDF');
            setStartDate(defaultDate);
            setStartTime(defaultTime);
            setUseCron(false);
            setCronExpression('');
            setFrequency('DAILY');
            setInterval(1);
            setDaysOfWeek([]);
            setErrors({});
            return;
        }
        setName(initial.name || '');
        setIsActive(initial.isActive != null ? !!initial.isActive : true);
        setReportId(initial.reportId || '');
        setReportName(initial.reportName || initial.reportTitle || initial.report || '');
        const rp = Array.isArray(initial.reportParameters) ? initial.reportParameters : [];
        setReportParams(rp.length ? rp.map(p => ({ name: p.name || p.reportParameterName || p.parameterName || '', value: p.value ?? '' })) : [{ name: '', value: '' }]);
        setEmailRecipients(initial.emailRecipients || initial.recipients || '');
        setEmailSubject(initial.emailSubject || initial.subject || '');
        setEmailMessage(initial.emailMessage || initial.message || '');
        setAttachmentFormat(initial.emailAttachmentFileFormat || initial.attachmentFormat || 'PDF');

        // Start date/time: accept 'YYYY-MM-DD HH:mm' or ISO
        const sd = initial.startDateTime || initial.startDatetime || initial.startAt;
        if (sd) {
            const s = String(sd);
            const d = s.slice(0,10);
            const t = s.slice(11,16);
            setStartDate(/\d{4}-\d{2}-\d{2}/.test(d) ? d : defaultDate);
            setStartTime(/\d{2}:\d{2}/.test(t) ? t : defaultTime);
        } else {
            setStartDate(defaultDate);
            setStartTime(defaultTime);
        }

        const cron = initial.cronExpression || initial.cron || '';
        setUseCron(!!cron);
        setCronExpression(cron || '');
        // Simple recurrence (if provided)
        const freq = (initial.frequency || initial.recurrence?.frequency || '').toString().toUpperCase();
        if (freq) setFrequency(freq);
        setInterval(Number(initial.interval || initial.recurrence?.interval || 1) || 1);
        const dows = initial.daysOfWeek || initial.recurrence?.daysOfWeek || [];
        setDaysOfWeek(Array.isArray(dows) ? dows.map(x => String(x).toUpperCase()) : []);
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    const setParam = (i, patch) => {
        setReportParams(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    };
    const addParam = () => setReportParams(prev => [...prev, { name: '', value: '' }]);
    const delParam = (i) => setReportParams(prev => prev.filter((_, idx) => idx !== i));

    const toggleDow = (dow) => {
        setDaysOfWeek(prev => prev.includes(dow) ? prev.filter(x => x !== dow) : [...prev, dow]);
    };

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Job name is required';
        if (!reportId && !reportName.trim()) e.report = 'Select a report or type its name';
        if (!emailRecipients.trim()) e.emailRecipients = 'At least one recipient is required';
        if (!attachmentFormat) e.attachmentFormat = 'Attachment format is required';
        if (!startDate) e.startDate = 'Start date is required';
        if (!startTime) e.startTime = 'Start time is required';
        if (useCron && !cronExpression.trim()) e.cronExpression = 'CRON expression is required';
        if (!useCron) {
            if (!frequency) e.frequency = 'Frequency is required';
            if (!interval || Number(interval) <= 0) e.interval = 'Interval must be greater than 0';
            if (frequency === 'WEEKLY' && !daysOfWeek.length) e.daysOfWeek = 'Pick at least one weekday';
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

        const startDateTime = `${startDate} ${startTime}`; // 'yyyy-MM-dd HH:mm'
        const payload = {
            name: name.trim(),
            isActive: Boolean(isActive),
            emailRecipients: emailRecipients.trim(),   // comma-separated
            ...(emailSubject.trim() ? { emailSubject: emailSubject.trim() } : {}),
            ...(emailMessage.trim() ? { emailMessage: emailMessage.trim() } : {}),
            emailAttachmentFileFormat: attachmentFormat,
            ...(reportId ? { reportId: Number(reportId) } : { reportName: reportName.trim() }),
            reportParameters: reportParams
                .map(p => ({ name: (p.name || '').trim(), value: (p.value ?? '').toString() }))
                .filter(p => p.name),
            startDateTime,
            dateFormat: 'yyyy-MM-dd',
            timeFormat: 'HH:mm',
            locale: 'en',
        };

        // Schedule
        const supportsCron = !!(tpl?.supportsCron || tpl?.cronExample || tpl?.cronExpressionSupported);
        if (useCron || supportsCron) {
            if (cronExpression.trim()) payload.cronExpression = cronExpression.trim();
        } else {
            payload.recurrence = {
                frequency: frequency.toUpperCase(), // DAILY | WEEKLY | MONTHLY
                interval: Number(interval) || 1,
                ...(frequency === 'WEEKLY' ? { daysOfWeek } : {}),
            };
        }

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

    return (
        <form onSubmit={submit} className="space-y-6">
            {loadingTpl ? <Card><Skeleton height="6rem" /></Card> : null}

            {/* Basics */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Job Name *</label>
                        <input
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(x => ({ ...x, name: '' })); }}
                            placeholder="e.g. Daily Portfolio Summary"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                            Active
                        </label>
                    </div>
                </div>
            </Card>

            {/* Report */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Report *</label>
                        {reportOptions.length ? (
                            <select
                                value={reportId}
                                onChange={(e) => { setReportId(e.target.value); setReportName(''); if (errors.report) setErrors(x => ({ ...x, report: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select report…</option>
                                {reportOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        ) : (
                            <input
                                value={reportName}
                                onChange={(e) => { setReportName(e.target.value); if (errors.report) setErrors(x => ({ ...x, report: '' })); }}
                                placeholder="Type report name (no template list available)"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        )}
                        {errors.report && <p className="text-xs text-red-500 mt-1">{errors.report}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Attachment Format *</label>
                        <select
                            value={attachmentFormat}
                            onChange={(e) => { setAttachmentFormat(e.target.value); if (errors.attachmentFormat) setErrors(x => ({ ...x, attachmentFormat: '' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {formatOptions.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        {errors.attachmentFormat && <p className="text-xs text-red-500 mt-1">{errors.attachmentFormat}</p>}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="font-semibold mb-2">Report Parameters (optional)</div>
                    <div className="space-y-2">
                        {reportParams.map((p, i) => (
                            <div key={i} className="grid md:grid-cols-5 gap-2">
                                <input
                                    value={p.name}
                                    onChange={(e) => setParam(i, { name: e.target.value })}
                                    placeholder="parameter name (e.g. startDate)"
                                    className="md:col-span-2 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <input
                                    value={p.value}
                                    onChange={(e) => setParam(i, { value: e.target.value })}
                                    placeholder="value"
                                    className="md:col-span-3 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div className="md:col-span-5 text-right">
                                    <Button variant="danger" onClick={(e) => { e.preventDefault(); delParam(i); }}>Remove</Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); addParam(); }}>Add parameter</Button>
                    </div>
                </div>
            </Card>

            {/* Email */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Recipients *</label>
                        <input
                            value={emailRecipients}
                            onChange={(e) => { setEmailRecipients(e.target.value); if (errors.emailRecipients) setErrors(x => ({ ...x, emailRecipients: '' })); }}
                            placeholder="Comma-separated emails, e.g. a@x.com, b@y.org"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.emailRecipients && <p className="text-xs text-red-500 mt-1">{errors.emailRecipients}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Subject</label>
                        <input
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Optional subject"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Message</label>
                        <input
                            value={emailMessage}
                            onChange={(e) => setEmailMessage(e.target.value)}
                            placeholder="Optional message"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Start & Schedule */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4">
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
                        <label className="block text-sm font-medium">Start Time *</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => { setStartTime(e.target.value); if (errors.startTime) setErrors(x => ({ ...x, startTime: '' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={useCron} onChange={(e) => setUseCron(e.target.checked)} />
                            Use CRON (advanced)
                        </label>
                    </div>
                </div>

                {!useCron ? (
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium">Frequency *</label>
                            <select
                                value={frequency}
                                onChange={(e) => { setFrequency(e.target.value); if (errors.frequency) setErrors(x => ({ ...x, frequency: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                            {errors.frequency && <p className="text-xs text-red-500 mt-1">{errors.frequency}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Interval *</label>
                            <input
                                type="number"
                                min="1"
                                value={interval}
                                onChange={(e) => { setInterval(e.target.value); if (errors.interval) setErrors(x => ({ ...x, interval: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.interval && <p className="text-xs text-red-500 mt-1">{errors.interval}</p>}
                        </div>
                        {frequency === 'WEEKLY' ? (
                            <div>
                                <div className="block text-sm font-medium mb-1">Days of Week *</div>
                                <div className="flex flex-wrap gap-2">
                                    {weekdayOptions.map(d => (
                                        <label key={d} className="inline-flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">
                                            <input type="checkbox" checked={daysOfWeek.includes(d)} onChange={() => toggleDow(d)} />
                                            <span className="font-mono">{d.slice(0,3)}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.daysOfWeek && <p className="text-xs text-red-500 mt-1">{errors.daysOfWeek}</p>}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="mt-4">
                        <label className="block text-sm font-medium">CRON Expression *</label>
                        <input
                            value={cronExpression}
                            onChange={(e) => { setCronExpression(e.target.value); if (errors.cronExpression) setErrors(x => ({ ...x, cronExpression: '' })); }}
                            placeholder="e.g. 0 0 6 * * ?"
                            className="mt-1 w-full border rounded-md p-2 font-mono dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.cronExpression && <p className="text-xs text-red-500 mt-1">{errors.cronExpression}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                            Quartz CRON format. Start time is used as the first fire time (if applicable).
                        </p>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Job')}
                </Button>
            </div>
        </form>
    );
};

export default ReportMailingJobForm;
