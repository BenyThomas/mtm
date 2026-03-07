import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import ClientCommandModal from '../../components/ClientCommandModal';
import { Plus, RefreshCcw, Eye, Pencil, Bolt, XCircle } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const statusTone = (s) => {
    const code = (s?.code || s?.value || s || '').toString();
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted/i.test(code)) return 'yellow';
    if (/closed|dormant|inactiv/i.test(code)) return 'gray';
    return 'gray';
};

const normalizeOffices = (arr) =>
    Array.isArray(arr) ? arr.map((o) => ({ id: o.id, name: o.name })) : [];

// Typical Fineract client status filters
const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
];

const Clients = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // data
    const [clients, setClients] = useState([]);
    const [total, setTotal] = useState(0);
    const [offices, setOffices] = useState([]);

    // filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);
    const [status, setStatus] = useState('');
    const [officeId, setOfficeId] = useState('');

    // sorting
    const [sortBy, setSortBy] = useState('id');    // id | displayName | officeName | accountNo
    const [sortDir, setSortDir] = useState('desc'); // asc | desc

    // pagination
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // loading
    const [loading, setLoading] = useState(false);

    // command modal
    const [commandClient, setCommandClient] = useState(null);

    // refresh nonce (forces reload)
    const [refreshNonce, setRefreshNonce] = useState(0);

    // load offices for filter
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await api.get('/offices');
                if (!cancelled) setOffices(normalizeOffices(r?.data || []));
            } catch {
                if (!cancelled) setOffices([]);
            }
        })();
        return () => (cancelled = true);
    }, []);

    // load clients whenever query changes
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
                };
                if (debouncedSearch) params.search = debouncedSearch; // backend support varies
                if (status) params.status = status;                   // e.g., 'active' | 'pending' | 'closed'
                if (officeId) params.officeId = officeId;

                const r = await api.get('/clients', { params });
                const pageItems = Array.isArray(r?.data?.pageItems)
                    ? r.data.pageItems
                    : Array.isArray(r?.data)
                        ? r.data
                        : [];
                const totalFiltered =
                    r?.data?.totalFilteredRecords ??
                    r?.data?.totalElements ??
                    r?.data?.totalRecords ??
                    pageItems.length;

                if (cancelled) return;
                setClients(pageItems);
                setTotal(Number(totalFiltered) || 0);
            } catch (e) {
                if (!cancelled) {
                    setClients([]);
                    setTotal(0);
                    addToast(e?.response?.data?.defaultUserMessage || 'Failed to load clients', 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => (cancelled = true);
    }, [debouncedSearch, status, officeId, page, limit, sortBy, sortDir, refreshNonce, addToast]);

    // columns
    const columns = useMemo(
        () => [
            { key: 'id', header: 'Client #', sortable: true, render: (r) => r.id },
            {
                key: 'displayName',
                header: 'Name',
                sortable: true,
                render: (r) => r.displayName || [r.firstname, r.lastname].filter(Boolean).join(' ') || '—',
            },
            {
                key: 'officeName',
                header: 'Office',
                sortable: true,
                render: (r) => r.officeName || '—',
            },
            {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (r) => (
                    <Badge tone={statusTone(r.status)}>
                        {r.status?.value || r.status?.code || '—'}
                    </Badge>
                ),
            },
            {
                key: 'accountNo',
                header: 'Account #',
                sortable: true,
                render: (r) => r.accountNo || '—',
            },
            {
                key: 'externalId',
                header: 'External ID',
                sortable: true,
                render: (r) => r.externalId || '—',
            },
            {
                key: 'actions',
                header: '',
                sortable: false,
                width: 140,
                render: (r) => (
                    <div className="flex items-center gap-2 justify-end">
                        <Button
                            variant="secondary"
                            className="p-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${r.id}`);
                            }}
                            title="View"
                            aria-label="View"
                        >
                            <Eye className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="secondary"
                            className="p-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${r.id}/edit`);
                            }}
                            title="Edit"
                            aria-label="Edit"
                        >
                            <Pencil className="w-5 h-5" />
                        </Button>
                        <Button
                            className="p-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCommandClient(r);
                            }}
                            title="Actions"
                            aria-label="Actions"
                        >
                            <Bolt className="w-5 h-5" />
                        </Button>
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

    const onRowClick = (row) => navigate(`/clients/${row.id}`);

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setOfficeId('');
        setPage(0);
    };

    const refresh = () => setRefreshNonce((n) => n + 1);

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/40 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Customer Management</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Clients</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Browse, filter, and manage client lifecycle actions.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Rows</div>
                            <div className="text-base font-semibold">{clients.length}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
                            <div className="text-base font-semibold">{total}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
                            <div className="text-base font-semibold">{page + 1}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <Card>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    {/* Left: filters */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-1">
                        {/* Search */}
                        <div className="xl:flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
                            <input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                                placeholder="Name / Account # / External ID / Office"
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        {/* Status */}
                        <div className="xl:w-56">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(0);
                                }}
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Office */}
                        <div className="xl:w-56">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Office</label>
                            <select
                                value={officeId}
                                onChange={(e) => {
                                    setOfficeId(e.target.value);
                                    setPage(0);
                                }}
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {offices.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Rows per page */}
                        <div className="xl:w-40">
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
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-end gap-2 xl:ml-4">
                        {/* Clear */}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={clearFilters}
                            title="Clear filters"
                            aria-label="Clear filters"
                            className="!h-10 !w-10 !p-0"
                        >
                            <XCircle className="w-5 h-5"/>
                        </Button>

                        {/* Refresh */}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={refresh}
                            title="Refresh"
                            aria-label="Refresh"
                            className="!h-10 !w-10 !p-0"
                        >
                            <RefreshCcw className="w-5 h-5"/>
                        </Button>

                        {/* New client */}
                        <Button
                            type="button"
                            onClick={() => navigate('/clients/new')}
                            title="New client"
                            aria-label="New client"
                            className="!h-10 !w-10 !p-0"
                        >
                            <Plus className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>
            </Card>


            {/* Table */}
            <Card>
                <DataTable
                    columns={columns}
                    data={clients}
                    loading={loading}
                    total={total}
                    page={page}
                    limit={limit}
                    onPageChange={setPage}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    onRowClick={onRowClick}
                    emptyMessage="No clients found"
                />
            </Card>

            {/* Command modal */}
            <ClientCommandModal
                open={!!commandClient}
                client={commandClient}
                onClose={() => setCommandClient(null)}
                onDone={() => {
                    setCommandClient(null);
                    // hard refresh current query set
                    setRefreshNonce((n) => n + 1);
                }}
            />
        </div>
    );
};

export default Clients;
