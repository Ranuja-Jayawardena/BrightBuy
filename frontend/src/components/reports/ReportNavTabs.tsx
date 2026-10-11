'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, PackageCheck, Users, LayoutDashboard } from 'lucide-react';

export const ReportNavTabs: React.FC = () => {
  const pathname = usePathname();

  const tabs = [
    { href: '/admin/reports', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/admin/reports/sales', label: 'Sales Analytics', icon: TrendingUp },
    { href: '/admin/reports/inventory', label: 'Inventory Reports', icon: PackageCheck },
    { href: '/admin/reports/customers', label: 'Customer Insights', icon: Users },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-border mb-6 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
              isActive
                ? 'border-primary text-primary bg-primary/5 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
