'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Layers, DollarSign, CheckCircle2 } from 'lucide-react';
import {
  ReportNavTabs,
  ReportDateRangePicker,
  ReportExportButton,
  ReportBarChart,
  ReportDataTable,
  ColumnDef,
  getPresetDates,
} from '@/components/reports';
import { LowStockDataPoint, InventorySummaryDataPoint, DateRange } from '@/types/reports';
import {
  reportService,
  MOCK_LOW_STOCK,
  MOCK_INVENTORY_SUMMARY,
} from '@/services/reportService';

export default function AdminReportsInventoryPage() {
  const initialDates = getPresetDates('30d');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    preset: '30d',
  });

  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockDataPoint[]>(MOCK_LOW_STOCK);
  const [summary, setSummary] = useState<InventorySummaryDataPoint[]>(MOCK_INVENTORY_SUMMARY);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      reportService.getLowStock(10),
      reportService.getInventorySummary(),
    ])
      .then(([stock, sum]) => {
        if (!active) return;
        setLowStock(stock || []);
        setSummary(sum || []);
      })
      .catch((err) => {
        console.error('Failed to load inventory report data:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange]);

  const totalInventoryUnits = summary.reduce((acc, c) => acc + (Number(c.total_units) || 0), 0);
  const totalInventoryValue = summary.reduce((acc, c) => acc + (Number(c.total_value) || 0), 0);

  const lowStockColumns: ColumnDef<LowStockDataPoint>[] = [
    {
      key: 'variant_sku',
      header: 'SKU',
      sortable: true,
      render: (row) => <span className="font-mono text-xs font-semibold">{row.variant_sku}</span>,
    },
    {
      key: 'product_name',
      header: 'Product / Variant',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.product_name}</div>
          <div className="text-xs text-muted-foreground">{row.variant_name}</div>
        </div>
      ),
    },
    {
      key: 'stock_quantity',
      header: 'Stock Left',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-xs text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          {row.stock_quantity} left
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-medium">
          ${Number(row.price).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            Inventory Analytics & Stock Valuation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time low-stock alerts, warehouse replenishment forecasts, and asset values.
          </p>
        </div>

        <ReportExportButton
          type="inventory"
          params={{ start_date: dateRange.startDate, end_date: dateRange.endDate }}
          label="Export Inventory CSV"
        />
      </div>

      <ReportNavTabs />

      {/* Date Window Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-sm font-medium text-muted-foreground">Snapshot & Audit Window:</span>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Total Warehouse Units</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-muted animate-pulse rounded" />
            ) : (
              totalInventoryUnits.toLocaleString()
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Total Asset Valuation</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {loading ? (
              <span className="inline-block w-28 h-7 bg-muted animate-pulse rounded" />
            ) : (
              `$${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Critical Restock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {loading ? (
              <span className="inline-block w-12 h-7 bg-muted animate-pulse rounded" />
            ) : (
              lowStock.length
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportBarChart
          data={summary}
          xKey="category_name"
          bars={[
            { key: 'total_value', name: 'Stock Value ($)', fill: '#6366f1' },
          ]}
          title="Stock Value by Category"
          description="Capital allocation across inventory departments"
          formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
          emptyMessage="No category inventory records available."
          isLoading={loading}
        />

        <ReportDataTable
          columns={lowStockColumns}
          data={lowStock}
          title="Low-Stock Alerts (< 10 units)"
          description="Variants needing replenishment purchase orders"
          pageSize={5}
          emptyMessage="All products are well stocked — no low-stock alerts!"
          isLoading={loading}
        />
      </div>
    </div>
  );
}
