'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Package, Truck, Calendar, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface OrderDetail {
  order_id: number;
  order_date: string;
  status: string;
  total_amount: string | number;
  items: Array<{
    variant_id: number;
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: string | number;
  }>;
  delivery: {
    delivery_mode: string;
    delivery_address_line1: string;
    city_name: string;
    delivery_status: string;
    tracking_number: string | null;
    estimated_delivery_days: number;
  };
  payment: {
    payment_method: string;
    payment_status: string;
  } | null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiFetch(`/api/orders/${params.id}`);
        if (!res.ok) throw new Error('Failed to load order details');
        const data = await res.json();
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [params.id]);

  if (loading) {
    return <div className="p-12 text-center">Loading order details...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-12 text-center text-red-500">
        <p>{error || 'Order not found'}</p>
        <Button className="mt-4" onClick={() => router.push('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <Link href="/orders" className="text-muted-foreground hover:text-foreground flex items-center text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.order_id}</h1>
            <p className="text-muted-foreground mt-1">Placed on {new Date(order.order_date).toLocaleDateString()}</p>
          </div>
          <div className="bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full uppercase tracking-wider text-sm inline-block text-center self-start sm:self-auto">
            {order.status}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          
          <div className="md:col-span-2 space-y-8">
            {/* Items */}
            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center">
                  <Package className="w-5 h-5 mr-2" /> Items
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-base">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${(Number(item.unit_price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-muted/30 border-t flex justify-between items-center text-lg font-bold">
                <span>Total Amount</span>
                <span>${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Delivery Info */}
            <div className="bg-card border rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold flex items-center mb-4 border-b pb-2">
                <Truck className="w-4 h-4 mr-2" /> Delivery Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p className="font-medium capitalize">{order.delivery.delivery_mode.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{order.delivery.delivery_status}</p>
                </div>
                {order.delivery.tracking_number && (
                  <div>
                    <p className="text-muted-foreground">Tracking Number</p>
                    <p className="font-medium text-blue-600">{order.delivery.tracking_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Shipping Address</p>
                  <p className="font-medium">{order.delivery.delivery_address_line1}</p>
                  <p className="font-medium">{order.delivery.city_name}</p>
                </div>
                <div className="mt-2 bg-blue-50 text-blue-800 p-2 rounded flex items-center">
                  <Calendar className="w-4 h-4 mr-2 shrink-0" />
                  ETA: {order.delivery.estimated_delivery_days} days
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-card border rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold flex items-center mb-4 border-b pb-2">
                <CreditCard className="w-4 h-4 mr-2" /> Payment Info
              </h3>
              <div className="space-y-3 text-sm">
                {order.payment ? (
                  <>
                    <div>
                      <p className="text-muted-foreground">Method</p>
                      <p className="font-medium uppercase">{order.payment.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{order.payment.payment_status}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">Payment not initiated</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
