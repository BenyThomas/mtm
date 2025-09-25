import React, { useState } from 'react';
import { createFund } from '../../api/funds';
import FundForm from '../../components/FundForm';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const FundCreate = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (payload) => {
        try {
            setSubmitting(true);
            await createFund(payload);
            addToast({ type: 'success', message: 'Fund created successfully.' });
            navigate('/accounting/funds', { replace: true });
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to create fund.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Create Fund</h1>
            <FundForm onSubmit={onSubmit} submitting={submitting} />
        </div>
    );
};

export default FundCreate;
