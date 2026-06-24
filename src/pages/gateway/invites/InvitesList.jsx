import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import Button from '../../../components/Button';
import Can from '../../../components/Can';
import Modal from '../../../components/Modal';
import SearchableSelectField from '../../../components/SearchableSelectField';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { acceptInviteOnBehalf, cancelInvite, createInvite, deleteInvite, getInviteOnboarding, patchInvite, listInvites } from '../../../api/gateway/invites';
import { listBankNames } from '../../../api/gateway/bankNames';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'OPENED', label: 'Opened' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized.includes('ACCEPT')) return '';
  if (normalized.includes('OPEN')) return 'phone';
  if (normalized.includes('CREATED')) return 'invited';
  if (normalized.includes('EXPIRE') || normalized.includes('CANCEL')) return 'incomplete';
  return '';
};

const displayStatus = (status) => String(status || '-').replaceAll('_', ' ');

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

const renderName = (it) => {
  const fn = (it?.prefill?.firstName || '').trim();
  const mn = (it?.prefill?.middleName || '').trim();
  const ln = (it?.prefill?.lastName || '').trim();
  const full = `${fn} ${mn} ${ln}`.trim();
  return full || '-';
};

const invitePhone = (invite) => invite?.prefill?.phoneNumber || '-';

const inviteUses = (invite) => {
  const maxUses = Number(invite?.maxUses || 0);
  return `${Number(invite?.uses || 0)} / ${maxUses === 0 ? 'Unlimited' : maxUses}`;
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

const acceptFormInit = {
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

const canAcceptInvite = (invite) => Boolean(invite?.inviteId)
  && !['ACCEPTED', 'CANCELLED', 'EXPIRED'].includes(String(invite?.status || '').toUpperCase());

const Field = ({ label, value, mono = false }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`mt-1 text-sm text-slate-900 dark:text-slate-50 ${mono ? 'break-all font-mono' : ''}`}>{value || '-'}</div>
  </div>
);

const FormInput = ({ label, value, onChange, required = false, type = 'text' }) => (
  <label className="block text-sm text-slate-700 dark:text-slate-200">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}{required ? ' *' : ''}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-50"
    />
  </label>
);

const FormSelect = ({ label, value, onChange, options }) => (
  <label className="block text-sm text-slate-700 dark:text-slate-200">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const copyToClipboard = async (text) => {
  const value = String(text || '');
  if (!value) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) {
    // fall through
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (_) {
    return false;
  }
};

const InvitesList = ({ embedded = false, autoOpenCreate = false, onAutoOpenConsumed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { catalog, loading: catalogLoading } = useInviteCatalog();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });

  const [invites, setInvites] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);
  const [status, setStatus] = useState('');

  // sorting
  const [sortBy, setSortBy] = useState('createdAt'); // createdAt | campaignCode | referrerId | phone | uses | status
  const [sortDir, setSortDir] = useState('desc'); // asc | desc

  // pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [editingInvite, setEditingInvite] = useState(null);
  const [inviteForm, setInviteForm] = useState(inviteFormInit);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptSaving, setAcceptSaving] = useState(false);
  const [acceptForm, setAcceptForm] = useState(acceptFormInit);
  const [bankOptions, setBankOptions] = useState([]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listInvites({
          q: debouncedSearch || undefined,
          status: status || undefined,
          offset: page * limit,
          limit,
          orderBy: sortBy,
          sortOrder: sortDir,
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setInvites(items.map((x) => ({ ...x, id: x?.inviteId })));
        setTotal(Number(data?.total || items.length || 0));
      } catch (e) {
        if (!cancelled) {
          setInvites([]);
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
  }, [debouncedSearch, status, page, limit, sortBy, sortDir, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listBankNames({ active: true, limit: 500, offset: 0, orderBy: 'name', sortOrder: 'asc' });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (!cancelled) {
          setBankOptions(items.filter((item) => item?.name).map((item) => ({ id: String(item.name), label: String(item.name) })));
        }
      } catch (_) {
        if (!cancelled) setBankOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doDelete = async (row, e) => {
    e?.stopPropagation?.();
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this invite? This cannot be undone.')) return;
    try {
      await deleteInvite(row?.inviteId);
      addToast('Invite deleted', 'success');
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Delete failed', 'error');
    }
  };

  const doCancelInvite = async (invite) => {
    if (!invite?.inviteId) return;
    try {
      await cancelInvite(invite.inviteId);
      addToast('Invite cancelled', 'success');
      setDetailsOpen(false);
      setSelectedInvite(null);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Cancel failed', 'error');
    }
  };

  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` })),
    [staff],
  );
  const staffNameById = useMemo(() => {
    const out = {};
    for (const item of staff) out[String(item.id)] = item.displayName || String(item.id);
    return out;
  }, [staff]);
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

  useEffect(() => {
    if (!inviteOpen || editingInvite) return;
    setInviteForm((prev) => ({
      ...prev,
      referrerId: prev.referrerId || loggedInStaffId,
      campaignCode: prev.campaignCode || String(campaignOptions[0]?.id || ''),
      channel: prev.channel || String(channelOptions[0]?.id || ''),
    }));
  }, [inviteOpen, editingInvite, campaignOptions, channelOptions, loggedInStaffId]);

  const openCreateModal = () => {
    setEditingInvite(null);
    setInviteForm({
      ...inviteFormInit,
      referrerId: loggedInStaffId,
      campaignCode: String(campaignOptions[0]?.id || ''),
      channel: String(channelOptions[0]?.id || ''),
    });
    setInviteOpen(true);
  };

  useEffect(() => {
    if (!location?.state?.openCreate) return;
    openCreateModal();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.pathname, location?.state, navigate, campaignOptions, channelOptions, loggedInStaffId]);

  useEffect(() => {
    if (!embedded || !autoOpenCreate) return;
    openCreateModal();
    onAutoOpenConsumed?.();
  }, [embedded, autoOpenCreate, campaignOptions, channelOptions, loggedInStaffId, onAutoOpenConsumed]);

  const openEditModal = (invite, e) => {
    e?.stopPropagation?.();
    setEditingInvite(invite);
    const lockedReferrerId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : String(invite?.referrerId || '');
    setInviteForm({
      referrerId: lockedReferrerId,
      campaignCode: String(invite?.campaignCode || campaignOptions[0]?.id || ''),
      channel: String(invite?.channel || channelOptions[0]?.id || ''),
      maxUses: String(invite?.maxUses ?? 1),
      multiUse: Number(invite?.maxUses || 0) === 0,
      phoneNumber: String(invite?.prefill?.phoneNumber || ''),
      firstName: String(invite?.prefill?.firstName || ''),
      middleName: String(invite?.prefill?.middleName || ''),
      lastName: String(invite?.prefill?.lastName || ''),
    });
    setInviteOpen(true);
  };

  const openDetailsModal = async (invite, e) => {
    e?.stopPropagation?.();
    if (!invite?.inviteId) return;
    setSelectedInvite(invite);
    setSelectedOnboarding(null);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const data = await getInviteOnboarding(invite.inviteId);
      setSelectedOnboarding(data || null);
    } catch (_) {
      setSelectedOnboarding(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openAcceptModal = (invite, e) => {
    e?.stopPropagation?.();
    if (!invite?.inviteId) return;
    setSelectedInvite(invite);
    setAcceptForm({
      ...acceptFormInit,
      firstName: invite?.prefill?.firstName || '',
      middleName: invite?.prefill?.middleName || '',
      lastName: invite?.prefill?.lastName || '',
      phone: invite?.prefill?.phoneNumber || '',
      walletMsisdn: invite?.prefill?.phoneNumber || '',
    });
    setAcceptOpen(true);
  };

  const copy = async (label, value) => {
    const ok = await copyToClipboard(value);
    addToast(ok ? `${label} copied` : `Failed to copy ${label}`, ok ? 'success' : 'error');
  };

  const submitInvite = async (e) => {
    e?.preventDefault?.();
    setSavingInvite(true);
    try {
      if (!inviteForm.phoneNumber.trim() || !inviteForm.firstName.trim() || !inviteForm.middleName.trim() || !inviteForm.lastName.trim()) {
        addToast('Phone, first name, middle name, and last name are required', 'error');
        return;
      }
      const effectiveStaffId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : inviteForm.referrerId;
      const payload = {
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
      };
      if (editingInvite?.inviteId) {
        await patchInvite(editingInvite.inviteId, payload);
        addToast('Invite updated', 'success');
      } else {
        await createInvite(payload);
        addToast('Invite created', 'success');
      }
      setInviteOpen(false);
      setEditingInvite(null);
      setInviteForm(inviteFormInit);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0]?.details || err?.response?.data?.message || err?.message || 'Save failed', 'error');
    } finally {
      setSavingInvite(false);
    }
  };

  const submitAcceptOnBehalf = async (e) => {
    e?.preventDefault?.();
    if (!String(acceptForm.firstName || '').trim() || !String(acceptForm.middleName || '').trim() || !String(acceptForm.lastName || '').trim()) {
      addToast('First name, middle name, and last name are required', 'error');
      return;
    }
    if (!selectedInvite?.inviteId) {
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
      const result = await acceptInviteOnBehalf(selectedInvite.inviteId, payload);
      setSelectedOnboarding(result?.onboarding || null);
      setAcceptOpen(false);
      setDetailsOpen(false);
      setSelectedInvite(null);
      addToast(result?.profileComplete ? 'Onboarding completed and PIN sent by SMS' : 'Invite accepted and PIN sent by SMS', 'success');
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0]?.details || err?.response?.data?.message || err?.message || 'Assisted onboarding failed', 'error');
    } finally {
      setAcceptSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'referrerId',
        header: 'Agent',
        sortable: true,
        render: (r) => staffNameById[String(r?.referrerId || '')] || r?.referrerId || '-',
      },
      {
        key: 'campaignCode',
        header: 'Campaign',
        sortable: true,
        render: (r) => r.campaignCode || '-',
      },
      {
        key: 'phone',
        header: 'Phone',
        sortable: true,
        render: (r) => r?.prefill?.phoneNumber || '-',
      },
      {
        key: 'name',
        header: 'Name',
        sortable: false,
        render: (r) => renderName(r),
      },
      {
        key: 'uses',
        header: 'Uses',
        sortable: true,
        render: (r) => `${Number(r?.uses || 0)} / ${Number(r?.maxUses || 0) === 0 ? '∞' : Number(r?.maxUses || 0)}`,
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        render: (r) => timeAgo(r?.createdAt || r?.updatedAt),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => <span className={`customer-status-badge ${statusClass(r?.status)}`}>{displayStatus(r?.status)}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Link to={`/gateway/invites/${encodeURIComponent(r?.inviteId)}`} title="View">
              <Button size="sm" variant="ghost" className="px-2" aria-label="View">
                <Eye size={16} />
              </Button>
            </Link>
            <Can any={['GW_OPS_WRITE']}>
              <Button size="sm" variant="ghost" className="px-2" aria-label="Edit" title="Edit" onClick={(e) => openEditModal(r, e)}>
                <Pencil size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                onClick={(e) => doDelete(r, e)}
                disabled={!r?.inviteId}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            </Can>
          </div>
        ),
      },
    ],
    [doDelete, staffNameById]
  );

  const onRowClick = (row) => {
    openDetailsModal(row);
  };

  const stats = useMemo(() => {
    const normalized = invites.map((invite) => String(invite?.status || '').toUpperCase());
    return {
      total: total || invites.length,
      pending: normalized.filter((value) => value === 'CREATED' || value === 'OPENED').length,
      accepted: normalized.filter((value) => value === 'ACCEPTED').length,
      failed: normalized.filter((value) => value === 'EXPIRED' || value === 'CANCELLED').length,
    };
  }, [invites, total]);
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = total ? page * limit + 1 : 0;
  const end = Math.min((page + 1) * limit, total);
  const pageNumbers = Array.from(new Set([0, 1, 2, 3, 4, pages - 1])).filter((item) => item >= 0 && item < pages);
  const selectedAgentName = selectedInvite?.referrerId ? (staffNameById[String(selectedInvite.referrerId)] || selectedInvite.referrerId) : '-';
  const selectedInvitedByStaff = selectedInvite?.invitedByStaffId ? (staffNameById[String(selectedInvite.invitedByStaffId)] || selectedInvite.invitedByStaffId) : '-';

  return (
    <div className="customer-directory-page">
      {!embedded ? (
        <div className="customer-page-header">
          <div>
            <h1 className="customer-page-title">Invites</h1>
            <div className="customer-breadcrumb"><strong>/gateway</strong><span>/</span><span>invites</span></div>
          </div>
        </div>
      ) : null}

      <section className="customer-panel customer-filter-panel">
        <div className="customer-filter-row invite-filter-row">
          <label className="customer-search-box">
            <Search size={19} color="#5c6a86" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by invite code, name, phone, campaign or agent"
            />
          </label>
          <label className="customer-select">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select optional-filter">
            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(0); }}>
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
              <option value="campaignCode">Campaign</option>
              <option value="referrerId">Agent</option>
              <option value="status">Status</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select optional-filter">
            <select value={sortDir} onChange={(event) => { setSortDir(event.target.value); setPage(0); }}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select optional-filter">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>{value} rows</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
          <button type="button" className="customer-reset" onClick={clearFilters}><RefreshCw size={16} />Reset</button>
          <Can any={['CREATE_CLIENT']}>
            <button type="button" className="customer-primary-button" onClick={openCreateModal}><Send size={18} />Send Invite</button>
          </Can>
        </div>

        <div className="customer-stat-grid">
          <div className="customer-stat-card">
            <div className="customer-stat-icon cyan"><UsersRound /></div>
            <div><div className="customer-stat-label">Total Invites</div><div className="customer-stat-value">{Number(stats.total || 0).toLocaleString()}</div><div className="customer-stat-note">All matching invites</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon purple"><Send /></div>
            <div><div className="customer-stat-label">Pending Invites</div><div className="customer-stat-value">{stats.pending.toLocaleString()}</div><div className="customer-stat-note">Created or opened on this page</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon green"><UserRoundCheck /></div>
            <div><div className="customer-stat-label">Accepted</div><div className="customer-stat-value">{stats.accepted.toLocaleString()}</div><div className="customer-stat-note">Accepted on this page</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon orange"><BadgeAlert /></div>
            <div><div className="customer-stat-label">Expired / Cancelled</div><div className="customer-stat-value">{stats.failed.toLocaleString()}</div><div className="customer-stat-note">Need follow-up</div></div>
          </div>
        </div>
      </section>

      <section className="customer-panel customer-directory-card">
        <div className="customer-section-title">Invite Directory</div>
        <div className="customer-table-scroll">
          <table className="customer-directory-table invite-directory-table">
            <thead>
              <tr>
                <th>Recipient</th><th>Phone</th><th>Campaign</th><th>Channel</th><th>Agent</th><th>Uses</th><th>Status</th><th>Created</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Loading invites...</td></tr>
              ) : invites.length ? invites.map((invite) => (
                <tr key={invite.inviteId} onClick={() => onRowClick(invite)}>
                  <td>
                    <div className="customer-identity">
                      <div className="customer-initials">{renderName(invite).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'IV'}</div>
                      <div>
                        <div className="customer-name">{renderName(invite)}</div>
                        <div className="customer-wallet">Code: {invite?.inviteCode || '-'}</div>
                        <div className="customer-row-links">
                          <span className="customer-mini-link"><Send size={10} />Invite</span>
                          {invite?.inviteUrl ? <span className="customer-mini-link">Link ready</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{invitePhone(invite)}</td>
                  <td>{invite?.campaignCode || '-'}</td>
                  <td>{invite?.channel || '-'}</td>
                  <td>{staffNameById[String(invite?.referrerId || '')] || invite?.referrerId || '-'}</td>
                  <td>{inviteUses(invite)}</td>
                  <td><span className={`customer-status-badge ${statusClass(invite?.status)}`}>{displayStatus(invite?.status)}</span></td>
                  <td>{timeAgo(invite?.createdAt || invite?.updatedAt)}</td>
                  <td>
                    <div className="invite-row-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="customer-view-button" title="View details" onClick={(event) => openDetailsModal(invite, event)}><Eye size={14} /></button>
                      <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
                        {canAcceptInvite(invite) ? (
                          <button type="button" className="customer-mini-link" onClick={(event) => openAcceptModal(invite, event)} title="Accept on behalf">
                            <CheckCircle size={12} />Accept
                          </button>
                        ) : null}
                      </Can>
                      <Can any={['GW_OPS_WRITE']}>
                        <button type="button" className="customer-mini-link" onClick={(event) => openEditModal(invite, event)} title="Edit"><Pencil size={12} />Edit</button>
                        <button type="button" className="loan-delete-button" onClick={(event) => doDelete(invite, event)} disabled={!invite?.inviteId} title="Delete"><Trash2 size={14} /></button>
                      </Can>
                      <MoreVertical size={17} />
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan="9">No invites found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="customer-directory-footer">
          <span>Showing {start} to {end} of {Number(total || 0).toLocaleString()} invites</span>
          <div className="customer-pagination">
            <button className="customer-page-button" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            {pageNumbers.map((number, index) => (
              <React.Fragment key={number}>
                {index > 0 && number - pageNumbers[index - 1] > 1 ? <span>...</span> : null}
                <button className={`customer-page-button ${number === page ? 'active' : ''}`} onClick={() => setPage(number)}>{number + 1}</button>
              </React.Fragment>
            ))}
            <button className="customer-page-button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedInvite(null);
          setSelectedOnboarding(null);
        }}
        title="Invite Details"
        size="4xl"
        footer={(
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDetailsOpen(false);
                setSelectedInvite(null);
                setSelectedOnboarding(null);
              }}
            >
              Close
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/gateway/invites/${encodeURIComponent(selectedInvite?.inviteId || '')}`)} disabled={!selectedInvite?.inviteId}>
              Open Full Page
            </Button>
            <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
              {canAcceptInvite(selectedInvite) ? (
                <Button onClick={(event) => openAcceptModal(selectedInvite, event)} disabled={!selectedInvite?.inviteId}>
                  Accept On Behalf
                </Button>
              ) : null}
            </Can>
          </>
        )}
      >
        {!selectedInvite ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No invite selected.</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recipient</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{renderName(selectedInvite)}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{invitePhone(selectedInvite)}</div>
                </div>
                <span className={`customer-status-badge ${statusClass(selectedInvite?.status)}`}>{displayStatus(selectedInvite?.status)}</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Invite</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invite Code</div>
                    <div className="mt-1 flex items-start gap-2">
                      <div className="break-all font-mono text-sm text-slate-900 dark:text-slate-50">{selectedInvite?.inviteCode || '-'}</div>
                      <button type="button" className="customer-mini-link" onClick={() => copy('Invite code', selectedInvite?.inviteCode)} disabled={!selectedInvite?.inviteCode}><Copy size={12} />Copy</button>
                    </div>
                  </div>
                  <Field label="Campaign" value={selectedInvite?.campaignCode} />
                  <Field label="Channel" value={selectedInvite?.channel} />
                  <Field label="Uses" value={inviteUses(selectedInvite)} />
                  <Field label="Created" value={selectedInvite?.createdAt} />
                  <Field label="Updated" value={selectedInvite?.updatedAt} />
                  <Field label="Opened At" value={selectedInvite?.openedAt} />
                  <Field label="Accepted At" value={selectedInvite?.acceptedAt} />
                </div>
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invite Link</div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="break-all text-sm text-slate-900 dark:text-slate-50">{selectedInvite?.inviteUrl || '-'}</div>
                    <button type="button" className="customer-mini-link" onClick={() => copy('Invite link', selectedInvite?.inviteUrl)} disabled={!selectedInvite?.inviteUrl}><Copy size={12} />Copy</button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Assignment & Onboarding</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Agent" value={selectedAgentName} />
                  <Field label="Invited By Staff" value={selectedInvitedByStaff} />
                  <Field label="Group" value={selectedInvite?.groupId} />
                  <Field label="Center" value={selectedInvite?.centerId} />
                  <Field label="Membership Role" value={selectedInvite?.membershipRole} />
                  <Field label="Onboarding State" value={detailsLoading ? 'Loading...' : selectedOnboarding?.onboardingState || selectedOnboarding?.status || '-'} />
                  <Field label="Login Phone" value={selectedOnboarding?.mobileNo || selectedInvite?.prefill?.phoneNumber} />
                  <Field label="Gateway Customer" value={selectedOnboarding?.gatewayCustomerId} mono />
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Actions</div>
              <div className="flex flex-wrap gap-2">
                <Can any={['UPDATE_CLIENT', 'GW_OPS_WRITE']}>
                  {canAcceptInvite(selectedInvite) ? <Button onClick={(event) => openAcceptModal(selectedInvite, event)}>Accept On Behalf</Button> : null}
                  {canAcceptInvite(selectedInvite) ? <Button variant="secondary" onClick={() => doCancelInvite(selectedInvite)}>Cancel Invite</Button> : null}
                </Can>
                <Can any={['GW_OPS_WRITE']}>
                  <Button variant="secondary" onClick={(event) => openEditModal(selectedInvite, event)}>Edit Invite</Button>
                </Can>
                <Can any={['DELETE_CLIENT', 'GW_OPS_WRITE']}>
                  <Button variant="danger" onClick={(event) => doDelete(selectedInvite, event)}>Delete Invite</Button>
                </Can>
              </div>
            </section>
          </div>
        )}
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
            <Button onClick={submitAcceptOnBehalf} disabled={acceptSaving}>{acceptSaving ? 'Completing...' : 'Complete Onboarding'}</Button>
          </>
        )}
      >
        <form className="space-y-5" onSubmit={submitAcceptOnBehalf}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Invite</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{renderName(selectedInvite)}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedInvite?.inviteCode || selectedInvite?.inviteId || '-'} | {selectedInvite?.prefill?.phoneNumber || '-'}</div>
              </div>
              <span className={`customer-status-badge ${statusClass(selectedInvite?.status)}`}>{displayStatus(selectedInvite?.status)}</span>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Required Identity</div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormInput label="First Name" value={acceptForm.firstName} onChange={(value) => setAcceptForm((prev) => ({ ...prev, firstName: value }))} required />
              <FormInput label="Middle Name" value={acceptForm.middleName} onChange={(value) => setAcceptForm((prev) => ({ ...prev, middleName: value }))} required />
              <FormInput label="Last Name" value={acceptForm.lastName} onChange={(value) => setAcceptForm((prev) => ({ ...prev, lastName: value }))} required />
              <FormInput label="Phone" value={acceptForm.phone} onChange={(value) => setAcceptForm((prev) => ({ ...prev, phone: value }))} />
              <FormInput label="Email" value={acceptForm.email} onChange={(value) => setAcceptForm((prev) => ({ ...prev, email: value }))} />
              <FormInput label="National ID" value={acceptForm.nationalId} onChange={(value) => setAcceptForm((prev) => ({ ...prev, nationalId: value }))} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Personal & Address</div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormInput label="Date of Birth" type="date" value={acceptForm.dob} onChange={(value) => setAcceptForm((prev) => ({ ...prev, dob: value }))} />
              <FormSelect label="Gender" value={acceptForm.gender} onChange={(value) => setAcceptForm((prev) => ({ ...prev, gender: value }))} options={GENDER_OPTIONS} />
              <FormInput label="Region" value={acceptForm.region} onChange={(value) => setAcceptForm((prev) => ({ ...prev, region: value }))} />
              <FormInput label="District" value={acceptForm.district} onChange={(value) => setAcceptForm((prev) => ({ ...prev, district: value }))} />
              <FormInput label="Ward" value={acceptForm.ward} onChange={(value) => setAcceptForm((prev) => ({ ...prev, ward: value }))} />
              <FormInput label="Street" value={acceptForm.street} onChange={(value) => setAcceptForm((prev) => ({ ...prev, street: value }))} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Employment, Kin & Payout</div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormSelect label="Employment Type" value={acceptForm.employmentType} onChange={(value) => setAcceptForm((prev) => ({ ...prev, employmentType: value }))} options={EMPLOYMENT_TYPE_OPTIONS} />
              <FormSelect label="Income Source" value={acceptForm.incomeSource} onChange={(value) => setAcceptForm((prev) => ({ ...prev, incomeSource: value }))} options={INCOME_SOURCE_OPTIONS} />
              <FormInput label="Employer Name" value={acceptForm.employerName} onChange={(value) => setAcceptForm((prev) => ({ ...prev, employerName: value }))} />
              <FormInput label="Next of Kin Name" value={acceptForm.nextOfKinName} onChange={(value) => setAcceptForm((prev) => ({ ...prev, nextOfKinName: value }))} />
              <FormInput label="Next of Kin Phone" value={acceptForm.nextOfKinPhone} onChange={(value) => setAcceptForm((prev) => ({ ...prev, nextOfKinPhone: value }))} />
              <FormInput label="Wallet MSISDN" value={acceptForm.walletMsisdn} onChange={(value) => setAcceptForm((prev) => ({ ...prev, walletMsisdn: value }))} />
              <SearchableSelectField
                label="Bank"
                value={acceptForm.bankName}
                onChange={(value) => setAcceptForm((prev) => ({ ...prev, bankName: String(value || '') }))}
                options={bankOptions}
                placeholder="Search bank"
              />
              <FormInput label="Bank Account" value={acceptForm.bankAccount} onChange={(value) => setAcceptForm((prev) => ({ ...prev, bankAccount: value }))} />
            </div>
          </section>
        </form>
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => (savingInvite ? null : setInviteOpen(false))}
        title={editingInvite ? 'Update Invite' : 'Create Invite'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={savingInvite}>Cancel</Button>
            <Button onClick={submitInvite} disabled={savingInvite}>{savingInvite ? 'Saving...' : editingInvite ? 'Save Changes' : 'Create Invite'}</Button>
          </>
        }
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
          <div>
            <SearchableSelectField
              label="Campaign"
              value={inviteForm.campaignCode}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, campaignCode: String(value || '') }))}
              options={campaignOptions}
              placeholder="Search campaign"
              disabled={catalogLoading}
              required
            />
          </div>
          <div>
            <SearchableSelectField
              label="Channel"
              value={inviteForm.channel}
              onChange={(value) => setInviteForm((prev) => ({ ...prev, channel: String(value || '') }))}
              options={channelOptions}
              placeholder="Search channel"
              disabled={catalogLoading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max Uses</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={inviteForm.maxUses}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              disabled={inviteForm.multiUse}
            />
          </div>
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
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.phoneNumber} onChange={(e) => setInviteForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} placeholder="2557..." />
          </div>
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.firstName} onChange={(e) => setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Middle Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.middleName} onChange={(e) => setInviteForm((prev) => ({ ...prev, middleName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.lastName} onChange={(e) => setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))} required />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvitesList;
