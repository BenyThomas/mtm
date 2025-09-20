import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { Wrench, Plus, RefreshCw, XCircle } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'submittedandpendingapproval', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'active', label: 'Active (Disbursed)' },
    { value: 'closed', label: 'Closed' },
];

const toneForStatus = (codeLike) => {
    const code = codeLike || '';
    if (/approved/i.test(code)) return 'blue';
    if (/active|disbursed/i.test(code)) return 'green';
    if (/submitted|pending/i.test(code)) return 'yellow';
    if (/closed|writtenoff|overpaid/i.test(code)) return 'gray';
    return 'gray';
};

const LoanTab = ({ clientId }) => {
    const navigate = useNavigate();

    // data
    const [loans, setLoans] = useState([]);
    const [total, setTotal] = useState(0);
    const [products, setProducts] = useState([]);

    // filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);
    const [status, setStatus] = useState('');
    const [productId, setProductId] = useState('');

    // sorting
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('desc');

    // pagination
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // loading
    const [loading, setLoading] = useState(false);

    // refresh nonce
    const [nonce, setNonce] = useState(0);

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

    // Load loans for this client
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const params = {
                    offset: page * limit,
                    limit,
                    orderBy: sortBy,
                    sortOrder: sortDir,
                    clientId, // <— key scope
                };
                if (debouncedSearch) params.search = debouncedSearch;
                if (status) params.status = status;
                if (productId) params.productId = productId;

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
        if (clientId) load();
        return () => (cancelled = true);
    }, [clientId, debouncedSearch, status, productId, page, limit, sortBy, sortDir, nonce]);

    const columns = useMemo(
        () => [
            { key: 'id', header: 'Loan #', sortable: true, render: (r) => r.id },
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
                    return <Badge tone={toneForStatus(code)}>{r.status?.value || code || '-'}</Badge>;
                },
            },
            {
                key: 'actions',
                header: '',
                sortable: false,
                render: (r) => (
                    <div className="flex items-center justify-end">
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/loans/${r.id}`);
                            }}
                            title="Manage loan"
                            aria-label="Manage loan"
                        >
                            <Wrench size={18} />
                        </button>
                    </div>
                ),
            },
        ],
        [navigate]
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
        setPage(0);
    };

    const refresh = () => setNonce((n) => n + 1);
    const createLoan = () => navigate(`/loans/apply?clientId=${encodeURIComponent(clientId)}`);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Product/Loan #"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Product</label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Actions cluster (icons with hover titles) */}
                    <div className="flex items-end justify-start gap-2">
                        <button
                            type="button"
                            className="p-2 rounded-md border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={clearFilters}
                            title="Clear filters"
                            aria-label="Clear filters"
                        >
                            <XCircle size={18} />
                        </button>
                        <button
                            type="button"
                            className="p-2 rounded-md border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={refresh}
                            title="Refresh"
                            aria-label="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            type="button"
                            className="p-2 rounded-md border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={createLoan}
                            title="New loan"
                            aria-label="New loan"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <div />
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Rows</label>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(0);
                            }}
                            className="border rounded p-1 dark:bg-gray-700 dark:border-gray-600"
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
                    emptyMessage="No loans found for this client"
                />
            </Card>
        </div>
    );
};

export default LoanTab;
