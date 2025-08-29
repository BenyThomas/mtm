import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

// Fallback entities if template parsing fails
const FALLBACK_ENTITIES = [
    { id: 'CLIENT', name: 'CLIENT' },
    { id: 'GROUP', name: 'GROUP' },
    { id: 'CENTER', name: 'CENTER' },
    { id: 'LOAN', name: 'LOAN' },
    { id: 'SAVINGS', name: 'SAVINGS' },
];

/**
 * Props:
 * - initial: { entity, status, datatableName, productId? } | null
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
const EntityDatatableCheckForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState(null);
    const [datatables, setDatatables] = useState([]);

    const [entity, setEntity] = useState('');
    const [status, setStatus] = useState(''); // text or numeric; we will normalize
    const [datatableName, setDatatableName] = useState('');
    const [productId, setProductId] = useState('');
    const [loanProducts, setLoanProducts] = useState([]);
    const [savingsProducts, setSavingsProducts] = useState([]);

    const [errors, setErrors] = useState({});

    // Normalize template options safely
    const entityOptions = useMemo(() => {
        const src =
            template?.entities ??
            template?.entityOptions ??
            template?.entity ??
            [];
        const list = Array.isArray(src) ? src : [];
        const norm = list
            .map((x) => {
                const id = x?.id ?? x?.value ?? x?.code ?? x?.name;
                const name = x?.name ?? x?.value ?? x?.code ?? x?.id;
                return id && name ? { id: String(id).toUpperCase(), name: String(name).toUpperCase() } : null;
            })
            .filter(Boolean);
        // Merge with fallback (avoid duplicates)
        const map = new Map(norm.map((o) => [o.id, o]));
        FALLBACK_ENTITIES.forEach((f) => {
            if (!map.has(f.id)) map.set(f.id, f);
        });
        return Array.from(map.values());
    }, [template]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                // Template (optional but helpful)
                try {
                    const t = await api.get('/entityDatatableChecks/template');
                    if (!cancelled) setTemplate(t?.data || null);
                } catch {
                    if (!cancelled) setTemplate(null);
                }
                // Available datatables for dropdown
                try {
                    const d = await api.get('/datatables');
                    const list = Array.isArray(d.data) ? d.data : (d.data?.pageItems || []);
                    const names = list
                        .map((x) => x.registeredTableName || x.datatableName || x.tableName || x.name)
                        .filter(Boolean);
                    if (!cancelled) setDatatables(names);
                } catch {
                    if (!cancelled) setDatatables([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Load product options when entity needs it
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (entity === 'LOAN') {
                try {
                    const r = await api.get('/loanproducts');
                    const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || r.data?.loanProductOptions || []);
                    const norm = list.map((p) => ({ id: p.id, name: p.name })).filter((p) => p.id != null);
                    if (!cancelled) setLoanProducts(norm);
                } catch {
                    if (!cancelled) setLoanProducts([]);
                }
            } else if (entity === 'SAVINGS') {
                try {
                    const r = await api.get('/savingsproducts');
                    const list = Array.isArray(r.data) ? r.data : (r.data?.pageItems || r.data?.savingsProductOptions || []);
                    const norm = list.map((p) => ({ id: p.id, name: p.name })).filter((p) => p.id != null);
                    if (!cancelled) setSavingsProducts(norm);
                } catch {
                    if (!cancelled) setSavingsProducts([]);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [entity]);

    // Hydrate initial
    useEffect(() => {
        if (!initial) return;
        setEntity(initial.entity || '');
        setStatus(initial.status != null ? String(initial.status) : '');
        setDatatableName(initial.datatableName || '');
        setProductId(initial.productId != null ? String(initial.productId) : '');
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!entity) e.entity = 'Entity is required';
        if (!datatableName) e.datatableName = 'Datatable is required';
        if (!status) e.status = 'Status is required';
        if ((entity === 'LOAN' || entity === 'SAVINGS') && !productId) {
            e.productId = 'Product is required for this entity';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            return;
        }
        // status may be a code or number; send number if numeric
        const statusVal = /^\d+$/.test(status) ? Number(status) : status;
        const payload = {
            entity,
            datatableName,
            status: statusVal,
            ...(productId ? { productId: Number(productId) } : {}),
        };
        try {
            await onSubmit(payload);
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                'Save failed';
            addToast(msg, 'error');
        }
    };

    if (loading) {
        return (
            <Card>
                <Skeleton height="10rem" />
            </Card>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                {/* Entity */}
                <div>
                    <label className="block text-sm font-medium">Entity *</label>
                    <select
                        value={entity}
                        onChange={(e) => { setEntity(e.target.value); setProductId(''); }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select…</option>
                        {entityOptions.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                    {errors.entity && <p className="text-xs text-red-500 mt-1">{errors.entity}</p>}
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium">Status *</label>
                    <input
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. CREATE, APPROVE, DISBURSE or numeric code"
                    />
                    {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                        Accepts status code or name. Use the template docs for exact values in your tenant.
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Datatable */}
                <div>
                    <label className="block text-sm font-medium">Datatable *</label>
                    <select
                        value={datatableName}
                        onChange={(e) => setDatatableName(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select…</option>
                        {datatables.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    {errors.datatableName && <p className="text-xs text-red-500 mt-1">{errors.datatableName}</p>}
                </div>

                {/* Product (conditional) */}
                {(entity === 'LOAN' || entity === 'SAVINGS') && (
                    <div>
                        <label className="block text-sm font-medium">Product *</label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">Select…</option>
                            {(entity === 'LOAN' ? loanProducts : savingsProducts).map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId}</p>}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Check')}
                </Button>
            </div>
        </form>
    );
};

export default EntityDatatableCheckForm;
