'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  PackageAlert,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import {
  ReportNavTabs,
  ReportDateRangePicker,
  ReportExportButton,
  ReportLineChart,
  ReportBarChart,
  ReportDonutChart,
  ReportDataTable,
  ColumnDef,
  getPresetDates,
} from '@/components/reports';
import { DateRange } from '@/types/reports';
import {
  reportService,
  MOCK_REVENUE_DATA,
  MOCK_TOP_PRODUCTS,
  MOCK_LOW_STOCK,
  MOCK_CUSTOMER_GEOGRAPHY,
} from '@/services/reportService';

export default function AdminReportsOverviewPage() {
  const initialDates = getPresetDates('year');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    preset: 'year',
  });

  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(MOCK_REVENUE_DATA);
  const [topProducts, setTopProducts] = useState(MOCK_TOP_PRODUCTS);
  const [lowStock, setLowStock] = useState(MOCK_LOW_STOCK);
  const [geographyData, setGeographyData] = useState(MOCK_CUSTOMER_GEOGRAPHY);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      reportService.getRevenue({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
      reportService.getTopProducts({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
      reportService.getLowStock(),
      reportService.getCustomerGeography({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
    ])
      .then(([rev, prods, stock, geo]) => {
        if (!active) return;
        setRevenueData(rev || []);
        setTopProducts(prods || []);
        setLowStock(stock || []);
        setGeographyData(geo || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange]);

  // Aggregate metrics
  const totalRevenue = revenueData.reduce((acc, cur) => acc + cur.revenue, 0);
  const totalOrders = revenueData.reduce((acc, cur) => acc + cur.order_count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Table columns definition
  const productColumns: ColumnDef<any>[] = [
    {
      key: 'product_name',
      header: 'Product Name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.product_name}</span>
          <span className="block text-xs text-muted-foreground">{row.variant_name}</span>
        </div>
      ),
    },
    {
      key: 'total_quantity',
      header: 'Units Sold',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold">{row.total_quantity.toLocaleString()}</span>
      ),
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
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Business Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise business intelligence, sales metrics, and performance analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ReportExportButton
            type="sales"
            params={{ start_date: dateRange.startDate, end_date: dateRange.endDate }}
            label="Export Sales CSV"
          />
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <ReportNavTabs />

      {/* Date Range Picker Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-sm font-medium text-muted-foreground">Global Report Filters:</span>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+14.2% from prior period</span>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Completed Orders</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalOrders.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            Revenue-bearing completed orders
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Avg. Order Value</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            ${avgOrderValue.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Mean customer transaction size
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Low Stock Items</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <PackageAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {lowStock.length}
          </div>
          <div className="text-xs text-muted-foreground">
            Variants below inventory threshold (&lt;10)
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportLineChart
            data={revenueData}
            xKey="period"
            lines={[
              { key: 'revenue', name: 'Revenue ($)', stroke: '#3b82f6', strokeWidth: 3 },
            ]}
            title="Monthly Revenue Growth"
            description="Historical net sales revenue across selected date periods"
            formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
            formatTooltip={(val) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
            height={340}
            isLoading={loading}
          />
        </div>

        <div>
          <ReportDonutChart
            data={geographyData.map((g) => ({
              name: g.region,
              value: g.order_count,
            }))}
            title="Order Distribution"
            description="Metro vs Regional Texas shipping destinations"
            height={340}
            formatValue={(val) => `${val} orders`}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Secondary Bar Chart & Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ReportBarChart
            data={topProducts}
            xKey="product_name"
            bars={[
              { key: 'total_revenue', name: 'Revenue ($)', fill: '#10b981' },
            ]}
            title="Top Performing Products"
            description="Best sellers ranked by total generated revenue"
            height={320}
            formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
            formatTooltip={(val) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
            isLoading={loading}
          />
        </div>

        <div>
          <ReportDataTable
            columns={productColumns}
            data={topProducts}
            title="Top Products Breakdown"
            description="Sortable product sales performance"
            pageSize={4}
            searchPlaceholder="Filter product or variant..."
            isLoading={loading}
          />
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <Link
          href="/admin/reports/sales"
          className="group block p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sales Analytics
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground">
            Revenue trends, top sellers, order volumes, and financial reporting.
          </p>
        </Link>

        <Link
          href="/admin/reports/inventory"
          className="group block p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              <PackageAlert className="h-4 w-4" />
              Inventory Reports
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground">
            Low stock alerts, valuation by category, and stock turn rates.
          </p>
        </Link>

        <Link
          href="/admin/reports/customers"
          className="group block p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Insights
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground">
            Top customer spenders, order frequencies, and geographic breakdown.
          </p>
        </Link>
      </div>
    </div>
  );
}
