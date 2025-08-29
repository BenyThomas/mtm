import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import JournalEntryForm from '../components/JournalEntryForm';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import OfficeSelect from '../components/OfficeSelect';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const JournalEntries = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    // filters
    const [officeId, setOfficeId] = useState('');
    const [glAccountId, setGlAccountId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState(todayISO());
    const [glOptions, setGlOptions] = useState([]);

    // create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    // update running balances
    const [txIdForRecalc, setTxIdForRecalc] = useState('');
    const [recalcBusy, setRecalcBusy] = useState(false);

    const paramsForList = useMemo(() => {
        const p = {};
        if (officeId) p.officeId = officeId;
        if (glAccountId) p.glAccountId = glAccountId;
        if (fromDate) p.fromDate = fromDate;
        if (toDate) p.toDate = toDate;
        p.dateFormat = 'yyyy-MM-dd';
        p.locale = 'en';
        return p;
    }, [officeId, glAccountId, fromDate, toDate]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/journalentries', { params: paramsForList });
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const loadGlOptions = async () => {
        try {
            const res = await api.get('/glaccounts');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setGlOptions(list);
        } catch {
            setGlOptions([]);
        }
    };

    useEffect(() => {
        loadGlOptions();
    }, []);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [officeId, glAccountId, fromDate, toDate]);

    const createEntry = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post('/journalentries', payload);
            addToast('Journal entry posted', 'success');
            setCreateOpen(false);
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Post failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const recalcRunningBalances = async () => {
        if (!txIdForRecalc.trim()) {
            addToast('Enter a transaction ID', 'error');
            return;
        }
        setRecalcBusy(true);
        try {
            await api.post(`/journalentries/${encodeURIComponent(txIdForRecalc.trim())}`);
            addToast('Running balances updated', 'success');
            setTxIdForRecalc('');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setRecalcBusy(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            const res = await api.get('/journalentries/downloadtemplate', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'journalentries_template.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('Template downloaded', 'success');
        } catch {
            addToast('Download failed', 'error');
        }
    };

    const uploadTemplate = async (file) => {
        if (!file) return;
        try {
            const form = new FormData();
            form.append('file', file);
            await api.post('/journalentries/uploadtemplate', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            addToast('Template uploaded', 'success');
            await load();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Upload failed';
            addToast(msg, 'error');
        }
    };

    const openingBalance = async () => {
        try {
            const res = await api.get('/journalentries/openingbalance');
            addToast('Opening balance loaded (see console)', 'success');
            // dev aid
            // eslint-disable-next-line no-console
            console.log('Opening balance:', res.data);
        } catch {
            addToast('Failed to fetch opening balance', 'error');
        }
    };

    const provisioning = async () => {
        try {
            const res = await api.get('/journalentries/provisioning');
            addToast('Provisioning loaded (see console)', 'success');
            // eslint-disable-next-line no-console
            console.log('Provisioning:', res.data);
        } catch {
            addToast('Failed to fetch provisioning', 'error');
        }
    };

    const filteredAccounts = useMemo(() => glOptions, [glOptions]);

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Journal Entries</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => uploadTemplate(e.target.files?.[0])}
                        />
                        Upload Template
                    </label>
                    <Button onClick={() => setCreateOpen(true)}>New Entry</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Office</label>
                        <OfficeSelect includeAll value={officeId} onChange={setOfficeId} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">GL Account</label>
                        <select
                            value={glAccountId}
                            onChange={(e) => setGlAccountId(e.target.value)}
                            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All accounts</option>
                            {filteredAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {(a.glCode || a.code || a.id) + (a.name ? ` — ${a.name}` : '')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            {/* Maintenance tools */}
            <Card>
                <div className="grid md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Transaction ID (update running balances)</label>
                        <input
                            value={txIdForRecalc}
                            onChange={(e) => setTxIdForRecalc(e.target.value)}
                            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g. 0a1b2c3d4e"
                        />
                    </div>
                    <div>
                        <Button onClick={recalcRunningBalances} disabled={recalcBusy}>
                            {recalcBusy ? 'Updating…' : 'Update Balances'}
                        </Button>
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                        <Button variant="secondary" onClick={openingBalance}>Get Opening Balance</Button>
                        <Button variant="secondary" onClick={provisioning}>Get Provisioning</Button>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !items.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No journal entries found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Transaction ID</th>
                                <th className="py-2 pr-4">Entry Date</th>
                                <th className="py-2 pr-4">Account</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((e) => (
                                <tr key={e.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{e.id}</td>
                                    <td className="py-2 pr-4">{e.transactionId || e.transactionID || '-'}</td>
                                    <td className="py-2 pr-4">{toISO(e.entryDate || e.transactionDate || e.createdDate)}</td>
                                    <td className="py-2 pr-4">
                                        {(e.glAccountCode || e.glCode || e.accountCode || e.accountId) + (e.glAccountName ? ` — ${e.glAccountName}` : '')}
                                    </td>
                                    <td className="py-2 pr-4">{e.entryType?.value || e.entryType || e.debitOrCredit || '-'}</td>
                                    <td className="py-2 pr-4">{e.amount}</td>
                                    <td className="py-2 pr-4">{e.officeName || e.officeId || '-'}</td>
                                    <td className="py-2 pr-4">
                                        <Button variant="secondary" onClick={() => navigate(`/accounting/journal-entries/${e.id}`)}>
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create modal */}
            <Modal
                open={createOpen}
                title="New Journal Entry"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <JournalEntryForm onSubmit={createEntry} submitting={createBusy} />
            </Modal>
        </div>
    );
};

export default JournalEntries;
