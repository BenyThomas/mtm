import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Power, SquarePen, Trash2 } from 'lucide-react';
import AsyncSearchableSelectField from '../../../components/AsyncSearchableSelectField';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import SearchableSelectField from '../../../components/SearchableSelectField';
import Skeleton from '../../../components/Skeleton';
import { createGroup, deactivateGroup as deactivateGroupRequest, deleteGroup as deleteGroupRequest, getCenter, updateGroup as updateGroupRequest } from '../../../api/gateway/community';
import { getOpsResource, listOpsResources } from '../../../api/gateway/opsResources';
import useOffices from '../../../hooks/useOffices';
import useStaff from '../../../hooks/useStaff';
import { useToast } from '../../../context/ToastContext';

const groupFormInit = {
  name: '',
  invitedByStaffId: '',
  groupAdminCustomerId: '',
  maxMembers: '',
  active: true,
};

const statusTone = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'ACTIVE') return 'green';
  if (status === 'PENDING') return 'yellow';
  return 'gray';
};

const customerLabelFromDoc = (item) => {
  const first = String(item?.profile?.firstName || '').trim();
  const last = String(item?.profile?.lastName || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ');
  const phone = String(item?.profile?.phone || '').trim();
  return `${fullName || item?.username || '-'}${phone ? ` - ${phone}` : ''}`;
};

const CommunityCenterDetails = () => {
  const { centerId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });
  const { offices } = useOffices();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ center: null, groups: [] });
  const [groupOpen, setGroupOpen] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [savingEditGroup, setSavingEditGroup] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingGroup, setDeactivatingGroup] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState(groupFormInit);
  const [selectedGroupAdminLabel, setSelectedGroupAdminLabel] = useState('');
  const [selectedEditGroupAdminLabel, setSelectedEditGroupAdminLabel] = useState('');
  const [customerById, setCustomerById] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCenter(centerId);
      setData({
        center: response?.center || null,
        groups: Array.isArray(response?.groups) ? response.groups.map((item) => ({ ...item, id: item?.platformGroupId })) : [],
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [centerId]);

  useEffect(() => {
    let cancelled = false;
    const ids = new Set();
    for (const group of data.groups || []) {
      if (group?.groupAdminCustomerId) ids.add(String(group.groupAdminCustomerId));
    }
    if (!ids.size) {
      setCustomerById({});
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
      if (!cancelled) setCustomerById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [data.groups]);

  const submitGroup = async (e) => {
    e?.preventDefault?.();
    setSavingGroup(true);
    setError('');
    try {
      await createGroup(centerId, {
        name: groupForm.name.trim(),
        invitedByStaffId: Number(groupForm.invitedByStaffId),
        groupAdminCustomerId: groupForm.groupAdminCustomerId.trim(),
        maxMembers: groupForm.maxMembers ? Number(groupForm.maxMembers) : null,
        active: !!groupForm.active,
      });
      setGroupOpen(false);
      setGroupForm(groupFormInit);
      setSelectedGroupAdminLabel('');
      await load();
      addToast('Group created', 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Create failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const openEditGroupModal = (group) => {
    setEditingGroup(group);
    setGroupForm({
      name: String(group?.name || ''),
      invitedByStaffId: String(group?.invitedByStaffId || data.center?.invitedByStaffId || ''),
      groupAdminCustomerId: String(group?.groupAdminCustomerId || ''),
      maxMembers: group?.maxMembers != null ? String(group.maxMembers) : '',
      active: String(group?.status || '').toUpperCase() === 'ACTIVE',
    });
    const label = customerById[String(group?.groupAdminCustomerId || '')]
      ? customerLabelFromDoc(customerById[String(group?.groupAdminCustomerId || '')])
      : '';
    setSelectedEditGroupAdminLabel(label);
    setEditGroupOpen(true);
  };

  const submitEditGroup = async (e) => {
    e?.preventDefault?.();
    if (!editingGroup?.platformGroupId) return;
    setSavingEditGroup(true);
    setError('');
    try {
      await updateGroupRequest(editingGroup.platformGroupId, {
        name: groupForm.name.trim(),
        invitedByStaffId: Number(groupForm.invitedByStaffId),
        groupAdminCustomerId: groupForm.groupAdminCustomerId.trim(),
        maxMembers: groupForm.maxMembers ? Number(groupForm.maxMembers) : null,
        active: !!groupForm.active,
      });
      setEditGroupOpen(false);
      setEditingGroup(null);
      setGroupForm(groupFormInit);
      setSelectedEditGroupAdminLabel('');
      await load();
      addToast('Group updated', 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Update failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingEditGroup(false);
    }
  };

  const confirmDeactivateGroup = async () => {
    if (!deactivateTarget?.platformGroupId) return;
    setDeactivatingGroup(true);
    setError('');
    try {
      await deactivateGroupRequest(deactivateTarget.platformGroupId);
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      await load();
      addToast('Group deactivated', 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Deactivate failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setDeactivatingGroup(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!deleteTarget?.platformGroupId) return;
    setDeletingGroup(true);
    setError('');
    try {
      await deleteGroupRequest(deleteTarget.platformGroupId);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await load();
      addToast('Group deleted', 'success');
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Delete failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setDeletingGroup(false);
    }
  };

  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` })),
    [staff],
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

  const inviterStaff = staff.find((item) => String(item.id) === String(data.center?.invitedByStaffId || ''));
  const officeDoc = offices.find((office) => String(office.id) === String(data.center?.officeId || '')) || null;
  const officeLabel = data.center?.invitedByStaffOfficeName
    || (officeDoc
    ? `${officeDoc.name}${officeDoc.parentName ? ` - ${officeDoc.parentName}` : ''}`
    : data.center?.officeId
    ? `Office ${data.center.officeId}`
    : '-');
  const invitedByStaffLabel = data.center?.invitedByStaffName
    || inviterStaff?.displayName
    || (data.center?.invitedByStaffId ? `Staff ${data.center.invitedByStaffId}` : '-');
  const invitedByStaffPhone = data.center?.invitedByStaffPhone || inviterStaff?.mobileNo || '-';
  const invitedByStaffEmail = data.center?.invitedByStaffEmail || inviterStaff?.email || '-';

  const groupColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Group',
      sortable: false,
      render: (row) => <div className="font-medium text-slate-900 dark:text-slate-50">{row?.name || '-'}</div>,
    },
    {
      key: 'groupAdminCustomerId',
      header: 'Group Admin',
      sortable: false,
      render: (row) => {
        const doc = customerById[String(row?.groupAdminCustomerId || '')] || null;
        return doc ? customerLabelFromDoc(doc) : '-';
      },
    },
    {
      key: 'invitedByStaffId',
      header: 'Invited By Staff',
      sortable: false,
      render: (row) => {
        const staffDoc = staff.find((item) => String(item.id) === String(row?.invitedByStaffId || ''));
        return staffDoc ? `${staffDoc.displayName}${staffDoc.mobileNo ? ` - ${staffDoc.mobileNo}` : ''}` : '-';
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: (row) => <Badge tone={statusTone(row?.status)}>{row?.status || '-'}</Badge>,
    },
    {
      key: 'memberCount',
      header: 'Members',
      sortable: false,
      render: (row) => `${row?.memberCount || 0}/${row?.maxMembers || '-'}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/gateway/groups/${encodeURIComponent(row?.platformGroupId)}`)}>Open</Button>
          <Button size="sm" variant="ghost" onClick={() => openEditGroupModal(row)}>
            <SquarePen size={14} /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDeactivateTarget(row);
              setDeactivateOpen(true);
            }}
            disabled={String(row?.status || '').toUpperCase() !== 'ACTIVE'}
          >
            <Power size={14} /> Deactivate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              setDeleteTarget(row);
              setDeleteOpen(true);
            }}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      ),
    },
  ], [customerById, staff]);

  return (
    <div className="space-y-4">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Center Details</h1>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{data.center?.name || centerId}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/gateway/centers"><Button variant="secondary">Back</Button></Link>
            <Button variant="secondary" onClick={load} disabled={loading || savingGroup}>Refresh</Button>
            <Button onClick={() => { setGroupForm((prev) => ({ ...groupFormInit, invitedByStaffId: String(data.center?.invitedByStaffId || '') })); setSelectedGroupAdminLabel(''); setGroupOpen(true); }} disabled={loading}>
              <Plus size={16} /> Create Group
            </Button>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        {loading ? (
          <Skeleton height="10rem" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><div className="text-xs text-slate-500">Status</div><div className="mt-1 text-sm"><Badge tone={statusTone(data.center?.status)}>{data.center?.status || '-'}</Badge></div></div>
            <div><div className="text-xs text-slate-500">Office</div><div className="mt-1 text-sm">{officeLabel}</div></div>
            <div><div className="text-xs text-slate-500">Invited By Staff</div><div className="mt-1 text-sm">{invitedByStaffLabel}</div></div>
            <div><div className="text-xs text-slate-500">Staff Phone</div><div className="mt-1 text-sm">{invitedByStaffPhone}</div></div>
            <div><div className="text-xs text-slate-500">Staff Email</div><div className="mt-1 text-sm">{invitedByStaffEmail}</div></div>
            <div><div className="text-xs text-slate-500">Capacity</div><div className="mt-1 text-sm">{data.center?.groupCount || 0}/{data.center?.maxGroups || '-'} groups | {data.center?.memberCount || 0}/{data.center?.maxMembers || '-'} members</div></div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Groups</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Groups under this center.</div>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={groupColumns}
            data={data.groups}
            loading={loading}
            total={data.groups.length}
            page={0}
            limit={Math.max(1, data.groups.length || 1)}
            onPageChange={() => {}}
            sortBy=""
            sortDir="asc"
            onSort={() => {}}
            onRowClick={(row) => navigate(`/gateway/groups/${encodeURIComponent(row.platformGroupId)}`)}
            emptyMessage="No groups found"
          />
        </div>
      </Card>

      <Modal
        open={editGroupOpen}
        onClose={() => (savingEditGroup ? null : setEditGroupOpen(false))}
        title="Edit Group"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditGroupOpen(false)} disabled={savingEditGroup}>Cancel</Button>
            <Button onClick={submitEditGroup} disabled={savingEditGroup}>{savingEditGroup ? 'Saving...' : 'Save Changes'}</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitEditGroup}>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={groupForm.name}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <SearchableSelectField
              label="Invited By Staff Id"
              value={groupForm.invitedByStaffId}
              onChange={(value) => setGroupForm((prev) => ({ ...prev, invitedByStaffId: String(value || '') }))}
              options={staffOptions}
              placeholder="Search staff"
              disabled={staffLoading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max Members</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={groupForm.maxMembers}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, maxMembers: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <AsyncSearchableSelectField
              label="Group Admin Customer Id"
              value={groupForm.groupAdminCustomerId}
              onChange={(value, option) => {
                setGroupForm((prev) => ({ ...prev, groupAdminCustomerId: String(value || '') }));
                setSelectedEditGroupAdminLabel(option?.label || '');
              }}
              loadOptions={searchCustomerOptions}
              selectedLabel={selectedEditGroupAdminLabel}
              placeholder="Search customer"
              required
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={groupForm.active} onChange={(e) => setGroupForm((prev) => ({ ...prev, active: e.target.checked }))} />
            Active
          </label>
        </form>
      </Modal>

      <Modal
        open={groupOpen}
        onClose={() => (savingGroup ? null : setGroupOpen(false))}
        title="Create Group"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGroupOpen(false)} disabled={savingGroup}>Cancel</Button>
            <Button onClick={submitGroup} disabled={savingGroup}>{savingGroup ? 'Creating...' : 'Create Group'}</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitGroup}>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={groupForm.name}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <SearchableSelectField
              label="Invited By Staff Id"
              value={groupForm.invitedByStaffId}
              onChange={(value) => setGroupForm((prev) => ({ ...prev, invitedByStaffId: String(value || '') }))}
              options={staffOptions}
              placeholder="Search staff"
              disabled={staffLoading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max Members</label>
            <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={groupForm.maxMembers}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, maxMembers: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <AsyncSearchableSelectField
              label="Group Admin Customer Id"
              value={groupForm.groupAdminCustomerId}
              onChange={(value, option) => {
                setGroupForm((prev) => ({ ...prev, groupAdminCustomerId: String(value || '') }));
                setSelectedGroupAdminLabel(option?.label || '');
              }}
              loadOptions={searchCustomerOptions}
              selectedLabel={selectedGroupAdminLabel}
              placeholder="Search customer"
              required
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={groupForm.active} onChange={(e) => setGroupForm((prev) => ({ ...prev, active: e.target.checked }))} />
            Active immediately
          </label>
        </form>
      </Modal>

      <Modal
        open={deactivateOpen}
        onClose={() => (deactivatingGroup ? null : setDeactivateOpen(false))}
        title="Deactivate Group"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivateOpen(false)} disabled={deactivatingGroup}>Cancel</Button>
            <Button onClick={confirmDeactivateGroup} disabled={deactivatingGroup}>
              {deactivatingGroup ? 'Deactivating...' : 'Deactivate Group'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Deactivate <span className="font-medium text-slate-900 dark:text-slate-100">{deactivateTarget?.name || '-'}</span>?</p>
          <p>The group must not have members with active loans. Active members will be deactivated with the group.</p>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => (deletingGroup ? null : setDeleteOpen(false))}
        title="Delete Group"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deletingGroup}>Cancel</Button>
            <Button onClick={confirmDeleteGroup} disabled={deletingGroup}>
              {deletingGroup ? 'Deleting...' : 'Delete Group'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Delete <span className="font-medium text-slate-900 dark:text-slate-100">{deleteTarget?.name || '-'}</span>?</p>
          <p>This removes the local group record after deleting it upstream in Fineract. Members with active loans will block the action.</p>
        </div>
      </Modal>
    </div>
  );
};

export default CommunityCenterDetails;
