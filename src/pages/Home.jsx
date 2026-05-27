import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { getGwOpsReport } from '../api/gateway/reports';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import Sparkline from '../components/Sparkline';
import KPICard from '../components/KPICard';
import { useAuth } from '../context/AuthContext';
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

function cx(...xs) {
    return xs.filter(Boolean).join(' ');
}

function toItems(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.pageItems)) return payload.pageItems;
    return [];
}

function numberValue(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function isActiveStatus(s) {
    if (!s) return false;
    if (typeof s.active === 'boolean') return s.active;
    const v = (s.value || s.code || '').toString().toLowerCase();
    return v.includes('active');
}

async function fetchAllClients() {
    const pageSize = 200;
    const all = [];
    let offset = 0;

    while (true) {
        const response = await api.get('/clients', {
            params: {
                offset,
                limit: pageSize,
                orderBy: 'displayName',
                sortOrder: 'ASC',
            },
        });
        const payload = response?.data;
        const pageItems = toItems(payload);
        all.push(...pageItems);

        const reportedTotal = numberValue(payload?.totalFilteredRecords || payload?.totalRecords);
        if (pageItems.length === 0) break;
        if (reportedTotal > 0 && all.length >= reportedTotal) break;
        if (pageItems.length < pageSize) break;

        offset += pageItems.length;
    }

    return all;
}

function findParBucket(rows, bucket) {
    return rows.find((row) => String(row?.bucket || '').toUpperCase() === bucket.toUpperCase()) || null;
}

const Home = () => {
    const { tenantConfig } = useAuth();
    const { start, finish } = useLoading();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({
        activeClients: 0,
        activeLoans: 0,
        portfolioOutstanding: 0,
        par30: 0,
        par30Amount: 0,
        overdueLoans: 0,
        overdueOutstanding: 0,
        parBuckets: [],
    });

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            start();

            try {
                const [clients, regulatoryReport, arrearsReport, parReport] = await Promise.all([
                    fetchAllClients(),
                    getGwOpsReport('regulatorySummary'),
                    getGwOpsReport('arrears'),
                    getGwOpsReport('par'),
                ]);

                if (cancelled) return;

                const activeClients = clients.filter((client) => isActiveStatus(client.status) || client.active === true).length;
                const regulatorySummary = regulatoryReport?.summary || {};
                const arrearsSummary = arrearsReport?.summary || {};
                const parBuckets = toItems(parReport);
                const par30Bucket = findParBucket(parBuckets, 'PAR>30');

                setMetrics({
                    activeClients,
                    activeLoans: numberValue(regulatorySummary.activeLoans),
                    portfolioOutstanding: numberValue(regulatorySummary.activePortfolio),
                    par30: numberValue(regulatorySummary.par30Ratio || par30Bucket?.ratio),
                    par30Amount: numberValue(regulatorySummary.par30Amount || par30Bucket?.amount),
                    overdueLoans: numberValue(arrearsSummary.arrearsLoans),
                    overdueOutstanding: numberValue(arrearsSummary.totalOverdue),
                    parBuckets,
                });
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

        void load();
        return () => {
            cancelled = true;
        };
    }, [addToast, finish, start]);

    const {
        activeClients,
        activeLoans,
        portfolioOutstanding,
        par30,
        overdueLoans,
        overdueOutstanding,
        parBuckets,
    } = metrics;

    const clientCountSeries = useMemo(() => {
        if (!activeClients) return [];
        const window = Math.min(20, activeClients);
        return new Array(window).fill(0).map((_, i) => Math.max(0, activeClients - (window - i - 1)));
    }, [activeClients]);

    const portfolioSeries = useMemo(() => {
        const points = [
            portfolioOutstanding,
            metrics.par30Amount,
            overdueOutstanding,
            ...parBuckets.map((bucket) => numberValue(bucket?.amount)),
        ].filter((value) => value > 0);
        return points.slice(0, 20);
    }, [metrics.par30Amount, overdueOutstanding, parBuckets, portfolioOutstanding]);

    const overdueSeries = useMemo(() => {
        return parBuckets
            .map((bucket) => numberValue(bucket?.ratio))
            .filter((value) => value >= 0)
            .slice(0, 20);
    }, [parBuckets]);

    const goCreateClient = () => {
        try {
            navigate('/clients/new');
        } catch {
            addToast('Create Client coming soon...', 'info');
        }
    };

    const goCreateLoan = () => {
        try {
            navigate('/loans/apply');
        } catch {
            addToast('Create Loan coming soon...', 'info');
        }
    };

    const parAccent = par30 > 30 ? 'text-red-600' : par30 > 10 ? 'text-amber-600' : 'text-emerald-600';
    const overdueRate = activeLoans ? (overdueLoans / activeLoans) * 100 : 0;
    const riskScore = Math.min(100, Math.round((par30 * 0.65) + (overdueRate * 0.35)));
    const riskTone = riskScore >= 60 ? 'bg-rose-500' : riskScore >= 35 ? 'bg-amber-500' : 'bg-emerald-500';
    const healthLabel = riskScore >= 60 ? 'High Risk' : riskScore >= 35 ? 'Watchlist' : 'Stable';
    const nowLabel = new Date().toLocaleString('en-TZ', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="space-y-6">
            <section
                className="relative overflow-hidden rounded-3xl border border-cyan-200/60 p-6 text-slate-900 shadow-xl sm:p-8"
                style={{ background: tenantConfig?.theme?.loginBackground || undefined }}
            >
                {!tenantConfig?.theme?.loginBackground && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-white to-teal-100" />
                )}
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="relative z-10 grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-700">{tenantConfig?.portalName || 'Portfolio Command Center'}</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{tenantConfig?.shortName || 'Epik'} Dashboard</h1>
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
                            <div className="mt-1 text-xl font-semibold text-slate-900">{loading ? '...' : activeClients}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">Active Loans</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{loading ? '...' : activeLoans}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">PAR 30+</div>
                            <div className="mt-1 text-xl font-semibold text-slate-900">{loading ? '...' : `${par30.toFixed(2)}%`}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur">
                            <div className="text-xs text-slate-700">Overdue Outstanding</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{loading ? '...' : formatTZS(overdueOutstanding)}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KPICard title="Active Clients" value={activeClients} loading={loading} emptyMessage="No active clients">
                    <Sparkline data={clientCountSeries} height={36} />
                </KPICard>
                <KPICard title="Active Loans" value={activeLoans} loading={loading} emptyMessage="No active loans">
                    <Sparkline data={portfolioSeries} height={36} />
                </KPICard>
                <KPICard title="Portfolio Outstanding" value={formatTZS(portfolioOutstanding)} loading={loading} emptyMessage="No outstanding portfolio">
                    <Sparkline data={portfolioSeries} height={36} />
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
                        {overdueLoans} overdue loans out of {activeLoans || 0} active loans.
                    </div>
                </Card>

                <Card>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Portfolio Value</div>
                    <div className="mt-2 text-2xl font-bold">{formatTZS(portfolioOutstanding)}</div>
                    <div className="mt-2">
                        <Sparkline data={portfolioSeries} height={44} />
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
                            <div className="mt-2 text-2xl font-semibold" style={{ color: tenantConfig?.theme?.primary || BRAND_BLUE }}>{activeClients}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Currently active client accounts.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Loans</div>
                            <div className="mt-2 text-2xl font-semibold" style={{ color: tenantConfig?.theme?.primary || BRAND_BLUE }}>{activeLoans}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Disbursed and active loan contracts.</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Overdue Exposure</div>
                            <div className="mt-2 text-2xl font-semibold" style={{ color: tenantConfig?.theme?.accent || BRAND_RED }}>{overdueLoans}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatTZS(overdueOutstanding)} overdue amount.</div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Home;
