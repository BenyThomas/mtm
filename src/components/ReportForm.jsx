import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial: report object for edit or null for create
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const ReportForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loadingTpl, setLoadingTpl] = useState(true);
    const [tpl, setTpl] = useState(null);

    const [reportName, setReportName] = useState('');
    const [reportType, setReportType] = useState('');
    const [reportSubType, setReportSubType] = useState('');
    const [reportCategory, setReportCategory] = useState('');
    const [useReport, setUseReport] = useState(true);
    const [coreReport] = useState(false); // non-core; keep false (usually server-controlled)
    const [description, setDescription] = useState('');
    const [reportSql, setReportSql] = useState('');

    const [params, setParams] = useState([{ name: '' }]); // optional parameters
    const [errors, setErrors] = useState({});

    // Load template (options for types/categories/subtypes)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingTpl(true);
            try {
                const r = await api.get('/reports/template');
                if (!cancelled) setTpl(r?.data || {});
            } catch {
                if (!cancelled) setTpl(null);
            } finally {
                if (!cancelled) setLoadingTpl(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Hydrate initial
    useEffect(() => {
        if (!initial) {
            setReportName('');
            setReportType('');
            setReportSubType('');
            setReportCategory('');
            setUseReport(true);
            setDescription('');
            setReportSql('');
            setParams([{ name: '' }]);
            setErrors({});
            return;
        }
        setReportName(initial.reportName || initial.name || '');
        setReportType(initial.reportType || initial.type || '');
        setReportSubType(initial.reportSubType || initial.subType || '');
        setReportCategory(initial.reportCategory || initial.category || '');
        setUseReport(
            initial.useReport != null ? Boolean(initial.useReport) :
                (initial.use_report != null ? Boolean(initial.use_report) : true)
        );
        setDescription(initial.description || '');
        setReportSql(initial.reportSql || initial.sql || '');
        const p = initial.reportParameters || initial.parameters || [];
        setParams(
            Array.isArray(p) && p.length
                ? p.map(x => ({ name: x.name || x.reportParameterName || x.parameterName || '' }))
                : [{ name: '' }]
        );
        setErrors({});
    }, [initial]);

    const typeOptions = useMemo(() => {
        const raw = tpl?.reportTypeOptions || tpl?.typeOptions || tpl?.types || [];
        return Array.isArray(raw) ? raw.map(x => x?.name || x?.value || x).filter(Boolean) : [];
    }, [tpl]);

    const subTypeOptions = useMemo(() => {
        const raw = tpl?.reportSubTypeOptions || tpl?.subTypeOptions || tpl?.subtypes || [];
        return Array.isArray(raw) ? raw.map(x => x?.name || x?.value || x).filter(Boolean) : [];
    }, [tpl]);

    const categoryOptions = useMemo(() => {
        const raw = tpl?.reportCategoryOptions || tpl?.categories || [];
        return Array.isArray(raw) ? raw.map(x => x?.name || x?.value || x).filter(Boolean) : [];
    }, [tpl]);

    const validate = () => {
        const e = {};
        if (!reportName.trim()) e.reportName = 'Report name is required';
        if (!reportType) e.reportType = 'Report type is required';
        if (!reportSql.trim()) e.reportSql = 'SQL is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload = {
            reportName: reportName.trim(),
            reportType,
            ...(reportSubType ? { reportSubType } : {}),
            ...(reportCategory ? { reportCategory } : {}),
            useReport: Boolean(useReport),
            coreReport: Boolean(coreReport),
            ...(description.trim() ? { description: description.trim() } : {}),
            reportSql: reportSql.trim(),
        };
        const cleanedParams = params
            .map(p => (p.name || '').trim())
            .filter(Boolean)
            .map(n => ({ reportParameterName: n }));
        if (cleanedParams.length) payload.reportParameters = cleanedParams;

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

    const setParam = (i, val) => {
        setParams(prev => prev.map((p, idx) => idx === i ? { name: val } : p));
    };
    const addParam = () => setParams(prev => [...prev, { name: '' }]);
    const delParam = (i) => setParams(prev => prev.filter((_, idx) => idx !== i));

    return (
        <form onSubmit={submit} className="space-y-4">
            {loadingTpl ? (
                <Card><Skeleton height="8rem" /></Card>
            ) : null}

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Report Name *</label>
                    <input
                        value={reportName}
                        onChange={(e) => {
                            setReportName(e.target.value);
                            if (errors.reportName) setErrors(x => ({ ...x, reportName: '' }));
                        }}
                        placeholder="e.g. Loans Disbursed by Branch"
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.reportName && <p className="text-xs text-red-500 mt-1">{errors.reportName}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Type *</label>
                    <select
                        value={reportType}
                        onChange={(e) => {
                            setReportType(e.target.value);
                            if (errors.reportType) setErrors(x => ({ ...x, reportType: '' }));
                        }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select…</option>
                        {typeOptions.length
                            ? typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)
                            : ['Table', 'Chart', 'Pentaho', 'Jasper'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                        }
                    </select>
                    {errors.reportType && <p className="text-xs text-red-500 mt-1">{errors.reportType}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Sub Type</label>
                    <select
                        value={reportSubType}
                        onChange={(e) => setReportSubType(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">—</option>
                        {subTypeOptions.length
                            ? subTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)
                            : null}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium">Category</label>
                    <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">—</option>
                        {categoryOptions.length
                            ? categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)
                            : ['Loans', 'Clients', 'Accounting', 'Portfolio', 'Custom'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                        }
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Description</label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description…"
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>

            <div>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={useReport} onChange={(e) => setUseReport(e.target.checked)} />
                    Enable report for users
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium">SQL *</label>
                <textarea
                    rows={10}
                    value={reportSql}
                    onChange={(e) => {
                        setReportSql(e.target.value);
                        if (errors.reportSql) setErrors(x => ({ ...x, reportSql: '' }));
                    }}
                    className="mt-1 w-full border rounded-md p-2 font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                    placeholder="SELECT ..."
                />
                {errors.reportSql && <p className="text-xs text-red-500 mt-1">{errors.reportSql}</p>}
                <p className="text-xs text-gray-500 mt-1">
                    Use parameter placeholders if supported by your tenant (e.g. <code className="font-mono">{'{startDate}'}</code>).
                </p>
            </div>

            <Card>
                <div className="flex items-center justify-between">
                    <div className="font-semibold">Parameters (optional)</div>
                    <Button variant="secondary" onClick={addParam}>Add Parameter</Button>
                </div>
                <div className="mt-3 space-y-2">
                    {params.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                value={p.name}
                                onChange={(e) => setParam(i, e.target.value)}
                                placeholder="e.g. startDate"
                                className="flex-1 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <Button variant="danger" onClick={() => delParam(i)}>Remove</Button>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Report')}
                </Button>
            </div>
        </form>
    );
};

export default ReportForm;
