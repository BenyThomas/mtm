import React, { useEffect, useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const ProductCatalog = () => {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState('');
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get('/ops/products/snapshots');
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = async () => {
    setActing(true);
    setErr('');
    try {
      await gatewayApi.post('/ops/products/sync');
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Sync failed');
    } finally {
      setActing(false);
    }
  };

  const toggle = async (codeOrId, enabled) => {
    setActing(true);
    setErr('');
    try {
      await gatewayApi.patch(`/ops/products/${encodeURIComponent(codeOrId)}/digital-enabled`, { enabled });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Update failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Gateway Product Catalog</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cached Fineract loan products and digital enablement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || acting}>
            Refresh
          </Button>
          <Button onClick={sync} disabled={loading || acting}>
            {acting ? 'Syncing...' : 'Sync Now'}
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code/ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Digital</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300" colSpan={4}>
                        No snapshots
                      </td>
                    </tr>
                  ) : (
                    items.map((p) => {
                      const codeOrId = p?.code || p?.productId || p?.id;
                      const enabled = !!p?.digitalEnabled;
                      return (
                        <tr key={String(codeOrId)} className="border-t border-slate-200/60 dark:border-slate-700/60">
                          <td className="px-4 py-3">{String(codeOrId)}</td>
                          <td className="px-4 py-3">{String(p?.name || '')}</td>
                          <td className="px-4 py-3">{enabled ? 'Enabled' : 'Disabled'}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="secondary"
                              disabled={acting || !codeOrId}
                              onClick={() => toggle(codeOrId, !enabled)}
                            >
                              Toggle
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProductCatalog;

