import { v } from "visage/form";

export const SurveySubmissionSchema = v.object({
  surveyId: v.string(),
  respondentEmail: v.string().email(),
  satisfactionScore: v.number(),
  primaryRole: v.string().min(2),
  featureFeedback: v.string().min(10),
  recommendLikelihood: v.number()
});

export type SurveySubmission = {
  surveyId: string;
  respondentEmail: string;
  satisfactionScore: number;
  primaryRole: string;
  featureFeedback: string;
  recommendLikelihood: number;
};
