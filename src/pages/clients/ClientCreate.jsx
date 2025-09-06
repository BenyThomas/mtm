import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import ClientForm from '../../components/ClientForm';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ClientCreate = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [busy, setBusy] = useState(false);

    const create = async (payload) => {
        setBusy(true);
        try {
            const r = await api.post('/clients', payload);
            const id = r?.data?.clientId || r?.data?.resourceId || r?.data?.id;
            addToast('Client created', 'success');
            if (id) navigate(`/clients/${id}`);
            else navigate('/clients');
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage
                || e?.response?.data?.defaultUserMessage
                || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">New Client</h1>
            <Card>
                <ClientForm onSubmit={create} submitting={busy} />
            </Card>
        </div>
    );
};

export default ClientCreate;
