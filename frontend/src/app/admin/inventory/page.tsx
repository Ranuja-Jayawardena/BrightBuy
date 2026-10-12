'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  X,
  AlertCircle,
  ArrowUpDown,
  History
} from 'lucide-react';

interface InventoryItem {
  variant_id: number;
  variant_sku: string;
  product_name: string;
  variant_name: string;
  stock_quantity: number;
  price: number;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [threshold, setThreshold] = useState(10);

  // Manual Adjust Modal state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (lowStockOnly) params.set('low_stock', 'true');
      params.set('threshold', String(threshold));
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch(`/api/admin/inventory?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to fetch inventory');
      }

      const data = await res.json();
      setItems(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly, threshold, search]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Quick stats
  const totalVariants = items.length;
  const outOfStockCount = items.filter((i) => i.stock_quantity === 0).length;
  const lowStockCount = items.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= threshold).length;
  const healthyCount = items.filter((i) => i.stock_quantity > threshold).length;

  const openAdjustModal = (item: InventoryItem) => {
    setAdjustingItem(item);
    setNewQuantity(item.stock_quantity);
    setAdjustReason('');
    setModalError('');
  };

  const closeAdjustModal = () => {
    setAdjustingItem(null);
    setNewQuantity('');
    setAdjustReason('');
    setModalError('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    if (newQuantity === '' || Number(newQuantity) < 0 || !Number.isInteger(Number(newQuantity))) {
      setModalError('Stock quantity must be a non-negative whole integer.');
      return;
    }

    if (!adjustReason.trim()) {
      setModalError('Please specify an adjustment reason for audit logging.');
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      setModalError('');
      setSuccess('');

      const res = await apiFetch(`/api/admin/inventory/${adjustingItem.variant_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_quantity: Number(newQuantity),
          reason: adjustReason.trim()
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update stock quantity');
      }

      setSuccess(
        `Successfully adjusted SKU ${adjustingItem.variant_sku} from ${adjustingItem.stock_quantity} to ${newQuantity} units.`
      );
      closeAdjustModal();
      fetchInventory();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const quickReasonPresets = [
    'Restock shipment received from supplier',
    'Inventory cycle count reconciliation',
    'Damaged / defective stock written off',
    'Customer returned good stock',
    'Stock allocated for showroom demo'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Real-time stock level monitoring, threshold alerts, and audited inventory adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInventory} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center justify-between border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSuccess('')} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Monitored Items</span>
            <Archive className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalVariants}</p>
          <span className="text-xs text-muted-foreground">Active variant lines</span>
        </div>

        <div className="border rounded-lg p-4 bg-card shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">{lowStockCount}</p>
          <span className="text-xs text-muted-foreground">&le; {threshold} units threshold</span>
        </div>

        <div className="border rounded-lg p-4 bg-card shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Out of Stock</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">{outOfStockCount}</p>
          <span className="text-xs text-muted-foreground">Requires immediate restocking</span>
        </div>

        <div className="border rounded-lg p-4 bg-card shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">{healthyCount}</p>
          <span className="text-xs text-muted-foreground">&gt; {threshold} units in warehouse</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by SKU, product name, or variant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          {/* Low Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Show Low Stock Only</span>
          </label>

          {/* Threshold Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Warning Threshold:</span>
            <Input
              type="number"
              min={0}
              max={1000}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 text-sm h-9"
            />
          </div>

          {(search || lowStockOnly || threshold !== 10) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setLowStockOnly(false);
                setThreshold(10);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Stock Table */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">SKU</th>
                <th className="p-4 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">Variant Name</th>
                <th className="p-4 font-semibold text-right">Price</th>
                <th className="p-4 font-semibold text-center">Stock Level</th>
                <th className="p-4 font-semibold">Stock Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <p className="font-medium text-foreground">No inventory items found</p>
                    <p className="text-xs mt-1">Try relaxing search terms or lowering the threshold.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isOutOfStock = item.stock_quantity === 0;
                  const isLowStock = !isOutOfStock && item.stock_quantity <= threshold;

                  return (
                    <tr
                      key={item.variant_id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isOutOfStock
                          ? 'bg-red-50/40 dark:bg-red-950/20'
                          : isLowStock
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="p-4 font-mono font-medium text-primary text-xs">
                        {item.variant_sku}
                      </td>
                      <td className="p-4 font-medium">
                        {item.product_name}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {item.variant_name}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        ${Number(item.price).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-bold font-mono text-base px-2.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300'
                              : isLowStock
                              ? 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
                              : 'text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-300'
                          }`}
                        >
                          {item.stock_quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustModal(item)}
                          className="gap-1.5 hover:bg-primary hover:text-primary-foreground"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Adjust Stock</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjust Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="bg-card border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between bg-muted/20">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Adjust Stock Quantity</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  SKU: {adjustingItem.variant_sku}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeAdjustModal} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdjustSubmit}>
              <div className="p-6 space-y-5">
                {modalError && (
                  <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Variant Context */}
                <div className="p-3 bg-muted/30 rounded-lg text-sm border space-y-1">
                  <p className="font-semibold">{adjustingItem.product_name}</p>
                  <p className="text-muted-foreground text-xs">
                    Variant: <span className="font-medium text-foreground">{adjustingItem.variant_name}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Current warehouse stock:{' '}
                    <span className="font-bold text-foreground">{adjustingItem.stock_quantity} units</span>
                  </p>
                </div>

                {/* New Quantity Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Stock Quantity</label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={newQuantity}
                    onChange={(e) =>
                      setNewQuantity(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="text-base font-mono font-bold"
                  />

                  {/* Quick delta buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">Quick presets:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setNewQuantity(0)}
                    >
                      Set 0
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setNewQuantity((Number(newQuantity) || 0) + 5)}
                    >
                      +5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setNewQuantity((Number(newQuantity) || 0) + 10)}
                    >
                      +10
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setNewQuantity((Number(newQuantity) || 0) + 50)}
                    >
                      +50
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setNewQuantity((Number(newQuantity) || 0) + 100)}
                    >
                      +100
                    </Button>
                  </div>
                </div>

                {/* Adjustment Reason */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Adjustment (Required)</label>
                  <Input
                    placeholder="e.g. Restock shipment from supplier"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="text-sm"
                  />

                  {/* Quick Presets */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs text-muted-foreground">Select a standard reason:</p>
                    <div className="flex flex-wrap gap-1">
                      {quickReasonPresets.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAdjustReason(r)}
                          className="text-[11px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-1 rounded border transition-colors text-left"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeAdjustModal} disabled={isSubmittingAdjust}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingAdjust}>
                  {isSubmittingAdjust ? 'Saving...' : 'Save Stock Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
