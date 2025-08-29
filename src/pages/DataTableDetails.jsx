import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const DataTableDetails = () => {
    const { datatable } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);

    const [addOpen, setAddOpen] = useState(false);
    const [addCols, setAddCols] = useState([{ name: '', type: 'String', length: '' }]);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/datatables/${encodeURIComponent(datatable)}`);
            setMeta(res?.data || null);
        } catch (err) {
            setMeta(null);
            addToast(err?.response?.data?.defaultUserMessage || 'Failed to load table', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [datatable]);

    const cols = useMemo(() => {
        const list = meta?.columns || meta?.columnHeaderData || [];
        return Array.isArray(list) ? list : [];
    }, [meta]);

    const addColumnRow = () => setAddCols((p) => [...p, { name: '', type: 'String', length: '' }]);
    const setAdd = (i, patch) => setAddCols((p) => p.map((c, idx) => idx === i ? { ...c, ...patch } : c));
    const delAdd = (i) => setAddCols((p) => p.filter((_, idx) => idx !== i));

    const addColumns = async () => {
        setBusy(true);
        try {
            const payload = {
                addColumns: addCols
                    .filter((c) => c.name.trim())
                    .map((c) => {
                        const out = { name: c.name.trim(), type: c.type };
                        if (c.length) out.length = Number(c.length);
                        return out;
                    }),
            };
            if (!payload.addColumns.length) throw new Error('No columns to add');
            await api.put(`/datatables/${encodeURIComponent(datatable)}`, payload);
            addToast('Columns added', 'success');
            setAddOpen(false);
            setAddCols([{ name: '', type: 'String', length: '' }]);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || e.message || 'Update failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    const register = async () => {
        // Try re-register to a chosen app table if backend requires; keep simple example here
        const app = meta?.apptableName || meta?.applicationTableName || '';
        if (!app) {
            addToast('App table unknown for this datatable', 'error');
            return;
        }
        setBusy(true);
        try {
            await api.post(`/datatables/register/${encodeURIComponent(datatable)}/${encodeURIComponent(app)}`);
            addToast('Registered', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Register failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    const appTable = meta?.apptableName || meta?.applicationTableName || meta?.appTable;
    const isMulti = Boolean(meta?.multiRow || (meta?.category && String(meta.category).toLowerCase().includes('many')));

    return (
        <div className="space-y-6">
            {loading ? (
                <>
                    <Skeleton height="2rem" width="40%" />
                    <Card><Skeleton height="8rem" /></Card>
                </>
            ) : !meta ? (
                <>
                    <h1 className="text-2xl font-bold">{datatable}</h1>
                    <Card>Not found.</Card>
                </>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{datatable}</h1>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                App table: {appTable || '—'} • Multi-row: {isMulti ? 'Yes' : 'No'}
                            </div>
                        </div>
                        <div className="space-x-2">
                            <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(datatable)}/query`)}>Query</Button>
                            <Button onClick={() => setAddOpen(true)}>Add Columns</Button>
                            <Button variant="secondary" onClick={register}>Register</Button>
                            <Button variant="secondary" onClick={() => navigate('/config/datatables')}>All</Button>
                        </div>
                    </div>

                    {/* Columns */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                <tr className="text-left text-sm text-gray-500">
                                    <th className="py-2 pr-4">Name</th>
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Length</th>
                                    <th className="py-2 pr-4">Mandatory</th>
                                    <th className="py-2 pr-4">Code</th>
                                </tr>
                                </thead>
                                <tbody>
                                {cols.map((c) => (
                                    <tr key={c.name || c.columnName} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{c.name || c.columnName}</td>
                                        <td className="py-2 pr-4">{c.type || c.columnType}</td>
                                        <td className="py-2 pr-4">{c.length || '—'}</td>
                                        <td className="py-2 pr-4">{c.mandatory ? 'Yes' : 'No'}</td>
                                        <td className="py-2 pr-4">{c.code || c.codeName || '—'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Jump to rows for demo parent id (you’ll usually navigate from a client/loan context) */}
                    {appTable ? (
                        <Card>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                To manage rows you typically navigate from the parent (e.g., Client → custom data).
                            </div>
                            <div className="mt-2">
                                <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(datatable)}/rows/1`)}>
                                    Open Rows (demo parentId=1)
                                </Button>
                            </div>
                        </Card>
                    ) : null}

                    {/* Add columns modal */}
                    <Modal
                        open={addOpen}
                        title="Add Columns"
                        onClose={() => setAddOpen(false)}
                        footer={
                            <>
                                <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
                                <Button onClick={addColumns} disabled={busy}>{busy ? 'Saving…' : 'Add'}</Button>
                            </>
                        }
                    >
                        <div className="space-y-3">
                            {addCols.map((c, i) => (
                                <div key={i} className="grid md:grid-cols-4 gap-3">
                                    <input
                                        placeholder="name *"
                                        value={c.name}
                                        onChange={(e) => setAdd(i, { name: e.target.value })}
                                        className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <select
                                        value={c.type}
                                        onChange={(e) => setAdd(i, { type: e.target.value })}
                                        className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option>String</option>
                                        <option>Text</option>
                                        <option>Boolean</option>
                                        <option>Number</option>
                                        <option>Decimal</option>
                                        <option>Date</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="length"
                                        value={c.length}
                                        onChange={(e) => setAdd(i, { length: e.target.value })}
                                        className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <Button variant="danger" onClick={() => delAdd(i)}>Remove</Button>
                                </div>
                            ))}
                            <div className="text-right">
                                <Button variant="secondary" onClick={() => setAddCols((p) => [...p, { name: '', type: 'String', length: '' }])}>
                                    Add Row
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default DataTableDetails;
