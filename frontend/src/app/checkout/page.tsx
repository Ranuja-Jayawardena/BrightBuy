'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCartStore } from '@/store/useCartStore';
import { useAddressStore } from '@/store/useAddressStore';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Truck, 
  Store, 
  AlertCircle, 
  CreditCard, 
  Banknote, 
  Loader2, 
  ShoppingBag, 
  CheckCircle2, 
  Plus, 
  ShieldCheck,
  X
} from 'lucide-react';
import { apiFetch } from '@/services/api';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, itemCount, isLoading: cartLoading } = useCartStore();
  const { addresses, cities, fetchAddresses, fetchCities, isLoading: addressLoading } = useAddressStore();

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'home_delivery' | 'store_pickup'>('home_delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
    fetchCities();
  }, [fetchAddresses, fetchCities]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.address_id);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = useMemo(() => {
    return addresses.find(a => a.address_id === selectedAddressId);
  }, [addresses, selectedAddressId]);

  const estimatedDeliveryDays = useMemo(() => {
    if (deliveryMode === 'store_pickup') return 2;
    if (!selectedAddress) return null;
    const city = cities.find(c => c.city_id === selectedAddress.city_id);
    return city?.is_main_city ? 5 : 7;
  }, [deliveryMode, selectedAddress, cities]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      setError("Your cart is empty. Please add items before checking out.");
      return;
    }
    if (!selectedAddressId) {
      setError("Please select or add a delivery address to proceed.");
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    try {
      // 1. Create the Order
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: selectedAddressId,
          delivery_mode: deliveryMode
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Order placed successfully!
      useCartStore.getState().clearCart();
      const orderId = data.order.order_id;

      // 2. Create the Payment Session
      const paymentRes = await apiFetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          payment_method: paymentMethod
        })
      });
      
      const paymentData = await paymentRes.json();
      
      if (!paymentRes.ok) {
        throw new Error(paymentData.error || 'Order placed but failed to initialize payment');
      }

      // 3. Handle Redirect based on payment mode
      if (paymentMethod === 'card' && paymentData.checkout_url) {
        window.location.href = paymentData.checkout_url;
      } else {
        router.push(`/checkout/success/${orderId}`);
      }

    } catch (err: any) {
      setError(err.message);
      setIsPlacingOrder(false);
    }
  };

  if (cartLoading || addressLoading) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Preparing checkout session...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (items.length === 0) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You don&apos;t have any items to check out right now.
          </p>
          <Link href="/">
            <Button size="lg" className="font-semibold">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your shipping address and choose your preferred payment method.
          </p>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-xl flex items-center justify-between border border-red-200 dark:border-red-900 transition-all">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setError(null)} className="h-6 w-6">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column - Forms */}
          <div className="lg:col-span-7 space-y-8">
            {/* Delivery Mode */}
            <section className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Delivery Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    deliveryMode === 'home_delivery' 
                      ? 'border-primary ring-1 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50 border-input'
                  }`}
                  onClick={() => setDeliveryMode('home_delivery')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="radio" 
                      name="deliveryMode"
                      checked={deliveryMode === 'home_delivery'} 
                      onChange={() => setDeliveryMode('home_delivery')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="font-semibold text-sm">Home Delivery</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">Shipped straight to your doorstep</p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    deliveryMode === 'store_pickup' 
                      ? 'border-primary ring-1 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50 border-input'
                  }`}
                  onClick={() => setDeliveryMode('store_pickup')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="radio" 
                      name="deliveryMode"
                      checked={deliveryMode === 'store_pickup'} 
                      onChange={() => setDeliveryMode('store_pickup')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="font-semibold text-sm">Store Pickup</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">Collect at nearest retail branch</p>
                </div>
              </div>
            </section>

            {/* Address Selection */}
            <section className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Shipping Address
                </h2>
                <Link href="/addresses">
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Manage Addresses
                  </Button>
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center bg-muted/20 space-y-3">
                  <MapPin className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">No saved addresses</p>
                    <p className="text-xs text-muted-foreground">Add an address to complete your order dispatch.</p>
                  </div>
                  <Link href="/addresses" className="inline-block pt-1">
                    <Button size="sm" className="gap-1.5 text-xs font-semibold">
                      <Plus className="w-3.5 h-3.5" /> Add New Address
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => {
                    const isSelected = selectedAddressId === addr.address_id;
                    return (
                      <label 
                        key={addr.address_id}
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary ring-1 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/40 border-input'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="selectedAddress" 
                          className="mt-1 mr-3 text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.address_id)}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <span>{addr.address_line1}</span>
                            {addr.is_default && (
                              <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {addr.address_line2 && (
                            <div className="text-xs text-muted-foreground mt-0.5">{addr.address_line2}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {addr.city_name}, {addr.state} {addr.zip_code}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Payment Method Selection */}
            <section className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === 'card' 
                      ? 'border-primary ring-1 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50 border-input'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="radio" 
                      name="paymentMethod"
                      checked={paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('card')}
                      className="text-primary focus:ring-primary" 
                    />
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Credit / Debit Card</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">Instant encrypted card processing</p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-primary ring-1 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50 border-input'
                  }`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="radio" 
                      name="paymentMethod"
                      checked={paymentMethod === 'cod'} 
                      onChange={() => setPaymentMethod('cod')}
                      className="text-primary focus:ring-primary" 
                    />
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Cash on Delivery</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">Pay cash upon item delivery</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-xs sticky top-24 space-y-5">
              <h2 className="text-lg font-bold tracking-tight border-b pb-3">Review & Total</h2>
              
              <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1 divide-y divide-muted">
                {items.map(item => (
                  <div key={item.cart_item_id} className="pt-2.5 first:pt-0 flex justify-between text-sm">
                    <div className="flex-1 pr-3">
                      <p className="font-medium text-foreground line-clamp-1">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant_name} &bull; Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground whitespace-nowrap">
                      ${Number(item.subtotal).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-medium text-foreground">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Cost</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Free</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-3 border-t">
                  <span>Grand Total</span>
                  <span className="text-2xl font-extrabold text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              {estimatedDeliveryDays && (
                <div className="p-3 bg-muted/40 rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground border">
                  <Truck className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Estimated fulfillment time: <strong className="text-foreground">{estimatedDeliveryDays} business days</strong>
                  </span>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full font-bold shadow-sm" 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !selectedAddressId}
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  'Place Order Now'
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>30-day return guarantee on all orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
