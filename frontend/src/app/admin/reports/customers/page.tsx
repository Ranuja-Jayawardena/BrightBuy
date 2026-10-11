'use client';

import React, { useState, useEffect } from 'react';
import { Users, Mail } from 'lucide-react';
import {
  ReportNavTabs,
  ReportExportButton,
  ReportDonutChart,
  ReportDataTable,
  ColumnDef,
} from '@/components/reports';
import { TopCustomerDataPoint, CustomerGeographyDataPoint } from '@/types/reports';
import {
  reportService,
  MOCK_TOP_CUSTOMERS,
  MOCK_CUSTOMER_GEOGRAPHY,
} from '@/services/reportService';

export default function AdminReportsCustomersPage() {
  const [topCustomers, setTopCustomers] = useState<TopCustomerDataPoint[]>(MOCK_TOP_CUSTOMERS);
  const [geography, setGeography] = useState<CustomerGeographyDataPoint[]>(MOCK_CUSTOMER_GEOGRAPHY);

  useEffect(() => {
    reportService.getTopCustomers().then(setTopCustomers);
    reportService.getCustomerGeography().then(setGeography);
  }, []);

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
      render: (row) => <span className="font-mono text-xs">{row.order_count}</span>,
    },
    {
      key: 'total_spend',
      header: 'Lifetime Spend',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-emerald-600">
          ${row.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            Top customer spenders, order frequencies, and shipping distribution.
          </p>
        </div>

        <ReportExportButton
          type="customers"
          label="Export Customers CSV"
        />
      </div>

      <ReportNavTabs />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportDonutChart
          data={geography.map((g) => ({
            name: g.region,
            value: g.order_count,
          }))}
          title="Customer Geography"
          description="Order volume split between Metro Texas and Regional Texas"
          height={320}
          formatValue={(val) => `${val} orders`}
        />

        <ReportDataTable
          columns={customerColumns}
          data={topCustomers}
          title="Top Spenders (VIP Customers)"
          description="Customers ranked by cumulative order value"
          pageSize={5}
        />
      </div>
    </div>
  );
}
