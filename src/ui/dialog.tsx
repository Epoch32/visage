import { Portal } from "@dom/control-flow";
import type { Child } from "@dom/render";
import type { ReadonlySignal } from "@signals";
import { createContext, useContext } from "@signals/context";
import { useDismiss } from "./overlay";
import { createControllableSignal, createId } from "./utils";

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
  const contentRef: { current: HTMLElement | null } = { current: null };

  const ctx: DialogContextValue = {
    open,
    setOpen,
    titleId,
    descriptionId,
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

  const content = (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) {
          ctx.contentRef.current = el;
          if (el && ctx.open()) {
            const focusable = el.querySelector<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable) {
              setTimeout(() => focusable.focus(), 0);
            }
          }
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ctx?.titleId}
      aria-describedby={ctx?.descriptionId}
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
