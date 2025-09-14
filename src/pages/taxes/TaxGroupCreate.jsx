import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import TaxGroupForm from './TaxGroupForm';
import { useToast } from '../../context/ToastContext';

const TaxGroupCreate = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const createGroup = async (payload) => {
        setSubmitting(true);
        try {
            const res = await api.post('/taxes/group', { ...payload, locale: 'en' });
            addToast('Tax group created', 'success');
            navigate('/accounting/tax-groups', { replace: true });
            return res?.data;
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.map(er => er?.defaultUserMessage).join('; ') ||
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Failed to create tax group';
            addToast(msg, 'error');
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">New Tax Group</h1>
            </div>
            <Card>
                <TaxGroupForm onSubmit={createGroup} submitting={submitting} />
            </Card>
        </div>
    );
};

export default TaxGroupCreate;
