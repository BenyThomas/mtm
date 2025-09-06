import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import ClientCommandModal from '../../components/ClientCommandModal';

const statusTone = (s) => {
    const code = (s?.code || s?.value || s || '').toString();
    if (/active/i.test(code)) return 'green';
    if (/pending|submitted/i.test(code)) return 'yellow';
    if (/closed|dormant|inactiv/i.test(code)) return 'gray';
    return 'gray';
};

const normalizeOffices = (arr) => Array.isArray(arr) ? arr.map(o => ({ id: o.id, name: o.name })) : [];

const Clients = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    const [q, setQ] = useState('');
    const [status, setStatus] = useState('');      // 'active' | 'pending' | 'closed' (server expects status=)
    const [officeId, setOfficeId] = useState('');
    const [offices, setOffices] = useState([]);

    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);

    const [commandClient, setCommandClient] = useState(null); // row data for command modal

    const loadOffices = async () => {
        try {
            const r = await api.get('/offices');
            setOffices(normalizeOffices(r?.data || []));
        } catch {
            setOffices([]);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const params = { limit, offset };
            if (officeId) params.officeId = officeId;
            if (status) params.status = status;
            const r = await api.get('/clients', { params });
            const pageItems = r?.data?.pageItems || r?.data || [];
            setItems(Array.isArray(pageItems) ? pageItems : []);
            setTotal(Number(r?.data?.totalFilteredRecords ?? r?.data?.totalElements ?? pageItems.length));
        } catch (e) {
            setItems([]);
            setTotal(0);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load clients', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOffices(); }, []);
    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [limit, offset, status, officeId]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter(c => {
            const name = c.displayName || [c.firstname, c.lastname].filter(Boolean).join(' ');
            return [c.id, name, c.externalId, c.accountNo, c.officeName]
                .map(v => String(v || '').toLowerCase())
                .some(s => s.includes(t));
        });
    }, [items, q]);

    const next = () => setOffset(o => o + limit);
    const prev = () => setOffset(o => Math.max(0, o - limit));
    const canPrev = offset > 0;
    const canNext = offset + limit < total;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Clients</h1>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate('/clients/new')}>New Client</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Name, external ID, account #, office…"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Office</label>
                        <select
                            value={officeId}
                            onChange={(e) => { setOfficeId(e.target.value); setOffset(0); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No clients found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Account #</th>
                                <th className="py-2 pr-4">External ID</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(c => {
                                const name = c.displayName || [c.firstname, c.lastname].filter(Boolean).join(' ');
                                return (
                                    <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{c.id}</td>
                                        <td className="py-2 pr-4">{name || '—'}</td>
                                        <td className="py-2 pr-4">{c.officeName || '—'}</td>
                                        <td className="py-2 pr-4">
                                            <Badge tone={statusTone(c.status)}>{c.status?.value || c.status?.code || '—'}</Badge>
                                        </td>
                                        <td className="py-2 pr-4">{c.accountNo || '—'}</td>
                                        <td className="py-2 pr-4">{c.externalId || '—'}</td>
                                        <td className="py-2 pr-4 whitespace-nowrap space-x-2">
                                            <Button variant="secondary" onClick={() => navigate(`/clients/${c.id}`)}>View</Button>
                                            <Button variant="secondary" onClick={() => navigate(`/clients/${c.id}/edit`)}>Edit</Button>
                                            <Button onClick={() => setCommandClient(c)}>Actions</Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>

                        {/* Pager */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-500">
                                Showing {offset + 1} – {Math.min(offset + limit, total)} of {total}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    className="border rounded-md p-1 dark:bg-gray-700 dark:border-gray-600"
                                    value={limit}
                                    onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}
                                >
                                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                                </select>
                                <Button variant="secondary" disabled={!canPrev} onClick={prev}>Prev</Button>
                                <Button variant="secondary" disabled={!canNext} onClick={next}>Next</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Command modal */}
            <ClientCommandModal
                open={!!commandClient}
                client={commandClient}
                onClose={() => setCommandClient(null)}
                onDone={() => { setCommandClient(null); load(); }}
            />
        </div>
    );
};

export default Clients;
