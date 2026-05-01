import React, { useState } from 'react';
import gatewayApi from '../../api/gatewayAxios';
import { Button } from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const SelcomRepaymentSync = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { showToast } = useToast();

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await gatewayApi.post('/ops/selcom/sync-repayments');
            setResult(response.data);
            showToast('Selcom repayment sync triggered successfully', 'success');
        } catch (error) {
            console.error('Failed to sync Selcom repayments:', error);
            showToast(error?.response?.data?.message || 'Failed to trigger sync', 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Selcom Repayment Sync</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Manually trigger the synchronization of pending Selcom loan repayment orders with Fineract.
                </p>
            </div>

            <Card className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
                    <div className="rounded-full bg-cyan-100 p-4 dark:bg-cyan-900/30">
                        <RefreshCcw className={`h-8 w-8 text-cyan-600 dark:text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-lg font-semibold">Trigger Reconciliation</h3>
                        <p className="text-sm text-slate-500">
                            This process will fetch the latest status for all pending Selcom orders and attempt to post repayments to Fineract for successful ones.
                        </p>
                    </div>
                    <Button
                        onClick={handleSync}
                        disabled={loading}
                        variant="primary"
                        className="mt-4"
                    >
                        {loading ? 'Processing...' : 'Sync Repayments Now'}
                    </Button>
                </div>
            </Card>

            {result && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="flex items-center gap-4 p-4 border-l-4 border-l-blue-500">
                        <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Checked Orders</p>
                            <p className="text-2xl font-bold">{result.checkedOrders || 0}</p>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4 p-4 border-l-4 border-l-emerald-500">
                        <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
                            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Reconciled</p>
                            <p className="text-2xl font-bold">{result.reconciledOrders || 0}</p>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4 p-4 border-l-4 border-l-rose-500">
                        <div className="rounded-full bg-rose-100 p-2 dark:bg-rose-900/30">
                            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Failed</p>
                            <p className="text-2xl font-bold">{result.failedOrders || 0}</p>
                        </div>
                    </Card>
                </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-semibold">Automatic Scheduler</p>
                        <p className="mt-1">
                            A background scheduler is also running every 2 minutes (default) to reconcile pending orders. Use this page if you need to force an immediate update.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelcomRepaymentSync;
