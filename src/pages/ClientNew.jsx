import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const steps = ['Personal', 'Address', 'KYC', 'Review'];

const FALLBACK_LEGAL_FORMS = [
    { id: 1, name: 'Person' },
    { id: 2, name: 'Entity' },
];

const ClientNew = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        officeId: '',
        legalFormId: '',          // ⬅️ NEW (required by Fineract)
        firstname: '',
        lastname: '',
        mobileNo: '',
        externalId: '',
        dateOfBirth: '',
        // Address
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: '',
        // KYC
        nationalId: '',
        documentType: '',
    });

    const [offices, setOffices] = useState([]);
    const [legalFormOptions, setLegalFormOptions] = useState(FALLBACK_LEGAL_FORMS);

    // Load offices and template (for legalForm options)
    useEffect(() => {
        (async () => {
            try {
                const [officesRes, templateRes] = await Promise.allSettled([
                    api.get('/offices'),
                    api.get('/clients/template'),
                ]);

                if (officesRes.status === 'fulfilled') {
                    setOffices(Array.isArray(officesRes.value.data) ? officesRes.value.data : []);
                }

                if (templateRes.status === 'fulfilled') {
                    const t = templateRes.value.data || {};
                    // Fineract template may expose one of these fields:
                    const opts =
                        t.legalFormOptions ||
                        t.legalFormIdOptions ||
                        t.legalForm ||
                        [];
                    if (Array.isArray(opts) && opts.length) {
                        // Normalize to {id, name}
                        const normalized = opts.map((o) => ({
                            id: o.id ?? o.value ?? o.code ?? o.key ?? 0,
                            name: o.name ?? o.value ?? o.text ?? String(o.id ?? ''),
                        }));
                        setLegalFormOptions(normalized);
                    }
                }
            } catch {
                // Keep fallbacks if calls fail
            }
        })();
    }, []);

    const next = () => {
        if (!validateCurrent()) return;
        setStep((s) => Math.min(s + 1, steps.length - 1));
    };
    const prev = () => setStep((s) => Math.max(s - 1, 0));

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: '' }));
    };

    const validateCurrent = () => {
        const e = {};
        if (step === 0) {
            if (!form.legalFormId) e.legalFormId = 'Legal form is required';
            if (!form.firstname) e.firstname = 'First name is required';
            if (!form.lastname) e.lastname = 'Last name is required';
            if (!form.officeId) e.officeId = 'Office is required';
        } else if (step === 1) {
            if (!form.addressLine1) e.addressLine1 = 'Address line 1 is required';
            if (!form.city) e.city = 'City is required';
            if (!form.country) e.country = 'Country is required';
        } else if (step === 2) {
            if (!form.nationalId) e.nationalId = 'National ID is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        // prevent double submit
        if (submitting) return;
        if (step !== steps.length - 1 && !validateCurrent()) return;

        setSubmitting(true);
        try {
            // Minimal Fineract payload; extend per your installation (genderId, clientTypeId, etc.).
            const payload = {
                officeId: Number(form.officeId),
                legalFormId: Number(form.legalFormId),  // ⬅️ REQUIRED
                firstname: form.firstname,
                lastname: form.lastname,
                mobileNo: form.mobileNo || undefined,
                externalId: form.externalId || undefined,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
                dateOfBirth: form.dateOfBirth || undefined,
                // Optionally: submittedOnDate if you want to set it explicitly
                // submittedOnDate: new Date().toISOString().slice(0, 10),
            };

            const res = await api.post('/clients', payload);
            const newId = res.data?.clientId || res.data?.resourceId || res.data?.id;
            addToast('Client created', 'success');
            navigate(`/clients/${newId || ''}`);
        } catch (err) {
            // Try to surface the first field error if API gives it
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to create client';
            addToast(msg, 'error');
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">New Client</h1>
            </div>

            <Card>
                {/* Stepper */}
                <div className="flex items-center space-x-2 mb-4 text-sm">
                    {steps.map((label, idx) => (
                        <div key={label} className="flex items-center">
                            <div
                                className={`px-2 py-1 rounded ${
                                    idx === step
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            >
                                {idx + 1}. {label}
                            </div>
                            {idx < steps.length - 1 ? (
                                <span className="mx-2 text-gray-400">→</span>
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                {step === 0 && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Legal Form *</label>
                            <select
                                value={form.legalFormId}
                                onChange={(e) => setField('legalFormId', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select legal form</option>
                                {legalFormOptions.map((o) => (
                                    <option key={`${o.id}-${o.name}`} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.legalFormId && (
                                <p className="text-xs text-red-500 mt-1">{errors.legalFormId}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">First name *</label>
                            <input
                                value={form.firstname}
                                onChange={(e) => setField('firstname', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.firstname && (
                                <p className="text-xs text-red-500 mt-1">{errors.firstname}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Last name *</label>
                            <input
                                value={form.lastname}
                                onChange={(e) => setField('lastname', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.lastname && (
                                <p className="text-xs text-red-500 mt-1">{errors.lastname}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Office *</label>
                            <select
                                value={form.officeId}
                                onChange={(e) => setField('officeId', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select office</option>
                                {offices.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                            {errors.officeId && (
                                <p className="text-xs text-red-500 mt-1">{errors.officeId}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Mobile</label>
                            <input
                                value={form.mobileNo}
                                onChange={(e) => setField('mobileNo', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">External ID</label>
                            <input
                                value={form.externalId}
                                onChange={(e) => setField('externalId', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Date of Birth</label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={(e) => setField('dateOfBirth', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Address Line 1 *</label>
                            <input
                                value={form.addressLine1}
                                onChange={(e) => setField('addressLine1', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.addressLine1 && (
                                <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Address Line 2</label>
                            <input
                                value={form.addressLine2}
                                onChange={(e) => setField('addressLine2', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">City *</label>
                            <input
                                value={form.city}
                                onChange={(e) => setField('city', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.city && (
                                <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">State</label>
                            <input
                                value={form.state}
                                onChange={(e) => setField('state', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Country *</label>
                            <input
                                value={form.country}
                                onChange={(e) => setField('country', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.country && (
                                <p className="text-xs text-red-500 mt-1">{errors.country}</p>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">National ID *</label>
                            <input
                                value={form.nationalId}
                                onChange={(e) => setField('nationalId', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {errors.nationalId && (
                                <p className="text-xs text-red-500 mt-1">{errors.nationalId}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Document Type</label>
                            <input
                                value={form.documentType}
                                onChange={(e) => setField('documentType', e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="ID Card / Passport / Voter ID"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Review the details before submitting.
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <div className="font-semibold mb-2">Personal</div>
                                <div>Legal Form: {legalFormOptions.find(x => String(x.id) === String(form.legalFormId))?.name || '-'}</div>
                                <div>First name: {form.firstname || '-'}</div>
                                <div>Last name: {form.lastname || '-'}</div>
                                <div>Office ID: {form.officeId || '-'}</div>
                                <div>Mobile: {form.mobileNo || '-'}</div>
                                <div>External ID: {form.externalId || '-'}</div>
                                <div>Date of Birth: {form.dateOfBirth || '-'}</div>
                            </Card>
                            <Card>
                                <div className="font-semibold mb-2">Address</div>
                                <div>Line 1: {form.addressLine1 || '-'}</div>
                                <div>Line 2: {form.addressLine2 || '-'}</div>
                                <div>City: {form.city || '-'}</div>
                                <div>State: {form.state || '-'}</div>
                                <div>Country: {form.country || '-'}</div>
                            </Card>
                            <Card className="md:col-span-2">
                                <div className="font-semibold mb-2">KYC</div>
                                <div>National ID: {form.nationalId || '-'}</div>
                                <div>Document Type: {form.documentType || '-'}</div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                    <Button
                        variant="secondary"
                        onClick={prev}
                        disabled={step === 0 || submitting}
                    >
                        Back
                    </Button>
                    {step < steps.length - 1 ? (
                        <Button onClick={next} disabled={submitting}>
                            Next
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Create Client'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ClientNew;
