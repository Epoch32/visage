import { render } from "visage/dom";
import { App } from "./App";

export function mountSurveyApp(
  container: HTMLElement | DocumentFragment = document.getElementById("root") || document.body
) {
  return render(() => App(), container);
}

if (typeof document !== "undefined" && document.getElementById("root")) {
  mountSurveyApp();
}

export { App } from "./App";
export { LiveDashboard } from "./LiveDashboard";
export { SurveyWizard } from "./SurveyWizard";
export { type SurveySubmission, SurveySubmissionSchema } from "./schema";
export { handleRpc, type SurveyRouter, surveyRouter } from "./server";
