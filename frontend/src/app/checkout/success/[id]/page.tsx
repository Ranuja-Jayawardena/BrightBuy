'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, Truck, Calendar } from 'lucide-react';
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
    estimated_delivery_days: number;
  };
}

export default function CheckoutSuccessPage() {
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
        <Button className="mt-4" onClick={() => router.push('/')}>Return Home</Button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-green-600">Order Confirmed!</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Thank you for your purchase. Your order #{order.order_id} has been received.
          </p>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-muted p-6 border-b flex flex-wrap gap-6 justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Order Date</p>
              <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Amount</p>
              <p className="font-medium">${Number(order.total_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Status</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {order.status}
              </span>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" /> Items Ordered
            </h3>
            <div className="space-y-4 mb-8">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">{item.variant_name} x {item.quantity}</p>
                  </div>
                  <p className="font-medium">${(Number(item.unit_price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold mb-4 flex items-center border-t pt-6">
              <Truck className="w-5 h-5 mr-2" /> Delivery Information
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Method</p>
                <p className="capitalize font-medium">{order.delivery.delivery_mode.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                <p className="font-medium">{order.delivery.delivery_address_line1}, {order.delivery.city_name}</p>
              </div>
              <div className="sm:col-span-2 flex items-center text-sm bg-blue-50 text-blue-700 p-3 rounded mt-2">
                <Calendar className="w-4 h-4 mr-2 shrink-0" />
                Estimated Delivery: {order.delivery.estimated_delivery_days} business days
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center space-x-4">
          <Link href="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
          <Link href="/orders">
            <Button>View Order History</Button>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
