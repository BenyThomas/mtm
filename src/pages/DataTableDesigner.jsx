import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const APP_TABLES = [
    // Common Fineract app tables; adjust as needed
    'm_client',
    'm_group',
    'm_center',
    'm_loan',
    'm_savings_account',
    'm_office',
    'm_staff',
];

const emptyCol = () => ({
    name: '',
    type: 'String', // String, Text, Boolean, Number, Decimal, Date
    length: '',
    mandatory: false,
    unique: false,
    code: '', // optional Code name/id
});

const DataTableDesigner = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [datatableName, setDatatableName] = useState('');
    const [apptableName, setApptableName] = useState(APP_TABLES[0]);
    const [multiRow, setMultiRow] = useState(false);
    const [columns, setColumns] = useState([emptyCol()]);
    const [busy, setBusy] = useState(false);

    const setCol = (i, patch) => {
        setColumns((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    };

    const addCol = () => setColumns((prev) => [...prev, emptyCol()]);
    const delCol = (i) => setColumns((prev) => prev.filter((_, idx) => idx !== i));

    const validate = () => {
        if (!datatableName.trim()) return 'Table name is required';
        if (!apptableName.trim()) return 'App table is required';
        if (!columns.length) return 'At least one column required';
        for (const c of columns) {
            if (!c.name.trim()) return 'Each column needs a name';
            if (!c.type) return 'Each column needs a type';
            if ((c.type === 'String' || c.type === 'Text') && c.length && Number(c.length) < 1) {
                return 'Length must be positive';
            }
        }
        return '';
    };

    const create = async () => {
        const err = validate();
        if (err) { addToast(err, 'error'); return; }
        setBusy(true);
        try {
            const payload = {
                datatableName: datatableName.trim(),
                apptableName: apptableName.trim(),
                multiRow: Boolean(multiRow),
                columns: columns.map((c) => {
                    const out = {
                        name: c.name.trim(),
                        type: c.type, // Fineract accepts String/Text/Boolean/Number/Decimal/Date
                        mandatory: Boolean(c.mandatory),
                        unique: Boolean(c.unique),
                    };
                    if (c.length) out.length = Number(c.length);
                    if (c.code) out.code = c.code.trim();
                    return out;
                }),
            };
            await api.post('/datatables', payload);
            addToast('Data table created', 'success');
            navigate(`/config/datatables/${encodeURIComponent(datatableName.trim())}`, { replace: true });
        } catch (e) {
            const msg = e?.response?.data?.defaultUserMessage || 'Create failed';
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">New Data Table</h1>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => navigate('/config/datatables')}>Back</Button>
                    <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Table Name *</label>
                        <input
                            value={datatableName}
                            onChange={(e) => setDatatableName(e.target.value)}
                            placeholder="ex_client_family"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">App Table *</label>
                        <select
                            value={apptableName}
                            onChange={(e) => setApptableName(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {APP_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <label className="inline-flex items-center gap-2 mt-4">
                    <input type="checkbox" checked={multiRow} onChange={(e) => setMultiRow(e.target.checked)} />
                    One-to-many (allow multiple rows per parent)
                </label>
            </Card>

            <Card>
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Columns</h2>
                    <Button variant="secondary" onClick={addCol}>Add Column</Button>
                </div>
                <div className="mt-4 space-y-4">
                    {columns.map((c, i) => (
                        <div key={i} className="border rounded-md p-3 dark:border-gray-700">
                            <div className="grid md:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-sm font-medium">Name *</label>
                                    <input
                                        value={c.name}
                                        onChange={(e) => setCol(i, { name: e.target.value })}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Type *</label>
                                    <select
                                        value={c.type}
                                        onChange={(e) => setCol(i, { type: e.target.value })}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option>String</option>
                                        <option>Text</option>
                                        <option>Boolean</option>
                                        <option>Number</option>
                                        <option>Decimal</option>
                                        <option>Date</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Length</label>
                                    <input
                                        type="number"
                                        value={c.length}
                                        onChange={(e) => setCol(i, { length: e.target.value })}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="e.g. 255"
                                    />
                                </div>
                                <div className="flex items-end gap-4">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={c.mandatory}
                                            onChange={(e) => setCol(i, { mandatory: e.target.checked })}
                                        />
                                        Mandatory
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={c.unique}
                                            onChange={(e) => setCol(i, { unique: e.target.checked })}
                                        />
                                        Unique
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Code (optional)</label>
                                    <input
                                        value={c.code}
                                        onChange={(e) => setCol(i, { code: e.target.value })}
                                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="Code name or id"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 text-right">
                                <Button variant="danger" onClick={() => delCol(i)}>Remove</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default DataTableDesigner;
