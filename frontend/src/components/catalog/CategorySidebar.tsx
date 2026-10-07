import React from 'react';
import { Category } from '@/types/catalog';
import { ChevronRight } from 'lucide-react';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
}

export function CategorySidebar({ categories, selectedCategoryId, onSelectCategory }: CategorySidebarProps) {
  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Categories</h2>
        
        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategoryId === null 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Products
          </button>
          
          {categories.map((category) => (
            <div key={category.category_id} className="pt-2">
              <div className="px-3 py-2 text-sm font-semibold text-slate-900 flex items-center justify-between">
                {category.category_name}
              </div>
              
              {category.children && category.children.length > 0 && (
                <div className="mt-1 space-y-1 pl-3 border-l-2 border-slate-100 ml-4">
                  {category.children.map(child => (
                    <button
                      key={child.category_id}
                      onClick={() => onSelectCategory(child.category_id)}
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
    </div>
  );
}
