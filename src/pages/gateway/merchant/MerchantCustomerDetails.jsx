import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Can from '../../../components/Can';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { listGwLoans } from '../../../api/gateway/loans';
import {
  createCustomerVehicle,
  createMerchantCreditAccountFromLoan,
  listCustomerVehicles,
  listMerchantCreditAccounts,
  patchCustomerVehicle,
} from '../../../api/gateway/merchantNetwork';
import { getOpsResource } from '../../../api/gateway/opsResources';
import { useToast } from '../../../context/ToastContext';

const INDUSTRY_OPTIONS = ['FUEL', 'SPARE_PARTS', 'MAINTENANCE'];
const vehicleFormInit = {
  registrationNumber: '',
  vehicleType: '',
  make: '',
  model: '',
  color: '',
  primaryVehicle: false,
  active: true,
};

const fullName = (customer) => {
  const first = String(customer?.profile?.firstName || '').trim();
  const middle = String(customer?.profile?.middleName || '').trim();
  const last = String(customer?.profile?.lastName || '').trim();
  return [first, middle, last].filter(Boolean).join(' ');
};

const formatMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(numeric);
  } catch {
    return String(numeric);
  }
};

const toneForStatus = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'ACTIVE') return 'green';
  if (status === 'BLOCKED') return 'red';
  if (status === 'CLOSED') return 'gray';
  if (status === 'APPROVED') return 'cyan';
  return 'yellow';
};

const MerchantCustomerDetails = () => {
  const { customerId } = useParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [creditAccounts, setCreditAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(vehicleFormInit);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedIndustryType, setSelectedIndustryType] = useState('FUEL');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [customerData, vehicleData, creditData, loanData] = await Promise.all([
        getOpsResource('customers', customerId),
        listCustomerVehicles(customerId),
        listMerchantCreditAccounts(customerId),
        listGwLoans({ customerId, limit: 100, offset: 0, orderBy: 'appliedAt', sortOrder: 'desc' }),
      ]);
      setCustomer(customerData || null);
      setVehicles((Array.isArray(vehicleData) ? vehicleData : []).map((item) => ({ ...item, id: item?.vehicleId })));
      setCreditAccounts((Array.isArray(creditData) ? creditData : []).map((item) => ({ ...item, id: item?.merchantCreditAccountId })));
      setLoans((Array.isArray(loanData?.items) ? loanData.items : []).map((item) => ({ ...item, id: item?.platformLoanId })));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load merchant customer');
      setCustomer(null);
      setVehicles([]);
      setCreditAccounts([]);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  const eligibleLoans = useMemo(() => {
    return loans.filter((item) => {
      const status = String(item?.status || '').toUpperCase();
      return ['APPROVED', 'ACTIVE', 'DISBURSED'].includes(status);
    });
  }, [loans]);

  useEffect(() => {
    if (!selectedLoanId && eligibleLoans[0]?.platformLoanId) {
      setSelectedLoanId(String(eligibleLoans[0].platformLoanId));
    }
  }, [eligibleLoans, selectedLoanId]);

  const submitVehicle = async (event) => {
    event?.preventDefault?.();
    setSavingVehicle(true);
    setError('');
    try {
      if (editingVehicle?.vehicleId) {
        await patchCustomerVehicle(editingVehicle.vehicleId, {
          registrationNumber: vehicleForm.registrationNumber.trim(),
          vehicleType: vehicleForm.vehicleType.trim(),
          make: vehicleForm.make.trim(),
          model: vehicleForm.model.trim(),
          color: vehicleForm.color.trim(),
          primaryVehicle: !!vehicleForm.primaryVehicle,
          active: !!vehicleForm.active,
        });
        addToast('Vehicle updated', 'success');
      } else {
        await createCustomerVehicle(customerId, {
          registrationNumber: vehicleForm.registrationNumber.trim(),
          vehicleType: vehicleForm.vehicleType.trim(),
          make: vehicleForm.make.trim(),
          model: vehicleForm.model.trim(),
          color: vehicleForm.color.trim(),
          primaryVehicle: !!vehicleForm.primaryVehicle,
          active: !!vehicleForm.active,
        });
        addToast('Vehicle added', 'success');
      }
      setVehicleOpen(false);
      setEditingVehicle(null);
      setVehicleForm(vehicleFormInit);
      await load();
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Save failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingVehicle(false);
    }
  };

  const submitCredit = async (event) => {
    event?.preventDefault?.();
    if (!selectedLoanId) {
      const message = 'Select an eligible loan first.';
      setError(message);
      addToast(message, 'error');
      return;
    }
    setSavingCredit(true);
    setError('');
    try {
      await createMerchantCreditAccountFromLoan(selectedLoanId, { industryType: selectedIndustryType });
      setCreditOpen(false);
      await load();
      addToast('Merchant credit account activated', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Activation failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingCredit(false);
    }
  };

  const openEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      registrationNumber: String(vehicle?.registrationNumber || ''),
      vehicleType: String(vehicle?.vehicleType || ''),
      make: String(vehicle?.make || ''),
      model: String(vehicle?.model || ''),
      color: String(vehicle?.color || ''),
      primaryVehicle: !!vehicle?.primaryVehicle,
      active: vehicle?.active !== false,
    });
    setVehicleOpen(true);
  };

  const vehicleColumns = useMemo(() => [
    {
      key: 'registrationNumber',
      header: 'Vehicle',
      sortable: false,
      render: (row) => (
        <div className="min-w-[160px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.registrationNumber || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.vehicleType || '-'}</div>
        </div>
      ),
    },
    {
      key: 'make',
      header: 'Details',
      sortable: false,
      render: (row) => [row?.make, row?.model, row?.color].filter(Boolean).join(' / ') || '-',
    },
    {
      key: 'primaryVehicle',
      header: 'Primary',
      sortable: false,
      render: (row) => row?.primaryVehicle ? <Badge tone="cyan">PRIMARY</Badge> : '-',
    },
    {
      key: 'active',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={row?.active ? 'green' : 'gray'}>{row?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
            <Button size="sm" variant="ghost" onClick={() => openEditVehicle(row)}>Edit</Button>
          </Can>
        </div>
      ),
    },
  ], []);

  const creditColumns = useMemo(() => [
    {
      key: 'industryType',
      header: 'Industry',
      sortable: false,
      render: (row) => row?.industryType || '-',
    },
    {
      key: 'platformLoanId',
      header: 'Loan',
      sortable: false,
      render: (row) => (
        <div>
          <div>{row?.platformLoanId || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.fineractLoanId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'approvedAmount',
      header: 'Approved',
      sortable: false,
      render: (row) => formatMoney(row?.approvedAmount),
    },
    {
      key: 'consumedAmount',
      header: 'Consumed',
      sortable: false,
      render: (row) => formatMoney(row?.consumedAmount),
    },
    {
      key: 'availableAmount',
      header: 'Available',
      sortable: false,
      render: (row) => formatMoney(row?.availableAmount),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForStatus(row?.status)}>{row?.status || '-'}</Badge>,
    },
  ], []);

  const loanColumns = useMemo(() => [
    {
      key: 'productCode',
      header: 'Loan',
      sortable: false,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.productName || row?.productCode || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.platformLoanId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'principal',
      header: 'Principal',
      sortable: false,
      render: (row) => formatMoney(row?.principal),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForStatus(row?.status)}>{row?.status || '-'}</Badge>,
    },
  ], []);

  const customerName = fullName(customer) || customer?.username || customerId;

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merchant Customer</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{customerName}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/gateway/merchant/customers"><Button variant="secondary">Back</Button></Link>
            <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
            <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
              <Button
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleForm(vehicleFormInit);
                  setVehicleOpen(true);
                }}
              >
                <Plus size={16} /> Add Vehicle
              </Button>
              <Button onClick={() => setCreditOpen(true)}>
                <Plus size={16} /> Activate Credit
              </Button>
            </Can>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs text-slate-500">Customer ID</div><div className="mt-1 text-sm">{customer?.gatewayCustomerId || customer?.platformCustomerId || customerId}</div></div>
          <div><div className="text-xs text-slate-500">Phone</div><div className="mt-1 text-sm">{customer?.profile?.phone || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Category</div><div className="mt-1 text-sm">{customer?.profile?.customerCategory || customer?.profile?.category || '-'}</div></div>
          <div><div className="text-xs text-slate-500">Email</div><div className="mt-1 text-sm">{customer?.profile?.email || '-'}</div></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Vehicles</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Registered vehicles used during merchant redemption.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={vehicleColumns}
            data={vehicles}
            loading={loading}
            total={vehicles.length}
            page={0}
            limit={Math.max(1, vehicles.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No vehicles found"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Merchant Credit Accounts</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Available merchant limits linked to approved gateway loans.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={creditColumns}
            data={creditAccounts}
            loading={loading}
            total={creditAccounts.length}
            page={0}
            limit={Math.max(1, creditAccounts.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No merchant credit accounts found"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Gateway Loans</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Eligible loans can be turned into merchant credit accounts.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={loanColumns}
            data={loans}
            loading={loading}
            total={loans.length}
            page={0}
            limit={Math.max(1, loans.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No loans found"
          />
        </div>
      </Card>

      <Modal
        open={vehicleOpen}
        onClose={() => (savingVehicle ? null : setVehicleOpen(false))}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setVehicleOpen(false)} disabled={savingVehicle}>Cancel</Button>
            <Button onClick={submitVehicle} disabled={savingVehicle}>{savingVehicle ? 'Saving...' : (editingVehicle ? 'Save Vehicle' : 'Add Vehicle')}</Button>
          </>
        )}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitVehicle}>
          <div>
            <label className="block text-sm font-medium">Registration Number</label>
            <input value={vehicleForm.registrationNumber} onChange={(event) => setVehicleForm((prev) => ({ ...prev, registrationNumber: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Vehicle Type</label>
            <input value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm((prev) => ({ ...prev, vehicleType: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Make</label>
            <input value={vehicleForm.make} onChange={(event) => setVehicleForm((prev) => ({ ...prev, make: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Model</label>
            <input value={vehicleForm.model} onChange={(event) => setVehicleForm((prev) => ({ ...prev, model: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Color</label>
            <input value={vehicleForm.color} onChange={(event) => setVehicleForm((prev) => ({ ...prev, color: event.target.value }))} className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={vehicleForm.primaryVehicle} onChange={(event) => setVehicleForm((prev) => ({ ...prev, primaryVehicle: event.target.checked }))} />
            Primary vehicle
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={vehicleForm.active} onChange={(event) => setVehicleForm((prev) => ({ ...prev, active: event.target.checked }))} />
            Active
          </label>
        </form>
      </Modal>

      <Modal
        open={creditOpen}
        onClose={() => (savingCredit ? null : setCreditOpen(false))}
        title="Activate Merchant Credit"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreditOpen(false)} disabled={savingCredit}>Cancel</Button>
            <Button onClick={submitCredit} disabled={savingCredit}>{savingCredit ? 'Activating...' : 'Activate Credit'}</Button>
          </>
        )}
      >
        <form className="grid gap-4" onSubmit={submitCredit}>
          <div>
            <label className="block text-sm font-medium">Eligible Loan</label>
            <select
              value={selectedLoanId}
              onChange={(event) => setSelectedLoanId(event.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Select loan</option>
              {eligibleLoans.map((loan) => (
                <option key={loan.platformLoanId} value={loan.platformLoanId}>
                  {loan.productName || loan.productCode || loan.platformLoanId} | {loan.status} | {formatMoney(loan.principal)}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only approved, active, or disbursed loans can be activated for merchant redemption.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Industry Type</label>
            <select
              value={selectedIndustryType}
              onChange={(event) => setSelectedIndustryType(event.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              {INDUSTRY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MerchantCustomerDetails;
