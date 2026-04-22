import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import Can from '../../../components/Can';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { deleteGwLoan, listGwArrearsLoans, listGwLoans } from '../../../api/gateway/loans';
import gatewayApi from '../../../api/gatewayAxios';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PENDING_DISBURSEMENT', label: 'Pending Disbursement' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'OVERPAID', label: 'Overpaid' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'UPSTREAM_FAILED', label: 'Failed' },
];

const statusLabel = (value) => {
  const v = String(value || '').toUpperCase();
  if (['SUBMITTED', 'CREATED_IN_FINERACT', 'PENDING', 'PENDING_UPSTREAM'].includes(v)) return 'Pending Approval';
  if (v === 'APPROVED') return 'Pending Disbursement';
  if (v === 'ACTIVE' || v === 'DISBURSED') return 'Active';
  if (v === 'OVERPAID') return 'Overpaid';
  if (v === 'CLOSED') return 'Closed';
  if (v === 'UPSTREAM_FAILED') return 'Failed';
  return value || '-';
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['SUBMITTED', 'CREATED_IN_FINERACT', 'PENDING', 'PENDING_UPSTREAM'].includes(v)) return 'yellow';
  if (v === 'APPROVED') return 'cyan';
  if (v === 'ACTIVE' || v === 'DISBURSED') return 'green';
  if (v === 'OVERDUE') return 'red';
  if (v === 'OVERPAID') return 'emerald';
  if (v === 'CLOSED') return 'gray';
  if (v === 'UPSTREAM_FAILED') return 'red';
  return 'blue';
};

const unwrap = (body) => (body && typeof body === 'object' && 'data' in body ? body.data : body);

const toNumOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const bestEffortTotalRepaymentFromSchedule = (d) => {
  const schedule = d?.repaymentSchedule && typeof d.repaymentSchedule === 'object' ? d.repaymentSchedule : d;
  const periods = Array.isArray(schedule?.periods) ? schedule.periods : [];
  if (!periods.length) return null;

  let total = 0;
  let saw = false;
  for (const p of periods) {
    const periodIdx = toNumOrNull(p?.period);
    if (periodIdx == null || periodIdx <= 0) continue;
    const totalDue =
      toNumOrNull(p?.totalDueForPeriod) ??
      toNumOrNull(p?.totalInstallmentAmountForPeriod) ??
      toNumOrNull(p?.totalInstallmentAmount) ??
      null;
    const principal = toNumOrNull(p?.principalDue) ?? toNumOrNull(p?.principalOriginalDue) ?? 0;
    const interest = toNumOrNull(p?.interestDue) ?? toNumOrNull(p?.interestOriginalDue) ?? 0;
    const fees = toNumOrNull(p?.feeChargesDue) ?? 0;
    const penalty = toNumOrNull(p?.penaltyChargesDue) ?? 0;
    const v = totalDue != null ? totalDue : principal + interest + fees + penalty;
    total += v;
    saw = true;
  }
  return saw ? total : null;
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

async function poolMap(items, concurrency, fn) {
  const q = Array.isArray(items) ? items.slice() : [];
  const out = [];
  const workers = new Array(Math.max(1, Math.min(concurrency || 1, q.length || 1))).fill(0).map(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const item = q.shift();
      if (item === undefined) return;
      out.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return out;
}

const GwLoansList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [customerNameById, setCustomerNameById] = useState({});
  const [customerPhoneById, setCustomerPhoneById] = useState({});
  const [productNameByCode, setProductNameByCode] = useState({});
  const [totalLoanAmountByPlatformId, setTotalLoanAmountByPlatformId] = useState({});

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productCode, setProductCode] = useState('');

  // sorting
  const [sortBy, setSortBy] = useState('appliedAt'); // appliedAt | principal | status | customerId | productCode
  const [sortDir, setSortDir] = useState('desc'); // asc | desc

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCustomerId('');
    setProductCode('');
    setPage(0);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await gatewayApi.get('/ops/products/snapshots');
        const items = Array.isArray(r?.data) ? r.data : [];
        const next = {};
        for (const p of items) {
          const code = p?.code ? String(p.code) : '';
          if (!code) continue;
          next[code] = String(p?.name || code);
        }
        if (mounted) setProductNameByCode(next);
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const request = {
          q: debouncedSearch || undefined,
          status: status || undefined,
          customerId: customerId || undefined,
          productCode: productCode || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        };
        const data = status === 'OVERDUE'
          ? await listGwArrearsLoans({
            q: request.q,
            customerId: request.customerId,
            productCode: request.productCode,
            offset: request.offset,
            limit: request.limit,
            orderBy: sortBy === 'status' ? 'daysInArrears' : request.orderBy,
            sortOrder: request.sortOrder,
          })
          : await listGwLoans(request);
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((x) => ({ ...x, id: x?.platformLoanId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (e) {
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
  }, [debouncedSearch, status, customerId, productCode, page, limit, sortBy, sortDir, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    const rowByCustomerId = new Map();
    for (const r of rows || []) {
      const id = r?.customerId != null ? String(r.customerId) : '';
      if (!id) continue;
      if (!rowByCustomerId.has(id)) rowByCustomerId.set(id, r);
    }

    const ids = Array.from(new Set((rows || []).map((r) => r?.customerId).filter(Boolean))).filter((rawId) => {
      const id = String(rawId);
      const row = rowByCustomerId.get(id);
      // Prefer backend-enriched fields; only lookup if missing.
      const hasName = !!row?.customerFullName;
      const hasPhone = !!row?.customerPhone;
      const needName = !hasName && !(id in (customerNameById || {})); // "in" checks even if value is null
      const needPhone = !hasPhone && !(id in (customerPhoneById || {}));
      return needName || needPhone;
    });
    if (!ids.length) return () => {};

    (async () => {
      const nameUpdates = {};
      const phoneUpdates = {};
      await poolMap(ids, 6, async (id) => {
        try {
          const r = await gatewayApi.get(`/ops/resources/customers/${encodeURIComponent(String(id))}`);
          const c = unwrap(r?.data);
          const first = String(c?.profile?.firstName || '').trim();
          const last = String(c?.profile?.lastName || '').trim();
          const full = [first, last].filter(Boolean).join(' ');
          nameUpdates[String(id)] = full || String(c?.username || id);
          const phone = String(c?.profile?.phone || '').trim();
          // Important: negative-cache "no phone" to avoid retry loops.
          phoneUpdates[String(id)] = phone || null;
        } catch (_) {
          nameUpdates[String(id)] = String(id);
          // Important: negative-cache failures to avoid retry loops.
          phoneUpdates[String(id)] = null;
        }
      });
      if (cancelled) return;
      setCustomerNameById((prev) => ({ ...(prev || {}), ...nameUpdates }));
      setCustomerPhoneById((prev) => ({ ...(prev || {}), ...phoneUpdates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, customerNameById, customerPhoneById]);

  useEffect(() => {
    let cancelled = false;
    const needs = (rows || [])
      .map((r) => ({
        platformLoanId: r?.platformLoanId ? String(r.platformLoanId) : '',
        fineractLoanId: r?.fineractLoanId ? String(r.fineractLoanId) : '',
      }))
      .filter((x) => x.platformLoanId && x.fineractLoanId)
      .filter((x) => !(x.platformLoanId in (totalLoanAmountByPlatformId || {})));
    if (!needs.length) return () => {};

    (async () => {
      const updates = {};
      await poolMap(needs, 4, async ({ platformLoanId, fineractLoanId }) => {
        try {
          const r = await api.get(`/loans/${encodeURIComponent(String(fineractLoanId))}`, {
            params: { associations: 'repaymentSchedule' },
          });
          const d = r?.data;
          const fromSummary =
            toNumOrNull(d?.summary?.totalExpectedRepayment) ??
            toNumOrNull(d?.summary?.totalRepaymentExpected) ??
            toNumOrNull(d?.summary?.totalRepayment) ??
            null;
          const fromSchedule = bestEffortTotalRepaymentFromSchedule(d);
          const val = fromSummary ?? fromSchedule;
          // Negative-cache "unavailable" to avoid repeated refetches.
          updates[platformLoanId] = val ?? null;
        } catch (_) {
          // Negative-cache failures to avoid retry loops.
          updates[platformLoanId] = null;
        }
      });
      if (cancelled) return;
      setTotalLoanAmountByPlatformId((prev) => ({ ...(prev || {}), ...updates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, totalLoanAmountByPlatformId]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const doDelete = async (row, e) => {
    e?.stopPropagation?.();
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this platform loan record? This cannot be undone.')) return;
    try {
      await deleteGwLoan(row?.platformLoanId);
      addToast('Platform loan deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'customerId',
        header: 'Name',
        sortable: true,
        render: (r) => {
          const id = r?.customerId ? String(r.customerId) : '';
          const name = String(r?.customerFullName || '---');
          const phone = String(r?.customerPhone || '---');
          return (
            <div className="min-w-[160px]">
              <div className="font-medium text-slate-900 dark:text-slate-50">{name || id || '-'}</div>
            </div>
          );
        },
      },
      {
        key: 'customerPhone',
        header: 'Phone',
        sortable: false,
        render: (r) => {
          const id = r?.customerId ? String(r.customerId) : '';
          return String(r?.customerPhone || '') || (id ? customerPhoneById?.[id] : '') || '-';
        },
      },
      {
        key: 'productCode',
        header: 'Loan Product',
        sortable: true,
        render: (r) => {
          const code = r?.productCode ? String(r.productCode) : '';
          const name = code ? productNameByCode?.[code] : '';
          return (
            <div className="min-w-[160px]">
              <div className="font-medium text-slate-900 dark:text-slate-50">{name || code || '-'}</div>
              {code ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{code}</div> : null}
            </div>
          );
        },
      },
      {
        key: 'principal',
        header: 'Principal',
        sortable: true,
        render: (r) => formatMoney(r?.principal),
      },
      {
        key: 'tenureMonths',
        header: 'Tenure',
        sortable: true,
        render: (r) => (r?.tenureMonths ?? '-') + '',
      },
      {
        key: 'totalLoanAmount',
        header: 'Total Loan Amount',
        sortable: false,
        render: (r) => {
          const id = r?.platformLoanId ? String(r.platformLoanId) : '';
          const v = id ? totalLoanAmountByPlatformId?.[id] : null;
          return formatMoney(v);
        },
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => {
          const displayStatus = status === 'OVERDUE' ? 'OVERDUE' : statusLabel(r?.status);
          return <Badge tone={statusTone(displayStatus)}>{displayStatus === 'OVERDUE' ? 'Overdue' : displayStatus}</Badge>;
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Link to={`/gateway/loans/${encodeURIComponent(r?.platformLoanId)}`} title="View">
              <Button size="sm" variant="ghost" className="px-2" aria-label="View">
                <Eye size={16} />
              </Button>
            </Link>
            <Can any={['GW_OPS_WRITE']}>
              <Link to={`/gateway/loans/${encodeURIComponent(r?.platformLoanId)}`} title="Edit">
                <Button size="sm" variant="ghost" className="px-2" aria-label="Edit">
                  <Pencil size={16} />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={(e) => doDelete(r, e)}
                disabled={!r?.platformLoanId}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            </Can>
          </div>
        ),
      },
    ],
    [doDelete, customerNameById, customerPhoneById, productNameByCode, totalLoanAmountByPlatformId]
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
            <h1 className="text-2xl font-bold">Gw Loans</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Platform loan records and workflow</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
              <div className="text-base font-semibold">{page + 1}</div>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Loan id, customer, product, status..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
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
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer ID</label>
            <input
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setPage(0);
              }}
              placeholder="e.g. CUST-001"
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
              placeholder="e.g. CMP-LOAN-01"
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
          emptyMessage="No platform loans found"
        />
      </Card>
    </div>
  );
};

export default GwLoansList;
