import React, { useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import BatchRequestRow from '../components/BatchRequestRow';

const exampleClientLoan = () => ([
    {
        requestId: '1',
        method: 'POST',
        relativeUrl: 'clients',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        _bodyText: JSON.stringify({
            firstname: 'Jane',
            lastname: 'Doe',
            officeId: 1,
            legalFormId: 1,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
            active: true,
            activationDate: new Date().toISOString().slice(0,10),
        }, null, 2),
    },
    {
        requestId: '2',
        reference: '1',
        method: 'POST',
        relativeUrl: 'loans',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        _bodyText: JSON.stringify({
            clientId: '$.clientId', // resolved from request 1 response
            loanProductId: 1,
            principal: 1000000,
            loanTermFrequency: 12,
            loanTermFrequencyType: 2,
            numberOfRepayments: 12,
            repaymentEvery: 1,
            repaymentFrequencyType: 2,
            expectedDisbursementDate: new Date().toISOString().slice(0,10),
            submittedOnDate: new Date().toISOString().slice(0,10),
            amortizationType: 1,
            interestRatePerPeriod: 2,
            interestRateFrequencyType: 2,
            interestType: 0,
            transactionProcessingStrategyId: 1,
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        }, null, 2),
    },
    {
        requestId: '3',
        reference: '2',
        method: 'POST',
        relativeUrl: 'loans/$.loanId?command=approve',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        _bodyText: JSON.stringify({
            approvedOnDate: new Date().toISOString().slice(0,10),
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        }, null, 2),
    },
    {
        requestId: '4',
        reference: '2',
        method: 'POST',
        relativeUrl: 'loans/$.loanId?command=disburse',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        _bodyText: JSON.stringify({
            actualDisbursementDate: new Date().toISOString().slice(0,10),
            dateFormat: 'yyyy-MM-dd',
            locale: 'en',
        }, null, 2),
    },
]);

const exampleKits = [
    { key: 'blank', name: 'Blank (1 GET)', build: () => ([{ requestId: '1', method: 'GET', relativeUrl: 'clients' }]) },
    { key: 'clientLoan', name: 'Client → Loan → Approve → Disburse', build: exampleClientLoan },
];

const BatchRunner = () => {
    const { addToast } = useToast();

    const [requests, setRequests] = useState([{ requestId: '1', method: 'GET', relativeUrl: '' }]);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState('');

    const [enclosingTx, setEnclosingTx] = useState(true);

    const addRequest = () => {
        const nextId = String(
            requests.reduce((mx, r) => Math.max(mx, Number(r.requestId || 0)), 0) + 1
        );
        setRequests([...requests, { requestId: nextId, method: 'GET', relativeUrl: '' }]);
    };

    const updateRequest = (idx, next) => {
        const arr = requests.slice();
        arr[idx] = next;
        setRequests(arr);
    };

    const removeRequest = (idx) => {
        setRequests(requests.filter((_, i) => i !== idx));
    };

    const moveUp = (idx) => {
        if (idx === 0) return;
        const arr = requests.slice();
        [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
        setRequests(arr);
    };

    const moveDown = (idx) => {
        if (idx === requests.length - 1) return;
        const arr = requests.slice();
        [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
        setRequests(arr);
    };

    const clearAll = () => {
        setRequests([{ requestId: '1', method: 'GET', relativeUrl: '' }]);
        setResult(null);
    };

    const loadExample = (key) => {
        const kit = exampleKits.find((k) => k.key === key);
        if (!kit) return;
        setRequests(kit.build());
        setResult(null);
        addToast(`Loaded example: ${kit.name}`, 'success');
    };

    const buildPayload = () => {
        return requests.map((r) => {
            const payload = {
                requestId: String(r.requestId ?? ''),
                method: (r.method || 'GET').toUpperCase(),
                relativeUrl: r.relativeUrl || '',
            };
            if (r.reference) payload.reference = String(r.reference);
            if (Array.isArray(r.headers) && r.headers.length) {
                const cleaned = r.headers
                    .filter((h) => (h.name || '').trim())
                    .map((h) => ({ name: h.name.trim(), value: (h.value || '').trim() }));
                if (cleaned.length) payload.headers = cleaned;
            }
            const bodyText = (r._bodyText ?? r.body ?? '').toString().trim();
            if (bodyText) {
                try {
                    const obj = JSON.parse(bodyText);
                    payload.body = JSON.stringify(obj);
                } catch {
                    // send raw, but warn
                    payload.body = bodyText;
                }
            }
            return payload;
        });
    };

    const send = async () => {
        // minimal validation
        for (const r of requests) {
            if (!r.requestId || !r.relativeUrl) {
                addToast('Each request needs a Request ID and Relative URL', 'error');
                return;
            }
        }
        setBusy(true);
        setResult(null);
        try {
            const params = enclosingTx ? { params: { enclosingTransaction: 'true' } } : undefined;
            const payload = buildPayload();
            const res = await api.post('/batches', payload, params);
            setResult(res?.data || []);
            addToast('Batch executed', 'success');
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                err?.message ||
                'Batch failed';
            addToast(msg, 'error');
            setResult({ error: msg, raw: err?.response?.data });
        } finally {
            setBusy(false);
        }
    };

    const exportJson = () => {
        try {
            const payload = buildPayload();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'batch_requests.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('Exported JSON', 'success');
        } catch {
            addToast('Export failed', 'error');
        }
    };

    const handleImport = () => {
        try {
            const arr = JSON.parse(importText);
            if (!Array.isArray(arr)) throw new Error('JSON must be an array');
            const mapped = arr.map((r, i) => ({
                requestId: r.requestId != null ? String(r.requestId) : String(i + 1),
                method: (r.method || 'GET').toUpperCase(),
                relativeUrl: r.relativeUrl || '',
                reference: r.reference || '',
                headers: Array.isArray(r.headers) ? r.headers.map(h => ({ name: h.name || '', value: h.value || '' })) : [],
                _bodyText: r.body ? (typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2)) : '',
            }));
            setRequests(mapped);
            setImportText('');
            setImportOpen(false);
            setResult(null);
            addToast('Imported batch JSON', 'success');
        } catch (e) {
            addToast(`Import failed: ${e.message}`, 'error');
        }
    };

    const hasResult = useMemo(() => !!result, [result]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Batch API</h1>
                <div className="flex items-center gap-2">
                    <select
                        className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        onChange={(e) => e.target.value && loadExample(e.target.value)}
                        defaultValue=""
                    >
                        <option value="" disabled>Load example…</option>
                        {exampleKits.map((k) => <option key={k.key} value={k.key}>{k.name}</option>)}
                    </select>
                    <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
                        <input type="checkbox" checked={enclosingTx} onChange={(e) => setEnclosingTx(e.target.checked)} />
                        Single DB transaction
                    </label>
                    <Button variant="secondary" onClick={() => setImportOpen(true)}>Import JSON</Button>
                    <Button variant="secondary" onClick={exportJson}>Export JSON</Button>
                    <Button onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Run Batch'}</Button>
                </div>
            </div>

            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Requests</div>
                    <div className="space-x-2">
                        <Button variant="secondary" onClick={addRequest}>Add Request</Button>
                        <Button variant="danger" onClick={clearAll}>Clear</Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {requests.map((r, idx) => (
                        <BatchRequestRow
                            key={idx}
                            request={r}
                            onChange={(next) => updateRequest(idx, next)}
                            onRemove={() => removeRequest(idx)}
                            onMoveUp={() => moveUp(idx)}
                            onMoveDown={() => moveDown(idx)}
                            isFirst={idx === 0}
                            isLast={idx === requests.length - 1}
                        />
                    ))}
                </div>
            </Card>

            <Card>
                <div className="font-semibold mb-3">Help</div>
                <ul className="list-disc pl-6 text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <li><strong>Relative URL</strong> is the path after <code>/api/v1/</code> (our axios base), e.g. <code>clients/1</code> or <code>loans?overdue=true</code>.</li>
                    <li>Use <strong>reference</strong> to depend on another request’s <code>requestId</code>. Then use <code>$.jsonPath</code> inside the dependent URL/body to pull values from the referenced response.</li>
                    <li>Bodies must be valid JSON; they’ll be stringified automatically for Fineract’s Batch API.</li>
                </ul>
            </Card>

            <Card>
                <div className="font-semibold mb-3">Response</div>
                {!hasResult ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No response yet.</div>
                ) : result?.error ? (
                    <div className="space-y-2">
                        <div className="text-sm text-red-500">Error: {result.error}</div>
                        {result.raw ? (
                            <pre className="text-xs overflow-auto p-2 rounded bg-gray-100 dark:bg-gray-800">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
                        ) : null}
                    </div>
                ) : Array.isArray(result) ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Request ID</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Body</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.map((r, i) => (
                                <tr key={i} className="border-t border-gray-200 dark:border-gray-700 text-sm align-top">
                                    <td className="py-2 pr-4">{r.requestId}</td>
                                    <td className="py-2 pr-4">{r.statusCode || r.status || '-'}</td>
                                    <td className="py-2 pr-4">
                      <pre className="text-xs overflow-auto max-h-64 p-2 rounded bg-gray-100 dark:bg-gray-800">
                        {typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2)}
                      </pre>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <pre className="text-xs overflow-auto p-2 rounded bg-gray-100 dark:bg-gray-800">
            {JSON.stringify(result, null, 2)}
          </pre>
                )}
            </Card>

            {/* Import JSON modal */}
            <Modal
                open={importOpen}
                title="Import Batch JSON"
                onClose={() => setImportOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
                        <Button onClick={handleImport}>Import</Button>
                    </>
                }
            >
        <textarea
            rows={12}
            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
            placeholder='[{"requestId":"1","method":"GET","relativeUrl":"clients"}]'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
        />
            </Modal>
        </div>
    );
};

export default BatchRunner;
