import React, { useEffect, useState } from 'react';
import Button from './Button';

const ExternalServiceS3Form = ({ initial, onSubmit, submitting }) => {
    const [s3_access_key, setAccessKey] = useState('');
    const [s3_secret_key, setSecretKey] = useState('');
    const [s3_bucket_name, setBucket] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!initial) {
            setAccessKey('');
            setSecretKey('');
            setBucket('');
            setErrors({});
            return;
        }
        setAccessKey(initial.s3_access_key || '');
        // don’t overwrite with masked/blank secrets coming from backend unless present
        setSecretKey(initial.s3_secret_key || '');
        setBucket(initial.s3_bucket_name || '');
        setErrors({});
    }, [initial]);

    const validate = () => {
        const e = {};
        if (!s3_access_key.trim()) e.s3_access_key = 'Access key is required';
        if (!s3_bucket_name.trim()) e.s3_bucket_name = 'Bucket name is required';
        // Secret may be optional if unchanged, but require when empty AND creating for first time
        if (!s3_secret_key.trim() && !(initial && initial.s3_secret_key)) {
            e.s3_secret_key = 'Secret key is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload = {
            s3_access_key: s3_access_key.trim(),
            s3_bucket_name: s3_bucket_name.trim(),
        };
        if (s3_secret_key.trim()) payload.s3_secret_key = s3_secret_key.trim();
        await onSubmit(payload);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">S3 Access Key *</label>
                <input
                    value={s3_access_key}
                    onChange={(e) => {
                        setAccessKey(e.target.value);
                        if (errors.s3_access_key) setErrors((x) => ({ ...x, s3_access_key: '' }));
                    }}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="AKIA…"
                />
                {errors.s3_access_key ? (
                    <p className="text-xs text-red-500 mt-1">{errors.s3_access_key}</p>
                ) : null}
            </div>

            <div>
                <label className="block text-sm font-medium">S3 Secret Key {initial ? '(leave blank to keep unchanged)' : '*'} </label>
                <div className="flex gap-2">
                    <input
                        type={showSecret ? 'text' : 'password'}
                        value={s3_secret_key}
                        onChange={(e) => {
                            setSecretKey(e.target.value);
                            if (errors.s3_secret_key) setErrors((x) => ({ ...x, s3_secret_key: '' }));
                        }}
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="••••••••"
                    />
                    <Button type="button" variant="secondary" onClick={() => setShowSecret((s) => !s)}>
                        {showSecret ? 'Hide' : 'Show'}
                    </Button>
                </div>
                {errors.s3_secret_key ? (
                    <p className="text-xs text-red-500 mt-1">{errors.s3_secret_key}</p>
                ) : (
                    <p className="text-xs text-gray-500 mt-1">
                        For security, the current secret may not be returned by the server; provide one to change.
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium">S3 Bucket Name *</label>
                <input
                    value={s3_bucket_name}
                    onChange={(e) => {
                        setBucket(e.target.value);
                        if (errors.s3_bucket_name) setErrors((x) => ({ ...x, s3_bucket_name: '' }));
                    }}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="my-fineract-files"
                />
                {errors.s3_bucket_name ? (
                    <p className="text-xs text-red-500 mt-1">{errors.s3_bucket_name}</p>
                ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save S3 Settings'}
                </Button>
            </div>
        </form>
    );
};

export default ExternalServiceS3Form;
