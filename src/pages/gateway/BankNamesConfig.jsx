import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { createBankName, deleteBankName, listBankNames, patchBankName, updateBankName } from '../../api/gateway/bankNames';

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

const BankNamesConfig = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [activeFilter, setActiveFilter] = useState('');

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);

  const [newName, setNewName] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingActive, setEditingActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listBankNames({
          q: debouncedSearch || undefined,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
          orderBy: sortBy,
          sortOrder: sortDir,
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setItems(rows.map((x) => ({ ...x, id: x?.bankNameId })));
        setTotal(Number(data?.total || rows.length || 0));
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        addToast(e?.response?.data?.message || e?.message || 'Failed to load bank names', 'error');
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

  const resetCreate = () => {
    setNewName('');
    setNewActive(true);
  };

  const create = async () => {
    const name = String(newName || '').trim();
    if (!name) {
      addToast('Bank name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await createBankName({ name, active: !!newActive });
      addToast('Bank name added', 'success');
      resetCreate();
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row?.bankNameId || '');
    setEditingName(row?.name || '');
    setEditingActive(!!row?.active);
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditingName('');
    setEditingActive(true);
  };

  const saveEdit = async () => {
    const id = String(editingId || '').trim();
    const name = String(editingName || '').trim();
    if (!id || !name) {
      addToast('Bank name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateBankName(id, { name, active: !!editingActive });
      addToast('Bank name updated', 'success');
      cancelEdit();
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    const id = row?.bankNameId;
    if (!id) return;
    try {
      await patchBankName(id, { active: !row?.active });
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Status update failed', 'error');
    }
  };

  const remove = async (row, e) => {
    e?.stopPropagation?.();
    if (!row?.bankNameId) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete bank name "${row.name}"?`)) return;
    try {
      await deleteBankName(row.bankNameId);
      addToast('Bank name deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' },
      {
        key: 'active',
        header: 'Status',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            className="inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              toggleActive(r);
            }}
            title="Toggle active"
          >
            <Badge tone={statusTone(!!r?.active)}>{r?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
          </button>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        render: (r) => timeAgo(r?.updatedAt || r?.createdAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => startEdit(r)} title="Edit" aria-label="Edit">
              <Pencil size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              onClick={(e) => remove(r, e)}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={16} />
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
          <h1 className="text-2xl font-bold">Bank Names</h1>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">CRUD and lookup source for customer onboarding bank names.</div>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bank Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. NMB Bank"
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} disabled={saving} />
            <span className="text-sm">Active</span>
          </label>
          <div className="flex items-end justify-end gap-2">
            <Button variant="secondary" onClick={resetCreate} disabled={saving}>
              Clear
            </Button>
            <Button onClick={create} disabled={saving}>
              Add Bank
            </Button>
          </div>
        </div>
      </Card>

      {editingId ? (
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Edit Bank Name</label>
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                disabled={saving}
              />
            </div>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={editingActive} onChange={(e) => setEditingActive(e.target.checked)} disabled={saving} />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex items-end justify-end gap-2">
              <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={saving}>
                Save
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

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
              placeholder="Search bank names..."
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
          data={items}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          emptyMessage="No bank names found"
        />
      </Card>
    </div>
  );
};

export default BankNamesConfig;
