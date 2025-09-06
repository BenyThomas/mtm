import React, { useEffect, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const normalize = (arr, idKey = 'id', nameKey = 'name') => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map(o => ({
            id: o?.[idKey] ?? o?.value ?? o?.key,
            name: o?.[nameKey] ?? o?.text ?? o?.label ?? String(o?.id ?? '')
        }))
        .filter(x => x.id);
};

/**
 * Props:
 * - clientId (number | string)
 * - initial (identifier object for edit) optional
 * - onSubmit(payload) -> Promise
 * - submitting (bool)
 */
const IdentifierForm = ({ clientId, initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [docTypeOptions, setDocTypeOptions] = useState([]);

    const [documentTypeId, setDocumentTypeId] = useState(initial?.documentType?.id || initial?.documentTypeId || '');
    const [documentKey, setDocumentKey] = useState(initial?.documentKey || '');
    const [description, setDescription] = useState(initial?.description || '');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get(`/clients/${clientId}/identifiers/template`);
                const d = r?.data || {};
                const options = normalize(
                    d?.allowedDocumentTypes || d?.documentTypeOptions || d?.documentTypes || []
                );
                if (!cancelled) setDocTypeOptions(options);
            } catch (_e) {
                if (!cancelled) {
                    setDocTypeOptions([]);
                    addToast('Failed to load identifier template', 'error');
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [clientId, addToast]);

    useEffect(() => {
        if (!initial) return;
        setDocumentTypeId(initial?.documentType?.id || initial?.documentTypeId || '');
        setDocumentKey(initial?.documentKey || '');
        setDescription(initial?.description || '');
        setErrors({});
    }, [initial?.id]);

    const validate = () => {
        const e = {};
        if (!documentTypeId) e.documentTypeId = 'Document type is required';
        if (!documentKey.trim()) e.documentKey = 'Document key/number is required';
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
            documentTypeId: Number(documentTypeId),
            documentKey: documentKey.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
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
                            <label className="block text-sm font-medium">Document Type *</label>
                            <select
                                value={documentTypeId}
                                onChange={(e) => { setDocumentTypeId(e.target.value); if (errors.documentTypeId) setErrors(x => ({ ...x, documentTypeId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select type…</option>
                                {docTypeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.documentTypeId && <p className="text-xs text-red-500 mt-1">{errors.documentTypeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Document Key/Number *</label>
                            <input
                                value={documentKey}
                                onChange={(e) => { setDocumentKey(e.target.value); if (errors.documentKey) setErrors(x => ({ ...x, documentKey: '' })); }}
                                placeholder="e.g., AB1234567"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.documentKey && <p className="text-xs text-red-500 mt-1">{errors.documentKey}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional note"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Identifier')}
                </Button>
            </div>
        </form>
    );
};

export default IdentifierForm;
