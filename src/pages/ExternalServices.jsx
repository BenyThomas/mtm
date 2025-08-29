import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import ExternalServiceS3Form from '../components/ExternalServiceS3Form';
import ExternalServiceSMTPForm from '../components/ExternalServiceSMTPForm';

const SERVICES = [
    { key: 'S3', label: 'Amazon S3', icon: '🗂️' },
    { key: 'SMTP', label: 'SMTP (Email)', icon: '✉️' },
];

const ExternalServices = () => {
    const { addToast } = useToast();

    const [active, setActive] = useState('S3');
    const [loading, setLoading] = useState(true);
    const [cfg, setCfg] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async (serviceName) => {
        setLoading(true);
        try {
            const res = await api.get(`/externalservice/${serviceName}`);
            // Response may be a map or an object with fields; normalize to flat object
            const d = res?.data || {};
            let flat = {};
            if (Array.isArray(d)) {
                d.forEach((kv) => {
                    if (kv && kv.name != null) flat[kv.name] = kv.value;
                });
            } else if (d && typeof d === 'object') {
                // if backend returns { properties: [{name, value}] }
                if (Array.isArray(d.properties)) {
                    d.properties.forEach((kv) => {
                        if (kv && kv.name != null) flat[kv.name] = kv.value;
                    });
                } else {
                    flat = { ...d };
                }
            }
            setCfg(flat);
        } catch (err) {
            setCfg(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                `Failed to load ${serviceName} config`;
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(active); /* eslint-disable-next-line */ }, [active]);

    const save = async (serviceName, payload) => {
        setSaving(true);
        try {
            await api.put(`/externalservice/${serviceName}`, payload);
            addToast(`${serviceName} configuration saved`, 'success');
            await load(serviceName);
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                `Failed to save ${serviceName} config`;
            addToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">External Services</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => load(active)}>Refresh</Button>
                </div>
            </div>

            {/* Tabs / Segmented control */}
            <Card>
                <div className="flex flex-wrap gap-2">
                    {SERVICES.map((s) => {
                        const isActive = s.key === active;
                        return (
                            <button
                                key={s.key}
                                className={`px-3 py-1.5 rounded-md text-sm border transition
                  ${isActive
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}
                                onClick={() => setActive(s.key)}
                            >
                                <span className="mr-1" aria-hidden="true">{s.icon}</span>
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Forms */}
            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : active === 'S3' ? (
                    <ExternalServiceS3Form
                        initial={cfg}
                        submitting={saving}
                        onSubmit={(payload) => save('S3', payload)}
                    />
                ) : (
                    <ExternalServiceSMTPForm
                        initial={cfg}
                        submitting={saving}
                        onSubmit={(payload) => save('SMTP', payload)}
                    />
                )}
            </Card>

            {/* Help */}
            <Card>
                <div className="font-semibold mb-1">Notes</div>
                <ul className="list-disc pl-6 text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Values like passwords/secrets may not be returned by the server. Provide them to change.</li>
                    <li>If SMTP is behind a secure connection, keep <strong>Use TLS</strong> checked and use ports such as <code>587</code>.</li>
                    <li>S3 config requires the <strong>bucket name</strong> to be created in your AWS account.</li>
                </ul>
            </Card>
        </div>
    );
};

export default ExternalServices;
