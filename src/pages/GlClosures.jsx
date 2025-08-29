import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import useOffices from '../hooks/useOffices';
import GlClosureForm from '../components/GlClosureForm';
import { useNavigate } from 'react-router-dom';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    return String(d).slice(0, 10);
};

const GlClosures = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const { offices } = useOffices();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [deleteId, setDeleteId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const officeMap = useMemo(() => {
        const m = {};
        offices.forEach((o) => { m[o.id] = o.name; });
        return m;
    }, [offices]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/glclosures');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const createClosure = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/glclosures', payload);
            addToast('Accounting closure created', 'success');
            setCreateOpen(false);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.defaultUserMessage
                || err?.response?.data?.defaultUserMessage
                || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/glclosures/${deleteId}`);
            addToast('Closure deleted', 'success');
            setDeleteId(null);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.defaultUserMessage
                || err?.response?.data?.defaultUserMessage
                || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Accounting Closures</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)}>New Closure</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No closures found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Closing Date</th>
                                <th className="py-2 pr-4">Comments</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((c) => (
                                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.id}</td>
                                    <td className="py-2 pr-4">{c.officeName || officeMap[c.officeId] || c.officeId}</td>
                                    <td className="py-2 pr-4">{toISO(c.closingDate)}</td>
                                    <td className="py-2 pr-4">{c.comments || '-'}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/closures/${c.id}`)}>
                                            View / Edit
                                        </Button>
                                        <Button variant="danger" onClick={() => setDeleteId(c.id)}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create modal */}
            <Modal
                open={createOpen}
                title="New Accounting Closure"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <GlClosureForm onSubmit={createClosure} submitting={createBusy} />
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleteId}
                title="Delete Closure"
                onClose={() => setDeleteId(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
                            {deleteBusy ? 'Deleting…' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    Are you sure you want to delete closure <strong>#{deleteId}</strong>? This cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default GlClosures;
