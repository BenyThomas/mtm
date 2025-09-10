import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const Login = () => {
    const { login } = useAuth();
    const { addToast } = useToast();

    const [username, setUsername] = useState(localStorage.getItem('last_login_user') || '');
    const [password, setPassword] = useState('');
    const [tenant, setTenant] = useState(localStorage.getItem('fineract_tenant') || import.meta.env.VITE_TENANT || 'default');
    const [remember, setRemember] = useState(true);
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password, remember, tenant);
            localStorage.setItem('last_login_user', username.trim());
        } catch (err) {
            const msg = err?.message || 'Login failed';
            setError(msg);
            addToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <div className="text-2xl font-bold">Money Trust Microfinance</div>
                    <div className="text-sm text-gray-500 mt-1">Sign in to continue</div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Username</label>
                        <input
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g. mifos"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Password</label>
                        <div className="mt-1 flex">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex-1 border rounded-l-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((s) => !s)}
                                className="px-3 border rounded-r-md text-sm dark:bg-gray-700 dark:border-gray-600"
                                aria-label={showPw ? 'Hide password' : 'Show password'}
                            >
                                {showPw ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Tenant</label>
                        <input
                            value={tenant}
                            onChange={(e) => setTenant(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="default"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">Sent as <code>Fineract-Platform-TenantId</code> header.</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                            Remember me
                        </label>
                        <div className="text-xs text-gray-500">
                            Auth via <strong>/authentication</strong>
                        </div>
                    </div>

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-6 text-xs text-gray-500 text-center">
                    Backend: <code>{import.meta.env.VITE_API_URL || '(proxy /api)'}</code>
                </div>
            </Card>
        </div>
    );
};

export default Login;
