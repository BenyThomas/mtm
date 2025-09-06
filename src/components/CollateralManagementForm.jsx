import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial (optional)
 * - template (optional) pre-fetched /collateral-management/template
 * - onSubmit(payload)
 * - submitting
 */
const CollateralManagementForm = ({ initial, template, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(!template);
    const [typeOptions, setTypeOptions] = useState([]);
    const [qualityOptions, setQualityOptions] = useState([]);
    const [unitTypeOptions, setUnitTypeOptions] = useState([]);

    const [name, setName] = useState(initial?.name || '');
    const [typeId, setTypeId] = useState(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
    const [quality, setQuality] = useState(initial?.quality || '');
    const [unitTypeId, setUnitTypeId] = useState(initial?.unitTypeId || '');
    const [basePrice, setBasePrice] = useState(initial?.basePrice ?? initial?.unitPrice ?? '');
    const [description, setDescription] = useState(initial?.description || '');

    const hydrateFromTemplate = (tpl) => {
        const d = tpl || {};
        const types = d.allowedCollateralTypes || d.collateralTypeOptions || d.collateralTypes || [];
        const qualities = d.qualityOptions || d.qualities || [];
        const units = d.unitTypeOptions || d.units || [];

        const normTypes = Array.isArray(types) ? types.map(o => ({
            id: o?.id ?? o?.value ?? o?.key, name: o?.name ?? o?.text ?? o?.label ?? `Type #${o?.id ?? ''}`
        })).filter(x => x.id != null) : [];
        const normQual = Array.isArray(qualities) ? qualities.map(o => ({
            id: o?.id ?? o?.value ?? o?.key ?? o, name: o?.name ?? o?.text ?? o?.label ?? String(o)
        })) : [];
        const normUnits = Array.isArray(units) ? units.map(o => ({
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

    // Fallback fetch
    useEffect(() => {
        if (template) return;
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/collateral-management/template');
                if (!cancelled) hydrateFromTemplate(r?.data || {});
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
        setTypeId(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
        setQuality(initial?.quality || '');
        setUnitTypeId(initial?.unitTypeId || '');
        setBasePrice(initial?.basePrice ?? initial?.unitPrice ?? '');
        setDescription(initial?.description || '');
    }, [initial?.id]); // eslint-disable-line

    const errors = useMemo(() => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!typeId) e.typeId = 'Type is required';
        if (!basePrice || Number(basePrice) <= 0) e.basePrice = 'Base price must be > 0';
        return e;
    }, [name, typeId, basePrice]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) return;

        const payload = {
            name: name.trim(),
            typeId: Number(typeId),
            collateralTypeId: Number(typeId),
            quality: quality || undefined,
            unitTypeId: unitTypeId ? Number(unitTypeId) : undefined,
            basePrice: Number(basePrice),
            unitPrice: Number(basePrice),
            description: description?.trim() || undefined,
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
                            <label className="block text-sm font-medium">Name *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium">Base Price *</label>
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
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Collateral')}
                </Button>
            </div>
        </form>
    );
};

export default CollateralManagementForm;
