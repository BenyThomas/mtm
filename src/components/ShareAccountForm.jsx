import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Creates a share application using /accounts/shares.
 * Loads /accounts/shares/template to discover products/clients, if provided.
 *
 * Payload (conservative; only include filled fields):
 * {
 *   "dateFormat": "yyyy-MM-dd",
 *   "locale": "en",
 *   "clientId": 1,
 *   "productId": 2,
 *   "submittedOnDate": "2025-09-01",
 *   "requestedShares": 10,
 *   "unitPrice": 100,          // optional
 *   "applicationDate": "...",  // optional if your instance expects this
 *   "externalId": "..."        // optional
 * }
 */
const ShareAccountForm = ({ onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [clientOptions, setClientOptions] = useState([]);
    const [productOptions, setProductOptions] = useState([]);

    const [clientId, setClientId] = useState('');
    const [productId, setProductId] = useState('');
    const [submittedOnDate, setSubmittedOnDate] = useState('');
    const [requestedShares, setRequestedShares] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [externalId, setExternalId] = useState('');

    const [errors, setErrors] = useState({});

    const type = 'shares';

    const normalize = (arr, idKey = 'id', nameKey = 'name') => {
        if (!Array.isArray(arr)) return [];
        return arr
            .map((o) => ({
                id: o?.[idKey] ?? o?.value ?? o?.key,
                name:
                    o?.[nameKey] ??
                    o?.displayName ??
                    o?.text ??
                    o?.label ??
                    String(o?.id ?? ''),
            }))
            .filter((x) => x.id);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/accounts/${type}/template`);
                const d = r?.data || {};
                const clients = normalize(d?.clientOptions || d?.clients || [], 'id', 'displayName');
                const products = normalize(d?.productOptions || d?.products || [], 'id', 'name');

                if (!cancelled) {
                    setClientOptions(clients);
                    setProductOptions(products);
                }
            } catch (_e) {
                if (!cancelled) {
                    setClientOptions([]);
                    setProductOptions([]);
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const validate = () => {
        const e = {};
        if (!clientId) e.clientId = 'Client is required';
        if (!productId) e.productId = 'Product is required';
        if (!submittedOnDate) e.submittedOnDate = 'Submitted date is required';
        if (!requestedShares) e.requestedShares = 'Requested shares is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            clientId: Number(clientId),
            productId: Number(productId),
            submittedOnDate,
            requestedShares: Number(requestedShares),
            ...(unitPrice ? { unitPrice: Number(unitPrice) } : {}),
            ...(externalId.trim() ? { externalId: externalId.trim() } : {}),
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
                            <label className="block text-sm font-medium">Client *</label>
                            {clientOptions.length ? (
                                <select
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select client…</option>
                                    {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <input
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="Client ID"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            )}
                            {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Product *</label>
                            {productOptions.length ? (
                                <select
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select product…</option>
                                    {productOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <input
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    placeholder="Product ID"
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            )}
                            {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Submitted On *</label>
                            <input
                                type="date"
                                value={submittedOnDate}
                                onChange={(e) => setSubmittedOnDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.submittedOnDate && <p className="text-xs text-red-500 mt-1">{errors.submittedOnDate}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Requested Shares *</label>
                            <input
                                type="number"
                                value={requestedShares}
                                onChange={(e) => setRequestedShares(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.requestedShares && <p className="text-xs text-red-500 mt-1">{errors.requestedShares}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Unit Price</label>
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">External ID</label>
                            <input
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Create Application'}
                </Button>
            </div>
        </form>
    );
};

export default ShareAccountForm;
