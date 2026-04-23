import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import { listOpsResources } from '../../../api/gateway/opsResources';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const fullName = (customer) => {
  const first = String(customer?.profile?.firstName || '').trim();
  const last = String(customer?.profile?.lastName || '').trim();
  return [first, last].filter(Boolean).join(' ');
};

const MerchantCustomers = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [total, setTotal] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await listOpsResources('customers', {
          q: search || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setRows(items.map((item) => ({ ...item, id: item?.gatewayCustomerId || item?.platformCustomerId || item?.id })));
        setTotal(Number(response?.total || items.length || 0));
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(e?.response?.data?.message || e?.message || 'Failed to load customers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [search, page, limit, sortBy, sortDir, refreshTick]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const columns = useMemo(() => [
    {
      key: 'profile',
      header: 'Customer',
      sortable: false,
      render: (row) => {
        const name = fullName(row);
        const id = row?.gatewayCustomerId || row?.platformCustomerId || '-';
        return (
          <div className="min-w-[180px]">
            <div className="font-medium text-slate-900 dark:text-slate-50">{name || row?.username || '-'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{id}</div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      render: (row) => row?.profile?.phone || '-',
    },
    {
      key: 'category',
      header: 'Category',
      sortable: false,
      render: (row) => row?.profile?.customerCategory || row?.profile?.category || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => row?.createdAt || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => {
        const customerId = row?.gatewayCustomerId || row?.platformCustomerId || row?.id;
        return (
          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
            <Link to={`/gateway/merchant/customers/${encodeURIComponent(customerId)}`}>
              <Button size="sm" variant="ghost" className="px-2" title="Open">
                <Eye size={16} />
              </Button>
            </Link>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchant Customers</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Manage vehicles and merchant credit accounts for gateway customers.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>Refresh</Button>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              placeholder="Customer id, name, phone..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div />
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }}
              className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={(row) => {
            const customerId = row?.gatewayCustomerId || row?.platformCustomerId || row?.id;
            if (customerId) navigate(`/gateway/merchant/customers/${encodeURIComponent(customerId)}`);
          }}
          emptyMessage="No customers found"
        />
      </Card>
    </div>
  );
};

export default MerchantCustomers;
