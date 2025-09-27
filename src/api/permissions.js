import api from './axios';

/** GET /v1/permissions — list all application permissions */
export const listPermissions = async () => {
    const { data } = await api.get('/permissions');
    // Normalize common shapes
    const items = Array.isArray(data) ? data : (data?.pageItems || []);
    return items.map((p, idx) => ({
        id: p.id ?? idx,                     // keep numeric id if available
        code: p.code || p.actionName || '',  // e.g. 'CREATE_CLIENT'
        entityName: p.entityName || p.grouping || '',
        actionName: p.actionName || '',
        description: p.description || p.code || '',
        // Fineract exposes maker-checker flag as 'makerCheckerEnabled' (sometimes 'selected' for role views)
        makerCheckerEnabled: Boolean(p.makerCheckerEnabled ?? p.selected ?? false),
        // Useful hint: is this a write op (eligible for maker-checker)?
        isWrite: !/^(READ|VIEW|LIST|SEARCH)/i.test(p.actionName || p.code || ''),
    }));
};

/** PUT /v1/permissions — enable/disable maker-checker for non-read txns
 *  Expects: an array of permission objects with makerCheckerEnabled set as you want.
 */
export const updateMakerChecker = async (permissions) => {
    // Send back only fields backend cares about; mirror input shape if your backend wants more.
    const payload = permissions.map(p => ({
        id: p.id,
        code: p.code,
        makerCheckerEnabled: Boolean(p.makerCheckerEnabled),
    }));
    const { data } = await api.put('/permissions', payload);
    return data;
};
