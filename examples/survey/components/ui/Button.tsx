import type { Child } from "visage/dom";
import { Style } from "visage/style";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "pill";
  type?: "button" | "submit" | "reset";
  disabled?: boolean | (() => boolean);
  active?: boolean | (() => boolean);
  onClick?: (e: MouseEvent) => void;
  children: Child | Child[];
  class?: string;
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";

  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      class={[
        "btn",
        `btn-${variant}`,
        props.class,
        {
          active: typeof props.active === "function" ? props.active : () => Boolean(props.active)
        }
      ]}
    >
      {props.children}
      <Style>{`
        .btn {
          cursor: pointer;
          border: 1px solid transparent;
          font-family: inherit;
          font-weight: 500;
          border-radius: 8px;
          font-size: 0.875rem;
          padding: 9px 18px;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .btn-primary {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--primary-hover);
        }
        .btn-secondary {
          background: var(--card-subtle);
          border-color: var(--card-border);
          color: var(--text-secondary);
        }
        .btn-secondary:hover:not(:disabled) {
          background: #1c212e;
          color: var(--text);
          border-color: var(--card-border-hover);
        }
        .btn-pill {
          padding: 10px;
          border: 1px solid var(--card-border);
          background: var(--card-subtle);
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 8px;
        }
        .btn-pill:hover:not(:disabled) {
          border-color: var(--card-border-hover);
          color: var(--text);
          background: #1c212e;
        }
        .btn-pill.active {
          background: var(--primary-soft);
          border-color: var(--primary);
          color: var(--primary);
        }
      `}</Style>
    </button>
  );
}
