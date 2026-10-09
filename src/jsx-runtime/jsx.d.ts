import type { Child } from "../dom";
import type { ReadonlySignal } from "../signals";

export type ReactiveProp<T> = T | ReadonlySignal<T> | (() => T);

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => any)
  | ClassValue[]
  | Record<string, any>;

export type ClassProp = ReactiveProp<
  string | number | boolean | undefined | null | ClassValue[] | Record<string, any>
>;

export type HTMLAttributes<T extends HTMLElement = HTMLElement> = {
  [K in keyof HTMLElementTagNameMap[keyof HTMLElementTagNameMap]]?: any;
} & {
  class?: ClassProp;
  className?: ClassProp;
  id?: ReactiveProp<string | undefined | null>;
  title?: ReactiveProp<string | undefined | null>;
  tabIndex?: ReactiveProp<number | undefined | null>;
  role?: ReactiveProp<string | undefined | null>;
  hidden?: ReactiveProp<boolean | undefined | null>;
  disabled?: ReactiveProp<boolean | undefined | null>;
  style?: ReactiveProp<
    string | Record<string, ReactiveProp<string | number | undefined | null>> | undefined | null
  >;
  ref?: (el: T) => void;
  dangerouslySetInnerHTML?: { __html: string };

  // Events
  onClick?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  onInput?: (e: InputEvent & { target: T }) => void;
  onChange?: (e: Event & { target: T }) => void;
  onSubmit?: (e: SubmitEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onScroll?: (e: Event) => void;

  children?: Child;
  [attr: string]: any;
};

export type InputAttributes = HTMLAttributes<HTMLInputElement> & {
  type?: ReactiveProp<string>;
  value?: ReactiveProp<string | number | readonly string[] | undefined | null>;
  checked?: ReactiveProp<boolean | undefined | null>;
  placeholder?: ReactiveProp<string | undefined | null>;
  name?: ReactiveProp<string | undefined | null>;
  disabled?: ReactiveProp<boolean | undefined | null>;
  readOnly?: ReactiveProp<boolean | undefined | null>;
  required?: ReactiveProp<boolean | undefined | null>;
  min?: ReactiveProp<string | number | undefined | null>;
  max?: ReactiveProp<string | number | undefined | null>;
  step?: ReactiveProp<string | number | undefined | null>;
  pattern?: ReactiveProp<string | undefined | null>;
  autoFocus?: ReactiveProp<boolean | undefined | null>;
  autoComplete?: ReactiveProp<string | undefined | null>;
};

export type ButtonAttributes = HTMLAttributes<HTMLButtonElement> & {
  type?: ReactiveProp<"button" | "submit" | "reset" | undefined>;
  disabled?: ReactiveProp<boolean | undefined | null>;
  name?: ReactiveProp<string | undefined | null>;
  value?: ReactiveProp<string | number | undefined | null>;
};

export type AnchorAttributes = HTMLAttributes<HTMLAnchorElement> & {
  href?: ReactiveProp<string | undefined | null>;
  target?: ReactiveProp<"_blank" | "_self" | "_parent" | "_top" | string | undefined | null>;
  rel?: ReactiveProp<string | undefined | null>;
  download?: ReactiveProp<any>;
};

export interface VisageIntrinsicElements {
  // HTML tags
  div: HTMLAttributes<HTMLDivElement>;
  span: HTMLAttributes<HTMLSpanElement>;
  p: HTMLAttributes<HTMLParagraphElement>;
  a: AnchorAttributes;
  button: ButtonAttributes;
  input: InputAttributes;
  textarea: HTMLAttributes<HTMLTextAreaElement> & {
    value?: ReactiveProp<string | number | undefined | null>;
    placeholder?: ReactiveProp<string | undefined | null>;
    rows?: ReactiveProp<number | undefined | null>;
    cols?: ReactiveProp<number | undefined | null>;
  };
  select: HTMLAttributes<HTMLSelectElement> & {
    value?: ReactiveProp<any>;
    multiple?: ReactiveProp<boolean | undefined | null>;
  };
  option: HTMLAttributes<HTMLOptionElement> & {
    value?: ReactiveProp<any>;
    selected?: ReactiveProp<boolean | undefined | null>;
  };
  form: HTMLAttributes<HTMLFormElement> & {
    action?: ReactiveProp<string | undefined | null>;
    method?: ReactiveProp<string | undefined | null>;
  };
  label: HTMLAttributes<HTMLLabelElement> & {
    htmlFor?: ReactiveProp<string | undefined | null>;
    for?: ReactiveProp<string | undefined | null>;
  };
  h1: HTMLAttributes<HTMLHeadingElement>;
  h2: HTMLAttributes<HTMLHeadingElement>;
  h3: HTMLAttributes<HTMLHeadingElement>;
  h4: HTMLAttributes<HTMLHeadingElement>;
  h5: HTMLAttributes<HTMLHeadingElement>;
  h6: HTMLAttributes<HTMLHeadingElement>;
  header: HTMLAttributes<HTMLElement>;
  footer: HTMLAttributes<HTMLElement>;
  main: HTMLAttributes<HTMLElement>;
  nav: HTMLAttributes<HTMLElement>;
  section: HTMLAttributes<HTMLElement>;
  article: HTMLAttributes<HTMLElement>;
  aside: HTMLAttributes<HTMLElement>;
  ul: HTMLAttributes<HTMLUListElement>;
  ol: HTMLAttributes<HTMLOListElement>;
  li: HTMLAttributes<HTMLLIElement>;
  table: HTMLAttributes<HTMLTableElement>;
  thead: HTMLAttributes<HTMLTableSectionElement>;
  tbody: HTMLAttributes<HTMLTableSectionElement>;
  tfoot: HTMLAttributes<HTMLTableSectionElement>;
  tr: HTMLAttributes<HTMLTableRowElement>;
  td: HTMLAttributes<HTMLTableCellElement>;
  th: HTMLAttributes<HTMLTableCellElement>;
  img: HTMLAttributes<HTMLImageElement> & {
    src?: ReactiveProp<string | undefined | null>;
    alt?: ReactiveProp<string | undefined | null>;
    width?: ReactiveProp<number | string | undefined | null>;
    height?: ReactiveProp<number | string | undefined | null>;
    loading?: ReactiveProp<"lazy" | "eager" | undefined | null>;
  };
  iframe: HTMLAttributes<HTMLIFrameElement> & {
    src?: ReactiveProp<string | undefined | null>;
    title?: ReactiveProp<string | undefined | null>;
  };
  canvas: HTMLAttributes<HTMLCanvasElement> & {
    width?: ReactiveProp<number | undefined | null>;
    height?: ReactiveProp<number | undefined | null>;
  };
  code: HTMLAttributes<HTMLElement>;
  pre: HTMLAttributes<HTMLPreElement>;
  blockquote: HTMLAttributes<HTMLQuoteElement>;
  strong: HTMLAttributes<HTMLElement>;
  em: HTMLAttributes<HTMLElement>;
  small: HTMLAttributes<HTMLElement>;
  hr: HTMLAttributes<HTMLHRElement>;
  br: HTMLAttributes<HTMLBRElement>;

  // SVG Tags
  svg: HTMLAttributes<SVGElement> & {
    viewBox?: ReactiveProp<string>;
    xmlns?: ReactiveProp<string>;
    width?: ReactiveProp<number | string>;
    height?: ReactiveProp<number | string>;
    fill?: ReactiveProp<string>;
    stroke?: ReactiveProp<string>;
  };
  path: HTMLAttributes<SVGElement> & {
    d?: ReactiveProp<string>;
    fill?: ReactiveProp<string>;
    stroke?: ReactiveProp<string>;
    strokeWidth?: ReactiveProp<number | string>;
  };
  circle: HTMLAttributes<SVGElement> & {
    cx?: ReactiveProp<number | string>;
    cy?: ReactiveProp<number | string>;
    r?: ReactiveProp<number | string>;
    fill?: ReactiveProp<string>;
  };
  rect: HTMLAttributes<SVGElement> & {
    x?: ReactiveProp<number | string>;
    y?: ReactiveProp<number | string>;
    width?: ReactiveProp<number | string>;
    height?: ReactiveProp<number | string>;
    fill?: ReactiveProp<string>;
  };

  // Catch-all for other tags
  [elemName: string]: HTMLAttributes<HTMLElement>;
}

export namespace JSX {
  export type Element = Node | Child;

  export interface ElementChildrenAttribute {
    children: unknown;
  }

  export interface IntrinsicAttributes {
    key?: any;
    [key: string]: any;
  }

  export interface IntrinsicElements extends VisageIntrinsicElements {}
}

declare global {
  namespace JSX {
    type Element = Node | Child;

    interface ElementChildrenAttribute {
      children: unknown;
    }

    interface IntrinsicAttributes {
      key?: any;
      [key: string]: any;
    }

    interface IntrinsicElements extends VisageIntrinsicElements {}
  }
}
