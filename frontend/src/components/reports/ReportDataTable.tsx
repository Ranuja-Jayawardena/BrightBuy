'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

export interface ReportDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  title?: string;
  description?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: string[];
  pageSize?: number;
  emptyMessage?: string;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

export function ReportDataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  description,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchFields,
  pageSize = 5,
  emptyMessage = 'No records found matching criteria.',
  isLoading = false,
  actions,
}: ReportDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) =>
          String(row[field] ?? '')
            .toLowerCase()
            .includes(lower)
        );
      }
      return Object.values(row).some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [data, searchTerm, searchFields]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleHeaderClick = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {title && <h3 className="font-semibold text-lg text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-9 text-sm h-9"
              />
            </div>
          )}
          {actions}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col.key, col.sortable)}
                    className={`px-4 py-3 select-none ${col.sortable ? 'cursor-pointer hover:bg-muted/80' : ''} ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-muted-foreground">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-c-${cIdx}`} className="px-4 py-3">
                      <div className="h-4 bg-muted/60 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-foreground ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
        <div>
          Showing {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2.5 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2.5 text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
