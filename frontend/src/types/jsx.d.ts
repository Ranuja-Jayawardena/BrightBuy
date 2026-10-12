type CustomBaseSyntheticEvent<T = any> = {
  bubbles: boolean;
  cancelable: boolean;
  currentTarget: T;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  nativeEvent: any;
  preventDefault(): void;
  isDefaultPrevented(): boolean;
  stopPropagation(): void;
  isPropagationStopped(): boolean;
  persist(): void;
  target: T;
  timeStamp: number;
  type: string;
};

type CustomChangeEvent<T = any> = CustomBaseSyntheticEvent<T> & {
  target: T & { value: string; checked?: boolean; files?: any };
};

type CustomFormEvent<T = any> = CustomBaseSyntheticEvent<T>;
type CustomMouseEvent<T = any> = CustomBaseSyntheticEvent<T>;
type CustomFocusEvent<T = any> = CustomBaseSyntheticEvent<T>;
type CustomKeyboardEvent<T = any> = CustomBaseSyntheticEvent<T>;

type CustomEventHandler<E = CustomBaseSyntheticEvent> = (event: E) => void;
type CustomChangeEventHandler<T = any> = (event: CustomChangeEvent<T>) => void;
type CustomFormEventHandler<T = any> = (event: CustomFormEvent<T>) => void;
type CustomMouseEventHandler<T = any> = (event: CustomMouseEvent<T>) => void;
type CustomFocusEventHandler<T = any> = (event: CustomFocusEvent<T>) => void;
type CustomKeyboardEventHandler<T = any> = (event: CustomKeyboardEvent<T>) => void;

interface CustomDOMAttributes<T = any> {
  children?: any;
  dangerouslySetInnerHTML?: any;
  onCopy?: CustomEventHandler;
  onCut?: CustomEventHandler;
  onPaste?: CustomEventHandler;
  onFocus?: CustomFocusEventHandler<T>;
  onBlur?: CustomFocusEventHandler<T>;
  onChange?: CustomChangeEventHandler<T>;
  onInput?: CustomFormEventHandler<T>;
  onSubmit?: CustomFormEventHandler<T>;
  onClick?: CustomMouseEventHandler<T>;
  onKeyDown?: CustomKeyboardEventHandler<T>;
  onKeyPress?: CustomKeyboardEventHandler<T>;
  onKeyUp?: CustomKeyboardEventHandler<T>;
  [key: string]: any;
}

interface CustomHTMLAttributes<T = any> extends CustomDOMAttributes<T> {
  className?: string;
  id?: string;
  style?: any;
  title?: string;
  role?: string;
  tabIndex?: number;
  [key: string]: any;
}

interface IntrinsicElementsMap {
  [elemName: string]: CustomHTMLAttributes<any>;
  input: CustomHTMLAttributes<HTMLInputElement> & {
    value?: any;
    defaultValue?: any;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    checked?: boolean;
    min?: any;
    max?: any;
    step?: any;
    name?: string;
    accept?: string;
    autoComplete?: string;
    readOnly?: boolean;
    onChange?: CustomChangeEventHandler<HTMLInputElement>;
    [key: string]: any;
  };
  select: CustomHTMLAttributes<HTMLSelectElement> & {
    value?: any;
    defaultValue?: any;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    multiple?: boolean;
    onChange?: CustomChangeEventHandler<HTMLSelectElement>;
    [key: string]: any;
  };
  textarea: CustomHTMLAttributes<HTMLTextAreaElement> & {
    value?: any;
    defaultValue?: any;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    name?: string;
    required?: boolean;
    readOnly?: boolean;
    onChange?: CustomChangeEventHandler<HTMLTextAreaElement>;
    [key: string]: any;
  };
  form: CustomHTMLAttributes<HTMLFormElement> & {
    onSubmit?: CustomFormEventHandler<HTMLFormElement>;
    [key: string]: any;
  };
  button: CustomHTMLAttributes<HTMLButtonElement> & {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    onClick?: CustomMouseEventHandler<HTMLButtonElement>;
    [key: string]: any;
  };
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends IntrinsicElementsMap {}
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
  interface IntrinsicElements extends IntrinsicElementsMap {}
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
  export type ComponentProps<T = any> = T extends keyof IntrinsicElementsMap ? IntrinsicElementsMap[T] : any;
  export type SyntheticEvent<T = any> = CustomBaseSyntheticEvent<T>;
  export type ChangeEvent<T = any> = CustomChangeEvent<T>;
  export type FormEvent<T = any> = CustomFormEvent<T>;
  export type MouseEvent<T = any> = CustomMouseEvent<T>;
  export type FocusEvent<T = any> = CustomFocusEvent<T>;
  export type KeyboardEvent<T = any> = CustomKeyboardEvent<T>;
  export type ChangeEventHandler<T = any> = CustomChangeEventHandler<T>;
  export type FormEventHandler<T = any> = CustomFormEventHandler<T>;
  export type MouseEventHandler<T = any> = CustomMouseEventHandler<T>;
}

declare module 'react' {
  const React: any;
  export default React;
  export namespace React {
    export type ReactNode = any;
    export type Key = string | number | bigint;
    export type FC<P = any> = any;
    export type ComponentProps<T = any> = T extends keyof IntrinsicElementsMap ? IntrinsicElementsMap[T] : any;
    export type SyntheticEvent<T = any> = CustomBaseSyntheticEvent<T>;
    export type ChangeEvent<T = any> = CustomChangeEvent<T>;
    export type FormEvent<T = any> = CustomFormEvent<T>;
    export type MouseEvent<T = any> = CustomMouseEvent<T>;
    export type FocusEvent<T = any> = CustomFocusEvent<T>;
    export type KeyboardEvent<T = any> = CustomKeyboardEvent<T>;
    export type ChangeEventHandler<T = any> = CustomChangeEventHandler<T>;
    export type FormEventHandler<T = any> = CustomFormEventHandler<T>;
    export type MouseEventHandler<T = any> = CustomMouseEventHandler<T>;
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
  export type ComponentProps<T = any> = T extends keyof IntrinsicElementsMap ? IntrinsicElementsMap[T] : any;
  export type SyntheticEvent<T = any> = CustomBaseSyntheticEvent<T>;
  export type ChangeEvent<T = any> = CustomChangeEvent<T>;
  export type FormEvent<T = any> = CustomFormEvent<T>;
  export type MouseEvent<T = any> = CustomMouseEvent<T>;
  export type FocusEvent<T = any> = CustomFocusEvent<T>;
  export type KeyboardEvent<T = any> = CustomKeyboardEvent<T>;
  export type ChangeEventHandler<T = any> = CustomChangeEventHandler<T>;
  export type FormEventHandler<T = any> = CustomFormEventHandler<T>;
  export type MouseEventHandler<T = any> = CustomMouseEventHandler<T>;
  export namespace JSX {
    interface IntrinsicElements extends IntrinsicElementsMap {}
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
    interface IntrinsicElements extends IntrinsicElementsMap {}
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
    interface IntrinsicElements extends IntrinsicElementsMap {}
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
