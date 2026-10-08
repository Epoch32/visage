import { For } from "visage/dom";
import { Style } from "visage/style";

export interface WizardStep {
  id: number;
  title: string;
}

export interface WizardStepperProps {
  currentStep: () => number;
  steps: WizardStep[];
}

export function WizardStepper(props: WizardStepperProps) {
  return (
    <div class="step-track">
      <For each={props.steps}>
        {(step, index) => (
          <>
            {() => (index() > 0 ? <div class="step-divider" /> : null)}
            <div
              class={[
                "step-node",
                {
                  active: () => props.currentStep() === step.id,
                  completed: () => props.currentStep() > step.id
                }
              ]}
            >
              <span class="step-num">{step.id}</span>
              <span>{step.title}</span>
            </div>
          </>
        )}
      </For>

      <Style
        classes={{
          "step-track": {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: "1px solid var(--card-border)"
          },
          "step-node": {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "var(--text-muted)",
            "&.active": { color: "var(--text)" },
            "&.completed": { color: "var(--primary)" }
          },
          "step-num": {
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: "var(--card-subtle)",
            border: "1px solid var(--card-border)",
            color: "var(--text-muted)"
          },
          "& .step-node.active .step-num": {
            background: "var(--primary-soft)",
            borderColor: "var(--primary)",
            color: "var(--primary)"
          },
          "& .step-node.completed .step-num": {
            background: "var(--primary)",
            borderColor: "var(--primary)",
            color: "#ffffff"
          },
          "step-divider": {
            flex: 1,
            height: "1px",
            background: "var(--card-border)"
          }
        }}
      />
    </div>
  );
}
