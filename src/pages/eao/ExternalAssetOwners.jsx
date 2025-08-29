import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

const fmt = (v) => (v === 0 ? '0' : (v ? String(v) : '—'));

const TransferCreateForm = ({ mode, onSubmit, submitting }) => {
    // mode: 'loanId' | 'loanExternalId'
    const [loanId, setLoanId] = useState('');
    const [loanExternalId, setLoanExternalId] = useState('');
    const [ownerExternalId, setOwnerExternalId] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [settlementDate, setSettlementDate] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [comments, setComments] = useState('');
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (mode === 'loanId' && !loanId) e.loanId = 'Loan ID is required';
        if (mode === 'loanExternalId' && !loanExternalId.trim()) e.loanExternalId = 'Loan External ID is required';
        if (!ownerExternalId.trim()) e.ownerExternalId = 'Owner External ID is required';
        if (!effectiveDate) e.effectiveDate = 'Effective date is required';
        if (!settlementDate) e.settlementDate = 'Settlement date is required';
        if (!purchasePrice) e.purchasePrice = 'Purchase price is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        const base = {
            ownerExternalId: ownerExternalId.trim(),
            effectiveDate,
            settlementDate,
            purchasePrice: Number(purchasePrice),
            ...(comments.trim() ? { comments: comments.trim() } : {}),
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        };
        await onSubmit({
            mode,
            payload: base,
            loanId: mode === 'loanId' ? Number(loanId) : undefined,
            loanExternalId: mode === 'loanExternalId' ? loanExternalId.trim() : undefined,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {mode === 'loanId' ? (
                <div>
                    <label className="block text-sm font-medium">Loan ID *</label>
                    <input
                        type="number"
                        min="1"
                        value={loanId}
                        onChange={(e) => setLoanId(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.loanId && <p className="text-xs text-red-500 mt-1">{errors.loanId}</p>}
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium">Loan External ID *</label>
                    <input
                        value={loanExternalId}
                        onChange={(e) => setLoanExternalId(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.loanExternalId && <p className="text-xs text-red-500 mt-1">{errors.loanExternalId}</p>}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium">Owner External ID *</label>
                <input
                    value={ownerExternalId}
                    onChange={(e) => setOwnerExternalId(e.target.value)}
                    placeholder="e.g. OWNER-ABC-001"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.ownerExternalId && <p className="text-xs text-red-500 mt-1">{errors.ownerExternalId}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Effective Date *</label>
                    <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Settlement Date *</label>
                    <input
                        type="date"
                        value={settlementDate}
                        onChange={(e) => setSettlementDate(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    {errors.settlementDate && <p className="text-xs text-red-500 mt-1">{errors.settlementDate}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium">Purchase Price *</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="e.g. 1000.00"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium">Comments</label>
                <input
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Create Transfer'}
                </Button>
            </div>
        </form>
    );
};

const ExternalAssetOwners = () => {
    const { addToast } = useToast();

    // Tab state
    const [tab, setTab] = useState('transfers'); // transfers | search | ownerJournals

    // Transfers list
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [viewTransfer, setViewTransfer] = useState(null);
    const [transferJournals, setTransferJournals] = useState([]);
    const [journalsBusy, setJournalsBusy] = useState(false);

    // Create transfer
    const [createOpen, setCreateOpen] = useState(false);
    const [createMode, setCreateMode] = useState('loanId'); // loanId | loanExternalId
    const [createBusy, setCreateBusy] = useState(false);

    // Active transfer
    const [activeLoading, setActiveLoading] = useState(false);
    const [active, setActive] = useState(null);

    // Search transfers
    const [searchBusy, setSearchBusy] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [effectiveTo, setEffectiveTo] = useState('');
    const [settlementFrom, setSettlementFrom] = useState('');
    const [settlementTo, setSettlementTo] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Owner journals
    const [ownerExtId, setOwnerExtId] = useState('');
    const [ownerBusy, setOwnerBusy] = useState(false);
    const [ownerJournals, setOwnerJournals] = useState([]);

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const r = await api.get('/external-asset-owners/transfers');
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(t => ({
                id: t.id,
                externalId: t.externalId,
                loanId: t.loanId,
                loanExternalId: t.loanExternalId,
                ownerExternalId: t.ownerExternalId,
                status: t.status || t.state,
                effectiveDate: t.effectiveDate,
                settlementDate: t.settlementDate,
                purchasePrice: t.purchasePrice,
            }));
            norm.sort((a,b) => String(b.id).localeCompare(String(a.id)));
            setItems(norm);
        } catch (e) {
            setItems([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load transfers';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTransfers(); /* eslint-disable-next-line */ }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter(x => {
            const hay = [x.id, x.externalId, x.loanId, x.loanExternalId, x.ownerExternalId, x.status].map(v => String(v ?? '').toLowerCase());
            return hay.some(h => h.includes(t));
        });
    }, [items, q]);

    const fetchTransferJournals = async (transferId) => {
        setJournalsBusy(true);
        try {
            const r = await api.get(`/external-asset-owners/transfers/${transferId}/journal-entries`);
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            setTransferJournals(list);
        } catch (e) {
            setTransferJournals([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load journal entries';
            addToast(msg, 'error');
        } finally {
            setJournalsBusy(false);
        }
    };

    const createTransfer = async ({ mode, payload, loanId, loanExternalId }) => {
        setCreateBusy(true);
        try {
            if (mode === 'loanId' && loanId) {
                await api.post(`/external-asset-owners/transfers/loans/${loanId}`, payload);
            } else if (mode === 'loanExternalId' && loanExternalId) {
                await api.post(`/external-asset-owners/transfers/loans/external-id/${encodeURIComponent(loanExternalId)}`, payload);
            }
            addToast('Transfer created', 'success');
            setCreateOpen(false);
            await loadTransfers();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const loadActive = async () => {
        setActiveLoading(true);
        try {
            const r = await api.get('/external-asset-owners/transfers/active-transfer');
            setActive(r?.data || null);
        } catch (e) {
            setActive(null);
            // not all tenants return active transfer; avoid noisy toast
        } finally {
            setActiveLoading(false);
        }
    };

    const doSearch = async () => {
        setSearchBusy(true);
        try {
            const payload = {
                ...(searchText.trim() ? { text: searchText.trim() } : {}),
                ...(effectiveFrom ? { effectiveFrom } : {}),
                ...(effectiveTo ? { effectiveTo } : {}),
                ...(settlementFrom ? { settlementFrom } : {}),
                ...(settlementTo ? { settlementTo } : {}),
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            };
            const r = await api.post('/external-asset-owners/search', payload);
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            setSearchResults(list);
        } catch (e) {
            setSearchResults([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Search failed';
            addToast(msg, 'error');
        } finally {
            setSearchBusy(false);
        }
    };

    const fetchOwnerJournals = async () => {
        if (!ownerExtId.trim()) {
            addToast('Please enter Owner External ID', 'error');
            return;
        }
        setOwnerBusy(true);
        try {
            const r = await api.get(`/external-asset-owners/owners/external-id/${encodeURIComponent(ownerExtId.trim())}/journal-entries`);
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            setOwnerJournals(list);
        } catch (e) {
            setOwnerJournals([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Fetch failed';
            addToast(msg, 'error');
        } finally {
            setOwnerBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">External Asset Owners</h1>
                <div className="space-x-2">
                    {tab === 'transfers' && (
                        <>
                            <Button onClick={() => setCreateOpen(true)}>New Transfer</Button>
                            <Button variant="secondary" onClick={loadTransfers}>Refresh</Button>
                            <Button variant="secondary" onClick={loadActive}>Active Transfer</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['transfers','search','ownerJournals'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded-md text-sm ${tab===t ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                        {t === 'transfers' ? 'Transfers' : t === 'search' ? 'Search' : 'Owner Journals'}
                    </button>
                ))}
            </div>

            {/* Transfers */}
            {tab === 'transfers' && (
                <>
                    {activeLoading ? (
                        <Card><Skeleton height="4rem" /></Card>
                    ) : active ? (
                        <Card>
                            <div className="text-sm text-gray-500 mb-1">Active Transfer</div>
                            <div className="text-sm">
                                ID: <span className="font-mono">{fmt(active.id)}</span> •
                                {' '}Loan: <span className="font-mono">{fmt(active.loanId || active.loanExternalId)}</span> •
                                {' '}Owner: <span className="font-mono">{fmt(active.ownerExternalId)}</span> •
                                {' '}Status: <strong>{fmt(active.status || active.state)}</strong>
                            </div>
                        </Card>
                    ) : null}

                    <Card>
                        {loading ? (
                            <Skeleton height="12rem" />
                        ) : (
                            <>
                                <div className="grid md:grid-cols-3 gap-3 mb-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium">Search</label>
                                        <input
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="ID, loan, owner, status…"
                                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                        <tr className="text-left text-sm text-gray-500">
                                            <th className="py-2 pr-4">#</th>
                                            <th className="py-2 pr-4">Loan</th>
                                            <th className="py-2 pr-4">Owner</th>
                                            <th className="py-2 pr-4">Status</th>
                                            <th className="py-2 pr-4">Effective</th>
                                            <th className="py-2 pr-4">Settlement</th>
                                            <th className="py-2 pr-4">Price</th>
                                            <th className="py-2 pr-4"></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filtered.map(t => (
                                            <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                                <td className="py-2 pr-4">{t.id}</td>
                                                <td className="py-2 pr-4">{t.loanId || t.loanExternalId || '—'}</td>
                                                <td className="py-2 pr-4">{t.ownerExternalId || '—'}</td>
                                                <td className="py-2 pr-4">{t.status || '—'}</td>
                                                <td className="py-2 pr-4">{t.effectiveDate || '—'}</td>
                                                <td className="py-2 pr-4">{t.settlementDate || '—'}</td>
                                                <td className="py-2 pr-4">{t.purchasePrice != null ? t.purchasePrice : '—'}</td>
                                                <td className="py-2 pr-4 space-x-2">
                                                    <Button variant="secondary" onClick={() => { setViewTransfer(t); fetchTransferJournals(t.id); }}>Journals</Button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card>

                    <Modal
                        open={!!viewTransfer}
                        title={viewTransfer ? `Transfer #${viewTransfer.id} — Journal Entries` : 'Journal Entries'}
                        onClose={() => { setViewTransfer(null); setTransferJournals([]); }}
                        footer={null}
                    >
                        {journalsBusy ? (
                            <Skeleton height="8rem" />
                        ) : !transferJournals.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No journal entries.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="text-left text-sm text-gray-500">
                                        <th className="py-2 pr-4">Date</th>
                                        <th className="py-2 pr-4">Txn</th>
                                        <th className="py-2 pr-4">Debit</th>
                                        <th className="py-2 pr-4">Credit</th>
                                        <th className="py-2 pr-4">Narration</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {transferJournals.map((j, i) => (
                                        <tr key={j.id || i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                            <td className="py-2 pr-4">{fmt(j.transactionDate || j.entryDate)}</td>
                                            <td className="py-2 pr-4">{fmt(j.transactionId)}</td>
                                            <td className="py-2 pr-4">{fmt(j.debitAmount)}</td>
                                            <td className="py-2 pr-4">{fmt(j.creditAmount)}</td>
                                            <td className="py-2 pr-4">{fmt(j.narration || j.comments)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Modal>

                    <Modal
                        open={createOpen}
                        title="New Transfer"
                        onClose={() => setCreateOpen(false)}
                        footer={null}
                    >
                        <div className="mb-3">
                            <label className="block text-sm font-medium">Mode</label>
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => setCreateMode('loanId')}
                                    className={`px-3 py-1 rounded-md text-sm ${createMode==='loanId' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
                                >
                                    By Loan ID
                                </button>
                                <button
                                    onClick={() => setCreateMode('loanExternalId')}
                                    className={`px-3 py-1 rounded-md text-sm ${createMode==='loanExternalId' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
                                >
                                    By Loan External ID
                                </button>
                            </div>
                        </div>
                        <TransferCreateForm mode={createMode} onSubmit={createTransfer} submitting={createBusy} />
                    </Modal>
                </>
            )}

            {/* Search */}
            {tab === 'search' && (
                <Card>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium">Text</label>
                            <input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Transfer ID, loan ID, owner external ID…"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Effective From</label>
                            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                                   className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Effective To</label>
                            <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)}
                                   className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Settlement From</label>
                            <input type="date" value={settlementFrom} onChange={(e) => setSettlementFrom(e.target.value)}
                                   className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Settlement To</label>
                            <input type="date" value={settlementTo} onChange={(e) => setSettlementTo(e.target.value)}
                                   className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div className="md:col-span-3 flex items-center justify-end gap-2">
                            <Button variant="secondary" onClick={() => { setSearchText(''); setEffectiveFrom(''); setEffectiveTo(''); setSettlementFrom(''); setSettlementTo(''); setSearchResults([]); }}>Clear</Button>
                            <Button onClick={doSearch} disabled={searchBusy}>{searchBusy ? 'Searching…' : 'Search'}</Button>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        {!searchResults.length ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No results.</div>
                        ) : (
                            <table className="min-w-full">
                                <thead>
                                <tr className="text-left text-sm text-gray-500">
                                    <th className="py-2 pr-4">#</th>
                                    <th className="py-2 pr-4">Loan</th>
                                    <th className="py-2 pr-4">Owner</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Effective</th>
                                    <th className="py-2 pr-4">Settlement</th>
                                    <th className="py-2 pr-4">Price</th>
                                </tr>
                                </thead>
                                <tbody>
                                {searchResults.map((t, i) => (
                                    <tr key={t.id || i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{fmt(t.id)}</td>
                                        <td className="py-2 pr-4">{fmt(t.loanId || t.loanExternalId)}</td>
                                        <td className="py-2 pr-4">{fmt(t.ownerExternalId)}</td>
                                        <td className="py-2 pr-4">{fmt(t.status || t.state)}</td>
                                        <td className="py-2 pr-4">{fmt(t.effectiveDate)}</td>
                                        <td className="py-2 pr-4">{fmt(t.settlementDate)}</td>
                                        <td className="py-2 pr-4">{fmt(t.purchasePrice)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            )}

            {/* Owner Journals */}
            {tab === 'ownerJournals' && (
                <Card>
                    <div className="grid md:grid-cols-3 gap-4 mb-3">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Owner External ID</label>
                            <input
                                value={ownerExtId}
                                onChange={(e) => setOwnerExtId(e.target.value)}
                                placeholder="e.g. OWNER-ABC-001"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchOwnerJournals} disabled={ownerBusy}>{ownerBusy ? 'Loading…' : 'Fetch'}</Button>
                        </div>
                    </div>

                    {!ownerJournals.length ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400">No journal entries.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                <tr className="text-left text-sm text-gray-500">
                                    <th className="py-2 pr-4">Date</th>
                                    <th className="py-2 pr-4">Txn</th>
                                    <th className="py-2 pr-4">Debit</th>
                                    <th className="py-2 pr-4">Credit</th>
                                    <th className="py-2 pr-4">Narration</th>
                                </tr>
                                </thead>
                                <tbody>
                                {ownerJournals.map((j, i) => (
                                    <tr key={j.id || i} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                        <td className="py-2 pr-4">{fmt(j.transactionDate || j.entryDate)}</td>
                                        <td className="py-2 pr-4">{fmt(j.transactionId)}</td>
                                        <td className="py-2 pr-4">{fmt(j.debitAmount)}</td>
                                        <td className="py-2 pr-4">{fmt(j.creditAmount)}</td>
                                        <td className="py-2 pr-4">{fmt(j.narration || j.comments)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ExternalAssetOwners;
