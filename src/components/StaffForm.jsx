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
    const [errors, setErrors] = useState({});

    // Precompute office options
    const officeOptions = useMemo(() => {
        return (offices || []).map((o) => ({ id: o.id, name: o.name }));
    }, [offices]);

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
        // Keep payload strict to avoid "unsupported parameter" errors
        const payload = {
            officeId: Number(officeId),
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            isLoanOfficer: Boolean(isLoanOfficer),
            ...(mobileNo.trim() ? { mobileNo: mobileNo.trim() } : {}),
            ...(externalId.trim() ? { externalId: externalId.trim() } : {}),
            ...(emailAddress.trim() ? { emailAddress: emailAddress.trim() } : {}),
        };
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
                                    onChange={(e) => { setOfficeId(e.target.value); if (errors.officeId) setErrors(x => ({ ...x, officeId: '' })); }}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Select office…</option>
                                    {officeOptions.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                                <Button type="button" variant="secondary" onClick={reloadOffices}>↻</Button>
                            </div>
                            {errors.officeId && <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-1 md:col-span-1">
                            <div>
                                <label className="block text-sm font-medium">First name *</label>
                                <input
                                    value={firstname}
                                    onChange={(e) => { setFirstname(e.target.value); if (errors.firstname) setErrors(x => ({ ...x, firstname: '' })); }}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="e.g. Asha"
                                />
                                {errors.firstname && <p className="text-xs text-red-500 mt-1">{errors.firstname}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Last name *</label>
                                <input
                                    value={lastname}
                                    onChange={(e) => { setLastname(e.target.value); if (errors.lastname) setErrors(x => ({ ...x, lastname: '' })); }}
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
                            <label htmlFor="isLoanOfficer" className="text-sm">Is Loan Officer</label>
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
                            <label className="block text-sm font-medium">External ID</label>
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
