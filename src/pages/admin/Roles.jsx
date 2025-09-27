import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import RoleForm from '../../components/RoleForm';
import { useToast } from '../../context/ToastContext';
import {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    setRoleEnabled,
    getRolePermissions,
    updateRolePermissions,
} from '../../api/roles';
import { listPermissions } from '../../api/permissions';
import {
    Plus,
    Pencil,
    Trash2,
    Shield,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    KeyRound,
} from 'lucide-react';
import MultiSelect from "../../components/MultiSelect";

const Roles = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    // create
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    // edit
    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editing, setEditing] = useState(null);

    // permissions assign
    const [permOpen, setPermOpen] = useState(false);
    const [permBusy, setPermBusy] = useState(false);
    const [permRole, setPermRole] = useState(null);
    const [permOptions, setPermOptions] = useState([]);   // [{ id, code, name }]
    const [permSelected, setPermSelected] = useState([]); // number[] of permission IDs

    // delete
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const rs = await listRoles();
            setItems(rs);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load roles', 'error');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((r) =>
            [r.id, r.name, r.description].map((v) => String(v ?? '').toLowerCase()).some((h) => h.includes(t))
        );
    }, [items, q]);

    // Create
    const doCreate = async (payload) => {
        if (!payload?.name) {
            addToast('Name is required', 'error');
            return;
        }
        setCreateBusy(true);
        try {
            await createRole(payload);
            addToast('Role created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Create failed', 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    // Edit
    const openEdit = (role) => {
        setEditing(role);
        setEditOpen(true);
    };

    const doUpdate = async (payload) => {
        if (!editing?.id) return;
        setEditBusy(true);
        try {
            await updateRole(editing.id, payload);
            addToast('Role updated', 'success');
            setEditOpen(false);
            setEditing(null);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setEditBusy(false);
        }
    };

    // Enable/Disable
    const toggleEnable = async (role) => {
        try {
            await setRoleEnabled(role.id, !role.enabled);
            addToast(!role.enabled ? 'Role enabled' : 'Role disabled', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Toggle failed', 'error');
        }
    };

    // Assign permissions
    const openPerms = async (role) => {
        setPermRole(role);
        setPermOpen(true);
        setPermBusy(true);
        try {
            const [allPerms, rolePerms] = await Promise.all([listPermissions(), getRolePermissions(role.id)]);
            // Show a friendly label + keep the raw code for PUT mapping
            const opts = allPerms.map((p) => ({
                id: p.id,
                code: p.code, // e.g., 'CLIENT_CREATE'
                name: `${p.entityName}:${p.actionName} · ${p.code}`,
            }));
            setPermOptions(opts);
            // pre-select IDs that the role currently has
            setPermSelected(rolePerms.filter((p) => p.selected).map((p) => p.id));
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load permissions', 'error');
            setPermOptions([]);
            setPermSelected([]);
        } finally {
            setPermBusy(false);
        }
    };

    const savePerms = async () => {
        if (!permRole?.id) return;
        setPermBusy(true);
        try {
            // Build { [permissionCode]: boolean } for ALL known permissions
            const selectedSet = new Set(permSelected);
            const permissionsMap = {};
            for (const opt of permOptions) {
                permissionsMap[opt.code] = selectedSet.has(opt.id);
            }
            await updateRolePermissions(permRole.id, permissionsMap);
            addToast('Role permissions updated', 'success');
            setPermOpen(false);
            setPermRole(null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setPermBusy(false);
        }
    };

    // Delete
    const askDelete = (role) => setDeleting(role);

    const doDelete = async () => {
        if (!deleting?.id) return;
        setDeleteBusy(true);
        try {
            await deleteRole(deleting.id);
            addToast('Role deleted', 'success');
            setDeleting(null);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold inline-flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Roles
                </h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> New Role
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <label className="block text-sm font-medium">Search</label>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Name, description…"
                    className="mt-1 w-full border rounded-md p-2"
                />
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600">No roles found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-t text-sm">
                                    <td className="py-2 pr-4">{r.id}</td>
                                    <td className="py-2 pr-4">{r.name}</td>
                                    <td className="py-2 pr-4">{r.description || '—'}</td>
                                    <td className="py-2 pr-4">{r.enabled ? 'Enabled' : 'Disabled'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => openPerms(r)}>
                                            <KeyRound className="w-4 h-4 mr-1" /> Permissions
                                        </Button>
                                        <Button variant="secondary" onClick={() => openEdit(r)}>
                                            <Pencil className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                        <Button variant="secondary" onClick={() => toggleEnable(r)}>
                                            {r.enabled ? (
                                                <ToggleLeft className="w-4 h-4 mr-1" />
                                            ) : (
                                                <ToggleRight className="w-4 h-4 mr-1" />
                                            )}
                                            {r.enabled ? 'Disable' : 'Enable'}
                                        </Button>
                                        <Button variant="secondary" onClick={() => askDelete(r)}>
                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New Role"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <RoleForm onSubmit={doCreate} submitting={createBusy} />
            </Modal>

            {/* Edit */}
            <Modal
                open={editOpen}
                onClose={() => {
                    if (!editBusy) {
                        setEditOpen(false);
                        setEditing(null);
                    }
                }}
                title="Edit Role"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <RoleForm initial={editing} onSubmit={doUpdate} submitting={editBusy} />
            </Modal>

            {/* Assign Permissions */}
            <Modal
                open={permOpen}
                onClose={() => {
                    if (!permBusy) {
                        setPermOpen(false);
                        setPermRole(null);
                    }
                }}
                title={permRole ? `Permissions: ${permRole.name}` : 'Permissions'}
                size="5xl"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setPermOpen(false)} disabled={permBusy}>
                            Cancel
                        </Button>
                        <Button onClick={savePerms} disabled={permBusy}>
                            {permBusy ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                }
            >
                {permBusy ? (
                    <Skeleton height="10rem" />
                ) : (
                    <MultiSelect
                        label="Select permissions"
                        options={permOptions}      // [{ id, code, name }]
                        value={permSelected}       // number[]
                        onChange={setPermSelected}
                        disabled={permBusy}
                        required
                    />
                )}
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={Boolean(deleting)}
                onClose={() => {
                    if (!deleteBusy) setDeleting(null);
                }}
                title="Delete Role"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                            Cancel
                        </Button>
                        <Button onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Delete role <span className="font-semibold">{deleting?.name}</span>?
                </p>
            </Modal>
        </div>
    );
};

export default Roles;
