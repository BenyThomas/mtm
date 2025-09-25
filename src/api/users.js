import api from './axios';

// Pull allowed offices + available/self-service roles for user screens
export const getUserTemplate = async () => {
    const { data } = await api.get('/users/template'); // baseURL should include /api/v1
    return data || {};
};

// Fetch staff filtered by office
export const fetchStaffByOffice = async (officeId) => {
    if (!officeId) return [];
    const { data } = await api.get('/staff', { params: { officeId } });
    const list = Array.isArray(data) ? data : (data?.pageItems || []);
    return list.map((s) => ({
        id: s.id,
        displayName:
            s.displayName ||
            `${s.firstname || s.firstName || ''} ${s.lastname || s.lastName || ''}`.trim() ||
            `Staff ${s.id}`,
    }));
};
