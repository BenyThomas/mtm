import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';
import GlobalConfigForm from '../components/GlobalConfigForm';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { RefreshCw, Pencil, Eye, Power } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const pickList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.globalConfiguration)) return data.globalConfiguration;
    if (data && Array.isArray(data.pageItems)) return data.pageItems;
    return [];
};

const asBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
    return false;
};

const GlobalConfigurations = () => {
    const { addToast } = useToast();

    // raw list and UI state
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    // filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);

    // table sorting/pagination (client-side)
    const [sortBy, setSortBy] = useState('name');   // id | name | enabled | value | stringValue
    const [sortDir, setSortDir] = useState('asc');  // asc | desc
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // editing modal
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/configurations');
            const list = pickList(res?.data).map((x) => ({
                id: x.id,
                name: x.name,
                enabled: x.enabled,
                value: x.value,
                stringValue: x.stringValue,
                description: x.description,
            }));

            // keep notable flags first, then alpha
            const orderHint = [
                'maker-checker',
                'reschedule-future-repayments',
                'allow-transactions-on-non-workingday',
                'reschedule-repayments-on-holidays',
                'allow-transactions-on-holiday',
                'savings-interest-posting-current-period-end',
                'financial-year-beginning-month',
                'meetings-mandatory-for-jlg-loans',
            ];
            list.sort((a, b) => {
                const ia = orderHint.indexOf(a.name);
                const ib = orderHint.indexOf(b.name);
                if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                return String(a.name || '').localeCompare(String(b.name || ''));
            });

            setItems(list);
        } catch (err) {
            setItems([]);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load global configurations';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // search filter
    const searched = useMemo(() => {
        const t = debouncedSearch.trim().toLowerCase();
        if (!t) return items;
        return items.filter((c) => {
            const hay = [
                c.name, c.description, c.id, c.value, c.stringValue, c.enabled,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, debouncedSearch]);

    // sorting
    const sorted = useMemo(() => {
        const copy = [...searched];
        copy.sort((a, b) => {
            const A = (a[sortBy] ?? '').toString().toLowerCase();
            const B = (b[sortBy] ?? '').toString().toLowerCase();
            if (A < B) return sortDir === 'asc' ? -1 : 1;
            if (A > B) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return copy;
    }, [searched, sortBy, sortDir]);

    // pagination
    const total = sorted.length;
    const paged = useMemo(() => {
        const start = page * limit;
        return sorted.slice(start, start + limit);
    }, [sorted, page, limit]);

    const onSort = (key) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const quickToggle = async (item) => {
        const newEnabled = !asBool(item.enabled);
        try {
            try {
                await api.put(`/configurations/name/${encodeURIComponent(item.name)}`, { enabled: newEnabled });
            } catch {
                await api.put(`/configurations/${item.id}`, { enabled: newEnabled });
            }
            addToast(`"${item.name}" ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Toggle failed';
            addToast(msg, 'error');
        }
    };

    const save = async (payload) => {
        if (!editing) return;
        setSaving(true);
        try {
            try {
                await api.put(`/configurations/name/${encodeURIComponent(editing.name)}`, payload);
            } catch {
                await api.put(`/configurations/${editing.id}`, payload);
            }
            addToast('Configuration saved', 'success');
            setEditing(null);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    // columns for DataTable (aligned with Loans.jsx style)
    const columns = useMemo(
        () => [
            { key: 'id', header: '#', sortable: true, render: (r) => r.id },
            {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (r) => (
                    <div>
                        <div className="font-medium">{r.name}</div>
                        {r.description ? (
                            <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'enabled',
                header: 'Enabled',
                sortable: true,
                render: (r) => (
                    <button
                        onClick={(e) => { e.stopPropagation(); quickToggle(r); }}
                        title={asBool(r.enabled) ? 'Disable' : 'Enable'}
                        aria-label={asBool(r.enabled) ? 'Disable' : 'Enable'}
                        className={`inline-flex items-center justify-center rounded-md h-8 w-8 border transition
              ${asBool(r.enabled)
                            ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
                            : 'border-gray-300 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}
                    >
                        <Power size={16} />
                    </button>
                ),
            },
            { key: 'value', header: 'Value', sortable: true, render: (r) => r.value ?? '—' },
            { key: 'stringValue', header: 'String', sortable: true, render: (r) => r.stringValue || '—' },
            {
                key: 'actions',
                header: '',
                sortable: false,
                render: (r) => (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                            title="Edit"
                            aria-label="Edit"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.assign(`/config/global-config/${encodeURIComponent(r.name)}`);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                            title="View"
                            aria-label="View"
                        >
                            <Eye size={16} />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-6">
            {/* Header / Quick actions (icon refresh to mirror compact style) */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Global Configuration</h1>
                <div className="space-x-2">
                    <button
                        onClick={load}
                        title="Refresh"
                        aria-label="Refresh"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Filters (same spacing & inputs as Loans.jsx) */}
            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Name / description / value"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Right side: Rows selector to match Loans.jsx */}
                    <div className="xl:col-start-6 flex items-end justify-end">
                        <div className="flex items-center space-x-2 w-full justify-end">
                            <label className="text-sm">Rows</label>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(0);
                                }}
                                className="border rounded p-1 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : (
                    <DataTable
                        columns={columns}
                        data={paged}
                        loading={false}
                        total={total}
                        page={page}
                        limit={limit}
                        onPageChange={setPage}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                        // no row click navigation; configs are edited via icon
                        emptyMessage="No configuration items found"
                    />
                )}
            </Card>

            {/* Edit modal (wider like the Staff modal you styled) */}
            <Modal
                open={!!editing}
                title={editing ? `Edit: ${editing.name}` : 'Edit Config'}
                onClose={() => setEditing(null)}
                footer={null}
                size="3xl"
            >
                {editing ? (
                    <GlobalConfigForm initial={editing} onSubmit={save} submitting={saving} />
                ) : null}
            </Modal>
        </div>
    );
};

export default GlobalConfigurations;
