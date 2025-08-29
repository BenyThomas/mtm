import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Authentication context for the Money Trust Microfinance portal.
 *
 * This provider stores whether the user is authenticated, manages dev basic
 * authentication credentials and exposes helper methods to log in, log out
 * and switch tenants.  Credentials are persisted in localStorage when
 * "remember me" is checked, otherwise they are kept in sessionStorage.
 * The tenant identifier is stored in localStorage under `fineract_tenant`
 * so that the Axios interceptor can always add the correct header.
 */
const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    // Determine whether credentials exist at load time.  Either localStorage
    // or sessionStorage can hold the dev username/password.
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const username =
            localStorage.getItem('fineract_username') ||
            sessionStorage.getItem('fineract_username');
        const password =
            localStorage.getItem('fineract_password') ||
            sessionStorage.getItem('fineract_password');
        return Boolean(username && password);
    });
    // Current tenant is stored in localStorage to persist across reloads.  Fall back
    // to the build‑time environment variable if nothing is stored.
    const [tenant, setTenant] = useState(() => {
        return (
            localStorage.getItem('fineract_tenant') ||
            import.meta.env.VITE_TENANT ||
            'default'
        );
    });

    /**
     * Sign in the user with the provided credentials.  When `remember` is true
     * credentials are stored in localStorage; otherwise they are stored in
     * sessionStorage for the duration of the tab.  After updating storage the
     * auth state is toggled and the caller is responsible for redirecting.
     *
     * @param {string} username
     * @param {string} password
     * @param {boolean} remember
     */
    const login = useCallback((username, password, remember) => {
        if (remember) {
            localStorage.setItem('fineract_username', username);
            localStorage.setItem('fineract_password', password);
        } else {
            sessionStorage.setItem('fineract_username', username);
            sessionStorage.setItem('fineract_password', password);
        }
        setIsAuthenticated(true);
    }, []);

    /**
     * Clear credentials from both localStorage and sessionStorage and reset
     * the auth state.  Redirects to /login after completion.
     */
    const logout = useCallback(() => {
        localStorage.removeItem('fineract_username');
        localStorage.removeItem('fineract_password');
        sessionStorage.removeItem('fineract_username');
        sessionStorage.removeItem('fineract_password');
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
    }, [navigate]);

    /**
     * Change the current tenant.  The tenant identifier is persisted in
     * localStorage so that the Axios interceptor picks it up on subsequent
     * requests.  Components listening to this context can re-render when the
     * tenant changes.
     *
     * @param {string} newTenant
     */
    const switchTenant = useCallback((newTenant) => {
        setTenant(newTenant);
        localStorage.setItem('fineract_tenant', newTenant);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                login,
                logout,
                tenant,
                switchTenant,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook for consuming the authentication context.
 * Throws an error if used outside of a provider.
 */
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};
