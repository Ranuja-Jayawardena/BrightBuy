'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { catalogService } from '@/services/catalogService';
import { Category, ProductSummary, PaginationMeta } from '@/types/catalog';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { SearchFilterBar } from '@/components/catalog/SearchFilterBar';
import { Pagination } from '@/components/catalog/Pagination';

import { AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive state from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!, 10) : null;
  const brand = searchParams.get('brand') || 'All';
  const sort = searchParams.get('sort') || '';

  // Dynamic SEO Title update
  useEffect(() => {
    let title = 'Explore Products | BrightBuy';
    if (search) {
      title = `Search: "${search}" | BrightBuy`;
    } else if (brand !== 'All') {
      title = `${brand} Products | BrightBuy`;
    } else if (categoryId && categories.length > 0) {
      const activeCat = categories.flatMap(c => [c, ...(c.children || [])]).find(c => c.category_id === categoryId);
      if (activeCat) title = `${activeCat.category_name} | BrightBuy`;
    }
    document.title = title;
  }, [search, brand, categoryId, categories]);

  // Hardcoded brands for filter
  const BRANDS = ["Samsung", "Apple", "Sony", "Nike", "Adidas", "LG"];

  const updateUrlParams = useCallback((key: string, value: string | null) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value === null || value === '' || value === 'All') {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    // Reset to page 1 if we change a filter
    if (key !== 'page') {
      current.set('page', '1');
    }
    
    const queryString = current.toString();
    const query = queryString ? `?${queryString}` : '';
    router.push(`${pathname}${query}`);
  }, [searchParams, router, pathname]);

  const loadData = useCallback(async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError(null);

      // Load categories only once
      if (categories.length === 0) {
        const catRes = await catalogService.getCategories();
        if (isMounted) setCategories(catRes.categories);
      }

      const prodRes = await catalogService.getProducts({
        page,
        search,
        category_id: categoryId || undefined,
        brand: brand !== 'All' ? brand : undefined,
        sort
      });

      if (isMounted) {
        setProducts(prodRes.products);
        setPagination(prodRes.pagination);
      }
    } catch (err: any) {
      console.error("Failed to load catalog", err);
      if (isMounted) {
        setError(err.message || 'Unable to load products. Please check your network connection.');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [page, search, categoryId, brand, sort, categories.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasActiveFilters = Boolean(search || (brand && brand !== 'All') || categoryId);
  const activeCategory = categoryId 
    ? categories.flatMap(c => [c, ...(c.children || [])]).find(c => c.category_id === categoryId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="bg-slate-900 py-14 sm:py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Curated Marketplace
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Discover Exceptional Products
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Browse our verified selection of premium goods with transparent pricing and fast shipping.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <CategorySidebar 
            categories={categories} 
            selectedCategoryId={categoryId} 
            onSelectCategory={(id) => updateUrlParams('category_id', id ? id.toString() : null)} 
          />

          <div className="flex-1">
            <SearchFilterBar 
              searchQuery={search}
              onSearchChange={(q) => updateUrlParams('search', q)}
              brandFilter={brand}
              onBrandChange={(b) => updateUrlParams('brand', b)}
              sortBy={sort}
              onSortChange={(s) => updateUrlParams('sort', s)}
              brands={BRANDS}
            />

            {/* Active Filters Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
                <span className="font-semibold text-slate-600">Active filters:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    Search: &quot;{search}&quot;
                    <button onClick={() => updateUrlParams('search', null)} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {brand !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    Brand: {brand}
                    <button onClick={() => updateUrlParams('brand', null)} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeCategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    Category: {activeCategory.category_name}
                    <button onClick={() => updateUrlParams('category_id', null)} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => router.push('/products')}
                  className="ml-auto text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Content states: Error, Loading, Products Grid, or Empty */}
            {error ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-red-100 shadow-sm">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Products</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">{error}</p>
                <Button onClick={loadData} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
                    <div className="aspect-square bg-slate-200/80 w-full" />
                    <div className="p-5 flex flex-col flex-grow space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-16 bg-slate-200 rounded-full" />
                        <div className="h-4 w-12 bg-slate-200 rounded-full" />
                      </div>
                      <div className="h-5 w-4/5 bg-slate-200 rounded-md" />
                      <div className="h-4 w-2/3 bg-slate-100 rounded-md" />
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="h-6 w-20 bg-slate-200 rounded-md" />
                        <div className="h-8 w-8 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-sm text-slate-500 font-medium">
                    Showing {products.length} {products.length === 1 ? 'product' : 'products'}
                    {pagination?.total_count ? ` of ${pagination.total_count}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map(product => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
                {pagination && (
                  <Pagination 
                    meta={pagination} 
                    onPageChange={(p) => updateUrlParams('page', p.toString())} 
                  />
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm mb-6">
                  We couldn&apos;t find any items matching your current filters or search query.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => router.push('/products')}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}


export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
