import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import KPICard from '../../components/KPICard';
import Skeleton from '../../components/Skeleton';

const GatewayDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await gatewayApi.get('/ops/management/summary');
        if (!mounted) return;
        setData(r.data || {});
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Operational overview for the digital-platform backend.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([k, v]) => (
          <KPICard
            key={k}
            title={k}
            value={typeof v === 'number' ? v : String(v)}
            emptyMessage="0"
          />
        ))}
      </div>
    </div>
  );
};

export default GatewayDashboard;
