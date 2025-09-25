import React, { useEffect, useMemo, useState } from 'react';
import useOffices from '../hooks/useOffices';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * Props:
 *  - initial: staff object for edit (or null for create)
 *  - onSubmit: async (payload) => void
 *  - submitting: boolean
 */
const StaffForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();
    const { offices, loading: officesLoading, reload: reloadOffices } = useOffices();

    const [officeId, setOfficeId] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [isLoanOfficer, setIsLoanOfficer] = useState(false);
    const [mobileNo, setMobileNo] = useState('');
    const [externalId, setExternalId] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [joiningDate, setJoiningDate] = useState(''); // <-- NEW
    const [errors, setErrors] = useState({});

    // Precompute office options
    const officeOptions = useMemo(() => {
        return (offices || []).map((o) => ({ id: o.id, name: o.name }));
    }, [offices]);

    // Normalize any incoming date shape to "YYYY-MM-DD"
    const normalizeToDateInput = (v) => {
        if (!v) return '';
        if (Array.isArray(v) && v.length >= 3) {
            // e.g. [2025, 9, 20]
            const [y, m, d] = v;
            const mm = String(m).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            return `${y}-${mm}-${dd}`;
        }
        if (typeof v === 'string') {
            // Accept "YYYY-MM-DD" or any Date-parsable string
            const dt = new Date(v);
            if (!Number.isNaN(dt.getTime())) {
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            // If it's already "YYYY-MM-DD", keep as-is
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        }
        if (v instanceof Date && !Number.isNaN(v.getTime())) {
            const y = v.getFullYear();
            const m = String(v.getMonth() + 1).padStart(2, '0');
            const d = String(v.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return '';
    };

    // Hydrate on edit
    useEffect(() => {
        if (!initial) {
            setOfficeId('');
            setFirstname('');
            setLastname('');
            setIsLoanOfficer(false);
            setMobileNo('');
            setExternalId('');
            setEmailAddress('');
            setJoiningDate(''); // reset
            setErrors({});
            return;
        }
        setOfficeId(initial.officeId || initial.office?.id || '');
        setFirstname(initial.firstname || initial.firstName || '');
        setLastname(initial.lastname || initial.lastName || '');
        setIsLoanOfficer(Boolean(initial.isLoanOfficer));
        setMobileNo(initial.mobileNo || '');
        setExternalId(initial.externalId || '');
        setEmailAddress(initial.emailAddress || initial.email || '');
        // joiningDate could appear as joiningDate, joinedDate, or date array
        const jd = initial.joiningDate ?? initial.joinedDate ?? initial.dateOfJoining;
        setJoiningDate(normalizeToDateInput(jd));
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!officeId) e.officeId = 'Office is required';
        if (!firstname.trim()) e.firstname = 'First name is required';
        if (!lastname.trim()) e.lastname = 'Last name is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }

        // Build payload (only include fields Fineract supports)
        const payload = {
            officeId: Number(officeId),
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            isLoanOfficer: Boolean(isLoanOfficer),
            ...(mobileNo.trim() ? { mobileNo: mobileNo.trim() } : {}),
            ...(externalId.trim() ? { externalId: externalId.trim() } : {}),
            ...(emailAddress.trim() ? { emailAddress: emailAddress.trim() } : {}),
        };

        // If joiningDate is provided, include dateFormat + locale as Fineract expects
        if (joiningDate) {
            payload.joiningDate = joiningDate;            // "YYYY-MM-DD"
            payload.dateFormat = 'yyyy-MM-dd';
            payload.locale = 'en';
        }

        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {officesLoading ? (
                    <Skeleton height="3.5rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Office *</label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={officeId}
                                    onChange={(e) => {
                                        setOfficeId(e.target.value);
                                        if (errors.officeId) setErrors((x) => ({ ...x, officeId: '' }));
                                    }}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select office…</option>
                                    {officeOptions.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                                <Button type="button" variant="secondary" onClick={reloadOffices}>
                                    ↻
                                </Button>
                            </div>
                            {errors.officeId && <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-1 md:col-span-1">
                            <div>
                                <label className="block text-sm font-medium">First name *</label>
                                <input
                                    value={firstname}
                                    onChange={(e) => {
                                        setFirstname(e.target.value);
                                        if (errors.firstname) setErrors((x) => ({ ...x, firstname: '' }));
                                    }}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="e.g. Asha"
                                />
                                {errors.firstname && <p className="text-xs text-red-500 mt-1">{errors.firstname}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Last name *</label>
                                <input
                                    value={lastname}
                                    onChange={(e) => {
                                        setLastname(e.target.value);
                                        if (errors.lastname) setErrors((x) => ({ ...x, lastname: '' }));
                                    }}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="e.g. Mushi"
                                />
                                {errors.lastname && <p className="text-xs text-red-500 mt-1">{errors.lastname}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="isLoanOfficer"
                                type="checkbox"
                                checked={isLoanOfficer}
                                onChange={(e) => setIsLoanOfficer(e.target.checked)}
                            />
                            <label htmlFor="isLoanOfficer" className="text-sm">
                                Is Loan Officer
                            </label>
                        </div>

                        {/* NEW: Joining Date */}
                        <div>
                            <label className="block text-sm font-medium">Joining date</label>
                            <input
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Mobile</label>
                            <input
                                value={mobileNo}
                                onChange={(e) => setMobileNo(e.target.value)}
                                placeholder="+255 7XX XXX XXX"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                placeholder="name@domain.tld"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Emp. ID</label>
                            <input
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="Optional external reference"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Staff'}
                </Button>
            </div>
        </form>
    );
};

export default StaffForm;
