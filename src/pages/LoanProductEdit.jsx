import React, { useEffect, useState } from 'react';
import LoanProductForm from '../components/LoanProductForm';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';

const LoanProductEdit = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [initial, setInitial] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                // Include accounting mappings & charges where supported
                const res = await api.get(`/loanproducts/${id}`, {
                    params: { associations: 'charges,accountingMappings' },
                });
                if (!cancelled) setInitial(res.data || res);
            } catch {
                if (!cancelled) setInitial(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => (cancelled = true);
    }, [id]);

    const onSubmit = async (payload) => {
        setSubmitting(true);
        try {
            await api.put(`/loanproducts/${id}`, payload);
            addToast('Loan product updated', 'success');
            navigate('/loan-products');
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Update failed';
            addToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Edit Loan Product</h1>
                <Card><Skeleton height="10rem" /></Card>
            </div>
        );
    }

    if (!initial) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Edit Loan Product</h1>
                <Card>Product not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Edit Loan Product</h1>
            <LoanProductForm initial={initial} onSubmit={onSubmit} submitting={submitting} />
        </div>
    );
};

export default LoanProductEdit;
