import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Skeleton from './Skeleton';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const normalize = (arr, idKey = 'id', nameKey = 'name') => {
    if (!Array.isArray(arr)) return [];
    return arr.map(o => ({
        id: o?.[idKey] ?? o?.value ?? o?.key,
        name: o?.[nameKey] ?? o?.displayName ?? o?.text ?? o?.label ?? String(o?.id ?? '')
    })).filter(x => x.id);
};

const toISO = (v) => (v ? String(v).slice(0, 10) : '');

const ClientForm = ({ initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);

    const [officeOptions, setOfficeOptions] = useState([]);
    const [staffOptions, setStaffOptions] = useState([]);
    const [genderOptions, setGenderOptions] = useState([]);
    const [clientTypeOptions, setClientTypeOptions] = useState([]);
    const [classificationOptions, setClassificationOptions] = useState([]);
    const [legalFormOptions, setLegalFormOptions] = useState([]);

    // fields
    const [officeId, setOfficeId] = useState(initial?.officeId || initial?.office?.id || '');
    const [firstname, setFirstname] = useState(initial?.firstname || '');
    const [lastname, setLastname] = useState(initial?.lastname || '');
    const [externalId, setExternalId] = useState(initial?.externalId || '');
    const [mobileNo, setMobileNo] = useState(initial?.mobileNo || '');
    const [dateOfBirth, setDateOfBirth] = useState(toISO(Array.isArray(initial?.dateOfBirth) ? initial.dateOfBirth.join('-') : initial?.dateOfBirth));

    const [active, setActive] = useState(Boolean(initial?.active));
    const [activationDate, setActivationDate] = useState(
        toISO(Array.isArray(initial?.activationDate) ? initial.activationDate.join('-') : initial?.activationDate)
    );

    const [staffId, setStaffId] = useState(initial?.staffId || initial?.staff?.id || '');
    const [genderId, setGenderId] = useState(initial?.genderId || initial?.gender?.id || '');
    const [clientTypeId, setClientTypeId] = useState(initial?.clientTypeId || initial?.clientType?.id || '');
    const [clientClassificationId, setClientClassificationId] = useState(initial?.clientClassificationId || initial?.clientClassification?.id || '');
    const [legalFormId, setLegalFormId] = useState(initial?.legalFormId || initial?.legalForm?.id || '');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/clients/template');
                const d = r?.data || {};
                const offices = normalize(d?.officeOptions || d?.officeIdOptions || []);
                const staff = normalize(d?.staffOptions || []);
                const genders = normalize(d?.genderOptions || []);
                const types = normalize(d?.clientTypeOptions || []);
                const classes = normalize(d?.clientClassificationOptions || []);
                const legal = normalize(d?.legalFormOptions || d?.legalFormIdOptions || []);

                if (!cancelled) {
                    setOfficeOptions(offices);
                    setStaffOptions(staff);
                    setGenderOptions(genders);
                    setClientTypeOptions(types);
                    setClassificationOptions(classes);
                    setLegalFormOptions(legal);

                    // Defaults if not prefilled
                    if (!initial?.officeId && offices[0]) setOfficeId(offices[0].id);
                    if (!initial?.legalFormId && legal[0]) setLegalFormId(legal[0].id);
                }
            } catch (e) {
                if (!cancelled) {
                    addToast('Failed to load client template', 'error');
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [addToast, initial?.officeId, initial?.legalFormId]);

    useEffect(() => {
        if (!initial) return;
        setOfficeId(initial?.officeId || initial?.office?.id || officeId);
        setFirstname(initial?.firstname || '');
        setLastname(initial?.lastname || '');
        setExternalId(initial?.externalId || '');
        setMobileNo(initial?.mobileNo || '');
        setDateOfBirth(toISO(Array.isArray(initial?.dateOfBirth) ? initial.dateOfBirth.join('-') : initial?.dateOfBirth));
        setActive(Boolean(initial?.active));
        setActivationDate(toISO(Array.isArray(initial?.activationDate) ? initial.activationDate.join('-') : initial?.activationDate));
        setStaffId(initial?.staffId || initial?.staff?.id || '');
        setGenderId(initial?.genderId || initial?.gender?.id || '');
        setClientTypeId(initial?.clientTypeId || initial?.clientType?.id || '');
        setClientClassificationId(initial?.clientClassificationId || initial?.clientClassification?.id || '');
        setLegalFormId(initial?.legalFormId || initial?.legalForm?.id || legalFormId);
        setErrors({});
    }, [initial?.id]); // eslint-disable-line

    const validate = () => {
        const e = {};
        if (!officeId) e.officeId = 'Office is required';
        if (!legalFormId) e.legalFormId = 'Legal form is required';
        if (!firstname.trim()) e.firstname = 'First name is required';
        if (active && !activationDate) e.activationDate = 'Activation date is required for active clients';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;

        const payload = {
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            officeId: Number(officeId),
            legalFormId: Number(legalFormId),
            firstname: firstname.trim(),
            ...(lastname.trim() ? { lastname: lastname.trim() } : {}),
            ...(externalId.trim() ? { externalId: externalId.trim() } : {}),
            ...(mobileNo.trim() ? { mobileNo: mobileNo.trim() } : {}),
            ...(dateOfBirth ? { dateOfBirth } : {}),
            ...(staffId ? { staffId: Number(staffId) } : {}),
            ...(genderId ? { genderId: Number(genderId) } : {}),
            ...(clientTypeId ? { clientTypeId: Number(clientTypeId) } : {}),
            ...(clientClassificationId ? { clientClassificationId: Number(clientClassificationId) } : {}),
            ...(active ? { active: true, activationDate } : { active: false }),
        };

        await onSubmit(payload);
    };

    const headerRight = useMemo(() => (
        <div className="text-xs text-gray-500">
            {tplLoading ? 'Loading template…' : ''}
        </div>
    ), [tplLoading]);

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card header="Client Details" headerRight={headerRight}>
                {tplLoading ? (
                    <Skeleton height="12rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Office *</label>
                            <select
                                value={officeId}
                                onChange={(e) => { setOfficeId(e.target.value); if (errors.officeId) setErrors(x => ({ ...x, officeId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select office…</option>
                                {officeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.officeId && <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Legal Form *</label>
                            <select
                                value={legalFormId}
                                onChange={(e) => { setLegalFormId(e.target.value); if (errors.legalFormId) setErrors(x => ({ ...x, legalFormId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select legal form…</option>
                                {legalFormOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.legalFormId && <p className="text-xs text-red-500 mt-1">{errors.legalFormId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">First Name *</label>
                            <input
                                value={firstname}
                                onChange={(e) => { setFirstname(e.target.value); if (errors.firstname) setErrors(x => ({ ...x, firstname: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.firstname && <p className="text-xs text-red-500 mt-1">{errors.firstname}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Last Name</label>
                            <input
                                value={lastname}
                                onChange={(e) => setLastname(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">External ID</label>
                            <input
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Mobile No</label>
                            <input
                                value={mobileNo}
                                onChange={(e) => setMobileNo(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Date of Birth</label>
                            <input
                                type="date"
                                value={dateOfBirth || ''}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Assigned Staff</label>
                            <select
                                value={staffId}
                                onChange={(e) => setStaffId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {staffOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Gender</label>
                            <select
                                value={genderId}
                                onChange={(e) => setGenderId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {genderOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Client Type</label>
                            <select
                                value={clientTypeId}
                                onChange={(e) => setClientTypeId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {clientTypeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Client Classification</label>
                            <select
                                value={clientClassificationId}
                                onChange={(e) => setClientClassificationId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">—</option>
                                {classificationOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2 flex items-center gap-6">
                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                                <span className="text-sm">Active</span>
                            </label>
                            {active && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">Activation Date *</span>
                                    <input
                                        type="date"
                                        value={activationDate || ''}
                                        onChange={(e) => { setActivationDate(e.target.value); if (errors.activationDate) setErrors(x => ({ ...x, activationDate: '' })); }}
                                        className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            )}
                        </div>
                        {errors.activationDate && <p className="text-xs text-red-500 mt-1 md:col-span-2">{errors.activationDate}</p>}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Client')}
                </Button>
            </div>
        </form>
    );
};

export default ClientForm;
