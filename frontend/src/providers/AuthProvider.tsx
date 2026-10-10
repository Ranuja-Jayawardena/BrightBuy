'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetched = useRef(false);

  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      fetchMe();
    }
  }, [fetchMe]);

  return <>{children}</>;
}
