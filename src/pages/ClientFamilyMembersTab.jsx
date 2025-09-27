import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';
import FamilyMemberForm from '../components/FamilyMemberForm';
import { Plus, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react';

const fmtDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : (v ? String(v) : '—'));

export default function ClientFamilyMembersTab({ clientId }) {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [list, setList] = useState([]);
    const [template, setTemplate] = useState(null);

    const [search, setSearch] = useState('');
    const [viewing, setViewing] = useState(null);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);

    // Load template (dropdown options)
    const loadTemplate = async () => {
        try {
            const r = await api.get(`/clients/${clientId}/familymembers/template`);
            setTemplate(r.data || {});
        } catch {
            setTemplate({});
        }
    };

    // Load members list
    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/${clientId}/familymembers`);
            const items = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || r?.data?.familyMembers || []);
            setList(items);
        } catch (e) {
            setList([]);
            addToast('Failed to load family members', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clientId) return;
        loadTemplate();
        load();
    }, [clientId]);

    const filtered = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!t) return list;
        return list.filter(m => {
            const hay = [
                m.firstName, m.middleName, m.lastName,
                m.relationship?.name, m.gender?.name,
                m.mobileNumber, m.age, m.id,
            ].map(x => String(x ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [list, search]);

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/clients/${clientId}/familymembers`, payload);
            addToast('Family member added', 'success');
            setCreating(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const update = async (id, payload) => {
        setBusy(true);
        try {
            await api.put(`/clients/${clientId}/familymembers/${id}`, payload);
            addToast('Family member updated', 'success');
            setEditing(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this family member?')) return;
        setBusy(true);
        try {
            await api.delete(`/clients/${clientId}/familymembers/${id}`);
            addToast('Deleted', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const columns = useMemo(() => [
        { key: 'id', header: '#', sortable: true, render: (r) => r.id },
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (r) => (
                <div>
                    <div className="font-medium">{[r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || '-'}</div>
                    {r.relationship?.name ? <div className="text-xs text-gray-500">{r.relationship.name}</div> : null}
                </div>
            ),
        },
        {
            key: 'gender',
            header: 'Gender',
            sortable: true,
            render: (r) => r.gender?.name || '—',
        },
        {
            key: 'dob',
            header: 'DOB / Age',
            sortable: true,
            render: (r) => (
                <div className="text-sm">
                    <div>{fmtDate(r.dateOfBirth)}</div>
                    {r.age ? <div className="text-xs text-gray-500">{r.age} yrs</div> : null}
                </div>
            ),
        },
        { key: 'mobile', header: 'Mobile', sortable: true, render: (r) => r.mobileNumber || '—' },
        {
            key: 'dependent',
            header: 'Dependent',
            sortable: true,
            render: (r) =>
                r.isDependent ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">Yes</span>
                ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">No</span>
                ),
        },
        {
            key: 'actions',
            header: '',
            sortable: false,
            render: (r) => (
                <div className="flex items-center gap-1 justify-end">
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                        title="View"
                        aria-label="View"
                        onClick={(e) => { e.stopPropagation(); setViewing(r); }}
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                        title="Edit"
                        aria-label="Edit"
                        onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-white hover:bg-red-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-red-700 text-red-600"
                        title="Delete"
                        aria-label="Delete"
                        onClick={(e) => { e.stopPropagation(); remove(r.id); }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Family Members</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        title="Refresh"
                        aria-label="Refresh"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => setCreating(true)}
                        title="Add Family Member"
                        aria-label="Add"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name / relationship / mobile"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : (
                    <DataTable
                        columns={columns}
                        data={filtered}
                        loading={false}
                        total={filtered.length}
                        page={0}
                        limit={filtered.length || 10}
                        onPageChange={() => {}}
                        sortBy={null}
                        sortDir={null}
                        onSort={() => {}}
                        emptyMessage="No family members found"
                    />
                )}
            </Card>

            {/* View modal */}
            <Modal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing ? `Family Member: ${[viewing.firstName, viewing.lastName].filter(Boolean).join(' ')}` : 'Family Member'}
                footer={null}
                size="3xl"
            >
                {viewing && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div><span className="text-sm text-gray-500">Relationship</span><div>{viewing.relationship?.name || '—'}</div></div>
                        <div><span className="text-sm text-gray-500">Gender</span><div>{viewing.gender?.name || '—'}</div></div>
                        <div><span className="text-sm text-gray-500">DOB</span><div>{fmtDate(viewing.dateOfBirth)}</div></div>
                        <div><span className="text-sm text-gray-500">Age</span><div>{viewing.age ?? '—'}</div></div>
                        <div><span className="text-sm text-gray-500">Dependent</span><div>{viewing.isDependent ? 'Yes' : 'No'}</div></div>
                        <div><span className="text-sm text-gray-500">Mobile</span><div>{viewing.mobileNumber || '—'}</div></div>
                        <div><span className="text-sm text-gray-500">Profession</span><div>{viewing.profession?.name || '—'}</div></div>
                        <div><span className="text-sm text-gray-500">Education</span><div>{viewing.educationLevel?.name || '—'}</div></div>
                        <div><span className="text-sm text-gray-500">Marital Status</span><div>{viewing.maritalStatus?.name || '—'}</div></div>
                    </div>
                )}
            </Modal>

            {/* Create modal */}
            <Modal
                open={creating}
                onClose={() => setCreating(false)}
                title="Add Family Member"
                footer={null}
                size="4xl"
            >
                {creating ? (
                    <FamilyMemberForm
                        initial={null}
                        template={template}
                        submitting={busy}
                        onSubmit={create}
                    />
                ) : null}
            </Modal>

            {/* Edit modal */}
            <Modal
                open={!!editing}
                onClose={() => setEditing(null)}
                title={editing ? `Edit: ${[editing.firstName, editing.lastName].filter(Boolean).join(' ')}` : 'Edit Family Member'}
                footer={null}
                size="4xl"
            >
                {editing ? (
                    <FamilyMemberForm
                        initial={editing}
                        template={template}
                        submitting={busy}
                        onSubmit={(payload) => update(editing.id, payload)}
                    />
                ) : null}
            </Modal>
        </div>
    );
}
