import React, { useEffect, useState } from 'react';
import { getFund, updateFund } from '../../api/funds';
import FundForm from '../../components/FundForm';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import Skeleton from '../../components/Skeleton';

const FundEdit = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [fund, setFund] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await getFund(id);
                setFund(data);
            } catch (e) {
                addToast({ type: 'error', message: 'Failed to load fund.' });
            } finally {
                setLoading(false);
            }
        })();
    }, [id, addToast]);

    const onSubmit = async (payload) => {
        try {
            setSubmitting(true);
            await updateFund(id, payload);
            addToast({ type: 'success', message: 'Fund updated successfully.' });
            navigate('/accounting/funds');
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to update fund.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Edit Fund</h1>
            {loading ? (
                <div className="space-y-2">
                    <Skeleton height="3rem" />
                    <Skeleton height="3rem" />
                </div>
            ) : (
                <FundForm initial={fund} onSubmit={onSubmit} submitting={submitting} />
            )}
        </div>
    );
};

export default FundEdit;
