'use client';

import React, { useState, useEffect } from 'react';
import { PackageAlert, AlertTriangle } from 'lucide-react';
import {
  ReportNavTabs,
  ReportExportButton,
  ReportBarChart,
  ReportDataTable,
  ColumnDef,
} from '@/components/reports';
import { LowStockDataPoint, InventorySummaryDataPoint } from '@/types/reports';
import {
  reportService,
  MOCK_LOW_STOCK,
  MOCK_INVENTORY_SUMMARY,
} from '@/services/reportService';

export default function AdminReportsInventoryPage() {
  const [lowStock, setLowStock] = useState<LowStockDataPoint[]>(MOCK_LOW_STOCK);
  const [summary, setSummary] = useState<InventorySummaryDataPoint[]>(MOCK_INVENTORY_SUMMARY);

  useEffect(() => {
    reportService.getLowStock(10).then(setLowStock);
    reportService.getInventorySummary().then(setSummary);
  }, []);

  const totalInventoryUnits = summary.reduce((acc, c) => acc + c.total_units, 0);
  const totalInventoryValue = summary.reduce((acc, c) => acc + c.total_value, 0);

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
        <span className="inline-flex items-center gap-1 font-semibold text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
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
        <span className="font-mono text-xs">
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
            <PackageAlert className="h-8 w-8 text-amber-500" />
            Inventory Analytics & Stock Valuation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time low-stock alerts, warehouse replenishment forecasts, and asset values.
          </p>
        </div>

        <ReportExportButton
          type="inventory"
          label="Export Inventory CSV"
        />
      </div>

      <ReportNavTabs />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Total Warehouse Units</div>
          <div className="text-2xl font-bold text-foreground">{totalInventoryUnits.toLocaleString()}</div>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Total Asset Valuation</div>
          <div className="text-2xl font-bold text-emerald-600">
            ${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Critical Restock Alerts</div>
          <div className="text-2xl font-bold text-red-600">{lowStock.length}</div>
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
        />

        <ReportDataTable
          columns={lowStockColumns}
          data={lowStock}
          title="Low-Stock Alerts (< 10 units)"
          description="Variants needing purchase orders"
          pageSize={5}
        />
      </div>
    </div>
  );
}
