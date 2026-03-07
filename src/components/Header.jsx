import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

const getInitialTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const Header = ({ onToggleSidebar }) => {
    const { user, tenant, logout } = useAuth();
    const [theme, setTheme] = useState(getInitialTheme());

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const displayName = useMemo(
        () => user?.staffDisplayName || user?.username || 'User',
        [user]
    );

    return (
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/55">
            <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-3 sm:px-5">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={onToggleSidebar}
                        aria-label="Toggle navigation"
                    >
                        Menu
                    </button>
                    <span className="text-base font-bold tracking-tight sm:text-lg">Epik Finance</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        className="rounded-xl border border-slate-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800"
                        title="Toggle theme"
                        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    >
                        {theme === 'dark' ? 'Dark' : 'Light'}
                    </button>
                    <span className="hidden rounded-xl border border-slate-200 bg-white/75 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 sm:inline-block">
                        Tenant: <strong>{tenant}</strong>
                    </span>
                    <span className="hidden text-sm text-slate-700 dark:text-slate-200 md:inline">{displayName}</span>
                    <Button variant="secondary" onClick={logout}>Logout</Button>
                </div>
            </div>
        </header>
    );
};

export default Header;
