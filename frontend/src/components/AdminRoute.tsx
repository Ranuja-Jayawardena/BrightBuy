'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return <div className="flex min-h-[50vh] items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
