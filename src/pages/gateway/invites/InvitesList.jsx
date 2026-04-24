import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Send, Trash2 } from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import Can from '../../../components/Can';
import Modal from '../../../components/Modal';
import SearchableSelectField from '../../../components/SearchableSelectField';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { createInvite, deleteInvite, patchInvite, listInvites } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const INVITE_READ_PERMISSIONS = ['READ_CLIENT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT'];

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
  const mn = (it?.prefill?.middleName || '').trim();
  const ln = (it?.prefill?.lastName || '').trim();
  const full = `${fn} ${mn} ${ln}`.trim();
  return full || '-';
};

const inviteFormInit = {
  referrerId: '',
  campaignCode: '',
  channel: '',
  maxUses: '1',
  multiUse: false,
  phoneNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
};

const InvitesList = ({ embedded = false, autoOpenCreate = false, onAutoOpenConsumed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { catalog, loading: catalogLoading } = useInviteCatalog();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [editingInvite, setEditingInvite] = useState(null);
  const [inviteForm, setInviteForm] = useState(inviteFormInit);

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

  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` })),
    [staff],
  );
  const staffNameById = useMemo(() => {
    const out = {};
    for (const item of staff) out[String(item.id)] = item.displayName || String(item.id);
    return out;
  }, [staff]);
  const campaignOptions = useMemo(
    () => (catalog?.campaigns || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [catalog],
  );
  const channelOptions = useMemo(
    () => (catalog?.channels || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [catalog],
  );
  const loggedInStaffId = String(user?.staffId || '');
  const isLoanOfficerUser = Boolean(user?.isGatewayOnlyLoanOfficer || user?.linkedStaffIsLoanOfficer || user?.isLoanOfficer);

  useEffect(() => {
    if (!inviteOpen || editingInvite) return;
    setInviteForm((prev) => ({
      ...prev,
      referrerId: prev.referrerId || loggedInStaffId,
      campaignCode: prev.campaignCode || String(campaignOptions[0]?.id || ''),
      channel: prev.channel || String(channelOptions[0]?.id || ''),
    }));
  }, [inviteOpen, editingInvite, campaignOptions, channelOptions, loggedInStaffId]);

  const openCreateModal = () => {
    setEditingInvite(null);
    setInviteForm({
      ...inviteFormInit,
      referrerId: loggedInStaffId,
      campaignCode: String(campaignOptions[0]?.id || ''),
      channel: String(channelOptions[0]?.id || ''),
    });
    setInviteOpen(true);
  };

  useEffect(() => {
    if (!location?.state?.openCreate) return;
    openCreateModal();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.pathname, location?.state, navigate, campaignOptions, channelOptions, loggedInStaffId]);

  useEffect(() => {
    if (!embedded || !autoOpenCreate) return;
    openCreateModal();
    onAutoOpenConsumed?.();
  }, [embedded, autoOpenCreate, campaignOptions, channelOptions, loggedInStaffId, onAutoOpenConsumed]);

  const openEditModal = (invite, e) => {
    e?.stopPropagation?.();
    setEditingInvite(invite);
    const lockedReferrerId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : String(invite?.referrerId || '');
    setInviteForm({
      referrerId: lockedReferrerId,
      campaignCode: String(invite?.campaignCode || campaignOptions[0]?.id || ''),
      channel: String(invite?.channel || channelOptions[0]?.id || ''),
      maxUses: String(invite?.maxUses ?? 1),
      multiUse: Number(invite?.maxUses || 0) === 0,
      phoneNumber: String(invite?.prefill?.phoneNumber || ''),
      firstName: String(invite?.prefill?.firstName || ''),
      middleName: String(invite?.prefill?.middleName || ''),
      lastName: String(invite?.prefill?.lastName || ''),
    });
    setInviteOpen(true);
  };

  const submitInvite = async (e) => {
    e?.preventDefault?.();
    setSavingInvite(true);
    try {
      if (!inviteForm.phoneNumber.trim() || !inviteForm.firstName.trim() || !inviteForm.middleName.trim() || !inviteForm.lastName.trim()) {
        addToast('Phone, first name, middle name, and last name are required', 'error');
        return;
      }
      const effectiveStaffId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : inviteForm.referrerId;
      const payload = {
        referrerId: effectiveStaffId ? String(effectiveStaffId) : null,
        campaignCode: inviteForm.campaignCode.trim(),
        channel: inviteForm.channel.trim(),
        maxUses: inviteForm.multiUse ? 0 : (Number(inviteForm.maxUses) || 1),
        multiUse: !!inviteForm.multiUse,
        prefill: {
          phoneNumber: inviteForm.phoneNumber.trim() || null,
          firstName: inviteForm.firstName.trim() || null,
          middleName: inviteForm.middleName.trim() || null,
          lastName: inviteForm.lastName.trim() || null,
        },
      };
      if (editingInvite?.inviteId) {
        await patchInvite(editingInvite.inviteId, payload);
        addToast('Invite updated', 'success');
      } else {
        await createInvite(payload);
        addToast('Invite created', 'success');
      }
      setInviteOpen(false);
      setEditingInvite(null);
      setInviteForm(inviteFormInit);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0]?.details || err?.response?.data?.message || err?.message || 'Save failed', 'error');
    } finally {
      setSavingInvite(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'referrerId',
        header: 'Agent',
        sortable: true,
        render: (r) => staffNameById[String(r?.referrerId || '')] || r?.referrerId || '-',
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
              <Button size="sm" variant="ghost" className="px-2" aria-label="Edit" title="Edit" onClick={(e) => openEditModal(r, e)}>
                <Pencil size={16} />
              </Button>
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
    [doDelete, staffNameById]
  );

  const onRowClick = (row) => {
    if (!row?.inviteId) return;
    navigate(`/gateway/invites/${encodeURIComponent(row.inviteId)}`);
  };

  return (
    <div className="space-y-4">
      {!embedded ? (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Invites</h1>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Create and manage onboarding invitation links
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Can any={INVITE_READ_PERMISSIONS}>
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
                  <div className="text-base font-semibold">{page + 1}</div>
                </div>
              </Can>
              <Can any={['CREATE_CLIENT']}>
                <Button onClick={openCreateModal}><Plus size={16} /> Create Invite</Button>
              </Can>
            </div>
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
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
          <div className="w-full sm:w-[220px]">
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
          <div className="flex flex-row flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
              Clear
            </Button>
            <Can any={['CREATE_CLIENT']}>
              <Button onClick={openCreateModal} className="w-full sm:w-auto">
                <Send size={16} />
                <span className="ml-2">Send Invite</span>
              </Button>
            </Can>
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

      <Modal
        open={inviteOpen}
        onClose={() => (savingInvite ? null : setInviteOpen(false))}
        title={editingInvite ? 'Update Invite' : 'Create Invite'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={savingInvite}>Cancel</Button>
            <Button onClick={submitInvite} disabled={savingInvite}>{savingInvite ? 'Saving...' : editingInvite ? 'Save Changes' : 'Create Invite'}</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitInvite}>
          <div className="sm:col-span-2">
            <SearchableSelectField
              label="Staff"
              value={inviteForm.referrerId}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, referrerId: String(value || '') }))}
              options={staffOptions}
              placeholder="Search staff"
              disabled={staffLoading || (isLoanOfficerUser && !!loggedInStaffId)}
              helperText={isLoanOfficerUser
                ? 'Your linked staff profile is used automatically for this invite.'
                : 'Select the staff member responsible for this invite.'}
            />
          </div>
          <div>
            <SearchableSelectField
              label="Campaign"
              value={inviteForm.campaignCode}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, campaignCode: String(value || '') }))}
              options={campaignOptions}
              placeholder="Search campaign"
              disabled={catalogLoading}
              required
            />
          </div>
          <div>
            <SearchableSelectField
              label="Channel"
              value={inviteForm.channel}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, channel: String(value || '') }))}
              options={channelOptions}
              placeholder="Search channel"
              disabled={catalogLoading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max Uses</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={inviteForm.maxUses}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              disabled={inviteForm.multiUse}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inviteForm.multiUse}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, multiUse: e.target.checked }))}
              />
              Multi-use
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.phoneNumber} onChange={(e) => setInviteForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} placeholder="2557..." />
          </div>
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.firstName} onChange={(e) => setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Middle Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.middleName} onChange={(e) => setInviteForm((prev) => ({ ...prev, middleName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.lastName} onChange={(e) => setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))} required />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvitesList;
