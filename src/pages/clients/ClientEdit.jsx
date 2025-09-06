import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/Card';
import ClientForm from '../../components/ClientForm';
import Skeleton from '../../components/Skeleton';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ClientEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [client, setClient] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/${id}`);
            setClient(r?.data || null);
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load client', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [id]);

    const save = async (payload) => {
        setBusy(true);
        try {
            await api.put(`/clients/${id}`, payload);
            addToast('Client updated', 'success');
            navigate(`/clients/${id}`);
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage
                || e?.response?.data?.defaultUserMessage
                || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Edit Client</h1>

            <Card>
                {loading ? (
                    <Skeleton height="14rem" />
                ) : !client ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Client not found.</div>
                ) : (
                    <ClientForm initial={client} onSubmit={save} submitting={busy} />
                )}
            </Card>
        </div>
    );
};

export default ClientEdit;
