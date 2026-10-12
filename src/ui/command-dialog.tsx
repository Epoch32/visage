import { Portal } from "../dom/control-flow";
import type { Child } from "../dom/render";
import type { CommandProps } from "./command";
import { CommandRoot } from "./command";
import { useDismiss } from "./overlay";
import { createControllableSignal } from "./utils";

export interface CommandDialogProps extends CommandProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  overlayClass?: any;
  contentClass?: any;
}

export function CommandDialog(props: CommandDialogProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const contentRef: { current: HTMLElement | null } = { current: null };

  const dismiss = useDismiss(() => contentRef.current, {
    enabled: () => open(),
    onDismiss: () => setOpen(false),
    escapeKey: true,
    outsidePointer: false
  });

  const { overlayClass, contentClass, style, ...rest } = props;

  return (
    <Portal>
      <div
        style={() => ({
          display: open() ? "flex" : "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "15vh",
          zIndex: 9999
        })}
        class={overlayClass}
        onClick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        onKeyDown={dismiss.handleKeyDown}
      >
        <div
          ref={(el: HTMLElement | null) => {
            contentRef.current = el;
          }}
          style={{ width: "100%", maxWidth: "560px" }}
          class={contentClass}
        >
          <CommandRoot {...rest} />
        </div>
      </div>
    </Portal>
  );
}
