import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import TaxComponentForm from './TaxComponentForm';
import { useToast } from '../../context/ToastContext';

const TaxComponentCreate = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const createComponent = async (payload) => {
        setSubmitting(true);
        try {
            const res = await api.post('/taxes/component', payload);
            addToast('Tax component created', 'success');
            navigate('/accounting/tax-components', { replace: true });
            return res?.data;
        } catch (e) {
            const msg =
                e?.response?.data?.errors?.map((er) => er?.defaultUserMessage).join('; ') ||
                e?.response?.data?.defaultUserMessage ||
                e?.message ||
                'Failed to create tax component';
            addToast(msg, 'error');
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">New Tax Component</h1>
            </div>
            <Card>
                <TaxComponentForm onSubmit={createComponent} submitting={submitting} />
            </Card>
        </div>
    );
};

export default TaxComponentCreate;
