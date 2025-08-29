import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const DataTableQuery = () => {
    const { datatable } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);

    const [whereClause, setWhere] = useState('');
    const [orderBy, setOrderBy] = useState('');
    const [limit, setLimit] = useState('50');
    const [offset, setOffset] = useState('0');
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);

    const loadMeta = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/datatables/${encodeURIComponent(datatable)}`);
            setMeta(res?.data || null);
        } catch (e) {
            setMeta(null);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load table', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMeta(); /* eslint-disable-next-line */ }, [datatable]);

    const run = async () => {
        setRunning(true);
        try {
            const body = {
                ...(whereClause.trim() ? { whereClause: whereClause.trim() } : {}),
                ...(orderBy.trim() ? { orderBy: orderBy.trim() } : {}),
                ...(limit ? { limit: Number(limit) } : {}),
                ...(offset ? { offset: Number(offset) } : {}),
            };
            const res = await api.post(`/datatables/${encodeURIComponent(datatable)}/query`, body);
            setResult(res?.data);
        } catch (e) {
            setResult(null);
            addToast(e?.response?.data?.defaultUserMessage || 'Query failed', 'error');
        } finally {
            setRunning(false);
        }
    };

    const rows = Array.isArray(result) ? result : (result?.data || []);
    const cols = rows?.length ? Object.keys(rows[0]) : [];

    return (
        <div className="space-y-6">
            {loading ? (
                <>
                    <Skeleton height="2rem" width="40%" />
                    <Card><Skeleton height="8rem" /></Card>
                </>
            ) : !meta ? (
                <>
                    <h1 className="text-2xl font-bold">{datatable} Query</h1>
                    <Card>Table not found.</Card>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">{datatable} Query</h1>
                        <Button variant="secondary" onClick={() => navigate(`/config/datatables/${encodeURIComponent(datatable)}`)}>
                            Details
                        </Button>
                    </div>

                    <Card>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">WHERE (optional)</label>
                                <input
                                    value={whereClause}
                                    onChange={(e) => setWhere(e.target.value)}
                                    placeholder="e.g. age > 18 AND country = 'TZ'"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">Syntax depends on your tenant’s datatable query support.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">ORDER BY (optional)</label>
                                <input
                                    value={orderBy}
                                    onChange={(e) => setOrderBy(e.target.value)}
                                    placeholder="e.g. createdon DESC"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-sm font-medium">Limit</label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Offset</label>
                                <input
                                    type="number"
                                    value={offset}
                                    onChange={(e) => setOffset(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="mt-4 text-right">
                            <Button onClick={run} disabled={running}>{running ? 'Running…' : 'Run'}</Button>
                        </div>
                    </Card>

                    <Card>
                        {!rows?.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {result ? 'No rows returned.' : 'Run a query to see results.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        {cols.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                            {cols.map((c) => (
                                                <td key={c} className="py-2 pr-4">{String(r[c] ?? '')}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};

export default DataTableQuery;
