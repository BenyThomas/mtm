import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const DataTables = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');

    const [confirm, setConfirm] = useState(null); // {type:'delete'|'deregister', datatable}
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/datatables');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            // Normalize common props:
            list.sort((a, b) => String(a.registeredTableName || a.datatableName || '').localeCompare(String(b.registeredTableName || b.datatableName || '')));
            setItems(list);
        } catch (err) {
            setItems([]);
            const msg = err?.response?.data?.defaultUserMessage || 'Failed to load datatables';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter((x) => {
            const hay = [
                x.registeredTableName || x.datatableName,
                x.applicationTableName || x.apptableName,
                x.entitySubType,
                x.category,
                x.id,
            ].map((v) => String(v ?? '').toLowerCase());
            return hay.some((h) => h.includes(t));
        });
    }, [items, q]);

    const doDeregister = async (datatable) => {
        setBusy(true);
        try {
            await api.post(`/datatables/deregister/${encodeURIComponent(datatable)}`);
            addToast('Deregistered', 'success');
            await load();
        } catch (err) {
            const msg = err?.response?.data?.defaultUserMessage || 'Deregister failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const doDelete = async (datatable) => {
        setBusy(true);
        try {
            await api.delete(`/datatables/${encodeURIComponent(datatable)}`);
            addToast('Deleted', 'success');
            await load();
        } catch (err) {
            const msg = err?.response?.data?.defaultUserMessage || 'Delete failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Data Tables</h1>
                <div className="space-x-2">
                    <Button onClick={() => navigate('/config/datatables/new')}>New</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, app table…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No data tables found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">App Table</th>
                                <th className="py-2 pr-4">Multi-row</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((t) => {
                                const name = t.registeredTableName || t.datatableName || t.tableName || t.name;
                                const app = t.applicationTableName || t.apptableName || t.appTable;
                                const multiRow = (t.multiRow === true) || (String(t.category || '').toLowerCase().includes('one to many'));
                                return (
                                    <tr key={`${name}-${app}`} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{name}</td>
                                        <td className="py-2 pr-4">{app}</td>
                                        <td className="py-2 pr-4">{multiRow ? 'Yes' : 'No'}</td>
                                        <td className="py-2 pr-4 space-x-2">
                                            <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(name)}`)}>
                                                Details
                                            </Button>
                                            <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(name)}/query`)}>
                                                Query
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() => setConfirm({ type: 'deregister', datatable: name })}
                                            >
                                                Deregister
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() => setConfirm({ type: 'delete', datatable: name })}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={!!confirm}
                title={confirm?.type === 'delete' ? 'Delete Data Table' : 'Deregister Data Table'}
                onClose={() => setConfirm(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
                        <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() =>
                                confirm?.type === 'delete'
                                    ? doDelete(confirm.datatable)
                                    : doDeregister(confirm.datatable)
                            }
                        >
                            {busy ? 'Working…' : confirm?.type === 'delete' ? 'Delete' : 'Deregister'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm">
                    {confirm?.type === 'delete'
                        ? <>Delete data table <strong>{confirm?.datatable}</strong>? This drops the table.</>
                        : <>Deregister <strong>{confirm?.datatable}</strong>? Registered link to app table will be removed.</>}
                </p>
            </Modal>
        </div>
    );
};

export default DataTables;
