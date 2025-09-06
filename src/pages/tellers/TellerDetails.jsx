import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import TellerForm from '../../components/TellerForm';
import CashierForm from '../../components/CashierForm';
import CashMovementModal from '../../components/CashMovementModal';

const TellerDetails = () => {
    const { tellerId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [teller, setTeller] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Cashiers tab etc. (unchanged from your current version)
    const [cashiersLoading, setCashiersLoading] = useState(true);
    const [cashiers, setCashiers] = useState([]);
    const [cashierCreateOpen, setCashierCreateOpen] = useState(false);
    const [cashierBusy, setCashierBusy] = useState(false);
    const [editCashier, setEditCashier] = useState(null);
    const [movement, setMovement] = useState({ open: false, mode: 'allocate', cashierId: null });
    const [cashierTxLoading, setCashierTxLoading] = useState(false);
    const [txForCashier, setTxForCashier] = useState(null);
    const [cashierSummary, setCashierSummary] = useState(null);
    const [cashierTransactions, setCashierTransactions] = useState([]);
    const [journals, setJournals] = useState([]);
    const [tellerTx, setTellerTx] = useState([]);
    const [sec, setSec] = useState('cashiers');

    const loadTeller = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/tellers/${tellerId}`);
            const d = r?.data || {};
            setTeller({
                id: d.id,
                name: d.name || d.tellerName || `Teller #${tellerId}`,
                officeId: d.officeId || d.office?.id,
                officeName: d.officeName || d.office?.name,
                description: d.description || '',
                status: d.status || (d.isActive ? 'ACTIVE' : 'INACTIVE'),
                startDate: d.startDate || d.openingDate || d.fromDate || '', // show if API provides it
            });
        } catch (e) {
            setTeller(null);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load teller', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCashiers = async () => {
        setCashiersLoading(true);
        try {
            const r = await api.get(`/tellers/${tellerId}/cashiers`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((c) => ({
                id: c.id,
                staffId: c.staffId || c.staff?.id,
                staffName: c.staffName || c.staff?.displayName || c.displayName || c.name,
                isFullDay: Boolean(c.isFullDay),
                fromDate: c.fromDate,
                toDate: c.toDate,
                startTime: c.startTime,
                endTime: c.endTime,
                description: c.description || '',
            }));
            setCashiers(norm);
        } catch (e) {
            setCashiers([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load cashiers', 'error');
        } finally {
            setCashiersLoading(false);
        }
    };

    const loadJournals = async () => {
        try {
            const r = await api.get(`/tellers/${tellerId}/journals`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setJournals(list);
        } catch (_e) {
            setJournals([]);
        }
    };

    const loadTellerTx = async () => {
        try {
            const r = await api.get(`/tellers/${tellerId}/transactions`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            setTellerTx(list);
        } catch (_e) {
            setTellerTx([]);
        }
    };

    useEffect(() => {
        loadTeller();
        loadCashiers();
        loadJournals();
        loadTellerTx();
        // eslint-disable-next-line
    }, [tellerId]);

    const saveTeller = async (payload) => {
        setSaving(true);
        try {
            // Reuse same strict shape on update (server will ignore immutable fields)
            await api.put(`/tellers/${tellerId}`, payload);
            addToast('Teller updated', 'success');
            setEditOpen(false);
            await loadTeller();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteTeller = async () => {
        if (!window.confirm('Delete this teller?')) return;
        try {
            await api.delete(`/tellers/${tellerId}`);
            addToast('Teller deleted', 'success');
            navigate('/tellers');
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    const createCashier = async (payload) => {
        setCashierBusy(true);
        try {
            await api.post(`/tellers/${tellerId}/cashiers`, payload);
            addToast('Cashier created', 'success');
            setCashierCreateOpen(false);
            await loadCashiers();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Create failed', 'error');
        } finally {
            setCashierBusy(false);
        }
    };

    const updateCashier = async (cashierId, payload) => {
        setCashierBusy(true);
        try {
            await api.put(`/tellers/${tellerId}/cashiers/${cashierId}`, payload);
            addToast('Cashier updated', 'success');
            setEditCashier(null);
            await loadCashiers();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Update failed', 'error');
        } finally {
            setCashierBusy(false);
        }
    };

    const deleteCashier = async (cashierId) => {
        if (!window.confirm('Delete this cashier?')) return;
        try {
            await api.delete(`/tellers/${tellerId}/cashiers/${cashierId}`);
            addToast('Cashier deleted', 'success');
            await loadCashiers();
        } catch (e) {
            addToast(e?.response?.data?.defaultUserMessage || 'Delete failed', 'error');
        }
    };

    const openTxForCashier = async (cashierId) => {
        setCashierTxLoading(true);
        setTxForCashier(cashierId);
        try {
            const r = await api.get(`/tellers/${tellerId}/cashiers/${cashierId}/summaryandtransactions`);
            const d = r?.data || {};
            setCashierSummary(d?.summary || d?.totals || null);
            const tx = Array.isArray(d?.transactions) ? d.transactions : (d?.pageItems || []);
            setCashierTransactions(tx);
        } catch (_e) {
            setCashierSummary(null);
            setCashierTransactions([]);
        } finally {
            setCashierTxLoading(false);
        }
    };

    const secBtn = (key, label) => (
        <button
            onClick={() => setSec(key)}
            className={`px-3 py-2 rounded-md text-sm ${sec === key ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
            {label}
        </button>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="8rem" /></Card>
            </div>
        );
    }

    if (!teller) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Teller</h1>
                <Card>Not found.</Card>
                <Button variant="secondary" onClick={() => navigate('/tellers')}>Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{teller.name}</h1>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        #{teller.id} • {teller.officeName || '—'} • {teller.status || '—'}
                        {teller.startDate ? ` • Start: ${teller.startDate}` : ''}
                    </div>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="danger" onClick={deleteTeller}>Delete</Button>
                    <Button variant="secondary" onClick={() => navigate('/tellers')}>All Tellers</Button>
                </div>
            </div>

            {/* ...the rest of your tabs and content remain as in your current file... */}

            <Modal open={editOpen} title={`Edit: ${teller.name}`} onClose={() => setEditOpen(false)} footer={null}>
                <TellerForm initial={teller} onSubmit={saveTeller} submitting={saving} />
            </Modal>

            {/* Cashier create/edit and movement modals unchanged */}
            <Modal open={cashierCreateOpen} title="New Cashier" onClose={() => setCashierCreateOpen(false)} footer={null}>
                <CashierForm tellerId={tellerId} onSubmit={createCashier} submitting={cashierBusy} />
            </Modal>

            <Modal open={!!editCashier} title={`Edit Cashier #${editCashier?.id}`} onClose={() => setEditCashier(null)} footer={null}>
                {editCashier ? (
                    <CashierForm
                        tellerId={tellerId}
                        initial={editCashier}
                        onSubmit={(payload) => updateCashier(editCashier.id, payload)}
                        submitting={cashierBusy}
                    />
                ) : null}
            </Modal>

            <CashMovementModal
                open={movement.open}
                onClose={() => setMovement({ open: false, mode: 'allocate', cashierId: null })}
                tellerId={tellerId}
                cashierId={movement.cashierId}
                mode={movement.mode}
                onDone={() => {
                    if (movement.cashierId) openTxForCashier(movement.cashierId);
                }}
            />
        </div>
    );
};

export default TellerDetails;
