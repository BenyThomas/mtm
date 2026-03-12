import axios from 'axios';

/**
 * Shared Axios instance for the Gateway (digital-platform) back-office APIs.
 *
 * Auth model (single staff user):
 * - Reuse the MTM-stored Fineract Basic auth key (base64(username:password))
 * - Forward Fineract-Platform-TenantId so the Gateway can validate against the same tenant
 *
 * Base URL:
 * - VITE_GATEWAY_API_URL: https://... (gateway origin)
 * - fallback: Vite proxy /gw/api/v1
 */
const gatewayOrigin = import.meta.env.VITE_GATEWAY_API_URL
  ? String(import.meta.env.VITE_GATEWAY_API_URL).replace(/\/+$/, '')
  : '';
const baseURL = gatewayOrigin ? `${gatewayOrigin}/api/v1` : '/gw/api/v1';

const gatewayApi = axios.create({ baseURL });

function read(key) {
  const ls = localStorage.getItem(key);
  if (ls != null) return ls;
  return sessionStorage.getItem(key);
}

gatewayApi.interceptors.request.use((config) => {
  const tenant =
    localStorage.getItem('fineract_tenant') ||
    import.meta.env.VITE_TENANT ||
    'default';

  const authKey = read('fineract_auth_key') || null;

  config.headers = config.headers ?? {};
  config.headers['Fineract-Platform-TenantId'] = tenant;

  if (authKey) {
    config.headers['Authorization'] = `Basic ${authKey}`;
  } else {
    delete config.headers?.Authorization;
  }

  return config;
});

gatewayApi.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default gatewayApi;
