import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  brandFilter: string;
  onBrandChange: (brand: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  brands: string[];
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  brandFilter,
  onBrandChange,
  sortBy,
  onSortChange,
  brands
}: SearchFilterBarProps) {
  // Local state for debouncing
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
      
      {/* Search Bar */}
      <div className="relative w-full md:max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search for products..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 transition-all outline-none"
        />
      </div>

      <div className="flex w-full md:w-auto items-center gap-3">
        {/* Brand Filter */}
        <div className="relative flex-1 md:flex-none">
          <select
            value={brandFilter}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full md:w-40 appearance-none bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-700 transition-all outline-none font-medium cursor-pointer"
          >
            <option value="All">All Brands</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500">
            <ChevronDown size={16} />
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex-1 md:flex-none">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full md:w-48 appearance-none bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-700 transition-all outline-none font-medium cursor-pointer"
          >
            <option value="">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            <SlidersHorizontal size={16} />
          </div>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
