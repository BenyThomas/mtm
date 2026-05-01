import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Can from '../../../components/Can';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { createMerchantCompany, listMerchantCompanies } from '../../../api/gateway/merchantNetwork';
import { listMerchantIndustryTypeLookup } from '../../../api/gateway/merchantIndustryTypes';
import { useToast } from '../../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SETTLEMENT_OPTIONS = ['PER_COMPANY', 'PER_OUTLET'];

const emptyForm = {
  code: '',
  name: '',
  industryType: '',
  settlementMode: 'PER_COMPANY',
  contactName: '',
  contactPhone: '',
  paymentProvider: '',
  paymentAccount: '',
  active: true,
};

const toneForActive = (value) => (value ? 'green' : 'gray');
const formatLabel = (value) => String(value || '-').replaceAll('_', ' ');

const MerchantCompanies = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [activeOnly, setActiveOnly] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [industryOptions, setIndustryOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadLookup = async () => {
      try {
        const response = await listMerchantIndustryTypeLookup();
        if (!cancelled) {
          const items = Array.isArray(response?.items) ? response.items : [];
          const defaultCode = items.find((item) => item?.defaultType)?.id || items[0]?.id;
          setIndustryOptions(items);
          setForm((prev) => ({ ...prev, industryType: defaultCode || prev.industryType }));
        }
      } catch (e) {
        if (!cancelled) {
          setIndustryOptions([]);
        }
      }
    };
    loadLookup();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await listMerchantCompanies({
          q: search || undefined,
          industryType: industryType || undefined,
          active: activeOnly === '' ? undefined : activeOnly === 'true',
          limit: 200,
          offset: 0,
        });
        if (cancelled) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setRows(items.map((item) => ({ ...item, id: item?.merchantCompanyId })));
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setError(e?.response?.data?.message || e?.message || 'Failed to load merchant companies');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick, search, industryType, activeOnly]);

  const filteredRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = String(a?.[sortBy] ?? '').toLowerCase();
      const bv = String(b?.[sortBy] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortBy, sortDir]);

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
    setIndustryType('');
    setActiveOnly('');
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

  const submit = async (event) => {
    event?.preventDefault?.();
    setSaving(true);
    setError('');
    try {
      await createMerchantCompany({
        code: form.code.trim(),
        name: form.name.trim(),
        industryType: form.industryType,
        settlementMode: form.settlementMode,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        paymentProvider: form.paymentProvider.trim(),
        paymentAccount: form.paymentAccount.trim(),
        active: !!form.active,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      setRefreshTick((tick) => tick + 1);
      addToast('Merchant company created', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Create failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Merchant Company',
      sortable: true,
      render: (row) => (
        <div className="min-w-[200px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.name || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.code || row?.merchantCompanyId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'industryType',
      header: 'Industry',
      sortable: true,
      render: (row) => {
        const opt = industryOptions.find((o) => o.id === row?.industryType);
        return opt?.name || formatLabel(row?.industryType);
      },
    },
    {
      key: 'settlementMode',
      header: 'Settlement',
      sortable: true,
      render: (row) => formatLabel(row?.settlementMode),
    },
    {
      key: 'contactName',
      header: 'Contact',
      sortable: true,
      render: (row) => (
        <div>
          <div>{row?.contactName || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.contactPhone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'paymentProvider',
      header: 'Settlement Account',
      sortable: false,
      render: (row) => (
        <div>
          <div>{row?.paymentProvider || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.paymentAccount || '-'}</div>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge tone={toneForActive(row?.active)}>{row?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Link to={`/gateway/merchant/companies/${encodeURIComponent(row?.merchantCompanyId)}`}>
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
            <h1 className="text-2xl font-bold">Merchant Companies</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Manage merchant networks and their industry mappings.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>Refresh</Button>
            <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
              <Button onClick={() => {
                const defaultCode = industryOptions.find((item) => item?.defaultType)?.id || industryOptions[0]?.id || emptyForm.industryType;
                setError('');
                setForm({ ...emptyForm, industryType: defaultCode });
                setCreateOpen(true);
              }}>
                <Plus size={16} /> Create Company
              </Button>
            </Can>
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
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              placeholder="Company name, code, contact..."
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Industry</label>
            <select
              value={industryType}
              onChange={(event) => { setIndustryType(event.target.value); setPage(0); }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              {industryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={activeOnly}
              onChange={(event) => { setActiveOnly(event.target.value); setPage(0); }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">Clear</Button>
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }}
              className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
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
          onRowClick={(row) => navigate(`/gateway/merchant/companies/${encodeURIComponent(row.merchantCompanyId)}`)}
          emptyMessage="No merchant companies found"
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="Create Merchant Company"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create Company'}</Button>
          </>
        )}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium">Code</label>
            <input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Industry</label>
            <select
              value={form.industryType}
              onChange={(event) => setForm((prev) => ({ ...prev, industryType: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {industryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Settlement Mode</label>
            <select
              value={form.settlementMode}
              onChange={(event) => setForm((prev) => ({ ...prev, settlementMode: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {SETTLEMENT_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Name</label>
            <input
              value={form.contactName}
              onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Phone</label>
            <input
              value={form.contactPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment Provider</label>
            <input
              value={form.paymentProvider}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentProvider: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment Account</label>
            <input
              value={form.paymentAccount}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentAccount: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Active immediately
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default MerchantCompanies;
