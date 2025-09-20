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

const BRAND_RED = '#F20519';
const BRAND_BLUE = '#010D00';

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

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div
                className="rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0b1b10 40%, ${BRAND_RED} 140%)` }}
            >
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: '#ffffff' }} />
                <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full opacity-10" style={{ background: '#ffffff' }} />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="text-white">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">MTM Dashboard</h1>
                        <p className="mt-1 text-white/80">Snapshot of active clients & loans, arrears, and portfolio.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={goCreateClient} className="!rounded-2xl !px-4 !py-2 !font-medium bg-white text-[color:#010D00] hover:bg-gray-100 border border-white/40">
                            + Create Client
                        </Button>
                        <Button variant="secondary" onClick={goCreateLoan} className="!rounded-2xl !px-4 !py-2 !font-medium bg-white/10 text-white border border-white/30 hover:bg-white/20">
                            + Create Loan
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="transition-transform duration-200 hover:-translate-y-0.5">
                    <KPICard title="Active Clients" value={activeClients} loading={loading} emptyMessage="No active clients">
                        <Sparkline data={clientCountSeries} height={36} />
                    </KPICard>
                </div>

                <div className="transition-transform duration-200 hover:-translate-y-0.5">
                    <KPICard title="Active Loans" value={activeLoans} loading={loading} emptyMessage="No active loans">
                        <Sparkline data={loanAmountSeries} height={36} />
                    </KPICard>
                </div>

                <div className="transition-transform duration-200 hover:-translate-y-0.5">
                    <KPICard title="Portfolio Outstanding" value={formatTZS(portfolioOutstanding)} loading={loading} emptyMessage="No outstanding portfolio">
                        <Sparkline data={loanAmountSeries} height={36} />
                    </KPICard>
                </div>

                <div className="transition-transform duration-200 hover:-translate-y-0.5">
                    <KPICard title="PAR > 30" value={<span className={cx('font-semibold', parAccent)}>{par30.toFixed(2)}%</span>} loading={loading} emptyMessage="No arrears">
                        <Sparkline data={overdueSeries} height={36} />
                    </KPICard>
                </div>
            </div>

            {/* Activity */}
            <Card className="border border-gray-200/70 dark:border-gray-700/50 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND_RED }} />
                        Activity
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">KPIs update on reload</div>
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, idx) => (
                            <div key={idx} className="space-y-2 p-3 border rounded-xl">
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                            <div className="font-semibold mb-1">Clients</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Active: <span className="font-medium" style={{ color: BRAND_BLUE }}>{activeClients}</span>
                            </div>
                        </div>
                        <div className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                            <div className="font-semibold mb-1">Loans</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Active: <span className="font-medium" style={{ color: BRAND_BLUE }}>{activeLoans}</span>
                            </div>
                        </div>
                        <div className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                            <div className="font-semibold mb-1">Overdue Loans</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Count: <span className="font-medium" style={{ color: BRAND_RED }}>{overdueLoans.length}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Outstanding: <span className="font-medium">{formatTZS(overdueOutstandingTotal)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Home;
