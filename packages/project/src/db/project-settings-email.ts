import { validateContactEmail } from "@webstudio-is/project-build/contracts";
import {
  getProjectPlanFeatures,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";

export const validateProjectSettingsContactEmail = async ({
  projectId,
  currentContactEmail,
  nextContactEmail,
  context,
}: {
  projectId: string;
  currentContactEmail: unknown;
  nextContactEmail: unknown;
  context: AppContext;
}) => {
  if (
    typeof nextContactEmail !== "string" ||
    nextContactEmail === currentContactEmail
  ) {
    return;
  }
  const ownerPlan = await getProjectPlanFeatures(projectId, context);
  return validateContactEmail(
    nextContactEmail,
    ownerPlan.maxContactEmailsPerProject
  );
};
