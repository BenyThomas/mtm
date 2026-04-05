import React, { useEffect, useState } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import { getGroupLifecycleConfig, updateGroupLifecycleConfig } from '../../../api/gateway/community';
import { useToast } from '../../../context/ToastContext';

const toNumberOrNull = (value) => {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const GroupLifecycleConfig = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    maxMembersPerGroup: '',
    maxGroupsPerCenter: '',
    maxMembersPerCenter: '',
    fineractGroupAdminRoleId: '',
    updatedAt: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGroupLifecycleConfig();
      setForm({
        maxMembersPerGroup: data?.maxMembersPerGroup ?? '',
        maxGroupsPerCenter: data?.maxGroupsPerCenter ?? '',
        maxMembersPerCenter: data?.maxMembersPerCenter ?? '',
        fineractGroupAdminRoleId: data?.fineractGroupAdminRoleId ?? '',
        updatedAt: data?.updatedAt || '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await updateGroupLifecycleConfig({
        maxMembersPerGroup: toNumberOrNull(form.maxMembersPerGroup),
        maxGroupsPerCenter: toNumberOrNull(form.maxGroupsPerCenter),
        maxMembersPerCenter: toNumberOrNull(form.maxMembersPerCenter),
        fineractGroupAdminRoleId: toNumberOrNull(form.fineractGroupAdminRoleId),
      });
      setForm({
        maxMembersPerGroup: data?.maxMembersPerGroup ?? '',
        maxGroupsPerCenter: data?.maxGroupsPerCenter ?? '',
        maxMembersPerCenter: data?.maxMembersPerCenter ?? '',
        fineractGroupAdminRoleId: data?.fineractGroupAdminRoleId ?? '',
        updatedAt: data?.updatedAt || '',
      });
      addToast('Group lifecycle config saved', 'success');
    } catch (e) {
      const msg = e?.response?.data?.errors?.[0]?.details || e?.response?.data?.message || e?.message || 'Save failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Group Lifecycle</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Controls center and group capacity plus the Fineract group admin role mapping.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || saving}>Refresh</Button>
          <Button onClick={save} disabled={loading || saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4">
        <Card>
          {loading ? (
            <Skeleton height="14rem" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Max Members Per Group</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.maxMembersPerGroup}
                  onChange={(e) => setForm((p) => ({ ...p, maxMembersPerGroup: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Groups Per Center</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.maxGroupsPerCenter}
                  onChange={(e) => setForm((p) => ({ ...p, maxGroupsPerCenter: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Members Per Center</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.maxMembersPerCenter}
                  onChange={(e) => setForm((p) => ({ ...p, maxMembersPerCenter: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium">Fineract Group Admin Role Id</label>
                <input className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.fineractGroupAdminRoleId}
                  onChange={(e) => setForm((p) => ({ ...p, fineractGroupAdminRoleId: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                {form.updatedAt ? `Last updated: ${form.updatedAt}` : 'Config has not been updated yet.'}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GroupLifecycleConfig;
