import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

const AttributeForm = ({ initial, onSubmit, submitting }) => {
    const [attributeKey, setAttributeKey] = useState(initial?.attributeKey || initial?.key || '');
    const [attributeValue, setAttributeValue] = useState(initial?.attributeValue || initial?.value || '');
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!attributeKey.trim()) e.attributeKey = 'Key is required';
        if (!attributeValue.toString().trim()) e.attributeValue = 'Value is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({
            attributeKey: attributeKey.trim(),
            attributeValue: attributeValue.toString().trim(),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Key *</label>
                <input
                    value={attributeKey}
                    onChange={(e) => setAttributeKey(e.target.value)}
                    placeholder="e.g. servicingStrategy"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.attributeKey && <p className="text-xs text-red-500 mt-1">{errors.attributeKey}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium">Value *</label>
                <input
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                    placeholder="e.g. STANDARD"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.attributeValue && <p className="text-xs text-red-500 mt-1">{errors.attributeValue}</p>}
            </div>
            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Attribute')}</Button>
            </div>
        </form>
    );
};

const LoanProductAttributes = () => {
    const { addToast } = useToast();

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [products, setProducts] = useState([]);
    const [loanProductId, setLoanProductId] = useState('');

    const [loading, setLoading] = useState(false);
    const [attrs, setAttrs] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);

    const [editing, setEditing] = useState(null);
    const [editBusy, setEditBusy] = useState(false);

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const r = await api.get('/loanproducts');
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(p => ({ id: p.id, name: p.name || p.shortName || `Product ${p.id}` }));
            norm.sort((a,b) => String(a.name).localeCompare(String(b.name)));
            setProducts(norm);
            if (!loanProductId && norm.length) setLoanProductId(String(norm[0].id));
        } catch (e) {
            setProducts([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load loan products';
            addToast(msg, 'error');
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadAttributes = async () => {
        if (!loanProductId) return;
        setLoading(true);
        try {
            const r = await api.get(`/external-asset-owners/loan-product/${loanProductId}/attributes`);
            const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || []);
            const norm = list.map(a => ({
                id: a.id,
                attributeKey: a.attributeKey || a.key,
                attributeValue: a.attributeValue || a.value,
                createdOn: a.createdOn || a.createdAt,
            }));
            norm.sort((a,b) => String(a.attributeKey).localeCompare(String(b.attributeKey)));
            setAttrs(norm);
        } catch (e) {
            setAttrs([]);
            const msg = e?.response?.data?.defaultUserMessage || 'Failed to load attributes';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProducts(); /* eslint-disable-next-line */ }, []);
    useEffect(() => { loadAttributes(); /* eslint-disable-next-line */ }, [loanProductId]);

    const createAttr = async (payload) => {
        setCreateBusy(true);
        try {
            await api.post(`/external-asset-owners/loan-product/${loanProductId}/attributes`, {
                ...payload,
                locale: 'en',
            });
            addToast('Attribute created', 'success');
            setCreateOpen(false);
            await loadAttributes();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setCreateBusy(false);
        }
    };

    const saveAttr = async (payload) => {
        if (!editing) return;
        setEditBusy(true);
        try {
            await api.put(`/external-asset-owners/loan-product/${loanProductId}/attributes/${editing.id}`, {
                ...payload,
                locale: 'en',
            });
            addToast('Attribute updated', 'success');
            setEditing(null);
            await loadAttributes();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">EAO — Loan Product Attributes</h1>
                <div className="space-x-2">
                    <Button onClick={() => setCreateOpen(true)} disabled={!loanProductId}>New Attribute</Button>
                    <Button variant="secondary" onClick={loadAttributes} disabled={!loanProductId}>Refresh</Button>
                </div>
            </div>

            {/* Select product */}
            <Card>
                {loadingProducts ? (
                    <Skeleton height="3rem" />
                ) : !products.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No loan products available.</div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Loan Product</label>
                            <select
                                value={loanProductId}
                                onChange={(e) => setLoanProductId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </Card>

            {/* Attributes table */}
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !attrs.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No attributes found for this product.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Key</th>
                                <th className="py-2 pr-4">Value</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {attrs.map(a => (
                                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4 font-mono">{a.attributeKey}</td>
                                    <td className="py-2 pr-4">{String(a.attributeValue ?? '')}</td>
                                    <td className="py-2 pr-4 space-x-2">
                                        <Button variant="secondary" onClick={() => setEditing(a)}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create modal */}
            <Modal
                open={createOpen}
                title="New Attribute"
                onClose={() => setCreateOpen(false)}
                footer={null}
            >
                <AttributeForm onSubmit={createAttr} submitting={createBusy} />
            </Modal>

            {/* Edit modal */}
            <Modal
                open={!!editing}
                title={`Edit: ${editing?.attributeKey}`}
                onClose={() => setEditing(null)}
                footer={null}
            >
                {editing ? (
                    <AttributeForm initial={editing} onSubmit={saveAttr} submitting={editBusy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default LoanProductAttributes;
