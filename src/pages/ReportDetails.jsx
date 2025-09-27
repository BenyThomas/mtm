// src/pages/ReportDetails.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

// -------------------- helpers --------------------
const toItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.pageItems)) return payload.pageItems;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
};

const norm = (s) => (s ?? '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
const slug = (s) =>
    norm(s).replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
};

// Map Fineract reportParameterName/parameterName -> query key used by /runreports
const PARAM_QUERY_KEY = {
    // generic "Select" params
    startDateSelect: 'R_startDate',
    endDateSelect: 'R_endDate',
    OfficeIdSelectOne: 'R_officeId',
    loanOfficerIdSelectAll: 'R_loanOfficerId',
    currencyIdSelectAll: 'R_currencyId',
    fundIdSelectAll: 'R_fundId',
    loanProductIdSelectAll: 'R_loanProductId',
    loanPurposeIdSelectAll: 'R_loanPurposeId',
    parTypeSelect: 'R_parType',
    obligDateTypeSelect: 'R_obligDateType',
    savingsProductIdSelectAll: 'R_savingsProductId',

    // "specials"
    selectAccount: 'R_accountNo',
    SelectGLAccountNO: 'R_GLAccountNO',
    transactionId: 'R_transactionId',
    DefaultSavings: 'R_savingsId',
    DefaultSavingsTransactionId: 'R_savingsTransactionId',
    DefaultLoan: 'R_loanId',
    DefaultClient: 'R_clientId',
    DefaultGroup: 'R_groupId',
    selectCenterId: 'R_centerId',
    selectLoan: 'R_selectLoan',
    asOnDate: 'R_ondate',

    // ranges / counters
    cycleXSelect: 'R_cycleX',
    cycleYSelect: 'R_cycleY',
    fromXSelect: 'R_fromX',
    toYSelect: 'R_toY',
    overdueXSelect: 'R_overdueX',
    overdueYSelect: 'R_overdueY',
};

// If reportParameterName exists (Pentaho metadata), use it instead of generic
const getQueryKeyForParam = (p) => {
    if (p?.reportParameterName) return `R_${p.reportParameterName}`;
    const byName = PARAM_QUERY_KEY[p?.parameterName];
    return byName || `R_${(p?.parameterName || '').replace(/Select/i, '')}`;
};

// -------------------- Supported field library --------------------
const ALL_SUPPORTED_FIELDS = [
    // Core dates & office/officer
    { key: 'startDateSelect', label: 'Start Date', type: 'date', section: 'Core' },
    { key: 'endDateSelect', label: 'End Date', type: 'date', section: 'Core' },
    { key: 'asOnDate', label: 'As On Date', type: 'date', section: 'Core' },
    { key: 'OfficeIdSelectOne', label: 'Office', type: 'office', section: 'Core' },
    { key: 'loanOfficerIdSelectAll', label: 'Loan Officer', type: 'loanOfficer', section: 'Core' },

    // Loan filters
    { key: 'currencyIdSelectAll', label: 'Currency', type: 'currency', section: 'Loan' },
    { key: 'fundIdSelectAll', label: 'Fund', type: 'fund', section: 'Loan' },
    { key: 'loanProductIdSelectAll', label: 'Loan Product', type: 'loanProduct', section: 'Loan' },
    { key: 'loanPurposeIdSelectAll', label: 'Loan Purpose', type: 'loanPurpose', section: 'Loan' },
    { key: 'parTypeSelect', label: 'PAR Type', type: 'parType', section: 'Loan' },
    { key: 'obligDateTypeSelect', label: 'Obligation Date Type', type: 'text', section: 'Loan', placeholder: 'e.g. DISBURSED' },

    // Accounting
    { key: 'SelectGLAccountNO', label: 'GL Account', type: 'glAccount', section: 'Accounting' },

    // Savings
    { key: 'savingsProductIdSelectAll', label: 'Savings Product', type: 'savingsProduct', section: 'Savings' },
    { key: 'selectAccount', label: 'Account No.', type: 'text', section: 'Savings', placeholder: 'e.g. 000123' },
    { key: 'transactionId', label: 'Transaction ID', type: 'text', section: 'Savings', placeholder: 'Txn ID' },

    // Entity defaults
    { key: 'DefaultSavings', label: 'Savings ID', type: 'number', section: 'Entities' },
    { key: 'DefaultSavingsTransactionId', label: 'Savings Txn ID', type: 'number', section: 'Entities' },
    { key: 'DefaultLoan', label: 'Loan ID', type: 'number', section: 'Entities' },
    { key: 'DefaultClient', label: 'Client ID', type: 'number', section: 'Entities' },
    { key: 'DefaultGroup', label: 'Group ID', type: 'number', section: 'Entities' },
    { key: 'selectCenterId', label: 'Center ID', type: 'number', section: 'Entities' },
    { key: 'selectLoan', label: 'Select Loan', type: 'number', section: 'Entities' },

    // Ranged counters (SMS)
    { key: 'cycleXSelect', label: 'Cycle X', type: 'number', section: 'Ranges' },
    { key: 'cycleYSelect', label: 'Cycle Y', type: 'number', section: 'Ranges' },
    { key: 'fromXSelect', label: 'From X (days)', type: 'number', section: 'Ranges' },
    { key: 'toYSelect', label: 'To Y (days)', type: 'number', section: 'Ranges' },
    { key: 'overdueXSelect', label: 'Overdue X (days)', type: 'number', section: 'Ranges' },
    { key: 'overdueYSelect', label: 'Overdue Y (days)', type: 'number', section: 'Ranges' },
];

// -------------------- Component --------------------
const ReportDetails = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const reportParam =
        params.reportIdOrName ??
        params.id ??
        params.reportId ??
        params.name ??
        null;

    const [report, setReport] = useState(location.state?.report || null);
    const [loadingReportMeta, setLoadingReportMeta] = useState(true);

    // Output format
    const [format, setFormat] = useState('JSON');

    // Data lists
    const [offices, setOffices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [currencies, setCurrencies] = useState(null); // keep raw object with selectedCurrencyOptions & currencyOptions
    const [funds, setFunds] = useState([]);
    const [loanProducts, setLoanProducts] = useState([]);
    const [savingsProducts, setSavingsProducts] = useState([]);
    const [glAccounts, setGlAccounts] = useState([]);
    const [loanPurposes, setLoanPurposes] = useState([]); // <-- codes/3

    const [loadingLists, setLoadingLists] = useState({}); // {offices:true,...}

    // Param values keyed by parameterName (NOT query key)
    const todayISO = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgoISO = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const [paramValues, setParamValues] = useState({
        startDateSelect: thirtyDaysAgoISO,
        endDateSelect: todayISO,
        asOnDate: todayISO,
        OfficeIdSelectOne: '-1',       // All offices
        loanOfficerIdSelectAll: '-1',  // All loan officers
        currencyIdSelectAll: '',       // Will be prefilled from selectedCurrencyOptions
        fundIdSelectAll: '',
        loanProductIdSelectAll: '',
        loanPurposeIdSelectAll: '',    // codes/3 value (codeValue id)
        parTypeSelect: '30',
        obligDateTypeSelect: '',
        savingsProductIdSelectAll: '',
        selectAccount: '',
        transactionId: '',
        DefaultSavings: '',
        DefaultSavingsTransactionId: '',
        DefaultLoan: '',
        DefaultClient: '',
        DefaultGroup: '',
        selectCenterId: '',
        selectLoan: '',
        cycleXSelect: '',
        cycleYSelect: '',
        fromXSelect: '',
        toYSelect: '',
        overdueXSelect: '',
        overdueYSelect: '',
        SelectGLAccountNO: '',
    });

    // Result state
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [pentahoUnavailable, setPentahoUnavailable] = useState(false);

    // -------- Resolve report from param or state --------
    useEffect(() => {
        let cancelled = false;

        async function fetchById(idLike) {
            try {
                const { data } = await api.get(`/reports/${encodeURIComponent(idLike)}?template=true`);
                if (!cancelled) setReport(data || null);
            } catch {
                if (!cancelled) setReport(null);
            } finally {
                if (!cancelled) setLoadingReportMeta(false);
            }
        }

        async function resolveByName(nameLike) {
            try {
                const { data } = await api.get('/reports');
                const items = toItems(data);
                const target = decodeURIComponent(String(nameLike));
                const found =
                    items.find((r) => norm(r.reportName) === norm(target)) ||
                    items.find((r) => slug(r.reportName) === slug(target));

                if (found?.id != null) {
                    await fetchById(found.id);
                } else {
                    if (!cancelled) {
                        setReport(null);
                        setLoadingReportMeta(false);
                    }
                }
            } catch {
                if (!cancelled) {
                    setReport(null);
                    setLoadingReportMeta(false);
                }
            }
        }

        if (report) {
            setLoadingReportMeta(false);
            return;
        }

        // If param is numeric, directly call /reports/{id}?template=true
        if (reportParam && /^\d+$/.test(String(reportParam))) {
            fetchById(reportParam);
        } else if (reportParam) {
            // Resolve by name
            resolveByName(reportParam);
        } else {
            setReport(null);
            setLoadingReportMeta(false);
        }

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportParam]);

    const isPentaho = useMemo(
        () => /pentaho/i.test(report?.reportType || ''),
        [report]
    );

    const isTable = useMemo(
        () => /table/i.test(report?.reportType || ''),
        [report]
    );

    const runnable = isPentaho || isTable;

    const allowedOutputs = isPentaho
        ? ['PDF', 'XLS', 'HTML', 'CSV']
        : isTable
            ? ['JSON', 'CSV']
            : [];

    useEffect(() => {
        if (!allowedOutputs.includes(format) && allowedOutputs.length) {
            setFormat(allowedOutputs[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [report, isPentaho, isTable]);

    // Set of parameter names that this report actually uses
    const requiredParamNames = useMemo(() => {
        const arr = Array.isArray(report?.reportParameters) ? report.reportParameters : [];
        return new Set(arr.map((p) => p.parameterName));
    }, [report]);

    // Utility: whether this report needs a specific param (by parameterName)
    const needs = useCallback((paramName) => requiredParamNames.has(paramName), [requiredParamNames]);

    // Lazy-load option lists only if needed
    useEffect(() => {
        let cancelled = false;

        async function load(name, fn, assign) {
            setLoadingLists((s) => ({ ...s, [name]: true }));
            try {
                const res = await fn();
                if (cancelled) return;
                assign(res.data);
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoadingLists((s) => ({ ...s, [name]: false }));
            }
        }

        if (needs('OfficeIdSelectOne'))
            load('offices', () => api.get('/offices'), (data) => setOffices(toItems(data)));

        if (needs('loanOfficerIdSelectAll'))
            load('staff', () => api.get('/staff'), (data) => setStaff(toItems(data)));

        if (needs('currencyIdSelectAll'))
            load('currencies', () => api.get('/currencies'), (data) => setCurrencies(data));

        if (needs('fundIdSelectAll'))
            load('funds', () => api.get('/funds'), (data) => setFunds(toItems(data)));

        if (needs('loanProductIdSelectAll'))
            load('loanProducts', () => api.get('/loanproducts'), (data) => setLoanProducts(toItems(data)));

        if (needs('savingsProductIdSelectAll'))
            load('savingsProducts', () => api.get('/savingsproducts'), (data) => setSavingsProducts(toItems(data)));

        if (needs('SelectGLAccountNO'))
            load('glAccounts', () => api.get('/glaccounts'), (data) => setGlAccounts(toItems(data)));

        // Loan purpose codes (Fineract default "Loan Purpose" code = id 3)
        if (needs('loanPurposeIdSelectAll'))
            load('loanPurposes', () => api.get('/codes/3'), (data) => setLoanPurposes(toItems(data?.codeValues || data?.values || [])));

        return () => { cancelled = true; };
    }, [needs]);

    // Prefill currency from selectedCurrencyOptions if user hasn't chosen yet
    useEffect(() => {
        if (!currencies) return;
        const sel = currencies?.selectedCurrencyOptions;
        if (Array.isArray(sel) && sel.length) {
            setParamValues((s) => {
                if (s.currencyIdSelectAll) return s;
                return { ...s, currencyIdSelectAll: sel[0].code };
            });
        }
    }, [currencies]);

    const onChangeValue = (key, value) => {
        setParamValues((s) => ({ ...s, [key]: value }));
    };

    // Build request params only from the fields the report actually needs.
    const buildParams = () => {
        const params = {};
        const arr = Array.isArray(report?.reportParameters) ? report.reportParameters : [];

        for (const p of arr) {
            const paramName = p.parameterName;
            const qKey = getQueryKeyForParam(p);
            const v = paramValues[paramName];

            if (v !== undefined && v !== null && v !== '') {
                params[qKey] = v;
            } else {
                // Special "All" defaults
                if (paramName === 'OfficeIdSelectOne') params[qKey] = '-1';
                if (paramName === 'loanOfficerIdSelectAll') params[qKey] = '-1';
            }
        }
        return params;
    };

    // Validate required-ish params
    const canRun = useCallback(() => {
        const arr = Array.isArray(report?.reportParameters) ? report.reportParameters : [];
        for (const p of arr) {
            const key = p.parameterName;
            if ((key === 'startDateSelect' || key === 'endDateSelect') && !paramValues[key]) return false;
            if (key === 'asOnDate' && !paramValues[key]) return false;
        }
        return true;
    }, [report, paramValues]);

    // Execute report
    const runReport = async (e) => {
        e?.preventDefault?.();
        if (!runnable) return;

        if (!canRun()) {
            addToast('Please fill all required parameters.', 'warning');
            return;
        }

        setError(null); setHeaders([]); setRows([]); setPentahoUnavailable(false);
        setRunning(true);

        try {
            const params = buildParams();

            if (isTable && format === 'JSON') {
                const { data } = await api.get(`/runreports/${encodeURIComponent(report.reportName)}`, { params });
                const cols = Array.isArray(data?.columnHeaders) ? data.columnHeaders : [];
                const dataRows = Array.isArray(data?.data)
                    ? data.data.map((r) => (Array.isArray(r?.row) ? r.row : []))
                    : [];
                setHeaders(cols);
                setRows(dataRows);
                if (!cols.length || !dataRows.length) addToast('Report returned no data', 'info');
            } else {
                if (format === 'CSV') {
                    params.exportCSV = true;
                } else {
                    params['output-type'] = format; // PDF | XLS | HTML
                }

                const res = await api.get(`/runreports/${encodeURIComponent(report.reportName)}`, {
                    params,
                    responseType: 'blob',
                });
                const ext = format === 'CSV' ? 'csv' : format.toLowerCase();
                const fname = `${report.reportName.replace(/\s+/g, '_')}.${ext}`;
                downloadBlob(res.data, fname);
                addToast(`Exported ${format}`, 'success');
            }
        } catch (err) {
            const http = err?.response?.status;
            const devMsg = err?.response?.data?.developerMessage || '';
            const msg = err?.response?.data?.defaultUserMessage || err?.message || 'Failed to run report';
            setError(msg);
            addToast(msg, 'error');

            if (http === 503 && /Pentaho/i.test(devMsg)) {
                setPentahoUnavailable(true);
            }
            if (http === 403 && /BadSqlGrammar/i.test(devMsg)) {
                addToast('This report may require a valid Office and dates. Try setting Office to a specific branch instead of -1.', 'warning');
            }
        } finally {
            setRunning(false);
        }
    };

    // Field renderers (render ONLY when needed)
    const Field = ({ def }) => {
        const required = needs(def.key);
        if (!required) return null; // hide when report doesn't require it

        const commonProps = {
            className:
                'mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600',
            value: paramValues[def.key] ?? '',
            onChange: (e) => onChangeValue(def.key, e.target.value),
            placeholder: def.placeholder || '',
        };

        if (def.type === 'date') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    <input type="date" {...commonProps} />
                </div>
            );
        }

        if (def.type === 'number') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    <input type="number" {...commonProps} />
                </div>
            );
        }

        if (def.type === 'text') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    <input type="text" {...commonProps} />
                </div>
            );
        }

        if (def.type === 'parType') {
            const value = paramValues[def.key] ?? '';
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    <select
                        {...commonProps}
                        value={value}
                    >
                        <option value="">Select…</option>
                        <option value="1">PAR &gt; 1</option>
                        <option value="30">PAR &gt; 30</option>
                        <option value="60">PAR &gt; 60</option>
                        <option value="90">PAR &gt; 90</option>
                    </select>
                </div>
            );
        }

        if (def.type === 'office') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.offices ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? '-1'}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="-1">All Offices (-1)</option>
                            {offices.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name || o.officeName || `Office #${o.id}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            );
        }

        if (def.type === 'loanOfficer') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.staff ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? '-1'}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="-1">All Loan Officers (-1)</option>
                            {staff.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.displayName ||
                                        [s.firstname, s.lastname].filter(Boolean).join(' ') ||
                                        `Staff #${s.id}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            );
        }

        if (def.type === 'currency') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.currencies ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : (() => {
                        const list = (currencies?.selectedCurrencyOptions?.length
                            ? currencies.selectedCurrencyOptions
                            : currencies?.selectedCurrencyOptions) || [];

                        if (!list.length) {
                            return <input type="text" {...commonProps} placeholder="Currency code (e.g. TZS)" />;
                        }

                        const currentValue =
                            (paramValues[def.key] ?? '') ||
                            (currencies?.selectedCurrencyOptions?.[0]?.code ?? '');

                        return (
                            <select
                                {...commonProps}
                                value={currentValue}
                                onChange={(e) => onChangeValue(def.key, e.target.value)}
                            >
                                <option value="">All</option>
                                {list.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.displayLabel || `${c.name} [${c.code}]`}
                                    </option>
                                ))}
                            </select>
                        );
                    })()}
                </div>
            );
        }

        if (def.type === 'fund') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.funds ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : funds.length ? (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? ''}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {funds.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} placeholder="Fund ID" />
                    )}
                </div>
            );
        }

        if (def.type === 'loanProduct') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.loanProducts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : loanProducts.length ? (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? ''}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {loanProducts.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} placeholder="Loan Product ID" />
                    )}
                </div>
            );
        }

        if (def.type === 'loanPurpose') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.loanPurposes ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : loanPurposes.length ? (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? ''}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {loanPurposes.map((cv) => (
                                <option key={cv.id} value={cv.id}>
                                    {cv.name || cv.value || `Code #${cv.id}`}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} placeholder="Loan Purpose code value ID" />
                    )}
                </div>
            );
        }

        if (def.type === 'savingsProduct') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.savingsProducts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : savingsProducts.length ? (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? ''}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {savingsProducts.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} placeholder="Savings Product ID" />
                    )}
                </div>
            );
        }

        if (def.type === 'glAccount') {
            return (
                <div>
                    <label className="block text-sm font-medium">{def.label}</label>
                    {loadingLists.glAccounts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : glAccounts.length ? (
                        <select
                            {...commonProps}
                            value={paramValues[def.key] ?? ''}
                            onChange={(e) => onChangeValue(def.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {glAccounts.map((g) => (
                                <option key={g.id} value={g.glCode || g.id}>
                                    {(g.glCode ? `${g.glCode} — ` : '') + (g.name || `GL #${g.id}`)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input type="text" {...commonProps} placeholder="GL Account No / Code" />
                    )}
                </div>
            );
        }

        return null;
    };

    const sections = useMemo(() => {
        const grouped = {};
        for (const f of ALL_SUPPORTED_FIELDS) {
            if (!grouped[f.section]) grouped[f.section] = [];
            grouped[f.section].push(f);
        }
        return grouped;
    }, []);

    if (loadingReportMeta) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Report</h1>
                </div>
                <Card>
                    <div className="grid gap-2">
                        <Skeleton height="1.25rem" width="40%" />
                        {[...Array(6)].map((_, i) => <Skeleton key={i} height="1rem" />)}
                    </div>
                </Card>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Report</h1>
                </div>
                <Card>
                    <div className="text-red-600 dark:text-red-400">
                        Report not found. <Button className="ml-2" onClick={() => navigate('/reports')}>Back to Reports</Button>
                    </div>
                </Card>
            </div>
        );
    }

    const anyParams = Array.isArray(report.reportParameters) && report.reportParameters.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{report.reportName}</h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {report.reportType}{report.reportCategory ? ` • ${report.reportCategory}` : ''}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => navigate('/reports')}>Back</Button>
                </div>
            </div>

            {/* Runner */}
            <Card className="rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Parameters</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Only parameters required by this report are shown.
                    </div>
                </div>

                {/* Output format selector */}
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <div>
                        <label className="block text-sm font-medium">Output</label>
                        <select
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            disabled={!runnable}
                        >
                            {allowedOutputs.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        {!runnable && (
                            <div className="text-xs text-amber-600 mt-1">
                                This report type isn’t runnable via /runreports.
                            </div>
                        )}
                        {isPentaho && (
                            <div className="text-xs text-gray-500 mt-1">
                                Pentaho exports require server reporting service.
                            </div>
                        )}
                    </div>
                </div>

                {/* Param sections */}
                {anyParams ? (
                    <div className="space-y-6">
                        {Object.entries(sections).map(([sectionName, fields]) => {
                            const visibleFields = fields.filter((f) => needs(f.key));
                            if (!visibleFields.length) return null;
                            return (
                                <div key={sectionName}>
                                    <div className="font-semibold text-sm mb-2">{sectionName}</div>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        {visibleFields.map((f) => (
                                            <Field key={f.key} def={f} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">This report has no parameters.</div>
                )}

                {/* Pentaho unavailable banner */}
                {pentahoUnavailable && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 p-3">
                        Pentaho reports require the Pentaho reporting service on the server. It appears to be disabled.
                    </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                    <Button onClick={runReport} disabled={!runnable || running || !canRun()}>
                        {running ? 'Running…' : (isTable && format === 'JSON' ? 'Run' : `Download ${format}`)}
                    </Button>
                    {(!runnable) && (
                        <div className="text-sm text-gray-500">Unsupported report type: {report.reportType}</div>
                    )}
                </div>

                {/* JSON results */}
                {isTable && format === 'JSON' && (
                    <div className="mt-6">
                        {running ? (
                            <div className="grid gap-2">
                                <Skeleton height="1.25rem" width="40%" />
                                {[...Array(6)].map((_, i) => <Skeleton key={i} height="1rem" />)}
                            </div>
                        ) : error ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                {error}
                            </div>
                        ) : headers.length ? (
                            <div className="overflow-auto rounded-xl border">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/40">
                                    <tr>
                                        {headers.map((h, i) => (
                                            <th
                                                key={i}
                                                className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap"
                                            >
                                                {h.columnName || h.columnCode || `Col ${i + 1}`}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {rows.map((row, rIdx) => (
                                        <tr
                                            key={rIdx}
                                            className="odd:bg-white even:bg-gray-50 dark:odd:bg-transparent dark:even:bg-gray-900/20"
                                        >
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                                    {String(cell ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!rows.length && (
                                        <tr>
                                            <td className="px-3 py-3 text-gray-500" colSpan={headers.length}>
                                                No rows.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Run the report to see results.</div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ReportDetails;
