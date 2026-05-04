import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import gatewayApi from '../../api/gatewayAxios';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';

const unwrap = (response) => response?.data?.data || response?.data || null;

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat().format(number);
};

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00%';
  const normalized = number <= 1 ? number * 100 : number;
  return `${normalized.toFixed(2)}%`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const statusText = (item) => String(
  item?.status
  || item?.onboardingState
  || item?.state
  || item?.verificationStatus
  || ''
).toUpperCase();

const countMatching = (items, matcher) => items.filter((item) => matcher(statusText(item), item)).length;

const toneForStatus = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('FAILED') || normalized.includes('LOSS') || normalized.includes('UNMATCHED')) return 'red';
  if (normalized.includes('PENDING') || normalized.includes('REVIEW') || normalized.includes('RETRY')) return 'yellow';
  if (normalized.includes('SUCCESS') || normalized.includes('POSTED') || normalized.includes('DISBURSED') || normalized.includes('COMPLETED')) return 'green';
  return 'blue';
};

const actionLinkClass = 'inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-100 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

const DashboardMetricLink = ({ to, title, value, caption, icon: Icon }) => (
  <Link to={to} className="group block">
    <Card className="h-full transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{caption}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-700 transition-colors group-hover:text-cyan-600 dark:text-cyan-300 dark:group-hover:text-cyan-200">
        Open
        <ArrowRight size={15} />
      </div>
    </Card>
  </Link>
);

const QueueList = ({ title, items, emptyMessage, renderMeta, href }) => (
  <Card className="h-full">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{items.length} item(s)</div>
      </div>
      <Link to={href} className="text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
        View All
      </Link>
    </div>
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        items.map((item, index) => (
          <div key={item?.orderId || item?.paymentEventId || item?.id || index} className="rounded-xl border border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item?.customerName || item?.loanAccount || item?.orderId || item?.paymentEventId || `Queue Item ${index + 1}`}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {renderMeta(item)}
                </div>
              </div>
              <Badge tone={toneForStatus(item?.status || item?.exceptionType || 'PENDING')}>
                {titleCase(item?.status || item?.exceptionType || 'PENDING')}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  </Card>
);

const Leaderboard = ({ title, subtitle, items, emptyMessage, primaryKey, secondaryKey, tertiaryKey, href }) => (
  <Card className="h-full">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>
      </div>
      <Link to={href} className="text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
        Open
      </Link>
    </div>
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        items.map((item, index) => (
          <div key={`${item?.[primaryKey]}-${index}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item?.[primaryKey] || 'Unassigned'}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {secondaryKey}: {formatMoney(item?.[secondaryKey])}
                {tertiaryKey ? ` | ${tertiaryKey}: ${formatNumber(item?.[tertiaryKey])}` : ''}
              </div>
            </div>
            {typeof item?.efficiencyRatio === 'number' ? (
              <Badge tone={item.efficiencyRatio >= 0.8 ? 'green' : item.efficiencyRatio >= 0.5 ? 'yellow' : 'red'}>
                {formatPercent(item.efficiencyRatio)}
              </Badge>
            ) : null}
          </div>
        ))
      )}
    </div>
  </Card>
);

const GatewayDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [warning, setWarning] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [payload, setPayload] = useState({});

  const loadDashboard = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErr('');
    setWarning('');
    try {
      const response = await gatewayApi.get('/ops/dashboard');
      const next = unwrap(response) || {};
      const warnings = Array.isArray(next.warnings) ? next.warnings : [];
      const criticalAvailable = next.regulatory || next.dueToday || next.exceptions;
      if (!criticalAvailable) {
        setErr('Failed to load dashboard data');
        setPayload({});
        setLastUpdated('');
      } else {
        setPayload(next);
        setLastUpdated(next.generatedAt || new Date().toISOString());
        if (warnings.length) {
          setWarning(warnings.join(' | '));
        }
      }
    } catch {
      setErr('Failed to load dashboard data');
      setPayload({});
      setLastUpdated('');
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const regulatorySummary = payload.regulatory?.summary || {};
  const dueTodaySummary = payload.dueToday?.summary || {};
  const dueWeekSummary = payload.dueWeek?.summary || {};
  const collectionsSummary = payload.dailyCollections?.summary || {};
  const efficiencySummary = payload.collectionEfficiency?.summary || {};
  const exceptionSummary = payload.exceptions?.summary || {};

  const failedDisbursements = Array.isArray(payload.failedDisbursements) ? payload.failedDisbursements : [];
  const unmatchedPayments = Array.isArray(payload.unmatchedPayments) ? payload.unmatchedPayments : [];
  const postingFailures = Array.isArray(payload.postingFailures) ? payload.postingFailures : [];
  const suspiciousReferrals = Array.isArray(payload.suspiciousReferrals) ? payload.suspiciousReferrals : [];
  const onboardingRecords = Array.isArray(payload.onboarding?.items) ? payload.onboarding.items : [];
  const inviteRecords = Array.isArray(payload.invites?.items) ? payload.invites.items : [];
  const disbursementItems = Array.isArray(payload.disbursements?.items) ? payload.disbursements.items : [];
  const officerArrears = Array.isArray(payload.arrearsByOfficer?.items) ? [...payload.arrearsByOfficer.items] : [];
  const officerPerformance = Array.isArray(payload.officerPerformance?.items) ? [...payload.officerPerformance.items] : [];

  const queueBacklog = Number(payload.queues?.summary?.total)
    || (failedDisbursements.length + unmatchedPayments.length + postingFailures.length + suspiciousReferrals.length);

  const activeInvites = Number(payload.pipeline?.summary?.activeInvites)
    || countMatching(inviteRecords, (status) => (
      status.includes('PENDING')
      || status.includes('SENT')
      || status.includes('OPEN')
      || status.includes('NEW')
      || status.includes('ACTIVE')
    ));
  const onboardingInProgress = Number(payload.pipeline?.summary?.onboardingInProgress)
    || countMatching(onboardingRecords, (status) => (
      status.includes('STARTED')
      || status.includes('IN_PROGRESS')
      || status.includes('OPEN')
      || status.includes('KYC')
      || status.includes('PENDING')
    ));
  const kycPending = Number(payload.pipeline?.summary?.kycPending)
    || countMatching(onboardingRecords, (status) => status.includes('KYC') || status.includes('REVIEW'));
  const onboardingCompleted = Number(payload.pipeline?.summary?.completedOnboarding)
    || countMatching(onboardingRecords, (status) => (
      status.includes('APPROVED')
      || status.includes('REGISTERED')
      || status.includes('COMPLETED')
      || status.includes('ACTIVE')
    ));
  const pendingDisbursements = Number(payload.pipeline?.summary?.pendingDisbursements)
    || countMatching(disbursementItems, (status) => (
      status.includes('PENDING')
      || status.includes('CREATED')
      || status.includes('INITIATED')
      || status.includes('AGGREGATOR_SUCCESS')
    ));

  const topArrearsOfficers = useMemo(
    () => officerArrears
      .sort((left, right) => Number(right?.overdueAmount || 0) - Number(left?.overdueAmount || 0))
      .slice(0, 5),
    [payload.arrearsByOfficer]
  );

  const topCollectionOfficers = useMemo(
    () => officerPerformance
      .sort((left, right) => Number(right?.collectedAmount || 0) - Number(left?.collectedAmount || 0))
      .slice(0, 5),
    [payload.officerPerformance]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" />
        <Skeleton height="8rem" />
        <Skeleton height="16rem" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
          <p className="mt-2 text-sm text-red-600">{err}</p>
        </div>
        <Button variant="secondary" onClick={() => void loadDashboard()}>
          <RefreshCcw size={16} />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Daily microfinance operations cockpit for portfolio health, collections, queues, and pipeline recovery.
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Last updated: {formatDateTime(lastUpdated)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Link to="/gateway/reports" className={actionLinkClass}>Reports</Link>
          <Link to="/gateway/queues" className={`${actionLinkClass} border-transparent bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 dark:border-transparent dark:bg-none`}>Open Queues</Link>
        </div>
      </section>

      {warning ? (
        <Card className="border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>{warning}</div>
          </div>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricLink
          to="/gateway/reports"
          title="Active Portfolio"
          value={formatMoney(regulatorySummary.activePortfolio)}
          caption={`${formatNumber(regulatorySummary.activeBorrowers)} borrowers | ${formatNumber(regulatorySummary.activeLoans)} active loans`}
          icon={CircleDollarSign}
        />
        <DashboardMetricLink
          to="/gateway/loans/arrears"
          title="PAR > 30"
          value={formatPercent(regulatorySummary.par30Ratio)}
          caption={`${formatMoney(regulatorySummary.par30Amount)} at risk`}
          icon={ShieldAlert}
        />
        <DashboardMetricLink
          to="/gateway/reports"
          title="Collections Today"
          value={formatMoney(collectionsSummary.postedAmount)}
          caption={`Due ${formatMoney(dueTodaySummary.totalDueAmount)} | Failed ${formatMoney(collectionsSummary.failedAmount)}`}
          icon={BadgeDollarSign}
        />
        <DashboardMetricLink
          to="/gateway/queues"
          title="Queue Backlog"
          value={formatNumber(queueBacklog)}
          caption={`${formatNumber(exceptionSummary.failedDisbursements)} failed disbursements | ${formatNumber(exceptionSummary.unmatchedCollections)} unmatched`}
          icon={AlertTriangle}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Collections Today</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Due, posted, failed, and unmatched repayment flow.
              </p>
            </div>
            <Link to="/gateway/reports" className="text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              Open Reports
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Due Today</div>
              <div className="mt-2 text-xl font-semibold">{formatMoney(dueTodaySummary.totalDueAmount)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatNumber(dueTodaySummary.loansDue)} loan(s)</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Due This Week</div>
              <div className="mt-2 text-xl font-semibold">{formatMoney(dueWeekSummary.totalDueAmount)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatNumber(dueWeekSummary.loansDue)} loan(s)</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Posted Today</div>
              <div className="mt-2 text-xl font-semibold">{formatMoney(collectionsSummary.postedAmount)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatNumber(collectionsSummary.events)} collection event(s)</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Efficiency MTD</div>
              <div className="mt-2 text-xl font-semibold">{formatPercent(efficiencySummary.efficiencyRatio)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {formatMoney(efficiencySummary.collectedAmount)} collected from {formatMoney(efficiencySummary.dueAmount)} due
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Portfolio Health</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Risk concentration and regulatory pressure.
              </p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Required Provisions</div>
              <div className="mt-2 text-xl font-semibold">{formatMoney(regulatorySummary.requiredProvisions)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">NPL</div>
              <div className="mt-2 text-xl font-semibold">{formatPercent(regulatorySummary.nplRatio)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatMoney(regulatorySummary.nplAmount)}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(regulatorySummary.classificationBreakdown || {}).map(([key, count]) => (
              <Badge key={key} tone={toneForStatus(key)}>{`${titleCase(key)}: ${formatNumber(count)}`}</Badge>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Pipeline and SLA</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Intake, onboarding progress, and disbursement bottlenecks.
              </p>
            </div>
            <Link to="/gateway/invites" className="text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              Open Pipeline
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Users size={14} />
                Active Invites
              </div>
              <div className="mt-2 text-xl font-semibold">{formatNumber(activeInvites)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Clock3 size={14} />
                Onboarding In Progress
              </div>
              <div className="mt-2 text-xl font-semibold">{formatNumber(onboardingInProgress)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <ShieldAlert size={14} />
                KYC Pending
              </div>
              <div className="mt-2 text-xl font-semibold">{formatNumber(kycPending)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <BriefcaseBusiness size={14} />
                Pending Disbursements
              </div>
              <div className="mt-2 text-xl font-semibold">{formatNumber(pendingDisbursements)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Activity size={14} />
                Completed Onboarding
              </div>
              <div className="mt-2 text-xl font-semibold">{formatNumber(onboardingCompleted)}</div>
            </div>
          </div>
        </Card>

        <QueueList
          title="Recent Failed Disbursements"
          items={failedDisbursements.slice(0, 4)}
          emptyMessage="No failed disbursements in queue."
          href="/gateway/queues"
          renderMeta={(item) => `${item?.orderId || '-'} | ${formatMoney(item?.amount)} | ${titleCase(item?.status || 'PENDING')}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Leaderboard
          title="Top Arrears Officers"
          subtitle="Highest overdue balances needing follow-up."
          items={topArrearsOfficers}
          emptyMessage="No arrears data available."
          primaryKey="officer"
          secondaryKey="overdueAmount"
          tertiaryKey="arrearsLoans"
          href="/gateway/loans/arrears"
        />
        <Leaderboard
          title="Collections Leaders"
          subtitle="Highest collected amounts this period."
          items={topCollectionOfficers}
          emptyMessage="No officer performance data available."
          primaryKey="officer"
          secondaryKey="collectedAmount"
          tertiaryKey="loans"
          href="/gateway/reports"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <QueueList
          title="Unmatched Payments"
          items={unmatchedPayments.slice(0, 4)}
          emptyMessage="No unmatched payments."
          href="/gateway/queues"
          renderMeta={(item) => `${item?.paymentEventId || '-'} | ${formatMoney(item?.amount)} | ${item?.provider || 'Gateway'}`}
        />
        <QueueList
          title="Posting Failures"
          items={postingFailures.slice(0, 4)}
          emptyMessage="No posting failures."
          href="/gateway/queues"
          renderMeta={(item) => `${item?.paymentEventId || '-'} | ${formatMoney(item?.amount)} | ${item?.status || 'FAILED'}`}
        />
        <QueueList
          title="Suspicious Referrals"
          items={suspiciousReferrals.slice(0, 4)}
          emptyMessage="No suspicious referrals."
          href="/gateway/queues"
          renderMeta={(item) => `${item?.referrerCustomerId || item?.id || '-'} | ${item?.reason || item?.status || 'Flagged'}`}
        />
      </section>
    </div>
  );
};

export default GatewayDashboard;
