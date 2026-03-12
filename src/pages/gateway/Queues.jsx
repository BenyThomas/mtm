import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const Section = ({ title, children, actions }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="mt-3">{children}</div>
  </Card>
);

const Queues = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    unmatchedPayments: [],
    failedDisbursements: [],
    postingFailures: [],
    suspiciousReferrals: [],
  });
  const [err, setErr] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [u, d, p, s] = await Promise.all([
        gatewayApi.get('/ops/queue/unmatched-payments'),
        gatewayApi.get('/ops/queue/failed-disbursements'),
        gatewayApi.get('/ops/queue/fineract-posting-failures'),
        gatewayApi.get('/ops/queue/suspicious-referrals'),
      ]);
      setData({
        unmatchedPayments: u.data || [],
        failedDisbursements: d.data || [],
        postingFailures: p.data || [],
        suspiciousReferrals: s.data || [],
      });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryDisbursement = async (orderId) => {
    setActing(true);
    try {
      await gatewayApi.post('/ops/actions/retry-disbursement', { orderId });
      await load();
    } finally {
      setActing(false);
    }
  };

  const retryPosting = async (paymentEventId) => {
    setActing(true);
    try {
      await gatewayApi.post('/ops/actions/retry-payment-posting', { paymentEventId });
      await load();
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Gateway Queues</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Exceptions and retries in the orchestrator.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading || acting}>
          Refresh
        </Button>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {loading ? (
        <div className="mt-4">
          <Skeleton height="16rem" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section title={`Unmatched Payments (${data.unmatchedPayments.length})`}>
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(data.unmatchedPayments, null, 2)}
            </pre>
          </Section>

          <Section title={`Failed Disbursements (${data.failedDisbursements.length})`}>
            <div className="space-y-3">
              {data.failedDisbursements.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">None</p>
              ) : (
                data.failedDisbursements.map((o) => (
                  <div key={o?.orderId} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <div className="font-semibold">{o?.orderId}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">{o?.status}</div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => retryDisbursement(o?.orderId)}
                        disabled={acting || !o?.orderId}
                      >
                        Retry
                      </Button>
                    </div>
                    <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-950 p-2 text-xs text-slate-100">
                      {JSON.stringify(o, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title={`Posting Failures (${data.postingFailures.length})`}>
            <div className="space-y-3">
              {data.postingFailures.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">None</p>
              ) : (
                data.postingFailures.map((p, idx) => (
                  <div key={p?.paymentEventId || idx} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <div className="font-semibold">{p?.paymentEventId || `failure-${idx}`}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">{p?.status || ''}</div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => retryPosting(p?.paymentEventId)}
                        disabled={acting || !p?.paymentEventId}
                      >
                        Retry
                      </Button>
                    </div>
                    <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-950 p-2 text-xs text-slate-100">
                      {JSON.stringify(p, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title={`Suspicious Referrals (${data.suspiciousReferrals.length})`}>
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(data.suspiciousReferrals, null, 2)}
            </pre>
          </Section>
        </div>
      )}
    </div>
  );
};

export default Queues;

