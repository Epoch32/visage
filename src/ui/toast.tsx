/** @jsxImportSource visage */
import { For, Show } from "../dom/control-flow";
import { type Child } from "../dom/render";
import { onCleanup, type ReadonlySignal, signal, type WritableSignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { createId } from "./utils";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  title?: Child;
  description?: Child;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
}

export interface ToastOptions {
  title?: Child;
  description?: Child;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
}

export interface ToastManager {
  toasts: ReadonlySignal<ToastData[]>;
  show: (options: ToastOptions | string) => string;
  success: (title: string, options?: Omit<ToastOptions, "title" | "variant">) => string;
  error: (title: string, options?: Omit<ToastOptions, "title" | "variant">) => string;
  warning: (title: string, options?: Omit<ToastOptions, "title" | "variant">) => string;
  info: (title: string, options?: Omit<ToastOptions, "title" | "variant">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export function createToastManager(): ToastManager {
  const toasts: WritableSignal<ToastData[]> = signal<ToastData[]>([]);

  const dismiss = (id: string) => {
    const item = toasts().find((t) => t.id === id);
    if (item?.onDismiss) item.onDismiss();
    toasts.update((list) => list.filter((t) => t.id !== id));
  };

  const show = (options: ToastOptions | string): string => {
    const id = createId("toast");
    const normalized: ToastOptions =
      typeof options === "string" ? { title: options } : options;

    const data: ToastData = {
      id,
      title: normalized.title,
      description: normalized.description,
      variant: normalized.variant ?? "default",
      duration: normalized.duration ?? 5000,
      onDismiss: normalized.onDismiss
    };

    toasts.update((list) => [...list, data]);

    if (data.duration && data.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, data.duration);
    }

    return id;
  };

  const success = (title: string, options?: Omit<ToastOptions, "title" | "variant">) =>
    show({ ...options, title, variant: "success" });

  const error = (title: string, options?: Omit<ToastOptions, "title" | "variant">) =>
    show({ ...options, title, variant: "error" });

  const warning = (title: string, options?: Omit<ToastOptions, "title" | "variant">) =>
    show({ ...options, title, variant: "warning" });

  const info = (title: string, options?: Omit<ToastOptions, "title" | "variant">) =>
    show({ ...options, title, variant: "info" });

  const clear = () => {
    toasts.set([]);
  };

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    clear
  };
}

export const defaultToastManager = createToastManager();

export const toast = defaultToastManager;

export const ToastContext = createContext<ToastManager>(defaultToastManager);

export function useToast(): ToastManager {
  return useContext(ToastContext) ?? defaultToastManager;
}

export interface ToastProviderProps {
  manager?: ToastManager;
  children: Child | (() => Child);
}

export function ToastProvider(props: ToastProviderProps): Child {
  const manager = props.manager ?? defaultToastManager;
  return ToastContext.Provider({
    value: manager,
    children: props.children
  });
}

export interface ToastViewportProps {
  as?: string;
  class?: any;
  style?: any;
  children?: (item: ToastData) => Child;
  [key: string]: any;
}

export function ToastViewport(props: ToastViewportProps): Child {
  const manager = useToast();
  const { as: Tag = "section", children, class: className, style, ...rest } = props;

  const defaultRender = (t: ToastData) => (
    <Toast
      id={t.id}
      variant={t.variant}
      onDismiss={() => manager.dismiss(t.id)}
    >
      <div class="visage-toast-content">
        {t.title && <ToastTitle>{t.title}</ToastTitle>}
        {t.description && <ToastDescription>{t.description}</ToastDescription>}
      </div>
      <ToastClose onClick={() => manager.dismiss(t.id)} />
    </Toast>
  );

  const renderItem = children ?? defaultRender;

  return (
    <Tag
      role="region"
      aria-label="Notifications"
      class={className}
      style={style}
      tabIndex={-1}
      {...rest}
    >
      <For each={manager.toasts}>{(t) => renderItem(t)}</For>
    </Tag>
  );
}

export interface ToastProps {
  id?: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function Toast(props: ToastProps): Child {
  const {
    id,
    variant = "default",
    onDismiss,
    as: Tag = "div",
    children,
    class: className,
    style,
    ...rest
  } = props;

  const role = variant === "error" ? "alert" : "status";
  const ariaLive = variant === "error" ? "assertive" : "polite";

  return (
    <Tag
      id={id}
      role={role}
      aria-live={ariaLive}
      data-variant={variant}
      data-state="open"
      class={className}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface ToastTitleProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function ToastTitle(props: ToastTitleProps): Child {
  const { as: Tag = "div", children, class: className, style, ...rest } = props;
  return <Tag class={className} style={style} {...rest}>{children}</Tag>;
}

export interface ToastDescriptionProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function ToastDescription(props: ToastDescriptionProps): Child {
  const { as: Tag = "div", children, class: className, style, ...rest } = props;
  return <Tag class={className} style={style} {...rest}>{children}</Tag>;
}

export interface ToastCloseProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function ToastClose(props: ToastCloseProps): Child {
  const { as: Tag = "button", children = "✕", onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      aria-label="Close notification"
      class={className}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}
