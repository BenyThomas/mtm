import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import DataTableDynamicForm from '../components/DataTableDynamicForm';

const DataTableRows = () => {
    const { datatable, appTableId } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [rows, setRows] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null); // row (one-to-one) or { row, datatableId }

    const [busy, setBusy] = useState(false);

    const loadMeta = async () => {
        const res = await api.get(`/datatables/${encodeURIComponent(datatable)}`);
        return res?.data || null;
    };

    const loadRows = async () => {
        const res = await api.get(`/datatables/${encodeURIComponent(datatable)}/${appTableId}`);
        return res?.data;
    };

    const load = async () => {
        setLoading(true);
        try {
            const [m, r] = await Promise.all([loadMeta(), loadRows()]);
            setMeta(m);
            let list;
            if (Array.isArray(r)) list = r;
            else if (r && typeof r === 'object') list = [r];
            else list = [];
            setRows(list);
        } catch (e) {
            setMeta(null);
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Load failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [datatable, appTableId]);

    const columns = useMemo(() => {
        const list = meta?.columns || meta?.columnHeaderData || [];
        return Array.isArray(list) ? list : [];
    }, [meta]);

    const createRow = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/datatables/${encodeURIComponent(datatable)}/${appTableId}`, payload);
            addToast('Row created', 'success');
            setCreating(false);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Create failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    const updateRow = async (payload, datatableId) => {
        setBusy(true);
        try {
            // For one-to-one, endpoint is PUT /{datatable}/{appTableId}
            // For one-to-many, include datatableId in path
            const path = datatableId
                ? `/datatables/${encodeURIComponent(datatable)}/${appTableId}/${datatableId}`
                : `/datatables/${encodeURIComponent(datatable)}/${appTableId}`;
            await api.put(path, payload);
            addToast('Row updated', 'success');
            setEditing(null);
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    const deleteRow = async (datatableId) => {
        setBusy(true);
        try {
            const path = datatableId
                ? `/datatables/${encodeURIComponent(datatable)}/${appTableId}/${datatableId}`
                : `/datatables/${encodeURIComponent(datatable)}/${appTableId}`;
            await api.delete(path);
            addToast('Row deleted', 'success');
            await load();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        } finally {
            setBusy(false);
        }
    };

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
                    <h1 className="text-2xl font-bold">{datatable} Rows</h1>
                    <Card>Not found.</Card>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{datatable} Rows</h1>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                Parent ID: {appTableId} • {isMulti ? 'One-to-many' : 'One-to-one'}
                            </div>
                        </div>
                        <div className="space-x-2">
                            <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(datatable)}`)}>Details</Button>
                            <Button onClick={() => setCreating(true)}>Add</Button>
                        </div>
                    </div>

                    <Card>
                        {!rows.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No rows found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        {columns.map((c) => (
                                            <th key={c.name || c.columnName} className="py-2 pr-4">{c.name || c.columnName}</th>
                                        ))}
                                        <th className="py-2 pr-4"></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {rows.map((row, idx) => {
                                        const datatableId = row.id || row.datatableId || row.rowId;
                                        return (
                                            <tr key={datatableId ?? idx} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                                {columns.map((c) => {
                                                    const key = c.name || c.columnName;
                                                    let val = row[key];
                                                    if (Array.isArray(val) && val.length >= 3) {
                                                        const [y,m,d] = val;
                                                        val = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                                    }
                                                    return <td key={key} className="py-2 pr-4">{String(val ?? '')}</td>;
                                                })}
                                                <td className="py-2 pr-4 space-x-2">
                                                    <Button variant="secondary" onClick={() => setEditing({ row, datatableId })}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="danger" onClick={() => deleteRow(datatableId)}>
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

                    {/* Create */}
                    <Modal
                        open={creating}
                        title="Add Row"
                        onClose={() => setCreating(false)}
                        footer={null}
                    >
                        <DataTableDynamicForm
                            columns={columns}
                            initial={{}}
                            onSubmit={createRow}
                            submitting={busy}
                        />
                    </Modal>

                    {/* Edit */}
                    <Modal
                        open={!!editing}
                        title="Edit Row"
                        onClose={() => setEditing(null)}
                        footer={null}
                    >
                        {editing ? (
                            <DataTableDynamicForm
                                columns={columns}
                                initial={editing.row}
                                onSubmit={(payload) => updateRow(payload, isMulti ? editing.datatableId : undefined)}
                                submitting={busy}
                            />
                        ) : null}
                    </Modal>
                </>
            )}
        </div>
    );
};

export default DataTableRows;
