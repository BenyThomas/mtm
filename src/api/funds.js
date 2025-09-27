import api from './axios';

/** List funds with basic pagination and optional name prefix search */
export const listFunds = async ({ page = 1, pageSize = 20, search = '' } = {}) => {
    const offset = (page - 1) * pageSize;
    const params = { offset, limit: pageSize };
    // If your Fineract allows sqlSearch, enable the next line:
    if (search) params.sqlSearch = `name like '${search.replace(/'/g, "''")}%'`;

    const { data } = await api.get('/funds', { params });
    // Fineract typically returns a simple array here
    return Array.isArray(data) ? data : (data?.pageItems || []);
};

export const getFund = async (fundId) => {
    const { data } = await api.get(`/funds/${fundId}`);
    return data;
};

export const createFund = async (payload) => {
    // expected: { name: string, externalId?: string }
    const { data } = await api.post('/funds', payload);
    return data;
};

export const updateFund = async (fundId, payload) => {
    const { data } = await api.put(`/funds/${fundId}`, payload);
    return data;
};
