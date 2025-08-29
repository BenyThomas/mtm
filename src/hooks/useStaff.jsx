import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const normalizeStaff = (s) => ({
    id: s.id,
    displayName: s.displayName || [s.firstname, s.lastname].filter(Boolean).join(' '),
    officeName: s.officeName || s.office?.name || '',
    isLoanOfficer: s.isLoanOfficer ?? s.isLoanOfficerActive ?? false,
    mobileNo: s.mobileNo || '',
    active: s.isActive ?? s.active ?? true,
});

const useStaff = (opts = {}) => {
    const { officeId, activeOnly } = opts;
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (officeId) params.officeId = officeId;
            // Fineract may support status/loanOfficerOnly — keep minimal.
            const res = await api.get('/staff', { params });
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            let normalized = list.map(normalizeStaff);
            if (activeOnly) normalized = normalized.filter((s) => s.active);
            setStaff(normalized);
        } catch {
            setStaff([]);
        } finally {
            setLoading(false);
        }
    }, [officeId, activeOnly]);

    useEffect(() => { load(); }, [load]);

    const onlyLoanOfficers = useMemo(
        () => staff.filter((s) => s.isLoanOfficer),
        [staff]
    );

    return { staff, onlyLoanOfficers, loading, reload: load };
};

export default useStaff;
