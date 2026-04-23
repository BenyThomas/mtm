import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Send } from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Can from '../../../components/Can';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import {
  createMerchantAttendant,
  createMerchantOutlet,
  enrollMerchantAttendant,
  getMerchantCompany,
  listMerchantAttendants,
  listMerchantOutlets,
} from '../../../api/gateway/merchantNetwork';
import { useToast } from '../../../context/ToastContext';

const INDUSTRY_OPTIONS = ['FUEL', 'SPARE_PARTS', 'MAINTENANCE'];

const outletFormInit = {
  code: '',
  name: '',
  industryType: 'FUEL',
  area: '',
  address: '',
  contactPhone: '',
  paymentProvider: '',
  paymentAccount: '',
  active: true,
};

const attendantFormInit = {
  employeeCode: '',
  fullName: '',
  phone: '',
  active: true,
};

const toneForActive = (value) => (value ? 'green' : 'gray');
const formatLabel = (value) => String(value || '-').replaceAll('_', ' ');

const MerchantCompanyDetails = () => {
  const { merchantCompanyId } = useParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [outletOpen, setOutletOpen] = useState(false);
  const [attendantOpen, setAttendantOpen] = useState(false);
  const [savingOutlet, setSavingOutlet] = useState(false);
  const [savingAttendant, setSavingAttendant] = useState(false);
  const [enrollingId, setEnrollingId] = useState('');
  const [outletForm, setOutletForm] = useState(outletFormInit);
  const [attendantForm, setAttendantForm] = useState(attendantFormInit);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companyData, outletData, attendantData] = await Promise.all([
        getMerchantCompany(merchantCompanyId),
        listMerchantOutlets({ merchantCompanyId, limit: 200, offset: 0 }),
        listMerchantAttendants({ limit: 200, offset: 0 }),
      ]);
      const outletItems = Array.isArray(outletData?.items) ? outletData.items : [];
      const attendantItems = Array.isArray(attendantData?.items) ? attendantData.items : [];
      setCompany(companyData || null);
      setOutlets(outletItems.map((item) => ({ ...item, id: item?.merchantOutletId })));
      setAttendants(
        attendantItems
          .filter((item) => String(item?.merchantCompanyId || '') === String(merchantCompanyId))
          .map((item) => ({ ...item, id: item?.merchantAttendantId }))
      );
      if (!selectedOutletId && outletItems[0]?.merchantOutletId) {
        setSelectedOutletId(String(outletItems[0].merchantOutletId));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load merchant company');
      setCompany(null);
      setOutlets([]);
      setAttendants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [merchantCompanyId]);

  useEffect(() => {
    if (!outlets.find((item) => String(item?.merchantOutletId) === String(selectedOutletId))) {
      setSelectedOutletId(outlets[0]?.merchantOutletId ? String(outlets[0].merchantOutletId) : '');
    }
  }, [outlets, selectedOutletId]);

  const visibleAttendants = useMemo(() => {
    if (!selectedOutletId) return attendants;
    return attendants.filter((item) => String(item?.merchantOutletId || '') === String(selectedOutletId));
  }, [attendants, selectedOutletId]);

  const submitOutlet = async (event) => {
    event?.preventDefault?.();
    setSavingOutlet(true);
    setError('');
    try {
      await createMerchantOutlet(merchantCompanyId, {
        code: outletForm.code.trim(),
        name: outletForm.name.trim(),
        industryType: outletForm.industryType,
        area: outletForm.area.trim(),
        address: outletForm.address.trim(),
        contactPhone: outletForm.contactPhone.trim(),
        paymentProvider: outletForm.paymentProvider.trim(),
        paymentAccount: outletForm.paymentAccount.trim(),
        active: !!outletForm.active,
      });
      setOutletOpen(false);
      setOutletForm({ ...outletFormInit, industryType: company?.industryType || 'FUEL' });
      await load();
      addToast('Outlet created', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Create failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingOutlet(false);
    }
  };

  const submitAttendant = async (event) => {
    event?.preventDefault?.();
    if (!selectedOutletId) {
      const message = 'Select an outlet before adding attendants.';
      setError(message);
      addToast(message, 'error');
      return;
    }
    setSavingAttendant(true);
    setError('');
    try {
      await createMerchantAttendant(selectedOutletId, {
        employeeCode: attendantForm.employeeCode.trim(),
        fullName: attendantForm.fullName.trim(),
        phone: attendantForm.phone.trim(),
        active: !!attendantForm.active,
      });
      setAttendantOpen(false);
      setAttendantForm(attendantFormInit);
      await load();
      addToast('Attendant created', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Create failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingAttendant(false);
    }
  };

  const doEnroll = async (merchantAttendantId) => {
    if (!merchantAttendantId) return;
    setEnrollingId(merchantAttendantId);
    try {
      await enrollMerchantAttendant(merchantAttendantId);
      addToast('Enrollment OTP sent to attendant', 'success');
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Enrollment failed', 'error');
    } finally {
      setEnrollingId('');
    }
  };

  const outletColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Outlet',
      sortable: false,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.name || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.code || row?.merchantOutletId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      sortable: false,
      render: (row) => row?.area || '-',
    },
    {
      key: 'industryType',
      header: 'Industry',
      sortable: false,
      render: (row) => formatLabel(row?.industryType),
    },
    {
      key: 'contactPhone',
      header: 'Phone',
      sortable: false,
      render: (row) => row?.contactPhone || '-',
    },
    {
      key: 'active',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForActive(row?.active)}>{row?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
  ], []);

  const attendantColumns = useMemo(() => [
    {
      key: 'fullName',
      header: 'Attendant',
      sortable: false,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.fullName || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.employeeCode || row?.merchantAttendantId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'merchantOutletName',
      header: 'Outlet',
      sortable: false,
      render: (row) => row?.merchantOutletName || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      render: (row) => row?.phone || '-',
    },
    {
      key: 'active',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForActive(row?.active)}>{row?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => doEnroll(row?.merchantAttendantId)}
              disabled={enrollingId === row?.merchantAttendantId}
            >
              <Send size={14} /> {enrollingId === row?.merchantAttendantId ? 'Sending...' : 'Enroll'}
            </Button>
          </Can>
        </div>
      ),
    },
  ], [enrollingId]);

  const selectedOutlet = outlets.find((item) => String(item?.merchantOutletId) === String(selectedOutletId)) || null;

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchant Network</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{company?.name || merchantCompanyId}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/gateway/merchant/companies"><Button variant="secondary">Back</Button></Link>
            <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
            <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
              <Button
                onClick={() => {
                  setOutletForm({ ...outletFormInit, industryType: company?.industryType || 'FUEL' });
                  setOutletOpen(true);
                }}
              >
                <Plus size={16} /> Add Outlet
              </Button>
              <Button onClick={() => setAttendantOpen(true)} disabled={!selectedOutletId}>
                <Plus size={16} /> Add Attendant
              </Button>
            </Can>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs text-slate-500">Code</div><div className="mt-1 text-sm">{company?.code || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Industry</div><div className="mt-1 text-sm">{formatLabel(company?.industryType)}</div></div>
          <div><div className="text-xs text-slate-500">Settlement Mode</div><div className="mt-1 text-sm">{formatLabel(company?.settlementMode)}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><div className="mt-1 text-sm"><Badge tone={toneForActive(company?.active)}>{company?.active ? 'ACTIVE' : 'INACTIVE'}</Badge></div></div>
          <div><div className="text-xs text-slate-500">Contact</div><div className="mt-1 text-sm">{company?.contactName || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Phone</div><div className="mt-1 text-sm">{company?.contactPhone || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Payment Provider</div><div className="mt-1 text-sm">{company?.paymentProvider || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Payment Account</div><div className="mt-1 text-sm">{company?.paymentAccount || '-'}</div></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Outlets</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Approved merchant outlets under this company.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={outletColumns}
            data={outlets}
            loading={loading}
            total={outlets.length}
            page={0}
            limit={Math.max(1, outlets.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            onRowClick={(row) => setSelectedOutletId(String(row?.merchantOutletId || ''))}
            emptyMessage="No outlets found"
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Attendants</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {selectedOutlet ? `Showing attendants for ${selectedOutlet.name}` : 'Showing attendants across all outlets.'}
            </div>
          </div>
          <div className="sm:w-72">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter by Outlet</label>
            <select
              value={selectedOutletId}
              onChange={(event) => setSelectedOutletId(event.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All Outlets</option>
              {outlets.map((item) => (
                <option key={item.merchantOutletId} value={item.merchantOutletId}>
                  {item.name} {item.area ? `- ${item.area}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={attendantColumns}
            data={visibleAttendants}
            loading={loading}
            total={visibleAttendants.length}
            page={0}
            limit={Math.max(1, visibleAttendants.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No attendants found"
          />
        </div>
      </Card>

      <Modal
        open={outletOpen}
        onClose={() => (savingOutlet ? null : setOutletOpen(false))}
        title="Create Outlet"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOutletOpen(false)} disabled={savingOutlet}>Cancel</Button>
            <Button onClick={submitOutlet} disabled={savingOutlet}>{savingOutlet ? 'Creating...' : 'Create Outlet'}</Button>
          </>
        )}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitOutlet}>
          <div>
            <label className="block text-sm font-medium">Code</label>
            <input value={outletForm.code} onChange={(event) => setOutletForm((prev) => ({ ...prev, code: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input value={outletForm.name} onChange={(event) => setOutletForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Industry</label>
            <select value={outletForm.industryType} onChange={(event) => setOutletForm((prev) => ({ ...prev, industryType: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600">
              {INDUSTRY_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Area</label>
            <input value={outletForm.area} onChange={(event) => setOutletForm((prev) => ({ ...prev, area: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Address</label>
            <input value={outletForm.address} onChange={(event) => setOutletForm((prev) => ({ ...prev, address: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Phone</label>
            <input value={outletForm.contactPhone} onChange={(event) => setOutletForm((prev) => ({ ...prev, contactPhone: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment Provider</label>
            <input value={outletForm.paymentProvider} onChange={(event) => setOutletForm((prev) => ({ ...prev, paymentProvider: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Payment Account</label>
            <input value={outletForm.paymentAccount} onChange={(event) => setOutletForm((prev) => ({ ...prev, paymentAccount: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={outletForm.active} onChange={(event) => setOutletForm((prev) => ({ ...prev, active: event.target.checked }))} />
            Active immediately
          </label>
        </form>
      </Modal>

      <Modal
        open={attendantOpen}
        onClose={() => (savingAttendant ? null : setAttendantOpen(false))}
        title="Create Attendant"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAttendantOpen(false)} disabled={savingAttendant}>Cancel</Button>
            <Button onClick={submitAttendant} disabled={savingAttendant}>{savingAttendant ? 'Creating...' : 'Create Attendant'}</Button>
          </>
        )}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitAttendant}>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Outlet</label>
            <input value={selectedOutlet?.name || '-'} readOnly className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Employee Code</label>
            <input value={attendantForm.employeeCode} onChange={(event) => setAttendantForm((prev) => ({ ...prev, employeeCode: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Full Name</label>
            <input value={attendantForm.fullName} onChange={(event) => setAttendantForm((prev) => ({ ...prev, fullName: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Phone</label>
            <input value={attendantForm.phone} onChange={(event) => setAttendantForm((prev) => ({ ...prev, phone: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={attendantForm.active} onChange={(event) => setAttendantForm((prev) => ({ ...prev, active: event.target.checked }))} />
            Active immediately
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default MerchantCompanyDetails;
