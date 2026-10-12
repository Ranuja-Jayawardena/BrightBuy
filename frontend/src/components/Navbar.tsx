'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ShoppingBag, Menu, X, LayoutDashboard } from 'lucide-react';

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      clearCart();
    }
  }, [isAuthenticated, fetchCart, clearCart]);

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
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

        {/* Right Navigation - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
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

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Welcome, {user?.first_name || user?.email?.split('@')[0]}
                  </span>
                  {user?.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1.5 border-slate-300 dark:border-zinc-700">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        {user?.employee_role ? (staffRoleLabels[user.employee_role] || user.employee_role) : 'Admin'}
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 dark:text-zinc-400">
                    Logout
                  </Button>
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
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
          >
            All Products
          </Link>

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Signed in as {user?.email}
              </div>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {user?.employee_role ? `${staffRoleLabels[user.employee_role] || user.employee_role} Dashboard` : 'Admin Dashboard'}
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200"
                onClick={handleLogout}
              >
                Logout
              </Button>
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

