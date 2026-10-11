declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {
    [key: string]: any;
  }
}

declare namespace React {
  export type ReactNode = any;
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
    export type FC<P = any> = any;
    export type ComponentProps<T = any> = any;
    export type FormEvent<T = any> = any;
    export type MouseEvent<T = any> = any;
    export type ChangeEvent<T = any> = any;
  }
  export const useState: any;
  export const useEffect: any;
  export const useCallback: any;
  export const useMemo: any;
  export const useRef: any;
  export const Suspense: any;
  export type ReactNode = any;
  export type FC<P = any> = any;
  export type ComponentProps<T = any> = any;
  export type FormEvent<T = any> = any;
  export type MouseEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
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

