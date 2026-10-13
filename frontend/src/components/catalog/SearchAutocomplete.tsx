'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X, Tag, Package, ArrowRight } from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { ProductSuggestion } from '@/types/catalog';

export interface SearchAutocompleteProps {
  value?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  debounceMs?: number;
  autoNavigateOnSelect?: boolean;
  onSearchSubmit?: (query: string) => void;
  onSelectSuggestion?: (suggestion: ProductSuggestion) => void;
  onQueryChange?: (query: string) => void;
  variant?: 'navbar' | 'catalog';
}

export function SearchAutocomplete({
  value = '',
  placeholder = 'Search products, brands, or categories...',
  className = '',
  inputClassName = '',
  debounceMs = 250,
  autoNavigateOnSelect = true,
  onSearchSubmit,
  onSelectSuggestion,
  onQueryChange,
  variant = 'catalog',
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with controlled value prop if provided
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced fetch suggestions
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await catalogService.getSuggestions(trimmed);
        setSuggestions(res.suggestions || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((suggestion: ProductSuggestion) => {
    setIsOpen(false);
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    if (autoNavigateOnSelect) {
      router.push(`/products/${suggestion.product_id}`);
    }
  }, [onSelectSuggestion, autoNavigateOnSelect, router]);

  const handleSubmitSearch = useCallback((searchQuery: string) => {
    setIsOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(searchQuery);
    } else {
      const q = searchQuery.trim();
      if (q) {
        router.push(`/products?search=${encodeURIComponent(q)}`);
      } else {
        router.push('/products');
      }
    }
  }, [onSearchSubmit, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== 'Enter') {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && query.trim().length >= 2) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = suggestions.length + 1; // suggestions + "See all results"

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 < 0 ? totalItems - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        } else {
          handleSubmitSearch(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onQueryChange) onQueryChange('');
    if (onSearchSubmit) onSearchSubmit('');
    inputRef.current?.focus();
  };

  const isNavbar = variant === 'navbar';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Container */}
      <div className="relative flex items-center group">
        <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-blue-500" />
          ) : (
            <Search size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (onQueryChange) onQueryChange(val);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className={`w-full pl-10 pr-9 transition-all outline-none font-medium ${
            isNavbar
              ? 'py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-100/80 dark:bg-zinc-900 border border-transparent focus:border-blue-500/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-3 focus:ring-blue-500/15 rounded-xl text-slate-800 dark:text-zinc-200'
              : 'py-3 text-sm bg-slate-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-900'
          } ${inputClassName}`}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="Clear search text"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xl shadow-slate-900/10 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80 animate-in fade-in-50 zoom-in-95 duration-150 ${
            isNavbar ? 'min-w-[320px] max-w-lg' : ''
          }`}
        >
          {suggestions.length > 0 ? (
            <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Products &amp; Suggestions
              </div>

              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.product_id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-slate-700 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}
                      >
                        <Package size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-white">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                          {item.brand && (
                            <span className="font-medium text-slate-600 dark:text-zinc-300">
                              {item.brand}
                            </span>
                          )}
                          {item.brand && item.category_name && <span>&bull;</span>}
                          {item.category_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                              <Tag size={10} />
                              {item.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ArrowRight
                      size={14}
                      className={`shrink-0 transition-all ${
                        isSelected
                          ? 'opacity-100 translate-x-0 text-blue-600 dark:text-blue-400'
                          : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ) : !isLoading ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                No matching product suggestions for &quot;<span className="font-semibold text-slate-700 dark:text-zinc-200">{query}</span>&quot;
              </p>
            </div>
          ) : null}

          {/* Quick Search Action */}
          <div className="p-1.5 bg-slate-50/70 dark:bg-zinc-950/60">
            <button
              type="button"
              role="option"
              aria-selected={selectedIndex === suggestions.length}
              onClick={() => handleSubmitSearch(query)}
              onMouseEnter={() => setSelectedIndex(suggestions.length)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                selectedIndex === suggestions.length
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Search size={13} />
                <span className="truncate">
                  See all catalog results for &quot;<span className="underline">{query.trim()}</span>&quot;
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 shrink-0 font-mono">
                Enter ↵
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
