'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { sanitizeConflictError } from '@/lib/errorUtils';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Plus, 
  Minus, 
  AlertCircle, 
  ShoppingBag, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Truck, 
  X,
  Sparkles
} from 'lucide-react';

export default function CartPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'admin') {
      const timer = setTimeout(() => {
        router.replace('/admin');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  if (user?.role === 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Staff Account Restricted</h2>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          Employees and administrators cannot maintain shopping carts or make store purchases. Redirecting you to the admin management dashboard...
        </p>
        <Link href="/admin">
          <Button className="gap-2">
            Go to Admin Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review your selected items and proceed to secure checkout.
            </p>
          </div>
        </div>
        <CartContent />
      </div>
    </ProtectedRoute>
  );
}

function CartContent() {
  const { items, total, isLoading, updateItem, removeItem } = useCartStore();
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  
  if (isLoading && items.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-muted/50 rounded-full mb-4 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading your cart items...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs animate-in zoom-in-95 duration-200">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2 tracking-tight">Your shopping cart is empty</h2>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Looks like you haven&apos;t added any items yet. Explore our curated collections and discover great deals.
        </p>
        <Link href="/">
          <Button size="lg" className="gap-2 shadow-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  const handleUpdateQuantity = async (cartItemId: number, newQty: number, maxStock: number) => {
    if (newQty < 1 || newQty > maxStock) return;
    setCartError(null);
    setUpdatingItemId(cartItemId);
    try {
      await updateItem(cartItemId, newQty);
    } catch (err: any) {
      // Refetch authoritative cart state to clear stale or rolled back numbers
      await useCartStore.getState().fetchCart();
      setCartError(sanitizeConflictError(err, 'Unable to update item quantity.'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (cartItemId: number) => {
    setCartError(null);
    setRemovingId(cartItemId);
    try {
      await removeItem(cartItemId);
    } catch (err: any) {
      await useCartStore.getState().fetchCart();
      setCartError(sanitizeConflictError(err, 'Unable to remove item from cart.'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inline Feedback Banner */}
      {cartError && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-lg flex items-center justify-between border border-red-200 dark:border-red-900 transition-all">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{cartError}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCartError(null)} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="border rounded-xl bg-card overflow-hidden shadow-xs divide-y">
            {items.map((item: import('@/store/useCartStore').CartItem) => {
              const isItemUpdating = updatingItemId === item.cart_item_id;
              const isItemRemoving = removingId === item.cart_item_id;

              return (
                <div 
                  key={item.cart_item_id} 
                  className={`p-4 sm:p-6 transition-all duration-300 flex flex-col sm:flex-row gap-4 sm:gap-6 ${
                    isItemRemoving ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted/30 flex items-center justify-center relative">
                    {(item.primary_image_url || item.primary_image_id) ? (
                      <img
                        key={item.primary_image_url || item.primary_image_id || item.variant_id}
                        src={item.primary_image_url || `/api/images/${item.primary_image_id}`}
                        alt={item.product_name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder-product.svg';
                        }}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                    )}
                    {isItemUpdating && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-base sm:text-lg text-foreground line-clamp-1">
                          {item.product_name}
                        </h3>
                        <p className="font-bold text-base sm:text-lg text-primary whitespace-nowrap">
                          ${(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                          {item.variant_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${Number(item.price).toFixed(2)} each
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Remove Controls */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg border border-input bg-background shadow-xs">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="p-1.5 sm:px-2.5 sm:py-1.5 text-muted-foreground hover:bg-muted rounded-l-lg disabled:opacity-40 transition-colors"
                            onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity - 1, item.stock_quantity)}
                            disabled={item.quantity <= 1 || isItemUpdating || isLoading}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 sm:w-10 text-center font-semibold text-xs sm:text-sm">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            className="p-1.5 sm:px-2.5 sm:py-1.5 text-muted-foreground hover:bg-muted rounded-r-lg disabled:opacity-40 transition-colors"
                            onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity + 1, item.stock_quantity)}
                            disabled={item.quantity >= item.stock_quantity || isItemUpdating || isLoading}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {item.quantity >= item.stock_quantity && (
                          <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="mr-1 h-3.5 w-3.5" /> Max stock
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        onClick={() => handleRemove(item.cart_item_id)}
                        disabled={isItemRemoving || isLoading}
                      >
                        {isItemRemoving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <Link href="/" className="hover:text-primary transition-colors inline-flex items-center gap-1">
              &larr; Continue browsing catalog
            </Link>
            <span>Prices include applicable sales taxes</span>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
            <h2 className="text-lg font-bold tracking-tight border-b pb-3">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal ({items.reduce((acc: number, i: import('@/store/useCartStore').CartItem) => acc + i.quantity, 0)})</span>
                <span className="font-medium text-foreground">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Shipping</span>
                <span className="font-medium text-green-600 dark:text-green-400">Calculated next</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold">Total</span>
                <span className="text-2xl font-extrabold text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <Link href="/checkout" className="block pt-2">
              <Button size="lg" className="w-full font-bold shadow-sm gap-2">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <div className="pt-3 border-t space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Encrypted & secure checkout flow</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span>Fast island-wide delivery options</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
