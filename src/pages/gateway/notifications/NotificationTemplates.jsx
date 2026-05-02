import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Eye, Pencil, Plus, RefreshCw } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { useToast } from '../../../context/ToastContext';
import {
  createNotificationTemplate,
  getNotificationTemplate,
  listNotificationTemplates,
  patchNotificationTemplate,
  triggerRepaymentReminders,
} from '../../../api/gateway/notifications';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const CHANNEL_OPTIONS = ['SMS'];
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];
const SUPPORTED_PLACEHOLDERS = ['{{customerName}}', '{{amount}}', '{{productName}}', '{{paidAt}}', '{{loanAccount}}'];
const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9]+)\s*}}/g;

const EMPTY_FORM = {
  eventType: 'LOAN_REPAYMENT_RECEIVED',
  channel: 'SMS',
  provider: '',
  language: 'en',
  subject: '',
  body: '',
  active: true,
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const templateTone = (active) => (active ? 'emerald' : 'gray');

const extractDetectedPlaceholders = (body) =>
  Array.from(new Set(Array.from(String(body || '').matchAll(PLACEHOLDER_REGEX)).map((match) => match[1])));

const NotificationTemplates = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const detectedPlaceholders = useMemo(() => extractDetectedPlaceholders(form.body), [form.body]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listNotificationTemplates({
          eventType: eventTypeFilter || undefined,
          channel: channelFilter || undefined,
          provider: providerFilter || undefined,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setItems(rows.map((row) => ({ ...row, id: row.templateId })));
        setTotal(Number(data?.total || rows.length || 0));
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        addToast(e?.response?.data?.message || e?.message || 'Failed to load templates', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [eventTypeFilter, channelFilter, providerFilter, activeFilter, page, limit, refreshTick, addToast]);

  const openCreate = () => {
    setFormMode('create');
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const loadTemplateDetail = async (templateId, mode = 'detail') => {
    if (!templateId) return;
    setDetailLoading(true);
    if (mode === 'detail') setDetailOpen(true);
    try {
      const data = await getNotificationTemplate(templateId);
      setSelectedTemplate(data);
      if (mode === 'edit') {
        setFormMode('edit');
        setForm({
          eventType: data?.eventType || '',
          channel: data?.channel || 'SMS',
          provider: data?.provider || '',
          language: data?.language || 'en',
          subject: data?.subject || '',
          body: data?.body || '',
          active: !!data?.active,
        });
        setFormOpen(true);
      }
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Failed to load template details', 'error');
      if (mode === 'detail') setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitForm = async () => {
    const payload = {
      eventType: String(form.eventType || '').trim(),
      channel: String(form.channel || '').trim(),
      provider: String(form.provider || '').trim() || null,
      language: String(form.language || '').trim() || 'en',
      subject: String(form.subject || '').trim(),
      body: String(form.body || '').trim(),
      active: !!form.active,
    };
    if (!payload.eventType || !payload.channel || !payload.body) {
      addToast('Event type, channel, and body are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved =
        formMode === 'create'
          ? await createNotificationTemplate(payload)
          : await patchNotificationTemplate(selectedTemplate?.templateId, payload);
      addToast(formMode === 'create' ? 'Template created' : 'Template updated', 'success');
      setSelectedTemplate(saved);
      setFormOpen(false);
      setDetailOpen(true);
      setRefreshTick((tick) => tick + 1);
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerReminders = async () => {
    if (!window.confirm('This will scan all active loans and queue repayment reminders for those due or overdue. Continue?')) {
      return;
    }
    setTriggeringReminders(true);
    try {
      const result = await triggerRepaymentReminders();
      addToast(`Reminders triggered: ${result?.queued || 0} queued, ${result?.skipped || 0} skipped (already sent today)`, 'success');
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Failed to trigger reminders', 'error');
    } finally {
      setTriggeringReminders(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'eventType',
        header: 'Event',
        sortable: false,
        render: (row) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{row?.eventType || '-'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row?.templateId || '-'}</div>
          </div>
        ),
      },
      {
        key: 'channel',
        header: 'Channel',
        sortable: false,
        render: (row) => <Badge tone="cyan">{row?.channel || '-'}</Badge>,
      },
      {
        key: 'provider',
        header: 'Provider',
        sortable: false,
        render: (row) => row?.provider || '-',
      },
      {
        key: 'language',
        header: 'Locale',
        sortable: false,
        render: (row) => `${row?.language || 'en'} / v${row?.version || 1}`,
      },
      {
        key: 'active',
        header: 'Status',
        sortable: false,
        render: (row) => <Badge tone={templateTone(!!row?.active)}>{row?.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: false,
        render: (row) => formatDateTime(row?.updatedAt || row?.createdAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (row) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => loadTemplateDetail(row?.templateId, 'detail')}>
              <Eye size={16} />
            </Button>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => loadTemplateDetail(row?.templateId, 'edit')}>
              <Pencil size={16} />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notification Templates</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create and manage Mongo-backed templates used by repayment receipt notifications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={handleTriggerReminders}
            disabled={triggeringReminders}
            title="Scan loans and queue reminders for due/overdue items"
          >
            <Bell size={16} className={triggeringReminders ? 'animate-pulse' : ''} />
            {triggeringReminders ? 'Triggering...' : 'Trigger Reminders'}
          </Button>
          <Button variant="secondary" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            New Template
          </Button>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Type</label>
            <input
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(0);
              }}
              placeholder="LOAN_REPAYMENT_RECEIVED"
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="">All</option>
              {CHANNEL_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</label>
            <input
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(0);
              }}
              placeholder="BEEM or TWILIO"
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Rows</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-xl border px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          sortBy=""
          sortDir="asc"
          onSort={() => {}}
          onRowClick={(row) => loadTemplateDetail(row?.templateId, 'detail')}
          emptyMessage={
            <div className="flex flex-col items-center gap-2">
              <span>No templates found.</span>
              <Button size="sm" onClick={openCreate} variant="ghost" className="text-cyan-600">
                <Plus size={14} /> Create your first template
              </Button>
            </div>
          }
        />
      </Card>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Template Details"
        size="4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDetailOpen(false);
                loadTemplateDetail(selectedTemplate?.templateId, 'edit');
              }}
              disabled={!selectedTemplate}
            >
              <Pencil size={16} />
              Edit Template
            </Button>
          </>
        }
      >
        {detailLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : selectedTemplate ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Type</div>
                <div className="mt-1 font-semibold">{selectedTemplate.eventType || '-'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Channel</div>
                <div className="mt-1 font-semibold">{selectedTemplate.channel || '-'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</div>
                <div className="mt-1 font-semibold">{selectedTemplate.provider || '-'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>
                <div className="mt-1">
                  <Badge tone={templateTone(!!selectedTemplate.active)}>
                    {selectedTemplate.active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</div>
                <div className="mt-1 text-sm">{selectedTemplate.subject || '-'}</div>
                <div className="mt-4 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Body</div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                  {selectedTemplate.body || ''}
                </pre>
              </Card>

              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Metadata</div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Template ID</dt>
                    <dd className="break-all font-medium">{selectedTemplate.templateId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Language</dt>
                    <dd className="font-medium">{selectedTemplate.language || 'en'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Version</dt>
                    <dd className="font-medium">{selectedTemplate.version || 1}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Created By</dt>
                    <dd className="font-medium">{selectedTemplate.createdBy || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Created At</dt>
                    <dd className="font-medium">{formatDateTime(selectedTemplate.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Updated At</dt>
                    <dd className="font-medium">{formatDateTime(selectedTemplate.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Detected Placeholders</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedTemplate.placeholders || []).length > 0 ? (
                      selectedTemplate.placeholders.map((placeholder) => (
                        <span
                          key={placeholder}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono text-slate-600 dark:border-slate-700 dark:text-slate-300"
                        >
                          {`{{${placeholder}}}`}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No placeholders</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">No template selected.</div>
        )}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => (saving ? null : setFormOpen(false))}
        title={formMode === 'create' ? 'New Notification Template' : 'Edit Notification Template'}
        size="4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? 'Saving...' : formMode === 'create' ? 'Create Template' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Type</label>
                <input
                  value={form.eventType}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value }))}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  disabled={saving}
                >
                  {CHANNEL_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</label>
                <input
                  value={form.provider}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                  placeholder="Optional provider override"
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Language</label>
                <input
                  value={form.language}
                  onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  disabled={saving}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={12}
                className="mt-1 w-full rounded-xl border p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700"
                disabled={saving}
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                disabled={saving}
              />
              <span className="text-sm">Template is active</span>
            </label>
          </div>

          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Supported Placeholders</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUPPORTED_PLACEHOLDERS.map((placeholder) => (
                <span
                  key={placeholder}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {placeholder}
                </span>
              ))}
            </div>

            <div className="mt-5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Detected In Body</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detectedPlaceholders.length > 0 ? (
                detectedPlaceholders.map((placeholder) => (
                  <span
                    key={placeholder}
                    className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-mono text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200"
                  >
                    {`{{${placeholder}}}`}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">No placeholders detected.</span>
              )}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default NotificationTemplates;
