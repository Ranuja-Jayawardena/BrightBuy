'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ChevronRight, 
  Calendar, 
  ShoppingBag, 
  RefreshCw, 
  AlertCircle,
  Truck,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

interface OrderSummary {
  order_id: number;
  order_date: string;
  status: string;
  total_amount: string | number;
  item_count: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/orders');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load order history');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Check delivery status, review ordered items, and inspect receipts.
            </p>
          </div>
          {orders.length > 0 && (
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-xl p-5 bg-card animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-32 bg-muted rounded"></div>
                  <div className="h-5 w-20 bg-muted rounded-full"></div>
                </div>
                <div className="h-4 w-48 bg-muted/60 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-card border rounded-xl text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Unable to load orders</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchOrders} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed shadow-xs max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2 tracking-tight">No orders found</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              You haven&apos;t placed any orders yet. Once you complete a purchase, your order history and tracking will appear here.
            </p>
            <Link href="/">
              <Button size="lg" className="font-semibold shadow-xs">
                Start Shopping Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.order_id} href={`/orders/${order.order_id}`} className="block group">
                <div className="border rounded-xl p-5 bg-card group-hover:border-primary/50 group-hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">Order #{order.order_id}</span>
                      </div>
                      <div className="flex flex-wrap items-center text-xs text-muted-foreground mt-1 gap-2">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {new Date(order.order_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span>&bull;</span>
                        <span>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-6 pt-3 sm:pt-0 border-t sm:border-0">
                    <div className="text-left sm:text-right">
                      <p className="font-extrabold text-base text-foreground">${Number(order.total_amount).toFixed(2)}</p>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
