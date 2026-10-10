import { create } from 'zustand';
import { apiFetch } from '@/services/api';

export interface City {
  city_id: number;
  city_name: string;
  state: string;
  is_main_city: boolean;
}

export interface Address {
  address_id: number;
  address_line1: string;
  address_line2?: string;
  city_id: number;
  city_name: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface AddressState {
  addresses: Address[];
  cities: City[];
  isLoading: boolean;
  error: string | null;
  fetchAddresses: () => Promise<void>;
  fetchCities: () => Promise<void>;
  addAddress: (data: Partial<Address>) => Promise<Address>;
  updateAddress: (id: number, data: Partial<Address>) => Promise<Address>;
  removeAddress: (id: number) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  cities: [],
  isLoading: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        set({ addresses: data.addresses || [], isLoading: false });
      } else {
        throw new Error('Failed to fetch addresses');
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchCities: async () => {
    try {
      const res = await fetch('/api/cities'); // public endpoint
      if (res.ok) {
        const data = await res.json();
        set({ cities: data.cities || [] });
      }
    } catch (err) {
      console.error('Failed to fetch cities', err);
    }
  },

  addAddress: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add address');
      }
      await get().fetchAddresses();
      const resData = await res.json();
      return resData.address;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateAddress: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update address');
      await get().fetchAddresses();
      const resData = await res.json();
      return resData.address;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  removeAddress: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove address');
      await get().fetchAddresses();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  setDefault: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/addresses/${id}/default`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to set default address');
      await get().fetchAddresses();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
