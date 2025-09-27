import api from './axios';

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
    const arr = Array.isArray(data) ? data : (data?.permissions || []);
    return arr.map((p, idx) => ({
        id: p.id ?? idx,
        code: p.code || p.actionName || '',
        entityName: p.entityName || p.grouping || '',
        actionName: p.actionName || '',
        makerCheckerEnabled: Boolean(p.makerCheckerEnabled ?? p.selected ?? false),
        selected: Boolean(p.selected ?? false),
    }));
};

/** PUT /v1/roles/{roleId}/permissions  -> assign permissions to role
 *  Sends a compact array of IDs (or codes) depending on your backend.
 */
export const updateRolePermissions = async (roleId, permissionIds) => {
    const { data } = await api.put(`/roles/${roleId}/permissions`, {
        permissions: permissionIds, // array<number>
    });
    return data;
};
