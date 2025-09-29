import React, { useEffect, useState } from 'react';
import Button from './Button';

const CodeForm = ({ initial, onSubmit, submitting }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) {
            setName('');
            setDescription('');
            setErrors({});
            return;
        }
        setName(initial.name || '');
        setDescription(initial.description || '');
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
            ...(description.trim() ? { description: description.trim() } : {}),
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
                    placeholder="e.g. Customer Identifier Type"
                />
                {errors.name ? <p className="text-xs text-red-500 mt-1">{errors.name}</p> : null}
            </div>

            <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Helpful note describing what this code category is for…"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Code')}
                </Button>
            </div>
        </form>
    );
};

export default CodeForm;
