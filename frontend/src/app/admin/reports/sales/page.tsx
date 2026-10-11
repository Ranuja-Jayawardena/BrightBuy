'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import {
  ReportNavTabs,
  ReportDateRangePicker,
  ReportExportButton,
  ReportLineChart,
  ReportBarChart,
  ReportDataTable,
  ColumnDef,
  getPresetDates,
} from '@/components/reports';
import { DateRange, TopProductDataPoint, RevenueDataPoint } from '@/types/reports';
import {
  reportService,
  MOCK_REVENUE_DATA,
  MOCK_TOP_PRODUCTS,
} from '@/services/reportService';

export default function AdminReportsSalesPage() {
  const initialDates = getPresetDates('quarter');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    preset: 'quarter',
  });

  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>(MOCK_REVENUE_DATA);
  const [topProducts, setTopProducts] = useState<TopProductDataPoint[]>(MOCK_TOP_PRODUCTS);

  useEffect(() => {
    reportService.getRevenue({ start_date: dateRange.startDate, end_date: dateRange.endDate })
      .then(setRevenueData);
    reportService.getTopProducts({ start_date: dateRange.startDate, end_date: dateRange.endDate })
      .then(setTopProducts);
  }, [dateRange]);

  const productColumns: ColumnDef<TopProductDataPoint>[] = [
    {
      key: 'product_name',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.product_name}</div>
          <div className="text-xs text-muted-foreground">{row.variant_name}</div>
        </div>
      ),
    },
    {
      key: 'total_quantity',
      header: 'Units Sold',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-xs">{row.total_quantity}</span>,
    },
    {
      key: 'total_revenue',
      header: 'Total Revenue',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-emerald-600">
          ${row.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <TrendingUp className="h-8 w-8 text-primary" />
            Sales Analytics & Revenue Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track revenue velocity, high-performing products, and historical order volumes.
          </p>
        </div>

        <ReportExportButton
          type="sales"
          params={{ start_date: dateRange.startDate, end_date: dateRange.endDate }}
          label="Export Sales Report"
        />
      </div>

      <ReportNavTabs />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-sm font-medium text-muted-foreground">Sales Date Window:</span>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ReportLineChart
          data={revenueData}
          xKey="period"
          lines={[
            { key: 'revenue', name: 'Net Revenue ($)', stroke: '#2563eb', strokeWidth: 3 },
          ]}
          title="Revenue Over Time"
          description="Aggregated order earnings by period"
          formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
          formatTooltip={(val) => [`$${Number(val).toLocaleString()}`, 'Net Revenue']}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportBarChart
            data={topProducts}
            xKey="product_name"
            bars={[
              { key: 'total_revenue', name: 'Revenue ($)', fill: '#10b981' },
            ]}
            title="Top Products by Revenue"
            description="Leading revenue generators across catalog"
            formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
          />

          <ReportDataTable
            columns={productColumns}
            data={topProducts}
            title="Product Sales Rankings"
            description="Sortable sales performance across variants"
            pageSize={5}
          />
        </div>
      </div>
    </div>
  );
}
