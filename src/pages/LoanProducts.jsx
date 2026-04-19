import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const LoanProducts = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);

    const [currency, setCurrency] = useState('');
    const [status, setStatus] = useState('');

    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/loanproducts');
            const items = Array.isArray(res.data) ? res.data : res.data?.pageItems || [];
            setProducts(items);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const deleteProduct = async (product) => {
        const productId = product?.id;
        const productName = product?.name || productId || 'this loan product';
        if (!productId) return;
        if (!window.confirm(`Delete ${productName}?`)) return;
        try {
            await api.delete(`/loanproducts/${productId}`);
            addToast('Loan product deleted', 'success');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Delete failed';
            addToast(msg, 'error');
        }
    };

    const currencies = useMemo(() => {
        const set = new Set(products.map((p) => p.currency?.code || p.currencyCode).filter(Boolean));
        return Array.from(set);
    }, [products]);

    const filtered = useMemo(() => {
        return products.filter((p) => {
            const cur = p.currency?.code || p.currencyCode;
            const active = p.active ?? p.status?.active ?? true;
            if (currency && cur !== currency) return false;
            if (status === 'active' && !active) return false;
            if (status === 'inactive' && active) return false;
            return true;
        });
    }, [products, currency, status]);

    const sorted = useMemo(() => {
        const list = [...filtered];
        const valueOf = (p, key) => {
            if (key === 'name') return p.name || '';
            if (key === 'currency') return p.currency?.code || p.currencyCode || '';
            if (key === 'minPrincipal') return Number(p.minPrincipal || p.principal?.minimum || 0);
            if (key === 'maxPrincipal') return Number(p.maxPrincipal || p.principal?.maximum || 0);
            if (key === 'interestRatePerPeriod') return Number(p.interestRatePerPeriod || p.interestRate || 0);
            if (key === 'status') return (p.active ?? p.status?.active ?? true) ? 'active' : 'inactive';
            return p[key] ?? '';
        };

        list.sort((a, b) => {
            const av = valueOf(a, sortBy);
            const bv = valueOf(b, sortBy);
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            const cmp = String(av).localeCompare(String(bv));
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return list;
    }, [filtered, sortBy, sortDir]);

    const paged = useMemo(() => {
        const start = page * limit;
        return sorted.slice(start, start + limit);
    }, [sorted, page, limit]);

    useEffect(() => {
        setPage(0);
    }, [currency, status, limit]);

    const columns = useMemo(
        () => [
            {
                key: 'name',
                header: 'Product',
                sortable: true,
                render: (p) => (
                    <div>
                        <div className="font-semibold">{p.name || '-'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">ID: {p.id}</div>
                    </div>
                ),
            },
            {
                key: 'currency',
                header: 'Currency',
                sortable: true,
                render: (p) => p.currency?.code || p.currencyCode || '-',
            },
            {
                key: 'minPrincipal',
                header: 'Min Principal',
                sortable: true,
                render: (p) => p.minPrincipal || p.principal?.minimum || '-',
            },
            {
                key: 'maxPrincipal',
                header: 'Max Principal',
                sortable: true,
                render: (p) => p.maxPrincipal || p.principal?.maximum || '-',
            },
            {
                key: 'interestRatePerPeriod',
                header: 'Interest / Period',
                sortable: true,
                render: (p) => p.interestRatePerPeriod || p.interestRate || '-',
            },
            {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (p) => {
                    const active = p.active ?? p.status?.active ?? true;
                    return <Badge tone={active ? 'green' : 'yellow'}>{active ? 'Active' : 'Inactive'}</Badge>;
                },
            },
            {
                key: 'actions',
                header: 'Actions',
                sortable: false,
                render: (p) => (
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/loan-products/${p.id}`);
                            }}
                        >
                            View
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/loan-products/${p.id}/edit`);
                            }}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteProduct(p);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [navigate]
    );

    const onSort = (key) => {
        if (!key || key === 'actions') return;
        if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Loan Products</h1>
                <div className="space-x-2">
                    <Button onClick={() => navigate('/loan-products/new')}>New Product</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => {
                                setCurrency(e.target.value);
                                setPage(0);
                            }}
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {currencies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(0);
                            }}
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rows</label>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(0);
                            }}
                            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <DataTable
                    columns={columns}
                    data={paged}
                    loading={loading}
                    total={sorted.length}
                    page={page}
                    limit={limit}
                    onPageChange={setPage}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    onRowClick={(row) => navigate(`/loan-products/${row.id}`)}
                    emptyMessage="No products found"
                />
            </Card>
        </div>
    );
};

export default LoanProducts;
