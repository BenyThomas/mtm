import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';

const unwrap = (body) => (body && typeof body === 'object' && 'data' in body ? body.data : body);

const Resources = () => {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || 'invites';
  const status = params.get('status') || '';
  const limit = Number(params.get('limit') || 50);
  const offset = Number(params.get('offset') || 0);

  const [types, setTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTypes(true);
      try {
        const r = await gatewayApi.get('/ops/resources/types');
        if (!mounted) return;
        const data = unwrap(r.data);
        setTypes(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoadingTypes(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}`, {
          params: {
            status: status || undefined,
            limit,
            offset,
          },
        });
        if (!mounted) return;
        setResp(unwrap(r.data));
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e?.message || 'Failed to load resources');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [type, status, limit, offset]);

  const typeOptions = useMemo(() => {
    const t = (types || []).map((x) => x?.type).filter(Boolean);
    return t.length ? t : ['invites', 'onboarding-records', 'prospects', 'customers', 'auth-accounts', 'loans'];
  }, [types]);

  const items = Array.isArray(resp?.items) ? resp.items : [];
  const total = Number(resp?.total || 0);

  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  };

  const nextOffset = Math.min(offset + limit, Math.max(0, total - 1));
  const prevOffset = Math.max(0, offset - limit);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gateway Resources</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            CRUD over Mongo documents (internal ops).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
            value={type}
            onChange={(e) => go({ type: e.target.value, offset: 0 })}
            disabled={loadingTypes}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            className="w-44 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
            value={status}
            onChange={(e) => go({ status: e.target.value, offset: 0 })}
            placeholder="status (optional)"
          />

          <select
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
            value={String(limit)}
            onChange={(e) => go({ limit: Number(e.target.value), offset: 0 })}
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={String(n)}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
        {loading ? (
          <div className="p-4">
            <Skeleton height="12rem" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300" colSpan={3}>
                    No items
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const id =
                    it?.inviteId ||
                    it?.onboardingId ||
                    it?.prospectId ||
                    it?.platformCustomerId ||
                    it?.userId ||
                    it?.platformLoanId ||
                    it?.paymentEventId ||
                    it?.orderId ||
                    it?.id ||
                    `${idx}`;
                  const st = it?.status || it?.onboardingState || '';
                  const upd = it?.updatedAt || it?.createdAt || '';
                  return (
                    <tr key={id} className="border-t border-slate-200/60 dark:border-slate-700/60">
                      <td className="px-4 py-3">
                        <Link
                          className="text-cyan-700 hover:underline dark:text-cyan-300"
                          to={`/gateway/resources/${encodeURIComponent(type)}/${encodeURIComponent(String(id))}`}
                        >
                          {String(id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{String(st || '')}</td>
                      <td className="px-4 py-3">{String(upd || '')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-600 dark:text-slate-300">
          Total: <strong>{total}</strong> | Offset: <strong>{offset}</strong>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={offset <= 0}
            onClick={() => go({ offset: prevOffset })}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            disabled={offset + limit >= total}
            onClick={() => go({ offset: nextOffset })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Resources;
