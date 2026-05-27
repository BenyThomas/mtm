import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const normalizeCurrencies = (template) => {
    const list = Array.isArray(template) ? template : [];
    return list
        .map((item) => ({
            code: item?.code,
            name: item?.displayLabel ?? item?.name ?? item?.code,
        }))
        .filter((item) => item.code);
};

const CollateralManagementForm = ({ initial, template, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(!template);
    const [currencyOptions, setCurrencyOptions] = useState([]);

    const [name, setName] = useState(initial?.name || '');
    const [currency, setCurrency] = useState(initial?.currency || '');
    const [locale, setLocale] = useState(initial?.locale || 'en');
    const [quality, setQuality] = useState(initial?.quality || '');
    const [unitType, setUnitType] = useState(initial?.unitType || '');
    const [basePrice, setBasePrice] = useState(initial?.basePrice ?? initial?.unitPrice ?? 0);
    const [pctToBase, setPctToBase] = useState(initial?.pctToBase ?? 0);

    const hydrateTemplate = (tpl) => {
        const currencies = normalizeCurrencies(tpl);
        setCurrencyOptions(currencies);
        if (!initial && !currency && currencies.length) {
            setCurrency(currencies[0].code);
        }
    };

    useEffect(() => {
        if (!template) return;
        hydrateTemplate(template);
        setTplLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template]);

    useEffect(() => {
        if (template) return;
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/collateral-management/template');
                if (!cancelled) hydrateTemplate(r?.data || []);
            } catch (e) {
                if (!cancelled) addToast('Failed to load collateral template', 'error');
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [template, addToast]);

    useEffect(() => {
        if (!initial) return;
        setName(initial?.name || '');
        setCurrency(initial?.currency || '');
        setLocale(initial?.locale || 'en');
        setQuality(initial?.quality || '');
        setUnitType(initial?.unitType || '');
        setBasePrice(initial?.basePrice ?? initial?.unitPrice ?? 0);
        setPctToBase(initial?.pctToBase ?? 0);
    }, [initial?.id]);

    const errors = useMemo(() => {
        const next = {};
        if (!name.trim()) next.name = 'Name is required';
        if (!currency) next.currency = 'Currency is required';
        if (!locale.trim()) next.locale = 'Locale is required';
        if (basePrice === '' || Number(basePrice) < 0) next.basePrice = 'Base price must be 0 or greater';
        if (pctToBase === '' || Number(pctToBase) < 0) next.pctToBase = 'Pct to base must be 0 or greater';
        return next;
    }, [name, currency, locale, basePrice, pctToBase]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) return;
        await onSubmit({
            name: name.trim(),
            currency,
            locale: locale.trim(),
            quality: quality.trim() || undefined,
            unitType: unitType.trim() || undefined,
            basePrice: Number(basePrice) || 0,
            pctToBase: Number(pctToBase) || 0,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="10rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Currency *</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select currency...</option>
                                {currencyOptions.map((item) => (
                                    <option key={item.code} value={item.code}>{item.name}</option>
                                ))}
                            </select>
                            {errors.currency && <p className="text-xs text-red-500 mt-1">{errors.currency}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Locale *</label>
                            <input
                                value={locale}
                                onChange={(e) => setLocale(e.target.value)}
                                placeholder="e.g. en"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.locale && <p className="text-xs text-red-500 mt-1">{errors.locale}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Base Price</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.basePrice && <p className="text-xs text-red-500 mt-1">{errors.basePrice}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Pct To Base</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pctToBase}
                                onChange={(e) => setPctToBase(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.pctToBase && <p className="text-xs text-red-500 mt-1">{errors.pctToBase}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Quality</label>
                            <input
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Unit Type</label>
                            <input
                                value={unitType}
                                onChange={(e) => setUnitType(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : (initial ? 'Save Changes' : 'Create Collateral')}
                </Button>
            </div>
        </form>
    );
};

export default CollateralManagementForm;
