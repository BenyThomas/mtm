import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

const TaxGroupList = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [q, setQ] = useState('');

    // For mapping component IDs → names (nice display)
    const [componentMap, setComponentMap] = useState({}); // {id: name}
    const fmtDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 01 Sep 2025
    };


    const load = async () => {
        setLoading(true);
        try {
            const [gr, tpl] = await Promise.all([
                api.get('/taxes/group'),
                api.get('/taxes/group/template').catch(() => ({ data: {} })),
            ]);

            const list = Array.isArray(gr?.data) ? gr.data : [];
            setGroups(list);

            // Try to get tax component options from template (preferred)
            const opts =
                tpl?.data?.taxComponentOptions ||
                tpl?.data?.taxComponents ||
                [];

            let map = {};
            if (Array.isArray(opts) && opts.length) {
                map = opts.reduce((acc, c) => {
                    const id = c?.id ?? c?.taxComponentId;
                    const name = c?.name || c?.value || `#${id}`;
                    if (id) acc[id] = name;
                    return acc;
                }, {});
            } else {
                // Fallback: try /taxes/components if template lacked options
                try {
                    const comp = await api.get('/taxes/components');
                    const arr = Array.isArray(comp?.data) ? comp.data : [];
                    map = arr.reduce((acc, c) => {
                        const id = c?.id;
                        const name = c?.name || `#${id}`;
                        if (id) acc[id] = name;
                        return acc;
                    }, {});
                } catch {
                    // ignore; will show ids
                }
            }
            setComponentMap(map);
        } catch (e) {
            addToast('Failed to load tax groups', 'error');
            setGroups([]);
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
        if (!s) return groups;

        const groupMatches = (g) =>
            (g?.name || '').toLowerCase().includes(s) ||
            String(g?.id || '').includes(s);

        const associations = (g) =>
            Array.isArray(g?.taxAssociations) ? g.taxAssociations : [];

        const assocMatches = (g) =>
            associations(g).some(a =>
                (a?.taxComponent?.name || '').toLowerCase().includes(s) ||
                String(a?.taxComponent?.id || '').includes(s)
            );

        return groups.filter((g) => groupMatches(g) || assocMatches(g));
    }, [groups, q]);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">Tax Groups</h1>
                <div className="flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name or #id"
                        className="border rounded-md p-2 text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Link to="/accounting/tax-components">
                        <Button variant="secondary">Components</Button>
                    </Link>
                    <Link to="/accounting/tax-groups/new">
                        <Button>New Tax Group</Button>
                    </Link>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No tax groups found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Components</th>
                                <th className="py-2 pr-4 w-32"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((g) => {
                                // Prefer taxAssociations (new shape), fallback to taxComponents (old shape)
                                const associations = Array.isArray(g?.taxAssociations) ? g.taxAssociations : null;

                                let labels = [];
                                if (associations) {
                                    labels = associations.map((a) => {
                                        const id = a?.taxComponent?.id;
                                        const name = a?.taxComponent?.name || (id ? `#${id}` : '—');
                                        const sd = fmtDate(a?.startDate);
                                        return sd ? `${name} (from ${sd})` : name;
                                    });
                                } else {
                                    // old shape fallback
                                    const comps = Array.isArray(g?.taxComponents) ? g.taxComponents : [];
                                    labels = comps.map((c) => {
                                        const id = c?.taxComponentId ?? c?.id;
                                        // if you still keep componentMap around, use it; otherwise just show #id
                                        return componentMap[id] || `#${id}`;
                                    });
                                }

                                return (
                                    <tr key={g.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{g.id}</td>
                                        <td className="py-2 pr-4">{g.name || '-'}</td>
                                        <td className="py-2 pr-4">
                                            {labels.length ? labels.join(', ') : '—'}
                                        </td>
                                        <td className="py-2 pr-4">
                                            <Link to={`/accounting/tax-groups/${g.id}/edit`}>
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

export default TaxGroupList;
