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

// dd MMMM yyyy (e.g., 11 September 2025)
const fmtDdMMMMYyyy = (d) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const day = String(dt.getDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-GB', { month: 'long' });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
};
// yyyy-MM-dd
const fmtISO = (d) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toISOString().slice(0, 10);
};

const todayLong = () => fmtDdMMMMYyyy(new Date());
const todayISO = () => fmtISO(new Date());

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

    // NEW: mandatory fields explicitly in state
    const [loanType, setLoanType] = useState('individual');
    const [submittedOnDate, setSubmittedOnDate] = useState(todayLong());
    const [transactionProcessingStrategyCode, setTransactionProcessingStrategyCode] = useState('mifos-standard-strategy');

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

    // Auto-fill from selected product (also TPS code)
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

        // Transaction processing strategy code
        const tps =
            selectedProduct?.transactionProcessingStrategyCode ||
            selectedProduct?.transactionProcessingStrategy?.code ||
            'mifos-standard-strategy';

        // only override empty principal/rate; always align term/frequency to product
        setPrincipal((prev) => (prev === '' ? String(pDef) : prev));
        setRate((prev) => (prev === '' ? (rDef !== '' ? String(rDef) : prev) : prev));
        setNumRepayments(String(nDef));
        setRepaymentEvery(String(everyDef));
        setRepaymentFrequencyType(String(freqDef));
        setTransactionProcessingStrategyCode(tps);
    }, [selectedProduct]);

    const validForCalc = useMemo(() => {
        return clientId && productId && Number(principal) > 0 && Number(numRepayments) > 0 && Number(repaymentEvery) > 0;
    }, [clientId, productId, principal, numRepayments, repaymentEvery]);

    const debounced = useDebouncedValue(
        { clientId, productId, principal, rate, numRepayments, repaymentEvery, repaymentFrequencyType },
        500
    );

    const idOr = (x, fallback) => (x?.id ?? x ?? fallback);

    // calculate schedule
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
                const p = selectedProduct || {};
                const payload = {
                    clientId: Number(debounced.clientId),
                    productId: Number(debounced.productId),
                    principal: Number(debounced.principal),
                    numberOfRepayments: Number(debounced.numRepayments),
                    repaymentEvery: Number(debounced.repaymentEvery),
                    repaymentFrequencyType: Number(debounced.repaymentFrequencyType),
                    loanTermFrequency: Number(debounced.numRepayments) * Number(debounced.repaymentEvery),
                    loanTermFrequencyType: Number(debounced.repaymentFrequencyType),
                    expectedDisbursementDate: todayLong(),
                    repaymentsStartingFromDate: todayLong(),
                    interestRatePerPeriod: debounced.rate
                        ? Number(debounced.rate)
                        : (p.interestRatePerPeriod ?? p.interestRate ?? 0),
                    interestRateFrequencyType: idOr(p.interestRateFrequencyType, 2),
                    amortizationType: idOr(p.amortizationType, 1),
                    interestType: idOr(p.interestType, 0),
                    interestCalculationPeriodType: idOr(p.interestCalculationPeriodType, 1),
                    inArrearsTolerance: p.inArrearsTolerance ?? 0,
                    graceOnPrincipalPayment: p.graceOnPrincipalPayment ?? 0,
                    graceOnInterestPayment: p.graceOnInterestPayment ?? 0,
                    graceOnInterestCharged: p.graceOnInterestCharged ?? 0,
                    locale: LOCALE,
                    dateFormat: DATE_FORMAT,
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

    // map product charges -> { chargeId, amount }
    const mapCharges = (p) => {
        if (!Array.isArray(p?.charges)) return [];
        return p.charges
            .map((c) => ({
                chargeId: Number(c.id ?? c.chargeId),
                amount: Number(c.amount ?? c.amountOrPercentage ?? 0),
            }))
            .filter((x) => x.chargeId);
    };

    // Build EXACT key set required (with mandatory fields guaranteed)
    const buildCreatePayload = () => {
        const p = selectedProduct || {};

        // Use the stateful TPS code so it's never blank
        const tpsCode = transactionProcessingStrategyCode || 'mifos-standard-strategy';
        const isAdvancedAlloc = tpsCode === 'advanced-payment-allocation-strategy';

        // capitalizedIncomeType -> must be an object
        const capType = p.capitalizedIncomeType;
        const capitalizedIncomeType =
            capType && typeof capType === 'object'
                ? capType
                : { code: 'FEE', id: 'FEE', value: 'Fee' };

        return {
            amortizationType: Number(idOr(p.amortizationType, 1)),

            buyDownFeeCalculationType: p.buyDownFeeCalculationType || 'FLAT',
            buyDownFeeIncomeType: p.buyDownFeeIncomeType || 'FEE',
            buyDownFeeStrategy: p.buyDownFeeStrategy || 'EQUAL_AMORTIZATION',

            capitalizedIncomeCalculationType: p.capitalizedIncomeCalculationType || 'FLAT',
            capitalizedIncomeStrategy: p.capitalizedIncomeStrategy || 'EQUAL_AMORTIZATION',
            capitalizedIncomeType,

            charges: mapCharges(p),

            clientId: Number(clientId),
            datatables: 'List of PostLoansDataTable',

            dateFormat: DATE_FORMAT,
            daysInYearCustomStrategy: p.daysInYearCustomStrategy || 'FULL_LEAP_YEAR',
            daysInYearType: Number(idOr(p.daysInYearType, 360)),

            disbursedAmountPercentageForDownPayment:
                p.disbursedAmountPercentageForDownPayment ?? 0,

            disbursementData: [
                {
                    expectedDisbursementDate: todayLong(), // matches dateFormat
                    principal: Number(principal),
                },
            ],

            enableAutoRepaymentForDownPayment: Boolean(p.enableAutoRepaymentForDownPayment),
            enableBuyDownFee: Boolean(p.enableBuyDownFee),
            enableDownPayment: Boolean(p.enableDownPayment),
            enableIncomeCapitalization: Boolean(p.enableIncomeCapitalization),
            enableInstallmentLevelDelinquency: Boolean(p.enableInstallmentLevelDelinquency),

            expectedDisbursementDate: todayLong(),

            externalId: '786444UUUYYH7',
            fixedEmiAmount: 10,

            ...(isAdvancedAlloc
                ? {
                    fixedLength: Number(p.fixedLength ?? 1),
                    fixedPrincipalPercentagePerInstallment: Number(
                        p.fixedPrincipalPercentagePerInstallment ?? 5.5
                    ),
                }
                : {}),

            graceOnArrearsAgeing: p.graceOnArrearsAgeing ?? 0,
            graceOnInterestCharged: p.graceOnInterestCharged ?? 0,
            graceOnInterestPayment: p.graceOnInterestPayment ?? 0,
            graceOnPrincipalPayment: p.graceOnPrincipalPayment ?? 0,

            interestCalculationPeriodType: Number(idOr(p.interestCalculationPeriodType, 1)),
            interestRateFrequencyType: Number(idOr(p.interestRateFrequencyType, 2)),
            interestRatePerPeriod: rate ? Number(rate) : Number(p.interestRatePerPeriod ?? p.interestRate ?? 0),
            interestRecognitionOnDisbursementDate: Boolean(p.interestRecognitionOnDisbursementDate),
            interestType: Number(idOr(p.interestType, 0)),

            loanScheduleProcessingType: p.loanScheduleProcessingType || 'HORIZONTAL',

            loanTermFrequency: Number(numRepayments) * Number(repaymentEvery),
            loanTermFrequencyType: Number(repaymentFrequencyType),

            // ====== MANDATORY FIELDS (explicit) ======
            loanType,                              // <- never blank (state defaults to "individual")
            locale: LOCALE,
            numberOfRepayments: Number(numRepayments),
            principal: Number(principal),
            productId: Number(productId),
            repaymentEvery: Number(repaymentEvery),
            repaymentFrequencyType: Number(repaymentFrequencyType),
            repaymentsStartingFromDate: todayISO(), // your example uses ISO for this field
            submittedOnDate,                        // <- never blank (state defaults to todayLong())
            transactionProcessingStrategyCode: tpsCode, // <- never blank (state from product or default)
            // =========================================

            maxOutstandingLoanBalance: p.maxOutstandingLoanBalance ?? 0,
        };
    };

    const createApplication = async () => {
        if (!canCreate) return;
        try {
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

    // Optional: download Excel template (as per your curl)
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

                        {/* --- NEW: Mandatory Fields Section (always shown) --- */}
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
                        {/* ---------------------------------------------------- */}
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
