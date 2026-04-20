import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { listLoanPurposesOps, patchLoanPurposeOps, syncLoanPurposesOps } from '../../api/gateway/loanPurposes';

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

const LoanPurposesConfig = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [activeFilter, setActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');
  const [editingActive, setEditingActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listLoanPurposesOps({
          q: debouncedSearch || undefined,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
          orderBy: sortBy,
          sortOrder: sortDir,
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setItems(rows.map((x) => ({ ...x, id: x?.loanPurposeId })));
        setTotal(Number(data?.total || rows.length || 0));
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          addToast(e?.response?.data?.message || e?.message || 'Failed to load loan purposes', 'error');
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

  const startEdit = (row) => {
    setEditing(row);
    setEditingName(row?.name || '');
    setEditingCode(row?.code || '');
    setEditingActive(!!row?.active);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditingName('');
    setEditingCode('');
    setEditingActive(true);
  };

  const saveEdit = async () => {
    if (!editing?.loanPurposeId) return;
    setSaving(true);
    try {
      await patchLoanPurposeOps(editing.loanPurposeId, {
        name: editingName,
        code: editingCode,
        active: !!editingActive,
      });
      addToast('Loan purpose updated', 'success');
      closeEdit();
      setRefreshTick((t) => t + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runSync = async () => {
    setSaving(true);
    try {
      const result = await syncLoanPurposesOps();
      setLastSyncResult(result || null);
      addToast(`Loan purposes synced (${Number(result?.synced || 0)})`, 'success');
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setLastSyncResult(null);
      addToast(e?.response?.data?.message || e?.message || 'Sync failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' },
      { key: 'code', header: 'Code', sortable: true, render: (r) => r?.code || '-' },
      { key: 'fineractCodeValueId', header: 'Fineract ID', sortable: false, render: (r) => r?.fineractCodeValueId ?? '-' },
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
          <h1 className="text-2xl font-bold">Loan Purposes</h1>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Synced from Fineract code values, managed in Gateway, and used during loan application.
          </div>
        </div>
        <Button onClick={runSync} disabled={saving}>
          <RefreshCw size={16} /> Sync From Fineract
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
              placeholder="Search loan purposes..."
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
        {lastSyncResult ? (
          <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-slate-200">
            <div className="font-semibold text-slate-900 dark:text-slate-50">
              Last Sync Result: {Number(lastSyncResult?.synced || 0)} item{Number(lastSyncResult?.synced || 0) === 1 ? '' : 's'}
            </div>
            {Array.isArray(lastSyncResult?.items) && lastSyncResult.items.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {lastSyncResult.items.slice(0, 8).map((item) => (
                  <span
                    key={item?.loanPurposeId || item?.fineractCodeValueId || item?.name}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {item?.name || item?.code || 'Loan Purpose'}
                    {item?.fineractCodeValueId ? ` (${item.fineractCodeValueId})` : ''}
                  </span>
                ))}
                {lastSyncResult.items.length > 8 ? (
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    +{lastSyncResult.items.length - 8} more
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Sync completed but no loan-purpose items were returned.
              </div>
            )}
          </div>
        ) : null}
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
          emptyMessage="No loan purposes found"
        />
      </Card>

      <Modal
        open={!!editing}
        onClose={() => (saving ? null : closeEdit())}
        title="Edit Loan Purpose"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</label>
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Code</label>
            <input
              value={editingCode}
              onChange={(e) => setEditingCode(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={editingActive} onChange={(e) => setEditingActive(e.target.checked)} disabled={saving} />
            <span className="text-sm">Active</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default LoanPurposesConfig;
