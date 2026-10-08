import type { Child } from "visage/dom";
import { Style } from "visage/style";

export interface CardProps {
  title?: string | (() => string | undefined);
  subtitle?: string | (() => string | undefined);
  children: Child | Child[];
  class?: string;
}

export function Card(props: CardProps) {
  return (
    <div class={["card", props.class]}>
      {(props.title || props.subtitle) && (
        <div class="card-header">
          {props.title && <h2>{props.title}</h2>}
          {props.subtitle && <p class="subtitle">{props.subtitle}</p>}
        </div>
      )}
      {props.children}
      <Style>{`
        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 14px;
          padding: 36px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .card-header {
          margin-bottom: 24px;
        }
        .card-header h2 {
          font-size: 1.45rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          color: var(--text);
        }
        .subtitle {
          color: var(--text-secondary);
          font-size: 0.92rem;
        }
        .step-panel h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin-bottom: 20px;
          color: var(--text);
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid var(--card-border);
        }
        .server-error-banner {
          background: var(--error-soft);
          border: 1px solid rgba(244, 63, 94, 0.25);
          color: var(--error);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-top: 14px;
        }
      `}</Style>
    </div>
  );
}
