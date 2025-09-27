import api from './axios';

/** GET /search?q=term&resource=clients|loans|groups */
export const search = async ({ q, resource, limit = 50, offset = 0 }) => {
    const params = {};
    if (q) params.q = q;
    if (resource) params.resource = resource; // e.g., 'clients','loans','groups'
    params.limit = limit;
    params.offset = offset;

    const { data } = await api.get('/search', { params });
    const items = Array.isArray(data) ? data : (data?.pageItems || []);
    return items;
};

/** GET /search/template — returns fields available for adhoc queries */
export const getSearchTemplate = async () => {
    const { data } = await api.get('/search/template');
    return data || {};
};

/** POST /search/advance — adhoc query search
 *  body shape depends on backend template; we pass through verbatim
 */
export const searchAdvance = async (body) => {
    const { data } = await api.post('/search/advance', body);
    const items = Array.isArray(data) ? data : (data?.pageItems || []);
    return items;
};
