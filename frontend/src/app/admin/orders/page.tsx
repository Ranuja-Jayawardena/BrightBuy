'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  CreditCard,
  User,
  MapPin,
  ExternalLink,
  X
} from 'lucide-react';
import Link from 'next/link';

interface OrderSummary {
  order_id: number;
  order_date: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  customer_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  item_count: number;
}

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
  updated_at?: string;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  // Selected order modal state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailSuccess, setDetailSuccess] = useState('');

  // Update controls state inside modal
  const [nextStatus, setNextStatus] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (statusFilter) queryParams.set('status', statusFilter);
      if (dateFrom) queryParams.set('date_from', dateFrom);
      if (dateTo) queryParams.set('date_to', dateTo);
      if (customerSearch.trim()) queryParams.set('customer', customerSearch.trim());

      const res = await apiFetch(`/api/admin/orders?${queryParams.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load orders');
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalCount(data.pagination?.total_count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateFrom, dateTo, customerSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadOrderDetail = async (id: number) => {
    try {
      setSelectedOrderId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetailSuccess('');
      setSelectedOrder(null);

      const res = await apiFetch(`/api/admin/orders/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to fetch order details');
      }

      const data = await res.json();
      const ord: FullOrder = data.order;
      setSelectedOrder(ord);

      // Pre-select allowed next status
      const validTransitions = getValidTransitions(ord.status);
      setNextStatus(validTransitions.length > 0 ? validTransitions[0] : '');

      // Initialize delivery controls
      if (ord.delivery) {
        setDeliveryStatus(ord.delivery.delivery_status || 'pending');
        setTrackingNumber(ord.delivery.tracking_number || '');
      }
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setDetailError('');
    setDetailSuccess('');
  };

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

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder || !nextStatus) return;
    try {
      setIsUpdatingStatus(true);
      setDetailError('');
      setDetailSuccess('');

      const res = await apiFetch(`/api/admin/orders/${selectedOrder.order_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update order status');
      }

      setDetailSuccess(`Order status successfully updated to "${nextStatus.toUpperCase()}"`);
      await loadOrderDetail(selectedOrder.order_id);
      fetchOrders();
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!selectedOrder || !selectedOrder.delivery) return;
    try {
      setIsUpdatingDelivery(true);
      setDetailError('');
      setDetailSuccess('');

      const res = await apiFetch(`/api/admin/deliveries/${selectedOrder.delivery.delivery_id}/status`, {
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

      setDetailSuccess('Delivery information successfully updated');
      await loadOrderDetail(selectedOrder.order_id);
      fetchOrders();
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const resetFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setCustomerSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor incoming customer orders, update fulfillment statuses, and manage deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="w-4 h-4" /> Filters & Search
          </div>
          {(statusFilter || dateFrom || dateTo || customerSearch) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Customer Search */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer / Email</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search name, email, ID..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Order Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Placed After (From)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Placed Before (To)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">Order #</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    <p className="font-medium text-foreground">No orders matched the criteria</p>
                    <p className="text-sm mt-1">Try resetting the status filter or date range.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest / User';
                  return (
                    <tr
                      key={order.order_id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => loadOrderDetail(order.order_id)}
                    >
                      <td className="p-4 font-medium font-mono text-primary">
                        #{order.order_id}
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {new Date(order.order_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.email}</div>
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                      </td>
                      <td className="p-4 font-semibold whitespace-nowrap">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadOrderDetail(order.order_id)}
                          className="gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Details</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            Showing {orders.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, totalCount)} of {totalCount} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="px-2 text-xs font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="bg-card border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between bg-muted/20">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">Order #{selectedOrderId}</h2>
                  {selectedOrder && getStatusBadge(selectedOrder.status)}
                </div>
                {selectedOrder && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Placed on {new Date(selectedOrder.order_date).toLocaleString()}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span>Loading full order details...</span>
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : selectedOrder ? (
                <>
                  {/* Feedback Banner */}
                  {detailSuccess && (
                    <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center gap-2 border border-green-200">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>{detailSuccess}</span>
                    </div>
                  )}

                  {/* Top Info Cards: Customer, Payment, Delivery */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Customer Info Card */}
                    <div className="border rounded-lg p-4 bg-muted/10 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                        <User className="w-4 h-4 text-primary" /> Customer Info
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">
                          {`${selectedOrder.first_name || ''} ${selectedOrder.last_name || ''}`.trim() || 'Not specified'}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">{selectedOrder.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: #{selectedOrder.customer_id}</p>
                      </div>
                    </div>

                    {/* Payment Info Card */}
                    <div className="border rounded-lg p-4 bg-muted/10 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                        <CreditCard className="w-4 h-4 text-primary" /> Payment Info
                      </div>
                      {selectedOrder.payment ? (
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Method:</span>
                            <span className="font-medium uppercase">{selectedOrder.payment.payment_method}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium capitalize">{selectedOrder.payment.payment_status}</span>
                          </div>
                          {selectedOrder.payment.transaction_id && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Txn ID:</span>
                              <span className="font-mono">{selectedOrder.payment.transaction_id}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No payment record attached</p>
                      )}
                    </div>

                    {/* Delivery Summary Card */}
                    <div className="border rounded-lg p-4 bg-muted/10 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                        <MapPin className="w-4 h-4 text-primary" /> Shipping Address
                      </div>
                      {selectedOrder.delivery ? (
                        <div className="text-sm space-y-1">
                          <p className="font-medium capitalize">
                            {selectedOrder.delivery.delivery_mode.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedOrder.delivery.delivery_address_line1}
                            {selectedOrder.delivery.delivery_address_line2 ? `, ${selectedOrder.delivery.delivery_address_line2}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedOrder.delivery.city_name} {selectedOrder.delivery.delivery_zip_code}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No delivery record</p>
                      )}
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-3 bg-muted/40 font-semibold text-sm flex items-center gap-2 border-b">
                      <Package className="w-4 h-4 text-primary" /> Ordered Items ({selectedOrder.items?.length || 0})
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/20 border-b text-xs text-muted-foreground">
                        <tr>
                          <th className="p-3">Product & Variant</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedOrder.items?.map((item) => (
                          <tr key={item.order_item_id}>
                            <td className="p-3">
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              ${Number(item.unit_price).toFixed(2)}
                            </td>
                            <td className="p-3 text-center font-medium">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-right font-medium">
                              ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t font-semibold">
                        <tr>
                          <td colSpan={3} className="p-3 text-right">
                            Total Amount:
                          </td>
                          <td className="p-3 text-right text-base text-primary">
                            ${Number(selectedOrder.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Operations Control Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Control 1: Order Status Update */}
                    <div className="border rounded-lg p-5 bg-card space-y-4">
                      <div>
                        <h3 className="font-semibold text-sm">Order Status Controls</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Advance fulfillment from Paid to Shipped, Delivered, or Cancelled.
                        </p>
                      </div>

                      {getValidTransitions(selectedOrder.status).length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                              Select Next Valid Status
                            </label>
                            <select
                              value={nextStatus}
                              onChange={(e) => setNextStatus(e.target.value)}
                              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {getValidTransitions(selectedOrder.status).map((s) => (
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
                            {isUpdatingStatus ? 'Updating Status...' : 'Apply Status Transition'}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 rounded bg-muted/40 text-xs text-muted-foreground">
                          Order is in final state (<strong>{selectedOrder.status.toUpperCase()}</strong>). No further transitions allowed.
                        </div>
                      )}
                    </div>

                    {/* Control 2: Delivery & Tracking Update */}
                    <div className="border rounded-lg p-5 bg-card space-y-4">
                      <div>
                        <h3 className="font-semibold text-sm">Delivery & Fulfillment Details</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Update courier tracking code and package dispatch status.
                        </p>
                      </div>

                      {selectedOrder.delivery ? (
                        <div className="space-y-3">
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
                              Tracking Number
                            </label>
                            <Input
                              placeholder="e.g. TRK-982347102"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              className="text-sm"
                            />
                          </div>

                          <Button
                            variant="secondary"
                            onClick={handleUpdateDelivery}
                            disabled={isUpdatingDelivery}
                            className="w-full"
                          >
                            {isUpdatingDelivery ? 'Saving Delivery...' : 'Update Delivery Info'}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 rounded bg-muted/40 text-xs text-muted-foreground">
                          No delivery record associated with this order.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/20 flex justify-between items-center">
              <Link
                href={`/admin/orders/${selectedOrderId}`}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Dedicated Order Page
              </Link>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
