import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const Clients = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // data & ui state
    const [clients, setClients] = useState([]);
    const [total, setTotal] = useState(0);
    const [offices, setOffices] = useState([]);

    // filters / query
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);
    const [status, setStatus] = useState(''); // '' | 'active' | 'pending'
    const [officeId, setOfficeId] = useState('');
    const [fromDate, setFromDate] = useState(''); // yyyy-MM-dd
    const [toDate, setToDate] = useState('');

    // sorting
    const [sortBy, setSortBy] = useState('id'); // id | displayName | officeId
    const [sortDir, setSortDir] = useState('asc'); // asc | desc

    // pagination
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // loading & error
    const [loading, setLoading] = useState(false);

    // fetch offices for filter
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/offices');
                if (!cancelled) setOffices(Array.isArray(res.data) ? res.data : []);
            } catch {
                /* ignore */
            }
        })();
        return () => (cancelled = true);
    }, []);

    // fetch clients per query state
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const params = {
                    offset: page * limit,
                    limit,
                };
                if (debouncedSearch) params.search = debouncedSearch; // if backend supports
                if (status) params.status = status; // 'active' | 'pending'
                if (officeId) params.officeId = officeId;
                // date created window (if supported). Fineract usually needs dateFormat/locale
                if (fromDate || toDate) {
                    params.dateFormat = 'yyyy-MM-dd';
                    params.locale = 'en';
                    if (fromDate) params.fromDate = fromDate;
                    if (toDate) params.toDate = toDate;
                }
                // server-side sorting if supported (Fineract commonly uses orderBy/sortOrder)
                if (sortBy) params.orderBy = sortBy;
                if (sortDir) params.sortOrder = sortDir;

                const res = await api.get('/clients', { params });
                // If Fineract returns paged data differently, adjust here.
                const items = Array.isArray(res.data) ? res.data : res.data?.pageItems || res.data?.clients || [];
                const totalFiltered = res.data?.totalFilteredRecords ?? res.data?.totalFiltered ?? res.data?.totalRecords ?? items.length;

                if (cancelled) return;
                setClients(items);
                setTotal(totalFiltered);
            } catch (e) {
                if (!cancelled) {
                    setClients([]);
                    setTotal(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => (cancelled = true);
    }, [debouncedSearch, status, officeId, fromDate, toDate, page, limit, sortBy, sortDir]);

    const columns = useMemo(
        () => [
            {
                key: 'id',
                header: 'Client #',
                sortable: true,
                render: (row) => row.id,
            },
            {
                key: 'displayName',
                header: 'Name',
                sortable: true,
                render: (row) => row.displayName || `${row.firstname ?? ''} ${row.lastname ?? ''}`.trim(),
            },
            {
                key: 'officeName',
                header: 'Office',
                sortable: true,
                render: (row) => row.officeName || row.officeId || '-',
            },
            {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (row) => <Badge tone={row.status?.active ? 'green' : 'yellow'}>
                    {row.status?.value || (row.status?.active ? 'Active' : 'Pending')}
                </Badge>,
            },
            {
                key: 'mobileNo',
                header: 'Mobile',
                sortable: false,
                render: (row) => row.mobileNo || '-',
            },
            {
                key: 'externalId',
                header: 'External ID',
                sortable: false,
                render: (row) => row.externalId || '-',
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

    const onRowClick = (row) => {
        navigate(`/clients/${row.id}`);
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setOfficeId('');
        setFromDate('');
        setToDate('');
        setPage(0);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Clients</h1>
                <div className="space-x-2">
                    <Button onClick={() => navigate('/clients/new')}>New Client</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name, external ID, mobile..."
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
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Office</label>
                        <select
                            value={officeId}
                            onChange={(e) => setOfficeId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {offices.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Created From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Created To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="space-x-2">
                        <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                    </div>
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
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
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
        </div>
    );
};

export default Clients;
