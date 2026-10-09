/** @jsxImportSource visage */
import { Show } from "../dom/control-flow";
import type { Child } from "../dom/render";
import { createContext, useContext } from "../signals/context";
import { createControllableSignal, createId } from "./utils";

export interface AccordionContextValue {
  isExpanded: (value: string) => boolean;
  toggleItem: (value: string) => void;
  type: "single" | "multiple";
  collapsible: boolean;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

export function useAccordionContext(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error("Accordion compound components must be rendered within an <Accordion />");
  }
  return ctx;
}

export interface AccordionSingleProps {
  type: "single";
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export interface AccordionMultipleProps {
  type: "multiple";
  value?: () => string[] | undefined;
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export function Accordion(props: AccordionProps): Child {
  const isSingle = props.type === "single";
  const collapsible = (props as AccordionSingleProps).collapsible ?? !isSingle;

  const [singleValue, setSingleValue] = createControllableSignal<string>({
    value: isSingle ? (props as AccordionSingleProps).value : undefined,
    defaultValue: isSingle ? ((props as AccordionSingleProps).defaultValue ?? "") : "",
    onChange: isSingle ? (props as AccordionSingleProps).onValueChange : undefined
  });

  const [multiValue, setMultiValue] = createControllableSignal<string[]>({
    value: !isSingle ? (props as AccordionMultipleProps).value : undefined,
    defaultValue: !isSingle ? ((props as AccordionMultipleProps).defaultValue ?? []) : [],
    onChange: !isSingle ? (props as AccordionMultipleProps).onValueChange : undefined
  });

  const isExpanded = (val: string): boolean => {
    if (isSingle) {
      return singleValue() === val;
    }
    return multiValue().includes(val);
  };

  const toggleItem = (val: string) => {
    if (isSingle) {
      if (singleValue() === val) {
        if (collapsible) {
          setSingleValue("");
        }
      } else {
        setSingleValue(val);
      }
    } else {
      const current = multiValue();
      if (current.includes(val)) {
        setMultiValue(current.filter((item) => item !== val));
      } else {
        setMultiValue([...current, val]);
      }
    }
  };

  const ctx: AccordionContextValue = {
    isExpanded,
    toggleItem,
    type: props.type,
    collapsible
  };

  const { as: Tag = "div", children, class: className, style, ...rest } = props;

  return AccordionContext.Provider({
    value: ctx,
    children: () => (
      <Tag class={className} style={style} {...rest}>
        {typeof children === "function" ? children() : children}
      </Tag>
    )
  });
}

export interface AccordionItemContextValue {
  value: string;
  itemId: string;
}

export const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export function useAccordionItemContext(): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error("AccordionItem subcomponents must be rendered within an <AccordionItem />");
  }
  return ctx;
}

export interface AccordionItemProps {
  value: string;
  disabled?: boolean | (() => boolean);
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function AccordionItem(props: AccordionItemProps): Child {
  const itemId = createId("accordion-item");
  const ctx: AccordionItemContextValue = {
    value: props.value,
    itemId
  };

  const accordion = useAccordionContext();
  const isOpen = () => accordion.isExpanded(props.value);

  const { value, disabled, as: Tag = "div", children, class: className, style, ...rest } = props;

  return AccordionItemContext.Provider({
    value: ctx,
    children: () => (
      <Tag
        data-state={() => (isOpen() ? "open" : "closed")}
        data-disabled={disabled}
        class={className}
        style={style}
        {...rest}
      >
        {typeof children === "function" ? children() : children}
      </Tag>
    )
  });
}

export interface AccordionTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function AccordionTrigger(props: AccordionTriggerProps): Child {
  const accordion = useAccordionContext();
  const item = useAccordionItemContext();
  const isOpen = () => accordion.isExpanded(item.value);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      accordion.toggleItem(item.value);
    }
  };

  const triggerId = `${item.itemId}-trigger`;
  const contentId = `${item.itemId}-content`;

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      id={triggerId}
      type={Tag === "button" ? "button" : undefined}
      aria-expanded={isOpen}
      aria-controls={contentId}
      data-state={() => (isOpen() ? "open" : "closed")}
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface AccordionContentProps {
  forceMount?: boolean;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function AccordionContent(props: AccordionContentProps): Child {
  const accordion = useAccordionContext();
  const item = useAccordionItemContext();
  const isOpen = () => accordion.isExpanded(item.value);

  const triggerId = `${item.itemId}-trigger`;
  const contentId = `${item.itemId}-content`;

  const { forceMount, as: Tag = "div", children, class: className, style, ...rest } = props;

  if (forceMount) {
    return (
      <Tag
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={() => (isOpen() ? "open" : "closed")}
        hidden={() => !isOpen()}
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Show when={isOpen}>
      <Tag
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state="open"
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    </Show>
  );
}
