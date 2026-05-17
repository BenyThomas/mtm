import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const CLIENT_TABLE_NAMES = new Set(['m_client', 'client', 'clients']);

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const ClientDatatablesTab = ({ clientId }) => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get('/datatables');
            const list = Array.isArray(response?.data)
                ? response.data
                : response?.data?.pageItems || [];
            setRows(list);
        } catch (error) {
            setRows([]);
            const message = error?.response?.data?.defaultUserMessage || 'Failed to load datatables';
            addToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clientDatatables = useMemo(() => {
        return rows.filter((item) => {
            const registered = normalizeName(item.registeredTableName || item.applicationTableName || item.appTableName);
            return CLIENT_TABLE_NAMES.has(registered);
        }).map((item) => ({
            name: item.datatableName || item.tableName || item.name || '',
            registeredTableName: item.registeredTableName || item.applicationTableName || item.appTableName || '',
            multiRow: !!item.multiRow,
        })).filter((item) => item.name);
    }, [rows]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Client Data Tables</h2>
                <Button variant="secondary" onClick={load}>Refresh</Button>
            </div>

            <Card>
                {loading ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">Loading datatables...</div>
                ) : !clientDatatables.length ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        No datatables are registered to the client entity.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-slate-500">
                                <th className="py-2 pr-4">Datatable</th>
                                <th className="py-2 pr-4">Entity</th>
                                <th className="py-2 pr-4">Mode</th>
                                <th className="py-2 pr-4" />
                            </tr>
                            </thead>
                            <tbody>
                            {clientDatatables.map((item) => (
                                <tr key={item.name} className="border-t border-slate-200 text-sm dark:border-slate-700">
                                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                                    <td className="py-2 pr-4">{item.registeredTableName}</td>
                                    <td className="py-2 pr-4">{item.multiRow ? 'One-to-many' : 'One-to-one'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate(`/config/datatables/${encodeURIComponent(item.name)}/rows/${clientId}`)}
                                        >
                                            Manage Rows
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ClientDatatablesTab;
