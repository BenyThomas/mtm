import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import Skeleton from '../../components/Skeleton';
import {
  createKycQuestion,
  deleteKycQuestion,
  getKycPolicy,
  listKycQuestionContexts,
  listKycQuestions,
  listVerificationTasks,
  updateKycQuestion,
  upsertKycPolicy,
} from '../../api/gateway/kycOps';

const POLICY_CONTEXTS = [
  'IDENTITY',
  'FUEL',
  'INCOME',
  'EMPLOYMENT',
  'BUSINESS',
  'REFERENCE',
  'VEHICLE',
  'ADDRESS',
  'OTHER',
  'REPAYMENT',
  'CRB',
];

const toInt = (v, fallback = 0) => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const fmtAgo = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const ts = d.getTime();
  if (!Number.isFinite(ts)) return String(iso);
  const diffMs = Date.now() - ts;
  if (!Number.isFinite(diffMs)) return '';
  if (diffMs < 30_000) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const units = [
    { s: 60, label: 's' },
    { s: 60 * 60, label: 'm' },
    { s: 60 * 60 * 24, label: 'h' },
    { s: 60 * 60 * 24 * 7, label: 'd' },
    { s: 60 * 60 * 24 * 30, label: 'w' },
    { s: 60 * 60 * 24 * 365, label: 'mo' },
    { s: Infinity, label: 'y' },
  ];
  let unit = units[0];
  for (let i = 0; i < units.length; i++) {
    unit = units[i];
    if (abs < unit.s) break;
  }
  const divisor =
    unit.label === 's'
      ? 1
      : unit.label === 'm'
        ? 60
        : unit.label === 'h'
          ? 60 * 60
          : unit.label === 'd'
            ? 60 * 60 * 24
            : unit.label === 'w'
              ? 60 * 60 * 24 * 7
              : unit.label === 'mo'
                ? 60 * 60 * 24 * 30
                : 60 * 60 * 24 * 365;
  const n = Math.max(1, Math.floor(abs / divisor));
  return diffSec >= 0 ? `${n}${unit.label} ago` : `in ${n}${unit.label}`;
};

const emptyQuestion = (context = 'FUEL') => ({
  context,
  questionContext: context,
  order: 0,
  code: '',
  text: '',
  answerType: 'STRING',
  options: [],
  mandatory: true,
  skippable: false,
  displayCondition: '',
  verificationTrigger: '',
  persistToProfile: false,
  profileFieldKey: '',
  active: true,
  scoreWeightPercent: 0,
});

const KycOps = () => {
  const [tab, setTab] = useState('questions'); // questions | policy | verifications
  const [context, setContext] = useState('FUEL');

  // Questions state
  const [loadingQ, setLoadingQ] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [qErr, setQErr] = useState('');
  const [editing, setEditing] = useState(null); // {mode:'new'|'edit', data, original}
  const [savingQ, setSavingQ] = useState(false);
  const [questionContexts, setQuestionContexts] = useState(['FUEL']);

  // Questions datatable (client-side filter/sort/pagination)
  const [qSearch, setQSearch] = useState('');
  const [qMandatory, setQMandatory] = useState(''); // '' | 'MANDATORY' | 'OPTIONAL'
  const [qActive, setQActive] = useState(''); // '' | 'ACTIVE' | 'INACTIVE'
  const [qType, setQType] = useState(''); // '' | STRING | PHONE | ...
  const [qTrigger, setQTrigger] = useState(''); // '' | EMPLOYER | ...
  const [qQuestionContext, setQQuestionContext] = useState(''); // '' | INCOME | BUSINESS | ...
  const [qSortBy, setQSortBy] = useState('order'); // order | code | updatedAt | answerType
  const [qSortDir, setQSortDir] = useState('asc'); // asc | desc
  const [qPage, setQPage] = useState(0);
  const [qLimit, setQLimit] = useState(25);

  // Policy state
  const [loadingP, setLoadingP] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [pErr, setPErr] = useState('');
  const [savingP, setSavingP] = useState(false);

  // Verifications state
  const [vFilter, setVFilter] = useState({ kycSessionId: '', status: '', type: '' });
  const [loadingV, setLoadingV] = useState(false);
  const [vErr, setVErr] = useState('');
  const [verifications, setVerifications] = useState(null);

  const reloadQuestions = async () => {
    setLoadingQ(true);
    setQErr('');
    try {
      const data = await listKycQuestions(context);
      setQuestions(Array.isArray(data) ? data : []);
      setQPage(0);
    } catch (e) {
      setQErr(e?.response?.data?.message || e?.message || 'Failed to load questions');
    } finally {
      setLoadingQ(false);
    }
  };

  const reloadQuestionContexts = async () => {
    try {
      const values = await listKycQuestionContexts();
      const clean = (Array.isArray(values) ? values : [])
        .map((v) => String(v || '').trim().toUpperCase())
        .filter(Boolean);
      const unique = Array.from(new Set(clean));
      if (unique.length) {
        setQuestionContexts(unique.sort((a, b) => a.localeCompare(b)));
      }
    } catch {
      // Keep default fallback values from state.
    }
  };

  const reloadPolicy = async () => {
    setLoadingP(true);
    setPErr('');
    try {
      const p = await getKycPolicy(context);
      setPolicy(p || null);
    } catch (e) {
      setPErr(e?.response?.data?.message || e?.message || 'Failed to load policy');
      setPolicy(null);
    } finally {
      setLoadingP(false);
    }
  };

  useEffect(() => {
    reloadQuestions();
    reloadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  useEffect(() => {
    reloadQuestionContexts();
  }, []);

  const startNew = () => {
    const maxOrder = Math.max(
      0,
      ...(Array.isArray(questions) ? questions : []).map((q) => toInt(q?.order, 0))
    );
    setEditing({
      mode: 'new',
      data: { ...emptyQuestion(context), order: maxOrder + 10 },
      original: null,
    });
  };
  const startEdit = (q) =>
    setEditing({
      mode: 'edit',
      data: {
        ...emptyQuestion(context),
        ...q,
        options: Array.isArray(q?.options) ? q.options : [],
      },
      original: q,
    });

  const saveQuestion = async () => {
    if (!editing?.data) return;
    const d = editing.data;
    const code = String(d.code || '').trim().toUpperCase();
    if (!code) {
      setQErr('Question code is required');
      return;
    }
    if (!String(d.text || '').trim()) {
      setQErr('Question text is required');
      return;
    }
    setSavingQ(true);
    setQErr('');
    try {
      const payload = {
        ...d,
        context,
        order: toInt(d.order, 0),
        code,
        scoreWeightPercent: Math.max(0, Number(d.scoreWeightPercent || 0)),
        options: Array.isArray(d.options) ? d.options.filter(Boolean) : [],
        displayCondition: String(d.displayCondition || '').trim() || null,
        verificationTrigger: String(d.verificationTrigger || '').trim() || null,
        persistToProfile: !!d.persistToProfile,
        profileFieldKey: String(d.profileFieldKey || '').trim(),
        questionContext: String(d.questionContext || context).trim().toUpperCase(),
      };
      if (editing.mode === 'new') {
        await createKycQuestion(payload);
      } else {
        await updateKycQuestion(editing.original?.questionId, payload);
      }
      setEditing(null);
      await reloadQuestions();
    } catch (e) {
      setQErr(e?.response?.data?.message || e?.message || 'Failed to save question');
    } finally {
      setSavingQ(false);
    }
  };

  const savePolicy = async () => {
    if (!policy) {
      setPErr('No policy loaded');
      return;
    }
    setSavingP(true);
    setPErr('');
    try {
      const contextMaxPoints = { ...(policy.contextMaxPoints || {}) };
      POLICY_CONTEXTS.forEach((k) => {
        const n = Number(contextMaxPoints[k]);
        contextMaxPoints[k] = Number.isFinite(n) && n >= 0 ? n : 0;
      });
      const payload = {
        ...policy,
        contextMaxPoints,
        approveEligibilityMin: toInt(policy.approveEligibilityMin, 650),
        referEligibilityMin: toInt(policy.referEligibilityMin, 500),
        rejectEligibilityBelow: toInt(policy.rejectEligibilityBelow, 380),
        referRiskMin: toInt(policy.referRiskMin, 60),
        rejectRiskMin: toInt(policy.rejectRiskMin, 80),
        updatedBy: policy.updatedBy || 'ops',
      };
      const saved = await upsertKycPolicy(context, payload);
      setPolicy(saved || payload);
    } catch (e) {
      setPErr(e?.response?.data?.message || e?.message || 'Failed to save policy');
    } finally {
      setSavingP(false);
    }
  };

  const loadVerifications = async () => {
    setLoadingV(true);
    setVErr('');
    try {
      const params = {};
      if (vFilter.kycSessionId) params.kycSessionId = vFilter.kycSessionId;
      if (!vFilter.kycSessionId && vFilter.status) params.status = vFilter.status;
      if (!vFilter.kycSessionId && !vFilter.status && vFilter.type) params.type = vFilter.type;
      const data = await listVerificationTasks(params);
      setVerifications(data || null);
    } catch (e) {
      setVErr(e?.response?.data?.message || e?.message || 'Failed to load verification tasks');
      setVerifications(null);
    } finally {
      setLoadingV(false);
    }
  };

  const clearQuestionFilters = () => {
    setQSearch('');
    setQMandatory('');
    setQActive('');
    setQType('');
    setQTrigger('');
    setQQuestionContext('');
    setQSortBy('order');
    setQSortDir('asc');
    setQPage(0);
    setQLimit(25);
  };

  const doDelete = useCallback(
    async (q, ev) => {
      ev?.stopPropagation?.();
      if (!q?.questionId) return;
      const ok = window.confirm(`Delete question ${q.code}? This will affect new sessions only.`);
      if (!ok) return;
      setSavingQ(true);
      setQErr('');
      try {
        await deleteKycQuestion(q.questionId);
        await reloadQuestions();
      } catch (e) {
        setQErr(e?.response?.data?.message || e?.message || 'Failed to delete question');
      } finally {
        setSavingQ(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context]
  );

  const questionRows = useMemo(() => {
    const list = Array.isArray(questions) ? questions : [];
    const s = String(qSearch || '').trim().toLowerCase();
    const filtered = list.filter((q) => {
      if (!q) return false;
      if (qMandatory === 'MANDATORY' && !q.mandatory) return false;
      if (qMandatory === 'OPTIONAL' && q.mandatory) return false;
      if (qActive === 'ACTIVE' && !q.active) return false;
      if (qActive === 'INACTIVE' && q.active) return false;
      if (qType && String(q.answerType || '').toUpperCase() !== qType) return false;
      if (qTrigger && String(q.verificationTrigger || '').toUpperCase() !== qTrigger) return false;
      if (
        qQuestionContext &&
        String(q.questionContext || q.context || '').toUpperCase() !== qQuestionContext
      ) {
        return false;
      }
      if (!s) return true;
      const hay = [
        q.code,
        q.questionContext || q.context,
        q.text,
        q.answerType,
        q.displayCondition,
        q.verificationTrigger,
        q.updatedAt,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });

    const dir = qSortDir === 'desc' ? -1 : 1;
    const sorted = filtered.slice().sort((a, b) => {
      if (qSortBy === 'order') {
        const ao = toInt(a?.order, 0);
        const bo = toInt(b?.order, 0);
        if (ao !== bo) return (ao - bo) * dir;
        return String(a?.code || '').localeCompare(String(b?.code || '')) * dir;
      }
      const av =
        qSortBy === 'updatedAt'
          ? String(a?.updatedAt || '')
          : qSortBy === 'answerType'
            ? String(a?.answerType || '')
            : String(a?.code || '');
      const bv =
        qSortBy === 'updatedAt'
          ? String(b?.updatedAt || '')
          : qSortBy === 'answerType'
            ? String(b?.answerType || '')
            : String(b?.code || '');
      return av.localeCompare(bv) * dir;
    });

    return sorted.map((q) => ({ ...q, id: q.questionId }));
  }, [
    questions,
    qSearch,
    qMandatory,
    qActive,
    qType,
    qTrigger,
    qQuestionContext,
    qSortBy,
    qSortDir,
  ]);

  const qTotal = questionRows.length;
  const qPaged = useMemo(() => {
    const start = qPage * qLimit;
    return questionRows.slice(start, start + qLimit);
  }, [questionRows, qPage, qLimit]);

  const qColumns = useMemo(
    () => [
      {
        key: 'order',
        header: 'Order',
        sortable: true,
        render: (r) => <span className="font-mono text-xs">{toInt(r.order, 0)}</span>,
      },
      {
        key: 'code',
        header: 'Code',
        sortable: true,
        render: (r) => <span className="font-mono text-xs">{r.code}</span>,
      },
      {
        key: 'questionContext',
        header: 'Q Context',
        render: (r) => <span className="font-mono text-xs">{r.questionContext || r.context || '-'}</span>,
      },
      {
        key: 'scoreWeightPercent',
        header: 'Weight %',
        render: (r) => <span className="font-mono text-xs">{Number(r.scoreWeightPercent || 0)}</span>,
      },
      { key: 'text', header: 'Text', render: (r) => <span className="truncate">{r.text}</span> },
      { key: 'answerType', header: 'Type', sortable: true },
      {
        key: 'rules',
        header: 'Rules',
        render: (r) => (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {r.mandatory ? 'Mandatory' : 'Optional'}
            {r.skippable ? ' | Skippable' : ''}
            {r.displayCondition ? ` | if ${r.displayCondition}` : ''}
            {r.verificationTrigger ? ` | triggers ${r.verificationTrigger}` : ''}
            {r.persistToProfile ? ` | saves ${r.profileFieldKey || 'profile'}` : ''}
            {!r.active ? ' | Inactive' : ''}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        render: (r) => (
          <span className="text-xs" title={r.updatedAt || ''}>
            {fmtAgo(r.updatedAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (r) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(r);
              }}
              title="Edit"
              aria-label="Edit"
            >
              <Pencil size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              onClick={(e) => doDelete(r, e)}
              title="Delete"
              aria-label="Delete"
              disabled={savingQ}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ),
      },
    ],
    [doDelete, savingQ]
  );

  const onQuestionSort = (key) => {
    if (!key) return;
    if (qSortBy === key) {
      setQSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setQSortBy(key);
    setQSortDir('asc');
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC OPERATION</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Manage dynamic onboarding, scoring questions, scoring policy, and verification tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { k: 'questions', label: 'Questions' },
              { k: 'policy', label: 'Policy' },
              { k: 'verifications', label: 'Verifications' },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-4 py-2 text-sm font-semibold ${
                  tab === t.k
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/80 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'questions' ? (
        <div className="mt-4 space-y-4">
          {qErr ? <p className="text-sm text-red-600">{qErr}</p> : null}

          <Card>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Search
                </label>
                <input
                  value={qSearch}
                  onChange={(e) => {
                    setQSearch(e.target.value);
                    setQPage(0);
                  }}
                  placeholder="Code, text, condition, trigger..."
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mandatory
                </label>
                <select
                  value={qMandatory}
                  onChange={(e) => {
                    setQMandatory(e.target.value);
                    setQPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All</option>
                  <option value="MANDATORY">Mandatory</option>
                  <option value="OPTIONAL">Optional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active
                </label>
                <select
                  value={qActive}
                  onChange={(e) => {
                    setQActive(e.target.value);
                    setQPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Answer Type
                </label>
                <select
                  value={qType}
                  onChange={(e) => {
                    setQType(e.target.value);
                    setQPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All</option>
                  {['STRING', 'PHONE', 'ID', 'DATE', 'NUMBER', 'SELECT'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Trigger
                </label>
                <select
                  value={qTrigger}
                  onChange={(e) => {
                    setQTrigger(e.target.value);
                    setQPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All</option>
                  {['EMPLOYER', 'WORKMATE', 'COLLEAGUE_1', 'COLLEAGUE_2', 'SUPPORTER'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Q Context
                </label>
                <select
                  value={qQuestionContext}
                  onChange={(e) => {
                    setQQuestionContext(e.target.value);
                    setQPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All</option>
                  {questionContexts.map((qc) => (
                    <option key={qc} value={qc}>
                      {qc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={clearQuestionFilters} className="w-full sm:w-auto">
                  Clear
                </Button>
                <Button variant="secondary" onClick={reloadQuestions} disabled={loadingQ}>
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
                  <select
                    value={qLimit}
                    onChange={(e) => {
                      setQLimit(Number(e.target.value));
                      setQPage(0);
                    }}
                    className="rounded-xl border px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <Button onClick={startNew}>
                  <Plus size={16} />
                  New
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <DataTable
              columns={qColumns}
              data={qPaged}
              loading={loadingQ}
              total={qTotal}
              page={qPage}
              limit={qLimit}
              onPageChange={setQPage}
              sortBy={qSortBy}
              sortDir={qSortDir}
              onSort={onQuestionSort}
              onRowClick={(row) => startEdit(row)}
              emptyMessage="No KYC questions found"
            />
          </Card>

          <Modal
            open={!!editing}
            onClose={() => (savingQ ? null : setEditing(null))}
            title={editing?.mode === 'new' ? 'New Question' : `Edit ${editing?.original?.code || ''}`}
            size="4xl"
            footer={
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Sessions snapshot the question set at `/kyc/start`. Updates affect new sessions only.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditing(null)} disabled={savingQ}>
                    Cancel
                  </Button>
                  <Button onClick={saveQuestion} disabled={savingQ}>
                    {savingQ ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            }
          >
            {editing ? (
              <>
                {qErr ? <p className="mb-3 text-sm text-red-600">{qErr}</p> : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Code</div>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={editing.data.code}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, data: { ...s.data, code: e.target.value } }))
                      }
                      placeholder="e.g. FULL_NAME"
                    />
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Answer Type</div>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={editing.data.answerType}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, data: { ...s.data, answerType: e.target.value } }))
                      }
                    >
                      {['STRING', 'PHONE', 'ID', 'DATE', 'NUMBER', 'SELECT'].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Question Context</div>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={editing.data.questionContext || context}
                      onChange={(e) =>
                        setEditing((s) => ({
                          ...s,
                          data: { ...s.data, questionContext: e.target.value },
                        }))
                      }
                    >
                      {questionContexts.map((qc) => (
                        <option key={qc} value={qc}>
                          {qc}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Order</div>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={String(editing.data.order ?? 0)}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, data: { ...s.data, order: e.target.value } }))
                      }
                      placeholder="Lower comes first (e.g. 10, 20, 30...)"
                      inputMode="numeric"
                    />
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Controls questionnaire flow order and validation expectations.
                    </div>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Score Weight %</div>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={String(editing.data.scoreWeightPercent ?? 0)}
                      onChange={(e) =>
                        setEditing((s) => ({
                          ...s,
                          data: { ...s.data, scoreWeightPercent: e.target.value },
                        }))
                      }
                      inputMode="decimal"
                      placeholder="Relative weight inside this question context"
                    />
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Questions are normalized inside their context, then capped by the policy context max points.
                    </div>
                  </label>

                <label className="text-sm md:col-span-2">
                  <div className="mb-1 font-semibold">Text</div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={editing.data.text}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s, data: { ...s.data, text: e.target.value } }))
                    }
                    placeholder="Question prompt"
                  />
                </label>

                <label className="text-sm md:col-span-2">
                  <div className="mb-1 font-semibold">Options (comma-separated; for SELECT)</div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={(editing.data.options || []).join(',')}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        data: {
                          ...s.data,
                          options: String(e.target.value || '')
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                      }))
                    }
                    placeholder="EMPLOYED,SELF_EMPLOYED,UNEMPLOYED"
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1 font-semibold">Display Condition</div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={editing.data.displayCondition || ''}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        data: { ...s.data, displayCondition: e.target.value },
                      }))
                    }
                    placeholder="CUSTOMER_CATEGORY == EMPLOYED"
                  />
                </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Verification Trigger</div>
                    <select
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={editing.data.verificationTrigger || ''}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        data: { ...s.data, verificationTrigger: e.target.value },
                      }))
                    }
                  >
                    <option value="">(none)</option>
                    {['EMPLOYER', 'WORKMATE', 'COLLEAGUE_1', 'COLLEAGUE_2', 'SUPPORTER'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 font-semibold">Profile Field Key</div>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                      value={editing.data.profileFieldKey || ''}
                      onChange={(e) =>
                        setEditing((s) => ({
                          ...s,
                          data: { ...s.data, profileFieldKey: e.target.value },
                        }))
                      }
                      placeholder="street or additional.landmark"
                    />
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Fixed fields: region, district, ward, street, gender. Dynamic fields: additional.someKey
                    </div>
                  </label>

                  <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                    {[
                      { k: 'mandatory', label: 'Mandatory' },
                      { k: 'skippable', label: 'Skippable' },
                      { k: 'persistToProfile', label: 'Persist To Profile' },
                      { k: 'active', label: 'Active' },
                    ].map((x) => (
                      <label key={x.k} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!editing.data[x.k]}
                          onChange={(e) =>
                            setEditing((s) => ({ ...s, data: { ...s.data, [x.k]: e.target.checked } }))
                          }
                        />
                        <span className="font-semibold">{x.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

          </Modal>
        </div>
      ) : null}

      {tab === 'policy' ? (
        <div className="mt-4">
          {pErr ? <p className="mb-3 text-sm text-red-600">{pErr}</p> : null}
          {loadingP ? (
            <Skeleton height="12rem" />
          ) : policy ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/35">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">Scoring Policy</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Policy changes apply to new KYC sessions (sessions snapshot policy at start).
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={reloadPolicy} disabled={savingP}>
                    Refresh
                  </Button>
                  <Button onClick={savePolicy} disabled={savingP}>
                    {savingP ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-1 font-semibold">Version</div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={policy.version || ''}
                    onChange={(e) => setPolicy((p) => ({ ...p, version: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  <div className="mb-1 font-semibold">Updated By</div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={policy.updatedBy || ''}
                    onChange={(e) => setPolicy((p) => ({ ...p, updatedBy: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold">Context Max Points</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  The final score is `300 + sum(context points)` and the active context caps should total 550.
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {POLICY_CONTEXTS.map((k) => (
                    <label key={k} className="text-xs">
                      <div className="mb-1 text-slate-600 dark:text-slate-300">{k}</div>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                        value={String(policy?.contextMaxPoints?.[k] ?? 0)}
                        onChange={(e) =>
                          setPolicy((p) => ({
                            ...p,
                            contextMaxPoints: { ...(p.contextMaxPoints || {}), [k]: e.target.value },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold">Decision Thresholds</div>
                <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    ['approveEligibilityMin', 'Approve score >='],
                    ['referEligibilityMin', 'Refer score >='],
                    ['rejectEligibilityBelow', 'Reject score <'],
                    ['referRiskMin', 'Refer risk % >='],
                    ['rejectRiskMin', 'Reject risk % >='],
                  ].map(([k, label]) => (
                    <label key={k} className="text-sm">
                      <div className="mb-1 text-xs text-slate-600 dark:text-slate-300">{label}</div>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                        value={String(policy?.[k] ?? '')}
                        onChange={(e) => setPolicy((p) => ({ ...p, [k]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/70 p-4 text-sm dark:border-slate-700/60">
              No policy found for context <strong>{context}</strong>. The backend seeder normally creates one.
            </div>
          )}
        </div>
      ) : null}

      {tab === 'verifications' ? (
        <div className="mt-4">
          {vErr ? <p className="mb-3 text-sm text-red-600">{vErr}</p> : null}

          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/35">
            <div className="text-lg font-bold">Verification Tasks</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Filter by `kycSessionId` (preferred) or `status` or `type`.
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="w-72 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                value={vFilter.kycSessionId}
                onChange={(e) => setVFilter((s) => ({ ...s, kycSessionId: e.target.value }))}
                placeholder="kycSessionId"
              />

              <select
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                value={vFilter.status}
                onChange={(e) => setVFilter((s) => ({ ...s, status: e.target.value }))}
                disabled={!!vFilter.kycSessionId}
              >
                <option value="">status (optional)</option>
                {['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED', 'FAILED'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                value={vFilter.type}
                onChange={(e) => setVFilter((s) => ({ ...s, type: e.target.value }))}
                disabled={!!vFilter.kycSessionId || !!vFilter.status}
              >
                <option value="">type (optional)</option>
                {['EMPLOYER', 'WORKMATE', 'COLLEAGUE_1', 'COLLEAGUE_2', 'SUPPORTER'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <Button onClick={loadVerifications} disabled={loadingV}>
                {loadingV ? 'Loading...' : 'Load'}
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
            {loadingV ? (
              <div className="p-4">
                <Skeleton height="10rem" />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Task</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Recipient</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(verifications?.tasks) && verifications.tasks.length ? (
                    verifications.tasks.map((t) => (
                      <tr key={t.taskId} className="border-t border-slate-200/60 dark:border-slate-700/60">
                        <td className="px-4 py-3 font-mono text-xs">{t.taskId}</td>
                        <td className="px-4 py-3">{t.type}</td>
                        <td className="px-4 py-3">{t.status}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {t.recipientName || ''} {t.recipientContact ? `(${t.recipientContact})` : ''}
                        </td>
                        <td className="px-4 py-3 text-xs">{t.updatedAt || ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300" colSpan={5}>
                        No tasks loaded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default KycOps;
