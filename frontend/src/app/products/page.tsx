'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { catalogService } from '@/services/catalogService';
import { Category, ProductSummary, PaginationMeta } from '@/types/catalog';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { SearchFilterBar } from '@/components/catalog/SearchFilterBar';
import { Pagination } from '@/components/catalog/Pagination';

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive state from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!, 10) : null;
  const brand = searchParams.get('brand') || 'All';
  const sort = searchParams.get('sort') || '';

  // Hardcoded brands for filter (in real app, this might come from an API)
  const BRANDS = ["Samsung", "Apple", "Sony", "Nike", "Adidas", "LG"];

  const updateUrlParams = useCallback((key: string, value: string | null) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === null || value === '' || value === 'All') {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    // Reset to page 1 if we change a filter
    if (key !== 'page') {
      current.set('page', '1');
    }
    
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      try {
        setLoading(true);
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
      } catch (error) {
        console.error("Failed to load catalog", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => { isMounted = false; };
  }, [page, search, categoryId, brand, sort]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="bg-slate-900 py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Discover Exceptional Products
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Browse our curated collection of premium goods. Everything you need, all in one place.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-100 shadow-sm" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
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
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500">We couldn't find anything matching your filters. Try adjusting them.</p>
                <button 
                  onClick={() => router.push('/products')}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
                >
                  Clear all filters
                </button>
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
