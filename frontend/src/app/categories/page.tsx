'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { catalogService } from '@/services/catalogService';
import { Category } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Laptop,
  Smartphone,
  Headphones,
  Watch,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Electronics': Smartphone,
  'Computers & Gaming': Laptop,
  'Audio & Sound': Headphones,
  'Smart Home & Wearables': Watch,
  'Accessories & Storage': HardDrive,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Electronics': 'Next-gen smartphones, ultra-portable tablets, and professional imaging gear.',
  'Computers & Gaming': 'High-performance laptops, desktop hardware, gaming peripherals, and high-refresh monitors.',
  'Audio & Sound': 'Studio-grade headphones, noise-cancelling earbuds, and wireless soundbars.',
  'Smart Home & Wearables': 'Smartwatches, biometric fitness trackers, intelligent lighting, and home automation.',
  'Accessories & Storage': 'High-speed external SSDs, high-output GaN chargers, and premium connectivity hubs.',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catalogService.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories', err);
      setError('Unable to load categories at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/50">
      {/* Header Banner */}
      <div className="border-b border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-zinc-400 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Categories</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 mb-3 border border-blue-100 dark:border-blue-900/50">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Consumer Technology Taxonomy</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Explore Tech Categories
              </h1>
              <p className="mt-2 text-base text-slate-600 dark:text-zinc-400 max-w-2xl">
                Browse our specialized consumer technology catalog across computing, mobile, audio, and connected smart hardware.
              </p>
            </div>

            <Link href="/products">
              <Button variant="outline" className="gap-2">
                View All Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-200/60 dark:bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Failed to Load Categories</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mb-6">{error}</p>
            <Button onClick={fetchCategories} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => {
              const IconComponent = CATEGORY_ICONS[category.category_name] || Cpu;
              const description =
                CATEGORY_DESCRIPTIONS[category.category_name] ||
                `Explore premium ${category.category_name.toLowerCase()} products and accessories.`;

              return (
                <div
                  key={category.category_id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    {/* Top Icon & Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 dark:bg-zinc-800 dark:text-blue-400">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {category.category_name}
                        </h2>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {category.children?.length ? `${category.children.length} Subcategories` : 'Featured Category'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-6">
                      {description}
                    </p>

                    {/* Subcategories Pills */}
                    {category.children && category.children.length > 0 && (
                      <div className="space-y-2 mb-6">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Subcategories</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {category.children.map((child) => (
                            <Link
                              key={child.category_id}
                              href={`/products?category_id=${child.category_id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 transition-all"
                            >
                              <span>{child.category_name}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Call to Action */}
                  <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 mt-auto">
                    <Link
                      href={`/products?category_id=${category.category_id}`}
                      className="inline-flex items-center justify-between w-full text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      <span>Browse All in {category.category_name}</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
