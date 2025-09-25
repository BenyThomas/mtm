import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import MiniCombobox from '../../components/MiniCombobox';
import { useToast } from '../../context/ToastContext';
import { search, searchAdvance, getSearchTemplate } from '../../api/search';
import { Search as SearchIcon, RefreshCw, Filter } from 'lucide-react';

const PAGE_SIZE = 50;

const Search = () => {
    const { addToast } = useToast();
    const [q, setQ] = useState('');
    const [resource, setResource] = useState(null); // 'clients' | 'loans' | 'groups'
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    // advanced
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [template, setTemplate] = useState(null);
    const [advancedBody, setAdvancedBody] = useState({}); // pass-through JSON

    const resourceOpts = [
        { id: 'clients', label: 'Clients' },
        { id: 'loans',   label: 'Loans' },
        { id: 'groups',  label: 'Groups' },
    ];

    const load = async () => {
        setLoading(true);
        try {
            const data = await search({ q, resource, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
            setItems(data);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Search failed', 'error');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

    const canNext = useMemo(() => items.length === PAGE_SIZE, [items]);

    const openAdvanced = async () => {
        setAdvancedOpen(true);
        if (!template) {
            try {
                const tpl = await getSearchTemplate();
                setTemplate(tpl);
                // pre-seed body with safe defaults if template hints exist
                setAdvancedBody((prev) => Object.keys(prev).length ? prev : {});
            } catch {
                // ignore; modal will still let you type JSON
            }
        }
    };

    const runAdvanced = async () => {
        setLoading(true);
        setItems([]);
        try {
            const data = await searchAdvance(advancedBody);
            setItems(data);
            setAdvancedOpen(false);
            setPage(1);
            addToast('Advanced search complete', 'success');
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Advanced search failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold inline-flex items-center gap-2">
                    <SearchIcon className="w-5 h-5" /> Search
                </h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
                    <Button onClick={openAdvanced}><Filter className="w-4 h-4 mr-1" /> Advanced</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Query</label>
                        <input
                            className="mt-1 w-full border rounded-md p-2"
                            placeholder="Type a keyword…"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPage(1); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                        />
                    </div>
                    <MiniCombobox
                        label="Resource"
                        value={resource}
                        onChange={setResource}
                        options={resourceOpts}
                        placeholder="Type to filter resource…"
                    />
                    <div className="flex items-end">
                        <Button onClick={() => { setPage(1); load(); }}>Search</Button>
                    </div>
                </div>
            </Card>

            {/* Results */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600">No results.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Display</th>
                                <th className="py-2 pr-4">Entity</th>
                                <th className="py-2 pr-4">Identifier</th>
                                <th className="py-2 pr-4">Extra</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((r, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="py-2 pr-4">{idx + 1 + (page - 1) * PAGE_SIZE}</td>
                                    <td className="py-2 pr-4">{r.entityName || r.displayName || r.name || r.accountNo || '—'}</td>
                                    <td className="py-2 pr-4">{r.entityType || r.resource || r.type || '—'}</td>
                                    <td className="py-2 pr-4">{r.entityId ?? r.id ?? '—'}</td>
                                    <td className="py-2 pr-4">{r.externalId || r.accountNo || r.mobileNo || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* Pager */}
                        <div className="flex items-center justify-between pt-4">
                            <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                Previous
                            </Button>
                            <div className="text-sm">Page {page}</div>
                            <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={!canNext}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Advanced modal */}
            <Modal
                open={advancedOpen}
                onClose={() => setAdvancedOpen(false)}
                title="Advanced Search"
                size="5xl"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAdvancedOpen(false)}>Cancel</Button>
                        <Button onClick={runAdvanced}>Run</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {template ? (
                        <details className="rounded border p-3 bg-gray-50">
                            <summary className="cursor-pointer font-medium">Template (hints)</summary>
                            <pre className="mt-2 text-xs whitespace-pre-wrap">
                {JSON.stringify(template, null, 2)}
              </pre>
                        </details>
                    ) : (
                        <div className="text-sm text-gray-500">Loading template…</div>
                    )}
                    <div>
                        <label className="block text-sm font-medium">Request JSON</label>
                        <textarea
                            className="mt-1 w-full border rounded-md p-2 font-mono text-xs"
                            rows={16}
                            value={JSON.stringify(advancedBody, null, 2)}
                            onChange={(e) => {
                                try {
                                    const obj = JSON.parse(e.target.value);
                                    setAdvancedBody(obj);
                                } catch {
                                    // ignore until valid JSON
                                }
                            }}
                            placeholder={`{\n  "searchOn": "clients",\n  "criteria": [ ... ]\n}`}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Search;
