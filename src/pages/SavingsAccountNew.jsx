import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../context/ToastContext';

const today = () => new Date().toISOString().slice(0, 10);

const parseError = (error, fallback) =>
    error?.response?.data?.errors?.[0]?.defaultUserMessage ||
    error?.response?.data?.defaultUserMessage ||
    error?.response?.data?.message ||
    fallback;

const asItems = (payload) => Array.isArray(payload) ? payload : payload?.pageItems || [];

const hasUnsupportedDateFormatError = (error) => {
    const errors = error?.response?.data?.errors || [];
    return errors.some((item) => item?.parameterName === 'dateFormat' || /dateFormat is not supported/i.test(item?.defaultUserMessage || item?.developerMessage || ''));
};

const postWithDateFormatFallback = async (url, payload) => {
    try {
        return await api.post(url, payload);
    } catch (error) {
        if (!hasUnsupportedDateFormatError(error) || !Object.prototype.hasOwnProperty.call(payload || {}, 'dateFormat')) {
            throw error;
        }
        const { dateFormat, ...retryPayload } = payload;
        return api.post(url, retryPayload);
    }
};

const SavingsAccountNew = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [params] = useSearchParams();
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [clientQuery, setClientQuery] = useState('');
    const [form, setForm] = useState({
        clientId: params.get('clientId') || '',
        productId: params.get('productId') || '',
        submittedOnDate: today(),
        externalId: '',
        approveNow: true,
        approvedOnDate: today(),
        activateNow: true,
        activatedOnDate: today(),
    });

    useEffect(() => {
        const loadProducts = async () => {
            setLoadingProducts(true);
            try {
                const response = await api.get('/savingsproducts');
                setProducts(asItems(response.data));
            } catch (error) {
                setProducts([]);
                addToast(parseError(error, 'Could not load savings products'), 'error');
            } finally {
                setLoadingProducts(false);
            }
        };
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedProduct = useMemo(
        () => products.find((product) => String(product.id) === String(form.productId)),
        [products, form.productId]
    );

    const update = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
    };

    const searchClients = async (event) => {
        event?.preventDefault();
        const term = clientQuery.trim();
        if (!term) return;
        setSearching(true);
        try {
            const params = /^\d+$/.test(term)
                ? { externalId: term, limit: 10 }
                : { displayName: term, limit: 10 };
            const response = await api.get('/clients', { params });
            const items = asItems(response.data);
            setClients(items);
            if (!items.length) addToast('No clients found', 'info');
        } catch (error) {
            setClients([]);
            addToast(parseError(error, 'Client search failed'), 'error');
        } finally {
            setSearching(false);
        }
    };

    const selectClient = (client) => {
        setForm((current) => ({ ...current, clientId: String(client.id || '') }));
        setClientQuery(client.displayName || client.fullname || client.accountNo || String(client.id || ''));
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!form.clientId || !form.productId) {
            addToast('Client and savings product are required', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
                clientId: Number(form.clientId),
                productId: Number(form.productId),
                submittedOnDate: form.submittedOnDate || today(),
            };
            if (form.externalId.trim()) payload.externalId = form.externalId.trim();
            const createResponse = await postWithDateFormatFallback('/savingsaccounts', payload);
            const accountId = createResponse.data?.resourceId || createResponse.data?.savingsId || createResponse.data?.id;
            if (!accountId) {
                addToast('Savings account created, but Fineract did not return an account ID', 'warning');
                return;
            }
            const shouldApprove = form.approveNow || form.activateNow;
            if (shouldApprove) {
                await postWithDateFormatFallback(`/savingsaccounts/${accountId}?command=approve`, {
                    locale: 'en',
                    dateFormat: 'yyyy-MM-dd',
                    approvedOnDate: form.approvedOnDate || form.submittedOnDate || today(),
                });
            }
            if (form.activateNow) {
                await postWithDateFormatFallback(`/savingsaccounts/${accountId}?command=activate`, {
                    locale: 'en',
                    dateFormat: 'yyyy-MM-dd',
                    activatedOnDate: form.activatedOnDate || form.approvedOnDate || form.submittedOnDate || today(),
                });
            }
            addToast(form.activateNow ? 'Savings account created, approved, and activated' : shouldApprove ? 'Savings account created and approved' : 'Savings account created', 'success');
            navigate(`/savings/${accountId}`);
        } catch (error) {
            addToast(parseError(error, 'Create savings account failed'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">New Savings Account</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Create a Fineract savings account manually for an existing client.</p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card>
                    <form className="space-y-5" onSubmit={submit}>
                        <div>
                            <h2 className="text-lg font-semibold">Client</h2>
                            <div className="mt-3 flex gap-2">
                                <input
                                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                                    value={clientQuery}
                                    onChange={(event) => setClientQuery(event.target.value)}
                                    placeholder="Search by client name or client number"
                                />
                                <Button type="button" variant="secondary" disabled={searching} onClick={searchClients}>{searching ? 'Searching...' : 'Search'}</Button>
                            </div>
                            {clients.length ? (
                                <div className="mt-3 overflow-hidden rounded-lg border dark:border-gray-800">
                                    {clients.map((client) => (
                                        <button
                                            type="button"
                                            key={client.id}
                                            onClick={() => selectClient(client)}
                                            className={`block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${String(form.clientId) === String(client.id) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                                        >
                                            <div className="font-semibold">{client.displayName || client.fullname || `Client ${client.id}`}</div>
                                            <div className="text-xs text-gray-500">Client ID {client.id} {client.accountNo ? `- Account ${client.accountNo}` : ''}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                            <label className="mt-3 block text-sm">Fineract Client ID<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.clientId} onChange={update('clientId')} required /></label>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold">Account</h2>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="text-sm sm:col-span-2">Savings Product<select className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.productId} onChange={update('productId')} required disabled={loadingProducts}>
                                    <option value="">Select product</option>
                                    {products.map((product) => <option key={product.id} value={product.id}>{product.name || product.shortName || `Product ${product.id}`}</option>)}
                                </select></label>
                                <label className="text-sm">Submitted On<input type="date" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.submittedOnDate} onChange={update('submittedOnDate')} required /></label>
                                <label className="text-sm">External ID<input className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.externalId} onChange={update('externalId')} /></label>
                                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.approveNow || form.activateNow} onChange={update('approveNow')} disabled={form.activateNow} /> Approve after creation</label>
                                {(form.approveNow || form.activateNow) ? <label className="text-sm">Approval Date<input type="date" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.approvedOnDate} onChange={update('approvedOnDate')} /></label> : null}
                                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.activateNow} onChange={update('activateNow')} /> Activate after approval</label>
                                {form.activateNow ? <label className="text-sm">Activation Date<input type="date" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800" value={form.activatedOnDate} onChange={update('activatedOnDate')} /></label> : null}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Savings Account'}</Button>
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
                        </div>
                    </form>
                </Card>

                <Card>
                    <h2 className="text-lg font-semibold">Selected Product</h2>
                    {selectedProduct ? (
                        <div className="mt-4 space-y-3 text-sm">
                            <div><div className="text-gray-500">Name</div><div className="font-semibold">{selectedProduct.name}</div></div>
                            <div><div className="text-gray-500">Product ID</div><div className="font-semibold">{selectedProduct.id}</div></div>
                            <div><div className="text-gray-500">Currency</div><div className="font-semibold">{selectedProduct.currency?.code || selectedProduct.currencyCode || '-'}</div></div>
                            <div><div className="text-gray-500">Interest</div><div className="font-semibold">{selectedProduct.nominalAnnualInterestRate ?? selectedProduct.interestRate ?? 0}%</div></div>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-gray-500">Select a savings product to review key details.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default SavingsAccountNew;