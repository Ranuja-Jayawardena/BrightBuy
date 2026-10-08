import React from 'react';
import Link from 'next/link';
import { ProductSummary } from '@/types/catalog';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.product_id}`} className="group">
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
        {/* Image Placeholder */}
        <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-slate-50 opacity-50 group-hover:scale-105 transition-transform duration-500" />
          <div className="relative z-10 w-32 h-32 text-slate-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          
          {/* Quick Add Overlay */}
          <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <button className="bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 active:scale-95 transition-transform">
              <ShoppingCart size={20} />
            </button>
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
                ${product.min_price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
