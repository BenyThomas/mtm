import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { createCenter, listCenters } from '../../../api/gateway/community';
import useOffices from '../../../hooks/useOffices';
import useStaff from '../../../hooks/useStaff';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const emptyForm = {
  name: '',
  officeId: '',
  invitedByStaffId: '',
  active: true,
};

const statusTone = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'ACTIVE') return 'green';
  if (status === 'PENDING') return 'yellow';
  return 'gray';
};

const CommunityCenters = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { offices } = useOffices();
  const { staff } = useStaff({ activeOnly: true });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const linkedOfficeId = String(user?.officeId || '').trim();
  const linkedStaffId = String(user?.staffId || '').trim();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await listCenters();
        if (cancelled) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setRows(items.map((item) => ({ ...item, id: item?.platformCenterId })));
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setError(e?.response?.data?.message || e?.message || 'Failed to load centers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filteredRows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    let items = rows;
    if (q) {
      items = items.filter((item) => {
        const hay = [item?.name, item?.platformCenterId, item?.centerAdminCustomerId, item?.invitedByStaffId]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return hay.includes(q);
      });
    }
    if (status) {
      const expected = String(status).toUpperCase();
      items = items.filter((item) => String(item?.status || '').toUpperCase() === expected);
    }
    return [...items].sort((a, b) => {
      const av = String(a?.[sortBy] ?? '').toLowerCase();
      const bv = String(b?.[sortBy] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, search, status, sortBy, sortDir]);

  const pagedRows = useMemo(() => {
    const start = page * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredRows.length / limit) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows.length, limit, page]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(0);
  };

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.officeId || !form.invitedByStaffId) {
      const msg = 'Your login is not linked to an office and staff profile.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createCenter({
        name: form.name.trim(),
        officeId: Number(form.officeId),
        invitedByStaffId: Number(form.invitedByStaffId),
        invitedByStaffName: linkedStaff?.displayName || user?.staffDisplayName || '',
        invitedByStaffPhone: linkedStaff?.mobileNo || '',
        invitedByStaffEmail: linkedStaff?.email || '',
        invitedByStaffOfficeName: linkedStaff?.officeName || linkedOffice?.name || user?.officeName || '',
        active: !!form.active,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      setRefreshTick((tick) => tick + 1);
      addToast('Center created', 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Create failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const linkedOffice = useMemo(
    () => offices.find((office) => String(office.id) === linkedOfficeId) || null,
    [offices, linkedOfficeId],
  );
  const linkedStaff = useMemo(
    () => staff.find((item) => String(item.id) === linkedStaffId) || null,
    [staff, linkedStaffId],
  );

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Center',
      sortable: true,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.name || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.platformCenterId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'centerAdminCustomerId',
      header: 'Center Admin',
      sortable: true,
      render: (row) => row?.centerAdminCustomerId || '-',
    },
    {
      key: 'invitedByStaffId',
      header: 'Staff',
      sortable: true,
      render: (row) => row?.invitedByStaffId || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge tone={statusTone(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      sortable: false,
      render: (row) => `${row?.groupCount || 0}/${row?.maxGroups || '-'} groups | ${row?.memberCount || 0}/${row?.maxMembers || '-'} members`,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link to={`/gateway/centers/${encodeURIComponent(row?.platformCenterId)}`}>
            <Button size="sm" variant="ghost" className="px-2" title="View">
              <Eye size={16} />
            </Button>
          </Link>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Centers</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Fineract-first centers with local admin and capacity tracking</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>Refresh</Button>
            <Button
              onClick={() => {
                setError('');
                setForm({
                  ...emptyForm,
                  officeId: linkedOfficeId,
                  invitedByStaffId: linkedStaffId,
                });
                setCreateOpen(true);
              }}
              disabled={!linkedOfficeId || !linkedStaffId}
            >
              <Plus size={16} /> Create Center
            </Button>
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
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Center name, ids, center admin, staff..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">Clear</Button>
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
              className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={pagedRows}
          loading={loading}
          total={filteredRows.length}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={(row) => navigate(`/gateway/centers/${encodeURIComponent(row.platformCenterId)}`)}
          emptyMessage="No centers found"
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="Create Center"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create Center'}</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Office</label>
            <input
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={linkedOffice ? `${linkedOffice.name}${linkedOffice.parentName ? ` - ${linkedOffice.parentName}` : ''}` : user?.officeName || ''}
              readOnly
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Center will be created under your linked office.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Staff</label>
            <input
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={linkedStaff ? `${linkedStaff.displayName}${linkedStaff.officeName ? ` - ${linkedStaff.officeName}` : ''} (${linkedStaff.id})` : user?.staffDisplayName || ''}
              readOnly
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Center will be linked to your staff profile.
            </div>
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} />
            Active immediately
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default CommunityCenters;
