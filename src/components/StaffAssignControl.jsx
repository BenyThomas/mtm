import React, { useState } from 'react';
import StaffSelect from './StaffSelect';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

const todayISO = () => new Date().toISOString().slice(0, 10);

const StaffAssignControl = ({
                                loanId,                // optional: when provided, will POST to API
                                defaultDate = todayISO(),
                                onAssign,              // optional callback(staffId, date) after success (or when loanId not provided)
                                className = '',
                            }) => {
    const { addToast } = useToast();
    const [staffId, setStaffId] = useState('');
    const [date, setDate] = useState(defaultDate);
    const [busy, setBusy] = useState(false);

    const doAssign = async () => {
        if (!staffId) {
            addToast('Select a staff member', 'error');
            return;
        }
        if (loanId) {
            setBusy(true);
            try {
                await api.post(`/loans/${loanId}?command=assignLoanOfficer`, {
                    loanOfficerId: Number(staffId),
                    assignmentDate: date,
                    dateFormat: 'yyyy-MM-dd',
                    locale: 'en',
                });
                addToast('Loan officer assigned', 'success');
                onAssign?.(Number(staffId), date);
            } catch (err) {
                const msg =
                    err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                    err?.response?.data?.defaultUserMessage ||
                    'Assignment failed';
                addToast(msg, 'error');
            } finally {
                setBusy(false);
            }
        } else {
            onAssign?.(Number(staffId), date);
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-medium">Assign Loan Officer</label>
            <StaffSelect
                loanOfficerOnly
                value={staffId}
                onChange={setStaffId}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                    <label className="block text-sm font-medium">Assignment Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="md:col-span-2">
                    <Button onClick={doAssign} disabled={busy}>
                        {busy ? 'Assigning…' : 'Assign Officer'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StaffAssignControl;
