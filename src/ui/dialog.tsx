import { Portal } from "@dom/control-flow";
import type { Child } from "@dom/render";
import {
  effect,
  onCleanup,
  type ReadonlySignal,
  signal,
  untrack,
  type WritableSignal
} from "@signals";
import { createContext, useContext } from "@signals/context";
import { useDismiss } from "./overlay";
import { createControllableSignal, createId } from "./utils";

export interface DialogContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  hasTitle: WritableSignal<boolean>;
  hasDescription: WritableSignal<boolean>;
  contentRef: { current: HTMLElement | null };
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  return ctx!;
}

export interface DialogProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: Child | (() => Child);
  title?: Child | (() => Child);
  description?: Child | (() => Child);
  footer?: Child | (() => Child);
  triggerClass?: any;
  overlayClass?: any;
  contentClass?: any;
  titleClass?: any;
  descriptionClass?: any;
  footerClass?: any;
  portalled?: boolean;
  children?: Child | (() => Child);
}

export function DialogRoot(props: DialogProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const titleId = createId("dialog-title");
  const descriptionId = createId("dialog-desc");
  const hasTitle = signal(props.title !== undefined);
  const hasDescription = signal(props.description !== undefined);
  const contentRef: { current: HTMLElement | null } = { current: null };

  const ctx: DialogContextValue = {
    open,
    setOpen,
    titleId,
    descriptionId,
    hasTitle,
    hasDescription,
    contentRef
  };

  if (props.trigger !== undefined || props.title !== undefined || props.description !== undefined) {
    return DialogContext.Provider({
      value: ctx,
      children: () => (
        <>
          {props.trigger ? (
            <DialogTrigger as="span" class={props.triggerClass}>
              {typeof props.trigger === "function" ? props.trigger() : props.trigger}
            </DialogTrigger>
          ) : null}
          <DialogOverlay class={props.overlayClass} portalled={props.portalled} />
          <DialogContent portalled={props.portalled} class={props.contentClass}>
            {props.title ? (
              <DialogTitle class={props.titleClass}>
                {typeof props.title === "function" ? props.title() : props.title}
              </DialogTitle>
            ) : null}
            {props.description ? (
              <DialogDescription class={props.descriptionClass}>
                {typeof props.description === "function" ? props.description() : props.description}
              </DialogDescription>
            ) : null}
            {typeof props.children === "function" ? props.children() : props.children}
            {props.footer ? (
              <div class={props.footerClass}>
                {typeof props.footer === "function" ? props.footer() : props.footer}
              </div>
            ) : null}
          </DialogContent>
        </>
      )
    });
  }

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
  const ctx = useContext(DialogContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(true);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      aria-haspopup="dialog"
      aria-expanded={() => ctx?.open() ?? false}
      data-state={() => (ctx?.open() ? "open" : "closed")}
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
  portalled?: boolean;
  mount?: HTMLElement | null;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function DialogOverlay(props: DialogOverlayProps): Child {
  const ctx = useContext(DialogContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(false);
    }
  };

  const {
    as: Tag = "div",
    children,
    onClick,
    class: className,
    style,
    portalled = true,
    mount,
    ...rest
  } = props;

  const overlay = (
    <Tag
      data-state={() => (ctx?.open() ? "open" : "closed")}
      style={() => ({
        display: ctx?.open() ? undefined : "none",
        ...style
      })}
      class={className}
      onClick={handleClick}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </Tag>
  );

  return portalled ? <Portal mount={mount}>{overlay}</Portal> : overlay;
}

export interface DialogContentProps {
  as?: string;
  portalled?: boolean;
  mount?: HTMLElement | null;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogContent(props: DialogContentProps): Child {
  const ctx = useContext(DialogContext);

  let previousActiveElement: HTMLElement | null = null;

  effect(() => {
    const isOpen = ctx?.open();
    if (isOpen) {
      if (typeof document !== "undefined") {
        previousActiveElement = document.activeElement as HTMLElement | null;
      }
      setTimeout(() => {
        const el = ctx?.contentRef.current;
        if (el) {
          const focusable = el.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            focusable.focus();
          } else {
            el.focus();
          }
        }
      }, 0);
    } else if (previousActiveElement) {
      previousActiveElement.focus?.();
      previousActiveElement = null;
    }
  });

  onCleanup(() => {
    if (previousActiveElement) {
      previousActiveElement.focus?.();
      previousActiveElement = null;
    }
  });

  const dismiss = useDismiss(() => ctx?.contentRef.current, {
    enabled: () => ctx?.open() ?? false,
    onDismiss: () => ctx?.setOpen(false),
    escapeKey: true,
    trapFocus: true,
    outsidePointer: false, // backdrop clicks are handled by DialogOverlay
    closeSelector: "[data-dialog-close]",
    onEscapeKeyDown: (e) => {
      if (props.onKeyDown) props.onKeyDown(e);
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    dismiss.handleKeyDown(e);
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    dismiss.handleClick(e);
  };

  const {
    as: Tag = "div",
    children,
    onKeyDown,
    onClick: _onClick,
    class: className,
    style,
    portalled = true,
    mount,
    ...rest
  } = props;

  const ariaLabelledBy = () => {
    if (rest["aria-labelledby"]) return rest["aria-labelledby"];
    if (rest["aria-label"]) return undefined;
    return ctx?.hasTitle() ? ctx.titleId : undefined;
  };

  const ariaDescribedBy = () => {
    if (rest["aria-describedby"]) return rest["aria-describedby"];
    return ctx?.hasDescription() ? ctx.descriptionId : undefined;
  };

  const content = (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) {
          ctx.contentRef.current = el;
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      data-state={() => (ctx?.open() ? "open" : "closed")}
      style={() => ({
        display: ctx?.open() ? undefined : "none",
        ...style
      })}
      class={className}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </Tag>
  );

  return portalled ? <Portal mount={mount}>{content}</Portal> : content;
}

export interface DialogTitleProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DialogTitle(props: DialogTitleProps): Child {
  const ctx = useContext(DialogContext);
  if (ctx) {
    untrack(() => {
      if (!ctx.hasTitle()) ctx.hasTitle.set(true);
    });
    onCleanup(() => {
      untrack(() => ctx.hasTitle.set(false));
    });
  }
  const { as: Tag = "h2", children, class: className, style, ...rest } = props;

  return (
    <Tag id={ctx?.titleId} class={className} style={style} {...rest}>
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
  const ctx = useContext(DialogContext);
  if (ctx) {
    untrack(() => {
      if (!ctx.hasDescription()) ctx.hasDescription.set(true);
    });
    onCleanup(() => {
      untrack(() => ctx.hasDescription.set(false));
    });
  }
  const { as: Tag = "p", children, class: className, style, ...rest } = props;

  return (
    <Tag id={ctx?.descriptionId} class={className} style={style} {...rest}>
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
  const ctx = useContext(DialogContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(false);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      data-dialog-close=""
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const Dialog = Object.assign(DialogRoot, {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose
});
