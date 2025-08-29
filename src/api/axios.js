import axios from 'axios';

/**
 * Axios instance configured for the Fineract API.
 * Base URL comes from .env -> VITE_API_URL, then we append /api/v1.
 * All requests automatically send Fineract-Platform-TenantId and (dev) Basic Auth.
 */
const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const api = axios.create({
  baseURL: `${base}/api/v1`,
});

// Inject tenant and Basic Auth before each request
api.interceptors.request.use((config) => {
  const tenant =
      localStorage.getItem('fineract_tenant') ||
      import.meta.env.VITE_TENANT ||
      'default';

  config.headers = config.headers ?? {};
  config.headers['Fineract-Platform-TenantId'] = tenant;

  const username =
      localStorage.getItem('fineract_username') ||
      sessionStorage.getItem('fineract_username');
  const password =
      localStorage.getItem('fineract_password') ||
      sessionStorage.getItem('fineract_password');

  if (username && password) {
    const token = btoa(`${username}:${password}`);
    config.headers['Authorization'] = `Basic ${token}`;
  }

  return config;
});

export default api;
