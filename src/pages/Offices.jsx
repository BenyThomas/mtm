import React from 'react';
import useOffices from '../hooks/useOffices';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';

const Offices = () => {
    const { offices, loading, reload } = useOffices();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Offices</h1>
                <Button variant="secondary" onClick={reload}>Refresh</Button>
            </div>

            <Card>
                {loading ? (
                    <Skeleton height="10rem" />
                ) : !offices.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No offices found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Parent</th>
                                <th className="py-2 pr-4">External ID</th>
                                <th className="py-2 pr-4">Opening Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {offices.map((o) => (
                                <tr key={o.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{o.id}</td>
                                    <td className="py-2 pr-4">{o.name}</td>
                                    <td className="py-2 pr-4">{o.parentName || '-'}</td>
                                    <td className="py-2 pr-4">{o.externalId || '-'}</td>
                                    <td className="py-2 pr-4">{o.openingDate || '-'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Offices;
