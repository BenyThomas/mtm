import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { RotateCcw } from 'lucide-react';

/**
 * Props:
 * - clientId
 * - clientExternalId (optional) to enable external-id endpoints
 */
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const fmtDate = (d) => (Array.isArray(d) ? d.join('-') : (d || ''));

const ClientTransactions = ({ clientId, clientExternalId }) => {
    const { addToast } = useToast();

    // loading/data
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    // filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 450);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [useExternal, setUseExternal] = useState(Boolean(clientExternalId));

    // sorting
    const [sortBy, setSortBy] = useState('date'); // id | externalId | date | type | amount | balance
    const [sortDir, setSortDir] = useState('desc'); // asc | desc

    // pagination
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // actions
    const [busy, setBusy] = useState(false);
    const [undoOpen, setUndoOpen] = useState(false);
    const [undoRow, setUndoRow] = useState(null);

    const listById = async () => {
        const r = await api.get(`/clients/${clientId}/transactions`);
        return Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || r?.data || []);
    };

    const listByExternal = async () => {
        const r = await api.get(
            `/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions`
        );
        return Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || r?.data || []);
    };

    const load = async () => {
        setLoading(true);
        try {
            const list = useExternal ? await listByExternal() : await listById();
            const norm = list.map((t, idx) => {
                const date = Array.isArray(t.transactionDate)
                    ? t.transactionDate.join('-')
                    : (t.transactionDate || t.date || '');
                const type = t.type?.value || t.type || t.transactionType || '';
                const amount =
                    t.amount ??
                    t.amountOutstanding ??
                    t.amountPaid ??
                    t.amountWaived ??
                    t.chargesAmount ??
                    0;
                const balance = t.runningBalance ?? t.balance ?? '';
                return {
                    id: t.id || t.transactionId || idx + 1,
                    externalId: t.externalId || t.transactionExternalId || '',
                    date,
                    amount: Number(amount),
                    currency: t.currency?.code || t.currencyCode || '',
                    type,
                    balance,
                    note: t.note || '',
                };
            });
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load transactions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId, useExternal]);

    // filtering
    const filtered = useMemo(() => {
        let data = rows;

        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            data = data.filter(r =>
                [r.id, r.externalId, r.type, r.amount, r.date, r.note]
                    .map(v => String(v ?? '').toLowerCase())
                    .some(s => s.includes(q))
            );
        }
        if (fromDate) data = data.filter(r => !r.date || r.date >= fromDate);
        if (toDate) data = data.filter(r => !r.date || r.date <= toDate);

        return data;
    }, [rows, debouncedSearch, fromDate, toDate]);

    // sorting
    const sorted = useMemo(() => {
        const d = [...filtered];
        const dir = sortDir === 'asc' ? 1 : -1;
        d.sort((a, b) => {
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av == null && bv == null) return 0;
            if (av == null) return -1 * dir;
            if (bv == null) return 1 * dir;

            // numeric sort for amount/balance/id
            if (['amount', 'balance', 'id'].includes(sortBy)) {
                const na = Number(av), nb = Number(bv);
                if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
            }

            // date sort
            if (sortBy === 'date') {
                return (new Date(av) - new Date(bv)) * dir;
            }

            return String(av).localeCompare(String(bv)) * dir;
        });
        return d;
    }, [filtered, sortBy, sortDir]);

    // pagination (client-side)
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

    const clearFilters = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setPage(0);
    };

    // actions
    const openUndo = (row) => {
        setUndoRow(row);
        setUndoOpen(true);
    };

    const confirmUndo = async () => {
        if (!undoRow) return;
        setBusy(true);
        try {
            const payload = { locale: 'en', dateFormat: 'yyyy-MM-dd' };
            if (useExternal && clientExternalId) {
                if (undoRow.externalId) {
                    await api.post(
                        `/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions/external-id/${encodeURIComponent(undoRow.externalId)}`,
                        payload
                    );
                } else {
                    await api.post(
                        `/clients/external-id/${encodeURIComponent(clientExternalId)}/transactions/${undoRow.id}`,
                        payload
                    );
                }
            } else {
                if (undoRow.externalId) {
                    await api.post(
                        `/clients/${clientId}/transactions/external-id/${encodeURIComponent(undoRow.externalId)}`,
                        payload
                    );
                } else {
                    await api.post(`/clients/${clientId}/transactions/${undoRow.id}`, payload);
                }
            }
            addToast('Transaction undone', 'success');
            await load();
            setUndoOpen(false);
            setUndoRow(null);
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Undo failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    // columns for DataTable
    const columns = useMemo(
        () => [
            { key: 'id', header: '#', sortable: true, render: (r) => r.id },
            { key: 'externalId', header: 'External ID', sortable: true, render: (r) => r.externalId || '—' },
            { key: 'date', header: 'Date', sortable: true, render: (r) => fmtDate(r.date) || '—' },
            { key: 'type', header: 'Type', sortable: true, render: (r) => r.type || '—' },
            {
                key: 'amount',
                header: 'Amount',
                sortable: true,
                render: (r) => (<span>{r.amount} {r.currency}</span>),
            },
            {
                key: 'balance',
                header: 'Balance',
                sortable: true,
                render: (r) => (r.balance ?? '—'),
            },
            {
                key: 'note',
                header: 'Note',
                sortable: true,
                render: (r) => r.note || '—',
            },
            {
                key: 'actions',
                header: '',
                sortable: false,
                render: (r) => (
                    <button
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        onClick={() => openUndo(r)}
                        disabled={busy}
                        title="Undo"
                    >
                        <RotateCcw size={18} />
                    </button>
                ),
            },
        ],
        [busy]
    );

    return (
        <div className="space-y-4">
            {/* Header / Quick actions */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Transactions</h2>
                <div className="flex items-center gap-3">
                    {clientExternalId ? (
                        <label className="text-sm inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={useExternal}
                                onChange={(e) => setUseExternal(e.target.checked)}
                            />
                            Use external-id API
                        </label>
                    ) : null}
                    <Button variant="secondary" onClick={load}>Refresh</Button>
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
                            placeholder="Type, amount, date, note…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                    <div className="flex items-center space-x-2">
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
                        emptyMessage="No transactions."
                    />
                )}
            </Card>

            {/* Undo modal */}
            <Modal
                open={undoOpen}
                title={undoRow ? `Undo Transaction #${undoRow.id}` : 'Undo Transaction'}
                onClose={() => { setUndoOpen(false); setUndoRow(null); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setUndoOpen(false); setUndoRow(null); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmUndo} disabled={busy}>
                            {busy ? 'Undoing…' : 'Confirm Undo'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    This will reverse the transaction
                    {undoRow?.externalId ? ` (External ID: ${undoRow.externalId})` : ''}. Continue?
                </p>
            </Modal>
        </div>
    );
};

export default ClientTransactions;
