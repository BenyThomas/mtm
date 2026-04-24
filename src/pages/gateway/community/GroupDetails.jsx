import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, ShieldCheck, UserMinus, UserPlus, UserX, Users } from 'lucide-react';
import AsyncSearchableSelectField from '../../../components/AsyncSearchableSelectField';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import SearchableSelectField from '../../../components/SearchableSelectField';
import Skeleton from '../../../components/Skeleton';
import {
  assignGroupAdmin,
  createGroupInvite,
  createGroupInvitesBulk,
  deactivateGroupMember,
  getGroup,
  removeGroupMember,
} from '../../../api/gateway/community';
import { getOpsResource, listOpsResources } from '../../../api/gateway/opsResources';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { useToast } from '../../../context/ToastContext';
import { approveGwLoan, disburseGwLoan, getGwLoanSchedule, listGwLoans } from '../../../api/gateway/loans';

const inviteInit = {
  campaignCode: '',
  channel: '',
  maxUses: '1',
  membershipRole: 'MEMBER',
  invitedByStaffId: '',
  phoneNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
};

const bulkInviteRowInit = {
  phoneNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
};

const statusTone = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'ACTIVE') return 'green';
  if (status === 'DEACTIVATED') return 'yellow';
  if (status === 'REMOVED') return 'gray';
  if (status === 'PENDING') return 'yellow';
  return 'blue';
};

const customerLabelFromDoc = (item) => {
  const first = String(item?.profile?.firstName || '').trim();
  const middle = String(item?.profile?.middleName || '').trim();
  const last = String(item?.profile?.lastName || '').trim();
  const fullName = [first, middle, last].filter(Boolean).join(' ');
  const phone = String(item?.profile?.phone || '').trim();
  return `${fullName || item?.username || '-'}${phone ? ` - ${phone}` : ''}`;
};

const customerLabelFromMember = (item) => {
  const name = String(item?.customerName || '').trim();
  const phone = String(item?.customerPhone || '').trim();
  return `${name || '-'}${name && phone ? ` - ${phone}` : ''}`;
};

const customerLookupKeys = (item) => (
  [
    item?.platformCustomerId,
    item?.gatewayCustomerId,
    item?.customerId,
    item?.id,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
);

const resolveCustomerDoc = async (id) => {
  const lookupId = String(id || '').trim();
  if (!lookupId) return null;
  try {
    return await getOpsResource('customers', lookupId);
  } catch (_) {
    const response = await listOpsResources('customers', {
      q: lookupId,
      limit: 20,
      offset: 0,
      orderBy: 'createdAt',
      sortOrder: 'desc',
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.find((item) => customerLookupKeys(item).includes(lookupId)) || null;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(`${String(value).trim()}T00:00:00`));
  } catch {
    return String(value);
  }
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num);
  } catch {
    return String(num);
  }
};

const parseDateArrayToIso = (value) => {
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const v = String(value || '').trim();
  return v || '';
};

const deriveNextDueFromSchedule = (schedule) => {
  const periods = Array.isArray(schedule?.repaymentSchedule?.periods)
    ? schedule.repaymentSchedule.periods
    : Array.isArray(schedule?.periods)
      ? schedule.periods
      : [];
  const todayIso = new Date().toISOString().slice(0, 10);
  let overdue = null;
  let upcoming = null;

  for (const period of periods) {
    const installment = Number(period?.period || 0);
    if (!Number.isFinite(installment) || installment <= 0) continue;
    const dueDate = parseDateArrayToIso(period?.dueDate);
    if (!dueDate) continue;
    const outstanding = [
      period?.totalOutstandingForPeriod,
      period?.totalDueForPeriod,
      period?.totalInstallmentAmountForPeriod,
    ].map((v) => Number(v)).find((v) => Number.isFinite(v) && v > 0);
    if (!Number.isFinite(outstanding) || outstanding <= 0) continue;
    const candidate = { dueDate, amount: outstanding };
    if (dueDate <= todayIso) {
      if (!overdue || dueDate < overdue.dueDate) overdue = candidate;
    } else if (!upcoming || dueDate < upcoming.dueDate) {
      upcoming = candidate;
    }
  }

  const next = overdue || upcoming;
  if (!next) return null;
  const diffDays = Math.round((new Date(`${next.dueDate}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000);
  return {
    nextDueDate: next.dueDate,
    nextDueAmount: next.amount,
    dueInDays: diffDays,
    dueBucket: diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : diffDays <= 7 ? 'next7' : diffDays <= 30 ? 'next30' : 'later',
  };
};

const memberActionId = (customerId, action) => `${customerId}:${action}`;
const loanActionId = (platformLoanId, action) => `${platformLoanId}:${action}`;

const normalizeLoanStatus = (value) => String(value || '').trim().toUpperCase();

const nextLoanAction = (loan) => {
  const status = normalizeLoanStatus(loan?.status);
  if (['SUBMITTED', 'PENDING', 'PENDING_UPSTREAM', 'CREATED_IN_FINERACT'].includes(status)) {
    return 'approve';
  }
  if (status === 'APPROVED') {
    return 'disburse';
  }
  if (status === 'ACTIVE' || status === 'DISBURSED') {
    return 'repay';
  }
  return '';
};

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });
  const { catalog: inviteCatalog, loading: inviteCatalogLoading } = useInviteCatalog();

  const [loading, setLoading] = useState(true);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [actingOnMemberId, setActingOnMemberId] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState({ center: null, group: null, members: [] });
  const [customerById, setCustomerById] = useState({});
  const [groupAdminCustomerId, setGroupAdminCustomerId] = useState('');
  const [selectedGroupAdminLabel, setSelectedGroupAdminLabel] = useState('');
  const [actorCustomerId, setActorCustomerId] = useState('');
  const [inviteForm, setInviteForm] = useState(inviteInit);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRoleDraft, setMemberRoleDraft] = useState('MEMBER');
  const [bulkInviteRows, setBulkInviteRows] = useState([{ ...bulkInviteRowInit }]);
  const [memberTab, setMemberTab] = useState('members');
  const [loanMemberFilter, setLoanMemberFilter] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('ACTIVE');
  const [loanSearch, setLoanSearch] = useState('');
  const [groupLoans, setGroupLoans] = useState([]);
  const [groupLoanDueMeta, setGroupLoanDueMeta] = useState({});
  const [memberLoansLoading, setMemberLoansLoading] = useState(false);
  const [actingOnLoanId, setActingOnLoanId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getGroup(groupId);
      const group = response?.group || null;
      const center = response?.center || null;
      const members = Array.isArray(response?.members) ? response.members : [];
      setData({ center, group, members });
      setGroupAdminCustomerId(group?.groupAdminCustomerId || '');
      setActorCustomerId(center?.centerAdminCustomerId || group?.groupAdminCustomerId || '');
      setInviteForm((prev) => ({ ...prev, invitedByStaffId: String(group?.invitedByStaffId || prev.invitedByStaffId || '') }));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    const ids = new Set();
    if (data.group?.groupAdminCustomerId) ids.add(String(data.group.groupAdminCustomerId));
    if (data.center?.centerAdminCustomerId) ids.add(String(data.center.centerAdminCustomerId));
    for (const member of data.members || []) {
      if (member?.customerId) ids.add(String(member.customerId));
    }
    if (!ids.size) {
      setCustomerById({});
      setSelectedGroupAdminLabel('');
      return () => {};
    }
    (async () => {
      const next = {};
      await Promise.all(Array.from(ids).map(async (id) => {
        const doc = await resolveCustomerDoc(id);
        if (!doc) {
          next[id] = null;
          return;
        }
        for (const key of customerLookupKeys(doc)) next[key] = doc;
        if (!next[id]) next[id] = doc;
      }));
      if (cancelled) return;
      setCustomerById(next);
      const adminId = String(data.group?.groupAdminCustomerId || '').trim();
      if (adminId) setSelectedGroupAdminLabel(next[adminId] ? customerLabelFromDoc(next[adminId]) : adminId);
    })();
    return () => {
      cancelled = true;
    };
  }, [data.group?.groupAdminCustomerId, data.center?.centerAdminCustomerId, data.members]);

  const activeMembers = useMemo(
    () => data.members.filter((item) => String(item?.status || '').toUpperCase() === 'ACTIVE'),
    [data.members],
  );

  const searchCustomerOptions = async (query) => {
    const response = await listOpsResources('customers', {
      q: query || undefined,
      limit: 20,
      offset: 0,
      orderBy: 'createdAt',
      sortOrder: 'desc',
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    return items
        .map((item) => {
          const first = String(item?.profile?.firstName || '').trim();
          const middle = String(item?.profile?.middleName || '').trim();
          const last = String(item?.profile?.lastName || '').trim();
          const fullName = [first, middle, last].filter(Boolean).join(' ');
        const phone = String(item?.profile?.phone || '').trim();
        const id = item?.gatewayCustomerId || item?.platformCustomerId || item?.customerId || item?.id;
        return {
          id: String(id || ''),
          label: `${fullName || item?.username || id}${phone ? ` - ${phone}` : ''}${id ? ` (${id})` : ''}`,
        };
      })
      .filter((item) => item.id);
  };

  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` })),
    [staff],
  );
  const campaignOptions = useMemo(
    () => (inviteCatalog?.campaigns || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [inviteCatalog],
  );
  const channelOptions = useMemo(
    () => (inviteCatalog?.channels || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` })),
    [inviteCatalog],
  );

  const inviterStaff = staff.find((item) => String(item.id) === String(data.group?.invitedByStaffId || ''));
  const centerAdminDoc = customerById[String(data.center?.centerAdminCustomerId || '')] || null;
  const groupAdminDoc = customerById[String(data.group?.groupAdminCustomerId || '')] || null;

  useEffect(() => {
    setInviteForm((prev) => ({
      ...prev,
      campaignCode: prev.campaignCode || String(campaignOptions[0]?.id || ''),
      channel: prev.channel || String(channelOptions[0]?.id || ''),
    }));
  }, [campaignOptions, channelOptions]);

  useEffect(() => {
    let cancelled = false;
    const loadMemberLoans = async () => {
      const memberIds = activeMembers
        .map((item) => String(item?.customerId || '').trim())
        .filter(Boolean);
      if (!memberIds.length) {
        setGroupLoans([]);
        return;
      }
      setMemberLoansLoading(true);
      try {
        const responses = await Promise.all(
          memberIds.map((customerId) => listGwLoans({
            customerId,
            limit: 100,
            offset: 0,
            orderBy: 'appliedAt',
            sortOrder: 'desc',
          }))
        );
        if (!cancelled) {
          const merged = [];
          for (const response of responses) {
            const items = Array.isArray(response?.items) ? response.items : [];
            merged.push(...items);
          }
          const deduped = Array.from(new Map(
            merged
              .filter((item) => item?.platformLoanId)
              .map((item) => [String(item.platformLoanId), item])
          ).values());
          setGroupLoans(deduped);
        }
      } catch (_) {
        if (!cancelled) setGroupLoans([]);
      } finally {
        if (!cancelled) setMemberLoansLoading(false);
      }
    };
    loadMemberLoans();
    return () => {
      cancelled = true;
    };
  }, [activeMembers]);

  useEffect(() => {
    let cancelled = false;
    const mappedLoans = (groupLoans || []).filter((loan) => loan?.platformLoanId && loan?.fineractLoanId);
    if (!mappedLoans.length) {
      setGroupLoanDueMeta({});
      return () => {};
    }
    (async () => {
      const entries = await Promise.all(mappedLoans.map(async (loan) => {
        try {
          const schedule = await getGwLoanSchedule(String(loan.platformLoanId));
          return [String(loan.platformLoanId), deriveNextDueFromSchedule(schedule)];
        } catch (_) {
          return [String(loan.platformLoanId), null];
        }
      }));
      if (cancelled) return;
      setGroupLoanDueMeta(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [groupLoans]);

  const refreshGroupLoans = async () => {
    const memberIds = activeMembers
      .map((item) => String(item?.customerId || '').trim())
      .filter(Boolean);
    if (!memberIds.length) {
      setGroupLoans([]);
      return;
    }
    setMemberLoansLoading(true);
    try {
      const responses = await Promise.all(
        memberIds.map((customerId) => listGwLoans({
          customerId,
          limit: 100,
          offset: 0,
          orderBy: 'appliedAt',
          sortOrder: 'desc',
        }))
      );
      const merged = [];
      for (const response of responses) {
        const items = Array.isArray(response?.items) ? response.items : [];
        merged.push(...items);
      }
      const deduped = Array.from(new Map(
        merged
          .filter((item) => item?.platformLoanId)
          .map((item) => [String(item.platformLoanId), item])
      ).values());
      setGroupLoans(deduped);
    } catch (_) {
      setGroupLoans([]);
    } finally {
      setMemberLoansLoading(false);
    }
  };

  const handleLoanAction = async (loan, action) => {
    const platformLoanId = String(loan?.platformLoanId || '').trim();
    if (!platformLoanId) return;
    if (action === 'repay') {
      navigate(`/gateway/loans/${encodeURIComponent(platformLoanId)}`);
      return;
    }
    const actionKey = loanActionId(platformLoanId, action);
    setActingOnLoanId(actionKey);
    setError('');
    try {
      if (action === 'approve') {
        await approveGwLoan(platformLoanId, {});
        addToast('Loan approved', 'success');
      } else if (action === 'disburse') {
        await disburseGwLoan(platformLoanId, {});
        addToast('Loan disbursed', 'success');
      }
      await Promise.all([load(), refreshGroupLoans()]);
    } catch (e) {
      const msg = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || `Failed to ${action} loan`;
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setActingOnLoanId('');
    }
  };

  const openMemberModal = (member, mode) => {
    setSelectedMember(member);
    setMemberRoleDraft(String(member?.role || 'MEMBER').toUpperCase());
    if (mode === 'edit') setEditOpen(true);
    if (mode === 'deactivate') setDeactivateOpen(true);
    if (mode === 'remove') setRemoveOpen(true);
    if (mode === 'admin') {
      setGroupAdminCustomerId(String(member?.customerId || ''));
      const customer = customerById[String(member?.customerId || '')] || null;
      setSelectedGroupAdminLabel(customer ? customerLabelFromDoc(customer) : String(member?.customerId || ''));
      setAdminOpen(true);
    }
  };

  const saveAdmin = async () => {
    setSavingAdmin(true);
    setError('');
    try {
      await assignGroupAdmin(groupId, { customerId: groupAdminCustomerId.trim() });
      setAdminOpen(false);
      setSelectedMember(null);
      await load();
      addToast('Group admin updated', 'success');
    } catch (e) {
      const msg = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Update failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingAdmin(false);
    }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setSavingInvite(true);
    setError('');
    try {
      const created = await createGroupInvite(groupId, {
        campaignCode: inviteForm.campaignCode.trim(),
        channel: inviteForm.channel.trim(),
        maxUses: Number(inviteForm.maxUses) || 1,
        membershipRole: inviteForm.membershipRole,
        invitedByStaffId: Number(inviteForm.invitedByStaffId),
          prefill: {
            phoneNumber: inviteForm.phoneNumber.trim() || null,
            firstName: inviteForm.firstName.trim() || null,
            middleName: inviteForm.middleName.trim() || null,
            lastName: inviteForm.lastName.trim() || null,
          },
        });
      setInviteOpen(false);
      addToast('Group invite created', 'success');
      navigate(`/gateway/invites/${encodeURIComponent(created?.inviteId)}`);
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Create failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingInvite(false);
    }
  };

  const submitBulkInvite = async (e) => {
    e.preventDefault();
    setSavingInvite(true);
    setError('');
    try {
      const members = bulkInviteRows
          .map((item) => ({
            phoneNumber: String(item.phoneNumber || '').trim() || null,
            firstName: String(item.firstName || '').trim() || null,
            middleName: String(item.middleName || '').trim() || null,
            lastName: String(item.lastName || '').trim() || null,
          }))
        .filter((item) => item.phoneNumber);
      if (!members.length) {
        addToast('At least one member phone number is required', 'error');
        return;
      }
      const created = await createGroupInvitesBulk(groupId, {
        campaignCode: inviteForm.campaignCode.trim(),
        channel: inviteForm.channel.trim(),
        maxUses: Number(inviteForm.maxUses) || 1,
        membershipRole: inviteForm.membershipRole,
        invitedByStaffId: Number(inviteForm.invitedByStaffId),
        members,
      });
      setBulkInviteOpen(false);
      setBulkInviteRows([{ ...bulkInviteRowInit }]);
      addToast(`${Number(created?.total || members.length)} group invites created`, 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Bulk invite failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingInvite(false);
    }
  };

  const updateMember = async () => {
    if (!selectedMember) return;
    if (memberRoleDraft === String(selectedMember?.role || '').toUpperCase()) {
      setEditOpen(false);
      return;
    }
    if (memberRoleDraft === 'GROUP_ADMIN') {
      setSavingMember(true);
      setError('');
      try {
        await assignGroupAdmin(groupId, { customerId: String(selectedMember.customerId || '') });
        setEditOpen(false);
        setSelectedMember(null);
        await load();
        addToast('Member updated', 'success');
      } catch (e) {
        const msg = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Update failed';
        setError(msg);
        addToast(msg, 'error');
      } finally {
        setSavingMember(false);
      }
      return;
    }
    setError('Demoting the current group admin is not supported from this modal. Assign another group admin instead.');
    addToast('Assign another group admin first', 'error');
  };

  const confirmMemberAction = async (action) => {
    if (!selectedMember) return;
    if (!actorCustomerId.trim()) {
      setError('actorCustomerId is required');
      addToast('actorCustomerId is required', 'error');
      return;
    }
    const actionKey = memberActionId(selectedMember.customerId, action);
    setActingOnMemberId(actionKey);
    setError('');
    try {
      if (action === 'deactivate') {
        await deactivateGroupMember(groupId, selectedMember.customerId, { actorCustomerId: actorCustomerId.trim() });
        setDeactivateOpen(false);
      } else {
        await removeGroupMember(groupId, selectedMember.customerId, { actorCustomerId: actorCustomerId.trim() });
        setRemoveOpen(false);
      }
      setSelectedMember(null);
      await load();
      addToast(`Member ${action}d`, 'success');
    } catch (e) {
      const msg = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || `Failed to ${action} member`;
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setActingOnMemberId('');
    }
  };

  const memberColumns = useMemo(() => [
    {
      key: 'member',
      header: 'Member',
      sortable: false,
      render: (row) => {
        const customer = customerById[String(row?.customerId || '')] || null;
        const label = customer ? customerLabelFromDoc(customer) : customerLabelFromMember(row);
        const email = String(customer?.profile?.email || row?.customerEmail || '').trim() || 'No email';
        return (
          <div className="min-w-[180px]">
            <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{email}</div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      sortable: false,
      render: (row) => row?.role || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={statusTone(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      sortable: false,
      render: (row) => formatDateTime(row?.joinedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => {
        const active = String(row?.status || '').toUpperCase() === 'ACTIVE';
        return (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => openMemberModal(row, 'edit')} title="Update Member">
              <Pencil size={16} />
            </Button>
            {active ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => openMemberModal(row, 'admin')} title="Make Admin">
                  <ShieldCheck size={16} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openMemberModal(row, 'deactivate')} title="Deactivate Member">
                  <UserMinus size={16} />
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => openMemberModal(row, 'remove')} title="Remove Member">
                  <UserX size={16} />
                </Button>
              </>
            ) : null}
          </div>
        );
      },
    },
  ], [customerById]);

  const memberLoanOptions = activeMembers
    .map((item) => {
      const customer = customerById[String(item?.customerId || '')] || null;
      return {
        id: String(item?.customerId || ''),
        label: customer ? customerLabelFromDoc(customer) : customerLabelFromMember(item),
      };
    })
    .filter((item) => item.id);

  const memberLoanColumns = useMemo(() => [
    {
      key: 'member',
      header: 'Member',
      sortable: false,
      render: (row) => {
        const customer = customerById[String(row?.customerId || '')] || null;
        return customer ? customerLabelFromDoc(customer) : customerLabelFromMember(row);
      },
    },
    {
      key: 'productCode',
      header: 'Product',
      sortable: false,
      render: (row) => row?.productCode || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={statusTone(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'principal',
      header: 'Principal',
      sortable: false,
      render: (row) => formatMoney(row?.principal),
    },
    {
      key: 'outstandingAmount',
      header: 'Outstanding',
      sortable: false,
      render: (row) => formatMoney(row?.outstandingAmount),
    },
    {
      key: 'nextDueDate',
      header: 'Next Due',
      sortable: false,
      render: (row) => {
        const meta = groupLoanDueMeta[String(row?.platformLoanId || '')];
        return formatDate(meta?.nextDueDate);
      },
    },
    {
      key: 'nextDueAmount',
      header: 'Due Amount',
      sortable: false,
      render: (row) => {
        const meta = groupLoanDueMeta[String(row?.platformLoanId || '')];
        return formatMoney(meta?.nextDueAmount);
      },
    },
    {
      key: 'appliedAt',
      header: 'Applied',
      sortable: false,
      render: (row) => formatDateTime(row?.appliedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => {
        const action = nextLoanAction(row);
        if (!action) {
          return <span className="text-xs text-slate-500 dark:text-slate-400">No action</span>;
        }
        const labels = {
          approve: 'Approve',
          disburse: 'Disburse',
          repay: 'Repay',
        };
        const actionKey = loanActionId(row?.platformLoanId, action);
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleLoanAction(row, action)}
              disabled={actingOnLoanId === actionKey}
            >
              {actingOnLoanId === actionKey ? 'Working...' : labels[action]}
            </Button>
          </div>
        );
      },
    },
  ], [actingOnLoanId, customerById, groupLoanDueMeta]);

  const filteredGroupLoans = useMemo(() => {
    let items = Array.isArray(groupLoans) ? [...groupLoans] : [];
    if (loanMemberFilter) {
      items = items.filter((item) => String(item?.customerId || '') === String(loanMemberFilter));
    }
    if (loanStatusFilter) {
      items = items.filter((item) => String(item?.status || '').toUpperCase() === String(loanStatusFilter).toUpperCase());
    }
    const q = String(loanSearch || '').trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        const customer = customerById[String(item?.customerId || '')] || null;
        const memberLabel = customer ? customerLabelFromDoc(customer).toLowerCase() : '';
        return [
          item?.productCode,
          item?.status,
          item?.platformLoanId,
          item?.fineractLoanId,
          memberLabel,
        ].some((value) => String(value || '').toLowerCase().includes(q));
      });
    }
    return items.sort((a, b) => {
      const aDue = groupLoanDueMeta[String(a?.platformLoanId || '')]?.nextDueDate || '9999-12-31';
      const bDue = groupLoanDueMeta[String(b?.platformLoanId || '')]?.nextDueDate || '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return String(b?.appliedAt || '').localeCompare(String(a?.appliedAt || ''));
    });
  }, [groupLoans, loanMemberFilter, loanSearch, loanStatusFilter, customerById, groupLoanDueMeta]);

  const dueDashboard = useMemo(() => {
    const summary = {
      overdue: { count: 0, amount: 0 },
      today: { count: 0, amount: 0 },
      next7: { count: 0, amount: 0 },
      next30: { count: 0, amount: 0 },
      later: { count: 0, amount: 0 },
    };
    for (const loan of filteredGroupLoans) {
      const meta = groupLoanDueMeta[String(loan?.platformLoanId || '')];
      const bucket = meta?.dueBucket;
      if (!bucket || !summary[bucket]) continue;
      summary[bucket].count += 1;
      summary[bucket].amount += Number(meta?.nextDueAmount || 0);
    }
    return summary;
  }, [filteredGroupLoans, groupLoanDueMeta]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Group Details</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{data.group?.name || groupId}</p>
        </div>
        <div className="flex gap-2">
          {data.center?.platformCenterId ? (
            <Link to={`/gateway/centers/${encodeURIComponent(data.center.platformCenterId)}`}><Button variant="secondary">Center</Button></Link>
          ) : null}
          <Button variant="secondary" onClick={load} disabled={loading || savingAdmin || savingInvite || savingMember || !!actingOnMemberId}>Refresh</Button>
          <Button onClick={() => setInviteOpen(true)} disabled={loading}>
            <UserPlus size={16} /> Create Member
          </Button>
          <Button variant="secondary" onClick={() => setBulkInviteOpen(true)} disabled={loading}>
            <Users size={16} /> Bulk Invite
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-4">
        <Card>
        {loading ? (
          <Skeleton height="10rem" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><div className="text-xs text-slate-500">Status</div><div className="mt-1 text-sm"><Badge tone={statusTone(data.group?.status)}>{data.group?.status || '-'}</Badge></div></div>
            <div><div className="text-xs text-slate-500">Center</div><div className="mt-1 text-sm">{data.center?.name || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Group Admin</div><div className="mt-1 text-sm">{groupAdminDoc ? customerLabelFromDoc(groupAdminDoc) : '-'}</div></div>
            <div><div className="text-xs text-slate-500">Center Admin</div><div className="mt-1 text-sm">{centerAdminDoc ? customerLabelFromDoc(centerAdminDoc) : '-'}</div></div>
            <div><div className="text-xs text-slate-500">Invited By Staff</div><div className="mt-1 text-sm">{inviterStaff?.displayName || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Staff Phone</div><div className="mt-1 text-sm">{inviterStaff?.mobileNo || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Staff Email</div><div className="mt-1 text-sm">{inviterStaff?.email || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Members</div><div className="mt-1 text-sm">{data.group?.memberCount || 0} / {data.group?.maxMembers || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Active Members</div><div className="mt-1 text-sm">{activeMembers.length}</div></div>
          </div>
        )}
      </Card>

        <div className="grid gap-4">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Members</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Manage members from the action column. Deactivate or remove is blocked when the member has an active loan.</div>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${memberTab === 'members' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50'}`}
                  onClick={() => setMemberTab('members')}
                >
                  Members
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${memberTab === 'loans' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50'}`}
                  onClick={() => setMemberTab('loans')}
                >
                  Loans
                </button>
              </div>
            </div>
            <div className="mt-4">
              {memberTab === 'members' ? (
                <DataTable
                  columns={memberColumns}
                  data={data.members.map((item) => ({ ...item, id: item?.membershipId }))}
                  loading={loading}
                  total={data.members.length}
                  page={0}
                  limit={Math.max(1, data.members.length || 1)}
                  onPageChange={() => {}}
                  sortBy=""
                  sortDir="asc"
                  onSort={() => {}}
                  emptyMessage="No members found"
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <SearchableSelectField
                        label="Member"
                        value={loanMemberFilter}
                        onChange={(value) => setLoanMemberFilter(String(value || ''))}
                        options={[{ id: '', label: 'All members' }, ...memberLoanOptions]}
                        placeholder="Filter by member"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Status</label>
                      <select
                        value={loanStatusFilter}
                        onChange={(e) => setLoanStatusFilter(e.target.value)}
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="">All statuses</option>
                        <option value="APPROVED">Approved</option>
                        <option value="DISBURSED">Disbursed</option>
                        <option value="OVERPAID">Overpaid</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CREATED_IN_FINERACT">Created</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Search</label>
                      <input
                        value={loanSearch}
                        onChange={(e) => setLoanSearch(e.target.value)}
                        placeholder="Product, member, status..."
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-900/20">
                      <div className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Overdue</div>
                      <div className="mt-2 text-xl font-semibold text-rose-900 dark:text-rose-100">{dueDashboard.overdue.count}</div>
                      <div className="mt-1 text-xs text-rose-700 dark:text-rose-300">{formatMoney(dueDashboard.overdue.amount)}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
                      <div className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Due Today</div>
                      <div className="mt-2 text-xl font-semibold text-amber-900 dark:text-amber-100">{dueDashboard.today.count}</div>
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{formatMoney(dueDashboard.today.amount)}</div>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-900/40 dark:bg-cyan-900/20">
                      <div className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Next 7 Days</div>
                      <div className="mt-2 text-xl font-semibold text-cyan-900 dark:text-cyan-100">{dueDashboard.next7.count}</div>
                      <div className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">{formatMoney(dueDashboard.next7.amount)}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Next 30 Days</div>
                      <div className="mt-2 text-xl font-semibold text-emerald-900 dark:text-emerald-100">{dueDashboard.next30.count}</div>
                      <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{formatMoney(dueDashboard.next30.amount)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">Later</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{dueDashboard.later.count}</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatMoney(dueDashboard.later.amount)}</div>
                    </div>
                  </div>
                  <DataTable
                    columns={memberLoanColumns}
                    data={filteredGroupLoans.map((item) => ({ ...item, id: item?.platformLoanId }))}
                    loading={memberLoansLoading}
                    total={filteredGroupLoans.length}
                    page={0}
                    limit={Math.max(1, filteredGroupLoans.length || 1)}
                    onPageChange={() => {}}
                    sortBy=""
                    sortDir="asc"
                    onSort={() => {}}
                    onRowClick={(row) => navigate(`/gateway/loans/${encodeURIComponent(row?.platformLoanId || '')}`)}
                    emptyMessage="No loans found for the current filters"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => (savingInvite ? null : setInviteOpen(false))}
        title="Create Member Invite"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={savingInvite}>Cancel</Button>
            <Button onClick={submitInvite} disabled={savingInvite}>{savingInvite ? 'Creating...' : 'Create Invite'}</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitInvite}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <SearchableSelectField
                label="Campaign Code"
                value={inviteForm.campaignCode}
                onChange={(value) => setInviteForm((p) => ({ ...p, campaignCode: String(value || '') }))}
                options={campaignOptions}
                placeholder="Search campaign"
                disabled={inviteCatalogLoading}
                required
              />
            </div>
            <div>
              <SearchableSelectField
                label="Channel"
                value={inviteForm.channel}
                onChange={(value) => setInviteForm((p) => ({ ...p, channel: String(value || '') }))}
                options={channelOptions}
                placeholder="Search channel"
                disabled={inviteCatalogLoading}
                required
              />
            </div>
            <div>
              <SearchableSelectField
                label="Invited By Staff Id"
                value={inviteForm.invitedByStaffId}
                onChange={(value) => setInviteForm((p) => ({ ...p, invitedByStaffId: String(value || '') }))}
                options={staffOptions}
                placeholder="Search staff"
                disabled={staffLoading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Membership Role</label>
              <select className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.membershipRole}
                onChange={(e) => setInviteForm((p) => ({ ...p, membershipRole: e.target.value }))}>
                <option value="MEMBER">Member</option>
                <option value="GROUP_ADMIN">Group Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Max Uses</label>
              <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.maxUses}
                onChange={(e) => setInviteForm((p) => ({ ...p, maxUses: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.phoneNumber}
                onChange={(e) => setInviteForm((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="2557..." />
            </div>
              <div>
                <label className="block text-sm font-medium">First Name</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.firstName}
                  onChange={(e) => setInviteForm((p) => ({ ...p, firstName: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium">Middle Name</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.middleName}
                  onChange={(e) => setInviteForm((p) => ({ ...p, middleName: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium">Last Name</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.lastName}
                  onChange={(e) => setInviteForm((p) => ({ ...p, lastName: e.target.value }))} required />
              </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={bulkInviteOpen}
        onClose={() => (savingInvite ? null : setBulkInviteOpen(false))}
        title="Bulk Group Invite"
        size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkInviteOpen(false)} disabled={savingInvite}>Cancel</Button>
            <Button onClick={submitBulkInvite} disabled={savingInvite}>{savingInvite ? 'Creating...' : 'Create Invites'}</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitBulkInvite}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelectField
              label="Campaign Code"
              value={inviteForm.campaignCode}
              onChange={(value) => setInviteForm((p) => ({ ...p, campaignCode: String(value || '') }))}
              options={campaignOptions}
              placeholder="Search campaign"
              disabled={inviteCatalogLoading}
              required
            />
            <SearchableSelectField
              label="Channel"
              value={inviteForm.channel}
              onChange={(value) => setInviteForm((p) => ({ ...p, channel: String(value || '') }))}
              options={channelOptions}
              placeholder="Search channel"
              disabled={inviteCatalogLoading}
              required
            />
            <SearchableSelectField
              label="Invited By Staff Id"
              value={inviteForm.invitedByStaffId}
              onChange={(value) => setInviteForm((p) => ({ ...p, invitedByStaffId: String(value || '') }))}
              options={staffOptions}
              placeholder="Search staff"
              disabled={staffLoading}
              required
            />
            <div>
              <label className="block text-sm font-medium">Max Uses</label>
              <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.maxUses}
                onChange={(e) => setInviteForm((p) => ({ ...p, maxUses: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-3">
              {bulkInviteRows.map((row, idx) => (
              <div key={`bulk-row-${idx}`} className="grid gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium">Phone</label>
                  <input
                    className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                    value={row.phoneNumber}
                    onChange={(e) => setBulkInviteRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, phoneNumber: e.target.value } : item))}
                    placeholder="2557..."
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium">First Name</label>
                    <input
                      className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      value={row.firstName}
                      onChange={(e) => setBulkInviteRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, firstName: e.target.value } : item))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Middle Name</label>
                    <input
                      className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      value={row.middleName}
                      onChange={(e) => setBulkInviteRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, middleName: e.target.value } : item))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Last Name</label>
                    <input
                      className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                      value={row.lastName}
                    onChange={(e) => setBulkInviteRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, lastName: e.target.value } : item))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setBulkInviteRows((prev) => ([...prev, { ...bulkInviteRowInit }]))}>Add Row</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkInviteRows((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
              disabled={bulkInviteRows.length <= 1}
            >
              Remove Last
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={adminOpen}
        onClose={() => (savingAdmin ? null : setAdminOpen(false))}
        title="Make Group Admin"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdminOpen(false)} disabled={savingAdmin}>Cancel</Button>
            <Button onClick={saveAdmin} disabled={savingAdmin}>{savingAdmin ? 'Saving...' : 'Make Admin'}</Button>
          </>
        }
      >
        <AsyncSearchableSelectField
          label="Group Admin Customer Id"
          value={groupAdminCustomerId}
          onChange={(value, option) => {
            setGroupAdminCustomerId(String(value || ''));
            setSelectedGroupAdminLabel(option?.label || '');
          }}
          loadOptions={searchCustomerOptions}
          selectedLabel={selectedGroupAdminLabel}
          placeholder="Search customer"
          required
        />
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => (savingMember ? null : setEditOpen(false))}
        title="Update Member"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={savingMember}>Cancel</Button>
            <Button onClick={updateMember} disabled={savingMember}>{savingMember ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700/60 dark:bg-slate-800/50">
            {selectedMember ? customerLabelFromDoc(customerById[String(selectedMember.customerId || '')] || {}) : '-'}
          </div>
          <div>
            <label className="block text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
              value={memberRoleDraft}
              onChange={(e) => setMemberRoleDraft(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="GROUP_ADMIN">Group Admin</option>
            </select>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Changing role to Group Admin assigns this member as the current group admin. Demoting the current group admin requires assigning another admin first.
          </div>
        </div>
      </Modal>

      <Modal
        open={deactivateOpen}
        onClose={() => (actingOnMemberId ? null : setDeactivateOpen(false))}
        title="Deactivate Member"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivateOpen(false)} disabled={!!actingOnMemberId}>Cancel</Button>
            <Button onClick={() => confirmMemberAction('deactivate')} disabled={!!actingOnMemberId}>
              {actingOnMemberId === memberActionId(selectedMember?.customerId, 'deactivate') ? 'Working...' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {selectedMember ? `Deactivate ${customerLabelFromDoc(customerById[String(selectedMember.customerId || '')] || {})}?` : 'Deactivate member?'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            This is allowed only when the member has no active loan.
          </div>
        </div>
      </Modal>

      <Modal
        open={removeOpen}
        onClose={() => (actingOnMemberId ? null : setRemoveOpen(false))}
        title="Remove Member"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveOpen(false)} disabled={!!actingOnMemberId}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmMemberAction('remove')} disabled={!!actingOnMemberId}>
              {actingOnMemberId === memberActionId(selectedMember?.customerId, 'remove') ? 'Working...' : 'Remove'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {selectedMember ? `Remove ${customerLabelFromDoc(customerById[String(selectedMember.customerId || '')] || {})} from this group?` : 'Remove member?'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            This is allowed only when the member has no active loan.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupDetails;
