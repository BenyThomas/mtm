import React, { useEffect, useState } from 'react';
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

const AddressForm = ({ clientId, initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [tplLoading, setTplLoading] = useState(true);

    const [addressTypeOptions, setAddressTypeOptions] = useState([]);
    const [countryOptions, setCountryOptions] = useState([]);
    const [stateOptions, setStateOptions] = useState([]);

    // fields
    const [addressTypeId, setAddressTypeId] = useState(initial?.addressTypeId || initial?.addressType?.id || '');
    const [isActive, setIsActive] = useState(typeof initial?.isActive === 'boolean' ? initial.isActive : true);
    const [isPrimary, setIsPrimary] = useState(typeof initial?.isPrimary === 'boolean' ? initial.isPrimary : false);

    const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 || '');
    const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 || '');
    const [addressLine3, setAddressLine3] = useState(initial?.addressLine3 || '');
    const [street, setStreet] = useState(initial?.street || '');
    const [city, setCity] = useState(initial?.city || initial?.town || '');
    const [stateProvinceId, setStateProvinceId] = useState(initial?.stateProvinceId || initial?.stateProvince?.id || '');
    const [countryId, setCountryId] = useState(initial?.countryId || initial?.country?.id || '');
    const [postalCode, setPostalCode] = useState(initial?.postalCode || '');
    const [houseNo, setHouseNo] = useState(initial?.houseNo || '');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTplLoading(true);
            try {
                const r = await api.get('/client/addresses/template');
                const d = r?.data || {};
                const addrTypes = normalize(d?.addressTypeOptions || d?.addressTypes || []);
                const countries = normalize(d?.countryIdOptions || d?.countries || []);
                const states = normalize(d?.stateProvinceIdOptions || d?.states || []);

                if (!cancelled) {
                    setAddressTypeOptions(addrTypes);
                    setCountryOptions(countries);
                    setStateOptions(states);
                }
            } catch (e) {
                if (!cancelled) {
                    setAddressTypeOptions([]);
                    setCountryOptions([]);
                    setStateOptions([]);
                    addToast('Failed to load address template', 'error');
                }
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [addToast]);

    useEffect(() => {
        if (!initial) return;
        setAddressTypeId(initial?.addressTypeId || initial?.addressType?.id || '');
        setIsActive(typeof initial?.isActive === 'boolean' ? initial.isActive : true);
        setIsPrimary(typeof initial?.isPrimary === 'boolean' ? initial.isPrimary : false);
        setAddressLine1(initial?.addressLine1 || '');
        setAddressLine2(initial?.addressLine2 || '');
        setAddressLine3(initial?.addressLine3 || '');
        setStreet(initial?.street || '');
        setCity(initial?.city || initial?.town || '');
        setStateProvinceId(initial?.stateProvinceId || initial?.stateProvince?.id || '');
        setCountryId(initial?.countryId || initial?.country?.id || '');
        setPostalCode(initial?.postalCode || '');
        setHouseNo(initial?.houseNo || '');
        setErrors({});
    }, [initial?.id]);

    const validate = () => {
        const e = {};
        if (!addressTypeId) e.addressTypeId = 'Type is required';
        if (!addressLine1 && !street) e.addressLine1 = 'Address Line 1 or Street is required';
        if (!countryId) e.countryId = 'Country is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return addToast('Please fix validation errors', 'error');

        const payload = {
            addressTypeId: Number(addressTypeId),
            isActive: Boolean(isActive),
            isPrimary: Boolean(isPrimary),
            ...(addressLine1 ? { addressLine1: addressLine1.trim() } : {}),
            ...(addressLine2 ? { addressLine2: addressLine2.trim() } : {}),
            ...(addressLine3 ? { addressLine3: addressLine3.trim() } : {}),
            ...(street ? { street: street.trim() } : {}),
            ...(city ? { city: city.trim() } : {}),
            ...(stateProvinceId ? { stateProvinceId: Number(stateProvinceId) } : {}),
            ...(countryId ? { countryId: Number(countryId) } : {}),
            ...(postalCode ? { postalCode: postalCode.trim() } : {}),
            ...(houseNo ? { houseNo: houseNo.trim() } : {}),
        };

        // For update, most Fineract builds expect addressId in PUT payload
        if (initial?.id) payload.addressId = Number(initial.id);

        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                {tplLoading ? (
                    <Skeleton height="10rem" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Address Type *</label>
                            <select
                                value={addressTypeId}
                                onChange={(e) => { setAddressTypeId(e.target.value); if (errors.addressTypeId) setErrors(x => ({ ...x, addressTypeId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select type…</option>
                                {addressTypeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.addressTypeId && <p className="text-xs text-red-500 mt-1">{errors.addressTypeId}</p>}
                        </div>

                        <div className="flex items-end gap-6">
                            <label className="inline-flex items-center gap-2 mt-6">
                                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                                <span className="text-sm">Active</span>
                            </label>
                            <label className="inline-flex items-center gap-2 mt-6">
                                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                                <span className="text-sm">Primary</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Address Line 1 *</label>
                            <input
                                value={addressLine1}
                                onChange={(e) => { setAddressLine1(e.target.value); if (errors.addressLine1) setErrors(x => ({ ...x, addressLine1: '' })); }}
                                placeholder="House/Street/Locality"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Address Line 2</label>
                            <input
                                value={addressLine2}
                                onChange={(e) => setAddressLine2(e.target.value)}
                                placeholder="Area/Block"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Address Line 3</label>
                            <input
                                value={addressLine3}
                                onChange={(e) => setAddressLine3(e.target.value)}
                                placeholder="Landmark"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Street</label>
                            <input
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="Street"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">City/Town</label>
                            <input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="City/Town"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">State/Province</label>
                            <select
                                value={stateProvinceId}
                                onChange={(e) => setStateProvinceId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {stateOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Country *</label>
                            <select
                                value={countryId}
                                onChange={(e) => { setCountryId(e.target.value); if (errors.countryId) setErrors(x => ({ ...x, countryId: '' })); }}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select…</option>
                                {countryOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {errors.countryId && <p className="text-xs text-red-500 mt-1">{errors.countryId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Postal Code</label>
                            <input
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="Postal Code"
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">House/Apartment No.</label>
                            <input
                                value={houseNo}
                                onChange={(e) => setHouseNo(e.target.value)}
                                placeholder="House No."
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : (initial?.id ? 'Save Changes' : 'Add Address')}</Button>
            </div>
        </form>
    );
};

export default AddressForm;
