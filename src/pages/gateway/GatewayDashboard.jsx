import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import KPICard from '../../components/KPICard';
import Skeleton from '../../components/Skeleton';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { getGwOpsReport } from '../../api/gateway/reports';

const GatewayDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [regulatory, setRegulatory] = useState(null);
  const [dueToday, setDueToday] = useState(null);
  const [exceptions, setExceptions] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [summaryRes, regulatoryRes, dueRes, exceptionRes] = await Promise.allSettled([
          gatewayApi.get('/ops/management/summary'),
          getGwOpsReport('regulatorySummary'),
          getGwOpsReport('due', { window: 'today' }),
          getGwOpsReport('exceptions'),
        ]);
        if (!mounted) return;
        if (summaryRes.status === 'fulfilled') {
          setData(summaryRes.value.data || {});
        }
        if (regulatoryRes.status === 'fulfilled') {
          setRegulatory(regulatoryRes.value || {});
        }
        if (dueRes.status === 'fulfilled') {
          setDueToday(dueRes.value || {});
        }
        if (exceptionRes.status === 'fulfilled') {
          setExceptions(exceptionRes.value || {});
        }
        if (summaryRes.status !== 'fulfilled' && regulatoryRes.status !== 'fulfilled') {
          throw new Error('Failed to load summary');
        }
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e?.message || 'Failed to load summary');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" />
        <Skeleton height="10rem" />
      </div>
    );
  }

  if (err) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
        <p className="mt-2 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const entries = Object.entries(data || {});
  const regSummary = regulatory?.summary || {};
  const dueSummary = dueToday?.summary || {};
  const exceptionSummary = exceptions?.summary || {};

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Operational overview for the digital-platform backend.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Active Portfolio"
          value={typeof regSummary.activePortfolio === 'number' ? regSummary.activePortfolio.toLocaleString() : '0'}
          emptyMessage="0"
        />
        <KPICard
          title="PAR > 30"
          value={typeof regSummary.par30Ratio === 'number' ? `${regSummary.par30Ratio.toFixed(2)}%` : '0.00%'}
          emptyMessage="0.00%"
        />
        <KPICard
          title="Required Provisions"
          value={typeof regSummary.requiredProvisions === 'number' ? regSummary.requiredProvisions.toLocaleString() : '0'}
          emptyMessage="0"
        />
        <KPICard
          title="Due Today"
          value={typeof dueSummary.totalDueAmount === 'number' ? dueSummary.totalDueAmount.toLocaleString() : '0'}
          emptyMessage="0"
        />
        <KPICard
          title="Exceptions"
          value={typeof exceptionSummary.exceptions === 'number' ? exceptionSummary.exceptions : '0'}
          emptyMessage="0"
        />
        {entries.map(([k, v]) => (
          <KPICard
            key={k}
            title={k}
            value={typeof v === 'number' ? v : String(v)}
            emptyMessage="0"
          />
        ))}
      </div>

      {regulatory ? (
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Regulatory Snapshot</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Active borrowers, NPL/PAR pressure, provisions, write-offs, and recoveries.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(regSummary.classificationBreakdown || {}).map(([key, count]) => (
                <Badge key={key} tone="blue">{`${String(key).replace(/_/g, ' ')}: ${count}`}</Badge>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default GatewayDashboard;
