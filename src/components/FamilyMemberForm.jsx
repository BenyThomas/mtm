import React, { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import Button from './Button';

const asOpt = (arr) =>
    (Array.isArray(arr) ? arr : []).map((o) => ({ id: o.id ?? o.value ?? o.code, name: o.name ?? o.value ?? o.code }));

/**
 * Props:
 * - initial: existing family member (for edit) or null (for create)
 * - template: object from GET /clients/{clientId}/familymembers/template
 * - onSubmit: async (payload) => void
 * - submitting: boolean
 */
export default function FamilyMemberForm({ initial, template, onSubmit, submitting }) {
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [relationshipId, setRelationshipId] = useState('');
    const [genderId, setGenderId] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState(''); // yyyy-MM-dd
    const [age, setAge] = useState('');
    const [isDependent, setIsDependent] = useState(false);
    const [mobileNumber, setMobileNumber] = useState('');
    const [professionId, setProfessionId] = useState('');
    const [educationLevelId, setEducationLevelId] = useState('');
    const [maritalStatusId, setMaritalStatusId] = useState('');

    const relOpts = useMemo(() => asOpt(template?.relationshipIdOptions), [template]);
    const genderOpts = useMemo(() => asOpt(template?.genderIdOptions), [template]);
    const profOpts = useMemo(() => asOpt(template?.professionIdOptions), [template]);
    const eduOpts = useMemo(() => asOpt(template?.educationLevelIdOptions), [template]);
    const maritalOpts = useMemo(() => asOpt(template?.maritalStatusIdOptions), [template]);

    const normalizeDate = (v) => {
        if (!v) return '';
        if (Array.isArray(v) && v.length >= 3) {
            const [y, m, d] = v; return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        }
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const dt = new Date(v);
        return Number.isNaN(dt.getTime()) ? '' :
            `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    };

    useEffect(() => {
        if (!initial) {
            setFirstName(''); setMiddleName(''); setLastName('');
            setRelationshipId(''); setGenderId('');
            setDateOfBirth(''); setAge(''); setIsDependent(false);
            setMobileNumber(''); setProfessionId(''); setEducationLevelId(''); setMaritalStatusId('');
            return;
        }
        setFirstName(initial.firstName || initial.firstname || '');
        setMiddleName(initial.middleName || initial.middlename || '');
        setLastName(initial.lastName || initial.lastname || '');
        setRelationshipId(initial.relationshipId || initial.relationship?.id || '');
        setGenderId(initial.genderId || initial.gender?.id || '');
        setDateOfBirth(normalizeDate(initial.dateOfBirth || initial.dob));
        setAge(initial.age ?? '');
        setIsDependent(Boolean(initial.isDependent));
        setMobileNumber(initial.mobileNumber || initial.mobileNo || '');
        setProfessionId(initial.professionId || initial.profession?.id || '');
        setEducationLevelId(initial.educationLevelId || initial.educationLevel?.id || '');
        setMaritalStatusId(initial.maritalStatusId || initial.maritalStatus?.id || '');
    }, [initial]);

    const submit = async (e) => {
        e.preventDefault();
        const payload = {
            firstName: firstName.trim(),
            ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
            lastName: lastName.trim(),
            ...(relationshipId ? { relationshipId: Number(relationshipId) } : {}),
            ...(genderId ? { genderId: Number(genderId) } : {}),
            ...(dateOfBirth ? { dateOfBirth, dateFormat: 'yyyy-MM-dd', locale: 'en' } : {}),
            ...(age ? { age: Number(age) } : {}),
            isDependent: Boolean(isDependent),
            ...(mobileNumber.trim() ? { mobileNumber: mobileNumber.trim() } : {}),
            ...(professionId ? { professionId: Number(professionId) } : {}),
            ...(educationLevelId ? { educationLevelId: Number(educationLevelId) } : {}),
            ...(maritalStatusId ? { maritalStatusId: Number(maritalStatusId) } : {}),
        };
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">First name *</label>
                        <input className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                               value={firstName} onChange={(e)=>setFirstName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Middle name</label>
                        <input className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                               value={middleName} onChange={(e)=>setMiddleName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Last name *</label>
                        <input className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                               value={lastName} onChange={(e)=>setLastName(e.target.value)} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Relationship</label>
                        <select className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                value={relationshipId} onChange={(e)=>setRelationshipId(e.target.value)}>
                            <option value="">Select…</option>
                            {relOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Gender</label>
                        <select className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                value={genderId} onChange={(e)=>setGenderId(e.target.value)}>
                            <option value="">Select…</option>
                            {genderOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Date of Birth</label>
                        <input type="date" value={dateOfBirth} onChange={(e)=>setDateOfBirth(e.target.value)}
                               className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Age</label>
                        <input type="number" value={age} onChange={(e)=>setAge(e.target.value)}
                               className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <div className="flex items-center gap-2 mt-7">
                        <input id="isDependent" type="checkbox" checked={isDependent}
                               onChange={(e)=>setIsDependent(e.target.checked)} />
                        <label htmlFor="isDependent" className="text-sm">Dependent</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Mobile</label>
                        <input value={mobileNumber} onChange={(e)=>setMobileNumber(e.target.value)}
                               placeholder="+2557XXXXXXXX"
                               className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Profession</label>
                        <select value={professionId} onChange={(e)=>setProfessionId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Select…</option>
                            {profOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Education Level</label>
                        <select value={educationLevelId} onChange={(e)=>setEducationLevelId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Select…</option>
                            {eduOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Marital Status</label>
                        <select value={maritalStatusId} onChange={(e)=>setMaritalStatusId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Select…</option>
                            {maritalOpts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Add Family Member')}
                </Button>
            </div>
        </form>
    );
}
