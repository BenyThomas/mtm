import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const LoanCollateralForm = ({ loanId, initial, template, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(!template);
    const [typeOptions, setTypeOptions] = useState([]);

    const [typeId, setTypeId] = useState(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
    const [value, setValue] = useState(
        initial?.value ?? initial?.total ?? initial?.totalValue ?? initial?.amount ?? ''
    );

    const loadTypeCatalog = async () => {
        const r = await api.get('/ops/collateral-types', {
            params: { limit: 200, orderBy: 'position', sortOrder: 'asc' },
        });
        const items = Array.isArray(r?.data?.items) ? r.data.items : [];
        const norm = items
            .map((o) => ({
                id: o?.id,
                name: o?.name ?? o?.value ?? `Type #${o?.id ?? ''}`,
            }))
            .filter((x) => x.id != null);
        setTypeOptions(norm);
        if (!initial && !typeId && norm.length) setTypeId(norm[0].id);
    };

    const hydrateFromTemplate = (tpl) => {
        const d = tpl || {};
        const opts = d.allowedCollateralTypes || d.collateralTypeOptions || d.collateralTypes || d.types || [];
        const norm = Array.isArray(opts)
            ? opts.map((o) => ({
                id: o?.id ?? o?.value ?? o?.key,
                name: o?.name ?? o?.text ?? o?.label ?? `Type #${o?.id ?? ''}`,
            })).filter((x) => x.id != null)
            : [];
        if (norm.length) {
            setTypeOptions(norm);
            if (!initial && !typeId) setTypeId(norm[0].id);
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (!template) return;
        let cancelled = false;
        (async () => {
            const hydrated = hydrateFromTemplate(template);
            if (!hydrated && !cancelled) {
                try {
                    await loadTypeCatalog();
                } catch (_e) {
                    addToast('Failed to load collateral types', 'error');
                }
            }
            if (!cancelled) setTplLoading(false);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template]);

    useEffect(() => {
        if (template) return;
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/loans/${loanId}/collaterals/template`);
                const hydrated = !cancelled && hydrateFromTemplate(r?.data || {});
                if (!cancelled && !hydrated) {
                    await loadTypeCatalog();
                }
            } catch (e) {
                if (!cancelled) {
                    try {
                        await loadTypeCatalog();
                    } catch (_e) {
                        setTypeOptions([]);
                        addToast('Failed to load collateral template', 'error');
                    }
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [loanId, template, addToast]);

    useEffect(() => {
        if (!initial) return;
        setTypeId(initial?.typeId || initial?.collateralTypeId || initial?.type?.id || '');
        setDescription(initial?.description || '');
        setQuantity(initial?.quantity ?? 1);
        setValue(initial?.value ?? initial?.total ?? initial?.totalValue ?? initial?.amount ?? '');
    }, [initial?.id]);

    const errors = useMemo(() => {
        const next = {};
        if (!typeId) next.typeId = 'Type is required';
        if (!value || Number(value) <= 0) next.value = 'Value must be > 0';
        if (!quantity || Number(quantity) <= 0) next.quantity = 'Quantity must be > 0';
        return next;
    }, [typeId, value, quantity]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        await onSubmit({
            typeId: Number(typeId),
            collateralTypeId: Number(typeId),
            value: Number(value),
            total: Number(value),
            quantity: Number(quantity),
            ...(description ? { description: description.trim() } : {}),
        });
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
                                <option value="">Select type...</option>
                                {typeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
                    {submitting ? 'Saving...' : (initial ? 'Save Changes' : 'Add Collateral')}
                </Button>
            </div>
        </form>
    );
};

export default LoanCollateralForm;
