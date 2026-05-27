import { getTenantConfig } from './tenant-config';

// Centralized runtime config helpers (Vite: import.meta.env.VITE_* are build-time).
const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

export const ENV_TENANT = String(import.meta.env.VITE_UI_TENANT ?? '').trim();

// If a tenant is provided via env, default to locking it down (no user override).
// Set VITE_TENANT_EDITABLE=true to allow overriding via UI/localStorage.
export const TENANT_EDITABLE = truthy(import.meta.env.VITE_TENANT_EDITABLE);

export const DEFAULT_UI_TENANT = 'epikx';
export const DEFAULT_FINERACT_TENANT = String(import.meta.env.VITE_DEFAULT_TENANT ?? 'default').trim();

export const DEFAULT_TENANT = ENV_TENANT || DEFAULT_UI_TENANT;

export function resolveTenant({ inputTenant } = {}) {
  const stored = localStorage.getItem('fineract_tenant');
  const t = String(inputTenant ?? stored ?? ENV_TENANT ?? DEFAULT_UI_TENANT).trim();
  const resolved = t || DEFAULT_UI_TENANT;

  if (!TENANT_EDITABLE && ENV_TENANT) return ENV_TENANT;
  return resolved;
}

export function resolveFineractTenantId({ inputTenant } = {}) {
  const uiTenantId = resolveTenant({ inputTenant });
  const config = getTenantConfig(uiTenantId);

  // If the config explicitly defines a fineractTenantId, use it.
  if (config?.fineractTenantId) {
    return config.fineractTenantId;
  }

  // Fallback to environment-defined default.
  return DEFAULT_FINERACT_TENANT;
}

export function persistTenant(tenant) {
  if (!TENANT_EDITABLE) return;
  const t = String(tenant ?? '').trim();
  if (!t) return;
  localStorage.setItem('fineract_tenant', t);
}

