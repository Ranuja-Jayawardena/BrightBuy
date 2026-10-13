'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, BarChart2, PackageCheck } from 'lucide-react';
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
import { DateRange, TopProductDataPoint, RevenueDataPoint, OrderStatusDataPoint } from '@/types/reports';
import {
  reportService,
  MOCK_REVENUE_DATA,
  MOCK_TOP_PRODUCTS,
  MOCK_ORDER_STATUS_DATA,
} from '@/services/reportService';

export default function AdminReportsSalesPage() {
  const initialDates = getPresetDates('quarter');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    preset: 'quarter',
  });

  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>(MOCK_REVENUE_DATA);
  const [topProducts, setTopProducts] = useState<TopProductDataPoint[]>(MOCK_TOP_PRODUCTS);
  const [ordersData, setOrdersData] = useState<OrderStatusDataPoint[]>(MOCK_ORDER_STATUS_DATA);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      reportService.getRevenue({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
      reportService.getTopProducts({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
      reportService.getOrders({ start_date: dateRange.startDate, end_date: dateRange.endDate }),
    ])
      .then(([rev, prods, ords]) => {
        if (!active) return;
        setRevenueData(rev || []);
        setTopProducts(prods || []);
        setOrdersData(ords || []);
      })
      .catch((err) => {
        console.error('Failed to load sales report data:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange]);

  // Aggregate metrics
  const totalRevenue = useMemo(
    () => revenueData.reduce((acc, cur) => acc + (Number(cur.revenue) || 0), 0),
    [revenueData]
  );
  const totalOrders = useMemo(
    () => revenueData.reduce((acc, cur) => acc + (Number(cur.order_count) || 0), 0),
    [revenueData]
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const topProductLeader = topProducts[0];

  // Aggregate order volume by period for order volume chart
  const orderVolumeChartData = useMemo(() => {
    if (ordersData.length > 0) {
      const map: Record<string, { period: string; total_orders: number }> = {};
      ordersData.forEach((item) => {
        if (!map[item.period]) {
          map[item.period] = { period: item.period, total_orders: 0 };
        }
        map[item.period].total_orders += Number(item.order_count) || 0;
      });
      return Object.values(map);
    }
    return revenueData.map((r) => ({
      period: r.period,
      total_orders: r.order_count,
    }));
  }, [ordersData, revenueData]);

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
          ${Number(row.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-sm font-medium text-muted-foreground">Sales Date Window:</span>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
            ) : (
              `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" />
            ) : (
              totalOrders.toLocaleString()
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Avg Order Value</span>
            <BarChart2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-muted animate-pulse rounded" />
            ) : (
              `$${avgOrderValue.toFixed(2)}`
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Top Seller</span>
            <PackageCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-foreground truncate">
            {loading ? (
              <span className="inline-block w-28 h-7 bg-muted animate-pulse rounded" />
            ) : topProductLeader ? (
              topProductLeader.product_name
            ) : (
              'None'
            )}
          </div>
          {topProductLeader && !loading && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              {topProductLeader.total_quantity} sold
            </div>
          )}
        </div>
      </div>

      {/* Main Charts: Revenue & Order Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          emptyMessage="No revenue transactions found for this date range."
          isLoading={loading}
        />

        <ReportBarChart
          data={orderVolumeChartData}
          xKey="period"
          bars={[
            { key: 'total_orders', name: 'Total Orders', fill: '#3b82f6' },
          ]}
          title="Order Volume by Period"
          description="Total completed and processed orders"
          formatYAxis={(val) => `${val}`}
          emptyMessage="No orders found for this date range."
          isLoading={loading}
        />
      </div>

      {/* Secondary Grid: Top Products Chart & Rankings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportBarChart
          data={topProducts}
          xKey="product_name"
          layout="vertical"
          bars={[
            { key: 'total_revenue', name: 'Revenue ($)', fill: '#10b981' },
          ]}
          title="Top Products by Revenue"
          description="Leading revenue generators across catalog"
          formatYAxis={(val) => `$${(val / 1000).toFixed(0)}k`}
          formatTooltip={(val) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
          emptyMessage="No product sales recorded in this period."
          isLoading={loading}
        />

        <ReportDataTable
          columns={productColumns}
          data={topProducts}
          title="Product Sales Rankings"
          description="Sortable sales performance across variants"
          pageSize={5}
          emptyMessage="No matching products found in the sales report."
          isLoading={loading}
        />
      </div>
    </div>
  );
}
