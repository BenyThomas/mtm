import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};

const safeList = (arr) => (Array.isArray(arr) ? arr : []);
const optLabel = (o) => o?.name ?? o?.value ?? o?.code ?? o?.id ?? '';
const optValue = (o) => o?.id ?? o?.value ?? o?.code ?? '';

const PAGE_SIZE = 25;

const Audits = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    // template options
    const [loadingTpl, setLoadingTpl] = useState(true);
    const [actionOpts, setActionOpts] = useState([]);
    const [entityOpts, setEntityOpts] = useState([]);
    const [officeOpts, setOfficeOpts] = useState([]);
    const [userOpts, setUserOpts] = useState([]);
    const [resultOpts, setResultOpts] = useState([]);

    // filters
    const [actionName, setActionName] = useState('');
    const [entityName, setEntityName] = useState('');
    const [officeId, setOfficeId] = useState('');
    const [makerId, setMakerId] = useState('');
    const [processingResult, setProcessingResult] = useState('');
    const [resourceId, setResourceId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState(todayISO());
    const [q, setQ] = useState(''); // client-side search across returned rows

    // list
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [totalFilteredRecords, setTotalFilteredRecords] = useState(0);
    const [offset, setOffset] = useState(0);

    const params = useMemo(() => {
        const p = {};
        if (actionName) p.actionName = actionName;
        if (entityName) p.entityName = entityName;
        if (officeId) p.officeId = officeId;
        if (makerId) p.makerId = makerId;
        if (processingResult) p.processingResult = processingResult;
        if (resourceId) p.resourceId = resourceId;
        if (fromDate) p.makerDateTimeFrom = fromDate;
        if (toDate) p.makerDateTimeTo = toDate;
        p.dateFormat = 'yyyy-MM-dd';
        p.locale = 'en';
        p.offset = offset;
        p.limit = PAGE_SIZE;
        return p;
    }, [actionName, entityName, officeId, makerId, processingResult, resourceId, fromDate, toDate, offset]);

    const loadTemplate = async () => {
        setLoadingTpl(true);
        try {
            const res = await api.get('/audits/searchtemplate');
            const d = res?.data || {};
            setActionOpts(safeList(d?.actionNames));
            setEntityOpts(safeList(d?.entityNames));
            setOfficeOpts(safeList(d?.officeOptions || d?.offices));
            setUserOpts(safeList(d?.userOptions || d?.users));
            setResultOpts(safeList(d?.processingResultOptions || d?.resultOptions));
        } catch {
            // fallbacks will be empty dropdowns
        } finally {
            setLoadingTpl(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/audits', { params });
            // Fineract may return a page wrapper, or a flat array
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            const total = res.data?.totalFilteredRecords ?? list.length;
            setItems(list);
            setTotalFilteredRecords(total);
        } catch (err) {
            setItems([]);
            setTotalFilteredRecords(0);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load audits';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTemplate(); }, []);
    useEffect(() => { setOffset(0); }, [actionName, entityName, officeId, makerId, processingResult, resourceId, fromDate, toDate]);
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [params]);

    const filteredClientSide = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return items;
        return items.filter((a) => {
            const hay = [
                a.actionName, a.entityName, a.resourceId, a.madeOnDate, a.maker, a.officeName, a.processingResult,
                a.commandAsJson, a.changes, a.id,
            ].map((x) => String(x ?? '').toLowerCase());
            return hay.some((h) => h.includes(term));
        });
    }, [items, q]);

    const pageFrom = offset + 1;
    const pageTo = Math.min(offset + PAGE_SIZE, totalFilteredRecords);
    const canPrev = offset > 0;
    const canNext = offset + PAGE_SIZE < totalFilteredRecords;

    const toneForResult = (r) => {
        const v = String(r || '').toLowerCase();
        if (v.includes('success') || v.includes('approved') || v === 'true') return 'green';
        if (v.includes('reject') || v.includes('failed') || v === 'false') return 'red';
        return 'gray';
    };

    return (
        <div className="space-y-6">
            {/* Title & actions */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Audit Log</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { setActionName(''); setEntityName(''); setOfficeId(''); setMakerId(''); setProcessingResult(''); setResourceId(''); setFromDate(''); setToDate(todayISO()); setQ(''); }}>
                        Clear Filters
                    </Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                {loadingTpl ? (
                    <Skeleton height="6rem" />
                ) : (
                    <div className="grid lg:grid-cols-6 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Action</label>
                            <select
                                value={actionName}
                                onChange={(e) => setActionName(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {actionOpts.map((o, i) => (
                                    <option key={i} value={optValue(o)}>{optLabel(o)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Entity</label>
                            <select
                                value={entityName}
                                onChange={(e) => setEntityName(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {entityOpts.map((o, i) => (
                                    <option key={i} value={optValue(o)}>{optLabel(o)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Office</label>
                            <select
                                value={officeId}
                                onChange={(e) => setOfficeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {officeOpts.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Maker (User)</label>
                            <select
                                value={makerId}
                                onChange={(e) => setMakerId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {userOpts.map((u) => (
                                    <option key={u.id} value={u.id}>{u.displayName || u.username || u.id}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Result</label>
                            <select
                                value={processingResult}
                                onChange={(e) => setProcessingResult(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">All</option>
                                {resultOpts.map((o, i) => (
                                    <option key={i} value={optValue(o)}>{optLabel(o)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Resource ID</label>
                            <input
                                value={resourceId}
                                onChange={(e) => setResourceId(e.target.value)}
                                placeholder="e.g. 1023"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">From</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">To</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div className="lg:col-span-2 md:col-span-3">
                            <label className="block text-sm font-medium">Quick search</label>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Find in results…"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filteredClientSide.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No audits found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">When</th>
                                <th className="py-2 pr-4">User</th>
                                <th className="py-2 pr-4">Action</th>
                                <th className="py-2 pr-4">Entity</th>
                                <th className="py-2 pr-4">Resource</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Result</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredClientSide.map((a) => (
                                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{a.id}</td>
                                    <td className="py-2 pr-4">{toISO(a.madeOnDate || a.makerDateTime || a.createdDate)}</td>
                                    <td className="py-2 pr-4">{a.maker || a.makerName || a.makerId || '-'}</td>
                                    <td className="py-2 pr-4">{a.actionName}</td>
                                    <td className="py-2 pr-4">{a.entityName}</td>
                                    <td className="py-2 pr-4">{a.resourceId ?? '-'}</td>
                                    <td className="py-2 pr-4">{a.officeName || a.officeId || '-'}</td>
                                    <td className="py-2 pr-4">
                                        <Badge tone={toneForResult(a.processingResult)}>{String(a.processingResult ?? '-')}</Badge>
                                    </td>
                                    <td className="py-2 pr-4">
                                        <Button variant="secondary" onClick={() => navigate(`/audits/${a.id}`)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pager */}
                <div className="mt-4 flex items-center justify-between text-sm">
                    <div>
                        Showing <span className="font-medium">{pageFrom}</span>–<span className="font-medium">{pageTo}</span> of{' '}
                        <span className="font-medium">{totalFilteredRecords}</span>
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                            disabled={!canPrev}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setOffset(offset + PAGE_SIZE)}
                            disabled={!canNext}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Audits;
