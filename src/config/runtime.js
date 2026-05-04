import { getTenantConfig } from './tenant-config';

// Centralized runtime config helpers (Vite: import.meta.env.VITE_* are build-time).
const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

export const ENV_TENANT = String(import.meta.env.VITE_UI_TENANT ?? '').trim();

// If a tenant is provided via env, default to locking it down (no user override).
// Set VITE_TENANT_EDITABLE=true to allow overriding via UI/localStorage.
export const TENANT_EDITABLE = truthy(import.meta.env.VITE_TENANT_EDITABLE) || !ENV_TENANT;

export const DEFAULT_UI_TENANT = 'epikx';
export const DEFAULT_FINERACT_TENANT = String(import.meta.env.VITE_DEFAULT_TENANT ?? import.meta.env.VITE_TENANT ?? 'default').trim();

export const DEFAULT_TENANT = ENV_TENANT || DEFAULT_UI_TENANT;

export function resolveTenant({ inputTenant } = {}) {
  if (!TENANT_EDITABLE && ENV_TENANT) return ENV_TENANT;

  const stored = localStorage.getItem('fineract_tenant');
  const t = String(inputTenant ?? stored ?? ENV_TENANT ?? DEFAULT_UI_TENANT).trim();
  return t || DEFAULT_UI_TENANT;
}

export function resolveFineractTenantId({ inputTenant } = {}) {
  const uiTenantId = resolveTenant({ inputTenant });
  const config = getTenantConfig(uiTenantId);
  
  // If the config explicitly defines a fineractTenantId, use it.
  // This allows mapping 'epikx' -> 'default' and 'tpf' -> 'tpf' (or whatever is in config)
  if (config?.fineractTenantId) {
      // Special case: if the mapped ID is 'default' but we have an environment override for the default tenant, use the override.
      if (config.fineractTenantId === 'default' && DEFAULT_FINERACT_TENANT !== 'default') {
          return DEFAULT_FINERACT_TENANT;
      }
      return config.fineractTenantId;
  }

  return DEFAULT_FINERACT_TENANT;
}

export function persistTenant(tenant) {
  if (!TENANT_EDITABLE) return;
  const t = String(tenant ?? '').trim();
  if (!t) return;
  localStorage.setItem('fineract_tenant', t);
}

