import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Shield,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import RoleForm from '../../components/RoleForm';
import { useToast } from '../../context/ToastContext';
import { createRole, deleteRole, listRoles, setRoleEnabled, updateRole } from '../../api/roles';

const Roles = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editing, setEditing] = useState(null);

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
            [r.id, r.name, r.description]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

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

    const toggleEnable = async (role) => {
        try {
            await setRoleEnabled(role.id, !role.enabled);
            addToast(!role.enabled ? 'Role enabled' : 'Role disabled', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Toggle failed', 'error');
        }
    };

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

    const openDetails = (role) => {
        navigate(`/admin/roles/${role.id}`, { state: { role } });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="inline-flex items-center gap-2 text-2xl font-bold">
                    <Shield className="h-5 w-5" /> Roles
                </h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>
                        <RefreshCw className="mr-1 h-4 w-4" /> Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> New Role
                    </Button>
                </div>
            </div>

            <Card>
                <label className="block text-sm font-medium">Search</label>
                <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Name, description..."
                        className="w-full rounded-md border p-2 pl-9"
                    />
                </div>
            </Card>

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
                                    <tr
                                        key={r.id}
                                        className="cursor-pointer border-t text-sm transition hover:bg-slate-50"
                                        onClick={() => openDetails(r)}
                                    >
                                        <td className="py-2 pr-4">{r.id}</td>
                                        <td className="py-2 pr-4 font-medium text-slate-900">{r.name}</td>
                                        <td className="py-2 pr-4">{r.description || '-'}</td>
                                        <td className="py-2 pr-4">{r.enabled ? 'Enabled' : 'Disabled'}</td>
                                        <td className="space-x-2 whitespace-nowrap py-2 pr-4">
                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetails(r);
                                                }}
                                            >
                                                Manage
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditing(r);
                                                    setEditOpen(true);
                                                }}
                                            >
                                                <Pencil className="mr-1 h-4 w-4" /> Edit
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleEnable(r);
                                                }}
                                            >
                                                {r.enabled ? (
                                                    <ToggleLeft className="mr-1 h-4 w-4" />
                                                ) : (
                                                    <ToggleRight className="mr-1 h-4 w-4" />
                                                )}
                                                {r.enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleting(r);
                                                }}
                                            >
                                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New Role"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pb-1 pt-4"
                footer={null}
            >
                <RoleForm onSubmit={doCreate} submitting={createBusy} />
            </Modal>

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
                bodyClassName="pb-1 pt-4"
                footer={null}
            >
                <RoleForm initial={editing} onSubmit={doUpdate} submitting={editBusy} />
            </Modal>

            <Modal
                open={Boolean(deleting)}
                onClose={() => {
                    if (!deleteBusy) setDeleting(null);
                }}
                title="Delete Role"
                size="sm"
                footer={(
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                            Cancel
                        </Button>
                        <Button onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting...' : 'Delete'}
                        </Button>
                    </>
                )}
            >
                <p className="text-sm">
                    Delete role <span className="font-semibold">{deleting?.name}</span>?
                </p>
            </Modal>
        </div>
    );
};

export default Roles;
