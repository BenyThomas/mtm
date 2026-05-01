import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { downloadGwOpsReport, getGwOpsReport } from '../api/gateway/reports';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

const toItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.pageItems)) return payload.pageItems;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
};

const norm = (s) => (s ?? '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
const slug = (s) => norm(s).replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const COMMON_QUERY_KEY = {
    startDateSelect: 'R_startDate',
    endDateSelect: 'R_endDate',
    fromDate: 'R_fromDate',
    toDate: 'R_toDate',
    asOnDate: 'R_ondate',
    OfficeIdSelectOne: 'R_officeId',
    OfficeId: 'R_officeId',
    officeId: 'R_officeId',
    loanOfficerIdSelectAll: 'R_loanOfficerId',
    loanOfficerId: 'R_loanOfficerId',
    currencyIdSelectAll: 'R_currencyId',
    currencyId: 'R_currencyId',
    fundIdSelectAll: 'fundId',
    fundId: 'fundId',
    loanProductIdSelectAll: 'loanProductId',
    loanProductId: 'loanProductId',
    loanPurposeIdSelectAll: 'loanPurposeId',
    loanPurposeId: 'loanPurposeId',
    savingsProductIdSelectAll: 'savingsProductId',
    savingsProductId: 'savingsProductId',
    SelectGLAccountNO: 'R_GLAccountNO',
    selectAccount: 'R_accountNo',
    transactionId: 'R_transactionId',
    DefaultSavings: 'R_savingsId',
    DefaultSavingsTransactionId: 'R_savingsTransactionId',
    DefaultLoan: 'R_loanId',
    DefaultClient: 'R_clientId',
    DefaultGroup: 'R_groupId',
    selectCenterId: 'R_centerId',
    selectLoan: 'R_selectLoan',
    cycleXSelect: 'R_cycleX',
    cycleYSelect: 'R_cycleY',
    fromXSelect: 'R_fromX',
    toYSelect: 'R_toY',
    overdueXSelect: 'R_overdueX',
    overdueYSelect: 'R_overdueY',
    obligDateType: 'obligDateType',
    decimalChoice: 'decimalChoice',
    enableBusinessDate: 'enable-business-date',
};

const RESERVED_CONTROL_PARAMS = new Set([
    'isSelfServiceUserReport',
    'exportCSV',
    'parameterType',
    'output-type',
    'enable-business-date',
    'obligDateType',
    'decimalChoice',
]);

const todayISO = new Date().toISOString().slice(0, 10);
const thirtyDaysAgoISO = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);

function humanizeLabel(value) {
    const raw = String(value || '')
        .replace(/^R_/, '')
        .replace(/Select(One|All)?$/i, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();
    if (!raw) return 'Parameter';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getParameterName(param) {
    return param?.parameterName || param?.reportParameterName || param?.name || '';
}

function getQueryKey(param) {
    const parameterName = getParameterName(param);
    const reportParameterName = param?.reportParameterName;

    if (reportParameterName) {
        return reportParameterName.startsWith('R_') ? reportParameterName : `R_${reportParameterName}`;
    }
    if (COMMON_QUERY_KEY[parameterName]) {
        return COMMON_QUERY_KEY[parameterName];
    }
    if (parameterName.startsWith('R_') || RESERVED_CONTROL_PARAMS.has(parameterName)) {
        return parameterName;
    }
    return `R_${parameterName}`;
}

function inferFieldType(param) {
    const name = getParameterName(param);
    const lower = name.toLowerCase();
    if (lower.includes('date')) return 'date';
    if (lower.includes('office')) return 'office';
    if (lower.includes('loanofficer') || lower.includes('staff')) return 'loanOfficer';
    if (lower.includes('currency')) return 'currency';
    if (lower.includes('fund')) return 'fund';
    if (lower.includes('loanproduct')) return 'loanProduct';
    if (lower.includes('loanpurpose')) return 'loanPurpose';
    if (lower.includes('savingsproduct')) return 'savingsProduct';
    if (lower.includes('glaccount')) return 'glAccount';
    if (lower.includes('cycle') || lower.includes('overdue') || lower.includes('fromx') || lower.includes('toy')) return 'number';
    if (lower.includes('id')) return 'number';
    return 'text';
}

function buildInitialValues(reportParameters) {
    const next = {};
    (reportParameters || []).forEach((param) => {
        const key = getParameterName(param);
        if (!key) return;
        const lower = key.toLowerCase();
        if (lower === 'startdateselect' || lower === 'fromdate') {
            next[key] = thirtyDaysAgoISO;
            return;
        }
        if (lower === 'enddateselect' || lower === 'todate' || lower === 'asondate') {
            next[key] = todayISO;
            return;
        }
        next[key] = '';
    });
    return next;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function normalizeExportOption(item) {
    if (typeof item === 'string') {
        return item.toUpperCase();
    }
    if (item && typeof item === 'object') {
        const raw =
            item.value ??
            item.name ??
            item.type ??
            item.exportType ??
            item.outputType ??
            item.label;
        if (raw) {
            return String(raw).toUpperCase();
        }
    }
    return null;
}

function normalizedReportName(report) {
    return norm(report?.reportName || report?.name || '');
}

function resolveGatewayOverride(report) {
    const name = normalizedReportName(report);
    if (!name.includes('arrears report')) {
        return null;
    }

    let groupBy = 'loan';
    if (name.includes('branch') || name.includes('office')) {
        groupBy = 'branch';
    } else if (name.includes('loan officer') || name.includes('officer') || name.includes('staff')) {
        groupBy = 'officer';
    } else if (name.includes('product')) {
        groupBy = 'product';
    } else if (name.includes('client') || name.includes('customer')) {
        groupBy = 'client';
    }

    return {
        reportKey: 'arrears',
        groupBy,
        previewPath: `/gw/api/v1/ops/reports/arrears?groupBy=${encodeURIComponent(groupBy)}`,
        outputs: ['JSON', 'PDF', 'XLSX'],
    };
}

function rowsToMatrix(items) {
    const rows = Array.isArray(items) ? items : [];
    const keys = Array.from(
        rows.reduce((set, row) => {
            if (row && typeof row === 'object' && !Array.isArray(row)) {
                Object.keys(row).forEach((key) => set.add(key));
            }
            return set;
        }, new Set())
    );
    return {
        headers: keys.map((key) => ({ columnName: key })),
        rows: rows.map((row) => keys.map((key) => row?.[key])),
    };
}

const ReportDetails = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const reportParam = params.reportIdOrName ?? params.id ?? params.reportId ?? params.name ?? null;

    const [report, setReport] = useState(location.state?.report || null);
    const [loadingReportMeta, setLoadingReportMeta] = useState(true);
    const [availableOutputs, setAvailableOutputs] = useState([]);
    const [format, setFormat] = useState('JSON');
    const [paramValues, setParamValues] = useState({});
    const [loadingLists, setLoadingLists] = useState({});
    const [offices, setOffices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [currencies, setCurrencies] = useState(null);
    const [funds, setFunds] = useState([]);
    const [loanProducts, setLoanProducts] = useState([]);
    const [loanPurposes, setLoanPurposes] = useState([]);
    const [savingsProducts, setSavingsProducts] = useState([]);
    const [glAccounts, setGlAccounts] = useState([]);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);

    const reportParameters = useMemo(
        () => (Array.isArray(report?.reportParameters) ? report.reportParameters : []),
        [report]
    );
    const gatewayOverride = useMemo(() => resolveGatewayOverride(report), [report]);

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
                const { data } = await api.get('/reports', { params: { offset: 0, limit: 200 } });
                const items = toItems(data);
                const target = decodeURIComponent(String(nameLike));
                const found =
                    items.find((r) => norm(r.reportName) === norm(target)) ||
                    items.find((r) => slug(r.reportName) === slug(target));

                if (found?.id != null) {
                    await fetchById(found.id);
                } else if (!cancelled) {
                    setReport(null);
                    setLoadingReportMeta(false);
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
            return undefined;
        }

        if (reportParam && /^\d+$/.test(String(reportParam))) {
            fetchById(reportParam);
        } else if (reportParam) {
            resolveByName(reportParam);
        } else {
            setLoadingReportMeta(false);
        }

        return () => {
            cancelled = true;
        };
    }, [report, reportParam]);

    useEffect(() => {
        if (!reportParameters.length) {
            setParamValues({});
            return;
        }
        setParamValues((current) => {
            const initial = buildInitialValues(reportParameters);
            const merged = { ...initial, ...current };
            return merged;
        });
    }, [reportParameters]);

    const isPentaho = useMemo(() => /pentaho/i.test(report?.reportType || ''), [report]);
    const isTable = useMemo(() => /table|stretchy/i.test(report?.reportType || ''), [report]);
    const runnable = Boolean(report?.reportName) && (isPentaho || isTable);

    useEffect(() => {
        let cancelled = false;
        async function loadExports() {
            if (!report?.reportName) {
                setAvailableOutputs([]);
                return;
            }
            if (gatewayOverride) {
                setAvailableOutputs(gatewayOverride.outputs);
                return;
            }
            try {
                const { data } = await api.get(`/runreports/availableExports/${encodeURIComponent(report.reportName)}`);
                if (cancelled) return;
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.availableExports)
                        ? data.availableExports
                        : Array.isArray(data?.supportedExports)
                            ? data.supportedExports
                            : [];
                const normalized = Array.from(
                    new Set(
                        list
                            .map(normalizeExportOption)
                            .filter(Boolean)
                    )
                );
                setAvailableOutputs(normalized);
            } catch {
                if (cancelled) return;
                setAvailableOutputs(isPentaho ? ['PDF', 'XLS', 'HTML', 'CSV'] : ['JSON', 'CSV']);
            }
        }
        loadExports();
        return () => {
            cancelled = true;
        };
    }, [report, isPentaho, gatewayOverride]);

    useEffect(() => {
        if (!availableOutputs.length) return;
        if (!availableOutputs.includes(format)) {
            setFormat(availableOutputs[0]);
        }
    }, [availableOutputs, format]);

    const neededTypes = useMemo(() => {
        return new Set(reportParameters.map((param) => inferFieldType(param)));
    }, [reportParameters]);

    useEffect(() => {
        let cancelled = false;
        async function load(name, fetcher, assign) {
            setLoadingLists((s) => ({ ...s, [name]: true }));
            try {
                const response = await fetcher();
                if (!cancelled) assign(response.data);
            } catch {
                if (!cancelled) assign(name === 'currencies' ? null : []);
            } finally {
                if (!cancelled) setLoadingLists((s) => ({ ...s, [name]: false }));
            }
        }

        if (neededTypes.has('office')) load('offices', () => api.get('/offices'), (data) => setOffices(toItems(data)));
        if (neededTypes.has('loanOfficer')) load('staff', () => api.get('/staff'), (data) => setStaff(toItems(data)));
        if (neededTypes.has('currency')) load('currencies', () => api.get('/currencies'), setCurrencies);
        if (neededTypes.has('fund')) load('funds', () => api.get('/funds'), (data) => setFunds(toItems(data)));
        if (neededTypes.has('loanProduct')) load('loanProducts', () => api.get('/loanproducts'), (data) => setLoanProducts(toItems(data)));
        if (neededTypes.has('loanPurpose')) load('loanPurposes', () => api.get('/codes/3'), (data) => setLoanPurposes(toItems(data?.codeValues || data?.values || [])));
        if (neededTypes.has('savingsProduct')) load('savingsProducts', () => api.get('/savingsproducts'), (data) => setSavingsProducts(toItems(data)));
        if (neededTypes.has('glAccount')) load('glAccounts', () => api.get('/glaccounts'), (data) => setGlAccounts(toItems(data)));

        return () => {
            cancelled = true;
        };
    }, [neededTypes]);

    useEffect(() => {
        if (!neededTypes.has('office') || !offices.length) return;
        setParamValues((current) => {
            const officeParam = reportParameters.find((param) => inferFieldType(param) === 'office');
            const key = officeParam ? getParameterName(officeParam) : null;
            if (!key || current[key]) return current;
            return { ...current, [key]: String(offices[0].id) };
        });
    }, [neededTypes, offices, reportParameters]);

    useEffect(() => {
        if (!neededTypes.has('currency') || !currencies) return;
        const list = currencies?.selectedCurrencyOptions || currencies?.currencyOptions || [];
        if (!Array.isArray(list) || !list.length) return;
        setParamValues((current) => {
            const currencyParam = reportParameters.find((param) => inferFieldType(param) === 'currency');
            const key = currencyParam ? getParameterName(currencyParam) : null;
            if (!key || current[key]) return current;
            return { ...current, [key]: String(list[0].code || list[0].id || '') };
        });
    }, [neededTypes, currencies, reportParameters]);

    const onChangeValue = useCallback((key, value) => {
        setParamValues((current) => ({ ...current, [key]: value }));
    }, []);

    const buildParams = useCallback(() => {
        const built = {};
        reportParameters.forEach((param) => {
            const parameterName = getParameterName(param);
            const queryKey = getQueryKey(param);
            const value = paramValues[parameterName];
            if (value !== undefined && value !== null && value !== '') {
                built[queryKey] = value;
            }
        });
        return built;
    }, [paramValues, reportParameters]);

    const requestPreview = useMemo(() => {
        if (!report?.reportName) return '';
        if (gatewayOverride) {
            return gatewayOverride.previewPath;
        }
        const query = new URLSearchParams();
        Object.entries(buildParams()).forEach(([key, value]) => query.set(key, String(value)));
        if (format === 'CSV') {
            query.set('exportCSV', 'true');
        } else if (format !== 'JSON') {
            query.set('output-type', format);
        }
        return `/runreports/${encodeURIComponent(report.reportName)}${query.toString() ? `?${query.toString()}` : ''}`;
    }, [buildParams, format, report, gatewayOverride]);

    const runReport = async (event) => {
        event?.preventDefault?.();
        if (!runnable) return;

        setRunning(true);
        setError(null);
        setHeaders([]);
        setRows([]);

        try {
            const paramsToSend = buildParams();
            if (gatewayOverride) {
                if (format === 'JSON') {
                    const data = await getGwOpsReport(gatewayOverride.reportKey, { groupBy: gatewayOverride.groupBy });
                    const matrix = rowsToMatrix(data?.items);
                    setHeaders(matrix.headers);
                    setRows(matrix.rows);
                    if (!matrix.headers.length && !matrix.rows.length) {
                        addToast('Report returned no rows.', 'info');
                    }
                } else {
                    const gatewayFormat = format === 'XLSX' ? 'xlsx' : 'pdf';
                    const response = await downloadGwOpsReport(gatewayOverride.reportKey, { groupBy: gatewayOverride.groupBy }, gatewayFormat);
                    const contentType = response?.headers?.['content-type'] || (gatewayFormat === 'xlsx'
                        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : 'application/pdf');
                    downloadBlob(new Blob([response.data], { type: contentType }), `${report.reportName.replace(/\s+/g, '_')}.${gatewayFormat}`);
                    addToast(`Exported ${format}`, 'success');
                }
                return;
            }
            if (isTable && format === 'JSON') {
                const { data } = await api.get(`/runreports/${encodeURIComponent(report.reportName)}`, { params: paramsToSend });
                const cols = Array.isArray(data?.columnHeaders) ? data.columnHeaders : [];
                const objectRows = Array.isArray(data?.data)
                    ? data.data.filter((row) => row && typeof row === 'object' && !Array.isArray(row) && !Array.isArray(row?.row))
                    : [];
                const matrix = objectRows.length ? rowsToMatrix(objectRows) : {
                    headers: cols,
                    rows: Array.isArray(data?.data)
                        ? data.data.map((row) => (Array.isArray(row?.row) ? row.row : []))
                        : [],
                };
                setHeaders(matrix.headers);
                setRows(matrix.rows);
                if (!matrix.headers.length && !matrix.rows.length) {
                    addToast('Report returned no rows.', 'info');
                }
            } else {
                const exportParams = { ...paramsToSend };
                if (format === 'CSV') {
                    exportParams.exportCSV = true;
                } else {
                    exportParams['output-type'] = format;
                }
                const response = await api.get(`/runreports/${encodeURIComponent(report.reportName)}`, {
                    params: exportParams,
                    responseType: 'blob',
                });
                const ext = format.toLowerCase();
                downloadBlob(response.data, `${report.reportName.replace(/\s+/g, '_')}.${ext}`);
                addToast(`Exported ${format}`, 'success');
            }
        } catch (err) {
            const http = err?.response?.status;
            const developerMessage = err?.response?.data?.developerMessage || err?.response?.data?.defaultUserMessage || '';
            const message = err?.response?.data?.defaultUserMessage || err?.message || 'Failed to run report.';
            setError(message);
            addToast(message, 'error');
            if (http === 403 && /BadSqlGrammar/i.test(developerMessage)) {
                addToast('This report rejected the generated SQL. Check the parameter combination and rerun with narrower values.', 'warning');
            }
        } finally {
            setRunning(false);
        }
    };

    const Field = ({ param }) => {
        const key = getParameterName(param);
        const type = inferFieldType(param);
        const label = humanizeLabel(param?.reportParameterName || key);
        const commonProps = {
            className: 'mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600',
            value: paramValues[key] ?? '',
            onChange: (e) => onChangeValue(key, e.target.value),
        };

        if (type === 'date') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    <input type="date" {...commonProps} />
                </div>
            );
        }

        if (type === 'number') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    <input type="number" {...commonProps} />
                </div>
            );
        }

        if (type === 'office') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.offices ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : (
                        <select {...commonProps}>
                            <option value="">Select office</option>
                            {offices.map((office) => (
                                <option key={office.id} value={office.id}>
                                    {office.name || office.officeName || `Office #${office.id}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            );
        }

        if (type === 'loanOfficer') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.staff ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : (
                        <select {...commonProps}>
                            <option value="">All Loan Officers</option>
                            {staff.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.displayName || [member.firstname, member.lastname].filter(Boolean).join(' ') || `Staff #${member.id}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            );
        }

        if (type === 'currency') {
            const list = currencies?.selectedCurrencyOptions || currencies?.currencyOptions || [];
            if (!Array.isArray(list) || !list.length) {
                return (
                    <div>
                        <label className="block text-sm font-medium">{label}</label>
                        <input type="text" {...commonProps} placeholder="Currency code" />
                    </div>
                );
            }
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    <select {...commonProps}>
                        <option value="">All</option>
                        {list.map((item) => (
                            <option key={item.code || item.id} value={item.code || item.id}>
                                {item.displayLabel || `${item.name || item.code} [${item.code || item.id}]`}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (type === 'fund') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.funds ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : funds.length ? (
                        <select {...commonProps}>
                            <option value="">All</option>
                            {funds.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} />
                    )}
                </div>
            );
        }

        if (type === 'loanProduct') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.loanProducts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : loanProducts.length ? (
                        <select {...commonProps}>
                            <option value="">All</option>
                            {loanProducts.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} />
                    )}
                </div>
            );
        }

        if (type === 'loanPurpose') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.loanPurposes ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : loanPurposes.length ? (
                        <select {...commonProps}>
                            <option value="">All</option>
                            {loanPurposes.map((item) => (
                                <option key={item.id} value={item.id}>{item.name || item.value || `Code #${item.id}`}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} />
                    )}
                </div>
            );
        }

        if (type === 'savingsProduct') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.savingsProducts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : savingsProducts.length ? (
                        <select {...commonProps}>
                            <option value="">All</option>
                            {savingsProducts.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="number" {...commonProps} />
                    )}
                </div>
            );
        }

        if (type === 'glAccount') {
            return (
                <div>
                    <label className="block text-sm font-medium">{label}</label>
                    {loadingLists.glAccounts ? (
                        <div className="mt-2"><Skeleton height="2.25rem" /></div>
                    ) : glAccounts.length ? (
                        <select {...commonProps}>
                            <option value="">All</option>
                            {glAccounts.map((item) => (
                                <option key={item.id} value={item.glCode || item.id}>
                                    {(item.glCode ? `${item.glCode} - ` : '') + (item.name || `GL #${item.id}`)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input type="text" {...commonProps} />
                    )}
                </div>
            );
        }

        return (
            <div>
                <label className="block text-sm font-medium">{label}</label>
                <input type="text" {...commonProps} />
            </div>
        );
    };

    if (loadingReportMeta) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Report</h1>
                </div>
                <Card>
                    <div className="grid gap-2">
                        <Skeleton height="1.25rem" width="40%" />
                        {[...Array(6)].map((_, index) => <Skeleton key={index} height="1rem" />)}
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{report.reportName}</h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {report.reportType}{report.reportCategory ? ` - ${report.reportCategory}` : ''}
                    </div>
                </div>
                <Button variant="secondary" onClick={() => navigate('/reports')}>Back</Button>
            </div>

            <Card className="rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Run Report</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {gatewayOverride ? 'Uses gateway arrears report override for clean branch, officer, and cleared-loan handling.' : 'Uses Fineract report metadata directly.'}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mb-6">
                    <div>
                        <label className="block text-sm font-medium">Output</label>
                        <select
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            disabled={!runnable}
                        >
                            {availableOutputs.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {!gatewayOverride && reportParameters.length ? (
                    <div className="grid md:grid-cols-3 gap-3">
                        {reportParameters.map((param, index) => (
                            <Field key={`${getParameterName(param)}-${index}`} param={param} />
                        ))}
                    </div>
                ) : gatewayOverride ? (
                    <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800/40 dark:text-gray-300">
                        Grouping is fixed from the report name: <span className="font-medium">{gatewayOverride.groupBy}</span>.
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">This report does not declare parameters.</div>
                )}

                <div className="mt-6 rounded-xl border bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/40 dark:text-gray-300">
                    <div className="font-semibold mb-1">Request preview</div>
                    <div className="break-all">{requestPreview || 'No request generated yet.'}</div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <Button onClick={runReport} disabled={!runnable || running}>
                        {running ? 'Running...' : ((gatewayOverride || (isTable && format === 'JSON')) ? 'Run' : `Download ${format}`)}
                    </Button>
                    {!runnable ? (
                        <div className="text-sm text-gray-500">Unsupported report type: {report.reportType}</div>
                    ) : null}
                </div>

                {isTable && format === 'JSON' ? (
                    <div className="mt-6">
                        {running ? (
                            <div className="grid gap-2">
                                <Skeleton height="1.25rem" width="40%" />
                                {[...Array(6)].map((_, index) => <Skeleton key={index} height="1rem" />)}
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
                                            {headers.map((header, index) => (
                                                <th key={index} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                                    {header.columnName || header.columnCode || `Col ${index + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="odd:bg-white even:bg-gray-50 dark:odd:bg-transparent dark:even:bg-gray-900/20">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-3 py-2 whitespace-nowrap">
                                                        {String(cell ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Run the report to see results.</div>
                        )}
                    </div>
                ) : null}
            </Card>
        </div>
    );
};

export default ReportDetails;
