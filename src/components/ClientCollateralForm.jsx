import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import MiniCombobox from './MiniCombobox';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const normalizeCollateralOptions = (list) => {
    return (Array.isArray(list) ? list : [])
        .map((item) => ({
            id: item?.id ?? item?.collateralId,
            name: item?.name || `Collateral #${item?.id ?? item?.collateralId ?? ''}`,
            currency: item?.currency || '',
            quality: item?.quality || '',
            unitType: item?.unitType || item?.unitTypeId || '',
            basePrice: item?.basePrice ?? item?.unitPrice ?? '',
            description: item?.description || '',
        }))
        .filter((item) => item.id != null);
};

const ClientCollateralForm = ({ clientId, initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [collateralOptions, setCollateralOptions] = useState([]);

    const [collateralId, setCollateralId] = useState(
        initial?.collateralId || initial?.collateral?.id || initial?.id || null
    );
    const [quantity, setQuantity] = useState(initial?.quantity ?? 1);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const r = await api.get('/collateral-management');
                const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
                const options = normalizeCollateralOptions(list);
                if (!cancelled) {
                    setCollateralOptions(options);
                    if (!initial && !collateralId && options.length) {
                        setCollateralId(options[0].id);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setCollateralOptions([]);
                    addToast(e?.response?.data?.defaultUserMessage || 'Failed to load collateral options', 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [addToast, initial, collateralId]);

    useEffect(() => {
        if (!initial) return;
        setCollateralId(initial?.collateralId || initial?.collateral?.id || initial?.id || null);
        setQuantity(initial?.quantity ?? 1);
    }, [initial?.id]);

    const selectedCollateral = useMemo(
        () => collateralOptions.find((item) => String(item.id) === String(collateralId)),
        [collateralOptions, collateralId]
    );

    const errors = useMemo(() => {
        const next = {};
        if (!collateralId) next.collateralId = 'Collateral is required';
        if (!quantity || Number(quantity) <= 0) next.quantity = 'Quantity must be greater than 0';
        return next;
    }, [collateralId, quantity]);

    const submit = async (e) => {
        e.preventDefault();
        if (Object.keys(errors).length) return;
        await onSubmit({
            collateralId: Number(collateralId),
            locale: 'en',
            quantity: Number(quantity),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <MiniCombobox
                                label="Collateral"
                                value={collateralId}
                                onChange={setCollateralId}
                                options={collateralOptions.map((item) => ({
                                    id: Number(item.id),
                                    label: item.name,
                                }))}
                                placeholder="Type to search collateral..."
                                disabled={loading}
                                required
                            />
                            {errors.collateralId && <p className="text-xs text-red-500 mt-1">{errors.collateralId}</p>}
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

                        {selectedCollateral ? (
                            <div className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Currency</span>
                                        <div className="font-medium">{selectedCollateral.currency || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Base Price</span>
                                        <div className="font-medium">{selectedCollateral.basePrice || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Quality</span>
                                        <div className="font-medium">{selectedCollateral.quality || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Unit Type</span>
                                        <div className="font-medium">{selectedCollateral.unitType || '-'}</div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="text-gray-500 dark:text-gray-400">Description</span>
                                        <div className="font-medium">{selectedCollateral.description || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
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

export default ClientCollateralForm;
