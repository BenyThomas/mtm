import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import UserForm from '../../components/UserForm';
import PasswordForm from '../../components/PasswordForm';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, KeyRound, RefreshCw } from 'lucide-react';

const Users = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    // Create
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    // Edit
    const [editOpen, setEditOpen] = useState(false);
    const [editBusy, setEditBusy] = useState(false);
    const [editing, setEditing] = useState(null);

    // Delete
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleting, setDeleting] = useState(null);

    // Change password
    const [pwdOpen, setPwdOpen] = useState(false);
    const [pwdBusy, setPwdBusy] = useState(false);
    const [pwdUser, setPwdUser] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/users'); // baseURL should already include /api/v1
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((u) => ({
                id: u.id,
                username: u.username || '',
                firstname: u.firstname || u.firstName || '',
                lastname: u.lastname || u.lastName || '',
                displayName: u.displayName || `${u.firstname || ''} ${u.lastname || ''}`.trim(),
                email: u.email || '',
                officeId: u.officeId || u.office?.id,
                officeName: u.officeName || u.office?.name,
                staffId: u.staffId || u.staff?.id,
                roles: Array.isArray(u.roles) ? u.roles : [],
                status: u.status || u.selfServiceUser ? 'Self-Service' : '',
            }));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load users';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((u) =>
            [u.id, u.username, u.firstname, u.lastname, u.displayName, u.email, u.officeName]
                .map((v) => String(v ?? '').toLowerCase())
                .some((h) => h.includes(t))
        );
    }, [items, q]);

    // Create
    const create = async (payload) => {
        if (!payload?.username) {
            addToast('Username is required', 'error');
            return;
        }
        setCreateBusy(true);
        try {
            await api.post('/users', payload);
            addToast('User created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    // Edit open/update
    const openEdit = (user) => {
        setEditing(user);
        setEditOpen(true);
    };

    const update = async (payload) => {
        if (!editing?.id) return;
        setEditBusy(true);
        try {
            await api.put(`/users/${editing.id}`, payload);
            addToast('User updated', 'success');
            setEditOpen(false);
            setEditing(null);
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    // Delete
    const askDelete = (user) => {
        setDeleting(user);
    };

    const doDelete = async () => {
        if (!deleting?.id) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/users/${deleting.id}`);
            addToast('User deleted', 'success');
            setDeleting(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    // Change password
    const openPwd = (user) => {
        setPwdUser(user);
        setPwdOpen(true);
    };

    const changePassword = async ({ password, repeatPassword }) => {
        if (!pwdUser?.id) return;
        setPwdBusy(true);
        try {
            await api.post(`/users/${pwdUser.id}/pwd`, { password, repeatPassword });
            addToast('Password changed', 'success');
            setPwdOpen(false);
            setPwdUser(null);
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Password change failed';
            addToast(msg, 'error');
        } finally {
            setPwdBusy(false);
        }
    };

    const downloadTemplateHref = '/api/api/v1/users/downloadtemplate';

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);

    const uploadTemplate = async () => {
        if (!uploadFile) {
            addToast('Choose a file to upload', 'error');
            return;
        }
        setUploadBusy(true);
        try {
            const form = new FormData();
            form.append('file', uploadFile);
            await api.post('/users/uploadtemplate', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Template uploaded', 'success');
            setUploadOpen(false);
            setUploadFile(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Upload failed';
            addToast(msg, 'error');
        } finally {
            setUploadBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Users</h1>
                <div className="space-x-2">
                    <a href={downloadTemplateHref} target="_blank" rel="noreferrer">
                        <Button variant="secondary">Download Template</Button>
                    </a>
                    <Button variant="secondary" onClick={() => setUploadOpen(true)}>Upload Template</Button>
                    <Button variant="secondary" onClick={load}>
                        <RefreshCw className="w-4 h-4 inline -mt-1 mr-1" /> Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> New User
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Username, name, email, office…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No users found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Username</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Roles</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((u) => (
                                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{u.id}</td>
                                    <td className="py-2 pr-4">{u.username}</td>
                                    <td className="py-2 pr-4">{u.displayName || `${u.firstname} ${u.lastname}`}</td>
                                    <td className="py-2 pr-4">{u.email || '—'}</td>
                                    <td className="py-2 pr-4">{u.officeName || '—'}</td>
                                    <td className="py-2 pr-4">
                                        {u.roles?.length ? u.roles.map(r => r.name || r.id).join(', ') : '—'}
                                    </td>
                                    <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                        <Button variant="secondary" onClick={() => openEdit(u)}>
                                            <Pencil className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                        <Button variant="secondary" onClick={() => openPwd(u)}>
                                            <KeyRound className="w-4 h-4 mr-1" /> Password
                                        </Button>
                                        <Button variant="secondary" onClick={() => askDelete(u)}>
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

            {/* Create Modal */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New User"
                size="5xl"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fill in the user details below. Fields marked with * are required.
                    </p>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <UserForm mode="create" onSubmit={create} submitting={createBusy} />
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                open={editOpen}
                onClose={() => { if (!editBusy) { setEditOpen(false); setEditing(null); } }}
                title="Edit User"
                size="lg"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Update the user details below.
                    </p>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <UserForm mode="edit" initial={editing} onSubmit={update} submitting={editBusy} />
                    </div>
                </div>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                open={pwdOpen}
                onClose={() => { if (!pwdBusy) { setPwdOpen(false); setPwdUser(null); } }}
                title={`Change Password${pwdUser ? `: ${pwdUser.username}` : ''}`}
                size="md"
                panelClassName="shadow-2xl"
                bodyClassName="pt-4 pb-1"
                footer={null}
            >
                <PasswordForm onSubmit={changePassword} submitting={pwdBusy} />
            </Modal>

            {/* Upload Template modal */}
            <Modal
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                title="Upload Users Template"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button onClick={uploadTemplate} disabled={uploadBusy}>
                            {uploadBusy ? 'Uploading…' : 'Upload'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a CSV/Excel file generated from the downloaded template format.
                    </p>
                    <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="w-full file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-sm hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                    />
                </div>
            </Modal>

            {/* Simple Delete confirm modal (reuse Modal) */}
            <Modal
                open={Boolean(deleting)}
                onClose={() => { if (!deleteBusy) setDeleting(null); }}
                title="Delete User"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</Button>
                        <Button onClick={doDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to delete user{' '}
                    <span className="font-semibold">{deleting?.username}</span>?
                </p>
            </Modal>
        </div>
    );
};

export default Users;
