import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const normalizeOffice = (o) => ({
    id: o.id,
    name: o.name,
    parentName: o.parentName || o.parent?.name || '',
    externalId: o.externalId || '',
    openingDate: Array.isArray(o.openingDate) ? o.openingDate.join('-') : (o.openingDate || ''),
});

const useOffices = () => {
    const [offices, setOffices] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/offices');
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            setOffices(list.map(normalizeOffice));
        } catch {
            setOffices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { offices, loading, reload: load };
};

export default useOffices;
