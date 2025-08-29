import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Dev login: no API call here.
 * We just persist creds (respecting "Remember me"), set auth = true,
 * show a toast, and redirect to '/'.
 */
const Login = () => {
    const { isAuthenticated, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // No network request — we trust dev creds locally.
            login(username, password, remember);
            addToast('Welcome back', 'success');
            navigate('/', { replace: true });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <Card>
                <h2 className="text-xl font-bold mb-4">Sign In</h2>
                <form onSubmit={handleSubmit} className="space-y-4 w-80">
                    <div>
                        <label className="block text-sm font-medium">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 w-full border rounded-md p-2 pr-10 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-500 dark:text-gray-400 focus:outline-none"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="remember"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="remember" className="ml-2 block text-sm">
                            Remember me
                        </label>
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default Login;
