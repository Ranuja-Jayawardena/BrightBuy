'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/services/api';
import {
  Package,
  Tags,
  ShoppingCart,
  Archive,
  Users,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);

  useEffect(() => {
    // Quick operational stats fetch
    const fetchQuickStats = async () => {
      try {
        const [ordersRes, inventoryRes, employeesRes] = await Promise.all([
          apiFetch('/api/admin/orders?limit=1'),
          apiFetch('/api/admin/inventory?low_stock=true&threshold=10'),
          apiFetch('/api/admin/employees')
        ]);

        if (ordersRes.ok) {
          const ordData = await ordersRes.json();
          setOrderCount(ordData.pagination?.total_count ?? null);
        }
        if (inventoryRes.ok) {
          const invData = await inventoryRes.json();
          setLowStockCount(invData.data?.length ?? null);
        }
        if (employeesRes.ok) {
          const empData = await employeesRes.json();
          setEmployeeCount(empData.employees?.length ?? null);
        }
      } catch {
        // Silently ignore stat load errors on dashboard landing
      }
    };

    fetchQuickStats();
  }, []);

  const modules = [
    {
      title: 'Order Management',
      description: 'Review incoming customer orders, track payments, advance status workflows, and update courier shipments.',
      href: '/admin/orders',
      icon: ShoppingCart,
      stat: orderCount !== null ? `${orderCount} Total Orders` : undefined,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50'
    },
    {
      title: 'Inventory & Stock',
      description: 'Track SKU stock levels in real-time, set low-stock warning thresholds, and record audited inventory adjustments.',
      href: '/admin/inventory',
      icon: Archive,
      stat: lowStockCount !== null ? `${lowStockCount} Low Stock Alerts` : undefined,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
    },
    {
      title: 'Product Catalog',
      description: 'Manage store products, variants, pricing, attributes, and high-resolution product media galleries.',
      href: '/admin/products',
      icon: Package,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
    },
    {
      title: 'Category Taxonomy',
      description: 'Organize hierarchical parent-child category trees for smooth customer navigation.',
      href: '/admin/categories',
      icon: Tags,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/50'
    },
    {
      title: 'Employee Access',
      description: 'Review authorized administrator personnel accounts and register new internal store operators.',
      href: '/admin/employees',
      icon: Users,
      stat: employeeCount !== null ? `${employeeCount} Active Staff` : undefined,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50'
    },
    {
      title: 'Sales & Analytics',
      description: 'Export comprehensive business intelligence reports and revenue summaries (Phase 9 preview).',
      href: '/admin/reports',
      icon: BarChart3,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Hero */}
      <div className="border rounded-2xl p-8 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" /> Operations Control Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">BrightBuy Administration</h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Welcome to the central management hub. Orchestrate order fulfillment, monitor live warehouse stock levels, configure catalog entries, and administer internal team access.
          </p>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group border rounded-xl p-6 bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {m.stat && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                      {m.stat}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="pt-2 flex items-center text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                <span>Manage {m.title.split(' ')[0]}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
