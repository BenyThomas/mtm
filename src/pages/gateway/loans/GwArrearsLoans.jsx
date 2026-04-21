import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { listGwArrearsLoans } from '../../../api/gateway/loans';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const toNumOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatMoney = (v) => {
  const n = toNumOrNull(v);
  if (n == null) return '-';
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(`${String(value).trim()}T00:00:00`));
  } catch {
    return String(value);
  }
};

const statusTone = (value) => {
  const v = String(value || '').toUpperCase();
  if (v.includes('OVERDUE')) return 'red';
  if (v.includes('ACTIVE')) return 'blue';
  if (v.includes('APPROVED')) return 'green';
  return 'yellow';
};

const GwArrearsLoans = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [customerId, setCustomerId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [sortBy, setSortBy] = useState('daysInArrears');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const clearFilters = () => {
    setSearch('');
    setCustomerId('');
    setProductCode('');
    setSortBy('daysInArrears');
    setSortDir('desc');
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listGwArrearsLoans({
          q: debouncedSearch || undefined,
          customerId: customerId || undefined,
          productCode: productCode || undefined,
          orderBy: sortBy,
          sortOrder: sortDir,
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((item) => ({ ...item, id: item?.platformLoanId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (_) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, customerId, productCode, sortBy, sortDir, page, limit]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'nextDueDate' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const columns = useMemo(
    () => [
      {
        key: 'customerId',
        header: 'Name',
        sortable: true,
        render: (r) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-slate-900 dark:text-slate-50">{r?.customerFullName || r?.customerId || '-'}</div>
          </div>
        ),
      },
      {
        key: 'customerPhone',
        header: 'Phone',
        sortable: false,
        render: (r) => r?.customerPhone || '-',
      },
      {
        key: 'productCode',
        header: 'Product',
        sortable: false,
        render: (r) => r?.productCode || '-',
      },
      {
        key: 'daysInArrears',
        header: 'Days In Arrears',
        sortable: true,
        render: (r) => String(r?.daysInArrears ?? '-'),
      },
      {
        key: 'overdueAmount',
        header: 'Overdue Amount',
        sortable: true,
        render: (r) => formatMoney(r?.overdueAmount),
      },
      {
        key: 'nextDueDate',
        header: 'Due Date',
        sortable: true,
        render: (r) => formatDate(r?.nextDueDate),
      },
      {
        key: 'fineractStatusText',
        header: 'Fineract Status',
        sortable: false,
        render: (r) => <Badge tone={statusTone(r?.fineractStatusText)}>{r?.fineractStatusText || r?.status || '-'}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Link to={`/gateway/loans/${encodeURIComponent(r?.platformLoanId || '')}`} title="View">
              <Button size="sm" variant="ghost" className="px-2" aria-label="View">
                <Eye size={16} />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const onRowClick = (row) => {
    if (!row?.platformLoanId) return;
    navigate(`/gateway/loans/${encodeURIComponent(row.platformLoanId)}`);
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Arrears Loans</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Loans currently in arrears based on Fineract overdue state.</div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
            <div className="text-base font-semibold">{page + 1}</div>
          </div>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer, phone, product, loan id..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer ID</label>
            <input
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product Code</label>
            <input
              value={productCode}
              onChange={(e) => {
                setProductCode(e.target.value);
                setPage(0);
              }}
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
          onRowClick={onRowClick}
          emptyMessage="No arrears loans found"
        />
      </Card>
    </div>
  );
};

export default GwArrearsLoans;
