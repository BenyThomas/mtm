import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TYPE_OPTIONS_BASE = [{ value: '', label: 'All' }];
const CATEGORY_OPTIONS_BASE = [{ value: '', label: 'All' }];

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
                const { data } = await api.get('/reports'); // baseURL should include /v1
                const items = Array.isArray(data) ? data : (data?.pageItems || []);
                const mapped = items
                    .map((r) => ({
                        id: r.id ?? r.reportId ?? r.report_id ?? null,
                        name: r.reportName || r.name || r.report_name || '',
                        type: String(r.reportType || r.type || 'Table'),
                        category: r.reportCategory?.name || r.category || r.reportCategory || 'General',
                        description: r.description,
                        coreReport: r.coreReport,
                        useReport: r.useReport,
                        reportParameters: r.reportParameters || [],
                        __raw: r,
                    }))
                    .filter((r) => !!r.name);
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
    const pageItems = useMemo(() => {
        const start = page * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page, limit]);

    const onSort = (key) => {
        if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortDir('asc'); }
    };

    const columns = useMemo(
        () => [
            { key: 'name', header: 'Name', sortable: true, render: (r) => r.name },
            {
                key: 'type',
                header: 'Type',
                sortable: true,
                render: (r) => {
                    const t = (r.type || '').toLowerCase();
                    const tone = /pentaho/.test(t) ? 'purple' : /table|stretchy/.test(t) ? 'blue' : 'gray';
                    return <Badge tone={tone}>{r.type}</Badge>;
                },
            },
            {
                key: 'category',
                header: 'Category',
                sortable: true,
                render: (r) => <Badge tone="slate">{r.category || 'General'}</Badge>,
            },
        ],
        []
    );

    const onRowClick = (row) => {
        if (!row?.id) {
            console.warn('Selected report has no id', row);
            return;
        }
        navigate(`/reports/${encodeURIComponent(row.id)}`, {
            state: { report: row },
        });
    };

    const clearFilters = () => {
        setSearch(''); setTypeFilter(''); setCategoryFilter(''); setPage(0);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Reports</h1>
            </div>

            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Report name / type / category"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
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
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {categoryOptions.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Rows</label>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
                            className="border rounded p-1 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <DataTable
                    columns={columns}
                    data={pageItems}
                    loading={loading}
                    total={total}
                    page={page}
                    limit={limit}
                    onPageChange={setPage}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    onRowClick={onRowClick}
                    emptyMessage="No reports found"
                />
            </Card>
        </div>
    );
};

export default Reports;
