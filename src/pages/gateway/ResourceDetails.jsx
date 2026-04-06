import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, BadgeX, CalendarRange, Coins, Database, Percent, ShieldCheck } from 'lucide-react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const unwrap = (body) => (body && typeof body === 'object' && 'data' in body ? body.data : body);
const isProductDetailType = (type) => ['products', 'product-snapshots', 'product_snapshots'].includes(String(type || '').toLowerCase());
const isLoanPolicyDetailType = (type) => ['loan-product-policies', 'loan_product_policies'].includes(String(type || '').toLowerCase());
const isScoreBandDetailType = (type) => ['score-band-policies', 'score_band_policies'].includes(String(type || '').toLowerCase());
const isBorrowerScoreDetailType = (type) => ['borrower-scores', 'borrower_scores'].includes(String(type || '').toLowerCase());

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString();
};

const asYesNo = (v) => (v ? 'Yes' : 'No');

const asDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};

const val = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));

const labelize = (key) => String(key || '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^./, (m) => m.toUpperCase());

const isPrimitiveArray = (value) => Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item));

const isTechnicalKey = (key) => {
  const lower = String(key || '').toLowerCase();
  return [
    'id',
    'externalid',
    'resourceid',
    'fineract',
    'platform',
    'upstream',
    'request',
    'response',
    'snapshot',
    'payload',
    'document',
    'createdby',
    'updatedby',
    'deleted',
    'metadata',
    'version',
    '_class',
    '_id',
    'customerid',
    'clientid',
  ].some((token) => lower.includes(token));
};

const DetailItem = ({ label, value, icon = null }) => (
  <div className="rounded-xl border border-slate-200/70 bg-white/75 p-3 dark:border-slate-700/70 dark:bg-slate-900/60">
    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {icon}
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</div>
  </div>
);

const TonePill = ({ active, trueText, falseText }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
      active
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
    }`}
  >
    {active ? <BadgeCheck size={14} /> : <BadgeX size={14} />}
    {active ? trueText : falseText}
  </span>
);

const TagList = ({ items, emptyText, tone = 'slate' }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</span>;
  }

  const toneClass = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  }[tone] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={String(item)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
          {String(item)}
        </span>
      ))}
    </div>
  );
};

const BreakdownList = ({ value, emptyText }) => {
  if (!value) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</span>;
  }

  const entries = Array.isArray(value)
    ? value
        .map((item, index) => [item?.label || item?.name || item?.key || `Item ${index + 1}`, item?.value ?? item?.score ?? item?.weight ?? item])
        .filter(([, itemValue]) => ['string', 'number', 'boolean'].includes(typeof itemValue))
    : Object.entries(value).filter(([, itemValue]) => ['string', 'number', 'boolean'].includes(typeof itemValue));

  if (entries.length === 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</span>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([entryLabel, entryValue]) => (
        <DetailItem key={String(entryLabel)} label={labelize(entryLabel)} value={val(entryValue)} icon={<ShieldCheck size={14} />} />
      ))}
    </div>
  );
};

const ResourceDetails = () => {
  const { type, id } = useParams();
  const isProductLike = isProductDetailType(type);
  const isLoanPolicyLike = isLoanPolicyDetailType(type);
  const isScoreBandLike = isScoreBandDetailType(type);
  const isBorrowerScoreLike = isBorrowerScoreDetailType(type);

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');

  const fetchOne = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
      setDoc(unwrap(r.data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const genericFields = Object.entries(doc || {})
    .filter(([key, value]) => !isTechnicalKey(key) && (['string', 'number', 'boolean'].includes(typeof value) || isPrimitiveArray(value)))
    .slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{labelize(type)}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {isProductLike || isLoanPolicyLike || isScoreBandLike || isBorrowerScoreLike
              ? 'Business summary and policy details.'
              : 'Business summary of the selected record.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchOne} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4 space-y-4">
        {loading ? (
          <Card>
            <Skeleton height="14rem" />
          </Card>
        ) : isProductLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-cyan-600/95 via-teal-600/95 to-emerald-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Product Overview</p>
                  <h2 className="mt-1 text-2xl font-extrabold">{val(doc?.name)}</h2>
                  <p className="mt-1 text-sm text-white/80">{val(doc?.description)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Status: {val(doc?.status || (doc?.active ? 'ACTIVE' : 'INACTIVE'))}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Currency: {val(doc?.currency)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Flags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TonePill active={!!doc?.isDefault || !!doc?.default} trueText="Default product" falseText="Not default" />
                    <TonePill active={!!doc?.digitalEnabled} trueText="Digital enabled" falseText="Digital disabled" />
                    <TonePill active={!!doc?.active} trueText="Active" falseText="Inactive" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <ShieldCheck size={18} />
                  Eligibility Rules
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Min Score" value={val(doc?.minScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Eligible Max Amount" value={money(doc?.eligibilityMaxAmount ?? doc?.maxAmount)} icon={<Coins size={14} />} />
                  <DetailItem label="Eligible Max Tenure" value={val(doc?.eligibilityMaxTenure ?? doc?.maxTenureMonths)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Min Amount" value={money(doc?.minAmount ?? doc?.minPrincipal)} icon={<Coins size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <CalendarRange size={18} />
                  Repayment Setup
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Template Repayments" value={val(doc?.numberOfRepayments)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Repayment Every" value={val(doc?.repaymentEvery)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Min Repayments" value={val(doc?.minNumberOfRepayments ?? doc?.minTenureMonths)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Max Repayments" value={val(doc?.maxNumberOfRepayments ?? doc?.maxTenureMonths)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Percent size={18} />
                  Pricing
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Annual Interest Rate" value={val(doc?.annualInterestRate ?? doc?.interestRatePerYear ?? doc?.interestRate)} icon={<Percent size={14} />} />
                  <DetailItem label="Interest Per Period" value={val(doc?.interestRatePerPeriod)} icon={<Percent size={14} />} />
                  <DetailItem label="Principal Template" value={money(doc?.principal)} icon={<Coins size={14} />} />
                  <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Availability
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Expires At" value={asDate(doc?.expiresAt)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Digital Enabled" value={asYesNo(doc?.digitalEnabled)} icon={<BadgeCheck size={14} />} />
                  <DetailItem label="Default Product" value={asYesNo(doc?.isDefault || doc?.default)} icon={<BadgeCheck size={14} />} />
                  <DetailItem label="Active" value={asYesNo(doc?.active)} icon={<BadgeCheck size={14} />} />
                </div>
              </Card>
            </div>
          </>
        ) : isLoanPolicyLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-teal-600/95 via-cyan-600/95 to-sky-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Loan Policy</p>
                  <h2 className="mt-1 text-2xl font-extrabold">{val(doc?.productName)}</h2>
                  <p className="mt-1 text-sm text-white/80">Eligibility and policy controls.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Max Amount: {money(doc?.maxProductAmount)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Tenure: {val(doc?.maxTenure)} {val(doc?.tenureUnit)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Policy State</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TonePill active={!!doc?.active} trueText="Active policy" falseText="Inactive policy" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <ShieldCheck size={18} />
                  Eligibility Rules
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Minimum Score" value={val(doc?.minScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Maximum Product Amount" value={money(doc?.maxProductAmount)} icon={<Coins size={14} />} />
                  <DetailItem label="Maximum Tenure" value={val(doc?.maxTenure)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Maximum Repayments" value={val(doc?.maxRepayments)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Policy Controls
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Allowed Statuses</div>
                    <TagList items={doc?.allowedStatuses} emptyText="No explicit status restriction" tone="cyan" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Allowed Customer Segments</div>
                    <TagList items={doc?.allowedCustomerSegments} emptyText="No explicit segment restriction" tone="emerald" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Created At" value={asDate(doc?.createdAt)} icon={<CalendarRange size={14} />} />
                    <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : isScoreBandLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-sky-600/95 via-blue-600/95 to-indigo-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Score Band Policy</p>
                  <h2 className="mt-1 text-2xl font-extrabold">{val(doc?.bandName || doc?.bandCode || 'Score Band')}</h2>
                  <p className="mt-1 text-sm text-white/80">Eligibility status: {val(doc?.eligibilityStatus)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Score Range: {val(doc?.minScore)} - {val(doc?.maxScore)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Max Amount: {money(doc?.maxEligibleAmount)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Policy State</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TonePill active={!!doc?.active} trueText="Active policy" falseText="Inactive policy" />
                    <TonePill active={!!doc?.allowsProvisional} trueText="Allows provisional" falseText="No provisional" />
                    <TonePill active={!!doc?.requiresManualReview} trueText="Manual review" falseText="Auto flow" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <ShieldCheck size={18} />
                  Scoring Rules
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Eligibility Status" value={val(doc?.eligibilityStatus)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Minimum Score" value={val(doc?.minScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Maximum Score" value={val(doc?.maxScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Max Eligible Amount" value={money(doc?.maxEligibleAmount)} icon={<Coins size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <CalendarRange size={18} />
                  Tenure And Controls
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Maximum Tenure" value={val(doc?.maxTenure)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Tenure Unit" value={val(doc?.tenureUnit)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Maximum Repayments" value={val(doc?.maxRepayments)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>
            </div>
          </>
        ) : isBorrowerScoreLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-emerald-600/95 via-teal-600/95 to-cyan-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Borrower Score</p>
                  <h2 className="mt-1 text-2xl font-extrabold">Customer Scoring Summary</h2>
                  <p className="mt-1 text-sm text-white/80">Band: {val(doc?.scoreBand)} | Eligibility: {val(doc?.eligibilityStatus)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Score: {val(doc?.score)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Computed: {asDate(doc?.computedAt)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Record State</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TonePill active={!!doc?.active} trueText="Active score" falseText="Inactive score" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <ShieldCheck size={18} />
                  Core Fields
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Score" value={val(doc?.score)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Score Band" value={val(doc?.scoreBand)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Eligibility Status" value={val(doc?.eligibilityStatus)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Computed At" value={asDate(doc?.computedAt)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Breakdown Summary
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Score Breakdown</div>
                    <BreakdownList value={doc?.scoreBreakdown} emptyText="No score breakdown available" />
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Context Breakdown</div>
                    <BreakdownList value={doc?.contextBreakdown} emptyText="No context breakdown available" />
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <div className="mb-3 flex items-center gap-2 text-base font-bold">
              <Database size={18} />
              Record Summary
            </div>
            {genericFields.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {genericFields.map(([key, value]) => (
                  <DetailItem
                    key={key}
                    label={labelize(key)}
                    value={Array.isArray(value) ? value.map(String).join(', ') : val(value)}
                    icon={<Database size={14} />}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This record is available, but there are no user-facing summary fields configured for display.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResourceDetails;
