import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

const formatDate = (value) => {
    if (!value) return '-';
    if (Array.isArray(value)) return value.join('-');
    return String(value);
};

const buildTimeline = (client) => {
    const timeline = client?.timeline || {};
    const items = [
        { key: 'submitted', label: 'Submitted', at: timeline.submittedOnDate || client?.submittedOnDate },
        { key: 'activated', label: 'Activated', at: timeline.activatedOnDate || client?.activationDate },
        { key: 'closed', label: 'Closed', at: timeline.closedOnDate || client?.closedOnDate },
        { key: 'rejected', label: 'Rejected', at: timeline.rejectedOnDate || client?.rejectedOnDate },
        { key: 'withdrawn', label: 'Withdrawn', at: timeline.withdrawnOnDate || client?.withdrawnOnDate },
    ];
    return items.filter((item) => item.at);
};

const ClientNotesTimelineTab = ({ clientId, client }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notes, setNotes] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [noteText, setNoteText] = useState('');

    const timelineItems = useMemo(() => buildTimeline(client), [client]);

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/clients/${clientId}/notes`);
            const list = Array.isArray(response?.data)
                ? response.data
                : response?.data?.pageItems || [];
            const normalized = list.map((item, index) => ({
                id: item.id || item.noteId || index + 1,
                note: item.note || item.description || item.comment || '',
                createdBy: item.createdByUsername || item.createdBy || item.authorUsername || '',
                createdOn: item.createdOnDate || item.createdDate || item.createdOn || item.noteDate || '',
            }));
            normalized.sort((a, b) => String(b.createdOn || '').localeCompare(String(a.createdOn || '')));
            setNotes(normalized);
        } catch (error) {
            setNotes([]);
            const message = error?.response?.data?.defaultUserMessage || 'Failed to load client notes';
            addToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const createNote = async () => {
        if (!noteText.trim()) {
            addToast('Note is required', 'error');
            return;
        }
        setBusy(true);
        try {
            await api.post(`/clients/${clientId}/notes`, { note: noteText.trim() });
            addToast('Note added', 'success');
            setCreateOpen(false);
            setNoteText('');
            await load();
        } catch (error) {
            const message = error?.response?.data?.defaultUserMessage || 'Failed to add note';
            addToast(message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const removeNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        setBusy(true);
        try {
            await api.delete(`/clients/${clientId}/notes/${noteId}`);
            addToast('Note deleted', 'success');
            await load();
        } catch (error) {
            const message = error?.response?.data?.defaultUserMessage || 'Failed to delete note';
            addToast(message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Lifecycle Timeline</h3>
                    </div>
                    {!timelineItems.length ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No timeline events available.</div>
                    ) : (
                        <div className="space-y-4">
                            {timelineItems.map((item) => (
                                <div key={item.key} className="flex items-start gap-3">
                                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.label}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300">{formatDate(item.at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Notes</h3>
                        <div className="space-x-2">
                            <Button variant="secondary" onClick={load} disabled={busy}>Refresh</Button>
                            <Button onClick={() => setCreateOpen(true)} disabled={busy}>Add Note</Button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading notes...</div>
                    ) : !notes.length ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No notes yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {notes.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/70 dark:bg-slate-900/40"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{item.note || '-'}</div>
                                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                {[item.createdBy, formatDate(item.createdOn)].filter(Boolean).join(' | ')}
                                            </div>
                                        </div>
                                        <Button variant="danger" onClick={() => removeNote(item.id)} disabled={busy}>Delete</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Modal
                open={createOpen}
                title="Add Client Note"
                onClose={() => {
                    setCreateOpen(false);
                    setNoteText('');
                }}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => {
                            setCreateOpen(false);
                            setNoteText('');
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={createNote} disabled={busy}>
                            {busy ? 'Saving...' : 'Save Note'}
                        </Button>
                    </>
                }
            >
                <textarea
                    rows={6}
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Enter note"
                    className="w-full rounded-2xl border p-3 dark:bg-gray-700 dark:border-gray-600"
                />
            </Modal>
        </div>
    );
};

export default ClientNotesTimelineTab;
