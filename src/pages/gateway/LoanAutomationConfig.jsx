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

const normalizeRule = (r) => ({
  enabled: r?.enabled ?? true,
  maxPrincipal: r?.maxPrincipal ?? '',
  minCompletedLoans: r?.minCompletedLoans ?? '',
  productCodes: Array.isArray(r?.productCodes) ? r.productCodes.filter(Boolean) : [],
});

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
        disbursementAggregatorProvider: d?.disbursementAggregatorProvider || '',
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
        disbursementAggregatorProvider: String(cfg?.disbursementAggregatorProvider || '').trim() || null,
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
        disbursementAggregatorProvider: d?.disbursementAggregatorProvider || '',
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
                    <option value="AZAMPAY">AzamPay</option>
                    <option value="SELCOM">Selcom</option>
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
