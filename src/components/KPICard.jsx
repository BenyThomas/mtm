import React from 'react';
import Card from './Card';
import Skeleton from './Skeleton';

const KPICard = ({ title, value, suffix, loading, emptyMessage, children }) => {
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
                    {loading ? (
                        <div className="mt-2">
                            <Skeleton width="100px" height="1.75rem" />
                        </div>
                    ) : value === 0 || value === '0' || value === '0.00' ? (
                        <div className="mt-2 text-lg font-semibold text-gray-500 dark:text-gray-400">
                            {emptyMessage || 'No data'}
                        </div>
                    ) : (
                        <div className="mt-1 text-2xl font-semibold">
                            {value}
                            {suffix ? <span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-1">{suffix}</span> : null}
                        </div>
                    )}
                </div>
                <div className="ml-4">{children}</div>
            </div>
        </Card>
    );
};

export default KPICard;
