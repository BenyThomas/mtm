import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gatewayApi from '../../api/gatewayAxios';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';

const pretty = (v) => JSON.stringify(v, null, 2);
const unwrap = (body) => (body && typeof body === 'object' && 'data' in body ? body.data : body);

const ResourceDetails = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  const [editor, setEditor] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOne = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
      const data = unwrap(r.data);
      setDoc(data);
      setEditor(pretty(data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const dirty = useMemo(() => {
    try {
      return pretty(doc) !== editor;
    } catch {
      return true;
    }
  }, [doc, editor]);

  const onSaveReplace = async () => {
    setSaving(true);
    setErr('');
    try {
      const body = JSON.parse(editor);
      const r = await gatewayApi.put(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, body);
      const data = unwrap(r.data);
      setDoc(data);
      setEditor(pretty(data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${type}/${id}? This cannot be undone.`)) return;
    setSaving(true);
    setErr('');
    try {
      await gatewayApi.delete(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
      navigate('/gateway/resources', { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {type} / <span className="text-slate-600 dark:text-slate-300">{id}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Full document editor (PUT replace). Use carefully.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchOne} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={onSaveReplace} disabled={loading || saving || !dirty}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={loading || saving}>
            Delete
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
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              spellCheck={false}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResourceDetails;
