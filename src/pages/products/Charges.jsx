import React, { useEffect, useMemo, useState } from 'react';
import {
    ChevronRight,
    CirclePlus,
    Coins,
    PenSquare,
    Percent,
    RefreshCcw,
    Search,
    ShieldAlert,
    Trash2,
    Wallet,
} from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ChargeForm from '../../components/ChargeForm';
import Modal from '../../components/Modal';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZES = [10, 25, 50, 100];
const FILTER_ALL = 'all';

const toneForActive = (value) => (value ? 'emerald' : 'gray');
const toneForPenalty = (value) => (value ? 'red' : 'blue');
const toneForCalculation = (label = '') => (String(label).toLowerCase().includes('percent') ? 'orange' : 'cyan');

const iconButtonClass = 'h-10 w-10 shrink-0 rounded-xl border border-[color:var(--tenant-primary)]/20 bg-[color:var(--tenant-primary)]/8 p-0 text-[var(--tenant-primary)] shadow-sm hover:bg-[color:var(--tenant-primary)]/14 dark:border-[color:var(--tenant-primary)]/35 dark:bg-[color:var(--tenant-primary)]/12 dark:hover:bg-[color:var(--tenant-primary)]/18';
const rowClassName = 'cursor-pointer border-t border-slate-200/70 align-top text-sm transition-colors hover:bg-[color:var(--tenant-primary)]/4 dark:border-slate-700/70 dark:hover:bg-[color:var(--tenant-primary)]/8';
const inputClassName = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[color:var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const displayValue = (value, fallback = '-') => {
    if (value == null || value === '') return fallback;
    if (typeof value === 'object') {
        return value.value || value.name || value.label || value.code || value.id || fallback;
    }
    return value;
};

const normaliseCharge = (charge) => ({
    id: charge.id,
    name: charge.name || '-',
    currencyCode: displayValue(charge.currencyCode || charge.currency?.code, '-'),
    amount: charge.amount ?? charge.amountPercentage ?? 0,
    appliesTo: displayValue(charge.chargeAppliesTo?.value || charge.appliesTo, '-'),
    timeType: displayValue(charge.chargeTimeType?.value || charge.timeType, '-'),
    calcType: displayValue(charge.chargeCalculationType?.value || charge.calculationType, '-'),
    paymentMode: displayValue(charge.chargePaymentMode?.value || charge.paymentMode, '-'),
    paymentTypeName: displayValue(charge.paymentType?.name || charge.paymentTypeName, '-'),
    taxGroupName: displayValue(charge.taxGroup?.name || charge.taxGroupName, '-'),
    feeFrequency: displayValue(charge.feeFrequency, '-'),
    feeInterval: displayValue(charge.feeInterval, '-'),
    feeOnMonthDay: displayValue(charge.feeOnMonthDay, '-'),
    maxCap: displayValue(charge.maxCap, '-'),
    minCap: displayValue(charge.minCap, '-'),
    penalty: typeof charge.penalty === 'boolean' ? charge.penalty : charge.penalty === 'true',
    active: typeof charge.active === 'boolean' ? charge.active : charge.active === 'true',
    enablePaymentType: typeof charge.enablePaymentType === 'boolean' ? charge.enablePaymentType : charge.enablePaymentType === 'true',
});

const MetricCard = ({ label, value, hint, icon: Icon }) => (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/55">
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
                {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--tenant-primary)]/20 bg-[color:var(--tenant-primary)]/10 text-[var(--tenant-primary)] dark:border-[color:var(--tenant-primary)]/35 dark:bg-[color:var(--tenant-primary)]/15">
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const Charges = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);
    const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
    const [penaltyFilter, setPenaltyFilter] = useState(FILTER_ALL);
    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get('/charges', { params: { offset, limit } });
            const list = Array.isArray(response?.data) ? response.data : response?.data?.pageItems || [];
            setItems(list.map(normaliseCharge));
        } catch (e) {
            setItems([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load charges', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [limit, offset]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return items.filter((item) => {
            const matchesTerm = !term || [
                item.id,
                item.name,
                item.currencyCode,
                item.amount,
                item.appliesTo,
                item.timeType,
                item.calcType,
                item.paymentMode,
                item.taxGroupName,
            ]
                .map((value) => String(value ?? '').toLowerCase())
                .some((value) => value.includes(term));

            const matchesActive =
                activeFilter === FILTER_ALL ||
                (activeFilter === 'active' && item.active) ||
                (activeFilter === 'inactive' && !item.active);

            const matchesPenalty =
                penaltyFilter === FILTER_ALL ||
                (penaltyFilter === 'penalty' && item.penalty) ||
                (penaltyFilter === 'standard' && !item.penalty);

            return matchesTerm && matchesActive && matchesPenalty;
        });
    }, [activeFilter, items, penaltyFilter, q]);

    const metrics = useMemo(() => {
        const activeCount = filtered.filter((item) => item.active).length;
        const penaltyCount = filtered.filter((item) => item.penalty).length;
        const paymentRestricted = filtered.filter((item) => item.enablePaymentType).length;
        return {
            total: filtered.length,
            activeCount,
            penaltyCount,
            paymentRestricted,
        };
    }, [filtered]);

    const canPrev = offset > 0;
    const canNext = items.length === limit;

    const openEdit = async (id) => {
        try {
            const response = await api.get(`/charges/${id}`);
            setEditItem(response?.data || {});
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load charge', 'error');
        }
    };

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post('/charges', payload);
            addToast('Charge created', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/charges/${editItem.id}`, payload);
            addToast('Charge updated', 'success');
            setEditItem(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this charge?')) return;
        try {
            await api.delete(`/charges/${id}`);
            addToast('Charge deleted', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    const stopRowClick = (event, handler) => {
        event.stopPropagation();
        handler();
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-[color:var(--tenant-primary)]/15 bg-gradient-to-br from-[color:var(--tenant-primary)]/12 via-white to-white p-5 shadow-sm dark:border-[color:var(--tenant-primary)]/25 dark:from-[color:var(--tenant-primary)]/16 dark:via-slate-900 dark:to-slate-900">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tenant-primary)]">Product Charges</div>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">Charge Catalog</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Manage charge definitions across products with the full Fineract payload surface: core setup, timing, calculation, caps, tax, payment mode, and payment type controls.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="secondary" onClick={load}>
                            <RefreshCcw size={16} />
                            Refresh
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <CirclePlus size={16} />
                            New Charge
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Filtered Charges" value={metrics.total} hint="Current search and filter result" icon={Wallet} />
                    <MetricCard label="Active Charges" value={metrics.activeCount} hint="Ready for operational use" icon={Coins} />
                    <MetricCard label="Penalty Charges" value={metrics.penaltyCount} hint="Charges marked as penalty" icon={ShieldAlert} />
                    <MetricCard label="Payment Restricted" value={metrics.paymentRestricted} hint="Charges tied to a payment type" icon={Percent} />
                </div>
            </div>

            <Card>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Search</label>
                        <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Name, currency, timing, calculation, tax..."
                                className={`${inputClassName} pl-10`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
                        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={inputClassName}>
                            <option value={FILTER_ALL}>All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Charge Class</label>
                        <select value={penaltyFilter} onChange={(e) => setPenaltyFilter(e.target.value)} className={inputClassName}>
                            <option value={FILTER_ALL}>All</option>
                            <option value="penalty">Penalty</option>
                            <option value="standard">Standard</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Page Size</label>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setOffset(0);
                                setLimit(Number(e.target.value));
                            }}
                            className={inputClassName}
                        >
                            {PAGE_SIZES.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end gap-2 xl:justify-end">
                        <Button variant="secondary" disabled={!canPrev} onClick={() => setOffset((value) => Math.max(0, value - limit))}>
                            Prev
                        </Button>
                        <Button variant="secondary" disabled={!canNext} onClick={() => setOffset((value) => value + limit)}>
                            Next
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                {loading ? (
                    <Skeleton height="18rem" />
                ) : !filtered.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/30">
                        <div className="text-base font-medium text-slate-800 dark:text-slate-100">No charges found</div>
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the current filters or create a new charge definition.</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/40">
                                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                    <th className="px-4 py-3">Charge</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Application</th>
                                    <th className="px-4 py-3">Controls</th>
                                    <th className="px-4 py-3">Flags</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((charge) => (
                                    <tr
                                        key={charge.id}
                                        className={rowClassName}
                                        onClick={() => openEdit(charge.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openEdit(charge.id);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Open ${charge.name} for editing`}
                                        title={`Open ${charge.name} for editing`}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-slate-50">{charge.name}</div>
                                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">#{charge.id} - {charge.currencyCode}</div>
                                                </div>
                                                <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" />
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Badge tone={toneForActive(charge.active)}>{charge.active ? 'Active' : 'Inactive'}</Badge>
                                                <Badge tone={toneForPenalty(charge.penalty)}>{charge.penalty ? 'Penalty' : 'Standard'}</Badge>
                                                <Badge tone={toneForCalculation(charge.calcType)}>{charge.calcType}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-900 dark:text-slate-100">{charge.amount}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Min cap: {charge.minCap} - Max cap: {charge.maxCap}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-800 dark:text-slate-100">{charge.appliesTo}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Time: {charge.timeType}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Frequency: {charge.feeFrequency} - Interval: {charge.feeInterval}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-slate-800 dark:text-slate-100">Payment mode: {charge.paymentMode}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tax group: {charge.taxGroupName}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Payment type: {charge.enablePaymentType ? charge.paymentTypeName : 'Not restricted'}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {charge.enablePaymentType ? <Badge tone="orange">Payment restricted</Badge> : <Badge tone="gray">Any payment type</Badge>}
                                                {charge.feeOnMonthDay !== '-' ? <Badge tone="blue">Month day: {charge.feeOnMonthDay}</Badge> : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    className={iconButtonClass}
                                                    title={`Edit ${charge.name}`}
                                                    aria-label={`Edit ${charge.name}`}
                                                    onClick={(event) => stopRowClick(event, () => openEdit(charge.id))}
                                                >
                                                    <PenSquare size={16} />
                                                </Button>
                                                <Button
                                                    className={iconButtonClass}
                                                    title={`Delete ${charge.name}`}
                                                    aria-label={`Delete ${charge.name}`}
                                                    onClick={(event) => stopRowClick(event, () => remove(charge.id))}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={createOpen} title="New Charge" onClose={() => setCreateOpen(false)} footer={null}>
                <ChargeForm onSubmit={create} submitting={busy} />
            </Modal>

            <Modal open={!!editItem} title={editItem ? `Edit Charge #${editItem.id}` : 'Edit Charge'} onClose={() => setEditItem(null)} footer={null}>
                {editItem ? <ChargeForm initial={editItem} onSubmit={save} submitting={busy} /> : null}
            </Modal>
        </div>
    );
};

export default Charges;
