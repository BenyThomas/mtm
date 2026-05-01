import React, { useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import {
  createMerchantIndustryTypeOps,
  listMerchantIndustryTypesOps,
  patchMerchantIndustryTypeOps,
} from '../../api/gateway/merchantIndustryTypes';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const statusTone = (active) => (active ? 'green' : 'gray');

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const MerchantIndustryTypesConfig = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [activeFilter, setActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('displayOrder');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    active: true,
    defaultType: false,
    displayOrder: 100,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listMerchantIndustryTypesOps({
          q: debouncedSearch || undefined,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
          orderBy: sortBy,
          sortOrder: sortDir,
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setItems(rows.map((x) => ({ ...x, id: x?.merchantIndustryTypeId })));
        setTotal(Number(data?.total || rows.length || 0));
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          addToast(e?.response?.data?.message || e?.message || 'Failed to load merchant industry types', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, activeFilter, sortBy, sortDir, page, limit, refreshTick, addToast]);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      active: true,
      defaultType: false,
      displayOrder: 100,
    });
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      name: row?.name || '',
      description: row?.description || '',
      active: row?.active !== false,
      defaultType: !!row?.defaultType,
      displayOrder: Number(row?.displayOrder ?? 100),
    });
  };

  const closeModal = () => {
    setEditing(null);
    setCreateOpen(false);
    resetForm();
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing?.merchantIndustryTypeId) {
        await patchMerchantIndustryTypeOps(editing.merchantIndustryTypeId, form);
        addToast('Merchant industry type updated', 'success');
      } else {
        await createMerchantIndustryTypeOps(form);
        addToast('Merchant industry type added', 'success');
      }
      closeModal();
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Merchant Industry Type', sortable: true, render: (r) => r?.name || '-' },
      { key: 'description', header: 'Description', sortable: false, render: (r) => r?.description || '-' },
      { key: 'displayOrder', header: 'Order', sortable: true, render: (r) => r?.displayOrder ?? '-' },
      {
        key: 'defaultType',
        header: 'Default',
        sortable: true,
        render: (r) => (r?.defaultType ? <Badge tone="cyan">DEFAULT</Badge> : '-'),
      },
      {
        key: 'active',
        header: 'Status',
        sortable: true,
        render: (r) => <Badge tone={statusTone(!!r?.active)}>{r?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
      },
      { key: 'updatedAt', header: 'Updated', sortable: true, render: (r) => timeAgo(r?.updatedAt || r?.createdAt) },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => startEdit(r)} title="Edit" aria-label="Edit">
              <Pencil size={16} />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Merchant Industry Types</h1>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Managed lookup for merchant network classification and loan-purpose mapping.
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          Add Merchant Industry Type
        </Button>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search merchant industry types..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-2">
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
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          emptyMessage="No merchant industry types found"
        />
      </Card>

      <Modal
        open={createOpen || !!editing}
        onClose={() => (saving ? null : closeModal())}
        title={editing ? 'Edit Merchant Industry Type' : 'Add Merchant Industry Type'}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Display Order</label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value || 0) }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Merchant Industry Type</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} disabled={saving} />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.defaultType} onChange={(e) => setForm((prev) => ({ ...prev, defaultType: e.target.checked }))} disabled={saving} />
            <span className="text-sm">Default type</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default MerchantIndustryTypesConfig;
