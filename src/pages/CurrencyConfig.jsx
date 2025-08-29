import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

/**
 * GET /currencies typically returns:
 * {
 *   currencyOptions: [{code,name,decimalPlaces,inMultiplesOf,displaySymbol,nameCode,displayLabel}, ...],
 *   selectedCurrencyOptions: [same shape ...]
 * }
 *
 * PUT /currencies expects: { selectedCurrencyOptions: [{...full objects from currencyOptions...}] }
 */
const CurrencyConfig = () => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(new Set()); // codes
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get('/currencies');
            const all = r?.data?.currencyOptions || r?.data?.currencies || [];
            const chosen = r?.data?.selectedCurrencyOptions || r?.data?.selected || [];
            const normAll = all.map(c => ({
                code: c.code,
                name: c.name || c.displayLabel || c.nameCode || c.code,
                decimalPlaces: c.decimalPlaces ?? 2,
                inMultiplesOf: c.inMultiplesOf ?? 0,
                displaySymbol: c.displaySymbol,
                nameCode: c.nameCode || c.code,
                displayLabel: c.displayLabel || `${c.code} ${c.name || ''}`.trim(),
                raw: c,
            })).filter(x => x.code);
            const chosenCodes = new Set(
                (Array.isArray(chosen) ? chosen : []).map(c => c.code).filter(Boolean)
            );
            normAll.sort((a,b)=>String(a.code).localeCompare(String(b.code)));
            setOptions(normAll);
            setSelected(chosenCodes);
        } catch (e) {
            setOptions([]);
            setSelected(new Set());
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load currencies';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggle = (code) => {
        setSelected(prev => {
            const next = new Set(Array.from(prev));
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    const selectedObjects = useMemo(() => {
        const byCode = new Map(options.map(o => [o.code, o]));
        return Array.from(selected).map(code => {
            const o = byCode.get(code);
            // Payload needs full objects, preserve server-provided fields when possible
            return {
                code: o.code,
                name: o.name,
                decimalPlaces: o.decimalPlaces,
                inMultiplesOf: o.inMultiplesOf,
                displaySymbol: o.displaySymbol,
                nameCode: o.nameCode,
                displayLabel: o.displayLabel,
            };
        });
    }, [options, selected]);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/currencies', { selectedCurrencyOptions: selectedObjects });
            addToast('Currency configuration saved', 'success');
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Save failed';
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
                    <Skeleton height="12rem" />
                ) : !options.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No currencies available.</div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[28rem] overflow-auto pr-1">
                        {options.map(opt => (
                            <label
                                key={opt.code}
                                className={`inline-flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-md border ${
                                    selected.has(opt.code)
                                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(opt.code)}
                                        onChange={() => toggle(opt.code)}
                                    />
                                    <div>
                                        <div className="font-mono font-semibold">{opt.code}</div>
                                        <div className="text-[11px] text-gray-500">
                                            {opt.name} • dp:{opt.decimalPlaces} • mult:{opt.inMultiplesOf}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs">{opt.displaySymbol || ''}</div>
                            </label>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CurrencyConfig;
