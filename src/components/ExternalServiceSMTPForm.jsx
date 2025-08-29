import React, { useEffect, useState } from 'react';
import Button from './Button';

const ExternalServiceSMTPForm = ({ initial, onSubmit, submitting }) => {
    const [username, setUser] = useState('');
    const [password, setPass] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('');
    const [useTLS, setUseTLS] = useState(true);
    const [showPass, setShowPass] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) {
            setUser('');
            setPass('');
            setHost('');
            setPort('');
            setUseTLS(true);
            setErrors({});
            return;
        }
        setUser(initial.username || '');
        setPass(initial.password || '');
        setHost(initial.host || '');
        setPort(
            initial.port != null && initial.port !== ''
                ? String(initial.port)
                : ''
        );
        setUseTLS(
            initial.useTLS != null
                ? Boolean(initial.useTLS)
                : true
        );
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!host.trim()) e.host = 'Host is required';
        if (!port || Number.isNaN(Number(port))) e.port = 'Valid port is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload = {
            host: host.trim(),
            port: Number(port),
            useTLS: Boolean(useTLS),
        };
        // Only send creds if provided (backend may keep previous if absent)
        if (username.trim()) payload.username = username.trim();
        if (password.trim()) payload.password = password.trim();
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Host *</label>
                    <input
                        value={host}
                        onChange={(e) => {
                            setHost(e.target.value);
                            if (errors.host) setErrors((x) => ({ ...x, host: '' }));
                        }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="smtp.example.com"
                    />
                    {errors.host ? <p className="text-xs text-red-500 mt-1">{errors.host}</p> : null}
                </div>
                <div>
                    <label className="block text-sm font-medium">Port *</label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={port}
                        onChange={(e) => {
                            setPort(e.target.value);
                            if (errors.port) setErrors((x) => ({ ...x, port: '' }));
                        }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="587"
                    />
                    {errors.port ? <p className="text-xs text-red-500 mt-1">{errors.port}</p> : null}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Username</label>
                    <input
                        value={username}
                        onChange={(e) => setUser(e.target.value)}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="noreply@yourdomain.tld"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Password {initial ? '(leave blank to keep unchanged)' : ''}</label>
                    <div className="flex gap-2">
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPass(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="••••••••"
                        />
                        <Button type="button" variant="secondary" onClick={() => setShowPass((s) => !s)}>
                            {showPass ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                </div>
            </div>

            <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={useTLS} onChange={(e) => setUseTLS(e.target.checked)} />
                Use TLS
            </label>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save SMTP Settings'}
                </Button>
            </div>
        </form>
    );
};

export default ExternalServiceSMTPForm;
