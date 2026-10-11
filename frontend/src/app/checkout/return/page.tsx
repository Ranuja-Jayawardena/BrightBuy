'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiFetch } from '@/services/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function CheckoutReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<'polling' | 'success' | 'error'>('polling');
  const [errorMsg, setErrorMsg] = useState('');
  const maxAttempts = 20; // 20 attempts * 2s = 40s wait time
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      setErrorMsg('No order ID provided.');
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      try {
        const res = await apiFetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Failed to fetch order status');
        const data = await res.json();
        
        const paymentStatus = data.order?.payment?.payment_status;
        
        if (paymentStatus === 'paid') {
          setStatus('success');
          clearInterval(intervalId);
          // Redirect after a brief success message
          setTimeout(() => {
            router.push(`/checkout/success/${orderId}`);
          }, 1500);
        } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
          clearInterval(intervalId);
          router.push(`/checkout/cancel?order_id=${orderId}`);
        } else {
          // Still pending
          attemptsRef.current += 1;
          if (attemptsRef.current >= maxAttempts) {
            clearInterval(intervalId);
            setStatus('error');
            setErrorMsg('Payment verification timed out. Please check your order history.');
          }
        }
      } catch (err: any) {
        clearInterval(intervalId);
        setStatus('error');
        setErrorMsg(err.message || 'An error occurred while verifying payment.');
      }
    };

    // Initial check
    checkPaymentStatus();

    // Poll every 2 seconds
    intervalId = setInterval(checkPaymentStatus, 2000);

    return () => clearInterval(intervalId);
  }, [orderId, router]);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        {status === 'polling' && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Verifying Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment. Do not close this window.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold tracking-tight text-green-600">Payment Confirmed!</h1>
            <p className="text-muted-foreground">Redirecting to your order receipt...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <span className="text-red-600 text-xl font-bold">!</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-red-600">Verification Error</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              onClick={() => router.push(`/orders/${orderId}`)}
            >
              View Order Details
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
