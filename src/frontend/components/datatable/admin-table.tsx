'use client';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';
import { ReactNode, useEffect, useState } from 'react';

export interface AdminTableColumn<T> {
    key: string;
    header: string;
    sortable?: boolean;
    sortValue?: (row: T) => string | number;
    align?: 'left' | 'center' | 'right';
    render: (row: T) => ReactNode;
}

interface AdminTableProps<T> {
    columns: AdminTableColumn<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    emptyMessage: string;
    pageSize?: number;
}

const alignClass: Record<'left' | 'center' | 'right', string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

function AdminTable<T>({ columns, rows, rowKey, emptyMessage, pageSize = 10 }: AdminTableProps<T>) {
    const { t } = getTranslation();
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [rows]);

    const sortColumn = columns.find((c) => c.key === sortKey);
    const sortedRows =
        sortColumn?.sortValue && sortKey
            ? [...rows].sort((a, b) => {
                  const av = sortColumn.sortValue!(a);
                  const bv = sortColumn.sortValue!(b);
                  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                  return sortDirection === 'asc' ? cmp : -cmp;
              })
            : rows;

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const from = (currentPage - 1) * pageSize;
    const pageRows = sortedRows.slice(from, from + pageSize);

    const toggleSort = (column: AdminTableColumn<T>) => {
        if (!column.sortable || !column.sortValue) return;
        if (sortKey === column.key) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(column.key);
            setSortDirection('asc');
        }
    };

    return (
        <div>
            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className={alignClass[column.align ?? 'left']}>
                                    {column.sortable ? (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 font-semibold"
                                            onClick={() => toggleSort(column)}
                                        >
                                            {column.header}
                                            <IconCaretDown
                                                className={`h-3 w-3 transition-transform ${
                                                    sortKey === column.key ? (sortDirection === 'asc' ? 'rotate-180' : '') : 'opacity-30'
                                                }`}
                                            />
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-10 text-center text-white-dark">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row) => (
                                <tr key={rowKey(row)}>
                                    {columns.map((column) => (
                                        <td key={column.key} className={alignClass[column.align ?? 'left']}>
                                            {column.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {sortedRows.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <span className="text-xs text-white-dark">
                        {t('showing')} {from + 1} {t('to')} {Math.min(from + pageSize, sortedRows.length)} {t('of')} {sortedRows.length} {t('entries')}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            disabled={currentPage === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            {t('previous')}
                        </button>
                        <span className="text-xs">
                            {t('page')} {currentPage} {t('of')} {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            {t('next')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminTable;
