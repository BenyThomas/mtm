import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const normalizeStaff = (s) => ({
    id: s.id,
    displayName: s.displayName || [s.firstname, s.lastname].filter(Boolean).join(' '),
    officeName: s.officeName || s.office?.name || '',
    isLoanOfficer: s.isLoanOfficer ?? s.isLoanOfficerActive ?? false,
    mobileNo: s.mobileNo || '',
    email: s.email || '',
    active: s.isActive ?? s.active ?? true,
});

const useStaff = (opts = {}) => {
    const { officeId, activeOnly } = opts;
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    const ownLinkedStaff = useMemo(() => {
        const id = user?.staffId || user?.linkedStaffId;
        if (!id) return null;
        return normalizeStaff({
            id,
            displayName: user?.linkedStaffName || user?.staffDisplayName,
            officeName: user?.linkedStaffOfficeName || user?.officeName,
            isLoanOfficer: user?.linkedStaffIsLoanOfficer ?? user?.isLoanOfficer ?? user?.isGatewayOnlyLoanOfficer ?? false,
            mobileNo: user?.linkedStaffPhone || '',
            email: user?.linkedStaffEmail || '',
            active: true,
        });
    }, [user]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (officeId) params.officeId = officeId;
            // Fineract may support status/loanOfficerOnly — keep minimal.
            const res = await api.get('/staff', { params });
            const list = Array.isArray(res.data) ? res.data : (res.data?.pageItems || []);
            let normalized = list.map(normalizeStaff);
            if (ownLinkedStaff && !normalized.some((item) => String(item.id) === String(ownLinkedStaff.id))) {
                normalized = [ownLinkedStaff, ...normalized];
            }
            if (activeOnly) normalized = normalized.filter((s) => s.active);
            setStaff(normalized);
        } catch {
            const fallback = ownLinkedStaff ? [ownLinkedStaff] : [];
            setStaff(activeOnly ? fallback.filter((item) => item.active) : fallback);
        } finally {
            setLoading(false);
        }
    }, [officeId, activeOnly, ownLinkedStaff]);

    useEffect(() => { load(); }, [load]);

    const onlyLoanOfficers = useMemo(
        () => staff.filter((s) => s.isLoanOfficer),
        [staff]
    );

    return { staff, onlyLoanOfficers, loading, reload: load };
};

export default useStaff;
