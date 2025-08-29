import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const LoanProducts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);

    // filters
    const [currency, setCurrency] = useState('');
    const [status, setStatus] = useState(''); // '' | 'active' | 'inactive'

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/loanproducts');
            const items = Array.isArray(res.data) ? res.data : res.data?.pageItems || [];
            setProducts(items);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const currencies = useMemo(() => {
        const set = new Set(products.map((p) => p.currency?.code || p.currencyCode).filter(Boolean));
        return Array.from(set);
    }, [products]);

    const filtered = useMemo(() => {
        return products.filter((p) => {
            const cur = p.currency?.code || p.currencyCode;
            const active = p.active ?? p.status?.active ?? true;
            if (currency && cur !== currency) return false;
            if (status === 'active' && !active) return false;
            if (status === 'inactive' && active) return false;
            return true;
        });
    }, [products, currency, status]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Loan Products</h1>
                <div className="space-x-2">
                    <Button onClick={() => navigate('/loan-products/new')}>New Product</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            {currencies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}><Skeleton height="8rem" /></Card>
                    ))}
                </div>
            ) : !filtered.length ? (
                <Card>No products found.</Card>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((p) => {
                        const cur = p.currency?.code || p.currencyCode;
                        const active = p.active ?? p.status?.active ?? true;
                        const min = p.minPrincipal || p.principal?.minimum || '-';
                        const max = p.maxPrincipal || p.principal?.maximum || '-';
                        const ir = p.interestRatePerPeriod || p.interestRate || '-';
                        const amort = p.amortizationType?.value || p.amortizationType || '-';
                        const freq = p.repaymentFrequencyType?.value || p.repaymentFrequencyType || '';
                        const repayEvery = p.repaymentEvery || '';
                        return (
                            <Card key={p.id}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-lg font-semibold">{p.name}</div>
                                        <div className="text-sm text-gray-500">{cur || '-'}</div>
                                    </div>
                                    <Badge tone={active ? 'green' : 'yellow'}>
                                        {active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-500">Min Principal</div>
                                        <div className="font-medium">{min}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Max Principal</div>
                                        <div className="font-medium">{max}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Interest / Period</div>
                                        <div className="font-medium">{ir}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Amortization</div>
                                        <div className="font-medium">{amort}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-gray-500">Repayment</div>
                                        <div className="font-medium">
                                            {repayEvery ? `${repayEvery} × ${freq || ''}` : (freq || '-')}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button variant="secondary" onClick={() => navigate(`/loan-products/${p.id}/edit`)}>Edit</Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LoanProducts;
