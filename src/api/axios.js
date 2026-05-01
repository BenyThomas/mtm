import axios from 'axios';
import { resolveTenant } from '../config/runtime';

/**
 * Shared Axios instance for Fineract.
 * - Base URL from .env (VITE_API_URL) → .../api/v1, fallback to Vite proxy /api/api/v1
 * - Always injects Fineract-Platform-TenantId
 * - Uses Basic Authorization from stored Fineract auth key
 * - Emits "auth:unauthorized" on HTTP 401
 */
const fineractOrigin = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
    : '';
const baseURL = import.meta.env.DEV
    ? '/api/api/v1'
    : (fineractOrigin ? `${fineractOrigin}/api/v1` : '/api/api/v1');

const api = axios.create({ baseURL });

function read(key) {
    // Prefer localStorage, then sessionStorage
    const ls = localStorage.getItem(key);
    if (ls != null) return ls;
    return sessionStorage.getItem(key);
}

api.interceptors.request.use((config) => {
    const tenant = resolveTenant();

    const authKey =
        read('fineract_auth_key') ||
        null;

    config.headers = config.headers ?? {};
    config.headers['Fineract-Platform-TenantId'] = tenant;

    if (authKey) {
        // Server returns base64(username:password)
        config.headers['Authorization'] = `Basic ${authKey}`;
    } else {
        delete config.headers?.Authorization;
    }

    return config;
});

api.interceptors.response.use(
    (resp) => resp,
    (error) => {
        if (error?.response?.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;
