import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const LoanAutomationConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [value, setValue] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get('/ops/config/loan-automation');
      setValue(JSON.stringify(r.data || {}, null, 2));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load config');
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
      const body = JSON.parse(value || '{}');
      const r = await gatewayApi.put('/ops/config/loan-automation', body);
      setValue(JSON.stringify(r.data || {}, null, 2));
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
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-4">
              <Skeleton height="14rem" />
            </div>
          ) : (
            <textarea
              className="h-[70vh] w-full resize-none bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              spellCheck={false}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoanAutomationConfig;

