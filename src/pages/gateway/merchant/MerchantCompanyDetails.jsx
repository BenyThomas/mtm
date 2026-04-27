import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Plus, Send } from 'lucide-react';
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
  failMerchantSettlementBatch,
  getMerchantCompany,
  getMerchantSettlementBatchDetail,
  getMerchantSettlementExposureSummary,
  listMerchantAttendants,
  listMerchantOutlets,
  listMerchantSettlementBatches,
  listMerchantTransactions,
  payMerchantSettlementBatch,
  createMerchantSettlementBatch,
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

const settlementFormInit = {
  note: '',
};

const payFormInit = {
  paymentReference: '',
  note: '',
};

const failFormInit = {
  reason: '',
};

const toneForActive = (value) => (value ? 'green' : 'gray');
const formatLabel = (value) => String(value || '-').replaceAll('_', ' ');
const PAGE_SIZE = 10;

const toneForStatus = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'PAID') return 'green';
  if (status === 'FAILED') return 'red';
  if (status === 'CREATED') return 'yellow';
  if (status === 'CONFIRMED') return 'cyan';
  if (status === 'REVERSED') return 'gray';
  return 'gray';
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
  const [transactions, setTransactions] = useState([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [settlementBatches, setSettlementBatches] = useState([]);
  const [settlementBatchesTotal, setSettlementBatchesTotal] = useState(0);
  const [exposureSummary, setExposureSummary] = useState(null);
  const [transactionPage, setTransactionPage] = useState(0);
  const [settlementPage, setSettlementPage] = useState(0);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
  const [batchDetailOpen, setBatchDetailOpen] = useState(false);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [payBatchOpen, setPayBatchOpen] = useState(false);
  const [failBatchOpen, setFailBatchOpen] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [settlementForm, setSettlementForm] = useState(settlementFormInit);
  const [payForm, setPayForm] = useState(payFormInit);
  const [failForm, setFailForm] = useState(failFormInit);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companyData, outletData, attendantData, transactionData, batchData, exposureData] = await Promise.all([
        getMerchantCompany(merchantCompanyId),
        listMerchantOutlets({ merchantCompanyId, limit: 200, offset: 0 }),
        listMerchantAttendants({ limit: 200, offset: 0 }),
        listMerchantTransactions({
          merchantCompanyId,
          limit: PAGE_SIZE,
          offset: transactionPage * PAGE_SIZE,
        }),
        listMerchantSettlementBatches({
          merchantCompanyId,
          limit: PAGE_SIZE,
          offset: settlementPage * PAGE_SIZE,
        }),
        getMerchantSettlementExposureSummary({ merchantCompanyId }),
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
      const transactionItems = Array.isArray(transactionData?.items) ? transactionData.items : [];
      setTransactions(transactionItems.map((item) => ({ ...item, id: item?.merchantTransactionId })));
      setTransactionsTotal(Number(transactionData?.total || transactionItems.length || 0));
      const batchItems = Array.isArray(batchData?.items) ? batchData.items : [];
      setSettlementBatches(batchItems.map((item) => ({ ...item, id: item?.merchantSettlementBatchId })));
      setSettlementBatchesTotal(Number(batchData?.total || batchItems.length || 0));
      setExposureSummary(exposureData || null);
      if (!selectedOutletId && outletItems[0]?.merchantOutletId) {
        setSelectedOutletId(String(outletItems[0].merchantOutletId));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load merchant company');
      setCompany(null);
      setOutlets([]);
      setAttendants([]);
      setTransactions([]);
      setTransactionsTotal(0);
      setSettlementBatches([]);
      setSettlementBatchesTotal(0);
      setExposureSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [merchantCompanyId, transactionPage, settlementPage]);

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

  const openBatchDetail = async (merchantSettlementBatchId) => {
    if (!merchantSettlementBatchId) return;
    try {
      const detail = await getMerchantSettlementBatchDetail(merchantSettlementBatchId);
      setSelectedBatchDetail(detail || null);
      setBatchDetailOpen(true);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Failed to load settlement batch detail', 'error');
    }
  };

  const submitCreateBatch = async (event) => {
    event?.preventDefault?.();
    setSavingBatch(true);
    setError('');
    try {
      await createMerchantSettlementBatch({
        merchantCompanyId,
        note: settlementForm.note.trim() || undefined,
      });
      setCreateBatchOpen(false);
      setSettlementForm(settlementFormInit);
      setSettlementPage(0);
      await load();
      addToast('Settlement batch created', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Batch creation failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingBatch(false);
    }
  };

  const submitPayBatch = async (event) => {
    event?.preventDefault?.();
    if (!selectedBatch?.merchantSettlementBatchId) return;
    setSavingBatch(true);
    setError('');
    try {
      await payMerchantSettlementBatch(selectedBatch.merchantSettlementBatchId, {
        paymentReference: payForm.paymentReference.trim(),
        note: payForm.note.trim() || undefined,
      });
      setPayBatchOpen(false);
      setSelectedBatch(null);
      setPayForm(payFormInit);
      await load();
      addToast('Settlement batch marked paid', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Batch payment update failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingBatch(false);
    }
  };

  const submitFailBatch = async (event) => {
    event?.preventDefault?.();
    if (!selectedBatch?.merchantSettlementBatchId) return;
    setSavingBatch(true);
    setError('');
    try {
      await failMerchantSettlementBatch(selectedBatch.merchantSettlementBatchId, {
        reason: failForm.reason.trim(),
      });
      setFailBatchOpen(false);
      setSelectedBatch(null);
      setFailForm(failFormInit);
      await load();
      addToast('Settlement batch marked failed', 'success');
    } catch (e) {
      const message = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Batch failure update failed';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSavingBatch(false);
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

  const transactionColumns = useMemo(() => [
    {
      key: 'merchantTransactionId',
      header: 'Transaction',
      sortable: false,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.merchantTransactionId || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.merchantOutletName || row?.merchantOutletId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'customerId',
      header: 'Customer',
      sortable: false,
      render: (row) => row?.customerId || '-',
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: false,
      render: (row) => formatMoney(row?.amount),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForStatus(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'settled',
      header: 'Settlement',
      sortable: false,
      render: (row) => (
        row?.settled
          ? <Badge tone="green">{row?.settlementBatchId ? `SETTLED ${row.settlementBatchId}` : 'SETTLED'}</Badge>
          : <Badge tone="yellow">UNSETTLED</Badge>
      ),
    },
  ], []);

  const settlementColumns = useMemo(() => [
    {
      key: 'merchantSettlementBatchId',
      header: 'Batch',
      sortable: false,
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{row?.merchantSettlementBatchId || '-'}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row?.createdAt || '-'}</div>
        </div>
      ),
    },
    {
      key: 'transactionCount',
      header: 'Transactions',
      sortable: false,
      render: (row) => row?.transactionCount ?? '-',
    },
    {
      key: 'grossAmount',
      header: 'Gross Amount',
      sortable: false,
      render: (row) => formatMoney(row?.grossAmount),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={toneForStatus(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openBatchDetail(row?.merchantSettlementBatchId)}>
            <Eye size={14} /> View
          </Button>
          <Can any={['GW_OPS_WRITE', 'GW_OPS_ALL', 'UPDATE_CONFIGURATION', 'CREATE_CONFIGURATION']}>
            {String(row?.status || '').toUpperCase() === 'CREATED' ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedBatch(row);
                    setPayForm(payFormInit);
                    setPayBatchOpen(true);
                  }}
                >
                  Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setSelectedBatch(row);
                    setFailForm(failFormInit);
                    setFailBatchOpen(true);
                  }}
                >
                  Fail
                </Button>
              </>
            ) : null}
          </Can>
        </div>
      ),
    },
  ], []);

  const selectedOutlet = outlets.find((item) => String(item?.merchantOutletId) === String(selectedOutletId)) || null;
  const exposureCompany = useMemo(() => {
    const items = Array.isArray(exposureSummary?.byCompany) ? exposureSummary.byCompany : [];
    return items.find((item) => String(item?.merchantCompanyId || '') === String(merchantCompanyId)) || null;
  }, [exposureSummary, merchantCompanyId]);
  const batchDetailItems = Array.isArray(selectedBatchDetail?.transactions) ? selectedBatchDetail.transactions : [];

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
              <Button
                variant="secondary"
                onClick={() => {
                  setSettlementForm(settlementFormInit);
                  setCreateBatchOpen(true);
                }}
              >
                <Plus size={16} /> Create Settlement Batch
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs text-slate-500">Unsettled Transactions</div><div className="mt-1 text-lg font-semibold">{exposureCompany?.transactionCount ?? 0}</div></div>
          <div><div className="text-xs text-slate-500">Unsettled Amount</div><div className="mt-1 text-lg font-semibold">{formatMoney(exposureCompany?.unsettledAmount ?? 0)}</div></div>
          <div><div className="text-xs text-slate-500">Settlement Batches</div><div className="mt-1 text-lg font-semibold">{settlementBatchesTotal}</div></div>
          <div><div className="text-xs text-slate-500">Industries</div><div className="mt-1 text-sm">{(exposureCompany?.industryTypes || [company?.industryType]).filter(Boolean).join(', ') || '-'}</div></div>
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

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Merchant Transactions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Latest company redemption activity and settlement status.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={transactionColumns}
            data={transactions}
            loading={loading}
            total={transactionsTotal}
            page={transactionPage}
            limit={PAGE_SIZE}
            onPageChange={setTransactionPage}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No merchant transactions found"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Settlement Batches</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Bulk payment batches created for this merchant company.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={settlementColumns}
            data={settlementBatches}
            loading={loading}
            total={settlementBatchesTotal}
            page={settlementPage}
            limit={PAGE_SIZE}
            onPageChange={setSettlementPage}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No settlement batches found"
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

      <Modal
        open={createBatchOpen}
        onClose={() => (savingBatch ? null : setCreateBatchOpen(false))}
        title="Create Settlement Batch"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateBatchOpen(false)} disabled={savingBatch}>Cancel</Button>
            <Button onClick={submitCreateBatch} disabled={savingBatch}>{savingBatch ? 'Creating...' : 'Create Batch'}</Button>
          </>
        )}
      >
        <form className="grid gap-4" onSubmit={submitCreateBatch}>
          <div>
            <label className="block text-sm font-medium">Merchant Company</label>
            <input value={company?.name || merchantCompanyId} readOnly className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Note</label>
            <textarea
              value={settlementForm.note}
              onChange={(event) => setSettlementForm((prev) => ({ ...prev, note: event.target.value }))}
              className="mt-1 min-h-[110px] w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Optional batch note"
            />
          </div>
          <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-600/80 dark:bg-slate-800/40 dark:text-slate-300">
            The backend will automatically include eligible unsettled confirmed transactions for this merchant company.
          </div>
        </form>
      </Modal>

      <Modal
        open={payBatchOpen}
        onClose={() => (savingBatch ? null : setPayBatchOpen(false))}
        title="Mark Settlement Batch Paid"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPayBatchOpen(false)} disabled={savingBatch}>Cancel</Button>
            <Button onClick={submitPayBatch} disabled={savingBatch}>{savingBatch ? 'Saving...' : 'Mark Paid'}</Button>
          </>
        )}
      >
        <form className="grid gap-4" onSubmit={submitPayBatch}>
          <div>
            <label className="block text-sm font-medium">Settlement Batch</label>
            <input value={selectedBatch?.merchantSettlementBatchId || ''} readOnly className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment Reference</label>
            <input
              value={payForm.paymentReference}
              onChange={(event) => setPayForm((prev) => ({ ...prev, paymentReference: event.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Note</label>
            <textarea
              value={payForm.note}
              onChange={(event) => setPayForm((prev) => ({ ...prev, note: event.target.value }))}
              className="mt-1 min-h-[110px] w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Optional payment note"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={failBatchOpen}
        onClose={() => (savingBatch ? null : setFailBatchOpen(false))}
        title="Mark Settlement Batch Failed"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setFailBatchOpen(false)} disabled={savingBatch}>Cancel</Button>
            <Button variant="danger" onClick={submitFailBatch} disabled={savingBatch}>{savingBatch ? 'Saving...' : 'Mark Failed'}</Button>
          </>
        )}
      >
        <form className="grid gap-4" onSubmit={submitFailBatch}>
          <div>
            <label className="block text-sm font-medium">Settlement Batch</label>
            <input value={selectedBatch?.merchantSettlementBatchId || ''} readOnly className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium">Failure Reason</label>
            <textarea
              value={failForm.reason}
              onChange={(event) => setFailForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="mt-1 min-h-[110px] w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Reason for failure"
              required
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={batchDetailOpen}
        onClose={() => setBatchDetailOpen(false)}
        title="Settlement Batch Detail"
        size="6xl"
        footer={(
          <Button variant="secondary" onClick={() => setBatchDetailOpen(false)}>Close</Button>
        )}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><div className="text-xs text-slate-500">Batch ID</div><div className="mt-1 text-sm">{selectedBatchDetail?.batch?.merchantSettlementBatchId || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Status</div><div className="mt-1 text-sm"><Badge tone={toneForStatus(selectedBatchDetail?.batch?.status)}>{selectedBatchDetail?.batch?.status || '-'}</Badge></div></div>
            <div><div className="text-xs text-slate-500">Gross Amount</div><div className="mt-1 text-sm">{formatMoney(selectedBatchDetail?.summary?.grossAmount)}</div></div>
            <div><div className="text-xs text-slate-500">Outstanding</div><div className="mt-1 text-sm">{formatMoney(selectedBatchDetail?.summary?.outstandingAmount)}</div></div>
          </div>
          <DataTable
            columns={[
              { key: 'merchantTransactionId', header: 'Transaction', sortable: false, render: (row) => row?.merchantTransactionId || '-' },
              { key: 'customerId', header: 'Customer', sortable: false, render: (row) => row?.customerId || '-' },
              { key: 'amount', header: 'Amount', sortable: false, render: (row) => formatMoney(row?.amount) },
              { key: 'status', header: 'Status', sortable: false, render: (row) => <Badge tone={toneForStatus(row?.status)}>{row?.status || '-'}</Badge> },
              { key: 'settled', header: 'Settled', sortable: false, render: (row) => row?.settled ? 'Yes' : 'No' },
            ]}
            data={batchDetailItems.map((item) => ({ ...item, id: item?.merchantTransactionId }))}
            loading={false}
            total={batchDetailItems.length}
            page={0}
            limit={Math.max(1, batchDetailItems.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            emptyMessage="No transactions in this batch"
          />
        </div>
      </Modal>
    </div>
  );
};

export default MerchantCompanyDetails;
