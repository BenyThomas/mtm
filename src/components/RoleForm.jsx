import React, { useEffect, useState } from 'react';
import Button from './Button';

const RoleForm = ({ initial, onSubmit, submitting }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        setName(initial?.name ?? '');
        setDescription(initial?.description ?? '');
    }, [initial]);

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit({ name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Name <span className="text-red-600">*</span></label>
                <input
                    className="mt-1 w-full border rounded-md p-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea
                    className="mt-1 w-full border rounded-md p-2"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                />
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
        </form>
    );
};

export default RoleForm;
