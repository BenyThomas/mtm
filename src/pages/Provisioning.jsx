import React, { useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const Provisioning = () => {
    const { addToast } = useToast();
    const [date, setDate] = useState(todayISO());
    const [createJournals, setCreateJournals] = useState(true);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const valid = useMemo(() => Boolean(date), [date]);

    const run = async () => {
        if (!valid) {
            addToast('Please choose a valid date.', 'error');
            return;
        }
        setBusy(true);
        setResult(null);
        try {
            // Fineract expects: date (or provisioningEntryDate), dateFormat, locale, createjournalentries
            const payload = {
                date,
                dateFormat: 'yyyy-MM-dd',
                locale: 'en',
                createjournalentries: Boolean(createJournals),
            };
            const res = await api.post('/provisioningentries', payload);
            setResult(res?.data || { status: 'OK' });
            addToast('Provisioning entries generated', 'success');
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                err?.message ||
                'Failed to generate provisioning entries';
            setResult({ error: msg, raw: err?.response?.data });
            addToast(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Provisioning Entries</h1>
            </div>

            <Card>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Generate provisioning entries for all active loan products on a specific date.
                        Optionally create corresponding journal entries.
                    </p>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Provisioning Date *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={createJournals}
                                    onChange={(e) => setCreateJournals(e.target.checked)}
                                />
                                Create journal entries
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={run} disabled={busy || !valid}>
                            {busy ? 'Running…' : 'Generate'}
                        </Button>
                        <span className="text-xs text-gray-500">
              Depending on portfolio size, this can take a moment.
            </span>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="font-semibold mb-2">Last Result</div>
                {!result ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No run yet.</div>
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

export default Provisioning;
