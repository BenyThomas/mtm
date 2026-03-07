import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import Sparkline from '../components/Sparkline';
import KPICard from '../components/KPICard';
import { useLoading } from '../context/LoadingContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const BRAND_RED = '#be123c';
const BRAND_BLUE = '#0f766e';

function formatTZS(n) {
    if (isNaN(n)) return '0';
    try {
        return new Intl.NumberFormat('en-TZ', {
            style: 'currency',
            currency: 'TZS',
            maximumFractionDigits: 0,
        }).format(Number(n));
    } catch {
        return `${Number(n).toLocaleString()} TZS`;
    }
}
function cx(...xs) { return xs.filter(Boolean).join(' '); }

// Normalize Fineract list results (array OR { pageItems: [...] })
function toItems(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.pageItems)) return payload.pageItems;
    return [];
}

// Is entity active?
function isActiveStatus(s) {
    if (!s) return false;
    if (typeof s.active === 'boolean') return s.active;
    const v = (s.value || s.code || '').toString().toLowerCase();
    return v.includes('active');
}

// Best-effort outstanding for a loan
function extractOutstanding(loan) {
    const sum = loan?.summary;
    if (sum && typeof sum.totalOutstanding === 'number') return sum.totalOutstanding;
    // Fallback: sum known parts if available
    const parts = [
        sum?.principalOutstanding,
        sum?.interestOutstanding,
        sum?.feeChargesOutstanding,
        sum?.penaltyChargesOutstanding,
    ].map((x) => Number(x || 0));
    const total = parts.reduce((a, b) => a + b, 0);
    if (total > 0) return total;
    // Fallback to principalOutstanding/loan amount
    return Number(loan?.principalOutstanding || loan?.principal || loan?.loanAmount || 0);
}

const Home = () => {
    const { start, finish } = useLoading();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [clientsRaw, setClientsRaw] = useState([]);
    const [loansRaw, setLoansRaw] = useState([]);

    // Overdue loans (from /loans?overdue=true) and aggregated outstanding
    const [overdueLoans, setOverdueLoans] = useState([]);
    const [overdueOutstandingTotal, setOverdueOutstandingTotal] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            start();

            try {
                // 1) Clients
                const clientsRes = await api.get('/clients');
                const clients = toItems(clientsRes.data);
                if (!cancelled) setClientsRaw(clients);

                // 2) All loans
                const loansRes = await api.get('/loans');
                const loans = toItems(loansRes.data);
                if (!cancelled) setLoansRaw(loans);

                // 3) Overdue loans (paged shape)
                try {
                    const overdueRes = await api.get('/loans', { params: { overdue: true } });
                    const overdue = toItems(overdueRes.data);

                    // compute outstanding from the official overdue endpoint
                    const totalOut = overdue.reduce((acc, loan) => acc + extractOutstanding(loan), 0);

                    if (!cancelled) {
                        setOverdueLoans(overdue);
                        setOverdueOutstandingTotal(totalOut);
                    }
                } catch {
                    // Fallback: derive overdue from all loans if endpoint not supported
                    const fallback = loans.filter((loan) => Number(loan.daysInArrears || loan.overdueDays || 0) > 0);
                    const totalOut = fallback.reduce((acc, loan) => acc + extractOutstanding(loan), 0);
                    if (!cancelled) {
                        setOverdueLoans(fallback);
                        setOverdueOutstandingTotal(totalOut);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setError('Failed to load dashboard data');
                    addToast('Failed to load dashboard data', 'error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    finish();
                }
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    // ===== Filters: active only =====
    const activeClientsArr = useMemo(
        () => clientsRaw.filter((c) => isActiveStatus(c.status) || c.active === true),
        [clientsRaw]
    );

    const activeLoansArr = useMemo(
        () => loansRaw.filter((l) => isActiveStatus(l.status)),
        [loansRaw]
    );

    // ===== KPIs =====
    const activeClients = activeClientsArr.length;

    const { activeLoans, portfolioOutstanding, par30 } = useMemo(() => {
        const activeLoansCount = activeLoansArr.length;

        // Portfolio Outstanding = sum outstanding for active loans
        const outstanding = activeLoansArr.reduce((acc, loan) => acc + extractOutstanding(loan), 0);

        // PAR>30 using all loans list (daysInArrears > 30)
        let eligible = 0, over30 = 0;
        loansRaw.forEach((loan) => {
            const principal = Number(
                loan?.summary?.totalOutstanding ??
                loan?.principalOutstanding ??
                loan?.principal ??
                loan?.loanAmount ?? 0
            );
            const overdueDays = Number(loan.daysInArrears || loan.overdueDays || 0);
            if (principal > 0) {
                eligible += 1;
                if (overdueDays > 30) over30 += 1;
            }
        });

        const denom = eligible || activeLoansCount || loansRaw.length || 0;
        const par = denom ? (over30 / denom) * 100 : 0;

        return { activeLoans: activeLoansCount, portfolioOutstanding: outstanding, par30: par };
    }, [activeLoansArr, loansRaw]);

    // ===== Sparklines =====
    const loanAmountSeries = useMemo(() => {
        if (!activeLoansArr.length) return [];
        const series = activeLoansArr
            .map((loan) =>
                Number(
                    loan?.summary?.totalOutstanding ??
                    loan?.principalOutstanding ??
                    loan?.principal ??
                    loan?.loanAmount ?? 0
                )
            )
            .filter((n) => n >= 0);
        return series.some((n) => n > 0) ? series.slice(0, 20) : [];
    }, [activeLoansArr]);

    const clientCountSeries = useMemo(() => {
        const n = activeClientsArr.length;
        if (!n) return [];
        const window = Math.min(20, n);
        return new Array(window).fill(0).map((_, i) => Math.max(0, n - (window - i - 1)));
    }, [activeClientsArr]);

    const overdueSeries = useMemo(() => {
        if (!overdueLoans.length) return [];
        return overdueLoans
            .map((loan) => Number(loan.daysInArrears || loan.overdueDays || 0))
            .filter((n) => n > 0)
            .slice(0, 20);
    }, [overdueLoans]);

    // ===== Actions =====
    const goCreateClient = () => {
        try { navigate('/clients/new'); } catch { addToast('Create Client coming soon…', 'info'); }
    };
    const goCreateLoan = () => {
        try { navigate('/loans/apply'); } catch { addToast('Create Loan coming soon…', 'info'); }
    };

    const parAccent = par30 > 30 ? 'text-red-600' : par30 > 10 ? 'text-amber-600' : 'text-emerald-600';
    const overdueRate = activeLoans ? (overdueLoans.length / activeLoans) * 100 : 0;
    const riskScore = Math.min(100, Math.round((par30 * 0.65) + (overdueRate * 0.35)));
    const riskTone = riskScore >= 60 ? 'bg-rose-500' : riskScore >= 35 ? 'bg-amber-500' : 'bg-emerald-500';
    const healthLabel = riskScore >= 60 ? 'High Risk' : riskScore >= 35 ? 'Watchlist' : 'Stable';
    const nowLabel = new Date().toLocaleString('en-TZ', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-cyan-200/60 bg-gradient-to-br from-cyan-100 via-white to-teal-100 p-6 text-slate-900 shadow-xl sm:p-8">
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="relative z-10 grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-700">Portfolio Command Center</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Epik Dashboard</h1>
                        <p className="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
                            One view for client momentum, loan exposure, arrears pressure, and collection risk.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <Button onClick={goCreateClient} className="!border !border-white/40 !bg-white !text-slate-900 hover:!bg-slate-100">
                                Create Client
                            </Button>
                            <Button variant="secondary" onClick={goCreateLoan}>
                                Apply Loan
                            </Button>
                            <span className="rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-xs text-slate-800">Updated {nowLabel}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">Active Clients</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{activeClients}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">Active Loans</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{activeLoans}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">PAR 30+</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{par30.toFixed(2)}%</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">Overdue Outstanding</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{formatTZS(overdueOutstandingTotal)}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KPICard title="Active Clients" value={activeClients} loading={loading} emptyMessage="No active clients">
                    <Sparkline data={clientCountSeries} height={36} />
                </KPICard>
                <KPICard title="Active Loans" value={activeLoans} loading={loading} emptyMessage="No active loans">
                    <Sparkline data={loanAmountSeries} height={36} />
                </KPICard>
                <KPICard title="Portfolio Outstanding" value={formatTZS(portfolioOutstanding)} loading={loading} emptyMessage="No outstanding portfolio">
                    <Sparkline data={loanAmountSeries} height={36} />
                </KPICard>
                <KPICard title="PAR > 30" value={<span className={cx('font-semibold', parAccent)}>{par30.toFixed(2)}%</span>} loading={loading} emptyMessage="No arrears">
                    <Sparkline data={overdueSeries} height={36} />
                </KPICard>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk Composite</div>
                    <div className="mt-2 flex items-end justify-between">
                        <div className="text-3xl font-bold">{riskScore}</div>
                        <div className="text-sm font-medium">{healthLabel}</div>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className={cx('h-full rounded-full', riskTone)} style={{ width: `${riskScore}%` }} />
                    </div>
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Weighted from PAR 30+ and overdue loan share.
                    </div>
                </Card>

                <Card>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Arrears Pressure</div>
                    <div className="mt-2 text-2xl font-bold">{overdueRate.toFixed(1)}%</div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, overdueRate)}%` }} />
                    </div>
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        {overdueLoans.length} overdue loans out of {activeLoans || 0} active loans.
                    </div>
                </Card>

                <Card>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Portfolio Value</div>
                    <div className="mt-2 text-2xl font-bold">{formatTZS(portfolioOutstanding)}</div>
                    <div className="mt-2">
                        <Sparkline data={loanAmountSeries} height={44} />
                    </div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Active exposure across disbursed loan book.
                    </div>
                </Card>
            </section>

            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Activity Summary</h2>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Live view</div>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, idx) => (
                            <div key={idx} className="space-y-2 rounded-2xl border border-slate-200/60 p-3 dark:border-slate-700/60">
                                <Skeleton height="1.25rem" width="60%" />
                                <Skeleton height="1rem" width="85%" />
                                <Skeleton height="1rem" width="70%" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                        {error}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Clients</div>
                            <div className="mt-2 text-2xl font-semibold" style={{ color: BRAND_BLUE }}>{activeClients}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Currently active client accounts.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Loans</div>
                            <div className="mt-2 text-2xl font-semibold" style={{ color: BRAND_BLUE }}>{activeLoans}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Disbursed and active loan contracts.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Overdue Exposure</div>
                            <div className="mt-2 text-2xl font-semibold" style={{ color: BRAND_RED }}>{overdueLoans.length}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatTZS(overdueOutstandingTotal)} outstanding overdue amount.</div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Home;
