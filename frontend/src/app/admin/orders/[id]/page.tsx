'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Package,
  CreditCard,
  User,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface OrderDetailItem {
  order_item_id: number;
  variant_id: number;
  quantity: number;
  unit_price: number;
  variant_name: string;
  product_name: string;
}

interface OrderDetailDelivery {
  delivery_id: number;
  order_id: number;
  delivery_mode: string;
  delivery_address_line1: string;
  delivery_address_line2: string | null;
  delivery_city_id: number;
  city_name: string;
  delivery_zip_code: string;
  estimated_delivery_days: number | null;
  tracking_number: string | null;
  delivery_status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
}

interface OrderDetailPayment {
  payment_id: number;
  payment_method: string;
  payment_status: string;
  amount: number;
  transaction_id: string | null;
  payment_date: string | null;
}

interface FullOrder {
  order_id: number;
  order_date: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  customer_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  items: OrderDetailItem[];
  payment: OrderDetailPayment | null;
  delivery: OrderDetailDelivery | null;
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();

  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status controls
  const [nextStatus, setNextStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delivery controls
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);

  const getValidTransitions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'pending':
        return ['paid', 'cancelled'];
      case 'paid':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['delivered', 'cancelled'];
      default:
        return [];
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load order details');
      }

      const data = await res.json();
      const ord: FullOrder = data.order;
      setOrder(ord);

      const validTransitions = getValidTransitions(ord.status);
      setNextStatus(validTransitions.length > 0 ? validTransitions[0] : '');

      if (ord.delivery) {
        setDeliveryStatus(ord.delivery.delivery_status || 'pending');
        setTrackingNumber(ord.delivery.tracking_number || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleUpdateOrderStatus = async () => {
    if (!order || !nextStatus) return;
    try {
      setIsUpdatingStatus(true);
      setError('');
      setSuccess('');

      const res = await apiFetch(`/api/admin/orders/${order.order_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update order status');
      }

      setSuccess(`Order status updated to ${nextStatus.toUpperCase()}`);
      await fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!order || !order.delivery) return;
    try {
      setIsUpdatingDelivery(true);
      setError('');
      setSuccess('');

      const res = await apiFetch(`/api/admin/deliveries/${order.delivery.delivery_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_status: deliveryStatus,
          tracking_number: trackingNumber.trim() || null
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update delivery');
      }

      setSuccess('Delivery details successfully updated');
      await fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <Truck className="w-3.5 h-3.5" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
        </Button>
      </div>
    );
  }

  if (!order) return null;

  const validTransitions = getValidTransitions(order.status);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders List
        </Link>
        <Button variant="outline" size="sm" onClick={fetchOrder}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.order_id}</h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Placed on {new Date(order.order_date).toLocaleString()}
          </p>
        </div>
        <div className="text-right sm:text-right">
          <span className="text-xs text-muted-foreground block">Total Amount</span>
          <span className="text-2xl font-bold text-primary">${Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center gap-2 border border-green-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <div className="border rounded-lg p-5 bg-card shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
            <User className="w-4 h-4 text-primary" /> Customer Info
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-base">
              {`${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest / User'}
            </p>
            <p className="text-muted-foreground text-xs break-all">{order.email}</p>
            <p className="text-muted-foreground text-xs pt-1">Customer ID: #{order.customer_id}</p>
          </div>
        </div>

        {/* Payment Info Card */}
        <div className="border rounded-lg p-5 bg-card shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
            <CreditCard className="w-4 h-4 text-primary" /> Payment Record
          </div>
          {order.payment ? (
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium uppercase">{order.payment.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{order.payment.payment_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">${Number(order.payment.amount).toFixed(2)}</span>
              </div>
              {order.payment.transaction_id && (
                <div className="text-xs pt-1 border-t text-muted-foreground">
                  Txn ID: <span className="font-mono text-foreground">{order.payment.transaction_id}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No payment record attached</p>
          )}
        </div>

        {/* Shipping Card */}
        <div className="border rounded-lg p-5 bg-card shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
            <MapPin className="w-4 h-4 text-primary" /> Delivery Destination
          </div>
          {order.delivery ? (
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="font-medium capitalize">{order.delivery.delivery_mode.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Address:</span>
                <p className="font-medium">
                  {order.delivery.delivery_address_line1}
                  {order.delivery.delivery_address_line2 ? `, ${order.delivery.delivery_address_line2}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.delivery.city_name} {order.delivery.delivery_zip_code}
                </p>
              </div>
              {order.delivery.estimated_delivery_days && (
                <p className="text-xs text-muted-foreground pt-1">
                  Est. Delivery: {order.delivery.estimated_delivery_days} days
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No delivery record</p>
          )}
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/30 font-semibold text-sm flex items-center gap-2 border-b">
          <Package className="w-4 h-4 text-primary" /> Order Items ({order.items?.length || 0})
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/10 border-b text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Variant</th>
              <th className="p-4 text-right">Unit Price</th>
              <th className="p-4 text-center">Qty</th>
              <th className="p-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items?.map((item) => (
              <tr key={item.order_item_id} className="hover:bg-muted/20">
                <td className="p-4 font-medium">{item.product_name}</td>
                <td className="p-4 text-muted-foreground">{item.variant_name}</td>
                <td className="p-4 text-right">${Number(item.unit_price).toFixed(2)}</td>
                <td className="p-4 text-center font-medium">{item.quantity}</td>
                <td className="p-4 text-right font-semibold">
                  ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 border-t font-semibold">
            <tr>
              <td colSpan={4} className="p-4 text-right">Order Grand Total:</td>
              <td className="p-4 text-right text-lg text-primary">${Number(order.total_amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Operations Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Status Control */}
        <div className="border rounded-lg p-5 bg-card shadow-sm space-y-4">
          <h2 className="font-semibold text-base">Fulfillment Status Workflow</h2>
          <p className="text-xs text-muted-foreground">
            Current Status: <strong className="uppercase">{order.status}</strong>
          </p>

          {validTransitions.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Allowed Status Transition
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {validTransitions.map((s) => (
                    <option key={s} value={s}>
                      Transition to {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleUpdateOrderStatus}
                disabled={isUpdatingStatus || !nextStatus}
                className="w-full"
              >
                {isUpdatingStatus ? 'Updating Status...' : 'Advance Order Status'}
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              This order has reached its terminal state (<strong>{order.status.toUpperCase()}</strong>). No further transitions are available.
            </div>
          )}
        </div>

        {/* Delivery Status & Tracking Control */}
        <div className="border rounded-lg p-5 bg-card shadow-sm space-y-4">
          <h2 className="font-semibold text-base">Courier & Delivery Management</h2>
          <p className="text-xs text-muted-foreground">
            Update courier tracking information and shipment progress.
          </p>

          {order.delivery ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Delivery Status
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Courier Tracking Code
                </label>
                <Input
                  placeholder="e.g. TRK-78401928"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>

              <Button
                variant="secondary"
                onClick={handleUpdateDelivery}
                disabled={isUpdatingDelivery}
                className="w-full"
              >
                {isUpdatingDelivery ? 'Saving...' : 'Update Courier & Tracking'}
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              No delivery record exists for this order.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
