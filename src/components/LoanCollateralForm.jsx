import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - loanId (number|string)
 * - initial (optional) existing collateral object
 * - template (optional) pre-fetched template JSON for /loans/{loanId}/collaterals/template
 * - onSubmit(payload) => Promise
 * - submitting (bool)
 */
const LoanCollateralForm = ({ loanId, initial, template, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(!template);
    const [typeOptions, setTypeOptions] = useState([]);

    // Fields
    const [typeId, setTypeId] = useState(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [value, setValue] = useState(
        initial?.value ?? initial?.total ?? initial?.totalValue ?? initial?.amount ?? ''
    );

    // Normalize and set options from any template shape
    const hydrateFromTemplate = (tpl) => {
        const d = tpl || {};
        const opts = d.allowedCollateralTypes || d.collateralTypeOptions || d.collateralTypes || d.types || [];
        const norm = Array.isArray(opts)
            ? opts.map(o => ({
                id: o?.id ?? o?.value ?? o?.key,
                name: o?.name ?? o?.text ?? o?.label ?? `Type #${o?.id ?? ''}`,
            })).filter(x => x.id != null)
            : [];
        setTypeOptions(norm);
        if (!initial && !typeId && norm.length) setTypeId(norm[0].id);
    };

    // Use passed template if provided
    useEffect(() => {
        if (template) {
            hydrateFromTemplate(template);
            setTplLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template]);

    // Fallback: fetch template ourselves
    useEffect(() => {
        if (template) return; // already hydrated
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/loans/${loanId}/collaterals/template`);
                if (!cancelled) hydrateFromTemplate(r?.data || {});
            } catch (e) {
                if (!cancelled) {
                    setTypeOptions([]);
                    addToast('Failed to load collateral template', 'error');
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [loanId, template, addToast]);

    // React to new initial
    useEffect(() => {
        if (!initial) return;
        setTypeId(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
        setDescription(initial?.description || '');
        setQuantity(initial?.quantity ?? 1);
        setValue(initial?.value ?? initial?.total ?? initial?.totalValue ?? initial?.amount ?? '');
    }, [initial?.id]); // eslint-disable-line

    const errors = useMemo(() => {
        const e = {};
        if (!typeId) e.typeId = 'Type is required';
        if (!value || Number(value) <= 0) e.value = 'Value must be > 0';
        if (!quantity || Number(quantity) <= 0) e.quantity = 'Quantity must be > 0';
        return e;
    }, [typeId, value, quantity]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            typeId: Number(typeId),
            collateralTypeId: Number(typeId), // alternative key
            value: Number(value),
            total: Number(value),             // alternative key
            quantity: Number(quantity),
            ...(description ? { description: description.trim() } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="8rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Collateral Type *</label>
                            <select
                                value={typeId}
                                onChange={(e) => e.target.value !== 'null' && setTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select type…</option>
                                {typeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.typeId && <p className="text-xs text-red-500 mt-1">{errors.typeId}</p>}
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
                            <label className="block text-sm font-medium">Total Value *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
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

export default LoanCollateralForm;
