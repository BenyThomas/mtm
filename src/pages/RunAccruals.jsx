import React, { useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const todayISO = () => {
    const d = new Date();
    // normalize to local YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const RunAccruals = () => {
    const { addToast } = useToast();

    const [tillDate, setTillDate] = useState(todayISO());
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const isDateValid = useMemo(() => {
        if (!tillDate) return false;
        const d = new Date(tillDate);
        return !Number.isNaN(d.getTime());
    }, [tillDate]);

    const run = async () => {
        if (!isDateValid) {
            addToast('Please pick a valid date.', 'error');
            return;
        }
        setBusy(true);
        setResult(null);
        try {
            // Fineract: POST /runaccruals with date payload
            // Many tenants accept: { tillDate, dateFormat, locale }
            const payload = {
                tillDate,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
            };
            const res = await api.post('/runaccruals', payload);

            setResult(res?.data || { status: 'OK' });
            addToast('Periodic accruals executed', 'success');
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                err?.message ||
                'Accrual run failed';
            setResult({ error: msg, raw: err?.response?.data });
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Periodic Accrual Accounting</h1>
            </div>

            <Card>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Accrue loan income up to the specified date. If you leave this as today,
                        accruals are posted through end of today. Your tenant’s batch job schedule
                        may also run accruals automatically; this manual action is for on-demand runs.
                    </p>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Accrue Until (inclusive)</label>
                            <input
                                type="date"
                                value={tillDate}
                                onChange={(e) => setTillDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={run} disabled={busy || !isDateValid}>
                            {busy ? 'Running…' : 'Run Accruals'}
                        </Button>
                        <span className="text-xs text-gray-500">
              This can take time depending on portfolio size.
            </span>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="font-semibold mb-2">Last Result</div>
                {!result ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        No run yet. Submit the form above to execute accruals.
                    </div>
                ) : result?.error ? (
                    <div className="space-y-2">
                        <div className="text-sm text-red-500">Error: {result.error}</div>
                        {result.raw ? (
                            <pre className="text-xs overflow-auto p-2 rounded bg-gray-100 dark:bg-gray-800">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
                        ) : null}
                    </div>
                ) : (
                    <pre className="text-xs overflow-auto p-2 rounded bg-gray-100 dark:bg-gray-800">
            {JSON.stringify(result, null, 2)}
          </pre>
                )}
            </Card>
        </div>
    );
};

export default RunAccruals;
