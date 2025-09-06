import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - clientId
 * - initial (optional)
 * - template (optional) pre-fetched /clients/{clientId}/collaterals/template
 * - onSubmit(payload)
 * - submitting
 */
const ClientCollateralForm = ({ clientId, initial, template, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(!template);
    const [typeOptions, setTypeOptions] = useState([]);
    const [qualityOptions, setQualityOptions] = useState([]);
    const [unitTypeOptions, setUnitTypeOptions] = useState([]);

    const [typeId, setTypeId] = useState(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
    const [name, setName] = useState(initial?.name || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? initial?.value ?? '');
    const [quality, setQuality] = useState(initial?.quality || '');
    const [unitTypeId, setUnitTypeId] = useState(initial?.unitTypeId || '');

    const hydrateFromTemplate = (tpl) => {
        const d = tpl || {};
        const types = d.allowedCollateralTypes || d.collateralTypeOptions || d.collateralTypes || [];
        const qualities = d.qualityOptions || d.qualities || [];
        const unitTypes = d.unitTypeOptions || d.units || [];

        const normTypes = Array.isArray(types) ? types.map(o => ({
            id: o?.id ?? o?.value ?? o?.key, name: o?.name ?? o?.text ?? o?.label ?? `Type #${o?.id ?? ''}`
        })).filter(x => x.id != null) : [];

        const normQual = Array.isArray(qualities) ? qualities.map(o => ({
            id: o?.id ?? o?.value ?? o?.key ?? o, name: o?.name ?? o?.text ?? o?.label ?? String(o)
        })) : [];

        const normUnits = Array.isArray(unitTypes) ? unitTypes.map(o => ({
            id: o?.id ?? o?.value ?? o?.key ?? o, name: o?.name ?? o?.text ?? o?.label ?? String(o)
        })) : [];

        setTypeOptions(normTypes);
        setQualityOptions(normQual);
        setUnitTypeOptions(normUnits);
        if (!initial && !typeId && normTypes.length) setTypeId(normTypes[0].id);
    };

    // Use passed template if provided
    useEffect(() => {
        if (template) {
            hydrateFromTemplate(template);
            setTplLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template]);

    // Fallback: fetch ourselves
    useEffect(() => {
        if (template) return;
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/clients/${clientId}/collaterals/template`);
                if (!cancelled) hydrateFromTemplate(r?.data || {});
            } catch (e) {
                if (!cancelled) addToast('Failed to load client collateral template', 'error');
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [clientId, template, addToast]);

    useEffect(() => {
        if (!initial) return;
        setTypeId(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
        setName(initial?.name || '');
        setDescription(initial?.description || '');
        setQuantity(initial?.quantity ?? 1);
        setUnitPrice(initial?.unitPrice ?? initial?.value ?? '');
        setQuality(initial?.quality || '');
        setUnitTypeId(initial?.unitTypeId || '');
    }, [initial?.id]); // eslint-disable-line

    const errors = useMemo(() => {
        const e = {};
        if (!typeId) e.typeId = 'Type is required';
        if (!quantity || Number(quantity) <= 0) e.quantity = 'Quantity must be > 0';
        if (!unitPrice || Number(unitPrice) <= 0) e.unitPrice = 'Unit price must be > 0';
        return e;
    }, [typeId, quantity, unitPrice]);

    const total = useMemo(() => {
        const q = Number(quantity) || 0;
        const p = Number(unitPrice) || 0;
        return (q * p).toFixed(2);
    }, [quantity, unitPrice]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) return;

        const payload = {
            typeId: Number(typeId),
            collateralTypeId: Number(typeId),
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            total: Number(total),
            value: Number(total),
            ...(name ? { name: name.trim() } : {}),
            ...(description ? { description: description.trim() } : {}),
            ...(quality ? { quality } : {}),
            ...(unitTypeId ? { unitTypeId: Number(unitTypeId) } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="10rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Collateral Type *</label>
                            <select
                                value={typeId}
                                onChange={(e) => setTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select type…</option>
                                {typeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.typeId && <p className="text-xs text-red-500 mt-1">{errors.typeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name/identifier for this collateral"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Quantity *</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Unit Price *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.unitPrice && <p className="text-xs text-red-500 mt-1">{errors.unitPrice}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Total</label>
                            <input
                                value={total}
                                readOnly
                                className="mt-1 w-full border rounded-md p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Quality</label>
                            <select
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {qualityOptions.map(o => (
                                    <option key={o.id ?? o.name} value={o.id ?? o.name}>{o.name ?? o.id}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Unit Type</label>
                            <select
                                value={unitTypeId}
                                onChange={(e) => setUnitTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {unitTypeOptions.map(o => (
                                    <option key={o.id ?? o.name} value={o.id ?? o.name}>{o.name ?? o.id}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Add Collateral')}
                </Button>
            </div>
        </form>
    );
};

export default ClientCollateralForm;
