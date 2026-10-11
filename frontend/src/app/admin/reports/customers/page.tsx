'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Mail, MapPin, DollarSign, Award } from 'lucide-react';
import {
  ReportNavTabs,
  ReportDateRangePicker,
  ReportExportButton,
  ReportDonutChart,
  ReportDataTable,
  ColumnDef,
  getPresetDates,
} from '@/components/reports';
import { TopCustomerDataPoint, CustomerGeographyDataPoint, DateRange } from '@/types/reports';
import {
  reportService,
  MOCK_TOP_CUSTOMERS,
  MOCK_CUSTOMER_GEOGRAPHY,
} from '@/services/reportService';

export default function AdminReportsCustomersPage() {
  const initialDates = getPresetDates('year');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    preset: 'year',
  });

  const [loading, setLoading] = useState(true);
  const [topCustomers, setTopCustomers] = useState<TopCustomerDataPoint[]>(MOCK_TOP_CUSTOMERS);
  const [geography, setGeography] = useState<CustomerGeographyDataPoint[]>(MOCK_CUSTOMER_GEOGRAPHY);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      reportService.getTopCustomers({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }),
      reportService.getCustomerGeography({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }),
    ])
      .then(([cust, geo]) => {
        if (!active) return;
        setTopCustomers(cust || []);
        setGeography(geo || []);
      })
      .catch((err) => {
        console.error('Failed to load customer report data:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateRange]);

  const totalCustomerSpend = useMemo(
    () => topCustomers.reduce((acc, c) => acc + (Number(c.total_spend) || 0), 0),
    [topCustomers]
  );
  const totalOrdersPlaced = useMemo(
    () => topCustomers.reduce((acc, c) => acc + (Number(c.order_count) || 0), 0),
    [topCustomers]
  );
  const topCustomer = topCustomers[0];

  const customerColumns: ColumnDef<TopCustomerDataPoint>[] = [
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.first_name} {row.last_name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'order_count',
      header: 'Orders Placed',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-xs font-medium">{row.order_count}</span>,
    },
    {
      key: 'total_spend',
      header: 'Lifetime Spend',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-emerald-600">
          ${Number(row.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-8 w-8 text-primary" />
            Customer Insights & Demographics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top customer spenders, order frequencies, and geographic delivery distribution.
          </p>
        </div>

        <ReportExportButton
          type="customers"
          params={{ start_date: dateRange.startDate, end_date: dateRange.endDate }}
          label="Export Customers CSV"
        />
      </div>

      <ReportNavTabs />

      {/* Date Window Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-sm font-medium text-muted-foreground">Customer Activity Period:</span>
        <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>VIP Group Cumulative Spend</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-28 h-7 bg-muted animate-pulse rounded" />
            ) : (
              `$${totalCustomerSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>VIP Orders Generated</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" />
            ) : (
              totalOrdersPlaced.toLocaleString()
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium mb-1">
            <span>Top Patron</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-foreground truncate">
            {loading ? (
              <span className="inline-block w-28 h-7 bg-muted animate-pulse rounded" />
            ) : topCustomer ? (
              `${topCustomer.first_name} ${topCustomer.last_name}`
            ) : (
              'None'
            )}
          </div>
          {topCustomer && !loading && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              ${Number(topCustomer.total_spend).toFixed(2)} spent ({topCustomer.order_count} orders)
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportDonutChart
          data={geography.map((g) => ({
            name: g.region,
            value: Number(g.order_count) || 0,
          }))}
          title="Customer Geography Breakdown"
          description="Order volume split between Metro Texas and Regional delivery territories"
          height={320}
          formatValue={(val) => `${val} orders`}
          emptyMessage="No customer geographic data available for this range."
          isLoading={loading}
        />

        <ReportDataTable
          columns={customerColumns}
          data={topCustomers}
          title="Top Spenders (VIP Customers)"
          description="Customers ranked by cumulative order value in selected period"
          pageSize={5}
          emptyMessage="No customer records found for this period."
          isLoading={loading}
        />
      </div>
    </div>
  );
}
