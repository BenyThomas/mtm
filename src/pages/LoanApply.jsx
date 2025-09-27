import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import ScheduleTable from '../components/ScheduleTable';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const DATE_FORMAT = 'dd MMMM yyyy';
const LOCALE = 'en_GB';

// dd MMMM yyyy (e.g., 16 September 2025)
const fmtDdMMMMYyyy = (d) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const day = String(dt.getDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-GB', { month: 'long' });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
};

const todayLong = () => fmtDdMMMMYyyy(new Date());

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
    const [rate, setRate] = useState('');
    const [numRepayments, setNumRepayments] = useState(12);
    const [repaymentEvery, setRepaymentEvery] = useState(1);
    const [repaymentFrequencyType, setRepaymentFrequencyType] = useState('2'); // 1=Weeks, 2=Months

    // mandatory extras for your tenant
    const [loanType, setLoanType] = useState('individual');
    const [submittedOnDate, setSubmittedOnDate] = useState(todayLong());
    const [transactionProcessingStrategyCode, setTransactionProcessingStrategyCode] =
        useState('mifos-standard-strategy');

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

    // Fill from product (acts as template)
    useEffect(() => {
        if (!selectedProduct) return;

        const pDef =
            selectedProduct?.principal?.default ??
            selectedProduct?.principal ??
            selectedProduct?.principalAmount ??
            '';

        const rDef =
            selectedProduct?.interestRatePerPeriod ??
            selectedProduct?.interestRate ??
            '';

        const nDef =
            selectedProduct?.numberOfRepayments?.default ??
            selectedProduct?.numberOfRepayments ??
            12;

        const everyDef = selectedProduct?.repaymentEvery ?? 1;
        const freqDef =
            selectedProduct?.repaymentFrequencyType?.id ??
            selectedProduct?.repaymentFrequencyType ??
            2;

        const tps =
            selectedProduct?.transactionProcessingStrategyCode ||
            selectedProduct?.transactionProcessingStrategy?.code ||
            'mifos-standard-strategy';

        // use product defaults
        setPrincipal((prev) => (prev === '' ? String(pDef) : prev));
        setRate((prev) => (prev === '' ? (rDef !== '' ? String(rDef) : prev) : prev));
        setNumRepayments(String(nDef));
        setRepaymentEvery(String(everyDef));
        setRepaymentFrequencyType(String(freqDef));
        setTransactionProcessingStrategyCode(tps);
    }, [selectedProduct]);

    const pid = Number(productId) || 0;
    const cid = Number(clientId) || 0;
    const prin = Number(principal) || 0;
    const rateFromProduct =
        selectedProduct?.interestRatePerPeriod ?? selectedProduct?.interestRate ?? '';
    const rateToUse = Number((rate !== '' ? rate : rateFromProduct) || 0);

    const validForCalc = useMemo(() => {
        return (
            cid > 0 &&
            pid > 0 &&
            prin > 0 &&
            Number(numRepayments) > 0 &&
            Number(repaymentEvery) > 0 &&
            rateToUse > 0 &&
            Boolean(transactionProcessingStrategyCode) &&
            Boolean(loanType) &&
            Boolean(submittedOnDate)
        );
    }, [
        cid,
        pid,
        prin,
        numRepayments,
        repaymentEvery,
        rateToUse,
        transactionProcessingStrategyCode,
        loanType,
        submittedOnDate,
    ]);

    const debounced = useDebouncedValue(
        {
            clientId,
            productId,
            principal,
            rate,
            numRepayments,
            repaymentEvery,
            repaymentFrequencyType,
            loanType,
            submittedOnDate,
            transactionProcessingStrategyCode,
        },
        500
    );

    const idOr = (x, fb) => (x?.id ?? x ?? fb);

    // calculate schedule with the same mandatory fields your server requires
    useEffect(() => {
        if (!validForCalc) {
            setSchedule(null);
            setCalcError('');
            return;
        }

        const controller = new AbortController();
        (async () => {
            setCalcLoading(true);
            setCalcError('');
            try {
                const p = selectedProduct || {};
                const payload = {
                    clientId: cid,
                    productId: pid,
                    principal: prin,
                    numberOfRepayments: Number(numRepayments),
                    repaymentEvery: Number(repaymentEvery),
                    repaymentFrequencyType: Number(repaymentFrequencyType),
                    loanTermFrequency: Number(numRepayments) * Number(repaymentEvery),
                    loanTermFrequencyType: Number(repaymentFrequencyType),

                    // Dates + locale
                    expectedDisbursementDate: submittedOnDate,
                    repaymentsStartingFromDate: submittedOnDate,
                    submittedOnDate: submittedOnDate,
                    locale: LOCALE,
                    dateFormat: DATE_FORMAT,

                    // Required by your tenant in schedule calc too:
                    loanType,

                    // Use current TPS (from product but user can override)
                    transactionProcessingStrategyCode,

                    // From product defaults
                    interestRatePerPeriod: rateToUse,
                    interestRateFrequencyType: Number(idOr(p.interestRateFrequencyType, 2)),
                    amortizationType: Number(idOr(p.amortizationType, 1)),
                    interestType: Number(idOr(p.interestType, 0)),
                    interestCalculationPeriodType: Number(idOr(p.interestCalculationPeriodType, 1)),
                    inArrearsTolerance: p.inArrearsTolerance ?? 0,
                    graceOnPrincipalPayment: p.graceOnPrincipalPayment ?? 0,
                    graceOnInterestPayment: p.graceOnInterestPayment ?? 0,
                    graceOnInterestCharged: p.graceOnInterestCharged ?? 0,
                };

                const res = await api.post('/loans?command=calculateLoanSchedule', payload, {
                    signal: controller.signal,
                });
                setSchedule(res.data);
            } catch (err) {
                if (err.name === 'CanceledError') return;
                const msg =
                    err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                    err?.response?.data?.defaultUserMessage ||
                    'Calculation failed';
                setCalcError(msg);
                setSchedule(null);
            } finally {
                setCalcLoading(false);
            }
        })();

        return () => controller.abort();
    }, [
        validForCalc,
        cid,
        pid,
        prin,
        numRepayments,
        repaymentEvery,
        repaymentFrequencyType,
        rateToUse,
        selectedProduct,
        loanType,
        submittedOnDate,
        transactionProcessingStrategyCode,
    ]);

    const canCreate = validForCalc && !calcLoading && schedule;

    // Build payload for /loans (CREATE)
    const buildCreatePayload = () => {
        const p = selectedProduct || {};

        const amortizationType = Number(idOr(p.amortizationType, 1));
        const interestType = Number(idOr(p.interestType, 0));
        const interestCalcPeriod = Number(idOr(p.interestCalculationPeriodType, 1));
        const rateFreq = Number(idOr(p.interestRateFrequencyType, 2));
        const scheduleProcessing =
            p.loanScheduleProcessingType?.code || p.loanScheduleProcessingType || 'HORIZONTAL';

        const payload = {
            clientId: Number(clientId),
            productId: Number(productId),
            principal: Number(principal),
            numberOfRepayments: Number(numRepayments),
            repaymentEvery: Number(repaymentEvery),
            repaymentFrequencyType: Number(repaymentFrequencyType),

            loanTermFrequency: Number(numRepayments) * Number(repaymentEvery),
            loanTermFrequencyType: Number(repaymentFrequencyType),

            // Dates + locale
            dateFormat: DATE_FORMAT,
            locale: LOCALE,
            expectedDisbursementDate: submittedOnDate,
            repaymentsStartingFromDate: submittedOnDate,
            submittedOnDate, // from state (editable)

            // Required by your tenant
            loanType, // from state
            transactionProcessingStrategyCode, // from state (can be edited)

            // From product defaults (user can override interest rate via field)
            amortizationType,
            interestType,
            interestCalculationPeriodType: interestCalcPeriod,
            interestRatePerPeriod: rate !== '' ? Number(rate) : (p.interestRatePerPeriod ?? p.interestRate ?? 0),
            interestRateFrequencyType: rateFreq,

            graceOnPrincipalPayment: p.graceOnPrincipalPayment ?? 0,
            graceOnInterestPayment: p.graceOnInterestPayment ?? 0,
            graceOnInterestCharged: p.graceOnInterestCharged ?? 0,

            // Optional – string code is fine here
            loanScheduleProcessingType: scheduleProcessing,

            // Disbursement block
            disbursementData: [
                { expectedDisbursementDate: submittedOnDate, principal: Number(principal) },
            ],

            // Optional misc (don’t send unsupported keys)
            // interestRecognitionOnDisbursementDate: Boolean(p.interestRecognitionOnDisbursementDate),
            // ⚠️ maxOutstandingLoanBalance included only if > 0 (server rejects 0)
        };

        const molb =
            p.maxOutstandingLoanBalance != null ? Number(p.maxOutstandingLoanBalance) : NaN;
        if (molb > 0) {
            payload.maxOutstandingLoanBalance = molb;
        }
        // else: omit the field entirely

        // Charges from product (if any)
        if (Array.isArray(p.charges) && p.charges.length) {
            const charges = p.charges
                .map((c) => ({
                    chargeId: Number(c.id ?? c.chargeId),
                    amount: Number(c.amount ?? c.amountOrPercentage ?? 0),
                }))
                .filter((c) => c.chargeId);
            if (charges.length) payload.charges = charges;
        }

        // Down payment only when enabled on product
        if (p.enableDownPayment) {
            payload.enableDownPayment = true;
            payload.disbursedAmountPercentageForDownPayment =
                p.disbursedAmountPercentageForDownPayment ?? 0;
            if (p.enableAutoRepaymentForDownPayment) {
                payload.enableAutoRepaymentForDownPayment = true;
            }
        }

        // DO NOT include unsupported keys like buyDownFee* or enableIncomeCapitalization on your tenant.

        // Advanced payment allocation fields should only be sent when the selected TPS is advanced:
        // (Uncomment if your product/tenant actually uses the advanced strategy)
        /*
        const isAdvancedAlloc = transactionProcessingStrategyCode === 'advanced-payment-allocation-strategy';
        if (isAdvancedAlloc) {
          if (p.fixedLength != null) payload.fixedLength = Number(p.fixedLength);
          if (p.fixedPrincipalPercentagePerInstallment != null) {
            payload.fixedPrincipalPercentagePerInstallment = Number(p.fixedPrincipalPercentagePerInstallment);
          }
        }
        */

        return payload;
    };

    const createApplication = async () => {
        if (!canCreate) return;
        try {
            if (pid <= 0) { addToast('Please select a loan product.', 'error'); return; }
            if (prin <= 0) { addToast('Please enter a positive principal.', 'error'); return; }
            const payload = buildCreatePayload();
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

    // Optional: download Excel template
    const downloadExcelTemplate = async () => {
        try {
            const res = await api.get('/loans/downloadtemplate', {
                params: { officeId: 1, staffId: 1, dateFormat: 'mm-dd-yyyy' },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'loan-template.xls';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            addToast('Failed to download template', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Loan Application (Simulation)</h1>
                <Button onClick={downloadExcelTemplate}>Download Excel Template</Button>
            </div>

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
                                onChange={(e) => setProductId(e.target.value || '')}
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

                        {/* Mandatory fields (required by your tenant) */}
                        <div>
                            <label className="block text-sm font-medium">Loan Type *</label>
                            <select
                                value={loanType}
                                onChange={(e) => setLoanType(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="individual">individual</option>
                                <option value="group">group</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Submitted On Date *</label>
                            <input
                                value={submittedOnDate}
                                onChange={(e) => setSubmittedOnDate(e.target.value)}
                                placeholder={DATE_FORMAT}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: {DATE_FORMAT}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Transaction Processing Strategy *</label>
                            <input
                                value={transactionProcessingStrategyCode}
                                onChange={(e) => setTransactionProcessingStrategyCode(e.target.value)}
                                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                                placeholder="mifos-standard-strategy"
                            />
                            <p className="text-xs text-gray-500 mt-1">Auto-filled from product; override if needed.</p>
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
