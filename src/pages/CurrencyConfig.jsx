import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

/** Normalize any option into a currency code string. */
const toCode = (x) => {
    if (!x) return null;
    if (typeof x === 'string') return x.trim();
    if (typeof x === 'object') {
        return x.code || x.currencyCode || x.nameCode || x.value || null;
    }
    return null;
};

/** Unique array of truthy strings. */
const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const CurrencyConfig = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);

    // The master list of currency codes the tenant can use.
    const [allOptions, setAllOptions] = useState([]); // array<string code>

    // Selected currency codes.
    const [selected, setSelected] = useState(new Set()); // Set<string>

    // For dual-list selections
    const [availableChecked, setAvailableChecked] = useState(new Set());
    const [selectedChecked, setSelectedChecked] = useState(new Set());

    // Filters
    const [filterAvail, setFilterAvail] = useState('');
    const [filterSelected, setFilterSelected] = useState('');

    const [saving, setSaving] = useState(false);

    // Load and normalize
    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/currencies');

            // Options (could be strings or objects)
            const rawOptions =
                r?.data?.currencyOptions ??
                r?.data?.currenciesOptions ?? // guard alternative
                r?.data?.currencies ?? // some tenants expose this as all options
                [];
            const optionCodes = uniq(rawOptions.map(toCode));

            // Selected (various possible keys)
            const rawSelected =
                r?.data?.currencies ?? // as per your current API
                r?.data?.selected ??
                r?.data?.selectedCurrencyOptions ??
                [];
            const selectedCodes = Array.isArray(rawSelected)
                ? uniq(rawSelected.map(toCode))
                : [];

            // Ensure any selected code is present in the options list (defensive)
            const mergedOptions = uniq([...optionCodes, ...selectedCodes]).sort();

            setAllOptions(mergedOptions);
            setSelected(new Set(selectedCodes));
            setAvailableChecked(new Set());
            setSelectedChecked(new Set());
        } catch (e) {
            setAllOptions([]);
            setSelected(new Set());
            const msg =
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Failed to load currencies';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Derived lists
    const available = useMemo(() => {
        const setSel = selected;
        const list = allOptions.filter((c) => !setSel.has(c));
        const t = filterAvail.trim().toLowerCase();
        return t ? list.filter((c) => c.toLowerCase().includes(t)) : list;
    }, [allOptions, selected, filterAvail]);

    const selectedList = useMemo(() => {
        const list = Array.from(selected).sort();
        const t = filterSelected.trim().toLowerCase();
        return t ? list.filter((c) => c.toLowerCase().includes(t)) : list;
    }, [selected, filterSelected]);

    // Toggle checks
    const toggleAvailCheck = (code) => {
        setAvailableChecked((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };
    const toggleSelectedCheck = (code) => {
        setSelectedChecked((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    // Move actions
    const addChecked = () => {
        if (!availableChecked.size) return;
        setSelected((prev) => {
            const next = new Set(prev);
            availableChecked.forEach((c) => next.add(c));
            return next;
        });
        setAvailableChecked(new Set());
    };

    const removeChecked = () => {
        if (!selectedChecked.size) return;
        setSelected((prev) => {
            const next = new Set(prev);
            selectedChecked.forEach((c) => next.delete(c));
            return next;
        });
        setSelectedChecked(new Set());
    };

    const selectAllVisibleAvail = () => {
        setAvailableChecked(new Set(available));
    };
    const clearAvailSelection = () => setAvailableChecked(new Set());

    const selectAllVisibleSelected = () => {
        setSelectedChecked(new Set(selectedList));
    };
    const clearSelectedSelection = () => setSelectedChecked(new Set());

    // Save
    const save = async () => {
        setSaving(true);
        try {
            const payload = { currencies: Array.from(selected).sort() };
            await api.put('/currencies', payload);
            addToast('Currency configuration saved', 'success');
            await load();
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Save failed';
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Currencies</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={save} disabled={saving || loading}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="16rem" />
                ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Available */}
                        <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="font-semibold">Available ({available.length})</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={filterAvail}
                                        onChange={(e) => setFilterAvail(e.target.value)}
                                        placeholder="Filter…"
                                        className="border rounded-md p-2 text-sm w-40 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <Button variant="secondary" onClick={selectAllVisibleAvail}>Select Visible</Button>
                                    <Button variant="secondary" onClick={clearAvailSelection}>Clear</Button>
                                </div>
                            </div>
                            <div className="border rounded-md max-h-[22rem] overflow-auto dark:border-gray-700">
                                {!available.length ? (
                                    <div className="p-3 text-sm text-gray-600 dark:text-gray-400">No available currencies.</div>
                                ) : (
                                    <ul className="divide-y dark:divide-gray-700">
                                        {available.map((code) => (
                                            <li key={code} className="flex items-center justify-between px-3 py-2">
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={availableChecked.has(code)}
                                                        onChange={() => toggleAvailCheck(code)}
                                                    />
                                                    <span className="font-mono">{code}</span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="mt-3">
                                <Button onClick={addChecked} disabled={!availableChecked.size}>Add →</Button>
                            </div>
                        </div>

                        {/* Selected */}
                        <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="font-semibold">Selected ({selectedList.length})</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={filterSelected}
                                        onChange={(e) => setFilterSelected(e.target.value)}
                                        placeholder="Filter…"
                                        className="border rounded-md p-2 text-sm w-40 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <Button variant="secondary" onClick={selectAllVisibleSelected}>Select Visible</Button>
                                    <Button variant="secondary" onClick={clearSelectedSelection}>Clear</Button>
                                </div>
                            </div>
                            <div className="border rounded-md max-h-[22rem] overflow-auto dark:border-gray-700">
                                {!selectedList.length ? (
                                    <div className="p-3 text-sm text-gray-600 dark:text-gray-400">No selected currencies.</div>
                                ) : (
                                    <ul className="divide-y dark:divide-gray-700">
                                        {selectedList.map((code) => (
                                            <li key={code} className="flex items-center justify-between px-3 py-2">
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChecked.has(code)}
                                                        onChange={() => toggleSelectedCheck(code)}
                                                    />
                                                    <span className="font-mono">{code}</span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="mt-3">
                                <Button variant="danger" onClick={removeChecked} disabled={!selectedChecked.size}>← Remove</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CurrencyConfig;
