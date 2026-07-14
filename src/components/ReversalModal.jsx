import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { createApproveExecuteReversal, previewReversal } from '../api/gateway/reversals';
import { useToast } from '../context/ToastContext';

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULT_COMMANDS = {
  LOAN: [
    { value: 'undo', label: 'Undo transaction' },
    { value: 'adjust', label: 'Adjust transaction' },
    { value: 'undoApproval', label: 'Undo approval' },
    { value: 'undodisbursal', label: 'Undo disbursal' },
    { value: 'undoWriteoff', label: 'Undo write-off' },
    { value: 'undo-charge-off', label: 'Undo charge-off' },
  ],
  SAVINGS: [
    { value: 'undo', label: 'Undo transaction' },
    { value: 'reverse', label: 'Reverse transaction' },
  ],
  JOURNAL: [
    { value: 'reverse', label: 'Reverse journal entry' },
  ],
};

const parsePayload = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
};

const errorMessage = (err, fallback) => (
  err?.response?.data?.errors?.[0]?.defaultUserMessage
  || err?.response?.data?.defaultUserMessage
  || err?.response?.data?.message
  || err?.message
  || fallback
);

export default function ReversalModal({
  open,
  scope,
  defaults = {},
  commandOptions,
  onClose,
  onDone,
}) {
  const { addToast } = useToast();
  const options = useMemo(() => commandOptions || DEFAULT_COMMANDS[scope] || [], [commandOptions, scope]);
  const [command, setCommand] = useState('');
  const [platformEntityId, setPlatformEntityId] = useState('');
  const [fineractEntityId, setFineractEntityId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [externalId, setExternalId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [payloadText, setPayloadText] = useState('{}');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCommand(defaults.command || options[0]?.value || '');
    setPlatformEntityId(defaults.platformEntityId || '');
    setFineractEntityId(defaults.fineractEntityId || '');
    setTransactionId(defaults.transactionId || '');
    setExternalId(defaults.externalId || '');
    setEffectiveDate(defaults.effectiveDate || todayISO());
    setReason('');
    setPayloadText(JSON.stringify(defaults.payload || {}, null, 2));
    setPreview(null);
    // Hydrate once per open so typing in the modal is not reset by parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const buildRequest = () => {
    const payload = parsePayload(payloadText);
    if (effectiveDate) {
      payload.transactionDate = payload.transactionDate || effectiveDate;
      payload.dateFormat = payload.dateFormat || 'yyyy-MM-dd';
      payload.locale = payload.locale || 'en';
    }
    if (reason.trim()) {
      payload.note = payload.note || reason.trim();
    }
    return {
      scope,
      platformEntityId: platformEntityId || undefined,
      fineractEntityId: fineractEntityId || undefined,
      transactionId: transactionId || undefined,
      externalId: externalId || undefined,
      command,
      reason: reason.trim() || undefined,
      payload,
    };
  };

  const runPreview = async () => {
    setPreviewBusy(true);
    try {
      const result = await previewReversal(buildRequest());
      setPreview(result);
    } catch (err) {
      addToast(errorMessage(err, 'Preview failed'), 'error');
    } finally {
      setPreviewBusy(false);
    }
  };

  const confirm = async () => {
    if (!command) {
      addToast('Select a reversal command', 'error');
      return;
    }
    if (!reason.trim()) {
      addToast('Reason is required', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await createApproveExecuteReversal(buildRequest());
      addToast('Reversal executed', 'success');
      onDone?.(result);
      onClose?.();
    } catch (err) {
      addToast(errorMessage(err, 'Reversal failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => (busy || previewBusy ? null : onClose?.())}
      title={`${scope || ''} Reversal`}
      size="3xl"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy || previewBusy}>Cancel</Button>
          <Button variant="secondary" onClick={runPreview} disabled={busy || previewBusy}>
            {previewBusy ? 'Previewing...' : 'Preview Impact'}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy || previewBusy}>
            {busy ? 'Executing...' : 'Confirm Reversal'}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Command</label>
          <select
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          >
            {options.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Effective Date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform Entity ID</label>
          <input
            value={platformEntityId}
            onChange={(e) => setPlatformEntityId(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fineract Entity ID</label>
          <input
            value={fineractEntityId}
            onChange={(e) => setFineractEntityId(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Source Transaction</label>
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">External ID</label>
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border p-2.5 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payload Overrides</label>
          <textarea
            rows={5}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            spellCheck={false}
            className="mt-1 w-full rounded-xl border p-2.5 font-mono text-xs dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        {preview ? (
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Preview Impact</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
