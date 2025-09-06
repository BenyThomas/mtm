import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';

/**
 * Props:
 * - rangesOptions: [{id, label}] (required)
 * - initial (optional): { id, name|bucketName, ranges:[{id,...}] }
 * - onSubmit(payload) => Promise
 * - submitting (bool)
 */
const DelinquencyBucketForm = ({ rangesOptions, initial, onSubmit, submitting }) => {
    const [name, setName] = useState(initial?.name || initial?.bucketName || '');
    const initialSelected = useMemo(() => {
        if (!initial?.ranges) return [];
        return initial.ranges.map(r => r.id ?? r.rangeId ?? r);
    }, [initial]);

    const [selected, setSelected] = useState(initialSelected);

    useEffect(() => {
        setName(initial?.name || initial?.bucketName || '');
        setSelected(initialSelected);
    }, [initial?.id]); // eslint-disable-line

    const toggle = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const submit = async (e) => {
        e.preventDefault();
        const ids = selected.map(Number);
        const payload = {
            name: name?.trim(),
            bucketName: name?.trim(),
            // different builds accept different shapes; include broadly
            ranges: ids.map(id => ({ id })),             // common
            rangeIds: ids,                                // sometimes accepted
            delinquencyRanges: ids,                       // sometimes accepted
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Bucket Name *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g., Standard Delinquency Bucket"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Include Ranges *</label>
                        <div className="max-h-64 overflow-auto rounded-md border p-2 dark:border-gray-600">
                            {!rangesOptions?.length ? (
                                <div className="text-sm text-gray-500">No ranges available. Create a range first.</div>
                            ) : (
                                <ul className="space-y-2">
                                    {rangesOptions.map(opt => (
                                        <li key={opt.id} className="flex items-center gap-2">
                                            <input
                                                id={`range-${opt.id}`}
                                                type="checkbox"
                                                checked={selected.includes(opt.id)}
                                                onChange={() => toggle(opt.id)}
                                            />
                                            <label htmlFor={`range-${opt.id}`} className="text-sm cursor-pointer">
                                                {opt.label}
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting || !name?.trim() || selected.length === 0}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Bucket')}
                </Button>
            </div>
        </form>
    );
};

export default DelinquencyBucketForm;
