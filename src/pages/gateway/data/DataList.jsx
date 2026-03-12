import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { deleteOpsResource, listOpsResources } from '../../../api/gateway/opsResources';
import Can from '../../../components/Can';
import { Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const toneForStatus = (s) => {
  const v = String(s || '').toUpperCase();
  if (v.includes('ACTIVE') || v.includes('APPROVED') || v.includes('ACCEPTED')) return 'green';
  if (v.includes('PENDING') || v.includes('OPEN')) return 'yellow';
  if (v.includes('EXPIRED') || v.includes('REVOK') || v.includes('CANCEL') || v.includes('FAIL')) return 'red';
  return 'gray';
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const units = [
    { s: 60 * 60 * 24 * 365, label: 'y' },
    { s: 60 * 60 * 24 * 30, label: 'mo' },
    { s: 60 * 60 * 24 * 7, label: 'w' },
    { s: 60 * 60 * 24, label: 'd' },
    { s: 60 * 60, label: 'h' },
    { s: 60, label: 'm' },
    { s: 1, label: 's' },
  ];
  for (const u of units) {
    if (diffSec >= u.s) return `${Math.floor(diffSec / u.s)}${u.label} ago`;
  }
  return 'now';
};

const RESOURCES = {
  audit_events: { title: 'Audit Events', apiType: 'audit-events', defaultSortBy: 'occurredAt' },
  auth_accounts: { title: 'Auth Accounts', apiType: 'auth-accounts', defaultSortBy: 'updatedAt' },
  auth_otp_challenges: { title: 'OTP Challenges', apiType: 'auth-otp-challenges', defaultSortBy: 'createdAt' },
  auth_refresh_tokens: { title: 'Refresh Tokens', apiType: 'auth-refresh-tokens', defaultSortBy: 'createdAt' },
  auth_sessions: { title: 'Auth Sessions', apiType: 'auth-sessions', defaultSortBy: 'createdAt' },
  consent_documents: { title: 'Consent Documents', apiType: 'consent-documents', defaultSortBy: 'createdAt' },
  customers: { title: 'Customers', apiType: 'customers', defaultSortBy: 'username' },
  loans: { title: 'Platform Loans', apiType: 'loans', defaultSortBy: 'appliedAt' },
  onboarding_records: { title: 'Onboarding Records', apiType: 'onboarding-records', defaultSortBy: 'updatedAt' },
  product_snapshots: { title: 'Product Snapshots', apiType: 'product-snapshots', defaultSortBy: 'updatedAt' },
  products: { title: 'Products', apiType: 'products', defaultSortBy: 'productCode' },
  prospects: { title: 'Prospects', apiType: 'prospects', defaultSortBy: 'createdAt' },
  schedule_preview_cache: { title: 'Schedule Preview Cache', apiType: 'schedule-preview-cache', defaultSortBy: 'createdAt' },
};

const DataList = () => {
  const { resource } = useParams();
  const cfg = RESOURCES[resource];
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');

  // sorting
  const [sortBy, setSortBy] = useState(cfg?.defaultSortBy || 'createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!cfg) return;
    setSortBy(cfg.defaultSortBy || 'createdAt');
    setSortDir('desc');
    setSearch('');
    setStatus('');
    setPage(0);
  }, [cfg?.apiType]);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listOpsResources(cfg.apiType, {
          q: debouncedSearch || undefined,
          status: status || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((x, idx) => ({ ...x, id: x?.id ?? x?.cacheKey ?? x?.productCode ?? x?.auditEventId ?? x?.userId ?? x?.sessionId ?? x?.tokenId ?? x?.otpRef ?? x?.documentId ?? x?.platformCustomerId ?? x?.platformLoanId ?? x?.onboardingId ?? x?.prospectId ?? idx })));
        setTotal(Number(data?.total || items.length || 0));
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg?.apiType, debouncedSearch, status, page, limit, sortBy, sortDir, refreshTick]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(0);
  };

  const doDelete = async (row, e) => {
    e?.stopPropagation?.();
    if (!cfg) return;
    const id =
      row?.auditEventId ||
      row?.userId ||
      row?.otpRef ||
      row?.tokenId ||
      row?.sessionId ||
      row?.documentId ||
      row?.platformCustomerId ||
      row?.platformLoanId ||
      row?.onboardingId ||
      row?.prospectId ||
      row?.id ||
      row?.cacheKey ||
      row?.productCode;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteOpsResource(cfg.apiType, id);
      addToast('Deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const columns = useMemo(() => {
    if (!cfg) return [];

    // Common "best effort" columns across resources.
    // Sorting keys should match backend sortFields configured in OpsResourceRegistry.
    const base = [];
    base.push({
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (r) => r?.auditEventId || r?.userId || r?.otpRef || r?.tokenId || r?.sessionId || r?.documentId || r?.platformCustomerId || r?.platformLoanId || r?.onboardingId || r?.prospectId || r?.cacheKey || r?.id || r?.productCode || '-',
    });

    // A couple of type-specific "headline" columns
    if (cfg.apiType === 'customers') {
      base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
      base.push({ key: 'fineractClientId', header: 'Fineract Client', sortable: true, render: (r) => r?.fineractClientId || '-' });
    }
    if (cfg.apiType === 'auth-accounts') {
      base.push({ key: 'msisdn', header: 'MSISDN', sortable: true, render: (r) => r?.msisdn || '-' });
      base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
    }
    if (cfg.apiType === 'prospects') {
      base.push({ key: 'phone', header: 'Phone', sortable: true, render: (r) => r?.phone || '-' });
      base.push({ key: 'kycStatus', header: 'KYC', sortable: false, render: (r) => r?.kycStatus || '-' });
    }
    if (cfg.apiType === 'loans') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerId || '-' });
      base.push({ key: 'productCode', header: 'Product', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'principal', header: 'Principal', sortable: true, render: (r) => r?.principal ?? '-' });
    }
    if (cfg.apiType === 'onboarding-records') {
      base.push({ key: 'mobileNo', header: 'Mobile', sortable: true, render: (r) => r?.mobileNo || '-' });
      base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
      base.push({ key: 'onboardingState', header: 'State', sortable: true, render: (r) => r?.onboardingState || '-' });
    }
    if (cfg.apiType === 'product-snapshots') {
      base.push({ key: 'code', header: 'Code', sortable: true, render: (r) => r?.code || '-' });
      base.push({ key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' });
      base.push({ key: 'digitalEnabled', header: 'Digital', sortable: false, render: (r) => (r?.digitalEnabled ? 'Yes' : 'No') });
    }
    if (cfg.apiType === 'products') {
      base.push({ key: 'productCode', header: 'Code', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' });
      base.push({ key: 'fineractProductId', header: 'Fineract ID', sortable: true, render: (r) => r?.fineractProductId ?? '-' });
    }
    if (cfg.apiType === 'audit-events') {
      base.push({ key: 'action', header: 'Action', sortable: true, render: (r) => r?.action || '-' });
      base.push({ key: 'actorId', header: 'Actor', sortable: true, render: (r) => r?.actorId || '-' });
      base.push({ key: 'occurredAt', header: 'Occurred', sortable: true, render: (r) => r?.occurredAt || '-' });
    }
    if (cfg.apiType === 'schedule-preview-cache') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerId || '-' });
      base.push({ key: 'productCode', header: 'Product', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'createdAt', header: 'Created', sortable: true, render: (r) => (r?.createdAt ? timeAgo(r.createdAt) : '-') });
      base.push({ key: 'expiresAt', header: 'Expires', sortable: true, render: (r) => (r?.expiresAt ? String(r.expiresAt) : '-') });
    }

    // Status-like column if present
    base.push({
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => {
        const s = r?.status || r?.onboardingState || '';
        return s ? <Badge tone={toneForStatus(s)}>{s}</Badge> : '-';
      },
    });

    base.push({
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (r) => timeAgo(r?.updatedAt || r?.createdAt || r?.occurredAt),
    });

    base.push({
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Can any={['GW_OPS_WRITE']}>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              onClick={(e) => doDelete(r, e)}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 size={16} />
            </Button>
          </Can>
        </div>
      ),
    });

    return base;
  }, [cfg?.apiType]);

  const onRowClick = (row) => {
    if (!cfg) return;
    const id =
      row?.auditEventId ||
      row?.userId ||
      row?.otpRef ||
      row?.tokenId ||
      row?.sessionId ||
      row?.documentId ||
      row?.platformCustomerId ||
      row?.platformLoanId ||
      row?.onboardingId ||
      row?.prospectId ||
      row?.cacheKey ||
      row?.id ||
      row?.productCode;
    navigate(`/gateway/resources/${encodeURIComponent(cfg.apiType)}/${encodeURIComponent(String(id))}`);
  };

  if (!cfg) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Unknown Resource</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Resource <code>{resource}</code> is not configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{cfg.title}</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Gateway data back-office</div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
            <div className="text-base font-semibold">{page + 1}</div>
          </div>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </label>
            <input
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              placeholder="optional"
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
          emptyMessage="No records found"
        />
      </Card>
    </div>
  );
};

export default DataList;

