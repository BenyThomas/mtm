import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, ShieldCheck, UserMinus, UserPlus, UserX } from 'lucide-react';
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
  deactivateGroupMember,
  getGroup,
  removeGroupMember,
} from '../../../api/gateway/community';
import { getOpsResource, listOpsResources } from '../../../api/gateway/opsResources';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { useToast } from '../../../context/ToastContext';

const inviteInit = {
  campaignCode: '',
  channel: '',
  maxUses: '1',
  membershipRole: 'MEMBER',
  invitedByStaffId: '',
  phoneNumber: '',
  firstName: '',
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
  const last = String(item?.profile?.lastName || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ');
  const phone = String(item?.profile?.phone || '').trim();
  return `${fullName || item?.username || '-'}${phone ? ` - ${phone}` : ''}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const memberActionId = (customerId, action) => `${customerId}:${action}`;

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
  const [adminOpen, setAdminOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRoleDraft, setMemberRoleDraft] = useState('MEMBER');

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
        try {
          const doc = await getOpsResource('customers', id);
          next[id] = doc || null;
        } catch (_) {
          next[id] = null;
        }
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
        const last = String(item?.profile?.lastName || '').trim();
        const fullName = [first, last].filter(Boolean).join(' ');
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
        return (
          <div className="min-w-[180px]">
            <div className="font-medium text-slate-900 dark:text-slate-50">{customer ? customerLabelFromDoc(customer) : '-'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{String(customer?.profile?.email || '').trim() || 'No email'}</div>
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
            </div>
            <div className="mt-4">
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
                onChange={(e) => setInviteForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Last Name</label>
              <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={inviteForm.lastName}
                onChange={(e) => setInviteForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
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
