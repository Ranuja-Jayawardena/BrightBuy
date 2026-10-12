declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {
      [key: string]: any;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: any;
      ref?: any;
      [key: string]: any;
    }
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {
    [key: string]: any;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes {
    key?: any;
    ref?: any;
    [key: string]: any;
  }
}

declare namespace React {
  export type ReactNode = any;
  export type Key = string | number | bigint;
  export type FC<P = any> = any;
  export type ComponentProps<T = any> = any;
  export type FormEvent<T = any> = any;
  export type MouseEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
}

declare module 'react' {
  const React: any;
  export default React;
  export namespace React {
    export type ReactNode = any;
    export type Key = string | number | bigint;
    export type FC<P = any> = any;
    export type ComponentProps<T = any> = any;
    export type FormEvent<T = any> = any;
    export type MouseEvent<T = any> = any;
    export type ChangeEvent<T = any> = any;
  }
  export function useState<T = any>(initialState?: T | (() => T)): [T, (value: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T;
  export function useRef<T = any>(initialValue?: T | null): { current: T | null };
  export const Suspense: any;
  export type ReactNode = any;
  export type Key = string | number | bigint;
  export type FC<P = any> = any;
  export type ComponentProps<T = any> = any;
  export type FormEvent<T = any> = any;
  export type MouseEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {
      [key: string]: any;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: any;
      ref?: any;
      [key: string]: any;
    }
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {
      [key: string]: any;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: any;
      ref?: any;
      [key: string]: any;
    }
  }
}

declare module 'react/jsx-dev-runtime' {
  export const jsxDEV: any;
  export const Fragment: any;
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {
      [key: string]: any;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: any;
      ref?: any;
      [key: string]: any;
    }
  }
}

declare module 'next/link' {
  const Link: any;
  export default Link;
}

declare module 'next/navigation' {
  export const useRouter: any;
  export const usePathname: any;
  export const useSearchParams: any;
  export const useParams: any;
}

declare module 'next/image' {
  const Image: any;
  export default Image;
}

declare module 'lucide-react';
declare module 'recharts';
declare module 'zustand';
declare module 'zustand/middleware';
