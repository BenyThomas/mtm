import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import gatewayApi from '../api/gatewayAxios';
import { useToast } from './ToastContext';
import { DEFAULT_TENANT, ENV_TENANT, persistTenant, resolveTenant, TENANT_EDITABLE } from '../config/runtime';
import { getTenantConfig } from '../config/tenant-config';

/**
 * AuthContext (Fineract)
 * - Auth via /authentication
 * - If permissions not included in response, hydrate from /users + /roles/{id}/permissions
 * - Supports wildcards: ALL_FUNCTIONS, ALL_FUNCTIONS_READ
 * - can / canAny / canAll helpers
 */

const AuthContext = createContext(undefined);

const STORAGE_KEYS = {
    authKey: 'fineract_auth_key',
    username: 'fineract_username',
    tenant: 'fineract_tenant',
    user: 'fineract_user',
};

const clearCreds = () => {
    localStorage.removeItem(STORAGE_KEYS.authKey);
    localStorage.removeItem(STORAGE_KEYS.username);
    localStorage.removeItem(STORAGE_KEYS.user);
    sessionStorage.removeItem(STORAGE_KEYS.authKey);
    sessionStorage.removeItem(STORAGE_KEYS.username);
};

const hasAuth = () =>
    !!(
        localStorage.getItem(STORAGE_KEYS.authKey) ||
        sessionStorage.getItem(STORAGE_KEYS.authKey)
    );

/** Extract permissions from roles array if present */
const extractRolePerms = (roles) => {
    if (!Array.isArray(roles)) return [];
    const out = [];
    for (const r of roles) {
        const perms = r?.permissions;
        if (!perms) continue;
        if (Array.isArray(perms)) {
            for (const p of perms) {
                if (!p) continue;
                const code =
                    typeof p === 'string' ? p : (p.code || p.actionName || p.name);
                if (code) out.push(code);
            }
        }
    }
    return out;
};

/** Normalize any server form (string/array/map) into a Set of UPPERCASE codes */
const normalizePermissions = (raw) => {
    const set = new Set();
    if (!raw) return set;

    const add = (code) => {
        if (!code) return;
        set.add(String(code).toUpperCase().trim());
    };

    if (Array.isArray(raw)) {
        raw.forEach((x) =>
            add(typeof x === 'string' ? x : (x.code || x.actionName || x.name))
        );
        return set;
    }

    if (typeof raw === 'string') {
        raw
            .split(/[,\s]+/g)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach(add);
        return set;
    }

    if (typeof raw === 'object') {
        if (Array.isArray(raw.permissions)) {
            raw.permissions.forEach((x) =>
                add(typeof x === 'string' ? x : (x.code || x.actionName || x.name))
            );
            return set;
        }
        if (raw.permissions && typeof raw.permissions === 'object') {
            Object.keys(raw.permissions).forEach(add);
            return set;
        }
    }

    return set;
};

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [isAuthenticated, setIsAuthenticated] = useState(hasAuth());
    const [checking, setChecking] = useState(false);
    const [tenant, setTenant] = useState(
        resolveTenant() || DEFAULT_TENANT
    );
    const [tenantConfig, setTenantConfig] = useState(() => getTenantConfig(tenant));

    useEffect(() => {
        const config = getTenantConfig(tenant);
        setTenantConfig(config);
        
        if (config && config.theme) {
            const root = document.documentElement;
            root.style.setProperty('--tenant-primary', config.theme.primary);
            root.style.setProperty('--tenant-secondary', config.theme.secondary);
            root.style.setProperty('--tenant-accent', config.theme.accent);
            root.style.setProperty('--tenant-accent-light', config.theme.accentLight);
            
            document.title = config.portalName || "Trust Management";

            // Update Favicon
            const favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.href = config.faviconUrl || config.logoUrl || "/favicon.png";
            }
        }
    }, [tenant]);
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || '{}');
        } catch {
            return {};
        }
    });

    // Global 401 -> force logout
    useEffect(() => {
        const onUnauthorized = () => {
            clearCreds();
            setIsAuthenticated(false);
            setUser({});
            addToast('Session expired. Please sign in again.', 'warning');
            navigate('/login', { replace: true });
        };
        window.addEventListener('auth:unauthorized', onUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
    }, [navigate, addToast]);

    const switchTenant = useCallback((newTenant) => {
        if (!TENANT_EDITABLE && ENV_TENANT) {
            // Deployment-locked tenant: ignore UI-driven switches.
            setTenant(ENV_TENANT);
            return;
        }
        const t = resolveTenant({ inputTenant: newTenant });
        setTenant(t);
        persistTenant(t);
    }, []);

    /** Try best-effort: GET /users?username=... (if supported); else GET /users and find locally */
    const findUserByUsername = useCallback(async (username) => {
        const uname = String(username || '').trim();
        if (!uname) return null;

        // Attempt direct filter (some Fineract builds support it)
        try {
            const r = await api.get('/users', { params: { username: uname, limit: 50, offset: 0 } });
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const hit = list.find(u => (u?.username || '').toLowerCase() === uname.toLowerCase());
            if (hit) return hit;
        } catch (_) { /* ignore and fallback */ }

        // Fallback: list and scan
        try {
            const r = await api.get('/users', { params: { limit: 200, offset: 0 } });
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const hit = list.find(u => (u?.username || '').toLowerCase() === uname.toLowerCase());
            return hit || null;
        } catch (e) {
            if (import.meta.env.DEV) console.warn('[Auth] Failed to load users list:', e);
            return null;
        }
    }, []);

    const findStaffById = useCallback(async (staffId) => {
        const id = Number(staffId);
        if (!Number.isFinite(id) || id <= 0) return null;
        try {
            const r = await gatewayApi.get(`/ops/session/staff/${id}`);
            return r?.data?.data || r?.data || null;
        } catch (e) {
            if (import.meta.env.DEV) console.warn(`[Auth] Failed to load staff ${id}:`, e);
            return null;
        }
    }, []);

    /** Load role permissions for a set of role IDs via /roles/{id}/permissions */
    const loadPermissionsForRoles = useCallback(async (roleIds = []) => {
        const codes = new Set();
        for (const rid of roleIds) {
            try {
                const r = await api.get(`/roles/${rid}/permissions`);
                const arr = Array.isArray(r?.data) ? r.data : (r?.data?.permissions || r?.data?.pageItems || []);
                for (const p of arr) {
                    const selected = p?.selected ?? p?.enabled ?? p?.checked ?? false;
                    if (!selected) continue;
                    const code = p?.code || p?.actionName || p?.name || (typeof p === 'string' ? p : null);
                    if (code) codes.add(String(code).toUpperCase());
                }
            } catch (e) {
                if (import.meta.env.DEV) console.warn(`[Auth] Failed to load role permissions for role ${rid}:`, e);
            }
        }
        return Array.from(codes);
    }, []);

    /**
     * Login via Fineract /authentication
     * If permissions missing from response, hydrate from /users + /roles/{id}/permissions.
     */
    const login = useCallback(
        async (username, password, remember, tenantInput) => {
            setChecking(true);
            setIsAuthenticated(false);
            setUser({});
            clearCreds();

            const t = resolveTenant({ inputTenant: tenantInput || tenant });
            setTenant(t);
            persistTenant(t);

            try {
                const res = await api.post('/authentication?returnClientList=false', {
                    username: String(username || '').trim(),
                    password,
                });

                if (
                    !res?.data?.authenticated ||
                    !res?.data?.base64EncodedAuthenticationKey
                ) {
                    throw new Error('Authentication failed');
                }

                // Dev-only logs (never log auth keys in production).
                if (import.meta.env.DEV) {
                    const safe = { ...(res?.data || {}) };
                    if (safe.base64EncodedAuthenticationKey) safe.base64EncodedAuthenticationKey = '[redacted]';
                    console.groupCollapsed('%c[Fineract] /authentication', 'color:#0ea5e9;font-weight:bold;');
                    console.debug('payload:', safe);
                    console.groupEnd();
                }


                const authKey = res.data.base64EncodedAuthenticationKey; // base64(user:pass)
                const targetStore = remember ? localStorage : sessionStorage;
                targetStore.setItem(STORAGE_KEYS.authKey, authKey);
                targetStore.setItem(STORAGE_KEYS.username, String(username || '').trim());

                // Build initial user object from auth response
                let userObj = {
                    username: res.data.username,
                    userId: res.data.userId,
                    officeName: res.data.officeName,
                    officeId: res.data.officeId,
                    staffDisplayName: res.data.staffDisplayName,
                    staffId: res.data.staffId || null,
                    roles: res.data.roles || [],
                    permissionsRaw: res.data.permissions || '', // may be empty/undefined
                    isLoanOfficer: false,
                    isGatewayOnlyLoanOfficer: false,
                };

                // If no permissions in /authentication, hydrate:
                const rawPermsSet = normalizePermissions(userObj.permissionsRaw);
                if (rawPermsSet.size === 0) {
                    // 1) find user id
                    const u = await findUserByUsername(userObj.username);
                    const roleIds =
                        Array.isArray(u?.selectedRoles) && u.selectedRoles.length
                            ? u.selectedRoles.map(r => r.id)
                            : Array.isArray(u?.roles) && u.roles.length
                                ? u.roles.map(r => r.id)
                                : Array.isArray(userObj.roles) && userObj.roles.length
                                    ? userObj.roles.map(r => r.id)
                                    : [];

                    // 2) load permissions per role
                    const codes = await loadPermissionsForRoles(roleIds);
                    // attach to userObj for normalization downstream
                    userObj = {
                        ...userObj,
                        // keep roles from /authentication if present, else from /users
                        roles: userObj.roles?.length ? userObj.roles : (u?.roles || u?.selectedRoles || []),
                        // store as array for normalizePermissions()
                        permissionsRaw: codes,
                        isLoanOfficer: Boolean(u?.isLoanOfficer),
                        staffId: u?.staffId || u?.staff?.id || null,
                    };

                    if (import.meta.env.DEV) {
                        console.groupCollapsed('%c[Auth] Hydrated permissions', 'color:#22c55e;font-weight:bold;');
                        console.debug('username:', userObj.username);
                        console.debug('roleIds:', roleIds);
                        console.debug('codes:', codes);
                        console.groupEnd();
                    }
                }

                if (!userObj.isLoanOfficer) {
                    const hydratedUser = await findUserByUsername(userObj.username);
                    if (hydratedUser) {
                        userObj = {
                            ...userObj,
                            isLoanOfficer: Boolean(hydratedUser?.isLoanOfficer),
                            staffId: userObj.staffId || hydratedUser?.staffId || hydratedUser?.staff?.id || null,
                        };
                    }
                }

                const linkedStaffId = userObj.staffId;
                if (linkedStaffId) {
                    const linkedStaff = await findStaffById(linkedStaffId);
                    if (linkedStaff) {
                        userObj = {
                            ...userObj,
                            staffId: linkedStaffId,
                            staffDisplayName: linkedStaff?.displayName || userObj.staffDisplayName,
                            linkedStaffName: linkedStaff?.displayName || userObj.staffDisplayName || '',
                            linkedStaffPhone: linkedStaff?.mobileNo || '',
                            linkedStaffEmail: linkedStaff?.email || '',
                            linkedStaffOfficeId: linkedStaff?.officeId || userObj.officeId || null,
                            linkedStaffOfficeName: linkedStaff?.officeName || userObj.officeName || '',
                            linkedStaffIsLoanOfficer: Boolean(linkedStaff?.isLoanOfficer),
                            isGatewayOnlyLoanOfficer: Boolean(userObj.isLoanOfficer || linkedStaff?.isLoanOfficer),
                        };
                    } else {
                        userObj = {
                            ...userObj,
                            isGatewayOnlyLoanOfficer: Boolean(userObj.isLoanOfficer),
                        };
                    }
                } else {
                    userObj = {
                        ...userObj,
                        isGatewayOnlyLoanOfficer: Boolean(userObj.isLoanOfficer),
                    };
                }

                // Persist & set state
                localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userObj));
                setUser(userObj);

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
        },
        [tenant, navigate, addToast, findUserByUsername, loadPermissionsForRoles]
    );

    const logout = useCallback(() => {
        clearCreds();
        setIsAuthenticated(false);
        setUser({});
        addToast('Signed out', 'success');
        navigate('/login', { replace: true });
    }, [navigate, addToast]);

    /** Build the final permission set (root + roles) */
    const permSet = useMemo(() => {
        const base = normalizePermissions(user?.permissionsRaw);
        extractRolePerms(user?.roles).forEach((c) => {
            if (c) base.add(String(c).toUpperCase());
        });
        return base;
    }, [user?.permissionsRaw, user?.roles]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const permissions = Array.from(permSet).sort();
        console.groupCollapsed('[MTM Auth] Effective permissions');
        console.log('username:', user?.username || '-');
        console.log('staffDisplayName:', user?.staffDisplayName || '-');
        console.log('staffId:', user?.staffId || '-');
        console.log('isLoanOfficer(user):', Boolean(user?.isLoanOfficer));
        console.log('isLoanOfficer(linkedStaff):', Boolean(user?.linkedStaffIsLoanOfficer));
        console.log('isGatewayOnlyLoanOfficer:', Boolean(user?.isGatewayOnlyLoanOfficer));
        console.log('roles:', Array.isArray(user?.roles) ? user.roles.map((r) => r?.name || r?.code || r?.id).filter(Boolean) : []);
        console.log('permissions:', permissions);
        console.groupEnd();
    }, [
        isAuthenticated,
        permSet,
        user?.username,
        user?.staffDisplayName,
        user?.staffId,
        user?.isLoanOfficer,
        user?.linkedStaffIsLoanOfficer,
        user?.isGatewayOnlyLoanOfficer,
        user?.roles,
    ]);

    // Wildcards
    const hasAll = useMemo(() => permSet.has('ALL_FUNCTIONS'), [permSet]);
    const hasAllRead = useMemo(() => permSet.has('ALL_FUNCTIONS_READ'), [permSet]);
    const READ_PREFIX = useMemo(() => /^(READ|VIEW|LIST|SEARCH|DOWNLOAD)/i, []);

    /** Permission helpers */
    const can = useCallback(
        (code) => {
            if (!code) return true;
            const c = String(code).toUpperCase();

            // superuser
            if (hasAll) return true;

            // read wildcard covers all read-ish actions
            if (hasAllRead && READ_PREFIX.test(c)) return true;

            // Project-specific wildcard for Gateway back-office permissions
            if (permSet.has('GW_OPS_ALL') && c.startsWith('GW_OPS_')) return true;

            return permSet.has(c);
        },
        [permSet, hasAll, hasAllRead, READ_PREFIX]
    );

    const canAny = useCallback((codes = []) => codes.some((c) => can(c)), [can]);
    const canAll = useCallback((codes = []) => codes.every((c) => can(c)), [can]);

    const value = useMemo(
        () => ({
            isAuthenticated,
            checking,
            tenant,
            tenantConfig,
            user,
            switchTenant,
            login,
            logout,
            can,
            canAny,
            canAll,
        }),
        [isAuthenticated, checking, tenant, tenantConfig, user, switchTenant, login, logout, can, canAny, canAll]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
