/** @jsxImportSource visage */
import { Portal } from "../dom/control-flow";
import { type Child } from "../dom/render";
import { createContext, useContext } from "../signals/context";
import { effect, onCleanup, type ReadonlySignal } from "../signals";
import { createControllableSignal, createId, trapFocus } from "./utils";

export interface DialogContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  contentRef: { current: HTMLElement | null };
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog compound components must be rendered within a <Dialog />");
  }
  return ctx;
}

export interface DialogProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: Child | (() => Child);
}

export function Dialog(props: DialogProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const titleId = createId("dialog-title");
  const descriptionId = createId("dialog-desc");
  const contentRef: { current: HTMLElement | null } = { current: null };

  const ctx: DialogContextValue = {
    open,
    setOpen,
    titleId,
    descriptionId,
    contentRef
  };

  return DialogContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface DialogTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogTrigger(props: DialogTriggerProps): Child {
  const ctx = useDialogContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(true);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      aria-haspopup="dialog"
      aria-expanded={() => ctx.open()}
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DialogPortalProps {
  mount?: HTMLElement | null;
  children: Child | (() => Child);
}

export function DialogPortal(props: DialogPortalProps): Child {
  return <Portal mount={props.mount}>{props.children}</Portal>;
}

export interface DialogOverlayProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function DialogOverlay(props: DialogOverlayProps): Child {
  const ctx = useDialogContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(false);
    }
  };

  const { as: Tag = "div", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
      onClick={handleClick}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DialogContentProps {
  as?: string;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogContent(props: DialogContentProps): Child {
  const ctx = useDialogContext();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === "Escape") {
      ctx.setOpen(false);
      e.stopPropagation();
    } else if (e.key === "Tab" && ctx.contentRef.current) {
      trapFocus(ctx.contentRef.current, e);
    }
  };

  const { as: Tag = "div", children, onKeyDown, class: className, style, ...rest } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ctx.contentRef.current = el;
        if (el && ctx.open()) {
          const focusable = el.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            setTimeout(() => focusable.focus(), 0);
          }
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ctx.titleId}
      aria-describedby={ctx.descriptionId}
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DialogTitleProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogTitle(props: DialogTitleProps): Child {
  const ctx = useDialogContext();
  const { as: Tag = "h2", children, class: className, style, ...rest } = props;

  return (
    <Tag id={ctx.titleId} class={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export interface DialogDescriptionProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogDescription(props: DialogDescriptionProps): Child {
  const ctx = useDialogContext();
  const { as: Tag = "p", children, class: className, style, ...rest } = props;

  return (
    <Tag id={ctx.descriptionId} class={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export interface DialogCloseProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogClose(props: DialogCloseProps): Child {
  const ctx = useDialogContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(false);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}
