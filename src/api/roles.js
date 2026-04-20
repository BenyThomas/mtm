import api from './axios';

const normalizePermissionCode = (value) => String(value || '').trim();

/** GET /v1/roles */
export const listRoles = async () => {
    const { data } = await api.get('/roles');
    const list = Array.isArray(data) ? data : (data?.pageItems || []);
    return list.map(r => ({
        id: r.id,
        name: r.name || '',
        description: r.description || '',
        enabled: r.enabled ?? true,
    }));
};

/** POST /v1/roles */
export const createRole = async (payload) => {
    const { data } = await api.post('/roles', payload);
    return data;
};

/** PUT /v1/roles/{roleId} */
export const updateRole = async (roleId, payload) => {
    const { data } = await api.put(`/roles/${roleId}`, payload);
    return data;
};

/** DELETE /v1/roles/{roleId} */
export const deleteRole = async (roleId) => api.delete(`/roles/${roleId}`);

/** POST /v1/roles/{roleId}  (enable/disable) */
export const setRoleEnabled = async (roleId, enabled) => {
    const { data } = await api.post(`/roles/${roleId}`, { enabled: Boolean(enabled) });
    return data;
};

/** GET /v1/roles/{roleId}/permissions  -> permissions for role */
export const getRolePermissions = async (roleId) => {
    const { data } = await api.get(`/roles/${roleId}/permissions`);
    const arr = Array.isArray(data)
        ? data
        : (data?.permissionUsageData || data?.permissions || []);
    return arr.map((p, idx) => ({
        id: p.id ?? idx,
        rawCode: String(p.code || p.actionName || ''),
        code: normalizePermissionCode(p.code || p.actionName || ''),
        entityName: String(p.entityName || p.grouping || '').trim(),
        actionName: String(p.actionName || '').trim(),
        description: String(p.description || p.code || p.actionName || '').trim(),
        makerCheckerEnabled: Boolean(p.makerCheckerEnabled ?? p.selected ?? false),
        selected: Boolean(p.selected ?? false),
    }));
};

/** PUT /v1/roles/{roleId}/permissions  -> assign permissions to role */
export const updateRolePermissions = async (roleId, permissionsMap) => {
    const { data } = await api.put(`/roles/${roleId}/permissions`, {
        permissions: permissionsMap,
    });
    return data;
};
