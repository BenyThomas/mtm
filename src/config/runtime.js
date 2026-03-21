// Centralized runtime config helpers (Vite: import.meta.env.VITE_* are build-time).
const truthy = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

export const ENV_TENANT = String(import.meta.env.VITE_TENANT ?? '').trim();

// If a tenant is provided via env, default to locking it down (no user override).
// Set VITE_TENANT_EDITABLE=true to allow overriding via UI/localStorage.
export const TENANT_EDITABLE = truthy(import.meta.env.VITE_TENANT_EDITABLE) || !ENV_TENANT;

export const DEFAULT_TENANT = ENV_TENANT || 'default';

export function resolveTenant({ inputTenant } = {}) {
  if (!TENANT_EDITABLE && ENV_TENANT) return ENV_TENANT;

  const stored = localStorage.getItem('fineract_tenant');
  const t = String(inputTenant ?? stored ?? ENV_TENANT ?? 'default').trim();
  return t || 'default';
}

export function persistTenant(tenant) {
  if (!TENANT_EDITABLE) return;
  const t = String(tenant ?? '').trim();
  if (!t) return;
  localStorage.setItem('fineract_tenant', t);
}

