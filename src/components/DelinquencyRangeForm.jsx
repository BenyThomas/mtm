import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 * - initial (optional): { id, classification, minimumAgeDays|maxAgeDays variants }
 * - onSubmit(payload) => Promise
 * - submitting (bool)
 */
const DelinquencyRangeForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    // normalize incoming range fields
    const initMin =
        initial?.minimumAgeDays ?? initial?.minAgeDays ?? initial?.minDays ?? initial?.min ?? '';
    const initMax =
        initial?.maximumAgeDays ?? initial?.maxAgeDays ?? initial?.maxDays ?? initial?.max ?? '';

    const [classification, setClassification] = useState(initial?.classification || '');
    const [minDays, setMinDays] = useState(initMin);
    const [maxDays, setMaxDays] = useState(initMax);

    useEffect(() => {
        if (!initial) return;
        setClassification(initial?.classification || '');
        setMinDays(
            initial?.minimumAgeDays ?? initial?.minAgeDays ?? initial?.minDays ?? initial?.min ?? ''
        );
        setMaxDays(
            initial?.maximumAgeDays ?? initial?.maxAgeDays ?? initial?.maxDays ?? initial?.max ?? ''
        );
    }, [initial?.id]); // eslint-disable-line

    const errors = useMemo(() => {
        const e = {};
        const mi = Number(minDays);
        const ma = Number(maxDays);
        if (Number.isNaN(mi) || mi < 0) e.minDays = 'Min days must be ≥ 0';
        if (Number.isNaN(ma) || ma < 0) e.maxDays = 'Max days must be ≥ 0';
        if (!e.minDays && !e.maxDays && ma < mi) e.maxDays = 'Max must be ≥ Min';
        return e;
    }, [minDays, maxDays]);

    const submit = async (ev) => {
        ev.preventDefault();
        if (Object.keys(errors).length) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        const mi = Number(minDays);
        const ma = Number(maxDays);
        const payload = {
            classification: classification?.trim() || undefined,
            // primary keys
            minimumAgeDays: mi,
            maximumAgeDays: ma,
            // alternates for older/newer builds
            minAgeDays: mi,
            maxAgeDays: ma,
            minDays: mi,
            maxDays: ma,
            min: mi,
            max: ma,
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Classification</label>
                        <input
                            value={classification}
                            onChange={(e) => setClassification(e.target.value)}
                            placeholder="(Optional) e.g., PAR 1–30"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Min Days *</label>
                        <input
                            type="number"
                            min="0"
                            value={minDays}
                            onChange={(e) => setMinDays(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.minDays && <p className="text-xs text-red-500 mt-1">{errors.minDays}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Max Days *</label>
                        <input
                            type="number"
                            min="0"
                            value={maxDays}
                            onChange={(e) => setMaxDays(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        {errors.maxDays && <p className="text-xs text-red-500 mt-1">{errors.maxDays}</p>}
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Range')}
                </Button>
            </div>
        </form>
    );
};

export default DelinquencyRangeForm;
