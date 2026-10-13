import React from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { SearchAutocomplete } from './SearchAutocomplete';

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
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
      
      {/* Search Bar with Autocomplete Suggestions */}
      <div className="w-full md:max-w-md">
        <SearchAutocomplete
          value={searchQuery}
          onSearchSubmit={(q: string) => onSearchChange(q)}
          onQueryChange={(q: string) => onSearchChange(q)}
          placeholder="Search products by name or brand..."
          variant="catalog"
        />
      </div>

      <div className="flex w-full md:w-auto items-center gap-3">
        {/* Brand Filter */}
        <div className="relative flex-1 md:flex-none">
          <select
            value={brandFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onBrandChange(e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSortChange(e.target.value)}
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
