import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, RotateCcw } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import { useToast } from '../../../context/ToastContext';
import {
  getNotificationDispatch,
  listNotificationDispatches,
  retryNotificationDispatch,
} from '../../../api/gateway/notifications';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const CHANNEL_OPTIONS = ['SMS'];
const STATUS_OPTIONS = ['', 'PENDING', 'FAILED', 'SENT', 'CANCELLED'];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const statusTone = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'SENT':
      return 'emerald';
    case 'FAILED':
      return 'red';
    case 'PENDING':
      return 'yellow';
    case 'CANCELLED':
      return 'gray';
    default:
      return 'blue';
  }
};

const NotificationDispatches = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [referenceIdFilter, setReferenceIdFilter] = useState('');
  const [platformLoanIdFilter, setPlatformLoanIdFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listNotificationDispatches({
          eventType: eventTypeFilter || undefined,
          channel: channelFilter || undefined,
          status: statusFilter || undefined,
          referenceId: referenceIdFilter || undefined,
          platformLoanId: platformLoanIdFilter || undefined,
          recipient: recipientFilter || undefined,
          offset: page * limit,
          limit,
        });
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setItems(rows.map((row) => ({ ...row, id: row.dispatchId })));
        setTotal(Number(data?.total || rows.length || 0));
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        addToast(e?.response?.data?.message || e?.message || 'Failed to load dispatches', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    eventTypeFilter,
    channelFilter,
    statusFilter,
    referenceIdFilter,
    platformLoanIdFilter,
    recipientFilter,
    page,
    limit,
    refreshTick,
    addToast,
  ]);

  const loadDispatchDetail = async (dispatchId) => {
    if (!dispatchId) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await getNotificationDispatch(dispatchId);
      setSelectedDispatch(data);
    } catch (e) {
      setDetailOpen(false);
      addToast(e?.response?.data?.message || e?.message || 'Failed to load dispatch details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const retryDispatch = async (dispatchId) => {
    if (!dispatchId) return;
    setActingId(dispatchId);
    try {
      const data = await retryNotificationDispatch(dispatchId);
      addToast('Dispatch queued for retry', 'success');
      setRefreshTick((tick) => tick + 1);
      if (selectedDispatch?.dispatchId === dispatchId) {
        setSelectedDispatch(data);
      }
    } catch (e) {
      addToast(e?.response?.data?.message || e?.message || 'Retry failed', 'error');
    } finally {
      setActingId('');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (row) => <Badge tone={statusTone(row?.status)}>{row?.status || '-'}</Badge>,
      },
      {
        key: 'eventType',
        header: 'Event',
        sortable: false,
        render: (row) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{row?.eventType || '-'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row?.dispatchId || '-'}</div>
          </div>
        ),
      },
      {
        key: 'recipient',
        header: 'Recipient',
        sortable: false,
        render: (row) => (
          <div>
            <div>{row?.recipient || '-'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row?.channel || '-'} via {row?.provider || '-'}</div>
          </div>
        ),
      },
      {
        key: 'reference',
        header: 'Reference',
        sortable: false,
        render: (row) => (
          <div>
            <div>{row?.referenceType || '-'}</div>
            <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{row?.referenceId || '-'}</div>
          </div>
        ),
      },
      {
        key: 'retryCount',
        header: 'Retries',
        sortable: false,
        render: (row) => (
          <div>
            <div>{Number(row?.retryCount || 0)}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Next: {formatDateTime(row?.nextRetryAt)}</div>
          </div>
        ),
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
            <Button size="sm" variant="ghost" className="px-2" onClick={() => loadDispatchDetail(row?.dispatchId)}>
              <Eye size={16} />
            </Button>
            {String(row?.status || '').toUpperCase() === 'FAILED' ? (
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => retryDispatch(row?.dispatchId)}
                disabled={actingId === row?.dispatchId}
              >
                <RotateCcw size={16} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actingId]
  );

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notification Dispatch History</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Inspect dispatch outcomes, provider responses, and retry failed sends from operations.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </section>

      <Card>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Type</label>
            <input
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              placeholder="LOAN_REPAYMENT_RECEIVED"
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value || 'all'} value={value}>
                  {value || 'All'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reference ID</label>
            <input
              value={referenceIdFilter}
              onChange={(e) => {
                setReferenceIdFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Payment event ID"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform Loan ID</label>
            <input
              value={platformLoanIdFilter}
              onChange={(e) => {
                setPlatformLoanIdFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Loan ID"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recipient</label>
            <input
              value={recipientFilter}
              onChange={(e) => {
                setRecipientFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Phone number"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
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
          onRowClick={(row) => loadDispatchDetail(row?.dispatchId)}
          emptyMessage="No dispatches found"
        />
      </Card>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Dispatch Details"
        size="5xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {String(selectedDispatch?.status || '').toUpperCase() === 'FAILED' ? (
              <Button
                onClick={() => retryDispatch(selectedDispatch?.dispatchId)}
                disabled={actingId === selectedDispatch?.dispatchId}
              >
                <RotateCcw size={16} />
                {actingId === selectedDispatch?.dispatchId ? 'Retrying...' : 'Retry Send'}
              </Button>
            ) : null}
          </>
        }
      >
        {detailLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : selectedDispatch ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>
                <div className="mt-1">
                  <Badge tone={statusTone(selectedDispatch.status)}>{selectedDispatch.status || '-'}</Badge>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Channel</div>
                <div className="mt-1 font-semibold">{selectedDispatch.channel || '-'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider</div>
                <div className="mt-1 font-semibold">{selectedDispatch.provider || '-'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Retries</div>
                <div className="mt-1 font-semibold">{Number(selectedDispatch.retryCount || 0)}</div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rendered Message</div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                  {selectedDispatch.renderedMessage || ''}
                </pre>

                <div className="mt-5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Provider Response</div>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(selectedDispatch.providerResponse || {}, null, 2)}
                </pre>
              </Card>

              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Dispatch Metadata</div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Dispatch ID</dt>
                    <dd className="break-all font-medium">{selectedDispatch.dispatchId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Event Type</dt>
                    <dd className="font-medium">{selectedDispatch.eventType || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Recipient</dt>
                    <dd className="font-medium">{selectedDispatch.recipient || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Reference</dt>
                    <dd className="break-all font-medium">{selectedDispatch.referenceType || '-'}: {selectedDispatch.referenceId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Platform Loan</dt>
                    <dd className="break-all font-medium">{selectedDispatch.platformLoanId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Template</dt>
                    <dd className="break-all font-medium">{selectedDispatch.templateId || '-'} / v{selectedDispatch.templateVersion || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Provider Message ID</dt>
                    <dd className="break-all font-medium">{selectedDispatch.providerMessageId || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Created At</dt>
                    <dd className="font-medium">{formatDateTime(selectedDispatch.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Send At</dt>
                    <dd className="font-medium">{formatDateTime(selectedDispatch.sendAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Last Tried</dt>
                    <dd className="font-medium">{formatDateTime(selectedDispatch.lastTriedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Sent At</dt>
                    <dd className="font-medium">{formatDateTime(selectedDispatch.sentAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Next Retry</dt>
                    <dd className="font-medium">{formatDateTime(selectedDispatch.nextRetryAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Correlation ID</dt>
                    <dd className="break-all font-medium">{selectedDispatch.correlationId || '-'}</dd>
                  </div>
                </dl>

                {selectedDispatch.providerError ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                    <div className="text-xs uppercase tracking-wide">Provider Error</div>
                    <div className="mt-1 break-words">{selectedDispatch.providerError}</div>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">No dispatch selected.</div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationDispatches;
