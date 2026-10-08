import { Style } from "visage/style";
import { Button } from "./ui";

export interface CompletionCardProps {
  onReset: () => void;
}

export function CompletionCard(props: CompletionCardProps) {
  return (
    <div class="completion-banner">
      <div class="completion-icon-wrapper">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <title>Success checkmark</title>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2>Feedback Submitted Successfully</h2>
      <p>
        Your response has been securely recorded and synced to the real-time analytics dashboard.
      </p>
      <Button variant="primary" onClick={props.onReset}>
        Submit Another Response
      </Button>

      <Style>{`
        .completion-banner {
          text-align: center;
          padding: 40px 20px;
        }
        .completion-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--success-soft);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }
        .completion-icon-wrapper svg {
          width: 24px;
          height: 24px;
        }
        .completion-banner h2 {
          font-size: 1.35rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text);
        }
        .completion-banner p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          max-width: 440px;
          margin: 0 auto 24px;
        }
      `}</Style>
    </div>
  );
}
