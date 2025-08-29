import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';

const Reports = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Reports & Tools</h1>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">Periodic Accrual Accounting</div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Manually execute accruals up to a selected date.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button onClick={() => navigate('/accounting/run-accruals')}>
                            Open
                        </Button>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">Chart of Accounts (GL)</div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Create and manage general ledger accounts.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button onClick={() => navigate('/accounting/gl-accounts')}>Open</Button>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">Accounting Closures</div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Create, view, edit, or delete accounting period closures.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button onClick={() => navigate('/accounting/closures')}>
                            Manage Closures
                        </Button>
                    </div>
                </Card>

                {/* Placeholder tiles */}
                <Card>
                    <div className="text-lg font-semibold">Portfolio KPIs (CSV)</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Export key metrics.</p>
                    <div className="mt-4">
                        <Button variant="secondary" disabled>Coming soon</Button>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">Financial Activity ↔ GL Account</div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Map organizational activities to ledger accounts.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button onClick={() => navigate('/accounting/financial-activity-mappings')}>
                            Manage Mappings
                        </Button>
                    </div>
                </Card>



            </div>
        </div>
    );
};

export default Reports;
