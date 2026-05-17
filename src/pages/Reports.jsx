import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileBarChart2, FileSpreadsheet, FileText, Play, Search } from 'lucide-react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TYPE_OPTIONS_BASE = [{ value: '', label: 'All' }];
const CATEGORY_OPTIONS_BASE = [{ value: '', label: 'All' }];
const REPORT_FETCH_LIMIT = 200;

const toItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.pageItems)) return payload.pageItems;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
};

const toTotal = (payload, fallbackCount) => {
    const numeric =
        payload?.totalFilteredRecords ??
        payload?.totalRecords ??
        payload?.total ??
        payload?.filteredRecords;
    return Number.isFinite(Number(numeric)) ? Number(numeric) : fallbackCount;
};

const isUnsupportedReport = (report) => {
    const type = String(report?.type || '').toLowerCase();
    const name = String(report?.name || '').toLowerCase();
    const category = String(report?.category || '').toLowerCase();
    return /pentaho/.test(type) || /\bsms\b/.test(type) || /\bsms\b/.test(name) || /\bsms\b/.test(category);
};

const guessOutputs = (type) => {
    const t = String(type || '').toLowerCase();
    if (/pentaho/.test(t)) return ['PDF', 'XLS', 'HTML', 'CSV'];
    if (/table|stretchy/.test(t)) return ['JSON', 'CSV'];
    return ['JSON'];
};

const sortOptions = [
    { value: 'name:asc', label: 'Name A-Z' },
    { value: 'name:desc', label: 'Name Z-A' },
    { value: 'category:asc', label: 'Category A-Z' },
    { value: 'type:asc', label: 'Type A-Z' },
];

const Reports = () => {
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [typeOptions, setTypeOptions] = useState(TYPE_OPTIONS_BASE);
    const [categoryOptions, setCategoryOptions] = useState(CATEGORY_OPTIONS_BASE);

    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const collected = [];
                let offset = 0;
                let expectedTotal = null;

                while (true) {
                    const { data } = await api.get('/reports', {
                        params: { offset, limit: REPORT_FETCH_LIMIT },
                    });
                    const items = toItems(data);
                    collected.push(...items);

                    const total = toTotal(data, collected.length);
                    expectedTotal = expectedTotal == null ? total : Math.max(expectedTotal, total);

                    if (!items.length || items.length < REPORT_FETCH_LIMIT || collected.length >= expectedTotal) {
                        break;
                    }
                    offset += REPORT_FETCH_LIMIT;
                }

                const mapped = collected
                    .map((r) => ({
                        id: r.id ?? r.reportId ?? r.report_id ?? null,
                        name: r.reportName || r.name || r.report_name || '',
                        type: String(r.reportType || r.type || 'Table'),
                        category: r.reportCategory?.name || r.category || r.reportCategory || 'General',
                        description: r.description,
                        coreReport: r.coreReport,
                        useReport: r.useReport,
                        reportParameters: r.reportParameters || [],
                        outputs: guessOutputs(r.reportType || r.type || 'Table'),
                        routeKey: String((r.id ?? r.reportId ?? r.report_id ?? r.reportName) || r.name || ''),
                        __raw: r,
                    }))
                    .filter((r) => !!r.name && !!r.routeKey)
                    .filter((r) => !isUnsupportedReport(r));
                if (cancelled) return;
                setReports(mapped);

                const types = Array.from(new Set(mapped.map((m) => m.type))).sort();
                const cats = Array.from(new Set(mapped.map((m) => m.category))).sort();
                setTypeOptions(TYPE_OPTIONS_BASE.concat(types.map((t) => ({ value: t, label: t }))));
                setCategoryOptions(CATEGORY_OPTIONS_BASE.concat(cats.map((c) => ({ value: c, label: c }))));
            } catch {
                if (!cancelled) {
                    setReports([]);
                    setTypeOptions(TYPE_OPTIONS_BASE);
                    setCategoryOptions(CATEGORY_OPTIONS_BASE);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => (cancelled = true);
    }, []);

    const filtered = useMemo(() => {
        const s = debouncedSearch.trim().toLowerCase();
        const arr = reports.filter((r) => {
            const okSearch =
                !s ||
                r.name.toLowerCase().includes(s) ||
                r.type.toLowerCase().includes(s) ||
                (r.category || '').toLowerCase().includes(s);
            const okType = !typeFilter || r.type === typeFilter;
            const okCat = !categoryFilter || r.category === categoryFilter;
            return okSearch && okType && okCat;
        });
        arr.sort((a, b) => {
            const va = (a[sortBy] || '').toString().toLowerCase();
            const vb = (b[sortBy] || '').toString().toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return arr;
    }, [reports, debouncedSearch, typeFilter, categoryFilter, sortBy, sortDir]);

    const total = filtered.length;
    const groupedReports = useMemo(() => {
        const start = page * limit;
        const paged = filtered.slice(start, start + limit);
        return paged.reduce((acc, item) => {
            const key = item.category || 'General';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }, [filtered, page, limit]);
    const pageItems = useMemo(() => {
        const start = page * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page, limit]);
    const reportStats = useMemo(() => {
        const pentaho = reports.filter((item) => /pentaho/i.test(item.type)).length;
        const table = reports.filter((item) => /table|stretchy/i.test(item.type)).length;
        return {
            total: reports.length,
            filtered: total,
            pentaho,
            table,
        };
    }, [reports, total]);
    const categories = useMemo(() => Object.keys(groupedReports).sort(), [groupedReports]);

    const onSort = (key) => {
        if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortDir('asc'); }
    };

    const onRowClick = (row) => {
        const routeKey = row?.routeKey || row?.id || row?.name;
        if (!routeKey) {
            console.warn('Selected report has no route key', row);
            return;
        }
        navigate(`/reports/${encodeURIComponent(String(routeKey))}`, {
            state: { report: row.__raw || row },
        });
    };

    const clearFilters = () => {
        setSearch(''); setTypeFilter(''); setCategoryFilter(''); setPage(0);
    };
    const updateSort = (value) => {
        const [nextSortBy, nextSortDir] = String(value || 'name:asc').split(':');
        setSortBy(nextSortBy || 'name');
        setSortDir(nextSortDir || 'asc');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Reports</h1>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Browse by category, open faster, and get to run or export without hunting through a generic table.
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Reports</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{reportStats.total}</div>
                </Card>
                <Card>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filtered</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{reportStats.filtered}</div>
                </Card>
                <Card>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Table Reports</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{reportStats.table}</div>
                </Card>
                <Card>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pentaho Reports</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{reportStats.pentaho}</div>
                </Card>
            </div>

            <Card>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
                    <div>
                        <label className="block text-sm font-medium">Search</label>
                        <div className="relative mt-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                placeholder="Report name, category, type"
                                className="w-full rounded-md border p-2 pl-9 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {typeOptions.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Category</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {categoryOptions.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Sort</label>
                        <select
                            value={`${sortBy}:${sortDir}`}
                            onChange={(e) => updateSort(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {sortOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Show</label>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} reports</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {categoryOptions.filter((opt) => opt.value).slice(0, 8).map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setCategoryFilter(opt.value); setPage(0); }}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                categoryFilter === opt.value
                                    ? 'border-[var(--tenant-primary)] bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}
                    </div>
                </div>
            </Card>

            {loading ? (
                <Card>Loading reports...</Card>
            ) : !pageItems.length ? (
                <Card>No reports found.</Card>
            ) : (
                <div className="space-y-6">
                    {categories.map((category) => (
                        <div key={category} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{category}</h2>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        {groupedReports[category]?.length || 0} report{groupedReports[category]?.length === 1 ? '' : 's'}
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-4 xl:grid-cols-2">
                                {groupedReports[category].map((report) => {
                                    const typeLower = String(report.type || '').toLowerCase();
                                    const typeTone = /pentaho/.test(typeLower) ? 'purple' : /table|stretchy/.test(typeLower) ? 'blue' : 'gray';
                                    return (
                                        <Card
                                            key={`${category}-${report.routeKey}`}
                                            className="cursor-pointer border-slate-200/80 transition hover:-translate-y-[1px] hover:border-slate-300 dark:hover:border-slate-600"
                                            onClick={() => onRowClick(report)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{report.name}</h3>
                                                        <Badge tone={typeTone}>{report.type}</Badge>
                                                        <Badge tone="slate">{report.category || 'General'}</Badge>
                                                    </div>
                                                    <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                                                        {report.description || 'Open this report to set parameters, preview data, or download supported exports.'}
                                                    </div>
                                                </div>
                                                {/pentaho/.test(typeLower) ? (
                                                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                                                ) : /table|stretchy/.test(typeLower) ? (
                                                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-400" />
                                                ) : (
                                                    <FileBarChart2 className="h-5 w-5 shrink-0 text-slate-400" />
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{report.reportParameters.length} parameter{report.reportParameters.length === 1 ? '' : 's'}</span>
                                                <span>•</span>
                                                <span>{report.outputs.join(', ')}</span>
                                                {report.coreReport ? <><span>•</span><span>Core</span></> : null}
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onRowClick(report);
                                                    }}
                                                >
                                                    <Play size={16} />
                                                    Open
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onRowClick(report);
                                                    }}
                                                >
                                                    <ArrowRight size={16} />
                                                    Run / Download
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {total > limit ? (
                <Card>
                    <div className="flex items-center justify-between">
                        <Button variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                            Previous
                        </Button>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Showing {Math.min(total, page * limit + 1)}-{Math.min(total, page * limit + limit)} of {total}
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setPage((p) => ((p + 1) * limit < total ? p + 1 : p))}
                            disabled={(page + 1) * limit >= total}
                        >
                            Next
                        </Button>
                    </div>
                </Card>
            ) : null}
        </div>
    );
};

export default Reports;
