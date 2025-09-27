import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import TaxGroupForm from './TaxGroupForm';
import { useToast } from '../../context/ToastContext';

const TaxGroupEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initial, setInitial] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`/taxes/group/${id}`);
                if (!cancelled) setInitial(res?.data || null);
            } catch {
                if (!cancelled) {
                    setInitial(null);
                    addToast('Failed to load tax group', 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, addToast]);

    const save = async (payload) => {
        setSubmitting(true);
        try {
            await api.put(`/taxes/group/${id}`, { ...payload, locale: 'en' });
            addToast('Tax group updated', 'success');
            navigate('/accounting/tax-groups', { replace: true });
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.map(er => er?.defaultUserMessage).join('; ') ||
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Failed to update tax group';
            addToast(msg, 'error');
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Edit Tax Group</h1>
            </div>
            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !initial ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tax group not found.</div>
                ) : (
                    <TaxGroupForm initial={initial} onSubmit={save} submitting={submitting} />
                )}
            </Card>
        </div>
    );
};

export default TaxGroupEdit;
