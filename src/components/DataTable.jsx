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
    const safePage = Math.max(0, page || 0);
    const rangeStart = total > 0 ? safePage * limit + 1 : 0;
    const rangeEnd = total > 0 ? Math.min(total, safePage * limit + (limit || 0)) : 0;
    const isRowClickable = typeof onRowClick === 'function';

    return (
        <div className="w-full">
            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/75 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/55">
                <table className="min-w-full">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {columns.map((col) => {
                                const isSortable = col.sortable;
                                const isActive = sortBy === col.key;
                                const arrow = isActive ? (sortDir === 'asc' ? '^' : 'v') : '<>';
                                return (
                                    <th
                                        key={col.key}
                                        className="select-none bg-slate-50/80 px-4 py-3.5 first:rounded-tl-2xl last:rounded-tr-2xl dark:bg-slate-800/70"
                                    >
                                        {isSortable ? (
                                            <button
                                                type="button"
                                                className={`inline-flex items-center gap-1.5 transition-colors ${isActive ? 'text-slate-700 dark:text-slate-100' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}
                                                onClick={() => onSort(col.key)}
                                            >
                                                {col.header}
                                                <span className="text-[10px] opacity-80">{arrow}</span>
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
                            [...Array(6)].map((_, i) => (
                                <tr key={i} className="border-t border-slate-200/70 dark:border-slate-700/70">
                                    {columns.map((c) => (
                                        <td key={c.key} className="px-4 py-3">
                                            <Skeleton height="1rem" width="80%" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : !data?.length ? (
                            <tr className="border-t border-slate-200/70 dark:border-slate-700/70">
                                <td className="px-4 py-8" colSpan={columns.length}>
                                    <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/70 p-4 text-center text-sm text-slate-500 dark:border-slate-600/80 dark:bg-slate-800/40 dark:text-slate-300">
                                        {emptyMessage}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => (
                                <tr
                                    key={row.id ?? JSON.stringify(row)}
                                    className={`border-t border-slate-200/70 dark:border-slate-700/70 transition-colors ${isRowClickable ? 'cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-cyan-900/20' : 'cursor-default hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                                    onClick={() => {
                                        if (isRowClickable) onRowClick(row);
                                    }}
                                >
                                    {columns.map((c) => (
                                        <td key={c.key} className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-200">
                                            {c.render ? c.render(row) : row[c.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-slate-600 dark:text-slate-300">
                    Showing {rangeStart}-{rangeEnd} of {total} records
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        Page {safePage + 1} / {totalPages}
                    </span>
                    <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-all hover:-translate-y-[1px] hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => onPageChange(Math.max(0, safePage - 1))}
                        disabled={safePage <= 0}
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-all hover:-translate-y-[1px] hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
                        disabled={safePage >= totalPages - 1}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
