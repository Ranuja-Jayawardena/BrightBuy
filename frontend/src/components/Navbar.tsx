'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { itemCount, fetchCart, clearCart } = useCartStore();

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
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="border-b bg-white dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">
            BrightBuy
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    Welcome, {user?.first_name || user?.email}
                  </span>
                  {user?.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm">Admin</Button>
                    </Link>
                  )}
                  <Link href="/cart">
                    <Button variant="ghost" size="sm" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {itemCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
