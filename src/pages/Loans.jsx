import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'submittedandpendingapproval', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'active', label: 'Active (Disbursed)' },
    { value: 'closed', label: 'Closed' },
];

const Loans = () => {
    const navigate = useNavigate();

    // data
    const [loans, setLoans] = useState([]);
    const [total, setTotal] = useState(0);
    const [products, setProducts] = useState([]);

    // filters
    const [search, setSearch] = useState('');              // free text (client/product name where supported)
    const debouncedSearch = useDebouncedValue(search, 450);
    const [status, setStatus] = useState('');              // matches backend status code where supported
    const [productId, setProductId] = useState('');        // product filter
    const [clientId, setClientId] = useState('');          // optional numeric filter

    // sorting
    const [sortBy, setSortBy] = useState('id');            // id | clientName | loanProductName | principal
    const [sortDir, setSortDir] = useState('desc');        // asc | desc

    // pagination
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // loading
    const [loading, setLoading] = useState(false);

    // Load loan products for filter
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/loanproducts');
                if (!cancelled) {
                    const items = Array.isArray(res.data) ? res.data : res.data?.pageItems || [];
                    setProducts(items);
                }
            } catch {
                if (!cancelled) setProducts([]);
            }
        })();
        return () => (cancelled = true);
    }, []);

    // Load loans whenever query changes
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const params = {
                    offset: page * limit,
                    limit,
                    // Fineract commonly supports orderBy/sortOrder
                    orderBy: sortBy,
                    sortOrder: sortDir,
                };
                if (debouncedSearch) params.search = debouncedSearch; // backend support varies
                if (status) params.status = status;                   // e.g., 'active', 'approved', etc.
                if (productId) params.productId = productId;
                if (clientId) params.clientId = clientId;

                const res = await api.get('/loans', { params });
                const items = Array.isArray(res.data)
                    ? res.data
                    : res.data?.pageItems || res.data?.loans || [];
                const totalFiltered =
                    res.data?.totalFilteredRecords ??
                    res.data?.totalFiltered ??
                    res.data?.totalRecords ??
                    items.length;

                if (cancelled) return;
                setLoans(items);
                setTotal(totalFiltered);
            } catch {
                if (!cancelled) {
                    setLoans([]);
                    setTotal(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => (cancelled = true);
    }, [debouncedSearch, status, productId, clientId, page, limit, sortBy, sortDir]);

    const columns = useMemo(
        () => [
            { key: 'id', header: 'Loan #', sortable: true, render: (r) => r.id },
            {
                key: 'clientName',
                header: 'Client',
                sortable: true,
                render: (r) => r.clientName || r.clientId || '-',
            },
            {
                key: 'loanProductName',
                header: 'Product',
                sortable: true,
                render: (r) => r.loanProductName || r.productName || '-',
            },
            {
                key: 'principal',
                header: 'Principal',
                sortable: true,
                render: (r) => r.principal || r.approvedPrincipal || r.proposedPrincipal || '-',
            },
            {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (r) => {
                    const code = r.status?.code || r.status?.value || '';
                    let tone = 'gray';
                    if (/approved/i.test(code)) tone = 'blue';
                    if (/active|disbursed/i.test(code)) tone = 'green';
                    if (/submitted|pending/i.test(code)) tone = 'yellow';
                    if (/closed|writtenoff/i.test(code)) tone = 'gray';
                    return <Badge tone={tone}>{r.status?.value || code || '-'}</Badge>;
                },
            },
        ],
        []
    );

    const onSort = (key) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const onRowClick = (row) => navigate(`/loans/${row.id}`);

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setProductId('');
        setClientId('');
        setPage(0);
    };

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/40 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Credit Operations</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Loans</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track disbursements, status, and product-level credit activity.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-center dark:border-slate-700/70 dark:bg-slate-900/60">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Results</div>
                            <div className="text-base font-semibold">{total}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-center dark:border-slate-700/70 dark:bg-slate-900/60">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
                            <div className="text-base font-semibold">{page + 1}</div>
                        </div>
                        <Button onClick={() => navigate('/loans/apply')}>Apply for Loan</Button>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <Card>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Client/Product/Loan #"
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product</label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Client ID</label>
                        <input
                            type="number"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="e.g. 15"
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
                        Clear
                    </Button>
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(0);
                            }}
                            className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                <DataTable
                    columns={columns}
                    data={loans}
                    loading={loading}
                    total={total}
                    page={page}
                    limit={limit}
                    onPageChange={setPage}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    onRowClick={onRowClick}
                    emptyMessage="No loans found"
                />
            </Card>
        </div>
    );
};

export default Loans;
