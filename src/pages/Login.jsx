import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, User, Building2 } from 'lucide-react';

import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_TENANT, ENV_TENANT, resolveTenant, TENANT_EDITABLE } from '../config/runtime';

const Login = () => {
    const quotes = [
        'Behind every well-managed loan is a life, a business, and a future being strengthened.',
        'Every transaction you process can open a door for someone\u2019s tomorrow.',
        'Small loans, handled with excellence, can create big changes in people\u2019s lives.',
        'Accuracy in our work today creates confidence for our clients tomorrow.',
        'Our daily work turns capital into opportunity for those who need it most.',
    ];

    const { login } = useAuth();
    const { addToast } = useToast();

    const [username, setUsername] = useState(localStorage.getItem('last_login_user') || '');
    const [password, setPassword] = useState('');
    const [tenant, setTenant] = useState(resolveTenant({ inputTenant: ENV_TENANT || DEFAULT_TENANT }));
    const [remember, setRemember] = useState(true);
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [quoteIndex, setQuoteIndex] = useState(0);

    const showTenantField = TENANT_EDITABLE;

    useEffect(() => {
        const timer = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % quotes.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [quotes.length]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password, remember, showTenantField ? tenant : undefined);
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
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/55 backdrop-blur-md p-8 shadow-[0_18px_60px_-42px_rgba(2,132,199,0.9)] dark:border-slate-700/70 dark:bg-slate-900/35">
                    <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
                            The Gateway
                        </div>

                        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Sign in to manage microfinance operations.
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Fast access to clients, loans, reporting, and gateway operations, in one place.
                        </p>
                        <blockquote className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm italic leading-6 text-slate-700 transition-all duration-500 dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-200">
                            "{quotes[quoteIndex]}"
                        </blockquote>

                        <div className="mt-8 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 h-8 w-8 rounded-xl bg-white/70 ring-1 ring-slate-200/70 grid place-items-center dark:bg-slate-900/60 dark:ring-slate-700/70">
                                    <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                                </div>
                                <div>
                                    <div className="font-semibold">Careers</div>
                                    <div className="text-slate-600 dark:text-slate-300">Great careers are built the same way great businesses grow: with discipline, vision, and consistent effort every day.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 h-8 w-8 rounded-xl bg-white/70 ring-1 ring-slate-200/70 grid place-items-center dark:bg-slate-900/60 dark:ring-slate-700/70">
                                    <Lock className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                                </div>
                                <div>
                                    <div className="font-semibold">Growth</div>
                                    <div className="text-slate-600 dark:text-slate-300">The path to growth is simple: work with purpose, learn with humility, and lead with integrity.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="p-8 rounded-3xl">
                    <div className="mb-6">
                        <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Enter your credentials to continue.</div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Username</label>
                            <div className="mt-1 relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    autoFocus
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-xl border px-10 py-2.5 text-sm dark:bg-slate-800/50 dark:border-slate-600"
                                    placeholder="e.g. mifos"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl border px-10 py-2.5 pr-12 text-sm dark:bg-slate-800/50 dark:border-slate-600"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((s) => !s)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {showTenantField ? (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Tenant</label>
                                <input
                                    value={tenant}
                                    onChange={(e) => setTenant(e.target.value)}
                                    className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-slate-800/50 dark:border-slate-600"
                                    placeholder={DEFAULT_TENANT}
                                    required
                                />
                                {!ENV_TENANT ? (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Tip: set <code>VITE_TENANT</code> to lock this per environment.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex items-center justify-between pt-1">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="rounded border-slate-300"
                                />
                                Remember me
                            </label>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Use your staff account</div>
                        </div>

                        {error ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                                {error}
                            </div>
                        ) : null}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                        Having trouble? Contact your administrator for access.
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Login;






