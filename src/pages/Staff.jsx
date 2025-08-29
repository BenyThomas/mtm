import React, { useMemo, useState } from 'react';
import useStaff from '../hooks/useStaff';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import Badge from '../components/Badge';
import OfficeSelect from '../components/OfficeSelect';

const Staff = () => {
    const [officeId, setOfficeId] = useState('');
    const [query, setQuery] = useState('');
    const { staff, loading, reload } = useStaff({ officeId, activeOnly: false });

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter((s) =>
            [s.displayName, s.officeName, String(s.id), s.mobileNo]
                .filter(Boolean)
                .some((f) => f.toLowerCase().includes(q))
        );
    }, [staff, query]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Staff</h1>
                <Button variant="secondary" onClick={reload}>Refresh</Button>
            </div>

            <Card>
                <div className="grid md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium">Office</label>
                        <OfficeSelect includeAll value={officeId} onChange={setOfficeId} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Search</label>
                        <input
                            placeholder="Name, id, mobile, office…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <Skeleton height="12rem" />
                ) : !filtered.length ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No staff found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th className="py-2 pr-4">#</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Office</th>
                                <th className="py-2 pr-4">Mobile</th>
                                <th className="py-2 pr-4">Role</th>
                                <th className="py-2 pr-4">Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                                    <td className="py-2 pr-4">{s.id}</td>
                                    <td className="py-2 pr-4">{s.displayName}</td>
                                    <td className="py-2 pr-4">{s.officeName || '-'}</td>
                                    <td className="py-2 pr-4">{s.mobileNo || '-'}</td>
                                    <td className="py-2 pr-4">
                                        <Badge tone={s.isLoanOfficer ? 'blue' : 'gray'}>
                                            {s.isLoanOfficer ? 'Loan Officer' : 'Staff'}
                                        </Badge>
                                    </td>
                                    <td className="py-2 pr-4">
                                        <Badge tone={s.active ? 'green' : 'gray'}>
                                            {s.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
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

export default Staff;
