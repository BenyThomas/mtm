import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import Card from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import AddressForm from '../../components/AddressForm';
import { useToast } from '../../context/ToastContext';

/**
 * Props:
 * - clientId (number)
 * - refreshKey (number)  // when changed, list reloads
 */
const ClientAddresses = ({ clientId, refreshKey = 0 }) => {
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/client/${clientId}/addresses`);
            const list = Array.isArray(r?.data) ? r.data : (r?.data?.pageItems || []);
            const norm = list.map((a, i) => ({
                id: a.id || a.addressId || i + 1,
                addressTypeId: a.addressTypeId || a.addressType?.id,
                addressTypeName: a.addressType?.name || a.addressType || '',
                isActive: typeof a.isActive === 'boolean' ? a.isActive : true,
                isPrimary: typeof a.isPrimary === 'boolean' ? a.isPrimary : false,
                addressLine1: a.addressLine1 || '',
                addressLine2: a.addressLine2 || '',
                addressLine3: a.addressLine3 || '',
                street: a.street || '',
                city: a.city || a.town || '',
                stateProvinceId: a.stateProvinceId || a.stateProvince?.id,
                stateProvinceName: a.stateProvince?.name || '',
                countryId: a.countryId || a.country?.id,
                countryName: a.country?.name || '',
                postalCode: a.postalCode || '',
                houseNo: a.houseNo || '',
            }));
            setRows(norm);
        } catch (e) {
            setRows([]);
            addToast(e?.response?.data?.defaultUserMessage || 'Failed to load addresses', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [clientId, refreshKey]);

    const create = async (payload) => {
        setBusy(true);
        try {
            await api.post(`/client/${clientId}/addresses`, payload);
            addToast('Address added', 'success');
            setCreateOpen(false);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = async (payload) => {
        if (!editItem?.id) return;
        setBusy(true);
        try {
            await api.put(`/client/${clientId}/addresses`, payload); // expects addressId inside payload
            addToast('Address updated', 'success');
            setEditItem(null);
            await load();
        } catch (e) {
            const msg = e?.response?.data?.errors?.[0]?.defaultUserMessage || e?.response?.data?.defaultUserMessage || 'Update failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Addresses</h2>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => setCreateOpen(true)}>Add Address</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !rows.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No addresses found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Lines</th>
                                <th className="py-2 pr-4">City</th>
                                <th className="py-2 pr-4">State</th>
                                <th className="py-2 pr-4">Country</th>
                                <th className="py-2 pr-4">Postal</th>
                                <th className="py-2 pr-4">Primary</th>
                                <th className="py-2 pr-4">Active</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{r.addressTypeName || r.addressTypeId || '—'}</td>
                                    <td className="py-2 pr-4">
                                        {[r.houseNo, r.addressLine1, r.addressLine2, r.addressLine3, r.street].filter(Boolean).join(', ')}
                                    </td>
                                    <td className="py-2 pr-4">{r.city || '—'}</td>
                                    <td className="py-2 pr-4">{r.stateProvinceName || '—'}</td>
                                    <td className="py-2 pr-4">{r.countryName || '—'}</td>
                                    <td className="py-2 pr-4">{r.postalCode || '—'}</td>
                                    <td className="py-2 pr-4">{r.isPrimary ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4">{r.isActive ? 'Yes' : 'No'}</td>
                                    <td className="py-2 pr-4 whitespace-nowrap">
                                        <Button variant="secondary" onClick={() => setEditItem(r)}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create */}
            <Modal open={createOpen} title="Add Address" onClose={() => setCreateOpen(false)} footer={null}>
                <AddressForm clientId={clientId} onSubmit={create} submitting={busy} />
            </Modal>

            {/* Edit */}
            <Modal open={!!editItem} title="Edit Address" onClose={() => setEditItem(null)} footer={null}>
                {editItem ? (
                    <AddressForm clientId={clientId} initial={editItem} onSubmit={save} submitting={busy} />
                ) : null}
            </Modal>
        </div>
    );
};

export default ClientAddresses;
