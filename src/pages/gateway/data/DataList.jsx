import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';
import Tabs from '../../../components/Tabs';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { createOpsResource, deleteOpsResource, listOpsResources, updateOpsResource } from '../../../api/gateway/opsResources';
import { applyGwLoanOnBehalf, getGwLoanEligibilityForCustomer, listGwLoans } from '../../../api/gateway/loans';
import { listLoanPurposesOps } from '../../../api/gateway/loanPurposes';
import Can from '../../../components/Can';
import { Pencil, Send, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import InvitesList from '../invites/InvitesList';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TENURE_UNITS = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
const CREATE_FORM_SCHEMAS = {
  'score-band-policies': {
    title: 'Score Band Policy',
    fields: [
      { key: 'bandCode', label: 'Band Code', type: 'text', required: true, placeholder: 'D, C1, B2, A+' },
      { key: 'minScore', label: 'Min Score', type: 'number', required: true, placeholder: '300' },
      { key: 'maxScore', label: 'Max Score', type: 'number', required: true, placeholder: '399' },
      { key: 'eligibilityStatus', label: 'Eligibility Status', type: 'text', required: true, placeholder: 'Provisional' },
      { key: 'maxEligibleAmount', label: 'Max Eligible Amount', type: 'decimal', required: true, placeholder: '12000' },
      { key: 'maxTenure', label: 'Max Tenure', type: 'number', required: true, placeholder: '1' },
      { key: 'tenureUnit', label: 'Tenure Unit', type: 'select', options: TENURE_UNITS, required: true, defaultValue: 'WEEKS' },
      { key: 'maxRepayments', label: 'Max Repayments', type: 'number', required: true, placeholder: '1' },
      { key: 'allowsProvisional', label: 'Allows Provisional', type: 'boolean', defaultValue: true },
      { key: 'requiresManualReview', label: 'Requires Manual Review', type: 'boolean', defaultValue: false },
      { key: 'active', label: 'Active', type: 'boolean', defaultValue: true },
    ],
  },
  'loan-product-policies': {
    title: 'Loan Product Policy',
    fields: [
      { key: 'productCode', label: 'Product Code', type: 'text', required: true, placeholder: 'QUICK_LOAN' },
      { key: 'productName', label: 'Product Name', type: 'text', required: true, placeholder: 'Quick Loan' },
      { key: 'minScore', label: 'Min Score', type: 'number', required: true, placeholder: '300' },
      { key: 'maxProductAmount', label: 'Max Product Amount', type: 'decimal', required: true, placeholder: '20000' },
      { key: 'maxTenure', label: 'Max Tenure', type: 'number', required: true, placeholder: '3' },
      { key: 'tenureUnit', label: 'Tenure Unit', type: 'select', options: TENURE_UNITS, required: true, defaultValue: 'WEEKS' },
      { key: 'maxRepayments', label: 'Max Repayments', type: 'number', required: true, placeholder: '3' },
      { key: 'allowedStatuses', label: 'Allowed Statuses', type: 'tags', placeholder: 'Provisional,Restricted,Eligible,Preferred' },
      { key: 'allowedCustomerSegments', label: 'Allowed Customer Segments', type: 'tags', placeholder: 'SALARIED,BUSINESS' },
      { key: 'active', label: 'Active', type: 'boolean', defaultValue: true },
    ],
  },
  'borrower-scores': {
    title: 'Borrower Score',
    fields: [
      { key: 'customerId', label: 'Customer', type: 'text', required: true, placeholder: 'Select a customer' },
      { key: 'score', label: 'Score', type: 'number', required: true, placeholder: '640' },
      { key: 'scoreBand', label: 'Score Band', type: 'text', placeholder: 'B3' },
      { key: 'eligibilityStatus', label: 'Eligibility Status', type: 'text', placeholder: 'Eligible' },
      { key: 'version', label: 'Version', type: 'number', placeholder: '1' },
      { key: 'scoreBreakdown', label: 'Score Breakdown (JSON object)', type: 'json', placeholder: '{ "repaymentHistory": 134.75 }' },
      { key: 'contextBreakdown', label: 'Context Breakdown (JSON array)', type: 'json', placeholder: '[{ "contextCode":"repaymentHistory","maxPoints":192.5,"earnedPoints":134.75 }]' },
      { key: 'active', label: 'Active', type: 'boolean', defaultValue: true },
    ],
  },
  'borrower-eligibility-results': {
    title: 'Borrower Eligibility Result',
    fields: [
      { key: 'customerId', label: 'Customer', type: 'text', required: true, placeholder: 'Select a customer' },
      { key: 'score', label: 'Score', type: 'number', required: true, placeholder: '380' },
      { key: 'scoreBand', label: 'Score Band', type: 'text', placeholder: 'D' },
      { key: 'maxEligibleAmount', label: 'Max Eligible Amount', type: 'decimal', required: true, placeholder: '12000' },
      { key: 'eligibilityStatus', label: 'Eligibility Status', type: 'text', required: true, placeholder: 'Provisional' },
      { key: 'decisionReason', label: 'Decision Reason', type: 'text', placeholder: 'HARD_DECLINE' },
      { key: 'eligibleProducts', label: 'Eligible Products (JSON array)', type: 'json', placeholder: '[{ "productCode":"QUICK_LOAN", "productName":"Quick Loan", "eligibleAmount":12000, "eligibleTenure":1, "eligibleTenureUnit":"WEEKS", "eligibleNoRepayment":1 }]' },
      { key: 'active', label: 'Active', type: 'boolean', defaultValue: true },
    ],
  },
};

const defaultsForSchema = (schema) => {
  if (!schema?.fields) return {};
  return schema.fields.reduce((acc, field) => {
    if (field.defaultValue !== undefined) {
      acc[field.key] = field.defaultValue;
    } else if (field.type === 'boolean') {
      acc[field.key] = false;
    } else {
      acc[field.key] = '';
    }
    return acc;
  }, {});
};

const parseJsonText = (raw, fallback) => {
  if (raw == null || String(raw).trim() === '') return fallback;
  return JSON.parse(String(raw));
};

const payloadFromSchema = (schema, values) => {
  const out = {};
  const errors = [];
  for (const field of schema.fields || []) {
    const raw = values[field.key];
    const str = typeof raw === 'string' ? raw.trim() : raw;
    if (field.required && (str === '' || str === null || str === undefined)) {
      errors.push(`${field.label} is required`);
      continue;
    }
    if (str === '' || str === null || str === undefined) continue;

    if (field.type === 'number') out[field.key] = Number(str);
    else if (field.type === 'decimal') out[field.key] = Number(str);
    else if (field.type === 'boolean') out[field.key] = Boolean(str);
    else if (field.type === 'tags') out[field.key] = String(str).split(',').map((s) => s.trim()).filter(Boolean);
    else if (field.type === 'json') out[field.key] = parseJsonText(str, field.placeholder?.trim().startsWith('[') ? [] : {});
    else out[field.key] = str;
  }
  return { payload: out, errors };
};

const toneForStatus = (s) => {
  const v = String(s || '').toUpperCase();
  if (v.includes('ACTIVE') || v.includes('APPROVED') || v.includes('ACCEPTED')) return 'green';
  if (v.includes('PENDING') || v.includes('OPEN')) return 'yellow';
  if (v.includes('EXPIRED') || v.includes('REVOK') || v.includes('CANCEL') || v.includes('FAIL')) return 'red';
  return 'gray';
};

const normalizeText = (value) => String(value || '').trim().toUpperCase();

const resolveEligibilityMatch = (data, productCode) => {
  const products = Array.isArray(data?.eligibleProducts) ? data.eligibleProducts : [];
  const normalizedCode = normalizeText(productCode);
  const match = products.find((item) => normalizeText(item?.productCode) === normalizedCode) || null;
  if (match) {
    return match;
  }
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

const isBlockingLoanStatus = (status) => {
  const normalized = normalizeText(status);
  return normalized && !['CLOSED', 'REJECTED', 'DECLINED', 'CANCELLED', 'CANCELED', 'WITHDRAWN', 'WITHDRAWN_BY_APPLICANT', 'UPSTREAM_FAILED', 'OVERPAID'].includes(normalized);
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const units = [
    { s: 60 * 60 * 24 * 365, label: 'y' },
    { s: 60 * 60 * 24 * 30, label: 'mo' },
    { s: 60 * 60 * 24 * 7, label: 'w' },
    { s: 60 * 60 * 24, label: 'd' },
    { s: 60 * 60, label: 'h' },
    { s: 60, label: 'm' },
    { s: 1, label: 's' },
  ];
  for (const u of units) {
    if (diffSec >= u.s) return `${Math.floor(diffSec / u.s)}${u.label} ago`;
  }
  return 'now';
};

const customerLabel = (customer) => {
  const fullName = [customer?.profile?.firstName, customer?.profile?.middleName, customer?.profile?.lastName].filter(Boolean).join(' ').trim();
  const username = String(customer?.username || '').trim();
  const phone = String(customer?.profile?.phone || customer?.phone || customer?.mobileNo || '').trim();
  const name = fullName || username || 'Customer';
  return [name, phone].filter(Boolean).join(' | ') || name;
};

const referenceLabel = (cfg, row) => {
  if (!cfg || !row) return '-';
  if (cfg.apiType === 'customers') return customerLabel(row);
  if (cfg.apiType === 'auth-accounts') return String(row?.username || row?.msisdn || '-');
  if (cfg.apiType === 'prospects') return String(row?.fullName || row?.phone || row?.mobileNo || '-');
  if (cfg.apiType === 'loans') return String(row?.customerFullName || row?.customerName || row?.loanName || row?.productCode || 'Loan');
  if (cfg.apiType === 'onboarding-records') return String(row?.username || row?.mobileNo || '-');
  if (cfg.apiType === 'product-snapshots') return String(row?.name || row?.code || '-');
  if (cfg.apiType === 'products') return String(row?.name || row?.productCode || '-');
  if (cfg.apiType === 'score-band-policies') return String(row?.bandCode || row?.eligibilityStatus || '-');
  if (cfg.apiType === 'loan-product-policies') return String(row?.productName || row?.productCode || '-');
  if (cfg.apiType === 'borrower-scores') return String(row?.customerName || row?.username || row?.scoreBand || 'Borrower score');
  if (cfg.apiType === 'borrower-eligibility-results') return String(row?.customerName || row?.username || row?.eligibilityStatus || 'Eligibility result');
  if (cfg.apiType === 'audit-events') return String(row?.action || row?.eventType || 'Audit event');
  if (cfg.apiType === 'schedule-preview-cache') return String(row?.productCode || row?.customerName || 'Schedule preview');
  return String(row?.name || row?.title || row?.code || row?.status || '-');
};

const RESOURCES = {
  audit_events: { title: 'Audit Events', apiType: 'audit-events', defaultSortBy: 'occurredAt' },
  auth_accounts: { title: 'Auth Accounts', apiType: 'auth-accounts', defaultSortBy: 'updatedAt' },
  auth_otp_challenges: { title: 'OTP Challenges', apiType: 'auth-otp-challenges', defaultSortBy: 'createdAt' },
  auth_refresh_tokens: { title: 'Refresh Tokens', apiType: 'auth-refresh-tokens', defaultSortBy: 'createdAt' },
  auth_sessions: { title: 'Auth Sessions', apiType: 'auth-sessions', defaultSortBy: 'createdAt' },
  consent_documents: { title: 'Consent Documents', apiType: 'consent-documents', defaultSortBy: 'createdAt' },
  customers: { title: 'Customers', apiType: 'customers', defaultSortBy: 'username' },
  disbursement_orders: { title: 'Disbursement Orders', apiType: 'disbursement-orders', defaultSortBy: 'createdAt' },
  loans: { title: 'Platform Loans', apiType: 'loans', defaultSortBy: 'appliedAt' },
  onboarding_records: { title: 'Onboarding Records', apiType: 'onboarding-records', defaultSortBy: 'updatedAt' },
  product_snapshots: { title: 'Product Snapshots', apiType: 'product-snapshots', defaultSortBy: 'updatedAt' },
  products: { title: 'Products', apiType: 'products', defaultSortBy: 'productCode' },
  score_band_policies: { title: 'Score Band Policies', apiType: 'score-band-policies', defaultSortBy: 'minScore' },
  loan_product_policies: { title: 'Loan Product Policies', apiType: 'loan-product-policies', defaultSortBy: 'productCode' },
  borrower_scores: { title: 'Borrower Scores', apiType: 'borrower-scores', defaultSortBy: 'computedAt' },
  borrower_eligibility_results: { title: 'Borrower Eligibility Results', apiType: 'borrower-eligibility-results', defaultSortBy: 'generatedAt' },
  prospects: { title: 'Prospects', apiType: 'prospects', defaultSortBy: 'createdAt' },
  schedule_preview_cache: { title: 'Schedule Preview Cache', apiType: 'schedule-preview-cache', defaultSortBy: 'createdAt' },
};

const DataList = () => {
  const navigate = useNavigate();
  const { resource } = useParams();
  const cfg = RESOURCES[resource];
  const { addToast } = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');

  // sorting
  const [sortBy, setSortBy] = useState(cfg?.defaultSortBy || 'createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMode, setCreateMode] = useState('form');
  const [createFormValues, setCreateFormValues] = useState({});
  const [createJson, setCreateJson] = useState('{\n  \n}');
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editFormValues, setEditFormValues] = useState({});
  const [editRow, setEditRow] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerLoanMetaById, setCustomerLoanMetaById] = useState({});
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [selectedCustomerForLoan, setSelectedCustomerForLoan] = useState(null);
  const [loanProducts, setLoanProducts] = useState([]);
  const [loanPurposes, setLoanPurposes] = useState([]);
  const [loanEligibility, setLoanEligibility] = useState(null);
  const [loanEligibilityLoading, setLoanEligibilityLoading] = useState(false);
  const [loanForm, setLoanForm] = useState({ productCode: '', amount: '', tenure: '', loanPurposeId: '' });
  const [customerTab, setCustomerTab] = useState('customers');
  const [customerInviteCreateRequested, setCustomerInviteCreateRequested] = useState(false);
  const createSchema = cfg ? CREATE_FORM_SCHEMAS[cfg.apiType] : null;
  const needsCustomerPicker = cfg?.apiType === 'borrower-scores' || cfg?.apiType === 'borrower-eligibility-results';
  const needsProductPicker = cfg?.apiType === 'loan-product-policies' || cfg?.apiType === 'borrower-eligibility-results';

  const resolveDocId = (row) =>
    row?.auditEventId ||
    row?.userId ||
    row?.otpRef ||
    row?.tokenId ||
    row?.sessionId ||
    row?.documentId ||
    row?.orderId ||
    row?.platformCustomerId ||
    row?.platformLoanId ||
    row?.onboardingId ||
    row?.prospectId ||
    row?.cacheKey ||
    row?.id ||
    row?.productCode;

  useEffect(() => {
    if (!cfg) return;
    setRows([]);
    setTotal(0);
    setSortBy(cfg.defaultSortBy || 'createdAt');
    setSortDir('desc');
    setSearch('');
    setStatus('');
    setPage(0);
    setCustomerLoanMetaById({});
    setCustomerTab('customers');
    setCustomerInviteCreateRequested(false);
  }, [cfg?.apiType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listLoanPurposesOps({
          active: true,
          limit: 500,
          offset: 0,
          orderBy: 'name',
          sortOrder: 'asc',
        });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (!cancelled) {
          setLoanPurposes(items.filter((item) => item?.fineractCodeValueId || item?.loanPurposeId));
        }
      } catch {
        if (!cancelled) setLoanPurposes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!createOpen || (!needsCustomerPicker && !needsProductPicker)) return;
    let cancelled = false;
    (async () => {
      setLookupLoading(true);
      try {
        if (needsCustomerPicker) {
          const data = await listOpsResources('customers', { limit: 200, offset: 0, orderBy: 'username', sortOrder: 'asc' });
          if (!cancelled) setCustomers(Array.isArray(data?.items) ? data.items : []);
        }
        if (needsProductPicker) {
          const data = await listOpsResources('products', { limit: 200, offset: 0, orderBy: 'productCode', sortOrder: 'asc' });
          if (!cancelled) setProducts(Array.isArray(data?.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, needsCustomerPicker, needsProductPicker]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers
      .filter((c) => {
        const id = String(c?.platformCustomerId || c?.customerId || c?.id || '').toLowerCase();
        const username = String(c?.username || '').toLowerCase();
        const phone = String(c?.phone || c?.mobileNo || '').toLowerCase();
        return id.includes(q) || username.includes(q) || phone.includes(q);
      })
      .slice(0, 12);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => {
        const code = String(p?.productCode || '').toLowerCase();
        const name = String(p?.name || p?.productName || '').toLowerCase();
        return code.includes(q) || name.includes(q);
      })
      .slice(0, 12);
  }, [products, productSearch]);

  const inferProductTenureUnit = (product) => {
    const freqId = Number(product?.repaymentFrequencyType?.id);
    if (Number.isFinite(freqId)) {
      if (freqId === 0) return Number(product?.repaymentEvery) === 7 ? 'WEEKS' : 'DAYS';
      if (freqId === 1) return 'WEEKS';
      if (freqId === 2) return 'MONTHS';
      if (freqId === 3) return 'YEARS';
    }
    return 'WEEKS';
  };

  const applyCustomerPrefill = (customer) => {
    const customerId = customer?.platformCustomerId || customer?.customerId || customer?.id || '';
    setCreateFormValues((prev) => ({
      ...prev,
      customerId: customerId ? String(customerId) : prev.customerId,
    }));
    setCustomerSearch(customer?.username || String(customerId || ''));
  };

  const applyProductPrefill = (product) => {
    const code = product?.productCode || '';
    const name = product?.name || product?.productName || '';
    const maxAmount = product?.eligibilityMaxAmount ?? product?.maxAmount ?? product?.maxPrincipal ?? '';
    const maxTenure = product?.eligibilityMaxTenure ?? product?.maxTenureMonths ?? product?.maxNumberOfRepayments ?? '';
    const maxRepayments = product?.maxNumberOfRepayments ?? product?.maxTenureMonths ?? product?.eligibilityMaxTenure ?? '';
    const tenureUnit = inferProductTenureUnit(product);

    setCreateFormValues((prev) => {
      const next = {
        ...prev,
        productCode: code || prev.productCode,
        productName: name || prev.productName,
        maxProductAmount: maxAmount !== '' ? maxAmount : prev.maxProductAmount,
        maxTenure: maxTenure !== '' ? maxTenure : prev.maxTenure,
        maxRepayments: maxRepayments !== '' ? maxRepayments : prev.maxRepayments,
        tenureUnit: tenureUnit || prev.tenureUnit,
      };
      if (cfg?.apiType === 'borrower-eligibility-results') {
        const amount = Number(next.maxEligibleAmount || maxAmount || 0);
        next.eligibleProducts = JSON.stringify([{
          productCode: code || '',
          productName: name || '',
          eligibleAmount: Number.isFinite(amount) ? amount : 0,
          eligibleTenure: Number(next.maxTenure || 1),
          eligibleTenureUnit: tenureUnit || 'WEEKS',
          eligibleNoRepayment: Number(next.maxTenure || 1),
        }], null, 2);
      }
      return next;
    });
    setProductSearch(`${code}${name ? ` - ${name}` : ''}`);
  };

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listOpsResources(cfg.apiType, {
          q: debouncedSearch || undefined,
          status: status || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((x, idx) => ({
          ...x,
          id:
            x?.auditEventId ||
            x?.userId ||
            x?.otpRef ||
            x?.tokenId ||
            x?.sessionId ||
            x?.documentId ||
            x?.orderId ||
            x?.platformCustomerId ||
            x?.platformLoanId ||
            x?.onboardingId ||
            x?.prospectId ||
            x?.cacheKey ||
            x?.id ||
            x?.productCode ||
            idx,
        })));
        setTotal(Number(data?.total || items.length || 0));
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg?.apiType, debouncedSearch, status, page, limit, sortBy, sortDir, refreshTick]);

  useEffect(() => {
    if (cfg?.apiType !== 'customers' || !rows.length) return () => {};
    let cancelled = false;
    const customerRows = rows
      .map((row) => ({
        key: String(row?.platformCustomerId || row?.gatewayCustomerId || row?.id || '').trim(),
        lookupId: String(row?.gatewayCustomerId || row?.platformCustomerId || row?.id || '').trim(),
      }))
      .filter((item) => item.key && item.lookupId)
      .filter((item) => !(item.key in (customerLoanMetaById || {})));
    if (!customerRows.length) return () => {};

    (async () => {
      const next = {};
      await Promise.all(customerRows.map(async ({ key, lookupId }) => {
        try {
          const data = await listGwLoans({ q: lookupId, limit: 50, offset: 0, orderBy: 'appliedAt', sortOrder: 'desc' });
          const items = Array.isArray(data?.items) ? data.items : [];
          const blocking = items.find((item) => isBlockingLoanStatus(item?.status));
          next[key] = {
            blocked: !!blocking,
            reason: blocking ? `Blocked by ${String(blocking.status || 'loan workflow')}` : '',
          };
        } catch {
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
  }, [cfg?.apiType, rows, customerLoanMetaById]);

  useEffect(() => {
    let cancelled = false;
    const customerId = selectedCustomerForLoan?.gatewayCustomerId || selectedCustomerForLoan?.platformCustomerId || selectedCustomerForLoan?.id;
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
      } catch {
        if (!cancelled) setLoanProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loanOpen, selectedCustomerForLoan]);

  useEffect(() => {
    let cancelled = false;
    const customerId = selectedCustomerForLoan?.gatewayCustomerId || selectedCustomerForLoan?.platformCustomerId || selectedCustomerForLoan?.id;
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
      } catch {
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

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(0);
  };

  const doDelete = async (row, e) => {
    e?.stopPropagation?.();
    if (!cfg) return;
    const id = resolveDocId(row);
    if (id === undefined || id === null || String(id).trim() === '') {
      addToast('Resource not found', 'error');
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteOpsResource(cfg.apiType, id);
      addToast('Deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const openCreate = () => {
    if (cfg?.apiType === 'customers') {
      setCustomerTab('invites');
      setCustomerInviteCreateRequested(true);
      return;
    }
    const defaults = defaultsForSchema(createSchema);
    setCreateFormValues(defaults);
    setCreateJson(JSON.stringify(defaults, null, 2));
    setCreateMode(createSchema ? 'form' : 'json');
    setCustomerSearch('');
    setProductSearch('');
    setCreateOpen(true);
  };

  const doCreate = async () => {
    if (!cfg) return;
    let payload;
    if (createMode === 'form' && createSchema) {
      try {
        const built = payloadFromSchema(createSchema, createFormValues);
        if (built.errors.length) {
          addToast(built.errors[0], 'error');
          return;
        }
        payload = built.payload;
      } catch {
        addToast('Invalid form values', 'error');
        return;
      }
    } else {
      try {
        payload = JSON.parse(createJson);
      } catch {
        addToast('Invalid JSON payload', 'error');
        return;
      }
    }
    setCreateBusy(true);
    try {
      const created = await createOpsResource(cfg.apiType, payload);
      addToast('Created', 'success');
      setCreateOpen(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Create failed', 'error');
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (row) => {
    if (!cfg || cfg.apiType !== 'score-band-policies' || !createSchema) return;
    const defaults = defaultsForSchema(createSchema);
    const values = { ...defaults };
    for (const field of createSchema.fields) {
      if (field.type === 'boolean') {
        values[field.key] = Boolean(row?.[field.key]);
      } else if (row?.[field.key] !== undefined && row?.[field.key] !== null) {
        values[field.key] = row[field.key];
      }
    }
    setEditRow(row);
    setEditFormValues(values);
    setEditOpen(true);
  };

  const doEdit = async () => {
    if (!cfg || cfg.apiType !== 'score-band-policies' || !createSchema || !editRow) return;
    const id = resolveDocId(editRow);
    if (id === undefined || id === null || String(id).trim() === '') {
      addToast('Resource not found', 'error');
      return;
    }
    let payload;
    try {
      const built = payloadFromSchema(createSchema, editFormValues);
      if (built.errors.length) {
        addToast(built.errors[0], 'error');
        return;
      }
      payload = { ...editRow, ...built.payload };
    } catch {
      addToast('Invalid form values', 'error');
      return;
    }
    setEditBusy(true);
    try {
      await updateOpsResource(cfg.apiType, id, payload);
      addToast('Updated', 'success');
      setEditOpen(false);
      setEditRow(null);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Update failed', 'error');
    } finally {
      setEditBusy(false);
    }
  };

  const openCustomerLoanModal = (customer) => {
    setSelectedCustomerForLoan(customer || null);
    setLoanProducts([]);
    setLoanEligibility(null);
    setLoanForm({ productCode: '', amount: '', tenure: '', loanPurposeId: '' });
    setLoanOpen(true);
  };

  const submitLoanOnBehalf = async () => {
    const customerId = selectedCustomerForLoan?.gatewayCustomerId || selectedCustomerForLoan?.platformCustomerId || selectedCustomerForLoan?.id;
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
      });
      setLoanOpen(false);
      addToast('Loan application submitted', 'success');
      navigate(`/gateway/loans/${encodeURIComponent(loan?.platformLoanId)}`);
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

  const columns = useMemo(() => {
    if (!cfg) return [];

    // Common "best effort" columns across resources.
    // Sorting keys should match backend sortFields configured in OpsResourceRegistry.
    const base = [];
    base.push({
      key: 'id',
      header: 'Reference',
      sortable: true,
      render: (r) => referenceLabel(cfg, r),
    });

    // A couple of type-specific "headline" columns
      if (cfg.apiType === 'customers') {
        base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
        base.push({ key: 'phone', header: 'Phone', sortable: false, render: (r) => r?.profile?.phone || r?.phone || r?.mobileNo || '-' });
        base.push({
          key: 'loanAvailability',
          header: 'Loan On Behalf',
          sortable: false,
          render: (r) => {
            const key = String(r?.platformCustomerId || r?.gatewayCustomerId || r?.id || '').trim();
            const meta = customerLoanMetaById?.[key];
            if (!meta) return 'Checking...';
            return meta.blocked ? meta.reason || 'Blocked' : 'Available';
          },
        });
      }
    if (cfg.apiType === 'auth-accounts') {
      base.push({ key: 'msisdn', header: 'MSISDN', sortable: true, render: (r) => r?.msisdn || '-' });
      base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
    }
    if (cfg.apiType === 'prospects') {
      base.push({ key: 'phone', header: 'Phone', sortable: true, render: (r) => r?.phone || '-' });
      base.push({ key: 'kycStatus', header: 'KYC', sortable: false, render: (r) => r?.kycStatus || '-' });
    }
    if (cfg.apiType === 'loans') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerFullName || r?.customerName || r?.customerId || '-' });
      base.push({ key: 'productCode', header: 'Product', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'principal', header: 'Principal', sortable: true, render: (r) => r?.principal ?? '-' });
    }
    if (cfg.apiType === 'onboarding-records') {
      base.push({ key: 'mobileNo', header: 'Mobile', sortable: true, render: (r) => r?.mobileNo || '-' });
      base.push({ key: 'username', header: 'Username', sortable: true, render: (r) => r?.username || '-' });
      base.push({ key: 'onboardingState', header: 'State', sortable: true, render: (r) => r?.onboardingState || '-' });
    }
    if (cfg.apiType === 'product-snapshots') {
      base.push({ key: 'code', header: 'Code', sortable: true, render: (r) => r?.code || '-' });
      base.push({ key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' });
      base.push({ key: 'digitalEnabled', header: 'Digital', sortable: false, render: (r) => (r?.digitalEnabled ? 'Yes' : 'No') });
    }
    if (cfg.apiType === 'products') {
      base.push({ key: 'productCode', header: 'Code', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'name', header: 'Name', sortable: true, render: (r) => r?.name || '-' });
      base.push({ key: 'isDefault', header: 'Default', sortable: false, render: (r) => (r?.default || r?.isDefault ? 'Yes' : 'No') });
    }
    if (cfg.apiType === 'score-band-policies') {
      base.push({ key: 'bandCode', header: 'Band', sortable: true, render: (r) => r?.bandCode || '-' });
      base.push({ key: 'minScore', header: 'Min Score', sortable: true, render: (r) => r?.minScore ?? '-' });
      base.push({ key: 'maxScore', header: 'Max Score', sortable: true, render: (r) => r?.maxScore ?? '-' });
      base.push({ key: 'eligibilityStatus', header: 'Status', sortable: true, render: (r) => r?.eligibilityStatus || '-' });
      base.push({ key: 'maxEligibleAmount', header: 'Max Amount', sortable: true, render: (r) => r?.maxEligibleAmount ?? '-' });
      base.push({ key: 'maxTenure', header: 'Max Tenure', sortable: true, render: (r) => r?.maxTenure ?? '-' });
      base.push({ key: 'maxRepayments', header: 'Max Repayments', sortable: true, render: (r) => r?.maxRepayments ?? '-' });
    }
    if (cfg.apiType === 'loan-product-policies') {
      base.push({ key: 'productCode', header: 'Product Code', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'productName', header: 'Product Name', sortable: true, render: (r) => r?.productName || '-' });
      base.push({ key: 'minScore', header: 'Min Score', sortable: true, render: (r) => r?.minScore ?? '-' });
      base.push({ key: 'maxProductAmount', header: 'Max Amount', sortable: true, render: (r) => r?.maxProductAmount ?? '-' });
      base.push({ key: 'maxTenure', header: 'Max Tenure', sortable: true, render: (r) => r?.maxTenure ?? '-' });
      base.push({ key: 'maxRepayments', header: 'Max Repayments', sortable: true, render: (r) => r?.maxRepayments ?? '-' });
    }
    if (cfg.apiType === 'borrower-scores') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerName || r?.username || r?.customerId || '-' });
      base.push({ key: 'score', header: 'Score', sortable: true, render: (r) => r?.score ?? '-' });
      base.push({ key: 'scoreBand', header: 'Band', sortable: true, render: (r) => r?.scoreBand || '-' });
      base.push({ key: 'eligibilityStatus', header: 'Eligibility', sortable: true, render: (r) => r?.eligibilityStatus || '-' });
      base.push({ key: 'computedAt', header: 'Computed', sortable: true, render: (r) => r?.computedAt || '-' });
    }
    if (cfg.apiType === 'borrower-eligibility-results') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerName || r?.username || r?.customerId || '-' });
      base.push({ key: 'score', header: 'Score', sortable: true, render: (r) => r?.score ?? '-' });
      base.push({ key: 'scoreBand', header: 'Band', sortable: true, render: (r) => r?.scoreBand || '-' });
      base.push({ key: 'maxEligibleAmount', header: 'Max Eligible', sortable: true, render: (r) => r?.maxEligibleAmount ?? '-' });
      base.push({ key: 'eligibilityStatus', header: 'Eligibility', sortable: true, render: (r) => r?.eligibilityStatus || '-' });
      base.push({ key: 'generatedAt', header: 'Generated', sortable: true, render: (r) => r?.generatedAt || '-' });
    }
    if (cfg.apiType === 'audit-events') {
      base.push({ key: 'action', header: 'Action', sortable: true, render: (r) => r?.action || '-' });
      base.push({ key: 'actorId', header: 'Performed By', sortable: true, render: (r) => r?.actorName || r?.actorUsername || r?.actorId || '-' });
      base.push({ key: 'occurredAt', header: 'Occurred', sortable: true, render: (r) => r?.occurredAt || '-' });
    }
    if (cfg.apiType === 'schedule-preview-cache') {
      base.push({ key: 'customerId', header: 'Customer', sortable: true, render: (r) => r?.customerName || r?.username || r?.customerId || '-' });
      base.push({ key: 'productCode', header: 'Product', sortable: true, render: (r) => r?.productCode || '-' });
      base.push({ key: 'createdAt', header: 'Created', sortable: true, render: (r) => (r?.createdAt ? timeAgo(r.createdAt) : '-') });
      base.push({ key: 'expiresAt', header: 'Expires', sortable: true, render: (r) => (r?.expiresAt ? String(r.expiresAt) : '-') });
    }

    // Status-like column if present
    base.push({
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => {
        const activeStatus = typeof r?.active === 'boolean' ? (r.active ? 'ACTIVE' : 'INACTIVE') : '';
        const s = r?.status || r?.onboardingState || activeStatus || '';
        return s ? <Badge tone={toneForStatus(s)}>{s}</Badge> : '-';
      },
    });

    base.push({
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (r) => timeAgo(r?.updatedAt || r?.createdAt || r?.occurredAt),
    });

      base.push({
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {cfg.apiType === 'customers' ? (
              <Can any={['CREATE_LOAN', 'GW_OPS_WRITE']}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openCustomerLoanModal(r)}
                  disabled={customerLoanMetaById?.[String(r?.platformCustomerId || r?.gatewayCustomerId || r?.id || '').trim()]?.blocked}
                  title={customerLoanMetaById?.[String(r?.platformCustomerId || r?.gatewayCustomerId || r?.id || '').trim()]?.reason || 'Apply loan on behalf'}
                >
                  Apply Loan
                </Button>
              </Can>
            ) : null}
            {cfg.apiType === 'score-band-policies' ? (
              <Can any={['GW_OPS_WRITE']}>
                <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => openEdit(r)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil size={16} />
              </Button>
            </Can>
          ) : null}
          <Can any={['GW_OPS_WRITE']}>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              onClick={(e) => doDelete(r, e)}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 size={16} />
            </Button>
          </Can>
        </div>
      ),
    });

    return base;
  }, [cfg?.apiType, customerLoanMetaById]);

  const onRowClick = (row) => {
    if (!cfg) return;
    if (cfg.apiType === 'customers') {
      const id = row?.gatewayCustomerId || row?.platformCustomerId || row?.id;
      if (id) {
        navigate(`/gateway/customers/${encodeURIComponent(String(id))}`);
      }
      return;
    }
    if (cfg.apiType === 'score-band-policies') {
      openEdit(row);
    }
  };

  if (!cfg) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Unknown Resource</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Resource <code>{resource}</code> is not configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{cfg.title}</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Gateway data back-office</div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">Page</div>
            <div className="text-base font-semibold">{page + 1}</div>
          </div>
        </div>
      </section>
      {cfg.apiType === 'customers' ? (
        <Tabs
          tabs={[
            { key: 'customers', label: 'Customers' },
            { key: 'invites', label: 'Invites' },
          ]}
          initial="customers"
          active={customerTab}
          onChange={setCustomerTab}
        >
          <div data-tab="customers" className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[260px] flex-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Search
                  </label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="w-full sm:w-[220px]">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <input
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(0);
                    }}
                    placeholder="optional"
                    className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:ml-auto">
                  <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
                    Clear
                  </Button>
                  <Can any={['GW_OPS_WRITE']}>
                    <Button onClick={openCreate} className="w-full sm:w-auto">
                      <Send size={16} />
                      <span className="ml-2">Send Invite</span>
                    </Button>
                  </Can>
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
                key={cfg.apiType}
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
                onRowClick={onRowClick}
                emptyMessage="No records found"
              />
            </Card>
          </div>
          <div data-tab="invites">
            <InvitesList
              embedded
              autoOpenCreate={customerInviteCreateRequested}
              onAutoOpenConsumed={() => setCustomerInviteCreateRequested(false)}
            />
          </div>
        </Tabs>
      ) : (
        <>
          <Card>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </label>
                <input
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(0);
                  }}
                  placeholder="optional"
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-row flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
                  Clear
                </Button>
                <Can any={['GW_OPS_WRITE']}>
                  <Button onClick={openCreate} className="w-full sm:w-auto">
                    Create
                  </Button>
                </Can>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-start">
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
              key={cfg.apiType}
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
              onRowClick={onRowClick}
              emptyMessage="No records found"
            />
          </Card>
        </>
      )}

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
              {selectedCustomerForLoan?.gatewayCustomerId || selectedCustomerForLoan?.platformCustomerId || selectedCustomerForLoan?.id || '-'}
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

      <Modal
        open={editOpen}
        onClose={() => {
          if (!editBusy) {
            setEditOpen(false);
            setEditRow(null);
          }
        }}
        title="Edit Score Band Policy"
        size="3xl"
        footer={(
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
                setEditRow(null);
              }}
              disabled={editBusy}
            >
              Cancel
            </Button>
            <Button onClick={doEdit} disabled={editBusy}>
              {editBusy ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(createSchema?.fields || []).map((field) => (
            <div key={`edit_${field.key}`}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {field.label}{field.required ? ' *' : ''}
              </label>
              {field.type === 'boolean' ? (
                <button
                  type="button"
                  className={`mt-1 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${editFormValues[field.key] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                  onClick={() => setEditFormValues((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                >
                  {editFormValues[field.key] ? 'True' : 'False'}
                </button>
              ) : field.type === 'select' ? (
                <select
                  value={editFormValues[field.key] ?? ''}
                  onChange={(e) => setEditFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
                  step={field.type === 'decimal' ? '0.01' : '1'}
                  value={editFormValues[field.key] ?? ''}
                  onChange={(e) => setEditFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || ''}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                />
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!createBusy) setCreateOpen(false);
        }}
        title={`Create ${cfg.title}`}
        size="3xl"
        footer={(
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={createBusy}
            >
              Cancel
            </Button>
            <Button onClick={doCreate} disabled={createBusy}>
              {createBusy ? 'Creating...' : 'Create'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {createSchema ? `${createSchema.title} Form` : 'JSON Payload'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {createSchema ? 'Use structured fields or switch to JSON for advanced payload.' : `Provide payload for ${cfg.apiType}.`}
                </div>
              </div>
              {createSchema ? (
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold ${createMode === 'form' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' : 'text-slate-600 dark:text-slate-300'}`}
                    onClick={() => setCreateMode('form')}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold ${createMode === 'json' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' : 'text-slate-600 dark:text-slate-300'}`}
                    onClick={() => {
                      try {
                        if (createSchema) {
                          const built = payloadFromSchema(createSchema, createFormValues);
                          setCreateJson(JSON.stringify(built.payload, null, 2));
                        }
                      } catch {
                        setCreateJson('{\n  \n}');
                      }
                      setCreateMode('json');
                    }}
                  >
                    JSON
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {createMode === 'form' && createSchema ? (
            <div className="space-y-4">
              {(needsCustomerPicker || needsProductPicker) ? (
                <div className="grid gap-3 rounded-xl border border-cyan-200/70 bg-cyan-50/70 p-3 dark:border-cyan-900/50 dark:bg-cyan-900/20 md:grid-cols-2">
                  {needsCustomerPicker ? (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Select Customer
                      </label>
                      <input
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder={lookupLoading ? 'Loading customers...' : 'Search by name, username, phone'}
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div className="mt-2 max-h-28 overflow-auto rounded-lg border border-cyan-200/70 bg-white/70 dark:border-cyan-900/50 dark:bg-slate-900/60">
                        {filteredCustomers.map((c) => {
                          const id = c?.platformCustomerId || c?.customerId || c?.id;
                          const label = customerLabel(c);
                          return (
                            <button
                              key={`c_${id || label}`}
                              type="button"
                              onClick={() => applyCustomerPrefill(c)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-cyan-100/70 dark:hover:bg-cyan-900/30"
                            >
                              {label}
                            </button>
                          );
                        })}
                        {!filteredCustomers.length ? <div className="px-3 py-2 text-xs text-slate-500">No customers</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {needsProductPicker ? (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Select Loan Product
                      </label>
                      <input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={lookupLoading ? 'Loading products...' : 'Search by code or name'}
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div className="mt-2 max-h-28 overflow-auto rounded-lg border border-cyan-200/70 bg-white/70 dark:border-cyan-900/50 dark:bg-slate-900/60">
                        {filteredProducts.map((p) => {
                          const code = p?.productCode || '';
                          const name = p?.name || p?.productName || '';
                          return (
                            <button
                              key={`p_${code || name}`}
                              type="button"
                              onClick={() => applyProductPrefill(p)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-cyan-100/70 dark:hover:bg-cyan-900/30"
                            >
                              {code}{name ? ` - ${name}` : ''}
                            </button>
                          );
                        })}
                        {!filteredProducts.length ? <div className="px-3 py-2 text-xs text-slate-500">No products</div> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {createSchema.fields.map((field) => (
                  <div key={field.key} className={field.type === 'json' ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    {field.type === 'boolean' ? (
                      <button
                        type="button"
                        className={`mt-1 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${createFormValues[field.key] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                        onClick={() => setCreateFormValues((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      >
                        {createFormValues[field.key] ? 'True' : 'False'}
                      </button>
                    ) : field.type === 'select' ? (
                      <select
                        value={createFormValues[field.key] ?? ''}
                        onChange={(e) => setCreateFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'json' ? (
                      <textarea
                        className="mt-1 h-28 w-full resize-none rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-100"
                        value={createFormValues[field.key] ?? ''}
                        onChange={(e) => setCreateFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder || '{ }'}
                        spellCheck={false}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
                        step={field.type === 'decimal' ? '0.01' : '1'}
                        value={createFormValues[field.key] ?? ''}
                        onChange={(e) => setCreateFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder || ''}
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <textarea
              className="h-[45vh] w-full resize-none rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
              value={createJson}
              onChange={(e) => setCreateJson(e.target.value)}
              spellCheck={false}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DataList;
