import React, { useEffect, useState } from 'react';
import Button from './Button';

const CodeValueForm = ({ initial, onSubmit, submitting }) => {
    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) {
            setName('');
            setPosition('');
            setDescription('');
            setIsActive(true);
            setErrors({});
            return;
        }
        setName(initial.name || '');
        setPosition(
            initial.position != null && initial.position !== ''
                ? String(initial.position)
                : ''
        );
        setDescription(initial.description || '');
        setIsActive(
            initial.isActive != null
                ? Boolean(initial.isActive)
                : true
        );
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        const payload = {
            name: name.trim(),
            ...(position !== '' ? { position: Number(position) } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            isActive: Boolean(isActive),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Name *</label>
                <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((x) => ({ ...x, name: '' }));
                    }}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. Passport, National ID"
                />
                {errors.name ? (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                ) : null}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Position (optional)</label>
                    <input
                        type="number"
                        step="1"
                        min="0"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Display order (lower shows first)"
                    />
                </div>
                <div className="flex items-end">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        Active
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Helpful note about this code value…"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create')}
                </Button>
            </div>
        </form>
    );
};

export default CodeValueForm;
