import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

const TaxComponentList = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [components, setComponents] = useState([]);
    const [q, setQ] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/taxes/component');
            setComponents(Array.isArray(res?.data) ? res.data : []);
        } catch (e) {
            addToast('Failed to load tax components', 'error');
            setComponents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return components;
        return components.filter((c) =>
            (c?.name || '').toLowerCase().includes(s) ||
            String(c?.id || '').includes(s)
        );
    }, [components, q]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">Tax Components</h1>
                <div className="flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name or #id"
                        className="border rounded-md p-2 text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Link to="/accounting/tax-components/new">
                        <Button>New Component</Button>
                    </Link>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No tax components found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Percentage</th>
                                <th className="py-2 pr-4">Start Date</th>
                                <th className="py-2 pr-4">Debit Account</th>
                                <th className="py-2 pr-4">Credit Account</th>
                                <th className="py-2 pr-4 w-32"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((c) => {
                                const start =
                                    Array.isArray(c?.startDate) ? c.startDate.join('-') : (c?.startDate || '-');
                                const debit = c?.debitAccount?.nameDecorated || c?.debitAccount?.name || c?.debitAccountName || '-';
                                const credit = c?.creditAccount?.nameDecorated || c?.creditAccount?.name || c?.creditAccountName || '-';
                                return (
                                    <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{c.id}</td>
                                        <td className="py-2 pr-4">{c.name || '-'}</td>
                                        <td className="py-2 pr-4">{c.percentage ?? '-'}</td>
                                        <td className="py-2 pr-4">{start}</td>
                                        <td className="py-2 pr-4">{debit}</td>
                                        <td className="py-2 pr-4">{credit}</td>
                                        <td className="py-2 pr-4">
                                            <Link to={`/accounting/tax-components/${c.id}/edit`}>
                                                <Button variant="secondary" size="sm">Edit</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TaxComponentList;
