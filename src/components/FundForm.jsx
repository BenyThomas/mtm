import React, { useEffect, useState } from 'react';
import Button from './Button';

/**
 * Props:
 *  - initial?: { id?, name, externalId? }
 *  - onSubmit: (payload) => Promise<void>
 *  - submitting: boolean
 */
const FundForm = ({ initial, onSubmit, submitting }) => {
    const [name, setName] = useState('');
    const [externalId, setExternalId] = useState('');

    useEffect(() => {
        setName(initial?.name ?? '');
        setExternalId(initial?.externalId ?? '');
    }, [initial]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: (name || '').trim(),
            ...(externalId?.trim() ? { externalId: externalId.trim() } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">
                    Name <span className="text-red-600">*</span>
                </label>
                <input
                    type="text"
                    className="mt-1 w-full rounded-md border p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. General Fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Transaction Reference</label>
                <input
                    type="text"
                    className="mt-1 w-full rounded-md border p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. TH5K7L47J45B3"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    disabled={submitting}
                />
            </div>

            <div className="pt-2 flex items-center gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
};

export default FundForm;
