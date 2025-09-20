import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, MinusCircle, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import ClientChargeForm from '../../components/ClientChargeForm';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const fmtDate = (d) => (Array.isArray(d) ? d.join('-') : (d || ''));

const toneForCharge = (row) => {
    if (row.isPaid) return 'green';
    const dueISO = row.dueDate;
    if (dueISO) {
        const today = new Date(); today.setHours(0,0,0,0);
        const dd = new Date(dueISO); dd.setHours(0,0,0,0);
        if (Number(row.amountOutstanding) > 0 && dd < today) return 'yellow';
    }
    return 'gray';
};

const ClientCharges = ({ clientId }) => {
    const { addToast } = useToast();

    // loading/data
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    // filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 350);
    const [status, setStatus] = useState(''); // '', 'paid', 'unpaid'

    // sorting
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('desc');

    // paging
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    // modals / busy
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [activeRow, setActiveRow] = useState(null);

    const [payOpen, setPayOpen] = useState(false);
    const [waiveOpen, setWaiveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().slice(0,10));
    const [payBusy, setPayBusy] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/${clientId}/charges`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((c, i) => ({
                id: c.id || i + 1,
                name: c.name || c.chargeName || '',
                currencyCode: c.currency?.code || c.currencyCode || '',
                amount: c.amount ?? c.amountOrPercentage ?? '',
                amountOutstanding: c.amountOutstanding ?? c.outstandingAmount ?? '',
                amountWaived: c.amountWaived ?? 0,
                isPaid: Boolean(c.paid || c.isPaid),
                penalty: Boolean(c.penalty),
                dueDate: fmtDate(c.dueDate),
                chargeTimeType: c.chargeTimeType?.value || c.chargeTimeType || '',
                statusText: c.status?.value || c.status || '',
            }));
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load client charges', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId]);

    // actions
    const addCharge = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post(`/clients/${clientId}/charges`, payload);
            addToast('Charge added', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage
                || e?.response?.data?.defaultUserMessage
                || 'Add failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const command = async (id, cmd, payload = {}) => {
        setActionBusy(true);
        try {
            // try flexible command names (pay/waive vs paycharge/waivecharge)
            const tryOnce = (name) =>
                api.post(`/clients/${clientId}/charges/${id}?command=${encodeURIComponent(name)}`, payload);
            try {
                await tryOnce(cmd);
            } catch {
                await tryOnce(cmd === 'pay' ? 'paycharge' : (cmd === 'waive' ? 'waivecharge' : cmd));
            }
            addToast(`Charge ${cmd} successful`, 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || `Unable to ${cmd} charge`;
            addToast(msg, 'error');
        } finally {
            setActionBusy(false);
        }
    };

    const onPayClick = (row) => {
        setActiveRow(row);
        // prefill sensible defaults
        setPayAmount(String(row.amountOutstanding || row.amount || ''));
        setPayDate(new Date().toISOString().slice(0,10));
        setPayOpen(true);
    };

    const confirmPay = async () => {
        if (!activeRow) return;
        const amt = Number(payAmount);
        if (!amt || amt <= 0) {
            addToast('Enter a valid amount', 'error');
            return;
        }
        setPayBusy(true);
        await command(activeRow.id, 'paycharge', {
            amount: amt,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            transactionDate: payDate,
            // paymentDate: payDate,
        });
        setPayBusy(false);
        setPayOpen(false);
        setActiveRow(null);
    };

    const onWaiveClick = (row) => {
        setActiveRow(row);
        setWaiveOpen(true);
    };
    const confirmWaive = async () => {
        if (!activeRow) return;
        await command(activeRow.id, 'waive', { dateFormat: 'yyyy-MM-dd', locale: 'en' });
        setWaiveOpen(false);
        setActiveRow(null);
    };

    const onDeleteClick = (row) => {
        setActiveRow(row);
        setDeleteOpen(true);
    };
    const confirmDelete = async () => {
        if (!activeRow) return;
        try {
            setActionBusy(true);
            await api.delete(`/clients/${clientId}/charges/${activeRow.id}`);
            addToast('Charge deleted', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setActionBusy(false);
            setDeleteOpen(false);
            setActiveRow(null);
        }
    };

    // filtering, sorting, pagination — client-side
    const filtered = useMemo(() => {
        let data = rows;

        if (status) {
            data = data.filter((r) => (status === 'paid' ? r.isPaid : !r.isPaid));
        }

        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            data = data.filter((r) =>
                [
                    r.id,
                    r.name,
                    r.currencyCode,
                    r.dueDate,
                    r.chargeTimeType,
                    r.statusText,
                ]
                    .map((v) => String(v ?? '').toLowerCase())
                    .some((s) => s.includes(q))
            );
        }

        return data;
    }, [rows, debouncedSearch, status]);

    const sorted = useMemo(() => {
        const d = [...filtered];
        d.sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av == null && bv == null) return 0;
            if (av == null) return -1 * dir;
            if (bv == null) return 1 * dir;

            // numeric
            const na = Number(av), nb = Number(bv);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;

            // date sort for dueDate
            if (sortBy === 'dueDate') return (new Date(av) - new Date(bv)) * dir;

            return String(av).localeCompare(String(bv)) * dir;
        });
        return d;
    }, [filtered, sortBy, sortDir]);

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

    const columns = useMemo(
        () => [
            { key: 'id', header: '#', sortable: true, render: (r) => r.id },
            { key: 'name', header: 'Name', sortable: true, render: (r) => r.name || '—' },
            {
                key: 'dueDate',
                header: 'Due',
                sortable: true,
                render: (r) => r.dueDate || '—',
            },
            {
                key: 'amount',
                header: 'Amount',
                sortable: true,
                render: (r) => (
                    <span>
            {r.amount} {r.currencyCode}
          </span>
                ),
            },
            {
                key: 'amountOutstanding',
                header: 'Outstanding',
                sortable: true,
                render: (r) => (
                    <span>
            {r.amountOutstanding} {r.currencyCode}
          </span>
                ),
            },
            {
                key: 'amountWaived',
                header: 'Waived',
                sortable: true,
                render: (r) => r.amountWaived || 0,
            },
            {
                key: 'isPaid',
                header: 'Status',
                sortable: true,
                render: (r) => (
                    <Badge tone={toneForCharge(r)}>
                        {r.isPaid ? 'Paid' : (Number(r.amountOutstanding) > 0 ? 'Unpaid' : '—')}
                    </Badge>
                ),
            },
            {
                key: 'actions',
                header: '',
                sortable: false,
                render: (r) => (
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            onClick={() => onPayClick(r)}
                            disabled={actionBusy || r.isPaid}
                            title="Pay"
                        >
                            <CreditCard size={18} />
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            onClick={() => onWaiveClick(r)}
                            disabled={actionBusy || r.isPaid}
                            title="Waive"
                        >
                            <MinusCircle size={18} />
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            onClick={() => onDeleteClick(r)}
                            disabled={actionBusy}
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ),
            },
        ],
        [actionBusy]
    );

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setPage(0);
    };

    return (
        <div className="space-y-4">
            {/* Header / Quick actions */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Charges</h2>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>Add Charge</Button>
                </div>
            </div>

            {/* Filters (Loans.jsx rhythm) */}
            <Card>
                <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name / code / due date"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <Button variant="secondary" onClick={clearFilters}>Clear</Button>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Rows</label>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
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
                        emptyMessage="No client charges found"
                    />
                )}
            </Card>

            {/* Add charge modal */}
            <Modal
                open={createOpen}
                title="Add Client Charge"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <ClientChargeForm clientId={clientId} onSubmit={addCharge} submitting={createBusy} />
            </Modal>

            {/* Pay modal */}
            <Modal
                open={payOpen}
                title={activeRow ? `Pay Charge: ${activeRow.name}` : 'Pay Charge'}
                onClose={() => { setPayOpen(false); setActiveRow(null); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setPayOpen(false); setActiveRow(null); }}>
                            Cancel
                        </Button>
                        <Button onClick={confirmPay} disabled={payBusy}>
                            {payBusy ? 'Paying…' : 'Pay'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Amount *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Date *</label>
                            <input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    {activeRow ? (
                        <p className="text-xs text-gray-500">
                            Outstanding: {activeRow.amountOutstanding} {activeRow.currencyCode}
                        </p>
                    ) : null}
                </div>
            </Modal>

            {/* Waive modal */}
            <Modal
                open={waiveOpen}
                title={activeRow ? `Waive Charge: ${activeRow.name}` : 'Waive Charge'}
                onClose={() => { setWaiveOpen(false); setActiveRow(null); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setWaiveOpen(false); setActiveRow(null); }}>
                            Cancel
                        </Button>
                        <Button onClick={confirmWaive} disabled={actionBusy}>
                            {actionBusy ? 'Waiving…' : 'Waive'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to waive this charge
                    {activeRow ? ` (ID ${activeRow.id})` : ''}? This action cannot be undone.
                </p>
            </Modal>

            {/* Delete modal */}
            <Modal
                open={deleteOpen}
                title={activeRow ? `Delete Charge: ${activeRow.name}` : 'Delete Charge'}
                onClose={() => { setDeleteOpen(false); setActiveRow(null); }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setDeleteOpen(false); setActiveRow(null); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={actionBusy}>
                            {actionBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    This will permanently remove the charge
                    {activeRow ? ` (ID ${activeRow.id})` : ''}. Continue?
                </p>
            </Modal>
        </div>
    );
};

export default ClientCharges;
