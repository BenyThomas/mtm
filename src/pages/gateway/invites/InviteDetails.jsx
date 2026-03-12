import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import { cancelInvite, deleteInvite, getInvite, replaceInvite } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';
import Can from '../../../components/Can';

const pretty = (v) => JSON.stringify(v, null, 2);

const copyToClipboard = async (text) => {
  const t = String(text || '');
  if (!t) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch (_) {
    // fall through
  }
  // Fallback for older browsers / restrictive contexts
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

const Field = ({ label, value, mono }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div className={`mt-1 text-sm ${mono ? 'font-mono break-all' : ''} text-slate-900 dark:text-slate-50`}>
      {value || '-'}
    </div>
  </div>
);

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const units = [
    { s: 60 * 60 * 24 * 365, label: 'y' },
    { s: 60 * 60 * 24 * 30, label: 'mo' },
    { s: 60 * 60 * 24 * 7, label: 'w' },
    { s: 60 * 60 * 24, label: 'd' },
    { s: 60 * 60, label: 'h' },
    { s: 60, label: 'm' },
    { s: 1, label: 's' },
  ];
  for (const u of units) {
    if (diffSec >= u.s) return `${Math.floor(diffSec / u.s)}${u.label} ago`;
  }
  return 'now';
};

const InviteDetails = () => {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [doc, setDoc] = useState(null);
  const [editor, setEditor] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getInvite(inviteId);
      setDoc(data);
      setEditor(pretty(data));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId]);

  const dirty = useMemo(() => {
    try {
      return pretty(doc) !== editor;
    } catch {
      return true;
    }
  }, [doc, editor]);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const body = JSON.parse(editor);
      const updated = await replaceInvite(inviteId, body);
      setDoc(updated);
      setEditor(pretty(updated));
      addToast('Invite saved', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    setSaving(true);
    setErr('');
    try {
      const updated = await cancelInvite(inviteId);
      setDoc(updated);
      setEditor(pretty(updated));
      addToast('Invite cancelled', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Cancel failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete invite ${inviteId}? This cannot be undone.`)) return;
    setSaving(true);
    setErr('');
    try {
      await deleteInvite(inviteId);
      addToast('Invite deleted', 'success');
      navigate('/gateway/invites', { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Delete failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label, value) => {
    const ok = await copyToClipboard(value);
    if (ok) addToast(`${label} copied`, 'success');
    else addToast(`Failed to copy ${label}`, 'error');
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Invite</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {doc?.inviteCode ? `Code: ${doc.inviteCode}` : inviteId}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
          <Can any={['GW_OPS_WRITE']}>
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced((v) => !v)}
              disabled={loading || saving}
            >
              {showAdvanced ? 'Hide Advanced' : 'Advanced'}
            </Button>
            {showAdvanced ? (
              <Button onClick={save} disabled={loading || saving || !dirty}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={doCancel} disabled={loading || saving}>
              Cancel Invite
            </Button>
            <Button variant="danger" onClick={doDelete} disabled={loading || saving}>
              Delete
            </Button>
          </Can>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4">
        {loading ? (
          <Card>
            <Skeleton height="14rem" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Summary
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {doc?.campaignCode || '-'}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Agent: <strong>{doc?.referrerId || '-'}</strong> | Status:{' '}
                    <strong>{doc?.status || '-'}</strong>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <div title={doc?.createdAt || ''}>Created {timeAgo(doc?.createdAt)}</div>
                  <div title={doc?.updatedAt || ''}>Updated {timeAgo(doc?.updatedAt)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Invite Id" value={doc?.inviteId} mono />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invite Code
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="text-sm font-mono break-all text-slate-900 dark:text-slate-50">
                      {doc?.inviteCode || '-'}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => copy('Invite code', doc?.inviteCode)}
                      disabled={!doc?.inviteCode}
                      aria-label="Copy invite code"
                      title="Copy invite code"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                <Field label="Channel" value={doc?.channel} />
                <Field label="Campaign" value={doc?.campaignCode} />
                <Field label="Uses" value={`${Number(doc?.uses || 0)} / ${Number(doc?.maxUses || 0) === 0 ? '∞' : Number(doc?.maxUses || 0)}`} />
                <Field label="Expires At" value={doc?.expiresAt} mono />
              </div>

              <div className="mt-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invite URL
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="text-sm font-mono break-all text-slate-900 dark:text-slate-50">
                      {doc?.inviteUrl || '-'}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => copy('Invite link', doc?.inviteUrl)}
                      disabled={!doc?.inviteUrl}
                      aria-label="Copy invite link"
                      title="Copy invite link"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Prefill
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone" value={doc?.prefill?.phoneNumber} mono />
                <Field label="Name" value={`${(doc?.prefill?.firstName || '').trim()} ${(doc?.prefill?.lastName || '').trim()}`.trim()} />
              </div>

              <div className="mt-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invite Token
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="text-sm font-mono break-all text-slate-900 dark:text-slate-50">
                      {doc?.inviteToken || '-'}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => copy('Invite token', doc?.inviteToken)}
                      disabled={!doc?.inviteToken}
                      aria-label="Copy invite token"
                      title="Copy invite token"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Opened At" value={doc?.openedAt} mono />
                <Field label="Accepted At" value={doc?.acceptedAt} mono />
              </div>
            </Card>

            <Can any={['GW_OPS_WRITE']}>
              {showAdvanced ? (
                <Card className="lg:col-span-2 p-0 overflow-hidden">
                  <div className="border-b border-slate-200/70 px-4 py-3 text-sm font-semibold dark:border-slate-700/60">
                    Advanced JSON Editor (PUT replace)
                  </div>
                  <textarea
                    className="h-[60vh] w-full resize-none bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    spellCheck={false}
                  />
                </Card>
              ) : null}
            </Can>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteDetails;
