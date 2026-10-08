import { For } from "visage/dom";
import type { Form } from "visage/form";
import { Style } from "visage/style";
import type { SurveySubmission } from "../schema";
import { Button, RangeSlider } from "./ui";

export interface StepExperienceProps {
  form: Form<SurveySubmission>;
  onBack: () => void;
  onNext: () => void;
}

export function StepExperience(props: StepExperienceProps) {
  return (
    <div class="step-panel">
      <h3>Experience & Satisfaction</h3>

      <div class="form-group">
        <span class="field-label">Overall Developer Satisfaction</span>
        <span class="field-hint">1 indicates Poor, 5 indicates Exceptional</span>
        <div class="rating-group">
          <For each={[1, 2, 3, 4, 5]}>
            {(num) => (
              <Button
                variant="pill"
                active={() => props.form.values().satisfactionScore === num}
                onClick={() => props.form.setFieldValue("satisfactionScore", num)}
              >
                {num}
              </Button>
            )}
          </For>
        </div>
      </div>

      <RangeSlider
        label="Net Promoter Likelihood (0 to 10)"
        min={0}
        max={10}
        minLabel="0 - Not Likely"
        midLabel="5 - Neutral"
        maxLabel="10 - Extremely Likely"
        {...props.form.bind("recommendLikelihood")}
      />

      <div class="actions">
        <Button variant="secondary" onClick={props.onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={props.onNext}>
          Continue to Feedback
        </Button>
      </div>

      <Style>{`
        .form-group {
          margin-bottom: 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .field-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .rating-group {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 4px;
        }
      `}</Style>
    </div>
  );
}
