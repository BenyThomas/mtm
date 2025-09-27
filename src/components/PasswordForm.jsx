import React, { useState } from 'react';
import Button from './Button';

/** Props: onSubmit({ password, repeatPassword }), submitting */
const PasswordForm = ({ onSubmit, submitting }) => {
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    const handle = async (e) => {
        e.preventDefault();
        await onSubmit({ password, repeatPassword: repeatPassword || password });
    };

    return (
        <form onSubmit={handle} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">New Password</label>
                <input
                    type="password"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                />
            </div>
            <div>
                <label className="block text-sm font-medium">Repeat Password</label>
                <input
                    type="password"
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    disabled={submitting}
                />
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? 'Changing…' : 'Change Password'}</Button>
        </form>
    );
};

export default PasswordForm;
