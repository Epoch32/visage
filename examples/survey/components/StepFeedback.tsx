import type { Form } from "visage/form";
import { Style } from "visage/style";
import type { SurveySubmission } from "../schema";
import { Button, Textarea } from "./ui";

export interface StepFeedbackProps {
  form: Form<SurveySubmission>;
  isSubmitting: () => boolean;
  serverError?: () => string | undefined;
  onBack: () => void;
}

export function StepFeedback(props: StepFeedbackProps) {
  return (
    <div class="step-panel">
      <h3>Detailed Feedback & Observations</h3>

      <Textarea
        label="Workflow observations and improvement suggestions"
        placeholder="Share details regarding tooling ergonomics, reactivity performance, or key features..."
        hint="Minimum 10 characters required"
        rows={4}
        error={() => props.form.errors().featureFeedback}
        {...props.form.bind("featureFeedback")}
      />

      {() => {
        const err = props.serverError?.();
        return err ? <div class="server-error-banner">{err}</div> : null;
      }}

      <div class="actions">
        <Button variant="secondary" onClick={props.onBack}>
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={() => props.isSubmitting() || !props.form.isValid()}
        >
          {() => (props.isSubmitting() ? "Submitting..." : "Submit Survey")}
        </Button>
      </div>

      <Style>{`
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
