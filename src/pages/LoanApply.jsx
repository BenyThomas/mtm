import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import ScheduleTable from '../components/ScheduleTable';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const dateISO = () => new Date().toISOString().slice(0, 10);

const LoanApply = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);

    // form state
    const [clientId, setClientId] = useState('');
    const [productId, setProductId] = useState('');
    const [principal, setPrincipal] = useState('');
    const [rate, setRate] = useState(''); // optional override
    const [numRepayments, setNumRepayments] = useState(12);
    const [repaymentEvery, setRepaymentEvery] = useState(1);
    const [repaymentFrequencyType, setRepaymentFrequencyType] = useState('2'); // 2=Months, 1=Weeks (Fineract enum)

    // calculated schedule
    const [calcLoading, setCalcLoading] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [calcError, setCalcError] = useState('');

    // load clients + products
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [cRes, pRes] = await Promise.all([
                    api.get('/clients', { params: { limit: 50, orderBy: 'id', sortOrder: 'desc' } }),
                    api.get('/loanproducts'),
                ]);
                if (!cancelled) {
                    setClients(Array.isArray(cRes.data) ? cRes.data : cRes.data?.pageItems || []);
                    setProducts(Array.isArray(pRes.data) ? pRes.data : pRes.data?.pageItems || []);
                }
            } catch {
                if (!cancelled) {
                    setClients([]);
                    setProducts([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => (cancelled = true);
    }, []);

    const selectedProduct = useMemo(
        () => products.find((p) => String(p.id) === String(productId)),
        [products, productId]
    );

    const validForCalc = useMemo(() => {
        return clientId && productId && Number(principal) > 0 && Number(numRepayments) > 0 && Number(repaymentEvery) > 0;
    }, [clientId, productId, principal, numRepayments, repaymentEvery]);

    const debounced = useDebouncedValue(
        { clientId, productId, principal, rate, numRepayments, repaymentEvery, repaymentFrequencyType },
        500
    );

    // calculate schedule when inputs change
    useEffect(() => {
        const doCalc = async () => {
            if (!validForCalc) {
                setSchedule(null);
                setCalcError('');
                return;
            }
            setCalcLoading(true);
            setCalcError('');
            try {
                // Build payload according to Fineract schema (minimal for calculation)
                const payload = {
                    clientId: Number(debounced.clientId),
                    productId: Number(debounced.productId),
                    principal: Number(debounced.principal),
                    numberOfRepayments: Number(debounced.numRepayments),
                    repaymentEvery: Number(debounced.repaymentEvery),
                    repaymentFrequencyType: Number(debounced.repaymentFrequencyType), // 2=Months
                    loanTermFrequency: Number(debounced.numRepayments) * Number(debounced.repaymentEvery),
                    loanTermFrequencyType: Number(debounced.repaymentFrequencyType),
                    expectedDisbursementDate: dateISO(),
                    repaymentsStartingFromDate: dateISO(),
                    interestRatePerPeriod: debounced.rate
                        ? Number(debounced.rate)
                        : selectedProduct?.interestRatePerPeriod ?? selectedProduct?.interestRate ?? 0,
                    interestRateFrequencyType: selectedProduct?.interestRateFrequencyType?.id || 2, // Months default
                    amortizationType: selectedProduct?.amortizationType?.id || 1, // Equal principal or annuity depends, fallback 1
                    interestType: selectedProduct?.interestType?.id || 0, // default
                    interestCalculationPeriodType: selectedProduct?.interestCalculationPeriodType?.id || 1,
                    inArrearsTolerance: selectedProduct?.inArrearsTolerance || 0,
                    graceOnPrincipalPayment: selectedProduct?.graceOnPrincipalPayment || 0,
                    graceOnInterestPayment: 0,
                    graceOnInterestCharged: 0,
                    locale: 'en',
                    dateFormat: 'yyyy-MM-dd',
                };

                const res = await api.post('/loans?command=calculateLoanSchedule', payload);
                setSchedule(res.data);
            } catch (err) {
                const msg =
                    err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                    err?.response?.data?.defaultUserMessage ||
                    'Calculation failed';
                setCalcError(msg);
                setSchedule(null);
            } finally {
                setCalcLoading(false);
            }
        };

        doCalc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced, validForCalc, selectedProduct]);

    const canCreate = validForCalc && !calcLoading && schedule;

    const createApplication = async () => {
        if (!canCreate) return;
        try {
            const payload = {
                clientId: Number(clientId),
                productId: Number(productId),
                principal: Number(principal),
                numberOfRepayments: Number(numRepayments),
                repaymentEvery: Number(repaymentEvery),
                repaymentFrequencyType: Number(repaymentFrequencyType),
                loanTermFrequency: Number(numRepayments) * Number(repaymentEvery),
                loanTermFrequencyType: Number(repaymentFrequencyType),
                expectedDisbursementDate: dateISO(),
                repaymentsStartingFromDate: dateISO(),
                interestRatePerPeriod: rate
                    ? Number(rate)
                    : selectedProduct?.interestRatePerPeriod ?? selectedProduct?.interestRate ?? 0,
                interestRateFrequencyType: selectedProduct?.interestRateFrequencyType?.id || 2,
                amortizationType: selectedProduct?.amortizationType?.id || 1,
                interestType: selectedProduct?.interestType?.id || 0,
                interestCalculationPeriodType: selectedProduct?.interestCalculationPeriodType?.id || 1,
                inArrearsTolerance: selectedProduct?.inArrearsTolerance || 0,
                graceOnPrincipalPayment: selectedProduct?.graceOnPrincipalPayment || 0,
                graceOnInterestPayment: 0,
                graceOnInterestCharged: 0,
                locale: 'en',
                dateFormat: 'yyyy-MM-dd',
                // optional: submittedOnDate
            };
            const res = await api.post('/loans', payload);
            const newId = res.data?.loanId || res.data?.resourceId || res.data?.id;
            addToast('Loan application created', 'success');
            navigate(`/loans/${newId || ''}`);
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Create failed';
            addToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Loan Application (Simulation)</h1>

            {loading ? (
                <Card><Skeleton height="10rem" /></Card>
            ) : (
                <Card>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Client *</label>
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select client</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.displayName || `${c.firstname ?? ''} ${c.lastname ?? ''}`.trim()} (#{c.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Product *</label>
                            <select
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Select product</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Principal *</label>
                            <input
                                type="number"
                                min="0"
                                value={principal}
                                onChange={(e) => setPrincipal(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Interest Rate / Period</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                placeholder={`Default: ${selectedProduct?.interestRatePerPeriod ?? selectedProduct?.interestRate ?? '-'}`}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium"># of Repayments *</label>
                            <input
                                type="number"
                                min="1"
                                value={numRepayments}
                                onChange={(e) => setNumRepayments(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Repayment Every *</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={repaymentEvery}
                                    onChange={(e) => setRepaymentEvery(e.target.value)}
                                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <select
                                    value={repaymentFrequencyType}
                                    onChange={(e) => setRepaymentFrequencyType(e.target.value)}
                                    className="mt-1 border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="1">Weeks</option>
                                    <option value="2">Months</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="mt-6">
                        {calcLoading ? (
                            <Skeleton height="8rem" />
                        ) : calcError ? (
                            <div className="text-red-600 dark:text-red-400 text-sm">{calcError}</div>
                        ) : schedule ? (
                            <>
                                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                    <Card>
                                        <div className="text-gray-500">Total Principal</div>
                                        <div className="font-semibold">{schedule?.repaymentSchedule?.totalPrincipalExpected || '-'}</div>
                                    </Card>
                                    <Card>
                                        <div className="text-gray-500">Total Interest</div>
                                        <div className="font-semibold">{schedule?.repaymentSchedule?.totalInterestCharged || '-'}</div>
                                    </Card>
                                    <Card>
                                        <div className="text-gray-500">Total Repayable</div>
                                        <div className="font-semibold">{schedule?.repaymentSchedule?.totalRepaymentExpected || '-'}</div>
                                    </Card>
                                </div>

                                <div className="mt-4">
                                    <ScheduleTable schedule={schedule?.repaymentSchedule} />
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Enter inputs to see the schedule…
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <Button onClick={createApplication} disabled={!canCreate}>
                            Create Application
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default LoanApply;
