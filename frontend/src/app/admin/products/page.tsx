'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Search, 
  AlertCircle, 
  Package, 
  RefreshCw, 
  CheckCircle2,
  X
} from 'lucide-react';

interface ProductItem {
  product_id: number;
  product_name: string;
  brand: string | null;
  base_sku: string;
  is_active: boolean;
  categories?: string[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchProducts = async (searchTerm = '') => {
    try {
      setLoading(true);
      setError('');
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await apiFetch(`/api/admin/products${query}`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(search);
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTogglingId(id);
    setError('');
    setSuccess('');

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.product_id === id ? { ...p, is_active: nextStatus } : p))
    );

    try {
      const res = await apiFetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update product status');
      }
      setSuccess(`Product status changed to ${nextStatus ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.product_id === id ? { ...p, is_active: currentStatus } : p))
      );
      const message = err instanceof Error ? err.message : 'Failed to update product status';
      setError(message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your store catalog, configure stock variants, and curate media galleries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchProducts(search)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/products/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center justify-between border border-green-200">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSuccess('')} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setError('')} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Search Toolbar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, brand, SKU..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" className="px-4">
          Search
        </Button>
        {search && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearch(''); fetchProducts(''); }}
            className="text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </form>

      {/* Products Table with Overflow Container */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">SKU</th>
                <th className="p-4 font-semibold">Brand</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-40 bg-muted rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-20 bg-muted/70 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-24 bg-muted/70 rounded"></div></td>
                    <td className="p-4"><div className="h-5 w-16 bg-muted rounded-full"></div></td>
                    <td className="p-4 text-right"><div className="h-8 w-16 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Package className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-base text-foreground">No products found</h3>
                      <p className="text-xs text-muted-foreground">
                        {search 
                          ? 'No products matched your search query. Try resetting filters.'
                          : 'You haven\'t created any products yet. Click "Add Product" to get started.'}
                      </p>
                      {!search && (
                        <Link href="/admin/products/new" className="inline-block pt-1">
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-1.5" /> Create First Product
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">
                      <Link href={`/admin/products/${p.product_id}`} className="hover:text-primary transition-colors">
                        {p.product_name}
                      </Link>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{p.base_sku}</td>
                    <td className="p-4 text-muted-foreground">{p.brand || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={p.is_active}
                          disabled={togglingId === p.product_id}
                          onCheckedChange={() => handleToggleStatus(p.product_id, p.is_active)}
                          aria-label={`Toggle active status for ${p.product_name}`}
                        />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' 
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <Link href={`/admin/products/${p.product_id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2.5" title="Edit product">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
