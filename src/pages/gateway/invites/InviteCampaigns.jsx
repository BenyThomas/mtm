import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { createInviteCampaign, deleteInviteCampaign, listInviteCampaigns, updateInviteCampaign } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const formInit = { code: '', name: '', active: true };

const InviteCampaigns = () => {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(formInit);

  const load = async () => {
    setLoading(true);
    try {
      const response = await listInviteCampaigns({
        q: search || undefined,
        active: activeFilter === '' ? undefined : activeFilter === 'true',
        offset: page * limit,
        limit,
        orderBy: sortBy,
        sortOrder: sortDir,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setRows(items.map((item) => ({ ...item, id: item.inviteCampaignId })));
      setTotal(Number(response?.total || items.length || 0));
    } catch (e) {
      setRows([]);
      setTotal(0);
      addToast(e?.response?.data?.message || e?.message || 'Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, activeFilter, page, limit, sortBy, sortDir]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(formInit);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      code: String(row?.code || ''),
      name: String(row?.name || ''),
      active: !!row?.active,
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        active: !!form.active,
      };
      if (editing?.inviteCampaignId) {
        await updateInviteCampaign(editing.inviteCampaignId, payload);
        addToast('Campaign updated', 'success');
      } else {
        await createInviteCampaign(payload);
        addToast('Campaign created', 'success');
      }
      setModalOpen(false);
      setForm(formInit);
      setEditing(null);
      await load();
    } catch (e2) {
      addToast(e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!target?.inviteCampaignId) return;
    setDeleting(true);
    try {
      await deleteInviteCampaign(target.inviteCampaignId);
      addToast('Campaign deleted', 'success');
      setDeleteOpen(false);
      setTarget(null);
      await load();
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(() => [
    { key: 'code', header: 'Code', sortable: true, render: (r) => <div className="font-medium text-slate-900 dark:text-slate-50">{r?.code || '-'}</div> },
    { key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' },
    { key: 'active', header: 'Status', sortable: true, render: (r) => <Badge tone={r?.active ? 'green' : 'gray'}>{r?.active ? 'ACTIVE' : 'INACTIVE'}</Badge> },
    { key: 'updatedAt', header: 'Updated', sortable: true, render: (r) => r?.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-' },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Pencil size={14} /> Edit</Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => { setTarget(row); setDeleteOpen(true); }}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invite Campaigns</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage invite campaigns used by invite creation screens.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Campaign</Button>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Search</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search code or name" />
          </div>
          <div>
            <label className="block text-sm font-medium">Status</label>
            <select className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(0); }}>
              {ACTIVE_OPTIONS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Page Size</label>
            <select className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
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
          emptyMessage="No campaigns found"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => (saving ? null : setModalOpen(false))}
        title={editing ? 'Edit Campaign' : 'New Campaign'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        <form className="grid gap-4" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium">Code</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} />
            Active
          </label>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => (deleting ? null : setDeleteOpen(false))}
        title="Delete Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Delete campaign <span className="font-medium text-slate-900 dark:text-slate-100">{target?.name || target?.code || '-'}</span>?
        </p>
      </Modal>
    </div>
  );
};

export default InviteCampaigns;
