import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from './ToastContext';

/**
 * AuthContext using Fineract /authentication endpoint.
 * Stores base64 auth key returned by the server and uses it for subsequent requests.
 */

const AuthContext = createContext(undefined);

const clearCreds = () => {
    localStorage.removeItem('fineract_auth_key');
    localStorage.removeItem('fineract_username');
    sessionStorage.removeItem('fineract_auth_key');
    sessionStorage.removeItem('fineract_username');
};

const hasAuth = () =>
    !!(localStorage.getItem('fineract_auth_key') || sessionStorage.getItem('fineract_auth_key'));

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [isAuthenticated, setIsAuthenticated] = useState(hasAuth());
    const [checking, setChecking] = useState(false);
    const [tenant, setTenant] = useState(
        localStorage.getItem('fineract_tenant') || import.meta.env.VITE_TENANT || 'default'
    );
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('fineract_user') || '{}'); } catch { return {}; }
    });

    // When axios emits 401, force logout
    useEffect(() => {
        const h = () => {
            clearCreds();
            setIsAuthenticated(false);
            setUser({});
            addToast('Session expired. Please sign in again.', 'warning');
            navigate('/login', { replace: true });
        };
        window.addEventListener('auth:unauthorized', h);
        return () => window.removeEventListener('auth:unauthorized', h);
    }, [navigate, addToast]);

    const switchTenant = useCallback((newTenant) => {
        const t = (newTenant || '').trim() || 'default';
        setTenant(t);
        localStorage.setItem('fineract_tenant', t);
    }, []);

    /**
     * Login via Fineract /authentication
     * Stores auth key (base64 user:pass). No password is stored in plain text.
     */
    const login = useCallback(async (username, password, remember, tenantInput) => {
        setChecking(true);
        setIsAuthenticated(false);
        setUser({});
        clearCreds();

        const t = (tenantInput || tenant || 'default').trim();
        localStorage.setItem('fineract_tenant', t);
        setTenant(t);

        try {
            // Use a direct axios call that still carries tenant header (set by interceptor)
            const res = await api.post('/authentication?returnClientList=false', {
                username: username.trim(),
                password,
            });

            if (!res?.data?.authenticated || !res?.data?.base64EncodedAuthenticationKey) {
                throw new Error('Authentication failed');
            }

            const authKey = res.data.base64EncodedAuthenticationKey; // base64(username:password)
            const targetStore = remember ? localStorage : sessionStorage;
            targetStore.setItem('fineract_auth_key', authKey);
            targetStore.setItem('fineract_username', username.trim());

            // Save some display info (office, roles, etc.) in localStorage for header badge
            localStorage.setItem('fineract_user', JSON.stringify({
                username: res.data.username,
                officeName: res.data.officeName,
                staffDisplayName: res.data.staffDisplayName,
                roles: res.data.roles || [],
                permissions: res.data.permissions || '',
            }));
            setUser({
                username: res.data.username,
                officeName: res.data.officeName,
                staffDisplayName: res.data.staffDisplayName,
                roles: res.data.roles || [],
                permissions: res.data.permissions || '',
            });

            setIsAuthenticated(true);
            addToast('Welcome back', 'success');
            navigate('/', { replace: true });
        } catch (e) {
            clearCreds();
            const msg =
                e?.response?.data?.errors?.[0]?.defaultUserMessage ||
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Invalid username or password';
            throw new Error(msg);
        } finally {
            setChecking(false);
        }
    }, [tenant, navigate, addToast]);

    const logout = useCallback(() => {
        clearCreds();
        setIsAuthenticated(false);
        setUser({});
        addToast('Signed out', 'success');
        navigate('/login', { replace: true });
    }, [navigate, addToast]);

    const value = useMemo(() => ({
        isAuthenticated, checking, tenant, user,
        switchTenant, login, logout,
    }), [isAuthenticated, checking, tenant, user, switchTenant, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
