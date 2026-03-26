import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, BadgeX, CalendarRange, ChevronDown, Coins, Database, Percent, ShieldCheck } from 'lucide-react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const pretty = (v) => JSON.stringify(v, null, 2);
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

const ResourceDetails = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const isProductLike = isProductDetailType(type);
  const isLoanPolicyLike = isLoanPolicyDetailType(type);
  const isScoreBandLike = isScoreBandDetailType(type);
  const isBorrowerScoreLike = isBorrowerScoreDetailType(type);

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  const [editor, setEditor] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchOne = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
      const data = unwrap(r.data);
      setDoc(data);
      setEditor(pretty(data));
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

  const dirty = useMemo(() => {
    try {
      return pretty(doc) !== editor;
    } catch {
      return true;
    }
  }, [doc, editor]);

  const onSaveReplace = async () => {
    setSaving(true);
    setErr('');
    try {
      const body = JSON.parse(editor);
      const r = await gatewayApi.put(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, body);
      const data = unwrap(r.data);
      setDoc(data);
      setEditor(pretty(data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${type}/${id}? This cannot be undone.`)) return;
    setSaving(true);
    setErr('');
    try {
      await gatewayApi.delete(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
      navigate('/gateway/resources', { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {type} / <span className="text-slate-600 dark:text-slate-300">{id}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {isProductLike || isLoanPolicyLike || isScoreBandLike || isBorrowerScoreLike ? 'Product policy profile and eligibility settings.' : 'Full document editor (PUT replace). Use carefully.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchOne} disabled={loading || saving}>
            Refresh
          </Button>
          {!isProductLike ? (
            <Button onClick={onSaveReplace} disabled={loading || saving || !dirty}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          ) : null}
          <Button variant="danger" onClick={onDelete} disabled={loading || saving}>
            Delete
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
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Code: {val(doc?.productCode || doc?.code)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Fineract ID: {val(doc?.fineractProductId)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Status: {val(doc?.status || (doc?.active ? 'ACTIVE' : 'INACTIVE'))}</span>
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
                  <DetailItem label="Interest / Period" value={val(doc?.interestRatePerPeriod)} icon={<Percent size={14} />} />
                  <DetailItem label="Currency" value={val(doc?.currency)} icon={<Coins size={14} />} />
                  <DetailItem label="Principal Template" value={money(doc?.principal)} icon={<Coins size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Metadata
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Expires At" value={asDate(doc?.expiresAt)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Fineract Product ID" value={val(doc?.fineractProductId)} icon={<Database size={14} />} />
                  <DetailItem label="Digital Enabled" value={asYesNo(doc?.digitalEnabled)} icon={<BadgeCheck size={14} />} />
                </div>
              </Card>
            </div>

            <Card>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Advanced JSON editor</span>
                <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="h-[42vh] w-full resize-none rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Button onClick={onSaveReplace} disabled={saving || !dirty}>
                      {saving ? 'Saving...' : 'Save JSON Changes'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        ) : isLoanPolicyLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-teal-600/95 via-cyan-600/95 to-sky-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Loan Policy</p>
                  <h2 className="mt-1 text-2xl font-extrabold">{val(doc?.productName)}</h2>
                  <p className="mt-1 text-sm text-white/80">Policy code: {val(doc?.productCode)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Min Score: {val(doc?.minScore)}</span>
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
                  <DetailItem label="Product Code" value={val(doc?.productCode)} icon={<Database size={14} />} />
                  <DetailItem label="Product Name" value={val(doc?.productName)} icon={<Database size={14} />} />
                  <DetailItem label="Min Score" value={val(doc?.minScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Max Product Amount" value={money(doc?.maxProductAmount)} icon={<Coins size={14} />} />
                  <DetailItem label="Max Tenure" value={val(doc?.maxTenure)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Tenure Unit" value={val(doc?.tenureUnit)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Max Repayments" value={val(doc?.maxRepayments)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Policy Controls
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Allowed Statuses
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(doc?.allowedStatuses) && doc.allowedStatuses.length > 0)
                        ? doc.allowedStatuses.map((s) => (
                            <span key={String(s)} className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                              {String(s)}
                            </span>
                          ))
                        : <span className="text-sm text-slate-500">No explicit status restriction</span>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Allowed Customer Segments
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(doc?.allowedCustomerSegments) && doc.allowedCustomerSegments.length > 0)
                        ? doc.allowedCustomerSegments.map((s) => (
                            <span key={String(s)} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              {String(s)}
                            </span>
                          ))
                        : <span className="text-sm text-slate-500">No explicit segment restriction</span>}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Created At" value={asDate(doc?.createdAt)} icon={<CalendarRange size={14} />} />
                    <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Advanced JSON editor</span>
                <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="h-[42vh] w-full resize-none rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Button onClick={onSaveReplace} disabled={saving || !dirty}>
                      {saving ? 'Saving...' : 'Save JSON Changes'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        ) : isScoreBandLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-sky-600/95 via-blue-600/95 to-indigo-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Score Band Policy</p>
                  <h2 className="mt-1 text-2xl font-extrabold">Band {val(doc?.bandCode)}</h2>
                  <p className="mt-1 text-sm text-white/80">Eligibility Status: {val(doc?.eligibilityStatus)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Score Range: {val(doc?.minScore)} - {val(doc?.maxScore)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Max Amount: {money(doc?.maxEligibleAmount)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Tenure: {val(doc?.maxTenure)} {val(doc?.tenureUnit)}</span>
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
                  <DetailItem label="Band Code" value={val(doc?.bandCode)} icon={<Database size={14} />} />
                  <DetailItem label="Eligibility Status" value={val(doc?.eligibilityStatus)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Min Score" value={val(doc?.minScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Max Score" value={val(doc?.maxScore)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Max Eligible Amount" value={money(doc?.maxEligibleAmount)} icon={<Coins size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <CalendarRange size={18} />
                  Tenure & Controls
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Max Tenure" value={val(doc?.maxTenure)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Tenure Unit" value={val(doc?.tenureUnit)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Max Repayments" value={val(doc?.maxRepayments)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Created At" value={asDate(doc?.createdAt)} icon={<CalendarRange size={14} />} />
                  <DetailItem label="Updated At" value={asDate(doc?.updatedAt)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>
            </div>

            <Card>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Advanced JSON editor</span>
                <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="h-[42vh] w-full resize-none rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Button onClick={onSaveReplace} disabled={saving || !dirty}>
                      {saving ? 'Saving...' : 'Save JSON Changes'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        ) : isBorrowerScoreLike ? (
          <>
            <Card className="overflow-hidden border-transparent bg-gradient-to-br from-emerald-600/95 via-teal-600/95 to-cyan-700/95 text-white">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">Borrower Score</p>
                  <h2 className="mt-1 text-2xl font-extrabold">Customer {val(doc?.customerId)}</h2>
                  <p className="mt-1 text-sm text-white/80">Band: {val(doc?.scoreBand)} | Eligibility: {val(doc?.eligibilityStatus)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Score: {val(doc?.score)}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Version: {val(doc?.version)}</span>
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
                  <DetailItem label="Customer ID" value={val(doc?.customerId)} icon={<Database size={14} />} />
                  <DetailItem label="Score" value={val(doc?.score)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Score Band" value={val(doc?.scoreBand)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Eligibility Status" value={val(doc?.eligibilityStatus)} icon={<ShieldCheck size={14} />} />
                  <DetailItem label="Version" value={val(doc?.version)} icon={<Database size={14} />} />
                  <DetailItem label="Computed At" value={asDate(doc?.computedAt)} icon={<CalendarRange size={14} />} />
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center gap-2 text-base font-bold">
                  <Database size={18} />
                  Breakdown
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Score Breakdown
                    </div>
                    <div className="rounded-lg border border-slate-200/70 bg-slate-50/70 p-2 text-xs dark:border-slate-700/70 dark:bg-slate-900/40">
                      {doc?.scoreBreakdown ? (
                        <pre className="overflow-auto">{pretty(doc.scoreBreakdown)}</pre>
                      ) : (
                        <span className="text-slate-500">No score breakdown</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Context Breakdown
                    </div>
                    <div className="rounded-lg border border-slate-200/70 bg-slate-50/70 p-2 text-xs dark:border-slate-700/70 dark:bg-slate-900/40">
                      {Array.isArray(doc?.contextBreakdown) && doc.contextBreakdown.length > 0 ? (
                        <pre className="overflow-auto">{pretty(doc.contextBreakdown)}</pre>
                      ) : (
                        <span className="text-slate-500">No context breakdown</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Advanced JSON editor</span>
                <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="h-[42vh] w-full resize-none rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Button onClick={onSaveReplace} disabled={saving || !dirty}>
                      {saving ? 'Saving...' : 'Save JSON Changes'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        ) : (
          <Card className="p-0 overflow-hidden">
            <textarea
              className="h-[70vh] w-full resize-none bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed"
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              spellCheck={false}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResourceDetails;
