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

    // apply theme
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
        <header className="h-14 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-between px-3 border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
                <button
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation"
                >☰</button>
                <span className="font-semibold">MTM</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                    title="Toggle theme"
                    onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                >
                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
          Tenant: <strong>{tenant}</strong>
        </span>
                <span className="text-sm hidden sm:inline">{displayName}</span>
                <Button variant="secondary" onClick={logout}>Logout</Button>
            </div>
        </header>
    );
};

export default Header;
