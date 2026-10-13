'use client';

import React, { useState, useEffect } from 'react';
import { Category } from '@/types/catalog';
import { ChevronRight, Filter, ChevronDown, ChevronUp, DollarSign, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricePreset {
  label: string;
  min: string;
  max: string;
}

const PRICE_PRESETS: PricePreset[] = [
  { label: 'Under $50', min: '', max: '50' },
  { label: '$50 to $100', min: '50', max: '100' },
  { label: '$100 to $250', min: '100', max: '250' },
  { label: '$250 & above', min: '250', max: '' },
];

export interface ProductFilterSidebarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  minPrice: string;
  maxPrice: string;
  onPriceChange: (min: string | null, max: string | null) => void;
}

export function ProductFilterSidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  minPrice,
  maxPrice,
  onPriceChange,
}: ProductFilterSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Keep local inputs in sync when props change (e.g. from URL or pill dismissal)
  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
    setValidationError(null);
  }, [minPrice, maxPrice]);

  const validateRange = (minVal: string, maxVal: string): boolean => {
    const minNum = minVal ? parseFloat(minVal) : null;
    const maxNum = maxVal ? parseFloat(maxVal) : null;

    if (minNum !== null && (isNaN(minNum) || minNum < 0)) {
      setValidationError('Min price must be a non-negative number');
      return false;
    }
    if (maxNum !== null && (isNaN(maxNum) || maxNum < 0)) {
      setValidationError('Max price must be a non-negative number');
      return false;
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setValidationError('Min price cannot be greater than max price');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleApplyCustomPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedMin = localMin.trim();
    const trimmedMax = localMax.trim();

    if (!validateRange(trimmedMin, trimmedMax)) {
      return;
    }

    onPriceChange(trimmedMin || null, trimmedMax || null);
  };

  const handlePresetClick = (preset: PricePreset) => {
    const isCurrentPresetActive =
      (preset.min === '' ? minPrice === '' : minPrice === preset.min) &&
      (preset.max === '' ? maxPrice === '' : maxPrice === preset.max);

    if (isCurrentPresetActive) {
      // Toggle off preset
      onPriceChange(null, null);
    } else {
      setLocalMin(preset.min);
      setLocalMax(preset.max);
      setValidationError(null);
      onPriceChange(preset.min || null, preset.max || null);
    }
  };

  const handleResetPrice = () => {
    setLocalMin('');
    setLocalMax('');
    setValidationError(null);
    onPriceChange(null, null);
  };

  const isPriceFiltered = Boolean(minPrice || maxPrice);

  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm sticky top-24 transition-all space-y-6">
        
        {/* Mobile Header Toggle */}
        <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Filters</h2>
          </div>
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg"
          >
            {mobileExpanded ? 'Hide Filters' : 'Show Filters'}
            {mobileExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible content wrapper for mobile, open on lg */}
        <div className={`space-y-6 ${mobileExpanded ? 'block' : 'hidden lg:block'}`}>
          
          {/* CATEGORIES SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-blue-600 hidden lg:block" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Categories</h3>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory(null);
                  setMobileExpanded(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedCategoryId === null 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Products
              </button>

              {categories.map((category) => (
                <div key={category.category_id} className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(category.category_id);
                      setMobileExpanded(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center justify-between transition-colors ${
                      selectedCategoryId === category.category_id
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>{category.category_name}</span>
                    <span className="text-xs text-slate-400 font-normal">All</span>
                  </button>
                  
                  {category.children && category.children.length > 0 && (
                    <div className="mt-1 space-y-1 pl-3 border-l-2 border-slate-100 ml-4">
                      {category.children.map(child => (
                        <button
                          key={child.category_id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(child.category_id);
                            setMobileExpanded(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                            selectedCategoryId === child.category_id 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <span>{child.category_name}</span>
                          <ChevronRight 
                            size={14} 
                            className={`opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 ${
                              selectedCategoryId === child.category_id ? 'opacity-100 translate-x-0 text-blue-600' : ''
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* DIVIDER */}
          <div className="border-t border-slate-100 pt-5">
            
            {/* PRICE RANGE SECTION */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Price Range</h3>
              </div>
              {isPriceFiltered && (
                <button
                  type="button"
                  onClick={handleResetPrice}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  title="Reset price filter"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-1 gap-1.5 mb-4">
              {PRICE_PRESETS.map((preset) => {
                const isActive =
                  (preset.min === '' ? minPrice === '' : minPrice === preset.min) &&
                  (preset.max === '' ? maxPrice === '' : maxPrice === preset.max);

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isActive && <Check size={13} className="text-blue-600" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Min / Max Inputs */}
            <form onSubmit={handleApplyCustomPrice} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 pointer-events-none font-medium">
                    $
                  </span>
                  <input
                    id="min-price-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Min"
                    value={localMin}
                    onChange={(e) => {
                      setLocalMin(e.target.value);
                      validateRange(e.target.value, localMax);
                    }}
                    className="w-full pl-6 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                    aria-label="Minimum price"
                  />
                </div>
                <span className="text-slate-400 text-xs font-medium">to</span>
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 pointer-events-none font-medium">
                    $
                  </span>
                  <input
                    id="max-price-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Max"
                    value={localMax}
                    onChange={(e) => {
                      setLocalMax(e.target.value);
                      validateRange(localMin, e.target.value);
                    }}
                    className="w-full pl-6 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              {validationError && (
                <p className="text-[11px] text-red-600 font-medium px-1" role="alert">
                  {validationError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-8 font-semibold shadow-xs"
                >
                  Apply
                </Button>
                {isPriceFiltered && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetPrice}
                    className="text-xs h-8 px-2.5 text-slate-600 hover:text-slate-900 border-slate-200"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
