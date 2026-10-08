import type { Form } from "visage/form";
import type { SurveySubmission } from "../schema";
import { Button, Input, Select } from "./ui";

const ROLES = [
  "Frontend Engineer",
  "Fullstack Engineer",
  "Systems / Backend Engineer",
  "Software Architect",
  "Engineering Lead"
];

export interface StepProfileProps {
  form: Form<SurveySubmission>;
  onNext: () => void;
}

export function StepProfile(props: StepProfileProps) {
  return (
    <div class="step-panel">
      <h3>Role & Identity</h3>

      <Input
        label="Work Email"
        type="email"
        placeholder="name@company.com"
        hint="Used to verify unique respondent submissions"
        error={() => props.form.errors().respondentEmail}
        {...props.form.bind("respondentEmail")}
      />

      <Select
        label="Primary Engineering Role"
        options={ROLES}
        {...props.form.bind("primaryRole")}
      />

      <div class="actions">
        <Button variant="primary" onClick={props.onNext}>
          Continue to Experience
        </Button>
      </div>
    </div>
  );
}
