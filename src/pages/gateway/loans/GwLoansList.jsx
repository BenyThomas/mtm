import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banknote,
  BadgeAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';
import Can from '../../../components/Can';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { applyGwLoanOnBehalf, deleteGwLoan, getGwLoanEligibilityForCustomer, listGwArrearsLoans, listGwLoans } from '../../../api/gateway/loans';
import { listLoanPurposesOps } from '../../../api/gateway/loanPurposes';
import api from '../../../api/axios';
import gatewayApi from '../../../api/gatewayAxios';
import { useToast } from '../../../context/ToastContext';
import { getGwLoanStatusCode, getGwLoanStatusLabel, getGwLoanStatusTone, isGwLoanBlockingStatus } from '../../../utils/gwLoanStatus';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PENDING_DISBURSEMENT', label: 'Pending Disbursement' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'OVERPAID', label: 'Overpaid' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'UPSTREAM_FAILED', label: 'Failed' },
];

const unwrap = (body) => (body && typeof body === 'object' && 'data' in body ? body.data : body);
const normalizeText = (value) => String(value || '').trim().toUpperCase();

const todayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toNumOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const bestEffortTotalRepaymentFromSchedule = (d) => {
  const schedule = d?.repaymentSchedule && typeof d.repaymentSchedule === 'object' ? d.repaymentSchedule : d;
  const periods = Array.isArray(schedule?.periods) ? schedule.periods : [];
  if (!periods.length) return null;

  let total = 0;
  let saw = false;
  for (const p of periods) {
    const periodIdx = toNumOrNull(p?.period);
    if (periodIdx == null || periodIdx <= 0) continue;
    const totalDue =
      toNumOrNull(p?.totalDueForPeriod) ??
      toNumOrNull(p?.totalInstallmentAmountForPeriod) ??
      toNumOrNull(p?.totalInstallmentAmount) ??
      null;
    const principal = toNumOrNull(p?.principalDue) ?? toNumOrNull(p?.principalOriginalDue) ?? 0;
    const interest = toNumOrNull(p?.interestDue) ?? toNumOrNull(p?.interestOriginalDue) ?? 0;
    const fees = toNumOrNull(p?.feeChargesDue) ?? 0;
    const penalty = toNumOrNull(p?.penaltyChargesDue) ?? 0;
    const v = totalDue != null ? totalDue : principal + interest + fees + penalty;
    total += v;
    saw = true;
  }
  return saw ? total : null;
};

const formatMoney = (v) => {
  const n = toNumOrNull(v);
  if (n == null) return '-';
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
};

const resolveEligibilityMatch = (data, productCode) => {
  const products = Array.isArray(data?.eligibleProducts) ? data.eligibleProducts : [];
  const normalizedCode = normalizeText(productCode);
  const match = products.find((item) => normalizeText(item?.productCode) === normalizedCode) || null;
  if (match) return match;
  if (products.length === 1) {
    return {
      ...products[0],
      allowedTenures: Array.isArray(products[0]?.allowedTenures)
        ? products[0].allowedTenures
        : Array.isArray(data?.eligibility?.allowedTenures)
        ? data.eligibility.allowedTenures
        : [],
      tenureUnit: products[0]?.tenureUnit || data?.tenureUnit || data?.eligibility?.tenureUnit,
    };
  }
  return null;
};

const customerLabel = (loan) => {
  const name = String(loan?.customerFullName || loan?.customerName || '').trim();
  const phone = String(loan?.customerPhone || '').trim();
  const customerId = String(loan?.customerId || '').trim();
  return [name || customerId || 'Customer', phone].filter(Boolean).join(' - ');
};

async function poolMap(items, concurrency, fn) {
  const q = Array.isArray(items) ? items.slice() : [];
  const out = [];
  const workers = new Array(Math.max(1, Math.min(concurrency || 1, q.length || 1))).fill(0).map(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const item = q.shift();
      if (item === undefined) return;
      out.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return out;
}

const GwLoansList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [customerNameById, setCustomerNameById] = useState({});
  const [customerPhoneById, setCustomerPhoneById] = useState({});
  const [productNameByCode, setProductNameByCode] = useState({});
  const [totalLoanAmountByPlatformId, setTotalLoanAmountByPlatformId] = useState({});
  const [customerLoanMetaById, setCustomerLoanMetaById] = useState({});
  const [loanPurposes, setLoanPurposes] = useState([]);
  const [selectedCustomerForLoan, setSelectedCustomerForLoan] = useState(null);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanProducts, setLoanProducts] = useState([]);
  const [loanEligibility, setLoanEligibility] = useState(null);
  const [loanEligibilityLoading, setLoanEligibilityLoading] = useState(false);
  const [loanForm, setLoanForm] = useState({
    productCode: '',
    amount: '',
    tenure: '',
    loanPurposeId: '',
    submittedOnDate: todayDateString(),
    expectedDisbursementDate: todayDateString(),
  });

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [branch, setBranch] = useState('');
  const [officer, setOfficer] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dateField, setDateField] = useState('appliedAt');

  // sorting
  const [sortBy, setSortBy] = useState('appliedAt'); // appliedAt | principal | status | customerId | productCode
  const [sortDir, setSortDir] = useState('desc'); // asc | desc

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCustomerId('');
    setProductCode('');
    setBranch('');
    setOfficer('');
    setDate('');
    setFrom('');
    setTo('');
    setDateField('appliedAt');
    setPage(0);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await gatewayApi.get('/ops/products/snapshots');
        const items = Array.isArray(r?.data) ? r.data : [];
        const next = {};
        for (const p of items) {
          const code = p?.code ? String(p.code) : '';
          if (!code) continue;
          next[code] = String(p?.name || code);
        }
        if (mounted) setProductNameByCode(next);
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listLoanPurposesOps({ active: true, limit: 200, offset: 0, orderBy: 'name', sortOrder: 'asc' });
        if (!mounted) return;
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setLoanPurposes(items);
      } catch (_) {
        if (mounted) setLoanPurposes([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const request = {
          q: debouncedSearch || undefined,
          status: status || undefined,
          customerId: customerId || undefined,
          productCode: productCode || undefined,
          branch: branch || undefined,
          officer: officer || undefined,
          date: date || undefined,
          from: from || undefined,
          to: to || undefined,
          dateField: status === 'OVERDUE' && dateField === 'appliedAt' ? 'arrearsAsOf' : dateField,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        };
        const data = status === 'OVERDUE'
          ? await listGwArrearsLoans({
            q: request.q,
            customerId: request.customerId,
            productCode: request.productCode,
            branch: request.branch,
            officer: request.officer,
            date: request.date,
            from: request.from,
            to: request.to,
            dateField: request.dateField,
            offset: request.offset,
            limit: request.limit,
            orderBy: sortBy === 'status' ? 'daysInArrears' : request.orderBy,
            sortOrder: request.sortOrder,
          })
          : await listGwLoans(request);
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((x) => ({ ...x, id: x?.platformLoanId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (e) {
        if (!cancelled) {
          setRows([]);
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
  }, [debouncedSearch, status, customerId, productCode, branch, officer, date, from, to, dateField, page, limit, sortBy, sortDir, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    const rowByCustomerId = new Map();
    for (const r of rows || []) {
      const id = r?.customerId != null ? String(r.customerId) : '';
      if (!id) continue;
      if (!rowByCustomerId.has(id)) rowByCustomerId.set(id, r);
    }

    const ids = Array.from(new Set((rows || []).map((r) => r?.customerId).filter(Boolean))).filter((rawId) => {
      const id = String(rawId);
      const row = rowByCustomerId.get(id);
      // Prefer backend-enriched fields; only lookup if missing.
      const hasName = !!row?.customerFullName;
      const hasPhone = !!row?.customerPhone;
      const needName = !hasName && !(id in (customerNameById || {})); // "in" checks even if value is null
      const needPhone = !hasPhone && !(id in (customerPhoneById || {}));
      return needName || needPhone;
    });
    if (!ids.length) return () => {};

    (async () => {
      const nameUpdates = {};
      const phoneUpdates = {};
      await poolMap(ids, 6, async (id) => {
        try {
          const r = await gatewayApi.get(`/ops/resources/customers/${encodeURIComponent(String(id))}`);
          const c = unwrap(r?.data);
          const first = String(c?.profile?.firstName || '').trim();
          const middle = String(c?.profile?.middleName || '').trim();
          const last = String(c?.profile?.lastName || '').trim();
          const full = [first, middle, last].filter(Boolean).join(' ');
          nameUpdates[String(id)] = full || String(c?.username || id);
          const phone = String(c?.profile?.phone || '').trim();
          // Important: negative-cache "no phone" to avoid retry loops.
          phoneUpdates[String(id)] = phone || null;
        } catch (_) {
          nameUpdates[String(id)] = String(id);
          // Important: negative-cache failures to avoid retry loops.
          phoneUpdates[String(id)] = null;
        }
      });
      if (cancelled) return;
      setCustomerNameById((prev) => ({ ...(prev || {}), ...nameUpdates }));
      setCustomerPhoneById((prev) => ({ ...(prev || {}), ...phoneUpdates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, customerNameById, customerPhoneById]);

  useEffect(() => {
    let cancelled = false;
    const needs = (rows || [])
      .map((r) => ({
        platformLoanId: r?.platformLoanId ? String(r.platformLoanId) : '',
        fineractLoanId: r?.fineractLoanId ? String(r.fineractLoanId) : '',
      }))
      .filter((x) => x.platformLoanId && x.fineractLoanId)
      .filter((x) => !(x.platformLoanId in (totalLoanAmountByPlatformId || {})));
    if (!needs.length) return () => {};

    (async () => {
      const updates = {};
      await poolMap(needs, 4, async ({ platformLoanId, fineractLoanId }) => {
        try {
          const r = await api.get(`/loans/${encodeURIComponent(String(fineractLoanId))}`, {
            params: { associations: 'repaymentSchedule' },
          });
          const d = r?.data;
          const fromSummary =
            toNumOrNull(d?.summary?.totalExpectedRepayment) ??
            toNumOrNull(d?.summary?.totalRepaymentExpected) ??
            toNumOrNull(d?.summary?.totalRepayment) ??
            null;
          const fromSchedule = bestEffortTotalRepaymentFromSchedule(d);
          const val = fromSummary ?? fromSchedule;
          // Negative-cache "unavailable" to avoid repeated refetches.
          updates[platformLoanId] = val ?? null;
        } catch (_) {
          // Negative-cache failures to avoid retry loops.
          updates[platformLoanId] = null;
        }
      });
      if (cancelled) return;
      setTotalLoanAmountByPlatformId((prev) => ({ ...(prev || {}), ...updates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, totalLoanAmountByPlatformId]);

  useEffect(() => {
    let cancelled = false;
    const customerRows = (rows || [])
      .map((row) => {
        const customerId = String(row?.customerId || '').trim();
        return {
          key: customerId,
          lookupId: customerId,
        };
      })
      .filter((item) => item.key && item.lookupId)
      .filter((item) => !(item.key in (customerLoanMetaById || {})));
    if (!customerRows.length) return () => {};

    (async () => {
      const next = {};
      await Promise.all(customerRows.map(async ({ key, lookupId }) => {
        try {
          const data = await listGwLoans({ q: lookupId, limit: 50, offset: 0, orderBy: 'appliedAt', sortOrder: 'desc' });
          const items = Array.isArray(data?.items) ? data.items : [];
          const blocking = items.find((item) => isGwLoanBlockingStatus(item));
          next[key] = {
            blocked: !!blocking,
            reason: blocking ? `Blocked by ${getGwLoanStatusLabel(blocking)}` : '',
          };
        } catch (_) {
          next[key] = { blocked: false, reason: '' };
        }
      }));
      if (!cancelled) {
        setCustomerLoanMetaById((prev) => ({ ...(prev || {}), ...next }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, customerLoanMetaById]);

  useEffect(() => {
    let cancelled = false;
    const customerId = String(selectedCustomerForLoan?.customerId || '').trim();
    if (!loanOpen || !customerId) {
      setLoanProducts([]);
      setLoanEligibility(null);
      setLoanEligibilityLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const data = await getGwLoanEligibilityForCustomer(customerId, {});
        if (cancelled) return;
        const items = Array.isArray(data?.eligibleProducts) ? data.eligibleProducts : [];
        setLoanProducts(items.filter((item) => item?.productCode));
        setLoanForm((prev) => ({
          ...prev,
          productCode: prev.productCode || String(items?.[0]?.productCode || ''),
        }));
      } catch (_) {
        if (!cancelled) setLoanProducts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loanOpen, selectedCustomerForLoan]);

  useEffect(() => {
    let cancelled = false;
    const customerId = String(selectedCustomerForLoan?.customerId || '').trim();
    const amount = Number(loanForm.amount);
    const productCode = String(loanForm.productCode || '').trim();
    if (!loanOpen || !customerId || !productCode || !(amount > 0)) {
      setLoanEligibility(null);
      setLoanEligibilityLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoanEligibilityLoading(true);

    (async () => {
      try {
        let data = await getGwLoanEligibilityForCustomer(customerId, {
          productCode,
          requestedAmount: amount,
        });
        if (cancelled) return;
        let resolved = resolveEligibilityMatch(data, productCode);
        if (!resolved) {
          data = await getGwLoanEligibilityForCustomer(customerId, { productCode });
          if (cancelled) return;
          resolved = resolveEligibilityMatch(data, productCode);
        }
        setLoanEligibility(resolved);
      } catch (_) {
        if (!cancelled) setLoanEligibility(null);
      } finally {
        if (!cancelled) setLoanEligibilityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loanOpen, selectedCustomerForLoan, loanForm.productCode, loanForm.amount]);

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
    if (!window.confirm('Delete this platform loan record? This cannot be undone.')) return;
    try {
      await deleteGwLoan(row?.platformLoanId);
      addToast('Platform loan deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const openCustomerLoanModal = (row, e) => {
    e?.stopPropagation?.();
    setSelectedCustomerForLoan(row || null);
    setLoanProducts([]);
    setLoanEligibility(null);
    setLoanForm({
      productCode: '',
      amount: '',
      tenure: '',
      loanPurposeId: '',
      submittedOnDate: todayDateString(),
      expectedDisbursementDate: todayDateString(),
    });
    setLoanOpen(true);
  };

  const submitLoanOnBehalf = async () => {
    const customerId = String(selectedCustomerForLoan?.customerId || '').trim();
    if (!customerId) {
      addToast('Customer mapping is missing', 'error');
      return;
    }
    if (!loanForm.productCode || !(Number(loanForm.amount) > 0) || !(Number(loanForm.tenure) > 0)) {
      addToast('Select product, amount, and tenure', 'error');
      return;
    }

    setLoanSaving(true);
    try {
      const eligibilityData = await getGwLoanEligibilityForCustomer(customerId, {
        productCode: loanForm.productCode,
        requestedAmount: Number(loanForm.amount),
      });
      const resolvedEligibility = resolveEligibilityMatch(eligibilityData, loanForm.productCode)
        || resolveEligibilityMatch(await getGwLoanEligibilityForCustomer(customerId, {
          productCode: loanForm.productCode,
        }), loanForm.productCode);
      const allowedTenures = Array.isArray(resolvedEligibility?.allowedTenures)
        ? resolvedEligibility.allowedTenures.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
        : [];
      const requestedTenure = Number(loanForm.tenure);
      if (allowedTenures.length > 0 && !allowedTenures.includes(requestedTenure)) {
        addToast(`Tenure ${requestedTenure} is not allowed. Allowed: ${allowedTenures.join(', ')}`, 'error');
        return;
      }

      const loan = await applyGwLoanOnBehalf(customerId, {
        productCode: loanForm.productCode,
        amount: Number(loanForm.amount),
        tenure: requestedTenure,
        tenureUnit: resolvedEligibility?.tenureUnit || loanEligibility?.tenureUnit || undefined,
        loanPurposeId: loanForm.loanPurposeId ? Number(loanForm.loanPurposeId) : undefined,
        submittedOnDate: loanForm.submittedOnDate || todayDateString(),
        expectedDisbursementDate: loanForm.expectedDisbursementDate || todayDateString(),
      });
      setLoanOpen(false);
      addToast('Loan application submitted', 'success');
      setRefreshTick((tick) => tick + 1);
      if (loan?.platformLoanId) {
        navigate(`/gateway/loans/${encodeURIComponent(loan.platformLoanId)}`);
      }
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0]?.details || err?.response?.data?.message || err?.message || 'Loan application failed', 'error');
    } finally {
      setLoanSaving(false);
    }
  };

  const loanPurposeOptions = loanPurposes
    .map((item) => ({
      value: String(item?.fineractCodeValueId || item?.loanPurposeId || ''),
      label: `${item?.name || item?.code || 'Purpose'}`,
    }))
    .filter((item) => item.value);

  const tenureOptions = Array.isArray(loanEligibility?.allowedTenures)
    ? loanEligibility.allowedTenures
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];

  const pageStats = useMemo(() => {
    const active = rows.filter((row) => getGwLoanStatusCode(row) === 'ACTIVE').length;
    const pending = rows.filter((row) =>
      ['PENDING_APPROVAL', 'PENDING_DISBURSEMENT', 'SUBMITTED', 'APPROVED'].includes(getGwLoanStatusCode(row))
    ).length;
    const overdue = rows.filter((row) => getGwLoanStatusCode(row) === 'OVERDUE').length;
    const principal = rows.reduce((sum, row) => sum + (toNumOrNull(row?.principal) || 0), 0);
    return { active, pending, overdue, principal };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total ? page * limit + 1 : 0;
  const rangeEnd = Math.min((page + 1) * limit, total);
  const pageNumbers = Array.from(new Set([0, 1, 2, 3, 4, totalPages - 1]))
    .filter((number) => number >= 0 && number < totalPages);

  const loanInitials = (row) => String(row?.customerFullName || row?.customerId || 'LN')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const columns = useMemo(
    () => [
      {
        key: 'customerId',
        header: 'Name',
        sortable: true,
        render: (r) => {
          const id = r?.customerId ? String(r.customerId) : '';
          const name = String(r?.customerFullName || '---');
          const phone = String(r?.customerPhone || '---');
          return (
            <div className="min-w-[160px]">
              <div className="font-medium text-slate-900 dark:text-slate-50">{name || id || '-'}</div>
            </div>
          );
        },
      },
      {
        key: 'customerPhone',
        header: 'Phone',
        sortable: false,
        render: (r) => {
          const id = r?.customerId ? String(r.customerId) : '';
          return String(r?.customerPhone || '') || (id ? customerPhoneById?.[id] : '') || '-';
        },
      },
      {
        key: 'productCode',
        header: 'Loan Product',
        sortable: true,
        render: (r) => {
          const code = r?.productCode ? String(r.productCode) : '';
          const name = code ? productNameByCode?.[code] : '';
          return (
            <div className="min-w-[160px]">
              <div className="font-medium text-slate-900 dark:text-slate-50">{name || code || '-'}</div>
              {code ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{code}</div> : null}
            </div>
          );
        },
      },
      {
        key: 'principal',
        header: 'Principal',
        sortable: true,
        render: (r) => formatMoney(r?.principal),
      },
      {
        key: 'tenureMonths',
        header: 'Tenure',
        sortable: true,
        render: (r) => (r?.tenureMonths ?? '-') + '',
      },
      {
        key: 'totalLoanAmount',
        header: 'Total Loan Amount',
        sortable: false,
        render: (r) => {
          const id = r?.platformLoanId ? String(r.platformLoanId) : '';
          const v = id ? totalLoanAmountByPlatformId?.[id] : null;
          return formatMoney(v);
        },
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => {
          const displayStatus = status === 'OVERDUE' ? 'Overdue' : getGwLoanStatusLabel(r);
          const tone = status === 'OVERDUE' ? getGwLoanStatusTone('OVERDUE') : getGwLoanStatusTone(r);
          return <Badge tone={tone}>{displayStatus}</Badge>;
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => {
          const customerId = String(r?.customerId || '').trim();
          const loanMeta = customerId ? customerLoanMetaById?.[customerId] : null;
          const canApplyOnBehalf = Boolean(customerId) && loanMeta && !loanMeta.blocked;
          return (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Link to={`/gateway/loans/${encodeURIComponent(r?.platformLoanId)}`} title="View">
              <Button size="sm" variant="ghost" className="px-2" aria-label="View">
                <Eye size={16} />
              </Button>
            </Link>
            <Can any={['GW_OPS_WRITE']}>
              <Link to={`/gateway/loans/${encodeURIComponent(r?.platformLoanId)}`} title="Edit">
                <Button size="sm" variant="ghost" className="px-2" aria-label="Edit">
                  <Pencil size={16} />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={(e) => doDelete(r, e)}
                disabled={!r?.platformLoanId}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            </Can>
          </div>
          );
        },
      },
    ],
    [customerLoanMetaById, doDelete, customerNameById, customerPhoneById, productNameByCode, totalLoanAmountByPlatformId]
  );

  const onRowClick = (row) => {
    if (!row?.platformLoanId) return;
    navigate(`/gateway/loans/${encodeURIComponent(row.platformLoanId)}`);
  };

  return (
    <div className="customer-directory-page loan-directory-page">
      <section className="customer-panel customer-filter-panel">
        <div className="loan-filter-row">
          <label className="customer-search-box">
            <Search size={19} color="#5c6a86" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Loan ID, Customer, Phone or Product"
            />
          </label>
          <label className="customer-select">
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label === 'All' ? 'Status' : option.label}</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPage(0); }} placeholder="Customer ID" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input value={productCode} onChange={(event) => { setProductCode(event.target.value); setPage(0); }} placeholder="Product Code" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input value={branch} onChange={(event) => { setBranch(event.target.value); setPage(0); }} placeholder="Branch" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input value={officer} onChange={(event) => { setOfficer(event.target.value); setPage(0); }} placeholder="Officer" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(0); }} title="Exact date" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} title="From date" />
          </label>
          <label className="customer-search-box loan-compact-filter">
            <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} title="To date" />
          </label>
          <label className="customer-select loan-compact-filter">
            <select value={dateField} onChange={(event) => { setDateField(event.target.value); setPage(0); }}>
              <option value="appliedAt">Applied</option>
              <option value="approvedAt">Approved</option>
              <option value="disbursedAt">Disbursed</option>
              <option value="closedAt">Closed</option>
              <option value="nextDueDate">Next Due</option>
              <option value="arrearsAsOf">Arrears As Of</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select loan-row-limit">
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }}>
              {PAGE_SIZE_OPTIONS.map((number) => <option key={number} value={number}>{number} rows</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
          <button type="button" className="customer-reset" onClick={clearFilters}><RefreshCw size={16} />Reset</button>
        </div>

        <div className="customer-stat-grid">
          <div className="customer-stat-card">
            <div className="customer-stat-icon blue"><Banknote /></div>
            <div><div className="customer-stat-label">Total Loans</div><div className="customer-stat-value">{total.toLocaleString()}</div><div className="customer-stat-note">All matching platform loans</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon green"><WalletCards /></div>
            <div><div className="customer-stat-label">Active Loans</div><div className="customer-stat-value">{pageStats.active.toLocaleString()}</div><div className="customer-stat-note">Active on this page</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon orange"><Clock3 /></div>
            <div><div className="customer-stat-label">Pending Workflow</div><div className="customer-stat-value">{pageStats.pending.toLocaleString()}</div><div className="customer-stat-note">Awaiting approval or disbursement</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon purple"><BadgeAlert /></div>
            <div><div className="customer-stat-label">Page Principal</div><div className="customer-stat-value">TSh {formatMoney(pageStats.principal)}</div><div className="customer-stat-note">{pageStats.overdue} overdue loan(s)</div></div>
          </div>
        </div>
      </section>

      <section className="customer-panel customer-directory-card">
        <div className="customer-section-title">Loan Directory</div>
        <div className="customer-table-scroll">
          <table className="customer-directory-table loan-directory-table">
            <thead>
              <tr>
                <th>Customer</th><th>Phone</th><th>Loan Product</th><th>Principal</th><th>Tenure</th><th>Total Loan Amount</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Loading loans...</td></tr>
              ) : rows.length ? rows.map((row) => {
                const id = String(row?.customerId || '');
                const name = String(row?.customerFullName || customerNameById?.[id] || id || '-');
                const phone = String(row?.customerPhone || customerPhoneById?.[id] || '-');
                const code = String(row?.productCode || '');
                const totalAmount = totalLoanAmountByPlatformId?.[String(row?.platformLoanId || '')];
                return (
                  <tr key={row?.platformLoanId} onClick={() => onRowClick(row)}>
                    <td>
                      <div className="customer-identity">
                        <div className="customer-initials">{loanInitials(row)}</div>
                        <div>
                          <div className="customer-name">{name}</div>
                          <div className="customer-wallet">Loan: {row?.fineractLoanId || row?.platformLoanId || '-'}</div>
                          <div className="customer-row-links"><span className="customer-mini-link"><Eye size={10} />Details</span></div>
                        </div>
                      </div>
                    </td>
                    <td>{phone}</td>
                    <td><div className="customer-name">{productNameByCode?.[code] || code || '-'}</div>{code ? <div className="customer-wallet">{code}</div> : null}</td>
                    <td className="customer-money">TSh {formatMoney(row?.principal)}</td>
                    <td>{row?.tenureMonths ?? '-'}</td>
                    <td>TSh {formatMoney(totalAmount)}</td>
                    <td><Badge tone={status === 'OVERDUE' ? getGwLoanStatusTone('OVERDUE') : getGwLoanStatusTone(row)}>{status === 'OVERDUE' ? 'Overdue' : getGwLoanStatusLabel(row)}</Badge></td>
                    <td>
                      <div className="loan-row-actions">
                        <button type="button" className="customer-view-button" onClick={(event) => { event.stopPropagation(); onRowClick(row); }}>View</button>
                        <Can any={['GW_OPS_WRITE']}>
                          <button type="button" className="loan-delete-button" title="Delete" onClick={(event) => doDelete(row, event)} disabled={!row?.platformLoanId}><Trash2 size={15} /></button>
                        </Can>
                        <MoreVertical size={17} />
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan="8">No platform loans found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="customer-directory-footer">
          <span>Showing {rangeStart} to {rangeEnd} of {total.toLocaleString()} loans</span>
          <div className="customer-pagination">
            <button className="customer-page-button" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            {pageNumbers.map((number, index) => (
              <React.Fragment key={number}>
                {index > 0 && number - pageNumbers[index - 1] > 1 ? <span>...</span> : null}
                <button className={`customer-page-button ${number === page ? 'active' : ''}`} onClick={() => setPage(number)}>{number + 1}</button>
              </React.Fragment>
            ))}
            <button className="customer-page-button" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <Modal
        open={loanOpen}
        onClose={() => {
          if (!loanSaving) setLoanOpen(false);
        }}
        title="Apply Loan On Behalf"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setLoanOpen(false)} disabled={loanSaving}>
              Cancel
            </Button>
            <Button onClick={submitLoanOnBehalf} disabled={loanSaving}>
              {loanSaving ? 'Submitting...' : 'Submit Loan'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-slate-700/70 dark:bg-slate-900/50">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{customerLabel(selectedCustomerForLoan)}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedCustomerForLoan?.customerId || '-'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Loan Product
            </label>
            <select
              value={loanForm.productCode}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, productCode: e.target.value, tenure: '' }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">{loanProducts.length ? 'Select product' : 'No eligible products'}</option>
              {loanProducts.map((item) => (
                <option key={String(item?.productCode || '')} value={String(item?.productCode || '')}>
                  {item?.productName || item?.name || item?.productCode || 'Product'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Loan Purpose
            </label>
            <select
              value={loanForm.loanPurposeId}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, loanPurposeId: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Select purpose</option>
              {loanPurposeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Submitted On Date
            </label>
            <input
              type="date"
              value={loanForm.submittedOnDate}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, submittedOnDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Expected Disbursement Date
            </label>
            <input
              type="date"
              value={loanForm.expectedDisbursementDate}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, expectedDisbursementDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Amount
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={loanForm.amount}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tenure
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={loanForm.tenure}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, tenure: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {loanEligibilityLoading
                ? 'Checking allowed tenures for the selected amount.'
                : tenureOptions.length
                ? `Allowed: ${tenureOptions.join(', ')} ${loanEligibility?.tenureUnit || ''}`.trim()
                : loanEligibility?.tenureUnit
                ? `Tenure unit: ${loanEligibility.tenureUnit}`
                : 'Select product and amount to load allowed tenures.'}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GwLoansList;
