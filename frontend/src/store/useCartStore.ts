import { create } from 'zustand';
import { apiFetch } from '@/services/api';

export interface CartItem {
  cart_item_id: number;
  variant_id: number;
  variant_sku: string;
  variant_name: string;
  product_name: string;
  primary_image_id?: number;
  price: string | number;
  quantity: number;
  subtotal: string | number;
  stock_quantity: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (variant_id: number, quantity: number) => Promise<void>;
  updateItem: (cart_item_id: number, quantity: number) => Promise<void>;
  removeItem: (cart_item_id: number) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  itemCount: 0,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        const items = data.cart?.items || [];
        set({
          items,
          total: parseFloat(data.cart?.total || 0),
          itemCount: items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0),
          isLoading: false
        });
      } else if (res.status === 404 || res.status === 401) {
        set({ items: [], total: 0, itemCount: 0, isLoading: false });
      } else {
        throw new Error('Failed to fetch cart');
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addItem: async (variant_id: number, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id, quantity })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add item to cart');
      }
      
      // Refresh cart to get full details
      await get().fetchCart();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateItem: async (cart_item_id: number, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/cart/items/${cart_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update quantity');
      }
      
      await get().fetchCart();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  removeItem: async (cart_item_id: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/cart/items/${cart_item_id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to remove item');
      }
      
      await get().fetchCart();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
  
  clearCart: () => {
    set({ items: [], total: 0, itemCount: 0 });
  }
}));
