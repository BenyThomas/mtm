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

const Home = () => {
    const { start, finish } = useLoading();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [clients, setClients] = useState([]);
    const [loans, setLoans] = useState([]);
    const [overdueLoans, setOverdueLoans] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            start();

            try {
                // First pass: aggregate client-side. Fetch clients and loans.
                const [clientsRes, loansRes] = await Promise.all([
                    api.get('/clients'),
                    api.get('/loans'),
                ]);

                if (cancelled) return;
                const c = Array.isArray(clientsRes.data) ? clientsRes.data : [];
                const l = Array.isArray(loansRes.data) ? loansRes.data : [];

                setClients(c);
                setLoans(l);

                // Optional: try an overdue loans endpoint (graceful if not supported)
                try {
                    const overdueRes = await api.get('/loans', { params: { overdue: true } });
                    if (!cancelled) {
                        setOverdueLoans(Array.isArray(overdueRes.data) ? overdueRes.data : []);
                    }
                } catch {
                    // Fall back: derive overdue from loans if fields exist
                    const derived = l.filter((loan) => {
                        const overdue = loan.daysInArrears || loan.overdueDays || 0;
                        return overdue > 0;
                    });
                    if (!cancelled) setOverdueLoans(derived);
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
        return () => {
            cancelled = true;
        };
    }, []);

    // --- KPI calculations (client-side aggregate first pass) ---
    const activeClients = clients.length;

    const { activeLoans, portfolioOutstanding, par30 } = useMemo(() => {
        const activeLoansCount = loans.length;
        let outstanding = 0;
        loans.forEach((loan) => {
            const principal =
                loan.principalOutstanding || loan.principal || loan.loanAmount || 0;
            outstanding += Number(principal) || 0;
        });

        // PAR>30: use overdueLoans if present; otherwise compute from daysInArrears
        let eligible = 0;
        let over30 = 0;
        loans.forEach((loan) => {
            const principal =
                loan.principalOutstanding || loan.principal || loan.loanAmount || 0;
            const overdue = loan.daysInArrears || loan.overdueDays || 0;
            if (principal > 0) {
                eligible += 1;
                if (overdue > 30) over30 += 1;
            }
        });

        // If the API returned explicit overdue loans, prefer that for PAR>30
        const over30FromEndpoint = overdueLoans.filter((loan) => {
            const d = loan.daysInArrears || loan.overdueDays || 0;
            return d > 30;
        }).length;

        const numer = over30FromEndpoint || over30;
        const denom = eligible || activeLoansCount || loans.length || 0;
        const par = denom ? (numer / denom) * 100 : 0;

        return {
            activeLoans: activeLoansCount,
            portfolioOutstanding: outstanding,
            par30: par,
        };
    }, [loans, overdueLoans]);

    // --- Sparkline data (graceful if empty) ---
    // Try to build sparklines from amounts & counts; fall back to simple series.
    const loanAmountSeries = useMemo(() => {
        if (!loans.length) return [];
        // Take up to 20 recent amounts (stable, deterministic order if API returns consistent order)
        const series = loans
            .map((loan) => {
                const v =
                    loan.principalOutstanding || loan.principal || loan.loanAmount || 0;
                return Number(v) || 0;
            })
            .filter((n) => n >= 0);
        // If all zeros, return empty to trigger graceful sparkline placeholder
        const any = series.some((n) => n > 0);
        return any ? series.slice(0, 20) : [];
    }, [loans]);

    const clientCountSeries = useMemo(() => {
        if (!clients.length) return [];
        // Build a simple series using rolling window counts (visual only)
        const window = Math.min(20, clients.length);
        const base = new Array(window)
            .fill(0)
            .map((_, i) => Math.max(0, clients.length - (window - i - 1)));
        return base;
    }, [clients]);

    const overdueSeries = useMemo(() => {
        if (!overdueLoans.length) return [];
        // Series based on overdue days (clamped)
        const series = overdueLoans
            .map((loan) => Number(loan.daysInArrears || loan.overdueDays || 0))
            .filter((n) => n > 0)
            .slice(0, 20);
        return series;
    }, [overdueLoans]);

    // --- Quick actions ---
    const goCreateClient = () => {
        // If you haven't created these routes yet, show a toast instead.
        try {
            navigate('/clients/new');
        } catch {
            addToast('Create Client coming soon…', 'info');
        }
    };
    const goCreateLoan = () => {
        try {
            navigate('/loans/apply');
        } catch {
            addToast('Create Loan coming soon…', 'info');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                {/* Quick actions */}
                <div className="space-x-2">
                    <Button onClick={goCreateClient}>Create Client</Button>
                    <Button variant="secondary" onClick={goCreateLoan}>Create Loan</Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard
                    title="Active Clients"
                    value={activeClients}
                    loading={loading}
                    emptyMessage="No clients yet"
                >
                    <Sparkline data={clientCountSeries} height={36} />
                </KPICard>

                <KPICard
                    title="Active Loans"
                    value={activeLoans}
                    loading={loading}
                    emptyMessage="No loans yet"
                >
                    <Sparkline data={loanAmountSeries} height={36} />
                </KPICard>

                <KPICard
                    title="Portfolio Outstanding"
                    value={portfolioOutstanding.toFixed(2)}
                    suffix=" TZS"
                    loading={loading}
                    emptyMessage="No outstanding portfolio"
                >
                    <Sparkline data={loanAmountSeries} height={36} />
                </KPICard>

                <KPICard
                    title="PAR > 30"
                    value={`${par30.toFixed(2)} %`}
                    loading={loading}
                    emptyMessage="No arrears"
                >
                    <Sparkline data={overdueSeries} height={36} />
                </KPICard>
            </div>

            {/* Errors / Empty states for the list content below */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Activity</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Live KPIs refresh on reload</div>
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, idx) => (
                            <div key={idx} className="space-y-2">
                                <Skeleton height="1.25rem" width="60%" />
                                <Skeleton height="1rem" width="85%" />
                                <Skeleton height="1rem" width="70%" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-600 dark:text-red-400">{error}</div>
                ) : !clients.length && !loans.length ? (
                    <div className="text-center py-10">
                        <div className="text-3xl">📭</div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Nothing to show yet. Create your first client or loan.</p>
                        <div className="mt-4 space-x-2">
                            <Button onClick={goCreateClient}>Create Client</Button>
                            <Button variant="secondary" onClick={goCreateLoan}>Create Loan</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Simple summaries for recent items, purely illustrative */}
                        <Card>
                            <div className="font-semibold mb-1">Clients</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total: {activeClients}
                            </div>
                        </Card>
                        <Card>
                            <div className="font-semibold mb-1">Loans</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total: {activeLoans}
                            </div>
                        </Card>
                        <Card>
                            <div className="font-semibold mb-1">Overdue Loans</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Count: {overdueLoans.length}
                            </div>
                        </Card>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Home;
