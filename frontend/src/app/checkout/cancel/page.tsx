'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

function CheckoutCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState('');

  const handleRetryPayment = async () => {
    if (!orderId) return;
    setIsRetrying(true);
    setError('');

    try {
      const res = await apiFetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          payment_method: 'card'
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment retry');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err: any) {
      setError(err.message);
      setIsRetrying(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-8">
          We couldn't process your payment, or the checkout was cancelled. Your order has been saved, but it will not be processed until payment is complete.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full font-semibold" 
            onClick={handleRetryPayment}
            disabled={isRetrying || !orderId}
          >
            {isRetrying ? (
              'Initializing...'
            ) : (
              <>
                <RefreshCcw className="w-5 h-5 mr-2" />
                Retry Payment
              </>
            )}
          </Button>

          <Link href={`/orders/${orderId}`} className="block">
            <Button variant="outline" size="lg" className="w-full">
              View Order Details
            </Button>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  );
}
