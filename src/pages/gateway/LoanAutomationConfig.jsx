import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const toNumOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const splitCsv = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const normalizeProviders = (arr) => {
  const out = Array.from(
    new Set(
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  return out;
};

const KNOWN_AGGREGATORS = ['AZAMPAY', 'SELCOM', 'EPIKPAY'];

const normalizeRule = (r) => ({
  enabled: r?.enabled ?? true,
  maxPrincipal: r?.maxPrincipal ?? '',
  minCompletedLoans: r?.minCompletedLoans ?? '',
  productCodes: Array.isArray(r?.productCodes) ? r.productCodes.filter(Boolean) : [],
});

const toTrimmedOrNull = (v) => {
  const s = String(v || '').trim();
  return s || null;
};

const LoanAutomationConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [cfg, setCfg] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get('/ops/config/loan-automation');
      const d = r?.data || {};
      setCfg({
        autoApprovalEnabled: !!d?.autoApprovalEnabled,
        autoDisbursementEnabled: !!d?.autoDisbursementEnabled,
        paymentAggregatorEnabledProviders: normalizeProviders(d?.paymentAggregatorEnabledProviders),
        paymentAggregatorDefaultProvider: String(d?.paymentAggregatorDefaultProvider || '').trim().toUpperCase() || '',
        disbursementAggregatorProvider: d?.disbursementAggregatorProvider || '',
        azamPaySourceAccountEnabled: d?.azamPaySourceAccountEnabled ?? true,
        azamPaySourceCountryCode: d?.azamPaySourceCountryCode || '',
        azamPaySourceFullName: d?.azamPaySourceFullName || '',
        azamPaySourceBankName: d?.azamPaySourceBankName || '',
        azamPaySourceAccountNumber: d?.azamPaySourceAccountNumber || '',
        azamPaySourceCurrency: d?.azamPaySourceCurrency || '',
        requireRuleMatch: d?.requireRuleMatch ?? true,
        approvalRules: Array.isArray(d?.approvalRules) ? d.approvalRules.map(normalizeRule) : [],
        updatedAt: d?.updatedAt || '',
      });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load config');
      setCfg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const body = {
        autoApprovalEnabled: !!cfg?.autoApprovalEnabled,
        autoDisbursementEnabled: !!cfg?.autoDisbursementEnabled,
        paymentAggregatorEnabledProviders: normalizeProviders(cfg?.paymentAggregatorEnabledProviders),
        paymentAggregatorDefaultProvider: String(cfg?.paymentAggregatorDefaultProvider || '').trim().toUpperCase() || null,
        disbursementAggregatorProvider: String(cfg?.disbursementAggregatorProvider || '').trim() || null,
        azamPaySourceAccountEnabled: cfg?.azamPaySourceAccountEnabled ?? true,
        azamPaySourceCountryCode: toTrimmedOrNull(cfg?.azamPaySourceCountryCode),
        azamPaySourceFullName: toTrimmedOrNull(cfg?.azamPaySourceFullName),
        azamPaySourceBankName: toTrimmedOrNull(cfg?.azamPaySourceBankName),
        azamPaySourceAccountNumber: toTrimmedOrNull(cfg?.azamPaySourceAccountNumber),
        azamPaySourceCurrency: toTrimmedOrNull(cfg?.azamPaySourceCurrency),
        requireRuleMatch: cfg?.requireRuleMatch ?? true,
        approvalRules: (cfg?.approvalRules || []).map((r) => ({
          enabled: r?.enabled ?? true,
          maxPrincipal: toNumOrNull(r?.maxPrincipal),
          minCompletedLoans: toNumOrNull(r?.minCompletedLoans) != null ? Number(r.minCompletedLoans) : null,
          productCodes: Array.isArray(r?.productCodes)
            ? r.productCodes.map((x) => String(x || '').trim()).filter(Boolean)
            : [],
        })),
      };
      const r = await gatewayApi.put('/ops/config/loan-automation', body);
      const d = r?.data || {};
      setCfg({
        autoApprovalEnabled: !!d?.autoApprovalEnabled,
        autoDisbursementEnabled: !!d?.autoDisbursementEnabled,
        paymentAggregatorEnabledProviders: normalizeProviders(d?.paymentAggregatorEnabledProviders),
        paymentAggregatorDefaultProvider: String(d?.paymentAggregatorDefaultProvider || '').trim().toUpperCase() || '',
        disbursementAggregatorProvider: d?.disbursementAggregatorProvider || '',
        azamPaySourceAccountEnabled: d?.azamPaySourceAccountEnabled ?? true,
        azamPaySourceCountryCode: d?.azamPaySourceCountryCode || '',
        azamPaySourceFullName: d?.azamPaySourceFullName || '',
        azamPaySourceBankName: d?.azamPaySourceBankName || '',
        azamPaySourceAccountNumber: d?.azamPaySourceAccountNumber || '',
        azamPaySourceCurrency: d?.azamPaySourceCurrency || '',
        requireRuleMatch: d?.requireRuleMatch ?? true,
        approvalRules: Array.isArray(d?.approvalRules) ? d.approvalRules.map(normalizeRule) : [],
        updatedAt: d?.updatedAt || '',
      });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Loan Automation</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Gateway loan lifecycle automation configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={save} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4">
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-4">
              <Skeleton height="14rem" />
            </div>
          ) : !cfg ? (
            <div className="p-4 text-sm text-slate-600 dark:text-slate-300">No config loaded.</div>
          ) : (
            <div className="p-4 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    checked={!!cfg.autoApprovalEnabled}
                    onChange={(e) => setCfg((p) => ({ ...p, autoApprovalEnabled: e.target.checked }))}
                  />
                  <div>
                    <div className="text-sm font-semibold">Auto Approval Enabled</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Attempt to auto-approve after loan creation.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    checked={!!cfg.autoDisbursementEnabled}
                    onChange={(e) => setCfg((p) => ({ ...p, autoDisbursementEnabled: e.target.checked }))}
                  />
                  <div>
                    <div className="text-sm font-semibold">Auto Disbursement Enabled</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Attempt to auto-disburse after approval.</div>
                  </div>
                </label>

                <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Enabled Aggregator Providers
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {KNOWN_AGGREGATORS.map((code) => {
                      const checked = (cfg.paymentAggregatorEnabledProviders || []).includes(code);
                      return (
                        <label
                          key={code}
                          className="flex items-center gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm dark:border-slate-700/60"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(cfg.paymentAggregatorEnabledProviders || []);
                              if (e.target.checked) next.add(code);
                              else next.delete(code);
                              const arr = Array.from(next);
                              setCfg((p) => ({
                                ...p,
                                paymentAggregatorEnabledProviders: arr,
                                paymentAggregatorDefaultProvider:
                                  p?.paymentAggregatorDefaultProvider && !arr.includes(p.paymentAggregatorDefaultProvider)
                                    ? ''
                                    : p?.paymentAggregatorDefaultProvider || '',
                                disbursementAggregatorProvider:
                                  p?.disbursementAggregatorProvider && !arr.includes(String(p.disbursementAggregatorProvider).toUpperCase())
                                    ? ''
                                    : p?.disbursementAggregatorProvider || '',
                              }));
                            }}
                            disabled={saving}
                          />
                          <span>{code}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    If empty, the backend falls back to server defaults from `application.properties`.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Default Aggregator Provider
                  </div>
                  <select
                    className="mt-2 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                    value={String(cfg.paymentAggregatorDefaultProvider || '')}
                    onChange={(e) => setCfg((p) => ({ ...p, paymentAggregatorDefaultProvider: e.target.value }))}
                    disabled={saving}
                  >
                    <option value="">Server Default</option>
                    {(cfg.paymentAggregatorEnabledProviders || []).length > 0
                      ? (cfg.paymentAggregatorEnabledProviders || []).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))
                      : KNOWN_AGGREGATORS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Used when a loan and config do not specify a preferred provider.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Preferred Aggregator Provider
                  </div>
                  <select
                    className="mt-2 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                    value={String(cfg.disbursementAggregatorProvider || '')}
                    onChange={(e) =>
                      setCfg((p) => ({
                        ...p,
                        disbursementAggregatorProvider: e.target.value,
                      }))
                    }
                  >
                    <option value="">Auto (use defaults/enabled)</option>
                    {(cfg.paymentAggregatorEnabledProviders || []).length > 0
                      ? (cfg.paymentAggregatorEnabledProviders || []).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))
                      : KNOWN_AGGREGATORS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Used when a loan does not specify an aggregator provider.
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!cfg.requireRuleMatch}
                    onChange={(e) => setCfg((p) => ({ ...p, requireRuleMatch: e.target.checked }))}
                  />
                  <div>
                    <div className="text-sm font-semibold">Require Rule Match</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      If enabled, at least one approval rule must match for auto-approval.
                    </div>
                  </div>
                </label>

                <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60 md:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    AzamPay Disbursement Source Account
                  </div>
                  <label className="mt-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!cfg.azamPaySourceAccountEnabled}
                      onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceAccountEnabled: e.target.checked }))}
                      disabled={saving}
                    />
                    <span className="text-sm">Enable ops-configured source account</span>
                  </label>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Source Country Code
                      </label>
                      <input
                        value={cfg.azamPaySourceCountryCode || ''}
                        onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceCountryCode: e.target.value }))}
                        placeholder="e.g. TZ"
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Source Full Name
                      </label>
                      <input
                        value={cfg.azamPaySourceFullName || ''}
                        onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceFullName: e.target.value }))}
                        placeholder="e.g. Digital Platform Ltd"
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Source Bank Name
                      </label>
                      <input
                        value={cfg.azamPaySourceBankName || ''}
                        onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceBankName: e.target.value }))}
                        placeholder="e.g. tigo"
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Source Account Number
                      </label>
                      <input
                        value={cfg.azamPaySourceAccountNumber || ''}
                        onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceAccountNumber: e.target.value }))}
                        placeholder="e.g. 2557XXXXXXXX"
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Source Currency
                      </label>
                      <input
                        value={cfg.azamPaySourceCurrency || ''}
                        onChange={(e) => setCfg((p) => ({ ...p, azamPaySourceCurrency: e.target.value }))}
                        placeholder="e.g. TZS"
                        className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    When enabled, these values are used for AzamPay disbursement source details when provided.
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Approval Rules</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Rules are evaluated in order. First match triggers auto-approval.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setCfg((p) => ({
                        ...p,
                        approvalRules: [...(p?.approvalRules || []), normalizeRule({})],
                      }))
                    }
                    disabled={saving}
                  >
                    Add Rule
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {(cfg.approvalRules || []).length === 0 ? (
                    <div className="text-sm text-slate-600 dark:text-slate-300">No rules</div>
                  ) : (
                    (cfg.approvalRules || []).map((r, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold">Rule #{idx + 1}</div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setCfg((p) => ({
                                ...p,
                                approvalRules: (p?.approvalRules || []).filter((_, i) => i !== idx),
                              }))
                            }
                            disabled={saving}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!r.enabled}
                              onChange={(e) =>
                                setCfg((p) => {
                                  const next = [...(p?.approvalRules || [])];
                                  next[idx] = { ...next[idx], enabled: e.target.checked };
                                  return { ...p, approvalRules: next };
                                })
                              }
                              disabled={saving}
                            />
                            <span className="text-sm">Enabled</span>
                          </label>

                          <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Max Principal
                              </label>
                              <input
                                inputMode="decimal"
                                value={r.maxPrincipal ?? ''}
                                onChange={(e) =>
                                  setCfg((p) => {
                                    const next = [...(p?.approvalRules || [])];
                                    next[idx] = { ...next[idx], maxPrincipal: e.target.value };
                                    return { ...p, approvalRules: next };
                                  })
                                }
                                placeholder="e.g. 500000"
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                disabled={saving}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Min Completed Loans
                              </label>
                              <input
                                inputMode="numeric"
                                value={r.minCompletedLoans ?? ''}
                                onChange={(e) =>
                                  setCfg((p) => {
                                    const next = [...(p?.approvalRules || [])];
                                    next[idx] = { ...next[idx], minCompletedLoans: e.target.value };
                                    return { ...p, approvalRules: next };
                                  })
                                }
                                placeholder="e.g. 1"
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                disabled={saving}
                              />
                            </div>

                            <div className="md:col-span-1">
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Product Codes
                              </label>
                              <input
                                value={(r.productCodes || []).join(', ')}
                                onChange={(e) => {
                                  const nextCodes = splitCsv(e.target.value);
                                  setCfg((p) => {
                                    const next = [...(p?.approvalRules || [])];
                                    next[idx] = { ...next[idx], productCodes: nextCodes };
                                    return { ...p, approvalRules: next };
                                  });
                                }}
                                placeholder="e.g. SALARY_ADVANCE, FINERACT_1"
                                className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                                disabled={saving}
                              />
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                Comma-separated. Leave blank to match any product.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {cfg.updatedAt ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">Last updated: {String(cfg.updatedAt)}</div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoanAutomationConfig;
