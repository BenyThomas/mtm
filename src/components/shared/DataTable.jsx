import React from 'react';
import Skeleton from './Skeleton';

const DataTable = ({
                       columns,
                       data,
                       loading,
                       total,
                       page,
                       limit,
                       onPageChange,
                       sortBy,
                       sortDir,
                       onSort,
                       onRowClick,
                       emptyMessage = 'No data',
                   }) => {
    const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

    return (
        <div className="w-full">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="text-left text-sm text-gray-500">
                        {columns.map((col) => {
                            const isSortable = col.sortable;
                            const isActive = sortBy === col.key;
                            const arrow =
                                isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
                            return (
                                <th key={col.key} className="py-2 pr-4 select-none">
                                    {isSortable ? (
                                        <button
                                            className="inline-flex items-center gap-1 hover:underline"
                                            onClick={() => onSort(col.key)}
                                        >
                                            {col.header} <span className="text-xs">{arrow}</span>
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                {columns.map((c) => (
                                    <td key={c.key} className="py-2 pr-4">
                                        <Skeleton height="1rem" width="80%" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : !data?.length ? (
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td className="py-6 pr-4 text-sm text-gray-500 dark:text-gray-400" colSpan={columns.length}>
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={row.id ?? JSON.stringify(row)}
                                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((c) => (
                                    <td key={c.key} className="py-2 pr-4 text-sm">
                                        {c.render ? c.render(row) : row[c.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                    Page {page + 1} of {totalPages} • {total} records
                </div>
                <div className="space-x-2">
                    <button
                        className="px-2 py-1 rounded border dark:border-gray-700 disabled:opacity-50"
                        onClick={() => onPageChange(Math.max(0, page - 1))}
                        disabled={page <= 0}
                    >
                        Prev
                    </button>
                    <button
                        className="px-2 py-1 rounded border dark:border-gray-700 disabled:opacity-50"
                        onClick={() =>
                            onPageChange(Math.min(totalPages - 1, page + 1))
                        }
                        disabled={page >= totalPages - 1}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
