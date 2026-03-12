import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import Can from '../../../components/Can';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { listInvites, deleteInvite } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'OPENED', label: 'Opened' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (v === 'ACCEPTED') return 'green';
  if (v === 'OPENED') return 'yellow';
  if (v === 'EXPIRED') return 'red';
  if (v === 'CREATED') return 'blue';
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

const renderName = (it) => {
  const fn = (it?.prefill?.firstName || '').trim();
  const ln = (it?.prefill?.lastName || '').trim();
  const full = `${fn} ${ln}`.trim();
  return full || '-';
};

const InvitesList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [invites, setInvites] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');

  // sorting
  const [sortBy, setSortBy] = useState('createdAt'); // createdAt | campaignCode | referrerId | phone | uses | status
  const [sortDir, setSortDir] = useState('desc'); // asc | desc

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listInvites({
          q: debouncedSearch || undefined,
          status: status || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setInvites(items.map((x) => ({ ...x, id: x?.inviteId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (e) {
        if (!cancelled) {
          setInvites([]);
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
  }, [debouncedSearch, status, page, limit, sortBy, sortDir, refreshTick]);

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
    if (!window.confirm('Delete this invite? This cannot be undone.')) return;
    try {
      await deleteInvite(row?.inviteId);
      addToast('Invite deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'referrerId',
        header: 'Agent',
        sortable: true,
        render: (r) => r.referrerId || '-',
      },
      {
        key: 'campaignCode',
        header: 'Campaign',
        sortable: true,
        render: (r) => r.campaignCode || '-',
      },
      {
        key: 'phone',
        header: 'Phone',
        sortable: true,
        render: (r) => r?.prefill?.phoneNumber || '-',
      },
      {
        key: 'name',
        header: 'Name',
        sortable: false,
        render: (r) => renderName(r),
      },
      {
        key: 'uses',
        header: 'Uses',
        sortable: true,
        render: (r) => `${Number(r?.uses || 0)} / ${Number(r?.maxUses || 0) === 0 ? '∞' : Number(r?.maxUses || 0)}`,
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        render: (r) => timeAgo(r?.createdAt || r?.updatedAt),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => <Badge tone={statusTone(r?.status)}>{r?.status || '-'}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Link to={`/gateway/invites/${encodeURIComponent(r?.inviteId)}`} title="View">
              <Button size="sm" variant="ghost" className="px-2" aria-label="View">
                <Eye size={16} />
              </Button>
            </Link>
            <Can any={['GW_OPS_WRITE']}>
              <Link to={`/gateway/invites/${encodeURIComponent(r?.inviteId)}`} title="Edit">
                <Button size="sm" variant="ghost" className="px-2" aria-label="Edit">
                  <Pencil size={16} />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={(e) => doDelete(r, e)}
                disabled={!r?.inviteId}
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
    [doDelete]
  );

  const onRowClick = (row) => {
    if (!row?.inviteId) return;
    navigate(`/gateway/invites/${encodeURIComponent(row.inviteId)}`);
  };

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invites</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Create and manage onboarding invitation links
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
              <div className="text-base font-semibold">{page + 1}</div>
            </div>
            <Can any={['GW_OPS_WRITE']}>
              <Link to="/gateway/invites/new">
                <Button>Create Invite</Button>
              </Link>
            </Can>
          </div>
        </div>
      </section>

      {/* Filters */}
      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invite code, campaign, agent, phone, name..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </label>
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
          data={invites}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={onRowClick}
          emptyMessage="No invites found"
        />
      </Card>
    </div>
  );
};

export default InvitesList;
