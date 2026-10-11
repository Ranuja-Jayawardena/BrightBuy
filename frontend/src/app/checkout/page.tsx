'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCartStore } from '@/store/useCartStore';
import { useAddressStore } from '@/store/useAddressStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Truck, Store, AlertCircle, CreditCard, Banknote } from 'lucide-react';
import { apiFetch } from '@/services/api';

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
    if (deliveryMode === 'store_pickup') return 2; // Assuming pickup is faster or fixed
    if (!selectedAddress) return null;
    const city = cities.find(c => c.city_id === selectedAddress.city_id);
    return city?.is_main_city ? 5 : 7;
  }, [deliveryMode, selectedAddress, cities]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
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
    return <div className="p-12 text-center text-muted-foreground">Loading checkout...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
        <Button onClick={() => router.push('/')}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column - Forms */}
          <div className="lg:col-span-7 space-y-10">
            {/* Delivery Mode */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Truck className="mr-2 w-5 h-5" /> Delivery Options
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${deliveryMode === 'home_delivery' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  onClick={() => setDeliveryMode('home_delivery')}
                >
                  <div className="flex items-center mb-2">
                    <input type="radio" checked={deliveryMode === 'home_delivery'} readOnly className="mr-3" />
                    <span className="font-medium">Home Delivery</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">Delivered to your address</p>
                </div>
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${deliveryMode === 'store_pickup' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  onClick={() => setDeliveryMode('store_pickup')}
                >
                  <div className="flex items-center mb-2">
                    <input type="radio" checked={deliveryMode === 'store_pickup'} readOnly className="mr-3" />
                    <span className="font-medium">Store Pickup</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">Pick up at nearest store</p>
                </div>
              </div>
            </section>

            {/* Address Selection */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <MapPin className="mr-2 w-5 h-5" /> Shipping Address
                </h2>
                <Button variant="outline" size="sm" onClick={() => router.push('/addresses')}>
                  Manage Addresses
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center bg-muted/50">
                  <p className="mb-4 text-muted-foreground">You don't have any saved addresses.</p>
                  <Button onClick={() => router.push('/addresses')}>Add New Address</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <label 
                      key={addr.address_id}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === addr.address_id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                    >
                      <input 
                        type="radio" 
                        name="address" 
                        className="mt-1 mr-3"
                        checked={selectedAddressId === addr.address_id}
                        onChange={() => setSelectedAddressId(addr.address_id)}
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {addr.address_line1}
                          {addr.is_default && <span className="text-[10px] uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">Default</span>}
                        </div>
                        {addr.address_line2 && <div className="text-sm text-muted-foreground mt-0.5">{addr.address_line2}</div>}
                        <div className="text-sm text-muted-foreground mt-0.5">{addr.city_name}, {addr.state} {addr.zip_code}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Payment Method Selection */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <CreditCard className="mr-2 w-5 h-5" /> Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="flex items-center mb-2">
                    <input type="radio" checked={paymentMethod === 'card'} readOnly className="mr-3" />
                    <CreditCard className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span className="font-medium">Credit / Debit Card</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">Pay securely via Lemon Squeezy</p>
                </div>
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="flex items-center mb-2">
                    <input type="radio" checked={paymentMethod === 'cod'} readOnly className="mr-3" />
                    <Banknote className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span className="font-medium">Cash on Delivery</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">Pay when your order arrives</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border bg-card p-6 shadow-sm sticky top-6">
              <h2 className="text-lg font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.cart_item_id} className="flex justify-between text-sm">
                    <div className="flex-1 pr-4">
                      <p className="font-medium line-clamp-1">{item.product_name}</p>
                      <p className="text-muted-foreground">{item.variant_name} x {item.quantity}</p>
                    </div>
                    <p className="font-medium">${Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-3 border-t">
                  <span>Order Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {estimatedDeliveryDays && (
                <div className="mb-6 p-4 bg-muted rounded-lg flex items-center text-sm">
                  <Truck className="w-4 h-4 mr-2 shrink-0 text-primary" />
                  <span>Estimated delivery: <strong>{estimatedDeliveryDays} business days</strong></span>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full" 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !selectedAddressId}
              >
                {isPlacingOrder ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
