import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { listPermissions } from '../../api/permissions';
import { getAccessMappingsConfig, updateAccessMappingsConfig } from '../../api/gateway/accessMappings';

const normalizePermissionCodes = (raw) => {
  if (!raw) return [];
  return Array.from(
    new Set(
      String(raw)
        .split(/[,\n]+/g)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
};

const AccessMappings = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [permissionSearch, setPermissionSearch] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [cfg, perms] = await Promise.all([
          getAccessMappingsConfig(),
          listPermissions().catch(() => []),
        ]);
        if (cancelled) return;
        setConfig(cfg || { mappings: [] });
        const nextDrafts = {};
        for (const item of cfg?.mappings || []) {
          nextDrafts[item.mappingId] = {
            enabled: item?.enabled !== false,
            permissionsText: Array.isArray(item?.permissionsAnyOf) ? item.permissionsAnyOf.join(', ') : '',
          };
        }
        setDrafts(nextDrafts);
        setAvailablePermissions(Array.isArray(perms) ? perms : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load access mappings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPermissions = useMemo(() => {
    const q = String(permissionSearch || '').trim().toUpperCase();
    if (!q) return availablePermissions.slice(0, 60);
    return availablePermissions.filter((item) => {
      const code = String(item?.code || '').toUpperCase();
      const entity = String(item?.entityName || '').toUpperCase();
      const action = String(item?.actionName || '').toUpperCase();
      return code.includes(q) || entity.includes(q) || action.includes(q);
    }).slice(0, 60);
  }, [availablePermissions, permissionSearch]);

  const updateDraft = (mappingId, patch) => {
    setDrafts((current) => ({
      ...current,
      [mappingId]: {
        ...(current[mappingId] || {}),
        ...patch,
      },
    }));
  };

  const onSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...config,
        mappings: (config.mappings || []).map((item) => {
          const draft = drafts[item.mappingId] || {};
          return {
            ...item,
            enabled: draft.enabled !== false,
            permissionsAnyOf: normalizePermissionCodes(draft.permissionsText),
          };
        }),
      };
      const saved = await updateAccessMappingsConfig(payload);
      setConfig(saved);
      const nextDrafts = {};
      for (const item of saved?.mappings || []) {
        nextDrafts[item.mappingId] = {
          enabled: item?.enabled !== false,
          permissionsText: Array.isArray(item?.permissionsAnyOf) ? item.permissionsAnyOf.join(', ') : '',
        };
      }
      setDrafts(nextDrafts);
      addToast('Gateway access mappings updated', 'success');
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || 'Failed to save access mappings';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gateway Access Mappings</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Map gateway modules and actions to the Fineract permission codes required to use them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={onSave} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Mappings'}
          </Button>
        </div>
      </section>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton height="20rem" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Module / Action</th>
                    <th className="px-4 py-3 text-left font-semibold">Routes</th>
                    <th className="px-4 py-3 text-left font-semibold">Methods</th>
                    <th className="px-4 py-3 text-left font-semibold">Enabled</th>
                    <th className="px-4 py-3 text-left font-semibold">Fineract Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {(config?.mappings || []).map((item) => {
                    const draft = drafts[item.mappingId] || {};
                    return (
                      <tr key={item.mappingId} className="border-t border-slate-200/60 align-top dark:border-slate-700/60">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{item.label || item.mappingId}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description || 'No description'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {(item.pathPatterns || []).map((pattern) => (
                              <div key={`${item.mappingId}-${pattern}`} className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                <code>{pattern}</code>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.methods || []).map((method) => (
                              <span key={`${item.mappingId}-${method}`} className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                                {method}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft.enabled !== false}
                              onChange={(e) => updateDraft(item.mappingId, { enabled: e.target.checked })}
                            />
                            <span>{draft.enabled !== false ? 'Active' : 'Disabled'}</span>
                          </label>
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={draft.permissionsText || ''}
                            onChange={(e) => updateDraft(item.mappingId, { permissionsText: e.target.value })}
                            rows={3}
                            className="w-full rounded-xl border p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                            placeholder="READ_CLIENT, UPDATE_CLIENT"
                          />
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Comma-separated permission codes. Access is allowed if the caller has any one of them.
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="text-sm font-semibold">Available Fineract Permissions</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Reference list from the current MTM/Fineract session.
          </p>
          <input
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
            placeholder="Search permission code..."
            className="mt-3 w-full rounded-xl border p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
          <div className="mt-3 max-h-[38rem] overflow-auto space-y-2">
            {filteredPermissions.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No permissions found for this session.</div>
            ) : (
              filteredPermissions.map((item) => (
                <div key={`${item.code}-${item.id}`} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                  <div className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-300">{item.code}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {[item.entityName, item.actionName].filter(Boolean).join(' · ') || 'Permission'}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccessMappings;
