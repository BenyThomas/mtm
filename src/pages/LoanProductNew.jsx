import React, { useState } from 'react';
import LoanProductForm from '../components/LoanProductForm';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const LoanProductNew = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (payload) => {
        setSubmitting(true);
        try {
            const res = await api.post('/loanproducts', payload);
            const id = res.data?.resourceId || res.data?.loanProductId || res.data?.id;
            addToast('Loan product created', 'success');
            navigate('/loan-products');
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">New Loan Product</h1>
            <LoanProductForm onSubmit={onSubmit} submitting={submitting} />
        </div>
    );
};

export default LoanProductNew;
