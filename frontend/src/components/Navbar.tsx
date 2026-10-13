'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { SearchAutocomplete } from '@/components/catalog/SearchAutocomplete';
import {
  ShoppingCart,
  ShoppingBag,
  Menu,
  X,
  LayoutDashboard,
  User,
  Package,
  MapPin,
  LogOut,
  ChevronDown
} from 'lucide-react';

const staffRoleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  inventory_manager: 'Inventory Manager',
  order_dispatcher: 'Order Dispatcher',
  catalog_manager: 'Catalog Manager',
  analyst: 'Business Analyst',
};

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { itemCount, fetchCart, clearCart } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      fetchCart();
    } else {
      clearCart();
    }
  }, [isAuthenticated, user?.role, fetchCart, clearCart]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
      setAccountDropdownOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Bright<span className="text-blue-600">Buy</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link
              href="/products"
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-white rounded-lg hover:bg-slate-100/70 dark:hover:bg-zinc-800 transition-colors"
            >
              Products
            </Link>
          </div>
        </div>

        {/* Global Search Bar with Autocomplete - Desktop */}
        <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-4 lg:mx-8">
          <SearchAutocomplete variant="navbar" placeholder="Search products, brands..." />
        </div>

        {/* Right Navigation - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {user?.role !== 'admin' && (
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative hover:bg-slate-100 dark:hover:bg-zinc-800">
                <ShoppingCart className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  {user?.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1.5 border-slate-300 dark:border-zinc-700 font-medium">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        {user?.employee_role ? (staffRoleLabels[user.employee_role] || user.employee_role) : 'Admin'}
                      </Button>
                    </Link>
                  )}

                  {/* Customer / User Account Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                      className="flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900 py-1 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
                      aria-label="User account menu"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white uppercase shadow-xs">
                        {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                      </div>
                      <span className="max-w-[120px] truncate text-xs font-semibold">
                        {user?.first_name || user?.email?.split('@')[0]}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {accountDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'My Account'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                            {user?.email}
                          </p>
                        </div>

                        <div className="py-1 space-y-0.5">
                          <Link
                            href="/profile"
                            onClick={() => setAccountDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Profile Settings
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setAccountDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Package className="h-4 w-4 text-slate-500" />
                            My Orders
                          </Link>
                          <Link
                            href="/addresses"
                            onClick={() => setAccountDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <MapPin className="h-4 w-4 text-slate-500" />
                            My Addresses
                          </Link>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 text-red-500" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="font-medium">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Actions & Toggle */}
        <div className="flex md:hidden items-center space-x-2">
          {user?.role !== 'admin' && (
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative p-2">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 text-slate-700 dark:text-zinc-300"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-3 pb-6 space-y-3">
          <div className="pb-1">
            <SearchAutocomplete
              variant="navbar"
              placeholder="Search products..."
              onSelectSuggestion={() => setMobileMenuOpen(false)}
              onSearchSubmit={() => setMobileMenuOpen(false)}
            />
          </div>
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
          >
            All Products
          </Link>

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Signed in as {user?.email}
              </div>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
                >
                  <LayoutDashboard className="h-4 w-4 text-blue-600" />
                  {user?.employee_role ? `${staffRoleLabels[user.employee_role] || user.employee_role} Dashboard` : 'Admin Dashboard'}
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                <User className="h-4 w-4 text-blue-600" />
                Profile Settings
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                <Package className="h-4 w-4 text-slate-500" />
                My Orders
              </Link>
              <Link
                href="/addresses"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                <MapPin className="h-4 w-4 text-slate-500" />
                My Addresses
              </Link>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Login
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

