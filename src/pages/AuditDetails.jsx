import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useToast } from '../context/ToastContext';

const toISO = (d) => {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    return String(d).slice(0, 10);
};

const toneForResult = (r) => {
    const v = String(r || '').toLowerCase();
    if (v.includes('success') || v.includes('approved') || v === 'true') return 'green';
    if (v.includes('reject') || v.includes('failed') || v === 'false') return 'red';
    return 'gray';
};

const AuditDetails = () => {
    const { id } = useParams();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [audit, setAudit] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/audits/${id}`);
            setAudit(res?.data || null);
        } catch (err) {
            setAudit(null);
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Failed to load audit';
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const changes = useMemo(() => {
        const raw = audit?.changes;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw; // some deployments return list of {field, newValue, ...}
        if (typeof raw === 'object') {
            return Object.entries(raw).map(([k, v]) => ({ field: k, value: v }));
        }
        try {
            const j = JSON.parse(raw);
            if (typeof j === 'object' && j) {
                return Object.entries(j).map(([k, v]) => ({ field: k, value: v }));
            }
        } catch { /* ignore */ }
        return [];
    }, [audit]);

    const cmdJsonPretty = useMemo(() => {
        const src = audit?.commandAsJson;
        if (!src) return '';
        if (typeof src === 'string') {
            try { return JSON.stringify(JSON.parse(src), null, 2); } catch { return src; }
        }
        try { return JSON.stringify(src, null, 2); } catch { return String(src); }
    }, [audit]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="40%" />
                <Card><Skeleton height="10rem" /></Card>
            </div>
        );
    }

    if (!audit) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Audit</h1>
                <Card>Audit not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Audit #{audit.id}</h1>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {audit.actionName} • {audit.entityName} • {toISO(audit.madeOnDate || audit.makerDateTime)}
                    </div>
                </div>
                <div className="space-x-2">
                    <Badge tone={toneForResult(audit.processingResult)}>{String(audit.processingResult ?? '-')}</Badge>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Entity</div>
                        <div className="font-medium">{audit.entityName}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Action</div>
                        <div className="font-medium">{audit.actionName}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Resource ID</div>
                        <div className="font-medium">{audit.resourceId ?? '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Office</div>
                        <div className="font-medium">{audit.officeName || audit.officeId || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Maker</div>
                        <div className="font-medium">{audit.maker || audit.makerName || audit.makerId || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Checker</div>
                        <div className="font-medium">{audit.checker || audit.checkerName || audit.checkerId || '-'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Made On</div>
                        <div className="font-medium">{toISO(audit.madeOnDate || audit.makerDateTime)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Processing Result</div>
                        <div className="font-medium">{String(audit.processingResult ?? '-')}</div>
                    </div>
                </div>
            </Card>

            {/* Changes */}
            <Card>
                <div className="font-semibold mb-2">Changes</div>
                {!changes.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No structured changes available.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">Field</th>
                                <th className="py-2 pr-4">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            {changes.map((c, idx) => (
                                <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{c.field}</td>
                                    <td className="py-2 pr-4">
                      <pre className="text-xs rounded bg-gray-100 dark:bg-gray-800 p-2 overflow-auto max-h-64">
                        {typeof c.value === 'string' ? c.value : JSON.stringify(c.value, null, 2)}
                      </pre>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Raw JSON */}
            <Card>
                <div className="font-semibold mb-2">Command JSON</div>
                {!cmdJsonPretty ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No command payload recorded.</div>
                ) : (
                    <pre className="text-xs rounded bg-gray-100 dark:bg-gray-800 p-2 overflow-auto max-h-96">
            {cmdJsonPretty}
          </pre>
                )}
            </Card>
        </div>
    );
};

export default AuditDetails;
