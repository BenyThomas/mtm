import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

const Header = ({ onToggleSidebar }) => {
    const { user, tenant, logout } = useAuth();

    const displayName = useMemo(() =>
        user?.staffDisplayName || user?.username || 'User', [user]);

    return (
        <header className="h-14 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
                <button
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation"
                >
                    ☰
                </button>
                <span className="font-semibold">Money Trust Microfinance</span>
            </div>

            <div className="flex items-center gap-3">
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
