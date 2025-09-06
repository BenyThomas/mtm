import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - initial: office object for edit (or null for create)
 *  - onSubmit: async (payload) => void
 *  - submitting: boolean
 */
const OfficeForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);
    const [tpl, setTpl] = useState(null);

    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [openingDate, setOpeningDate] = useState('');
    const [externalId, setExternalId] = useState('');
    const [errors, setErrors] = useState({});

    // Load template to get office options (parent list)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/offices/template');
                if (!cancelled) setTpl(r?.data || {});
            } catch {
                if (!cancelled) setTpl(null);
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Normalize office options from template
    const parentOptions = useMemo(() => {
        const raw = tpl?.allowedParents || tpl?.parentIdOptions || tpl?.officeOptions || [];
        const list = Array.isArray(raw) ? raw : [];
        return list
            .map(o => ({
                id: o.id ?? o.value ?? o.key,
                name: o.name ?? o.text ?? o.label,
            }))
            .filter(x => x.id && x.name);
    }, [tpl]);

    // Hydrate initial
    useEffect(() => {
        if (!initial) {
            setName('');
            setParentId('');
            setOpeningDate('');
            setExternalId('');
            setErrors({});
            return;
        }
        setName(initial.name || '');
        setParentId(initial.parentId || initial.parent?.id || '');
        // Accept ISO or array-like dates; store as yyyy-MM-dd
        const iso = (v) => (v ? String(v).slice(0, 10) : '');
        setOpeningDate(iso(initial.openingDate));
        setExternalId(initial.externalId || '');
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!openingDate) e.openingDate = 'Opening date is required';
        // parentId is required for non-head offices. If template has options and none selected,
        // we still allow empty (head office), otherwise enforce selection.
        if (parentOptions.length && !parentId && !initial?.isHeadOffice && !initial?.parentName) {
            e.parentId = 'Parent office is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const payload = {
            name: name.trim(),
            openingDate,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            ...(parentId ? { parentId: Number(parentId) } : {}),
            ...(externalId.trim() ? { externalId: externalId.trim() } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {tplLoading ? <Card><Skeleton height="4rem" /></Card> : null}

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Office Name *</label>
                        <input
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(x => ({ ...x, name: '' })); }}
                            placeholder="e.g. Head Office / Dar es Salaam Branch"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Opening Date *</label>
                        <input
                            type="date"
                            value={openingDate}
                            onChange={(e) => { setOpeningDate(e.target.value); if (errors.openingDate) setErrors(x => ({ ...x, openingDate: '' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.openingDate && <p className="text-xs text-red-500 mt-1">{errors.openingDate}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Parent Office {parentOptions.length ? '*' : '(optional)'}</label>
                        <select
                            value={parentId}
                            onChange={(e) => { setParentId(e.target.value); if (errors.parentId) setErrors(x => ({ ...x, parentId: '' })); }}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">{parentOptions.length ? 'Select parent…' : '—'}</option>
                            {parentOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        {errors.parentId && <p className="text-xs text-red-500 mt-1">{errors.parentId}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">External ID</label>
                        <input
                            value={externalId}
                            onChange={(e) => setExternalId(e.target.value)}
                            placeholder="Optional external reference"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Office')}
                </Button>
            </div>
        </form>
    );
};

export default OfficeForm;
