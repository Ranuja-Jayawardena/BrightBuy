import React, { type MouseEvent } from 'react';
import Link from 'next/link';
import { ProductSummary } from '@/types/catalog';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: ProductSummary;
  key?: React.Key | number | string | null;
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = Number(product.min_price ?? 0);

  return (
    <Link href={`/products/${product.product_id}`} className="group block h-full">
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
        {/* Image / Image Placeholder */}
        <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-6">
          {(product.primary_image_url || product.primary_image_id) ? (
            <img
              key={product.primary_image_url || product.primary_image_id || product.product_id}
              src={product.primary_image_url || `/api/images/${product.primary_image_id}`}
              alt={product.product_name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/placeholder-product.svg';
              }}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-slate-50 opacity-50 group-hover:scale-105 transition-transform duration-500" />
              <div className="relative z-10 w-32 h-32 text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            </>
          )}

          {/* Quick Add / View Overlay (role="button" avoids invalid <button> inside <a> hydration error) */}
          <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <div
              role="button"
              tabIndex={0}
              aria-label="View product details"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
              }}
              className="bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
            >
              <ShoppingCart size={20} />
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {product.brand}
            </span>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {product.variant_count} options
            </span>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
            {product.product_name}
          </h3>

          <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
            <div>
              <span className="text-xs text-slate-500 mb-1 block">Starting at</span>
              <span className="text-xl font-bold text-slate-900">
                ${minPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
