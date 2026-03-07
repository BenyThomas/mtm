import React from 'react';
import Card from './Card';
import Skeleton from './Skeleton';

const KPICard = ({ title, value, suffix, loading, emptyMessage, children }) => {
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</div>
                    {loading ? (
                        <div className="mt-2">
                            <Skeleton width="100px" height="1.75rem" />
                        </div>
                    ) : value === 0 || value === '0' || value === '0.00' ? (
                        <div className="mt-2 text-lg font-semibold text-slate-500 dark:text-slate-300">
                            {emptyMessage || 'No data'}
                        </div>
                    ) : (
                        <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                            {value}
                            {suffix ? <span className="ml-1 text-base font-medium text-slate-500 dark:text-slate-300">{suffix}</span> : null}
                        </div>
                    )}
                </div>
                <div className="ml-4">{children}</div>
            </div>
        </Card>
    );
};

export default KPICard;
