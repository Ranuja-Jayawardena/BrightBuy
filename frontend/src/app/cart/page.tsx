'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function CartPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
        <CartContent />
      </div>
    </ProtectedRoute>
  );
}

function CartContent() {
  const { items, total, isLoading, updateItem, removeItem } = useCartStore();
  const [removingId, setRemovingId] = useState<number | null>(null);
  
  if (isLoading && items.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">Loading cart...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
        <Link href="/">
          <Button size="lg">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const handleUpdateQuantity = async (cartItemId: number, newQty: number, maxStock: number) => {
    if (newQty < 1 || newQty > maxStock) return;
    try {
      await updateItem(cartItemId, newQty);
    } catch (err: any) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleRemove = async (cartItemId: number) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    setRemovingId(cartItemId);
    try {
      await removeItem(cartItemId);
    } catch (err: any) {
      alert(err.message || 'Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.cart_item_id} className="flex gap-6 border-b pb-6">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-gray-100 flex items-center justify-center">
                {item.primary_image_id ? (
                  <img
                    src={`/api/products/images/${item.primary_image_id}`}
                    alt={item.product_name}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="text-xs text-gray-400">No Image</div>
                )}
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex justify-between text-base font-medium">
                  <h3>{item.product_name}</h3>
                  <p className="ml-4">${Number(item.price).toFixed(2)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.variant_name}</p>

                <div className="flex flex-1 items-end justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-input">
                      <button
                        type="button"
                        className="px-3 py-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
                        onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity - 1, item.stock_quantity)}
                        disabled={item.quantity <= 1 || isLoading}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
                        onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity + 1, item.stock_quantity)}
                        disabled={item.quantity >= item.stock_quantity || isLoading}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {item.quantity >= item.stock_quantity && (
                      <span className="flex items-center text-xs text-orange-500">
                        <AlertCircle className="mr-1 h-3 w-3" /> Max stock
                      </span>
                    )}
                  </div>

                  <div className="flex">
                    <button
                      type="button"
                      className="font-medium text-red-500 hover:text-red-400 disabled:opacity-50 flex items-center gap-1"
                      onClick={() => handleRemove(item.cart_item_id)}
                      disabled={removingId === item.cart_item_id || isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Order summary</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-t pt-4">
              <span className="text-base font-medium">Subtotal</span>
              <span className="text-base font-medium">${total.toFixed(2)}</span>
            </div>
            <p className="text-muted-foreground">Shipping and taxes calculated at checkout.</p>
          </div>
          <div className="mt-6">
            <Link href="/checkout">
              <Button size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
