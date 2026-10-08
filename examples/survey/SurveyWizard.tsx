import { Show } from "visage/dom";
import { createForm } from "visage/form";
import { createClient } from "visage/rpc";
import { signal } from "visage/signals";
import {
  CompletionCard,
  StepExperience,
  StepFeedback,
  StepProfile,
  WizardStepper
} from "./components";
import { Card } from "./components/ui";
import { SurveySubmissionSchema } from "./schema";
import type { SurveyRouter } from "./server";

const WIZARD_STEPS = [
  { id: 1, title: "Profile" },
  { id: 2, title: "Experience" },
  { id: 3, title: "Feedback" }
];

export function SurveyWizard(props: {
  surveyId?: string;
  client?: ReturnType<typeof createClient<SurveyRouter>>;
}) {
  const surveyId = props.surveyId ?? "survey_dx_2026";
  const rpc = props.client ?? createClient<SurveyRouter>({ baseUrl: "/api/rpc" });

  const currentStep = signal(1, { name: "wizard.currentStep" });
  const isSubmitted = signal(false, { name: "wizard.isSubmitted" });

  // Fetch survey metadata directly from typed RPC client
  const config = rpc.getConfig.createQuery({ surveyId });

  // Mutation for submitting survey
  const submitSurvey = rpc.submit.createMutation();

  // Reactive two-way form binding
  const form = createForm({
    initialValues: {
      surveyId,
      respondentEmail: "",
      primaryRole: "Frontend Engineer",
      satisfactionScore: 5,
      recommendLikelihood: 10,
      featureFeedback: ""
    },
    schema: SurveySubmissionSchema,
    onSubmit: async (values) => {
      await submitSurvey.mutateAsync(values);
      isSubmitted.set(true);
    }
  });

  const handleReset = () => {
    form.reset();
    currentStep.set(1);
    isSubmitted.set(false);
  };

  return (
    <Card
      title={() => config.data()?.title ?? "Developer Experience Survey"}
      subtitle={() => config.data()?.description ?? "Share your insights"}
    >
      <Show when={() => !isSubmitted()} fallback={() => <CompletionCard onReset={handleReset} />}>
        <WizardStepper currentStep={currentStep} steps={WIZARD_STEPS} />

        <form onSubmit={form.handleSubmit}>
          <Show when={() => currentStep() === 1}>
            <StepProfile form={form} onNext={() => currentStep.set(2)} />
          </Show>

          <Show when={() => currentStep() === 2}>
            <StepExperience
              form={form}
              onBack={() => currentStep.set(1)}
              onNext={() => currentStep.set(3)}
            />
          </Show>

          <Show when={() => currentStep() === 3}>
            <StepFeedback
              form={form}
              isSubmitting={submitSurvey.isPending}
              serverError={() => submitSurvey.error()?.message}
              onBack={() => currentStep.set(2)}
            />
          </Show>
        </form>
      </Show>
    </Card>
  );
}
