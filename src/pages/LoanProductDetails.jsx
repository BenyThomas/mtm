import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useToast } from '../context/ToastContext';

const fieldValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') return value.value || value.name || value.code || value.id || '-';
    return String(value);
};

const accountLabel = (account) => {
    if (!account) return '-';
    const code = account.glCode || account.code || '';
    const name = account.name || account.nameDecorated || '';
    return `${code}${code && name ? ' - ' : ''}${name}`.trim() || `#${account.id || ''}`;
};

const LoanProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [mixLoading, setMixLoading] = useState(true);
    const [mixBusy, setMixBusy] = useState(false);
    const [hasMix, setHasMix] = useState(false);
    const [mixOptions, setMixOptions] = useState([]);
    const [restrictedProductIds, setRestrictedProductIds] = useState([]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/loanproducts/${id}`, {
                params: { associations: 'charges,accountingMappings' },
            });
            setProduct(res?.data || null);
        } catch {
            setProduct(null);
        } finally {
            setLoading(false);
        }
    };

    const loadProductMix = async () => {
        setMixLoading(true);
        try {
            const [mixRes, templateRes] = await Promise.all([
                api.get(`/loanproducts/${id}/productmix`).catch(() => null),
                api.get(`/loanproducts/${id}/productmix`, { params: { template: true } }).catch(() => null),
            ]);

            const mixData = mixRes?.data || null;
            const templateData = templateRes?.data || null;
            const optionsSource =
                templateData?.allowedProducts ||
                mixData?.allowedProducts ||
                templateData?.productOptions ||
                [];
            const options = Array.isArray(optionsSource)
                ? optionsSource.filter((item) => Number(item?.id) !== Number(id))
                : [];
            const restricted = Array.isArray(mixData?.restrictedProducts) ? mixData.restrictedProducts : [];

            setMixOptions(options);
            setRestrictedProductIds(restricted.map((item) => String(item.id)));
            setHasMix(Boolean(mixData));
        } catch {
            setMixOptions([]);
            setRestrictedProductIds([]);
            setHasMix(false);
        } finally {
            setMixLoading(false);
        }
    };

    useEffect(() => {
        load();
        loadProductMix();
    }, [id]);

    const remove = async () => {
        if (!product?.id) return;
        if (!window.confirm(`Delete ${product?.name || `loan product #${product.id}`}?`)) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/loanproducts/${product.id}`);
            addToast('Loan product deleted', 'success');
            navigate('/loan-products', { replace: true });
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Delete failed';
            addToast(msg, 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const toggleRestrictedProduct = (productId) => {
        const key = String(productId);
        setRestrictedProductIds((current) =>
            current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
        );
    };

    const saveProductMix = async () => {
        setMixBusy(true);
        try {
            const payload = { restrictedProducts: restrictedProductIds };
            if (hasMix) {
                await api.put(`/loanproducts/${id}/productmix`, payload);
            } else {
                await api.post(`/loanproducts/${id}/productmix`, payload);
            }
            addToast('Loan product mix updated', 'success');
            await loadProductMix();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Product mix update failed';
            addToast(msg, 'error');
        } finally {
            setMixBusy(false);
        }
    };

    const deleteProductMix = async () => {
        setMixBusy(true);
        try {
            await api.delete(`/loanproducts/${id}/productmix`);
            addToast('Loan product mix deleted', 'success');
            await loadProductMix();
        } catch (err) {
            const msg =
                err?.response?.data?.errors?.[0]?.defaultUserMessage ||
                err?.response?.data?.defaultUserMessage ||
                'Product mix delete failed';
            addToast(msg, 'error');
        } finally {
            setMixBusy(false);
        }
    };

    const accountingRows = useMemo(
        () => [
            ['Fund Source', accountLabel(product?.fundSourceAccount)],
            ['Loan Portfolio', accountLabel(product?.loanPortfolioAccount)],
            ['Interest on Loan', accountLabel(product?.interestOnLoanAccount)],
            ['Income From Fee', accountLabel(product?.incomeFromFeeAccount)],
            ['Income From Penalty', accountLabel(product?.incomeFromPenaltyAccount)],
            ['Income From Recovery', accountLabel(product?.incomeFromRecoveryAccount)],
            ['Write Off', accountLabel(product?.writeOffAccount)],
            ['Overpayment Liability', accountLabel(product?.overpaymentLiabilityAccount)],
            ['Transfers In Suspense', accountLabel(product?.transfersInSuspenseAccount)],
            ['Receivable Interest', accountLabel(product?.receivableInterestAccount)],
            ['Receivable Fees', accountLabel(product?.receivableFeeAccount)],
            ['Receivable Penalties', accountLabel(product?.receivablePenaltyAccount)],
        ].filter(([, value]) => value !== '-'),
        [product]
    );

    const charges = Array.isArray(product?.charges) ? product.charges : [];
    const active = product?.active ?? product?.status?.active ?? true;

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton height="2rem" width="30%" />
                <Card><Skeleton height="12rem" /></Card>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Loan Product</h1>
                <Card>Product not found.</Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{product.name || `Loan Product #${product.id}`}</h1>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span>ID: {product.id}</span>
                        <Badge tone={active ? 'green' : 'yellow'}>{active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => navigate('/loan-products')}>Back</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={() => navigate(`/loan-products/${product.id}/edit`)}>Edit</Button>
                    <Button variant="danger" onClick={remove} disabled={deleteBusy}>
                        {deleteBusy ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>

            <Card>
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div>
                        <div className="text-slate-500">Short Name</div>
                        <div className="font-medium">{fieldValue(product.shortName)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Currency</div>
                        <div className="font-medium">{fieldValue(product.currency || product.currencyCode)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Accounting Rule</div>
                        <div className="font-medium">{fieldValue(product.accountingRule)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Principal</div>
                        <div className="font-medium">
                            {fieldValue(product.minPrincipal || product.principal?.minimum)} to {fieldValue(product.maxPrincipal || product.principal?.maximum)}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Default Principal</div>
                        <div className="font-medium">{fieldValue(product.principal || product.principal?.default)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Interest / Period</div>
                        <div className="font-medium">
                            {fieldValue(product.minInterestRatePerPeriod || product.interestRatePerPeriod?.minimum)} to{' '}
                            {fieldValue(product.maxInterestRatePerPeriod || product.interestRatePerPeriod?.maximum)}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Default Interest / Period</div>
                        <div className="font-medium">
                            {fieldValue(
                                product.interestRatePerPeriod?.default ??
                                product.interestRatePerPeriod ??
                                product.interestRate
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Interest Rate Frequency</div>
                        <div className="font-medium">{fieldValue(product.interestRateFrequencyType)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Repayments</div>
                        <div className="font-medium">
                            {fieldValue(product.minNumberOfRepayments || product.numberOfRepayments?.minimum)} to {fieldValue(product.maxNumberOfRepayments || product.numberOfRepayments?.maximum)}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Repayment Every</div>
                        <div className="font-medium">
                            {fieldValue(product.repaymentEvery)} {fieldValue(product.repaymentFrequencyType)}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Amortization</div>
                        <div className="font-medium">{fieldValue(product.amortizationType)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Interest Type</div>
                        <div className="font-medium">{fieldValue(product.interestType)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Interest Calculation</div>
                        <div className="font-medium">{fieldValue(product.interestCalculationPeriodType)}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Transaction Strategy</div>
                        <div className="font-medium">{fieldValue(product.transactionProcessingStrategyName || product.transactionProcessingStrategyCode)}</div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="mb-3 text-lg font-semibold">Accounting</h2>
                {accountingRows.length ? (
                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                        {accountingRows.map(([label, value]) => (
                            <div key={label}>
                                <div className="text-slate-500">{label}</div>
                                <div className="font-medium">{value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No accounting mappings returned for this product.</div>
                )}
            </Card>

            <Card>
                <h2 className="mb-3 text-lg font-semibold">Charges</h2>
                {charges.length ? (
                    <div className="flex flex-wrap gap-2">
                        {charges.map((charge) => (
                            <Badge key={charge.id || charge.name} tone="blue">
                                {charge.name || charge.chargeName || `Charge #${charge.id}`}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No charges configured.</div>
                )}
            </Card>

            <Card>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Product Mix</h2>
                        <div className="text-sm text-slate-500">
                            Restrict this product from being mixed with other active loan products.
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={loadProductMix} disabled={mixLoading || mixBusy}>
                            Refresh Mix
                        </Button>
                        <Button onClick={saveProductMix} disabled={mixLoading || mixBusy}>
                            {mixBusy ? 'Saving...' : hasMix ? 'Update Mix' : 'Create Mix'}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={deleteProductMix}
                            disabled={mixLoading || mixBusy || !hasMix}
                        >
                            Delete Mix
                        </Button>
                    </div>
                </div>

                {mixLoading ? (
                    <Skeleton height="10rem" />
                ) : mixOptions.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {mixOptions.map((option) => {
                            const checked = restrictedProductIds.includes(String(option.id));
                            return (
                                <label
                                    key={option.id}
                                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={checked}
                                        onChange={() => toggleRestrictedProduct(option.id)}
                                    />
                                    <span>
                                        <span className="block font-medium">{option.name || `Product #${option.id}`}</span>
                                        <span className="block text-slate-500">ID: {option.id}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No product mix options returned by Fineract.</div>
                )}
            </Card>
        </div>
    );
};

export default LoanProductDetails;
