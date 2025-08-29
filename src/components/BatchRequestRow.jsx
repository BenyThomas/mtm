import React, { useMemo, useState, useEffect } from 'react';
import Button from './Button';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const HeaderRow = ({ h, onChange, onRemove }) => (
    <div className="grid grid-cols-12 gap-2">
        <input
            className="col-span-5 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Header name (e.g. Content-Type)"
            value={h.name}
            onChange={(e) => onChange({ ...h, name: e.target.value })}
        />
        <input
            className="col-span-6 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Header value (e.g. application/json)"
            value={h.value}
            onChange={(e) => onChange({ ...h, value: e.target.value })}
        />
        <div className="col-span-1">
            <Button variant="danger" onClick={onRemove}>✕</Button>
        </div>
    </div>
);

const BatchRequestRow = ({ request, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const [bodyText, setBodyText] = useState(request._bodyText ?? (request.body || ''));
    const [bodyError, setBodyError] = useState('');

    useEffect(() => {
        setBodyText(request._bodyText ?? (request.body || ''));
    }, [request._bodyText, request.body]);

    const headers = useMemo(() => request.headers || [], [request.headers]);

    const setField = (k, v) => onChange({ ...request, [k]: v });

    const setBodyAndValidate = (text) => {
        setBodyText(text);
        setField('_bodyText', text);
        if (!text.trim()) {
            setBodyError('');
            return;
        }
        try {
            JSON.parse(text);
            setBodyError('');
        } catch (e) {
            setBodyError('Invalid JSON');
        }
    };

    const addHeader = () => setField('headers', [...headers, { name: '', value: '' }]);
    const updateHeader = (idx, next) => {
        const arr = headers.slice();
        arr[idx] = next;
        setField('headers', arr);
    };
    const removeHeader = (idx) => setField('headers', headers.filter((_, i) => i !== idx));

    return (
        <div className="border rounded-md p-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Request ID</span>
                    <input
                        className="w-24 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={request.requestId}
                        onChange={(e) => setField('requestId', e.target.value)}
                        placeholder="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={onMoveUp} disabled={isFirst}>↑</Button>
                    <Button variant="secondary" onClick={onMoveDown} disabled={isLast}>↓</Button>
                    <Button variant="danger" onClick={onRemove}>Remove</Button>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-3 mt-3">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Method</label>
                    <select
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={request.method}
                        onChange={(e) => setField('method', e.target.value)}
                    >
                        {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="md:col-span-7">
                    <label className="block text-sm font-medium">Relative URL *</label>
                    <input
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g. clients or loans?command=calculateLoanSchedule"
                        value={request.relativeUrl}
                        onChange={(e) => setField('relativeUrl', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        This is the path after <code>/api/v1/</code>. Example: <code>clients/$.clientId</code>
                    </p>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium">Reference (depends on)</label>
                    <input
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="requestId this depends on (e.g. 1)"
                        value={request.reference || ''}
                        onChange={(e) => setField('reference', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use <code>$.jsonPath</code> in URL/body to pull from the referenced response.</p>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Headers (optional)</label>
                    <Button variant="secondary" onClick={addHeader}>Add Header</Button>
                </div>
                {!headers.length ? (
                    <div className="text-xs text-gray-500">No custom headers. Default tenant/auth will be added automatically.</div>
                ) : (
                    <div className="space-y-2">
                        {headers.map((h, idx) => (
                            <HeaderRow
                                key={idx}
                                h={h}
                                onChange={(next) => updateHeader(idx, next)}
                                onRemove={() => removeHeader(idx)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <label className="block text-sm font-medium">Body (JSON for POST/PUT/PATCH)</label>
                <textarea
                    rows={6}
                    className={`mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 ${bodyError ? 'border-red-500' : ''}`}
                    placeholder='{"firstname":"Jane","lastname":"Doe","officeId":1,"legalFormId":1}'
                    value={bodyText}
                    onChange={(e) => setBodyAndValidate(e.target.value)}
                />
                {bodyError ? <p className="text-xs text-red-500 mt-1">{bodyError}</p> : (
                    <p className="text-xs text-gray-500 mt-1">Leave empty for GET/DELETE.</p>
                )}
            </div>
        </div>
    );
};

export default BatchRequestRow;
