import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle,
  CirclePlus,
  Phone,
  PiggyBank,
  RefreshCw,
  RotateCcw,
  Undo2,
  UserMinus,
  UserPlus,
  WalletCards,
  XCircle,
} from 'lucide-react';
import api from '../../../api/axios';
import Card from '../../../components/Card';
import Tabs from '../../../components/Tabs';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Skeleton from '../../../components/Skeleton';
import DataTable from '../../../components/DataTable';
import ClientCommandModal from '../../../components/ClientCommandModal';
import Modal from '../../../components/Modal';
import Can from '../../../components/Can';
import SearchableSelectField from '../../../components/SearchableSelectField';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { getGwCustomerSummary, updateGwCustomerProfile } from '../../../api/gateway/customers';
import { acceptInviteOnBehalf, createInvite } from '../../../api/gateway/invites';
import { applyGwLoanOnBehalf, getGwLoanEligibilityForCustomer, listGwLoans } from '../../../api/gateway/loans';
import { listLoanPurposesOps } from '../../../api/gateway/loanPurposes';
import { listOpsResources } from '../../../api/gateway/opsResources';
import { createCustomerVehicle, listCustomerVehicles, patchCustomerVehicle } from '../../../api/gateway/merchantNetwork';
import { listBankNames } from '../../../api/gateway/bankNames';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { getGwLoanStatusCode, getGwLoanStatusLabel, isGwLoanBlockingStatus } from '../../../utils/gwLoanStatus';
import CustomerOverview from './CustomerOverview';

const profileFormInit = {
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  email: '',
  dob: '',
  gender: '',
  nationalId: '',
  region: '',
  district: '',
  ward: '',
  street: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  employerName: '',
  employmentType: '',
  incomeSource: '',
  bankName: '',
  bankAccount: '',
  walletMsisdn: '',
};

const vehicleFormInit = {
  registrationNumber: '',
  vehicleType: '',
  make: '',
  model: '',
  color: '',
  primaryVehicle: false,
  active: true,
};

const inviteFormInit = {
  referrerId: '',
  campaignCode: '',
  channel: '',
  maxUses: '1',
  multiUse: false,
  phoneNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
};

const acceptInviteFormInit = {
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  email: '',
  dob: '',
  gender: '',
  nationalId: '',
  region: '',
  district: '',
  ward: '',
  street: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  employerName: '',
  employmentType: '',
  incomeSource: '',
  bankName: '',
  bankAccount: '',
  walletMsisdn: '',
};

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const INCOME_SOURCE_OPTIONS = [
  { value: '', label: 'Select income source' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FARMING', label: 'Farming' },
  { value: 'CASUAL_WORK', label: 'Casual Work' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select employment type' },
  { value: 'EMPLOYED', label: 'Employed' },
  { value: 'SELF_EMPLOYED', label: 'Self Employed' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'UNEMPLOYED', label: 'Unemployed' },
  { value: 'OTHER', label: 'Other' },
];

const fullName = (profile, fallback = '-') => {
  const name = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
};

const statusTone = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('ACTIVE') || normalized.includes('APPROVED') || normalized.includes('ACCEPT')) return 'green';
  if (normalized.includes('PENDING') || normalized.includes('OPEN') || normalized.includes('CREATED')) return 'yellow';
  if (normalized.includes('CLOSE') || normalized.includes('REJECT') || normalized.includes('WITHDRAW') || normalized.includes('FAIL') || normalized.includes('EXPIRE')) return 'red';
  return 'gray';
};

const LOAN_STATUS_FILTER_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING_DISBURSEMENT', label: 'Pending Disbursement' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'OVERPAID', label: 'Overpaid' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'UPSTREAM_FAILED', label: 'Failed' },
];

const clientStatusText = (value) => {
  if (!value) return '-';
  if (typeof value === 'object') return value.value || value.code || value.name || '-';
  return String(value);
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join(' - ');
  if (typeof value === 'object') return value.value || value.code || value.name || '-';
  return String(value);
};

const formatDisplayDate = (value, { withTime = false } = {}) => {
  if (!value) return '-';
  const raw = Array.isArray(value) && value.length >= 3
    ? `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')}`
    : String(value).trim();
  if (!raw) return '-';
  try {
    const parsed = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return new Intl.DateTimeFormat(undefined, withTime
      ? { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: '2-digit' }).format(parsed);
  } catch {
    return raw;
  }
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

const actionButtonClass = (tone = 'slate') => {
  if (tone === 'emerald') return 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35';
  if (tone === 'amber') return 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/35';
  if (tone === 'rose') return 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/35';
  if (tone === 'cyan') return 'border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/35';
  if (tone === 'violet') return 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/35';
  return 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800';
};

const IconActionButton = ({ icon: Icon, title, tone = 'slate', className = '', ...props }) => (
  <Button
    size="sm"
    variant="ghost"
    className={`h-11 w-11 shrink-0 rounded-xl p-0 shadow-sm ${actionButtonClass(tone)} ${className}`.trim()}
    title={title}
    aria-label={title}
    {...props}
  >
    <Icon size={20} strokeWidth={2.5} />
  </Button>
);

const normalizeText = (value) => String(value || '').trim().toUpperCase();
const normalizeClientState = (value) => normalizeText(typeof value === 'object' ? value?.code || value?.value || value?.name : value).replace(/[^A-Z0-9]+/g, '_');
const hasClientStatusFlag = (status, key) => Boolean(status && typeof status === 'object' && status[key] === true);

const extractGatewayErrorMessage = (e, fallback) => {
  const body = e?.response?.data || {};
  const upstreamPayload = body?.meta?.upstream?.payload || {};
  const upstreamErrors = Array.isArray(upstreamPayload?.errors) ? upstreamPayload.errors : [];
  if (upstreamErrors.length > 0) {
    const first = upstreamErrors[0] || {};
    const message = String(first?.defaultUserMessage || first?.developerMessage || '').trim();
    if (message) return message;
  }

  const directErrors = Array.isArray(body?.errors) ? body.errors : [];
  if (directErrors.length > 0) {
    const first = directErrors[0] || {};
    const detailText = String(first?.details || first?.defaultUserMessage || first?.reason || '').trim();
    if (detailText) {
      if (detailText.startsWith('{')) {
        try {
          const parsed = JSON.parse(detailText);
          const errorText = String(parsed?.error || '').trim();
          const pathText = String(parsed?.path || '').trim();
          if (errorText && pathText) return `${errorText} (${pathText})`;
          if (errorText) return errorText;
          if (pathText) return `Upstream request failed at ${pathText}`;
        } catch {
          // fall through and use raw text
        }
      }
      return detailText;
    }
  }

  const upstreamError = String(upstreamPayload?.error || '').trim();
  const upstreamPath = String(upstreamPayload?.path || '').trim();
  if (upstreamError && upstreamPath) return `${upstreamError} (${upstreamPath})`;
  if (upstreamError) return upstreamError;

  return body?.message || e?.message || fallback;
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

const toDateInput = (value) => {
  if (!value) return '';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : text.slice(0, 10);
};

const todayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const inviteMatchesCustomer = (invite, customer, onboarding) => {
  const invitePhone = String(invite?.prefill?.phoneNumber || '').replace(/\s+/g, '');
  const customerPhone = String(customer?.profile?.phone || '').replace(/\s+/g, '');
  const onboardingPhone = String(onboarding?.mobileNo || '').replace(/\s+/g, '');
  const inviteUsername = String(invite?.prefill?.phoneNumber || '').trim();
  return [customerPhone, onboardingPhone, customer?.username, onboarding?.username]
    .filter(Boolean)
    .some((candidate) => candidate === invitePhone || candidate === inviteUsername);
};

const canAcceptInvite = (invite) => Boolean(invite?.inviteId)
  && !['ACCEPTED', 'CANCELLED', 'EXPIRED'].includes(String(invite?.status || '').toUpperCase());

const GwCustomerDetails = () => {
  const { customerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { catalog, loading: inviteCatalogLoading } = useInviteCatalog();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [fineractClient, setFineractClient] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [loans, setLoans] = useState([]);
  const [invites, setInvites] = useState([]);
  const [commandOpen, setCommandOpen] = useState('');
  const [profileForm, setProfileForm] = useState(profileFormInit);
  const [loanStatus, setLoanStatus] = useState('');
  const [loanProduct, setLoanProduct] = useState('');
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanProducts, setLoanProducts] = useState([]);
  const [loanPurposes, setLoanPurposes] = useState([]);
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
  const [vehicles, setVehicles] = useState([]);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(vehicleFormInit);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState(inviteFormInit);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptSaving, setAcceptSaving] = useState(false);
  const [acceptInvite, setAcceptInvite] = useState(null);
  const [acceptForm, setAcceptForm] = useState(acceptInviteFormInit);
  const [bankOptions, setBankOptions] = useState([]);
  const [activeTab, setActiveTab] = useState(location?.state?.tab || 'overview');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const nextSummary = await getGwCustomerSummary(customerId);
      const customer = nextSummary?.customer || null;
      const onboarding = nextSummary?.onboarding || null;

      const [loanRes, inviteRes, vehicleRes, fineractRes] = await Promise.all([
        listGwLoans({
          customerId: customer?.gatewayCustomerId || customer?.platformCustomerId || customerId,
          limit: 100,
          offset: 0,
          orderBy: 'appliedAt',
          sortOrder: 'desc',
        }).catch(() => ({ items: [] })),
        listOpsResources('invites', {
          q: customer?.profile?.phone || onboarding?.mobileNo || customer?.username || onboarding?.username || undefined,
          limit: 50,
          offset: 0,
          orderBy: 'updatedAt',
          sortOrder: 'desc',
        }).catch(() => ({ items: [] })),
        listCustomerVehicles(customerId).catch(() => []),
        customer?.fineractClientId
          ? Promise.all([
              api.get(`/clients/${encodeURIComponent(customer.fineractClientId)}`).catch(() => ({ data: null })),
              api.get(`/clients/${encodeURIComponent(customer.fineractClientId)}/accounts`).catch(() => ({ data: null })),
            ])
          : Promise.resolve([{ data: null }, { data: null }]),
      ]);

      setSummary(nextSummary);
      setLoans(Array.isArray(loanRes?.items) ? loanRes.items : []);
      setInvites((Array.isArray(inviteRes?.items) ? inviteRes.items : []).filter((item) => inviteMatchesCustomer(item, customer, onboarding)));
      setVehicles((Array.isArray(vehicleRes) ? vehicleRes : []).map((v) => ({ ...v, id: v?.vehicleId })));
      setFineractClient(fineractRes?.[0]?.data || null);
      setAccounts(fineractRes?.[1]?.data || null);
      setProfileForm({
        firstName: customer?.profile?.firstName || '',
        middleName: customer?.profile?.middleName || '',
        lastName: customer?.profile?.lastName || '',
        phone: customer?.profile?.phone || onboarding?.mobileNo || '',
        email: customer?.profile?.email || onboarding?.email || '',
        dob: toDateInput(customer?.profile?.dob),
        gender: customer?.profile?.gender || '',
        nationalId: customer?.profile?.nationalId || '',
        region: customer?.profile?.region || '',
        district: customer?.profile?.district || '',
        ward: customer?.profile?.ward || '',
        street: customer?.profile?.street || '',
        nextOfKinName: customer?.profile?.nextOfKinName || '',
        nextOfKinPhone: customer?.profile?.nextOfKinPhone || '',
        employerName: customer?.profile?.employerName || '',
        employmentType: customer?.profile?.employmentType || '',
        incomeSource: customer?.profile?.incomeSource || '',
        bankName: customer?.profile?.bankName || '',
        bankAccount: customer?.profile?.bankAccount || '',
        walletMsisdn: customer?.profile?.walletMsisdn || '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load gateway customer');
      setSummary(null);
      setFineractClient(null);
      setAccounts(null);
      setLoans([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listBankNames({ active: true, limit: 500, offset: 0, orderBy: 'name', sortOrder: 'asc' });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (!mounted) return;
        setBankOptions(items.filter((item) => item?.name).map((item) => ({ id: String(item.name), label: String(item.name) })));
      } catch (_) {
        if (mounted) setBankOptions([]);
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

  const customer = summary?.customer || null;
  const onboarding = summary?.onboarding || null;
  const missingFields = Array.isArray(summary?.missingFields) ? summary.missingFields : [];
  const savingsAccounts = useMemo(() => (Array.isArray(accounts?.savingsAccounts) ? accounts.savingsAccounts : []), [accounts]);
  const customerDisplayName = fullName(customer?.profile, customer?.username || customer?.gatewayCustomerId || customer?.platformCustomerId);
  const fineractStatus = clientStatusText(fineractClient?.status);
  const fineractStatusObj = fineractClient?.status && typeof fineractClient.status === 'object' ? fineractClient.status : null;
  const fineractClientState = normalizeClientState(fineractClient?.status);
  const gatewayCustomerStatus = formatValue(customer?.status);
  const onboardingStatus = formatValue(onboarding?.onboardingState);
  const customerStatus = fineractStatus !== '-'
    ? fineractStatus
    : gatewayCustomerStatus !== '-'
    ? gatewayCustomerStatus
    : onboardingStatus !== '-'
    ? onboardingStatus
    : 'UNKNOWN';
  const initialTab = location?.state?.tab || 'overview';
  const applyLoanCustomerId = customer?.gatewayCustomerId || customer?.platformCustomerId || customerId;
  const hasBlockingLoan = useMemo(() => (loans || []).some((loan) => isGwLoanBlockingStatus(loan)), [loans]);
  const isClosedClient = hasClientStatusFlag(fineractStatusObj, 'closed')
    || fineractClientState.includes('CLOSED');
  const canApplyLoanOnBehalf = Boolean(applyLoanCustomerId) && !hasBlockingLoan && !isClosedClient;
  const pendingInvites = useMemo(() => (invites || []).filter(canAcceptInvite), [invites]);
  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` })),
    [staff],
  );
  const campaignOptions = useMemo(
    () => (catalog?.campaigns || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [catalog],
  );
  const channelOptions = useMemo(
    () => (catalog?.channels || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [catalog],
  );
  const loggedInStaffId = String(user?.staffId || '');
  const isLoanOfficerUser = Boolean(user?.isGatewayOnlyLoanOfficer || user?.linkedStaffIsLoanOfficer || user?.isLoanOfficer);
  const hasAssignedStaff = Boolean(fineractClient?.staffId || fineractClient?.staffName);
  const clientActions = useMemo(() => {
    if (!fineractClient?.id) return [];

    const actions = [];
    const isTransferState = hasClientStatusFlag(fineractStatusObj, 'transferInProgress')
      || fineractClientState.includes('TRANSFER');
    const isPendingState = hasClientStatusFlag(fineractStatusObj, 'pendingApproval')
      || fineractClientState.includes('PENDING')
      || fineractClientState.includes('SUBMITTED');
    const isActiveState = hasClientStatusFlag(fineractStatusObj, 'active')
      || fineractClientState.includes('ACTIVE');
    const isClosedState = hasClientStatusFlag(fineractStatusObj, 'closed')
      || fineractClientState.includes('CLOSED');
    const isRejectedState = hasClientStatusFlag(fineractStatusObj, 'rejected')
      || fineractClientState.includes('REJECT');
    const isWithdrawnState = hasClientStatusFlag(fineractStatusObj, 'withdrawn')
      || fineractClientState.includes('WITHDRAW');

    if (isTransferState) {
      actions.push(
        { command: 'acceptTransfer', title: 'Accept transfer', icon: CheckCircle, tone: 'emerald' },
        { command: 'rejectTransfer', title: 'Reject transfer', icon: XCircle, tone: 'rose' },
        { command: 'withdrawTransfer', title: 'Withdraw transfer', icon: Undo2, tone: 'amber' },
      );
      return actions;
    }

    if (isPendingState) {
      actions.push(
        { command: 'activate', title: 'Activate client', icon: CheckCircle, tone: 'emerald' },
        { command: 'reject', title: 'Reject client', icon: XCircle, tone: 'rose' },
        { command: 'withdraw', title: 'Withdraw client', icon: Undo2, tone: 'amber' },
      );
      return actions;
    }

    if (isActiveState) {
      actions.push({ command: 'close', title: 'Close client', icon: XCircle, tone: 'rose' });
      if (hasAssignedStaff) {
        actions.push({ command: 'unassignStaff', title: 'Unassign staff', icon: UserMinus, tone: 'amber' });
      } else {
        actions.push({ command: 'assignStaff', title: 'Assign staff', icon: UserPlus, tone: 'violet' });
      }
      if (savingsAccounts.length > 0) {
        actions.push({ command: 'updateSavingsAccount', title: 'Update default savings', icon: PiggyBank, tone: 'cyan' });
      }
      actions.push(
        { command: 'proposeTransfer', title: 'Propose transfer', icon: ArrowRightLeft, tone: 'slate' },
        { command: 'proposeAndAcceptTransfer', title: 'Transfer now', icon: ArrowRightLeft, tone: 'cyan' },
      );
      return actions;
    }

    if (isClosedState) return actions;

    if (isRejectedState) {
      actions.push({ command: 'undoReject', title: 'Undo reject', icon: RotateCcw, tone: 'amber' });
      return actions;
    }

    if (isWithdrawnState) {
      actions.push({ command: 'undoWithdraw', title: 'Undo withdraw', icon: RotateCcw, tone: 'amber' });
      return actions;
    }

    return actions;
  }, [fineractClient?.id, fineractClientState, fineractStatusObj, hasAssignedStaff, savingsAccounts.length]);

  useEffect(() => {
    if (isClosedClient && activeTab === 'profile') {
      setActiveTab('overview');
    }
  }, [isClosedClient, activeTab]);

  useEffect(() => {
    if (!inviteOpen) return;
    setInviteForm((prev) => ({
      ...prev,
      referrerId: prev.referrerId || loggedInStaffId,
      campaignCode: prev.campaignCode || String(campaignOptions[0]?.id || ''),
      channel: prev.channel || String(channelOptions[0]?.id || ''),
    }));
  }, [inviteOpen, loggedInStaffId, campaignOptions, channelOptions]);

  const setField = (key, value) => setProfileForm((prev) => ({ ...prev, [key]: value }));

  const prefillFromCustomer = () => {
    const profileData = customer?.profile || {};
    return {
      phone: profileData.phone || onboarding?.mobileNo || customer?.username || onboarding?.username || '',
      firstName: profileData.firstName || '',
      middleName: profileData.middleName || '',
      lastName: profileData.lastName || '',
      email: profileData.email || onboarding?.email || '',
      dob: toDateInput(profileData.dob),
      gender: profileData.gender || '',
      nationalId: profileData.nationalId || '',
      region: profileData.region || '',
      district: profileData.district || '',
      ward: profileData.ward || '',
      street: profileData.street || '',
      nextOfKinName: profileData.nextOfKinName || '',
      nextOfKinPhone: profileData.nextOfKinPhone || '',
      employerName: profileData.employerName || '',
      employmentType: profileData.employmentType || '',
      incomeSource: profileData.incomeSource || '',
      bankName: profileData.bankName || '',
      bankAccount: profileData.bankAccount || '',
      walletMsisdn: profileData.walletMsisdn || profileData.phone || onboarding?.mobileNo || '',
    };
  };

  const openInviteModal = () => {
    const customerPrefill = prefillFromCustomer();
    setInviteForm({
      ...inviteFormInit,
      referrerId: loggedInStaffId,
      campaignCode: String(campaignOptions[0]?.id || ''),
      channel: String(channelOptions[0]?.id || ''),
      phoneNumber: customerPrefill.phone,
      firstName: customerPrefill.firstName,
      middleName: customerPrefill.middleName,
      lastName: customerPrefill.lastName,
    });
    setInviteOpen(true);
  };

  const openAcceptInviteModal = (invite) => {
    if (!invite?.inviteId) return;
    const customerPrefill = prefillFromCustomer();
    setAcceptInvite(invite);
    setAcceptForm({
      ...acceptInviteFormInit,
      ...customerPrefill,
      firstName: customerPrefill.firstName || invite?.prefill?.firstName || '',
      middleName: customerPrefill.middleName || invite?.prefill?.middleName || '',
      lastName: customerPrefill.lastName || invite?.prefill?.lastName || '',
      phone: customerPrefill.phone || invite?.prefill?.phoneNumber || '',
      walletMsisdn: customerPrefill.walletMsisdn || invite?.prefill?.phoneNumber || '',
    });
    setAcceptOpen(true);
  };

  const submitInvite = async (e) => {
    e?.preventDefault?.();
    if (!inviteForm.phoneNumber.trim() || !inviteForm.firstName.trim() || !inviteForm.middleName.trim() || !inviteForm.lastName.trim()) {
      addToast('Phone, first name, middle name, and last name are required', 'error');
      return;
    }
    setInviteSaving(true);
    try {
      const effectiveStaffId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : inviteForm.referrerId;
      await createInvite({
        referrerId: effectiveStaffId ? String(effectiveStaffId) : null,
        campaignCode: inviteForm.campaignCode.trim(),
        channel: inviteForm.channel.trim(),
        maxUses: inviteForm.multiUse ? 0 : (Number(inviteForm.maxUses) || 1),
        multiUse: !!inviteForm.multiUse,
        prefill: {
          phoneNumber: inviteForm.phoneNumber.trim() || null,
          firstName: inviteForm.firstName.trim() || null,
          middleName: inviteForm.middleName.trim() || null,
          lastName: inviteForm.lastName.trim() || null,
        },
      });
      addToast('Customer invite created', 'success');
      setInviteOpen(false);
      setActiveTab('invites');
      await load();
    } catch (e2) {
      addToast(e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Create invite failed', 'error');
    } finally {
      setInviteSaving(false);
    }
  };

  const submitAcceptInviteOnBehalf = async (e) => {
    e?.preventDefault?.();
    if (!String(acceptForm.firstName || '').trim() || !String(acceptForm.middleName || '').trim() || !String(acceptForm.lastName || '').trim()) {
      addToast('First name, middle name, and last name are required', 'error');
      return;
    }
    if (!acceptInvite?.inviteId) {
      addToast('Select an invite to accept', 'error');
      return;
    }
    setAcceptSaving(true);
    try {
      const payload = {
        authenticationMode: 'PASSWORD',
        profile: {
          firstName: acceptForm.firstName || null,
          middleName: acceptForm.middleName || null,
          lastName: acceptForm.lastName || null,
          phone: acceptForm.phone || null,
          email: acceptForm.email || null,
          dob: acceptForm.dob || null,
          gender: acceptForm.gender || null,
          nationalId: acceptForm.nationalId || null,
          region: acceptForm.region || null,
          district: acceptForm.district || null,
          ward: acceptForm.ward || null,
          street: acceptForm.street || null,
          nextOfKinName: acceptForm.nextOfKinName || null,
          nextOfKinPhone: acceptForm.nextOfKinPhone || null,
          employerName: acceptForm.employerName || null,
          employmentType: acceptForm.employmentType || null,
          incomeSource: acceptForm.incomeSource || null,
          bankName: acceptForm.bankName || null,
          bankAccount: acceptForm.bankAccount || null,
          walletMsisdn: acceptForm.walletMsisdn || null,
        },
      };
      const result = await acceptInviteOnBehalf(acceptInvite.inviteId, payload);
      addToast(result?.profileComplete ? 'Onboarding completed and PIN sent by SMS' : 'Invite accepted and PIN sent by SMS', 'success');
      setAcceptOpen(false);
      setAcceptInvite(null);
      setActiveTab('invites');
      await load();
    } catch (e2) {
      addToast(e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Assisted onboarding failed', 'error');
    } finally {
      setAcceptSaving(false);
    }
  };

  const filteredLoans = useMemo(() => {
    const wantedStatus = String(loanStatus || '').trim().toUpperCase();
    const wantedProduct = String(loanProduct || '').trim().toUpperCase();
    return (loans || []).filter((loan) => {
      const productCode = String(loan?.productCode || '').toUpperCase();
      const displayStatus = getGwLoanStatusCode(loan);
      if (wantedStatus && displayStatus !== wantedStatus) return false;
      if (wantedProduct && productCode !== wantedProduct) return false;
      return true;
    });
  }, [loans, loanStatus, loanProduct]);

  const loanProductOptions = useMemo(() => Array.from(new Set((loans || []).map((loan) => String(loan?.productCode || '').trim()).filter(Boolean))).sort(), [loans]);
  const loanStatusOptions = useMemo(() => LOAN_STATUS_FILTER_OPTIONS.slice(), []);
  const loanPurposeOptions = useMemo(() => loanPurposes
    .map((item) => ({
      value: String(item?.fineractCodeValueId || item?.loanPurposeId || ''),
      label: `${item?.name || item?.code || 'Purpose'}`,
    }))
    .filter((item) => item.value), [loanPurposes]);
  const tenureOptions = useMemo(() => (Array.isArray(loanEligibility?.allowedTenures)
    ? loanEligibility.allowedTenures
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    : []), [loanEligibility]);

  useEffect(() => {
    let cancelled = false;
    if (!loanOpen || !applyLoanCustomerId) {
      setLoanProducts([]);
      setLoanEligibility(null);
      setLoanEligibilityLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const data = await getGwLoanEligibilityForCustomer(applyLoanCustomerId, {});
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
  }, [loanOpen, applyLoanCustomerId]);

  useEffect(() => {
    let cancelled = false;
    const amount = Number(loanForm.amount);
    const productCode = String(loanForm.productCode || '').trim();
    if (!loanOpen || !applyLoanCustomerId || !productCode || !(amount > 0)) {
      setLoanEligibility(null);
      setLoanEligibilityLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoanEligibilityLoading(true);

    (async () => {
      try {
        let data = await getGwLoanEligibilityForCustomer(applyLoanCustomerId, {
          productCode,
          requestedAmount: amount,
        });
        if (cancelled) return;
        let resolved = resolveEligibilityMatch(data, productCode);
        if (!resolved) {
          data = await getGwLoanEligibilityForCustomer(applyLoanCustomerId, { productCode });
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
  }, [loanOpen, applyLoanCustomerId, loanForm.productCode, loanForm.amount]);

  const loanColumns = useMemo(() => ([
    {
      key: 'customerId',
      header: 'Name',
      sortable: false,
      render: () => (
        <div className="min-w-[160px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{customerDisplayName}</div>
        </div>
      ),
    },
    {
      key: 'customerPhone',
      header: 'Phone',
      sortable: false,
      render: () => formatValue(customer?.profile?.phone || onboarding?.mobileNo),
    },
    {
      key: 'productCode',
      header: 'Loan Product',
      sortable: false,
      render: (loan) => (
        <div className="min-w-[160px]">
          <div className="font-medium text-slate-900 dark:text-slate-50">{loan?.productName || loan?.productCode || '-'}</div>
          {loan?.productCode ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{loan.productCode}</div> : null}
        </div>
      ),
    },
    {
      key: 'principal',
      header: 'Principal',
      sortable: false,
      render: (loan) => formatMoney(loan?.principal),
    },
    {
      key: 'tenureMonths',
      header: 'Tenure',
      sortable: false,
      render: (loan) => String(loan?.tenureMonths ?? '-'),
    },
    {
      key: 'totalLoanAmount',
      header: 'Total Loan Amount',
      sortable: false,
      render: (loan) => formatMoney(loan?.totalLoanAmount || loan?.totalRepaymentExpected || loan?.disbursementAmount || loan?.disbursedAmount || loan?.principal),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (loan) => {
        const displayStatus = getGwLoanStatusLabel(loan);
        return <Badge tone={statusTone(displayStatus)}>{displayStatus}</Badge>;
      },
    },
    {
      key: 'appliedAt',
      header: 'Applied',
      sortable: false,
      render: (loan) => formatDisplayDate(loan?.appliedAt),
    },
  ]), [customerDisplayName, customer?.profile?.phone, onboarding?.mobileNo]);

  const saveProfile = async (event) => {
    event?.preventDefault?.();
    setSaving(true);
    try {
      const updated = await updateGwCustomerProfile(customerId, { profile: profileForm });
      setSummary(updated);
      addToast('Gateway customer profile updated and synced to Fineract', 'success');
      await load();
    } catch (e) {
      addToast(extractGatewayErrorMessage(e, 'Failed to update customer profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async (e) => {
    e?.preventDefault?.();
    setVehicleSaving(true);
    try {
      if (editingVehicle) {
        await patchCustomerVehicle(editingVehicle.vehicleId, vehicleForm);
        addToast('Vehicle updated', 'success');
      } else {
        await createCustomerVehicle(customerId, vehicleForm);
        addToast('Vehicle added', 'success');
      }
      setVehicleOpen(false);
      await load();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to save vehicle', 'error');
    } finally {
      setVehicleSaving(false);
    }
  };

  const vehicleColumns = useMemo(() => [
    { key: 'registrationNumber', header: 'Reg Number', sortable: true },
    { key: 'vehicleType', header: 'Type', sortable: true },
    { key: 'make', header: 'Make', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    { key: 'color', header: 'Color', sortable: true },
    {
      key: 'primaryVehicle',
      header: 'Primary',
      render: (v) => <Badge tone={v?.primaryVehicle ? 'green' : 'gray'}>{v?.primaryVehicle ? 'YES' : 'NO'}</Badge>,
    },
    {
      key: 'active',
      header: 'Status',
      render: (v) => <Badge tone={v?.active ? 'green' : 'red'}>{v?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (v) => isClosedClient ? null : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditingVehicle(v);
            setVehicleForm({
              registrationNumber: v.registrationNumber || '',
              vehicleType: v.vehicleType || '',
              make: v.make || '',
              model: v.model || '',
              color: v.color || '',
              primaryVehicle: !!v.primaryVehicle,
              active: !!v.active,
            });
            setVehicleOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ], [isClosedClient]);

  const openLoanModal = () => {
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
    if (!applyLoanCustomerId) {
      addToast('Customer mapping is missing', 'error');
      return;
    }
    if (!loanForm.productCode || !(Number(loanForm.amount) > 0) || !(Number(loanForm.tenure) > 0)) {
      addToast('Select product, amount, and tenure', 'error');
      return;
    }

    setLoanSaving(true);
    try {
      const eligibilityData = await getGwLoanEligibilityForCustomer(applyLoanCustomerId, {
        productCode: loanForm.productCode,
        requestedAmount: Number(loanForm.amount),
      });
      const resolvedEligibility = resolveEligibilityMatch(eligibilityData, loanForm.productCode)
        || resolveEligibilityMatch(await getGwLoanEligibilityForCustomer(applyLoanCustomerId, {
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

      const loan = await applyGwLoanOnBehalf(applyLoanCustomerId, {
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
      await load();
      if (loan?.platformLoanId) {
        navigate(`/gateway/loans/${encodeURIComponent(loan.platformLoanId)}`, {
          state: {
            returnTo: `/gateway/customers/${encodeURIComponent(customerId)}`,
            tab: 'loans',
          },
        });
      }
    } catch (e) {
      addToast(e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Loan application failed', 'error');
    } finally {
      setLoanSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="2rem" width="32%" />
        <Card><Skeleton height="8rem" /></Card>
        <Card><Skeleton height="16rem" /></Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">GW Customer</h1>
          <IconActionButton icon={ArrowLeft} title="Back" onClick={() => navigate('/gateway/data/customers')} />
        </div>
        <Card>{error || 'Customer not found'}</Card>
      </div>
    );
  }

  const profile = customer?.profile || {};
  const displayCustomerId = customer?.fineractClientId || fineractClient?.id || '-';
  const customerInitials = customerDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const primaryLoan = loans[0] || null;

  return (
    <div className="customer-detail-page">
      <div className="customer-page-header">
        <div>
          <h1 className="customer-page-title">Customer Details</h1>
          <div className="customer-breadcrumb"><strong>/gateway</strong><span>/</span><strong>customers</strong><span>/</span><span>customer details</span></div>
        </div>
      </div>

      <div className="customer-panel customer-detail-surface">
        <div className="customer-detail-hero">
          <div className="customer-profile-summary">
            <div className="customer-large-avatar">{customerInitials}</div>
            <div>
              <div className="customer-profile-name-row">
                <div className="customer-profile-name">{customerDisplayName}</div>
                <span className="customer-status-badge">{customerStatus}</span>
              </div>
              <div className="customer-profile-id">{displayCustomerId}</div>
              <div className="customer-hero-facts">
                <div className="customer-hero-fact"><Building2 size={20} /><div><div className="customer-fact-value">{formatValue(fineractClient?.officeName || customer?.officeName)}</div><div className="customer-fact-label">Branch</div></div></div>
                <div className="customer-hero-fact"><Phone size={20} /><div><div className="customer-fact-value">{formatValue(profile.phone || onboarding?.mobileNo)}</div><div className="customer-fact-label">Phone</div></div></div>
                <div className="customer-hero-fact"><CalendarDays size={20} /><div><div className="customer-fact-value">{formatDisplayDate(fineractClient?.submittedOnDate || onboarding?.createdAt || customer?.createdAt)}</div><div className="customer-fact-label">Joined Date</div></div></div>
                <div className="customer-hero-fact"><WalletCards size={20} /><div><div className="customer-fact-value">{formatValue(profile.walletMsisdn || profile.phone)}</div><div className="customer-fact-label">Wallet No.</div></div></div>
              </div>
            </div>
          </div>
          <div className="customer-detail-actions">
            <button type="button" className="customer-action-button" onClick={() => navigate('/gateway/data/customers')}><ArrowLeft size={17} />Back</button>
            <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
              {pendingInvites.length ? (
                <button type="button" className="customer-action-button" onClick={() => openAcceptInviteModal(pendingInvites[0])}>
                  <CheckCircle size={17} />Accept Invite
                </button>
              ) : null}
            </Can>
            {customer?.fineractClientId && !isClosedClient ? <button type="button" className="customer-action-button danger" onClick={() => setCommandOpen('close')}><Ban size={17} />Close</button> : null}
            {customer?.fineractClientId && !isClosedClient ? (
              <button
                type="button"
                className="customer-action-button warning"
                onClick={() => setCommandOpen(hasAssignedStaff ? 'unassignStaff' : 'assignStaff')}
              >
                {hasAssignedStaff ? <UserMinus size={17} /> : <UserPlus size={17} />}
                {hasAssignedStaff ? 'Unassign Officer' : 'Assign Officer'}
              </button>
            ) : null}
            <button type="button" className="customer-action-button refresh" onClick={load}><RefreshCw size={17} />Refresh</button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customerDisplayName}</h1>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {customerStatus !== '-' ? (
              <span className="ml-2">
                <Badge tone={statusTone(customerStatus)}>{customerStatus}</Badge>
              </span>
            ) : null}
            {fineractClient?.officeName ? <span className="ml-2">• {fineractClient.officeName}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconActionButton icon={ArrowLeft} title="Back" onClick={() => navigate('/gateway/data/customers')} />
          {customer?.fineractClientId ? (
            clientActions.map((action) => (
              <IconActionButton
                key={action.command}
                icon={action.icon}
                tone={action.tone}
                title={action.title}
                onClick={() => setCommandOpen(action.command)}
              />
            ))
          ) : null}
          <IconActionButton icon={RefreshCw} tone="cyan" title="Refresh" onClick={load} />
        </div>
      </div>

      {error ? <Card>{error}</Card> : null}

      <div className="customer-detail-tabs customer-panel">
      <Tabs
        key={initialTab}
        initial={initialTab}
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'loans', label: 'Loans' },
          { key: 'vehicles', label: 'Vehicles' },
          { key: 'invites', label: 'Invites' },
          { key: 'savings', label: 'Savings' },
          ...(!isClosedClient ? [{ key: 'profile', label: 'Profile' }] : []),
        ]}
      >
        <div data-tab="overview">
          <CustomerOverview
            customer={customer}
            onboarding={onboarding}
            fineractClient={fineractClient}
            loans={loans}
            vehicles={vehicles}
            savingsAccounts={savingsAccounts}
            invites={invites}
            missingFields={missingFields}
            customerDisplayName={customerDisplayName}
            customerStatus={customerStatus}
            gatewayCustomerStatus={gatewayCustomerStatus}
            fineractStatus={fineractStatus}
            onboardingStatus={onboardingStatus}
            readOnly={isClosedClient}
            onOpenLoan={() => {
              if (primaryLoan?.platformLoanId) navigate(`/gateway/loans/${encodeURIComponent(primaryLoan.platformLoanId)}`);
              else setActiveTab('loans');
            }}
            onEditProfile={() => {
              if (!isClosedClient) setActiveTab('profile');
            }}
          />
        </div>

        <div data-tab="loans" className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Customer Loans</div>
            </div>
            <div className="mb-4 flex items-end gap-3">
              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                  <select
                    value={loanStatus}
                    onChange={(e) => setLoanStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">All</option>
                    {loanStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Product</label>
                  <select
                    value={loanProduct}
                    onChange={(e) => setLoanProduct(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">All</option>
                    {loanProductOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
              </div>
              <Can any={['CREATE_LOAN', 'GW_OPS_WRITE']}>
                {canApplyLoanOnBehalf ? (
                  <IconActionButton
                    icon={CirclePlus}
                    tone="emerald"
                    className="self-start xl:self-auto"
                    onClick={openLoanModal}
                    title="Apply loan on behalf"
                  />
                ) : null}
              </Can>
            </div>
            {!filteredLoans.length ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {loans.length ? 'No loans match the selected filters.' : 'No platform loans for this customer.'}
              </div>
            ) : (
              <DataTable
                columns={loanColumns}
                data={filteredLoans.map((loan) => ({ ...loan, id: loan?.platformLoanId }))}
                loading={false}
                total={filteredLoans.length}
                page={0}
                limit={Math.max(filteredLoans.length, 1)}
                onPageChange={() => {}}
                sortBy=""
                sortDir="asc"
                onSort={() => {}}
                onRowClick={(loan) => {
                  if (!loan?.platformLoanId) return;
                  navigate(`/gateway/loans/${encodeURIComponent(loan.platformLoanId)}`, {
                    state: {
                      returnTo: `/gateway/customers/${encodeURIComponent(customerId)}`,
                      tab: 'loans',
                    },
                  });
                }}
              />
            )}
          </Card>
        </div>

        <div data-tab="vehicles" className="space-y-4">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold">Customer Vehicles</div>
              {!isClosedClient ? <Can any={['GW_OPS_WRITE']}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleForm(vehicleFormInit);
                    setVehicleOpen(true);
                  }}
                >
                  Add Vehicle
                </Button>
              </Can> : null}
            </div>
            <DataTable
              columns={vehicleColumns}
              data={vehicles}
              loading={false}
              total={vehicles.length}
              page={0}
              limit={Math.max(vehicles.length, 1)}
              onPageChange={() => {}}
            />
          </Card>
        </div>

        <div data-tab="savings" className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Savings Accounts</div>
            </div>

            {!savingsAccounts.length ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">No savings accounts.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500">
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Balance</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsAccounts.map((account) => {
                      const summaryData = account.summary || account;
                      const balance = summaryData.accountBalance ?? summaryData.balance ?? null;
                      const currency = summaryData.currency?.code || summaryData.currency?.name || account.currencyCode || '';
                      return (
                        <tr key={account.id} className="border-t border-gray-200 text-sm dark:border-gray-700">
                          <td className="py-2 pr-4">{account.productName || account.savingsProductName || 'Savings Account'}</td>
                          <td className="py-2 pr-4">
                            <Badge tone={statusTone(account.status)}>{account.status?.value || account.status?.code || '-'}</Badge>
                          </td>
                          <td className="py-2 pr-4">{balance != null ? `${formatMoney(balance)} ${currency}`.trim() : '-'}</td>
                          <td className="py-2 pr-4">
                            <Button variant="secondary" onClick={() => navigate(`/savings/${account.id}`)}>View</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div data-tab="invites" className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Customer Invites</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create invites and complete assisted onboarding from this customer record.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
                  {pendingInvites.length ? (
                    <Button size="sm" variant="secondary" onClick={() => openAcceptInviteModal(pendingInvites[0])}>
                      <CheckCircle size={16} /> Accept Invite On Behalf
                    </Button>
                  ) : null}
                </Can>
              </div>
            </div>
            {!invites.length ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No matching invites found for this customer.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">Campaign</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Updated</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.inviteId} className="border-t border-slate-200/70 dark:border-slate-700/70">
                        <td className="py-2 pr-4">{fullName(invite.prefill, '-')}</td>
                        <td className="py-2 pr-4">{formatValue(invite?.prefill?.phoneNumber)}</td>
                        <td className="py-2 pr-4">{formatValue(invite?.campaignCode)}</td>
                        <td className="py-2 pr-4"><Badge tone={statusTone(invite?.status)}>{invite?.status || '-'}</Badge></td>
                        <td className="py-2 pr-4">{formatDisplayDate(invite?.updatedAt, { withTime: true })}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/gateway/invites/${encodeURIComponent(invite.inviteId)}`} className="text-cyan-700 hover:underline dark:text-cyan-300">Open</Link>
                            <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
                              {canAcceptInvite(invite) ? (
                                <button
                                  type="button"
                                  className="text-emerald-700 hover:underline dark:text-emerald-300"
                                  onClick={() => openAcceptInviteModal(invite)}
                                >
                                  Accept on behalf
                                </button>
                              ) : null}
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div data-tab="profile" className="space-y-4">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Update Profile</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Changes here update the GW customer and sync to the mapped Fineract client.</div>
              </div>
            </div>
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">First Name<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.firstName} onChange={(e) => setField('firstName', e.target.value)} required /></label>
                <label className="text-sm">Middle Name<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.middleName} onChange={(e) => setField('middleName', e.target.value)} required /></label>
                <label className="text-sm">Last Name<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.lastName} onChange={(e) => setField('lastName', e.target.value)} required /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">Phone<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.phone} onChange={(e) => setField('phone', e.target.value)} required /></label>
                <label className="text-sm">Email<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.email} onChange={(e) => setField('email', e.target.value)} /></label>
                <label className="text-sm">Date of Birth<input type="date" className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.dob} onChange={(e) => setField('dob', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">Gender<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.gender} onChange={(e) => setField('gender', e.target.value)} /></label>
                <label className="text-sm">National ID<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.nationalId} onChange={(e) => setField('nationalId', e.target.value)} /></label>
                <label className="text-sm">Wallet MSISDN<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.walletMsisdn} onChange={(e) => setField('walletMsisdn', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <label className="text-sm">Region<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.region} onChange={(e) => setField('region', e.target.value)} /></label>
                <label className="text-sm">District<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.district} onChange={(e) => setField('district', e.target.value)} /></label>
                <label className="text-sm">Ward<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.ward} onChange={(e) => setField('ward', e.target.value)} /></label>
                <label className="text-sm">Street<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.street} onChange={(e) => setField('street', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">Next of Kin Name<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.nextOfKinName} onChange={(e) => setField('nextOfKinName', e.target.value)} /></label>
                <label className="text-sm">Next of Kin Phone<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.nextOfKinPhone} onChange={(e) => setField('nextOfKinPhone', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">Employer<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.employerName} onChange={(e) => setField('employerName', e.target.value)} /></label>
                <label className="text-sm">Employment Type<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.employmentType} onChange={(e) => setField('employmentType', e.target.value)} /></label>
                <label className="text-sm">Income Source<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.incomeSource} onChange={(e) => setField('incomeSource', e.target.value)} /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">Bank Name<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.bankName} onChange={(e) => setField('bankName', e.target.value)} /></label>
                <label className="text-sm">Bank Account<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={profileForm.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)} /></label>
                <div className="flex items-end justify-end">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </Tabs>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => {
          if (!inviteSaving) setInviteOpen(false);
        }}
        title="Invite Customer"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={inviteSaving}>Cancel</Button>
            <Button onClick={submitInvite} disabled={inviteSaving}>{inviteSaving ? 'Creating...' : 'Create Invite'}</Button>
          </>
        )}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitInvite}>
          <div className="sm:col-span-2">
            <SearchableSelectField
              label="Staff"
              value={inviteForm.referrerId}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, referrerId: String(value || '') }))}
              options={staffOptions}
              placeholder="Search staff"
              disabled={staffLoading || (isLoanOfficerUser && !!loggedInStaffId)}
              helperText={isLoanOfficerUser
                ? 'Your linked staff profile is used automatically for this invite.'
                : 'Select the staff member responsible for this invite.'}
            />
          </div>
          <SearchableSelectField
            label="Campaign"
            value={inviteForm.campaignCode}
            onChange={(value) => setInviteForm((prev) => ({ ...prev, campaignCode: String(value || '') }))}
            options={campaignOptions}
            placeholder="Search campaign"
            disabled={inviteCatalogLoading}
            required
          />
          <SearchableSelectField
            label="Channel"
            value={inviteForm.channel}
            onChange={(value) => setInviteForm((prev) => ({ ...prev, channel: String(value || '') }))}
            options={channelOptions}
            placeholder="Search channel"
            disabled={inviteCatalogLoading}
            required
          />
          <label className="block text-sm">
            Max Uses
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={inviteForm.maxUses}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              disabled={inviteForm.multiUse}
            />
          </label>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inviteForm.multiUse}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, multiUse: e.target.checked }))}
              />
              Multi-use
            </label>
          </div>
          <label className="block text-sm">
            Phone
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.phoneNumber} onChange={(e) => setInviteForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} placeholder="2557..." required />
          </label>
          <label className="block text-sm">
            First Name
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.firstName} onChange={(e) => setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))} required />
          </label>
          <label className="block text-sm">
            Middle Name
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.middleName} onChange={(e) => setInviteForm((prev) => ({ ...prev, middleName: e.target.value }))} required />
          </label>
          <label className="block text-sm">
            Last Name
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.lastName} onChange={(e) => setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))} required />
          </label>
        </form>
      </Modal>

      <Modal
        open={acceptOpen}
        onClose={() => {
          if (!acceptSaving) setAcceptOpen(false);
        }}
        title="Accept Invite On Behalf"
        size="4xl"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAcceptOpen(false)} disabled={acceptSaving}>Cancel</Button>
            <Button onClick={submitAcceptInviteOnBehalf} disabled={acceptSaving}>{acceptSaving ? 'Saving...' : 'Complete Onboarding'}</Button>
          </>
        )}
      >
        <div className="mb-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-slate-700/70 dark:bg-slate-900/50">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {acceptInvite?.inviteCode || acceptInvite?.inviteId || 'Selected invite'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {fullName(acceptInvite?.prefill, customerDisplayName)} | {acceptInvite?.prefill?.phoneNumber || acceptForm.phone || '-'}
          </div>
        </div>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitAcceptInviteOnBehalf}>
          {[
            ['First Name', 'firstName'],
            ['Middle Name', 'middleName'],
            ['Last Name', 'lastName'],
            ['Phone', 'phone'],
            ['Email', 'email'],
            ['National ID', 'nationalId'],
            ['Region', 'region'],
            ['District', 'district'],
            ['Ward', 'ward'],
            ['Street', 'street'],
            ['Next of Kin Name', 'nextOfKinName'],
            ['Next of Kin Phone', 'nextOfKinPhone'],
            ['Employer Name', 'employerName'],
            ['Bank Account', 'bankAccount'],
            ['Wallet MSISDN', 'walletMsisdn'],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
              <input
                value={acceptForm[key]}
                onChange={(e) => setAcceptForm((prev) => ({ ...prev, [key]: e.target.value }))}
                required={['firstName', 'middleName', 'lastName'].includes(key)}
                className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              />
            </label>
          ))}
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of Birth</span>
            <input
              type="date"
              value={acceptForm.dob}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, dob: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gender</span>
            <select
              value={acceptForm.gender}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employment Type</span>
            <select
              value={acceptForm.employmentType}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, employmentType: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Income Source</span>
            <select
              value={acceptForm.incomeSource}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, incomeSource: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {INCOME_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <SearchableSelectField
            label="Bank"
            value={acceptForm.bankName}
            onChange={(value) => setAcceptForm((prev) => ({ ...prev, bankName: String(value || '') }))}
            options={bankOptions}
            placeholder="Search bank"
          />
        </form>
      </Modal>

      <Modal
        open={vehicleOpen}
        onClose={() => !vehicleSaving && setVehicleOpen(false)}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setVehicleOpen(false)} disabled={vehicleSaving}>Cancel</Button>
            <Button onClick={saveVehicle} disabled={vehicleSaving}>{vehicleSaving ? 'Saving...' : 'Save Vehicle'}</Button>
          </div>
        )}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveVehicle}>
          <label className="text-sm">Registration Number<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} required /></label>
          <label className="text-sm">Vehicle Type<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} required /></label>
          <label className="text-sm">Make<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></label>
          <label className="text-sm">Model<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></label>
          <label className="text-sm">Color<input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} /></label>
          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vehicleForm.primaryVehicle} onChange={(e) => setVehicleForm({ ...vehicleForm, primaryVehicle: e.target.checked })} /> Primary Vehicle</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vehicleForm.active} onChange={(e) => setVehicleForm({ ...vehicleForm, active: e.target.checked })} /> Active</label>
          </div>
        </form>
      </Modal>

      <ClientCommandModal
        open={Boolean(commandOpen)}
        client={fineractClient}
        initialCommand={commandOpen || 'activate'}
        lockCommand
        onClose={() => setCommandOpen('')}
        onDone={() => {
          setCommandOpen('');
          load();
        }}
      />

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
            <div className="font-semibold text-slate-900 dark:text-slate-100">{customerDisplayName}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {applyLoanCustomerId || '-'}
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

export default GwCustomerDetails;
