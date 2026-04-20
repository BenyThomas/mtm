import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckSquare,
    KeyRound,
    RefreshCw,
    Save,
    Search,
    Shield,
    Square,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { deleteRole, getRolePermissions, listRoles, setRoleEnabled, updateRolePermissions } from '../../api/roles';
import { listPermissions } from '../../api/permissions';

const groupByEntity = (items) => {
    const groups = new Map();
    for (const item of items) {
        const key = item.entityName || 'Other';
        const bucket = groups.get(key) || [];
        bucket.push(item);
        groups.set(key, bucket);
    }
    return Array.from(groups.entries())
        .map(([entityName, groupItems]) => [
            entityName,
            groupItems.slice().sort((a, b) => `${a.actionName} ${a.code}`.localeCompare(`${b.actionName} ${b.code}`)),
        ])
        .sort((a, b) => a[0].localeCompare(b[0]));
};

const RoleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();

    const [role, setRole] = useState(location.state?.role || null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [permOptions, setPermOptions] = useState([]);
    const [permSelected, setPermSelected] = useState([]);

    const load = async () => {
        setLoading(true);
        try {
            const [roles, allPerms, rolePerms] = await Promise.all([
                listRoles(),
                listPermissions(),
                getRolePermissions(id),
            ]);
            const nextRole = roles.find((item) => String(item.id) === String(id)) || location.state?.role || null;
            const selectedCodes = new Set(
                rolePerms.filter((p) => p.selected).map((p) => String(p.code || '').trim()).filter(Boolean)
            );
            const rolePermByCode = new Map(rolePerms.map((p) => [String(p.code || '').trim(), p]));
            const merged = allPerms.map((p) => {
                const code = String(p.code || '').trim();
                const current = rolePermByCode.get(code);
                return {
                    id: p.id ?? code,
                    code,
                    rawCode: current?.rawCode || p.code || code,
                    entityName: current?.entityName || p.entityName || 'Other',
                    actionName: current?.actionName || p.actionName || code,
                    description: current?.description || p.description || code,
                };
            });
            setRole(nextRole);
            setPermOptions(merged);
            setPermSelected(Array.from(selectedCodes));
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load role details', 'error');
            setPermOptions([]);
            setPermSelected([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const selectedSet = useMemo(() => new Set(permSelected), [permSelected]);

    const assignedPermissions = useMemo(
        () => permOptions.filter((item) => selectedSet.has(String(item.code || '').trim())),
        [permOptions, selectedSet]
    );

    const filteredPermOptions = useMemo(() => {
        const qText = query.trim().toLowerCase();
        if (!qText) return permOptions;
        return permOptions.filter((item) =>
            [item.code, item.entityName, item.actionName, item.description]
                .map((value) => String(value ?? '').toLowerCase())
                .some((value) => value.includes(qText))
        );
    }, [permOptions, query]);

    const permissionGroups = useMemo(() => groupByEntity(filteredPermOptions), [filteredPermOptions]);
    const assignedGroups = useMemo(() => groupByEntity(assignedPermissions), [assignedPermissions]);

    const togglePermission = (code) => {
        const normalized = String(code || '').trim();
        if (!normalized) return;
        setPermSelected((prev) => {
            const next = new Set(prev);
            if (next.has(normalized)) next.delete(normalized);
            else next.add(normalized);
            return Array.from(next);
        });
    };

    const setGroupSelection = (groupItems, checked) => {
        const codes = groupItems.map((item) => String(item.code || '').trim()).filter(Boolean);
        setPermSelected((prev) => {
            const next = new Set(prev);
            for (const code of codes) {
                if (checked) next.add(code);
                else next.delete(code);
            }
            return Array.from(next);
        });
    };

    const savePermissions = async () => {
        setSaving(true);
        try {
            const permissionsMap = {};
            for (const opt of permOptions) {
                const payloadCode = String(opt.rawCode || opt.code || '');
                if (!payloadCode) continue;
                permissionsMap[payloadCode] = selectedSet.has(String(opt.code || '').trim());
            }
            await updateRolePermissions(id, permissionsMap);
            addToast('Role permissions updated', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to update role permissions', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleEnabled = async () => {
        if (!role) return;
        try {
            await setRoleEnabled(role.id, !role.enabled);
            addToast(!role.enabled ? 'Role enabled' : 'Role disabled', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to update role status', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!role) return;
        setDeleteBusy(true);
        try {
            await deleteRole(role.id);
            addToast('Role deleted', 'success');
            navigate('/admin/roles');
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to delete role', 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Button variant="secondary" onClick={() => navigate('/admin/roles')}>
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Roles
                    </Button>
                    <h1 className="mt-3 inline-flex items-center gap-2 text-2xl font-bold">
                        <Shield className="h-5 w-5" /> {role?.name || `Role #${id}`}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Open a role and manage permission assignment from a dedicated page.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={load} disabled={loading || saving}>
                        <RefreshCw className="mr-1 h-4 w-4" /> Refresh
                    </Button>
                    <Button variant="secondary" onClick={toggleEnabled} disabled={loading || saving || !role}>
                        {role?.enabled ? <ToggleLeft className="mr-1 h-4 w-4" /> : <ToggleRight className="mr-1 h-4 w-4" />}
                        {role?.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="secondary" onClick={() => setDeleteOpen(true)} disabled={loading || saving || !role}>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {loading ? (
                <Skeleton height="24rem" />
            ) : (
                <>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-1">
                            <div className="space-y-3 text-sm">
                                <div>
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Role ID</div>
                                    <div className="mt-1 font-medium text-slate-900">{role?.id || id}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
                                    <div className="mt-1 text-slate-700">{role?.description || 'No description'}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</div>
                                    <div className="mt-1">{role?.enabled ? 'Enabled' : 'Disabled'}</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="lg:col-span-2">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                                        <KeyRound className="h-4 w-4" /> Assigned Permissions
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {assignedPermissions.length} permission{assignedPermissions.length === 1 ? '' : 's'} currently assigned.
                                    </p>
                                </div>
                                <Button onClick={savePermissions} disabled={saving}>
                                    <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                            <div className="mt-4 max-h-64 space-y-4 overflow-auto pr-1">
                                {!assignedGroups.length ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                                        This role has no assigned permissions.
                                    </div>
                                ) : (
                                    assignedGroups.map(([groupName, groupItems]) => (
                                        <div key={groupName} className="space-y-2">
                                            <div className="text-sm font-semibold text-slate-900">{groupName}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {groupItems.map((item) => (
                                                    <button
                                                        key={`${item.code}-${item.id}`}
                                                        type="button"
                                                        onClick={() => togglePermission(item.code)}
                                                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                                                        title="Remove permission"
                                                    >
                                                        {item.actionName || item.code}
                                                        {item.code ? ` - ${item.code}` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Permission Manager</div>
                                    <div className="mt-1 text-xs text-slate-600">
                                        Add or remove permissions, then save the role.
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full bg-cyan-100 px-3 py-1 font-medium text-cyan-800">
                                        {permSelected.length} selected
                                    </span>
                                    <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-700">
                                        {permOptions.length} available
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search by code, entity, action..."
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPermSelected(permOptions.map((item) => String(item.code || '').trim()).filter(Boolean))}
                                        disabled={!permOptions.length}
                                    >
                                        Select All
                                    </Button>
                                    <Button variant="secondary" onClick={() => setPermSelected([])} disabled={!permSelected.length}>
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 max-h-[60vh] space-y-4 overflow-auto pr-1">
                            {!permissionGroups.length ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                                    No permissions match the current search.
                                </div>
                            ) : (
                                permissionGroups.map(([groupName, groupItems]) => {
                                    const codes = groupItems.map((item) => String(item.code || '').trim()).filter(Boolean);
                                    const selectedInGroup = codes.filter((code) => selectedSet.has(code)).length;
                                    const allSelected = codes.length > 0 && selectedInGroup === codes.length;
                                    return (
                                        <div key={groupName} className="rounded-2xl border border-slate-200 bg-white">
                                            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{groupName}</div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {selectedInGroup} of {codes.length} selected
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant="secondary" onClick={() => setGroupSelection(groupItems, true)} disabled={allSelected || !codes.length}>
                                                        <CheckSquare className="mr-1 h-4 w-4" /> Add Group
                                                    </Button>
                                                    <Button variant="secondary" onClick={() => setGroupSelection(groupItems, false)} disabled={!selectedInGroup}>
                                                        <Square className="mr-1 h-4 w-4" /> Remove Group
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {groupItems.map((item) => {
                                                    const checked = selectedSet.has(String(item.code || '').trim());
                                                    return (
                                                        <label
                                                            key={`${item.code}-${item.id}`}
                                                            className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
                                                                checked={checked}
                                                                onChange={() => togglePermission(item.code)}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                                                                    <div className="text-sm font-medium text-slate-900">
                                                                        {item.actionName || item.code}
                                                                    </div>
                                                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                        {item.code}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {item.description || 'No description'}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </>
            )}

            <Modal
                open={deleteOpen}
                onClose={() => {
                    if (!deleteBusy) setDeleteOpen(false);
                }}
                title="Delete Role"
                size="sm"
                footer={(
                    <>
                        <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
                            Cancel
                        </Button>
                        <Button onClick={confirmDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting...' : 'Delete'}
                        </Button>
                    </>
                )}
            >
                <p className="text-sm">
                    Delete role <span className="font-semibold">{role?.name}</span>?
                </p>
            </Modal>
        </div>
    );
};

export default RoleDetails;
